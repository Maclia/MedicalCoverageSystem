/**
 * Network Status Hook
 * Provides real-time connectivity status and pending operations count
 */

import { useState, useEffect } from 'react';
import mutationQueue from '../lib/mutationQueue';

interface NetworkStatus {
  isOnline: boolean;
  pendingOperations: number;
  isSyncing: boolean;
}

/**
 * React hook for monitoring network status and pending mutations
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingOperations: mutationQueue.getPendingCount(),
    isSyncing: false,
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus(s => ({ ...s, isOnline: true }));
    };

    const handleOffline = () => {
      setStatus(s => ({ ...s, isOnline: false }));
    };

    const removeListener = mutationQueue.addEventListener({
      onProcessed: () => {
        setStatus(s => ({ ...s, pendingOperations: mutationQueue.getPendingCount() }));
      },
      onDrained: () => {
        setStatus(s => ({ ...s, pendingOperations: 0, isSyncing: false }));
      },
    });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update pending count every 2 seconds
    const interval = setInterval(() => {
      setStatus(s => ({
        ...s,
        pendingOperations: mutationQueue.getPendingCount(),
      }));
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      removeListener();
      clearInterval(interval);
    };
  }, []);

  return status;
}

export default useNetworkStatus;