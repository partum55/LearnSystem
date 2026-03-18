import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authRecoveryApi } from '../api/authRecovery';
import { Button, PasswordInput } from '../components';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError('Missing reset token.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authRecoveryApi.resetPassword(token, newPassword);
      setMessage('Password has been reset successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-md rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          Reset Password
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Set a new password for your account.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <PasswordInput
            label="New password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
          <PasswordInput
            label="Confirm password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />

          {message && <p className="text-sm" style={{ color: 'var(--fn-success)' }}>{message}</p>}
          {error && <p className="text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>}

          <Button type="submit" fullWidth isLoading={loading}>
            Reset Password
          </Button>
        </form>

        <div className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Link to="/login" style={{ color: 'var(--text-primary)' }}>Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
