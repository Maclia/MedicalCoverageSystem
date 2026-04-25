import { QueryClient, QueryFunction, QueryCache, MutationCache } from "@tanstack/react-query";

// Idempotency key generator for write operations
export const generateIdempotencyKey = (): string => {
  return `${Date.now()}-${crypto.randomUUID()}`;
};

// Retry configuration - only retry safe operations
const retryStrategy = (failureCount: number, error: any): boolean => {
  // Never retry more than 3 times
  if (failureCount > 3) return false;
  
  // Only retry on network errors or 5xx status codes
  if (!error.response) return true;
  const status = error.response.status;
  return status >= 500 && status < 600;
};

// Exponential backoff delay
const retryDelay = (attemptIndex: number): number => {
  return Math.min(1000 * 2 ** attemptIndex, 30000);
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    const error = new Error(`${res.status}: ${text}`) as any;
    error.status = res.status;
    error.statusText = res.statusText;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  idempotencyKey?: string,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (idempotencyKey) {
    headers["X-Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Global cache error handling
const queryCache = new QueryCache({
  onError: (error, query) => {
    console.error(`Query failed: ${query.queryKey}`, error);
  },
});

const mutationCache = new MutationCache({
  onError: (error, _mutation) => {
    console.error(`Mutation failed`, error);
  },
  onSuccess: () => {
    // Automatic invalidation will be handled per-mutation
  },
});

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (replaced cacheTime in React Query v5)
      retry: retryStrategy,
      retryDelay,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: retryStrategy,
      retryDelay,
      networkMode: 'offlineFirst',
    },
  },
});
