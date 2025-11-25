import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Types
export interface User {
  id: number;
  email: string;
  userType: 'insurance' | 'institution' | 'provider';
  entityId: number;
  isActive: boolean;
  lastLogin?: Date;
  entityData: any;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  userType?: 'insurance' | 'institution' | 'provider';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  hasRole: (role: 'insurance' | 'institution' | 'provider') => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const queryClient = useQueryClient();

  // Store tokens in localStorage
  const storeTokens = (tokens: AuthTokens) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(tokens.user));
  };

  // Clear tokens from localStorage
  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  // Get tokens from localStorage
  const getStoredTokens = (): AuthTokens | null => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userStr = localStorage.getItem('user');

    if (accessToken && refreshToken && userStr) {
      try {
        const user = JSON.parse(userStr);
        return { accessToken, refreshToken, user };
      } catch (error) {
        clearTokens();
        return null;
      }
    }
    return null;
  };

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<AuthTokens> => {
      dispatch({ type: 'AUTH_START' });
      const response = await apiRequest('POST', '/api/auth/login', credentials);
      return response.json();
    },
    onSuccess: (tokens) => {
      storeTokens(tokens);
      dispatch({ type: 'AUTH_SUCCESS', payload: tokens.user });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: any) => {
      dispatch({ type: 'AUTH_FAILURE', payload: error.message || 'Login failed' });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiRequest('POST', '/api/auth/logout', { refreshToken });
      }
    },
    onSuccess: () => {
      clearTokens();
      dispatch({ type: 'LOGOUT' });
      queryClient.clear();
    },
  });

  // Refresh token mutation
  const refreshTokenMutation = useMutation({
    mutationFn: async (): Promise<AuthTokens> => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      const response = await apiRequest('POST', '/api/auth/refresh', { refreshToken });
      return response.json();
    },
    onSuccess: (tokens) => {
      storeTokens(tokens);
      dispatch({ type: 'AUTH_SUCCESS', payload: tokens.user });
    },
    onError: () => {
      clearTokens();
      dispatch({ type: 'LOGOUT' });
    },
  });

  // Check for existing auth on mount
  useEffect(() => {
    const storedTokens = getStoredTokens();
    if (storedTokens) {
      dispatch({ type: 'AUTH_SUCCESS', payload: storedTokens.user });
    }
  }, []);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const interval = setInterval(() => {
      refreshTokenMutation.mutate();
    }, 14 * 60 * 1000); // Refresh every 14 minutes

    return () => clearInterval(interval);
  }, [state.isAuthenticated]);

  const login = async (credentials: LoginCredentials) => {
    await loginMutation.mutateAsync(credentials);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const refreshToken = async () => {
    await refreshTokenMutation.mutateAsync();
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const hasRole = (role: 'insurance' | 'institution' | 'provider'): boolean => {
    return state.user?.userType === role;
  };

  const isAdmin = (): boolean => {
    return state.user?.userType === 'insurance';
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshToken,
    clearError,
    hasRole,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook for API requests with authentication
export const useAuthenticatedRequest = () => {
  const { isAuthenticated, refreshToken } = useAuth();

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const accessToken = localStorage.getItem('accessToken');

    let headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (accessToken) {
      headers = {
        ...headers,
        'Authorization': `Bearer ${accessToken}`,
      };
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // If token expired, try to refresh and retry
    if (response.status === 401 && isAuthenticated) {
      try {
        await refreshToken();
        const newAccessToken = localStorage.getItem('accessToken');
        if (newAccessToken) {
          headers = {
            ...headers,
            'Authorization': `Bearer ${newAccessToken}`,
          };
          response = await fetch(url, {
            ...options,
            headers,
          });
        }
      } catch (error) {
        // Refresh failed, user will be logged out
        throw error;
      }
    }

    return response;
  };

  return { makeAuthenticatedRequest };
};

export default AuthProvider;