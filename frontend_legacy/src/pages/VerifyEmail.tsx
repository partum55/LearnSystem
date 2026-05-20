import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authRecoveryApi } from '../api/authRecovery';
import { Button } from '../components';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'error'>('success');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Missing email verification token.');
        setLoading(false);
        return;
      }

      try {
        await authRecoveryApi.verifyEmail(token);
        setStatus('success');
        setMessage('Email verified successfully. You can now sign in.');
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Email verification failed');
      } finally {
        setLoading(false);
      }
    };

    void verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-md rounded-xl p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <h1 className="text-2xl font-semibold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          Verify Email
        </h1>
        <p className="text-sm mb-6" style={{ color: status === 'success' ? 'var(--fn-success)' : 'var(--fn-error)' }}>
          {message}
        </p>

        {!loading && (
          <Link to="/login">
            <Button fullWidth>
              Go to login
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
