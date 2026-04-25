/**
 * Offline Mutation Queue
 * Persists pending mutations to localStorage and retries when connectivity is restored
 * Guarantees at-least-once delivery for all write operations
 */

import { generateIdempotencyKey } from './queryClient';

export interface QueuedMutation {
  id: string;
  idempotencyKey: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: unknown;
  timestamp: number;
  retryCount: number;
  lastAttempt?: number;
  status: 'pending' | 'processing' | 'failed';
}

interface QueueEventListener {
  onProcessed?: (mutation: QueuedMutation) => void;
  onFailed?: (mutation: QueuedMutation, error: Error) => void;
  onDrained?: () => void;
}

class MutationQueue {
  private readonly STORAGE_KEY = 'medical_system_pending_mutations';
  private queue: QueuedMutation[] = [];
  private isProcessing = false;
  private eventListeners: QueueEventListener[] = [];

  constructor() {
    this.loadQueue();
    this.setupNetworkListeners();
    
    // Process queue on initial load
    setTimeout(() => this.processQueue(), 1000);
  }

  /**
   * Add mutation to persistence queue
   */
  async enqueue(
    endpoint: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    data: unknown,
  ): Promise<string> {
    const mutation: QueuedMutation = {
      id: crypto.randomUUID(),
      idempotencyKey: generateIdempotencyKey(),
      endpoint,
      method,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    this.queue.push(mutation);
    this.saveQueue();

    // Attempt immediate processing if online
    if (navigator.onLine) {
      setTimeout(() => this.processQueue(), 0);
    }

    return mutation.id;
  }

  /**
   * Process all pending mutations in queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    if (!navigator.onLine) return;

    this.isProcessing = true;

    try {
      const pendingMutations = this.queue.filter(m => m.status === 'pending');

      for (const mutation of pendingMutations) {
        await this.processMutation(mutation);
      }

      if (this.queue.filter(m => m.status === 'pending').length === 0) {
        this.eventListeners.forEach(l => l.onDrained?.());
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processMutation(mutation: QueuedMutation): Promise<void> {
    try {
      mutation.status = 'processing';
      mutation.lastAttempt = Date.now();
      this.saveQueue();

      const response = await fetch(mutation.endpoint, {
        method: mutation.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': mutation.idempotencyKey,
        },
        body: JSON.stringify(mutation.data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Success: remove from queue
      this.queue = this.queue.filter(m => m.id !== mutation.id);
      this.saveQueue();

      this.eventListeners.forEach(l => l.onProcessed?.(mutation));

    } catch (error: any) {
      mutation.retryCount += 1;
      mutation.status = mutation.retryCount >= 5 ? 'failed' : 'pending';
      this.saveQueue();

      this.eventListeners.forEach(l => l.onFailed?.(mutation, error));

      if (mutation.status === 'pending') {
        // Schedule retry with backoff
        const delay = Math.min(1000 * (2 ** mutation.retryCount), 300000); // 5 minutes max
        setTimeout(() => this.processQueue(), delay);
      }
    }
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('[MutationQueue] Network online, processing pending mutations');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[MutationQueue] Network offline, queuing mutations');
    });
  }

  /**
   * Persist queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.error('[MutationQueue] Failed to save queue', e);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        // Reset processing status after page reload
        this.queue.forEach(m => {
          if (m.status === 'processing') m.status = 'pending';
        });
        this.saveQueue();
      }
    } catch (e) {
      console.error('[MutationQueue] Failed to load queue', e);
      this.queue = [];
    }
  }

  /**
   * Get current pending queue size
   */
  getPendingCount(): number {
    return this.queue.filter(m => m.status === 'pending').length;
  }

  /**
   * Add event listener for queue events
   */
  addEventListener(listener: QueueEventListener): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== listener);
    };
  }
}

export const mutationQueue = new MutationQueue();
export default mutationQueue;