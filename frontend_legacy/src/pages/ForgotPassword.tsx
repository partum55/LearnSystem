import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authRecoveryApi } from '../api/authRecovery';
import { Button, Input } from '../components';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await authRecoveryApi.forgotPassword(email.trim());
      setMessage('If this email exists, a password reset link has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-md rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          Forgot Password
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Enter your account email and we will send a reset link.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {message && <p className="text-sm" style={{ color: 'var(--fn-success)' }}>{message}</p>}
          {error && <p className="text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>}

          <Button type="submit" fullWidth isLoading={loading}>
            Send Reset Link
          </Button>
        </form>

        <div className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Link to="/login" style={{ color: 'var(--text-primary)' }}>Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
