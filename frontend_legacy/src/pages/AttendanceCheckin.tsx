import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';

const AttendanceCheckin: React.FC = () => {
  const { assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (!token || !assignmentId) {
      setStatus('error');
      setErrorMessage('Missing token or assignment');
      return;
    }

    apiClient
      .post(`/assessments/assignments/${assignmentId}/attendance/checkin?token=${encodeURIComponent(token)}`)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        const msg = err?.response?.data?.message || err?.response?.data?.error;
        if (msg && typeof msg === 'string' && msg.toLowerCase().includes('expired')) {
          setErrorMessage(t('checkin.tokenExpired', 'This QR code has expired'));
        } else {
          setErrorMessage(t('checkin.failed', 'Check-in failed'));
        }
      });
  }, [isAuthenticated, token, assignmentId, navigate, t]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="card p-8 text-center max-w-md w-full space-y-4">
        {status === 'loading' && (
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto"
            style={{ borderColor: 'var(--text-muted)' }} />
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl">✓</div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--fn-success)' }}>
              {t('checkin.success', 'Attendance confirmed')}
            </h2>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl">✗</div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--fn-error)' }}>
              {errorMessage}
            </h2>
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceCheckin;
