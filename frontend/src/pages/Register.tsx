import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '../components';
import { Button } from '../components';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import apiClient from '../api/client';

export const Register: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    display_name: '',
    role: 'STUDENT',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password || !formData.display_name) {
      setError(t('auth.register.allFieldsRequired'));
      return;
    }

    if (!formData.email.toLowerCase().endsWith('@ucu.edu.ua')) {
      setError(t('auth.register.ucuEmailRequired', 'Only @ucu.edu.ua email addresses are allowed'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.register.passwordMismatch'));
      return;
    }

    if (formData.password.length < 8) {
      setError(t('auth.register.passwordTooShort'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        displayName: formData.display_name,
        role: formData.role,
      });

      if (response.status === 201 || response.status === 200) {
        navigate('/login', {
          state: {
            message: t('auth.register.success'),
            email: formData.email,
          },
        });
      }
    } catch (err: unknown) {
      console.error('Registration error:', err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.email) {
          setError(Array.isArray(errorData.email) ? errorData.email[0] : errorData.email);
        } else if (errorData.password) {
          setError(Array.isArray(errorData.password) ? errorData.password[0] : errorData.password);
        } else if (errorData.error) {
          setError(errorData.error);
        } else {
          setError(t('auth.register.error'));
        }
      } else {
        setError(t('auth.register.error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8"
      style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-body)' }}
    >
      <div className="max-w-sm w-full">
        {/* Language Switcher */}
        <div className="flex justify-end mb-6">
          <LanguageSwitcher />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold"
            style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}
          >
            LS
          </div>
          <span
            className="text-sm font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            LearnSystem
          </span>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1
            className="text-2xl font-semibold mb-1.5"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            {t('auth.register.title')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('auth.register.subtitle')}
          </p>
        </div>

        {error && (
          <div
            className="mb-4 px-3 py-2 rounded-md text-sm"
            style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--fn-error)' }}
          >
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label={t('auth.register.displayName')}
            name="display_name"
            type="text"
            value={formData.display_name}
            onChange={handleChange}
            placeholder={t('auth.register.displayNamePlaceholder')}
            required
          />

          <Input
            label={t('auth.email')}
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="student@ucu.edu.ua"
            required
          />

          <div className="input-group">
            <label className="label">
              {t('auth.register.role')}
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="input"
            >
              <option value="STUDENT">{t('roles.student')}</option>
              <option value="TEACHER">{t('roles.teacher')}</option>
            </select>
            <p className="help-text">
              {t('auth.register.roleHint')}
            </p>
          </div>

          <Input
            label={t('auth.password')}
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />

          <Input
            label={t('auth.register.confirmPassword')}
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />

          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <p>{t('auth.register.passwordRequirements')}</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>{t('auth.register.passwordMinLength')}</li>
              <li>{t('auth.register.passwordMatch')}</li>
            </ul>
          </div>

          <Button type="submit" fullWidth isLoading={isLoading}>
            {t('auth.register.createAccount')}
          </Button>

          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('auth.register.alreadyHaveAccount')}{' '}
            <Link to="/login" className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('auth.login')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
