import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '../components';
import { PasswordInput } from '../components/PasswordInput';
import { Button } from '../components';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import apiClient from '../api/client';

/** Password strength: 0-4 */
function getPasswordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const strengthColors = ['var(--fn-error)', 'var(--fn-error)', 'var(--fn-warning)', 'var(--fn-success)', 'var(--fn-success)'];
const strengthLabels = ['', 'weak', 'fair', 'good', 'strong'];

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

  const strength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

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
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-body)' }}>
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--text-primary) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />
        <div className="relative z-10 text-center px-12 max-w-md">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 animate-fade-in"
            style={{
              background: 'var(--text-primary)',
              color: 'var(--bg-base)',
              boxShadow: '0 0 40px rgba(255,255,255,0.06)',
            }}
          >
            LS
          </div>
          <h2
            className="text-3xl font-bold mb-3 animate-fade-in-up"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', animationDelay: '100ms', animationFillMode: 'both' }}
          >
            LearnSystem
          </h2>
          <p
            className="text-base animate-fade-in-up"
            style={{ color: 'var(--text-muted)', animationDelay: '200ms', animationFillMode: 'both' }}
          >
            {t('landing.tagline', 'Your academic journey starts here')}
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center py-8 px-4 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo + language */}
          <div className="flex items-center gap-2 mb-8">
            <div className="lg:hidden flex items-center gap-2">
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
            <div className="ml-auto">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1
              className="text-2xl font-semibold mb-1.5 animate-fade-in-up"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              {t('auth.register.title')}
            </h1>
            <p className="text-sm animate-fade-in-up" style={{ color: 'var(--text-muted)', animationDelay: '50ms', animationFillMode: 'both' }}>
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
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
              <Input
                label={t('auth.register.displayName')}
                name="display_name"
                type="text"
                value={formData.display_name}
                onChange={handleChange}
                placeholder={t('auth.register.displayNamePlaceholder')}
                required
              />
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
              <Input
                label={t('auth.email')}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="student@ucu.edu.ua"
                required
              />
            </div>

            <div className="input-group animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
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

            <div className="animate-fade-in-up" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
              <PasswordInput
                label={t('auth.password')}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
              {/* Password strength bar */}
              {formData.password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 h-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-full transition-all duration-300"
                        style={{
                          background: i < strength ? strengthColors[strength] : 'var(--border-default)',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs mt-1" style={{ color: strengthColors[strength] }}>
                    {strengthLabels[strength] && t(`auth.register.strength_${strengthLabels[strength]}`, strengthLabels[strength])}
                  </p>
                </div>
              )}
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <PasswordInput
                label={t('auth.register.confirmPassword')}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
              {/* Match indicator */}
              {formData.confirmPassword.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  {passwordsMatch ? (
                    <>
                      <CheckIcon className="h-4 w-4" style={{ color: 'var(--fn-success)' }} />
                      <span className="text-xs" style={{ color: 'var(--fn-success)' }}>{t('auth.register.passwordMatch')}</span>
                    </>
                  ) : passwordsMismatch ? (
                    <>
                      <XMarkIcon className="h-4 w-4" style={{ color: 'var(--fn-error)' }} />
                      <span className="text-xs" style={{ color: 'var(--fn-error)' }}>{t('auth.register.passwordMismatch')}</span>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <div className="text-xs animate-fade-in-up" style={{ color: 'var(--text-muted)', animationDelay: '350ms', animationFillMode: 'both' }}>
              <p>{t('auth.register.passwordRequirements')}</p>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
              <Button type="submit" fullWidth isLoading={isLoading}>
                {t('auth.register.createAccount')}
              </Button>
            </div>

            <p className="text-center text-sm animate-fade-in-up" style={{ color: 'var(--text-muted)', animationDelay: '450ms', animationFillMode: 'both' }}>
              {t('auth.register.alreadyHaveAccount')}{' '}
              <Link to="/login" className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('auth.login')}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
