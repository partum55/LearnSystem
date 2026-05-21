import { useState, useEffect, useCallback } from 'react';

/**
 * Network status interface
 */
export interface NetworkStatus {
  /** Whether the browser is online */
  isOnline: boolean;
  /** Whether there's an active connection to the server */
  isServerReachable: boolean;
  /** Last time server was successfully reached */
  lastServerCheck: Date | null;
  /** Effective connection type (if available) */
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  /** Round trip time estimate in ms */
  rtt: number | null;
  /** Downlink speed estimate in Mbps */
  downlink: number | null;
}

/**
 * Options for useNetworkStatus hook
 */
interface UseNetworkStatusOptions {
  /** URL to ping for server reachability check */
  healthCheckUrl?: string;
  /** Interval between health checks in ms (default: 30000) */
  checkInterval?: number;
  /** Whether to run health checks (default: true) */
  enableHealthCheck?: boolean;
}

/**
 * Hook to monitor network status and server connectivity.
 * Essential for timed assessments where network issues can cause data loss.
 *
 * Features:
 * - Browser online/offline detection
 * - Server health check pings
 * - Connection quality information (when available)
 * - Automatic reconnection monitoring
 *
 * @example
 * const { isOnline, isServerReachable } = useNetworkStatus({
 *   healthCheckUrl: '/api/health',
 *   checkInterval: 15000,
 * });
 */
export function useNetworkStatus(options: UseNetworkStatusOptions = {}): NetworkStatus {
  const {
    healthCheckUrl = '/api/health',
    checkInterval = 30000,
    enableHealthCheck = true,
  } = options;

  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isServerReachable: true,
    lastServerCheck: null,
    effectiveType: 'unknown',
    rtt: null,
    downlink: null,
  });

  // Get network information from Navigator API
  const getNetworkInfo = useCallback(() => {
    interface NetworkInformation {
      effectiveType?: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
      rtt?: number;
      downlink?: number;
      addEventListener: (type: string, listener: EventListener) => void;
      removeEventListener: (type: string, listener: EventListener) => void;
    }

    const nav = navigator as Navigator & {
      connection?: NetworkInformation;
      mozConnection?: NetworkInformation;
      webkitConnection?: NetworkInformation;
    };
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (connection) {
      return {
        effectiveType: (connection.effectiveType || 'unknown') as '4g' | '3g' | '2g' | 'slow-2g' | 'unknown',
        rtt: connection.rtt || null,
        downlink: connection.downlink || null,
      };
    }

    return {
      effectiveType: 'unknown' as const,
      rtt: null,
      downlink: null,
    };
  }, []);

  // Check server reachability
  const checkServerHealth = useCallback(async () => {
    // Check online status directly from navigator to avoid dependency on state
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus(prev => ({ ...prev, isServerReachable: false }));
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(healthCheckUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeout);

      setStatus(prev => ({
        ...prev,
        isServerReachable: response.ok,
        lastServerCheck: new Date(),
        ...getNetworkInfo(),
      }));
    } catch {
      setStatus(prev => ({
        ...prev,
        isServerReachable: false,
        lastServerCheck: new Date(),
      }));
    }
  }, [healthCheckUrl, getNetworkInfo]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true, ...getNetworkInfo() }));
      // Check server when coming back online
      if (enableHealthCheck) {
        checkServerHealth();
      }
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        isServerReachable: false,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enableHealthCheck, checkServerHealth, getNetworkInfo]);

  // Periodic health checks
  useEffect(() => {
    if (!enableHealthCheck) return;

    // Initial check - defer to next tick to avoid synchronous setState warning
    setTimeout(() => checkServerHealth(), 0);

    const interval = setInterval(checkServerHealth, checkInterval);
    return () => clearInterval(interval);
  }, [enableHealthCheck, checkInterval, checkServerHealth]);

  // Listen for network info changes
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as Navigator & { connection?: any; mozConnection?: any; webkitConnection?: any };
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (connection) {
      const handleChange = () => {
        setStatus(prev => ({ ...prev, ...getNetworkInfo() }));
      };

      connection.addEventListener('change', handleChange);
      return () => connection.removeEventListener('change', handleChange);
    }
    return undefined;
  }, [getNetworkInfo]);

  return status;
}

export default useNetworkStatus;

