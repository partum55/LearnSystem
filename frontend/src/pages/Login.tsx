import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components';
import { PasswordInput } from '../components/PasswordInput';
import { Button } from '../components';
import { LanguageSwitcher } from '../components/LanguageSwitcher';


const REQUIRE_UCU_EMAIL =
  (import.meta.env.VITE_REQUIRE_UCU_EMAIL || import.meta.env.REACT_APP_REQUIRE_UCU_EMAIL) === 'true';

interface LocationState {
  message?: string;
  email?: string;
}

const resolveOauthErrorFromSearch = (search: string): string => {
  const params = new URLSearchParams(search);
  return params.get('oauth_error_message') || '';
};

const resolveApiBaseUrl = (): string => {
  let apiBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || '';
  if (!apiBaseUrl) {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const host = window.location.hostname;
      const protocol = window.location.protocol;
      if (host === 'localhost' || host === '127.0.0.1') {
        apiBaseUrl = `${protocol}//localhost:8080/api`;
      }
    }
  }
  return apiBaseUrl || '/api';
};

export const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, isLoading, isAuthenticated } = useAuthStore();

  const locationState = location.state as LocationState | null;
  const [email, setEmail] = useState(() => locationState?.email || '');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(() => resolveOauthErrorFromSearch(location.search));
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

  const handleGoogleLogin = () => {
    const base = resolveApiBaseUrl().replace(/\/$/, '');
    window.location.href = `${base}/auth/oauth2/google/start`;
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-body)' }}>
      {/* Left decorative panel — hidden on mobile */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: 'var(--bg-surface)' }}
      >
        {/* Geometric CSS pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--text-primary) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />
        <div className="relative z-10 text-center px-12 max-w-md">
          {/* Logo */}
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
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo + language */}
          <div className="flex items-center gap-2 mb-10">
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
          <div className="mb-8" style={{ animationDelay: '0ms' }}>
            <h1
              className="text-2xl font-semibold mb-1.5 animate-fade-in-up"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              {t('auth.welcome')}
            </h1>
            <p className="text-sm animate-fade-in-up" style={{ color: 'var(--text-muted)', animationDelay: '50ms', animationFillMode: 'both' }}>
              {t('auth.loginSubtitle', 'Sign in to continue')}
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
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
              <Input
                label={t('auth.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ucu.edu.ua"
                required
              />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
              <PasswordInput
                label={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
            </div>

            <div className="flex items-center justify-between animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
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
                onClick={() => navigate('/auth/forgot-password')}
              >
                {t('auth.forgotPassword')}
              </button>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
              <Button type="submit" fullWidth size="md" isLoading={isLoading}>
                {t('auth.login')}
              </Button>
            </div>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: 'var(--border-default)' }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>or</span>
            <div className="h-px flex-1" style={{ background: 'var(--border-default)' }} />
          </div>

          <Button
            type="button"
            fullWidth
            size="md"
            variant="secondary"
            onClick={handleGoogleLogin}
          >
            {t('auth.continueWithGoogle', 'Continue with Google')}
          </Button>

          <p className="text-center mt-6 text-sm animate-fade-in-up" style={{ color: 'var(--text-muted)', animationDelay: '300ms', animationFillMode: 'both' }}>
            {t('auth.register.noAccount')}{' '}
            <Link to="/register" className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('auth.register.createAccount')}
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Login;
