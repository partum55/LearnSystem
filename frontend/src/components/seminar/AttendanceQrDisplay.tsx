import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../api/client';

interface AttendanceQrDisplayProps {
  assignmentId: string;
  courseId?: string;
}

const AttendanceQrDisplay: React.FC<AttendanceQrDisplayProps> = ({ assignmentId }) => {
  const { t } = useTranslation();
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.post<{ token: string; expiresAt: string }>(
        `/assessments/assignments/${assignmentId}/attendance/qr?expiryMinutes=10`
      );
      setToken(res.data.token);
      setExpiresAt(res.data.expiresAt);
    } catch (err) {
      console.error('Failed to generate QR token', err);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(diff);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const expired = expiresAt ? remainingSeconds <= 0 : false;
  const minutesLeft = Math.ceil(remainingSeconds / 60);

  const qrImageUrl = token
    ? `/api/assessments/assignments/${assignmentId}/attendance/qr/${token}/image?baseUrl=${encodeURIComponent(window.location.origin)}`
    : '';

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center gap-6'
    : 'flex flex-col items-center gap-4 p-4';

  return (
    <div className={containerClass} style={isFullscreen ? { background: 'var(--bg-base)' } : {}}>
      {!token ? (
        <button type="button" className="btn btn-primary" onClick={generate} disabled={loading}>
          {loading ? '...' : t('qr.generate', 'Generate QR code')}
        </button>
      ) : (
        <>
          {expired ? (
            <div className="text-center space-y-3">
              <p className="text-lg font-medium" style={{ color: 'var(--fn-error)' }}>
                {t('qr.expired', 'QR code expired')}
              </p>
              <button type="button" className="btn btn-primary" onClick={generate} disabled={loading}>
                {t('qr.regenerate', 'Regenerate')}
              </button>
            </div>
          ) : (
            <>
              <img
                src={qrImageUrl}
                alt="Attendance QR Code"
                className={isFullscreen ? 'w-96 h-96' : 'w-64 h-64'}
                style={{ borderRadius: '12px', background: 'white', padding: '12px' }}
              />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('qr.expiresIn', { minutes: minutesLeft, defaultValue: `Expires in ${minutesLeft} min` })}
              </p>
              <div className="flex gap-2">
                <button type="button" className="btn btn-xs" onClick={generate} disabled={loading}>
                  {t('qr.regenerate', 'Regenerate')}
                </button>
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={() => setIsFullscreen((prev) => !prev)}
                >
                  {isFullscreen ? t('common.close', 'Close') : '⛶'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AttendanceQrDisplay;
