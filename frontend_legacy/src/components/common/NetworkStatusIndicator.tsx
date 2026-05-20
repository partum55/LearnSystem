import React from 'react';
import { useTranslation } from 'react-i18next';
import { WifiIcon, ExclamationTriangleIcon, SignalIcon } from '@heroicons/react/24/outline';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface NetworkStatusIndicatorProps {
  compact?: boolean;
  showQuality?: boolean;
  className?: string;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  compact = false,
  showQuality = false,
  className = '',
}) => {
  const { t } = useTranslation();
  const { isOnline, isServerReachable, effectiveType, rtt } = useNetworkStatus({
    checkInterval: 15000,
  });

  const getStatusColor = () => {
    if (!isOnline) return 'var(--fn-error)';
    if (!isServerReachable) return 'var(--fn-warning)';
    return 'var(--fn-success)';
  };

  const getStatusText = () => {
    if (!isOnline) return t('network.offline', 'Offline');
    if (!isServerReachable) return t('network.serverUnreachable', 'Server unreachable');
    return t('network.connected', 'Connected');
  };

  const getQualityText = () => {
    if (!isOnline || !isServerReachable) return '';
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return t('network.slowConnection', 'Slow connection');
    }
    if (rtt && rtt > 500) {
      return t('network.highLatency', 'High latency');
    }
    return '';
  };

  if (isOnline && isServerReachable && !showQuality) {
    return null;
  }

  if (!isOnline || !isServerReachable) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${className}`}
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        role="alert"
        aria-live="polite"
      >
        {!isOnline ? (
          <WifiIcon className="h-4 w-4" style={{ color: getStatusColor() }} />
        ) : (
          <ExclamationTriangleIcon className="h-4 w-4" style={{ color: getStatusColor() }} />
        )}
        {!compact && (
          <span className="text-sm font-medium" style={{ color: getStatusColor() }}>
            {getStatusText()}
          </span>
        )}
      </div>
    );
  }

  if (showQuality) {
    const qualityText = getQualityText();
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <SignalIcon className="h-4 w-4" style={{ color: getStatusColor() }} />
        {!compact && qualityText && (
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {qualityText}
          </span>
        )}
      </div>
    );
  }

  return null;
};

export default NetworkStatusIndicator;
