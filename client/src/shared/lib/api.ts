import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  message?: string
  errors?: string[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

class ApiClient {
  private instance: AxiosInstance
  private authToken: string | null = null

  constructor(baseURL: string) {
    this.instance = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request Interceptor
    this.instance.interceptors.request.use(
      (config) => {
        if (this.authToken && config.headers) {
          config.headers.Authorization = `Bearer ${this.authToken}`
        }
        
        console.debug(`[API] ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response Interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response
      },
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - clear token, redirect to login
          this.authToken = null
          window.location.href = '/login'
        }

        // Log errors
        console.error('[API Error]', error.response?.data?.message || error.message)
        return Promise.reject(error)
      }
    )
  }

  setAuthToken(token: string | null) {
    this.authToken = token
  }

  // Generic request methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<ApiResponse<T>>(url, config)
    return response.data.data
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<ApiResponse<T>>(url, data, config)
    return response.data.data
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config)
    return response.data.data
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch<ApiResponse<T>>(url, data, config)
    return response.data.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config)
    return response.data.data
  }

  getRawClient(): AxiosInstance {
    return this.instance
  }
}

// Singleton instance
export const apiClient = new ApiClient(
  import.meta.env.VITE_API_URL || '/api'
)

export default apiClient