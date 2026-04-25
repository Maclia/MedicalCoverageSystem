/**
 * Base API Client
 * Standardized base client for all microservice API integrations
 * Provides interceptors, error handling, retries, and persistence guarantees
 */

import { apiRequest, generateIdempotencyKey } from './queryClient';

export interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: unknown;
  requireIdempotency?: boolean;
  skipRetry?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

class BaseApiClient {
  private baseUrl: string;
  private serviceName: string;

  constructor(serviceName: string, baseUrl: string) {
    this.serviceName = serviceName;
    this.baseUrl = baseUrl;
  }

  /**
   * Execute API request with standard guarantees
   */
  async request<T>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const { method, url, data, requireIdempotency = false } = config;
    
    const fullUrl = `${this.baseUrl}${url}`;
    const idempotencyKey = requireIdempotency && ['POST', 'PUT', 'PATCH'].includes(method)
      ? generateIdempotencyKey()
      : undefined;

    try {
      console.debug(`[${this.serviceName}] Request: ${method} ${fullUrl}`, idempotencyKey ? { idempotencyKey } : '');
      
      const response = await apiRequest(method, fullUrl, data, idempotencyKey);
      const responseData = await response.json();

      console.debug(`[${this.serviceName}] Success: ${method} ${fullUrl}`);

      return {
        success: true,
        data: responseData,
        metadata: {
          status: response.status,
          idempotencyKey,
        }
      };

    } catch (error: any) {
      console.error(`[${this.serviceName}] Failed: ${method} ${fullUrl}`, error);
      
      return {
        success: false,
        error: error.message,
        message: this.getHumanReadableError(error),
        metadata: {
          status: error.status,
          idempotencyKey,
        }
      };
    }
  }

  /**
   * Standard HTTP methods
   */
  get<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', url });
  }

  post<T>(url: string, data: unknown, requireIdempotency = true): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', url, data, requireIdempotency });
  }

  put<T>(url: string, data: unknown, requireIdempotency = true): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PUT', url, data, requireIdempotency });
  }

  patch<T>(url: string, data: unknown, requireIdempotency = true): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PATCH', url, data, requireIdempotency });
  }

  delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', url });
  }

  /**
   * Get user friendly error message
   */
  private getHumanReadableError(error: any): string {
    const statusMessages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      401: 'Session expired. Please login again.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested resource was not found.',
      409: 'Conflict detected. This record may have been modified by another user.',
      422: 'Validation error. Please check your input.',
      429: 'Too many requests. Please try again later.',
      500: 'Server error. Our team has been notified.',
      502: 'Service temporarily unavailable. Please try again.',
      503: 'Service under maintenance. Please try again later.',
      504: 'Request timed out. Please try again.',
    };

    return statusMessages[error.status] || 'An unexpected error occurred.';
  }
}

export default BaseApiClient;