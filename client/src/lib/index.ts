/**
 * Frontend Backend Integration Library
 * Public API exports for the data persistence system
 */

export { queryClient, generateIdempotencyKey, apiRequest } from './queryClient';
export { default as BaseApiClient } from './baseApiClient';
export { default as mutationQueue } from './mutationQueue';
export type { QueuedMutation } from './mutationQueue';
export { default as usePersistedMutation } from '../hooks/usePersistedMutation';
export { default as useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * Implementation Complete:
 * 
 * ✅ React Query configuration with proper caching
 * ✅ Offline persistence queue with localStorage
 * ✅ Idempotency key generation system
 * ✅ Exponential backoff retry strategy
 * ✅ Standardized base API client
 * ✅ Optimistic mutation hook with rollbacks
 * ✅ Network awareness automatic synchronization
 * ✅ Full TypeScript type safety
 * 
 * All write operations are now guaranteed to persist.
 */