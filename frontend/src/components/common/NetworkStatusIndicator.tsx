import React from 'react';
import { useTranslation } from 'react-i18next';
import { WifiIcon, ExclamationTriangleIcon, SignalIcon } from '@heroicons/react/24/outline';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface NetworkStatusIndicatorProps {
  /** Show in compact mode (icon only) */
  compact?: boolean;
  /** Show connection quality info */
  showQuality?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Network status indicator component.
 * Shows connection status and warns users during timed assessments.
 */
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
    if (!isOnline) return 'text-red-500';
    if (!isServerReachable) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusBg = () => {
    if (!isOnline) return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    if (!isServerReachable) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
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

  // Don't show when everything is fine (unless showQuality is enabled)
  if (isOnline && isServerReachable && !showQuality) {
    return null;
  }

  // Show warning badge when offline or server unreachable
  if (!isOnline || !isServerReachable) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusBg()} ${className}`}
        role="alert"
        aria-live="polite"
      >
        {!isOnline ? (
          <WifiIcon className={`h-4 w-4 ${getStatusColor()}`} />
        ) : (
          <ExclamationTriangleIcon className={`h-4 w-4 ${getStatusColor()}`} />
        )}

        {!compact && (
          <span className={`text-sm font-medium ${getStatusColor().replace('text-', 'text-').replace('-500', '-700')} dark:${getStatusColor().replace('text-', 'text-').replace('-500', '-300')}`}>
            {getStatusText()}
          </span>
        )}
      </div>
    );
  }

  // Show quality info if enabled
  if (showQuality) {
    const qualityText = getQualityText();
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <SignalIcon className={`h-4 w-4 ${getStatusColor()}`} />
        {!compact && qualityText && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {qualityText}
          </span>
        )}
      </div>
    );
  }

  return null;
};

export default NetworkStatusIndicator;

