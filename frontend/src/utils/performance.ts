/**
 * Performance utilities for production optimization
 */

/**
 * Remove console.log in production
 * Import and call this in index.tsx before rendering
 */
export function disableConsoleInProduction(): void {
  if (process.env.NODE_ENV === 'production') {
    // Preserve console.error and console.warn for debugging
    const noop = () => {};

    console.log = noop;
    console.debug = noop;
    console.info = noop;
    console.trace = noop;
    console.dir = noop;
    console.dirxml = noop;
    console.group = noop;
    console.groupCollapsed = noop;
    console.groupEnd = noop;
    console.time = noop;
    console.timeEnd = noop;
    console.timeLog = noop;
    console.count = noop;
    console.countReset = noop;
    console.table = noop;
    console.profile = noop;
    console.profileEnd = noop;
    console.clear = noop;
  }
}

/**
 * Preload critical resources
 */
export function preloadCriticalResources(): void {
  // Preconnect to API server
  const apiUrl = process.env.REACT_APP_API_URL;
  if (apiUrl) {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = apiUrl;
    document.head.appendChild(link);
  }
}

/**
 * Register service worker for offline support (PWA)
 */
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    });
  }
}

/**
 * Performance monitoring using Web Vitals
 *
 * To enable, install: npm install web-vitals
 * Then uncomment and use this function in index.tsx
 *
 * Example usage:
 * import { reportWebVitals } from './utils/performance';
 * reportWebVitals(console.log);
 */
// export function reportWebVitals(onPerfEntry?: (metric: any) => void): void {
//   if (onPerfEntry && typeof onPerfEntry === 'function') {
//     import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
//       getCLS(onPerfEntry);
//       getFID(onPerfEntry);
//       getFCP(onPerfEntry);
//       getLCP(onPerfEntry);
//       getTTFB(onPerfEntry);
//     });
//   }
// }

/**
 * Debounce function for optimizing frequent updates
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

/**
 * Throttle function for rate-limiting function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Intersection Observer hook for lazy loading
 */
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') {
    return null;
  }

  return new IntersectionObserver(callback, {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  });
}

/**
 * Memory usage monitoring (development only)
 */
export function logMemoryUsage(): void {
  if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
    const memory = (performance as any).memory;
    console.log('Memory:', {
      usedJSHeapSize: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
      totalJSHeapSize: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
      jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
    });
  }
}

/**
 * Request idle callback wrapper with fallback
 */
export function requestIdleCallbackPolyfill(
  callback: () => void,
  options?: { timeout: number }
): void {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback, options);
  } else {
    setTimeout(callback, options?.timeout || 1);
  }
}

