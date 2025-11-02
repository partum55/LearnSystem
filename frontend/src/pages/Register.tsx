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

    // Валідація
    if (!formData.email || !formData.password || !formData.display_name) {
      setError(t('auth.register.allFieldsRequired'));
      return;
    }

    // Валідація UCU email
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
      const response = await apiClient.post('/auth/users/', {
        email: formData.email,
        password: formData.password,
        password_confirm: formData.confirmPassword,
        display_name: formData.display_name,
        role: formData.role,
      });

      if (response.status === 201) {
        // Успішна реєстрація - перенаправляємо на сторінку входу
        navigate('/login', { 
          state: { 
            message: t('auth.register.success'),
            email: formData.email 
          } 
        });
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.response?.data) {
        const errorData = err.response.data;
        if (errorData.email) {
          setError(Array.isArray(errorData.email) ? errorData.email[0] : errorData.email);
        } else if (errorData.password) {
          setError(Array.isArray(errorData.password) ? errorData.password[0] : errorData.password);
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        {/* Language Switcher at the top */}
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        <div>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('auth.register.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('auth.register.subtitle')}
          </p>
        </div>

        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
              placeholder="student@example.com"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.register.role')}
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="STUDENT">{t('roles.student')}</option>
                <option value="TEACHER">{t('roles.teacher')}</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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

            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>{t('auth.register.passwordRequirements')}</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>{t('auth.register.passwordMinLength')}</li>
                <li>{t('auth.register.passwordMatch')}</li>
              </ul>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-400">
                {error}
              </p>
            </div>
          )}

          <div>
            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
            >
              {t('auth.register.createAccount')}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.register.alreadyHaveAccount')}{' '}
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                {t('auth.login')}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
