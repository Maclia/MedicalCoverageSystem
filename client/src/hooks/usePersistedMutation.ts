/**
 * Persisted Mutation Hook
 * React Query mutation wrapper with automatic persistence guarantees
 * Provides optimistic updates, offline queueing, and rollback on failure
 */

import { useMutation, useQueryClient, MutationOptions, MutationFunction } from '@tanstack/react-query';
import mutationQueue from '../lib/mutationQueue';

interface UsePersistedMutationOptions<TData = unknown, TError = Error, TVariables = unknown, TContext = unknown>
  extends Omit<MutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> {
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  invalidates?: string[];
  optimisticUpdate?: (variables: TVariables) => TContext;
  rollback?: (context: TContext) => void;
}

/**
 * React Query hook with full persistence guarantees
 * Automatically queues mutations when offline, provides optimistic updates, and handles rollbacks
 */
export function usePersistedMutation<TData = unknown, TError = Error, TVariables = unknown, TContext = unknown>(
  options: UsePersistedMutationOptions<TData, TError, TVariables, TContext>
) {
  const queryClient = useQueryClient();

  const mutationFn: MutationFunction<TData, TVariables> = async (variables) => {
    // If online: execute immediately
    if (navigator.onLine) {
      const response = await fetch(options.endpoint, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variables),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    }

    // If offline: add to persistence queue
    await mutationQueue.enqueue(options.endpoint, options.method, variables);
    
    // Return optimistic data immediately
    return {} as TData;
  };

  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn,
    
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      if (options.invalidates) {
        await Promise.all(
          options.invalidates.map(key => 
            queryClient.cancelQueries({ queryKey: [key] })
          )
        );
      }

      // Perform optimistic update
      if (options.optimisticUpdate) {
        return options.optimisticUpdate(variables);
      }

      return undefined as TContext;
    },

    onError: (error, variables, context) => {
      // Rollback optimistic updates on failure
      if (options.rollback && context) {
        options.rollback(context);
      }
    },

    onSuccess: (data, variables, context) => {
      // Invalidate related queries after successful mutation
      if (options.invalidates && navigator.onLine) {
        options.invalidates.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
    },

    // Allow user provided callbacks
    ...options,
  });
}

export default usePersistedMutation;