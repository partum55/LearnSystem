import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components';
import { Button } from '../components';
import { LanguageSwitcher } from '../components/LanguageSwitcher';


const REQUIRE_UCU_EMAIL =
  (import.meta.env.VITE_REQUIRE_UCU_EMAIL || import.meta.env.REACT_APP_REQUIRE_UCU_EMAIL) === 'true';

interface LocationState {
  message?: string;
  email?: string;
}

export const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, isLoading, isAuthenticated } = useAuthStore();

  const locationState = location.state as LocationState | null;
  const [email, setEmail] = useState(() => locationState?.email || '');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState(() => locationState?.message || '');

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (locationState?.message) window.history.replaceState({}, document.title);
  }, [locationState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');

    if (!email || !password) {
      setLocalError(t('auth.loginError'));
      return;
    }

    if (REQUIRE_UCU_EMAIL && !email.toLowerCase().endsWith('@ucu.edu.ua')) {
      setLocalError(t('auth.ucuEmailRequired', 'Only @ucu.edu.ua email addresses are allowed'));
      return;
    }

    try {
      await login(email, password);
      const savedLanguage = localStorage.getItem('language');
      if (savedLanguage && (savedLanguage === 'uk' || savedLanguage === 'en')) {
        i18n.changeLanguage(savedLanguage);
      }
    } catch {
      setLocalError(error || t('auth.loginError'));
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-body)' }}
    >
      <div className="w-full max-w-sm">
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
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1
            className="text-2xl font-semibold mb-1.5"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            {t('auth.welcome')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Sign in to continue
          </p>
        </div>

        {/* Messages */}
        {successMessage && (
          <div
            className="mb-4 px-3 py-2 rounded-md text-sm"
            style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)', color: 'var(--fn-success)' }}
          >
            {successMessage}
          </div>
        )}

        {(localError || error) && (
          <div
            className="mb-4 px-3 py-2 rounded-md text-sm"
            style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--fn-error)' }}
          >
            {localError || error}
          </div>
        )}

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label={t('auth.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@ucu.edu.ua"
            required
          />
          <Input
            label={t('auth.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                name="remember-me"
                className="rounded"
                style={{ accentColor: 'var(--text-primary)' }}
              />
              {t('auth.rememberMe')}
            </label>
            <button
              type="button"
              className="text-sm transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              {t('auth.forgotPassword')}
            </button>
          </div>

          <Button type="submit" fullWidth size="md" isLoading={isLoading}>
            {t('auth.login')}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('auth.register.noAccount')}{' '}
          <Link to="/register" className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('auth.register.createAccount')}
          </Link>
        </p>

      </div>
    </div>
  );
};

export default Login;
