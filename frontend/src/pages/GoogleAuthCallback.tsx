import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setAccessToken, setRefreshToken } from '../api/token';
import { useAuthStore } from '../store/authStore';

export const GoogleAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    const finalizeLogin = async () => {
      const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
      const queryParams = new URLSearchParams(window.location.search);

      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const oauthError = queryParams.get('oauth_error') || queryParams.get('error');

      if (oauthError || !accessToken || !refreshToken) {
        navigate('/login', {
          replace: true,
          state: { message: t('auth.googleLoginFailed', 'Google login failed. Please try again.') },
        });
        return;
      }

      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      await fetchCurrentUser();
      navigate('/dashboard', { replace: true });
    };

    void finalizeLogin();
  }, [fetchCurrentUser, navigate, t]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <p style={{ color: 'var(--text-muted)' }}>
        {t('auth.processingGoogleLogin', 'Completing Google login...')}
      </p>
    </div>
  );
};

export default GoogleAuthCallback;
