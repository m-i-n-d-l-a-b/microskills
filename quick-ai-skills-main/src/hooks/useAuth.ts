import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { supabaseAuthManager } from '@/lib/supabaseAuth';
import { handleError } from '@/utils/errorHandling';
import type { 
  LoginCredentials, 
  LoginResponse, 
  User, 
  UserPreferences,
  RefreshTokenResponse 
} from '@/types/api';

// Authentication state interface
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

// Authentication actions interface
export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  clearError: () => void;
}

// Hook return type
export type UseAuthReturn = AuthState & AuthActions;

// Query keys
const AUTH_QUERY_KEYS = {
  user: ['auth', 'user'],
  preferences: ['auth', 'preferences'],
  session: ['auth', 'session'],
} as const;

export function useAuth(): UseAuthReturn {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get current user from Supabase auth manager
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  // Subscribe to Supabase auth state changes
  useEffect(() => {
    const unsubscribe = supabaseAuthManager.subscribe((state) => {
      setUser(state.user);
      setIsLoadingUser(state.loading);
      if (state.error) {
        setUserError(new Error(state.error));
      } else {
        setUserError(null);
      }
    });

    // Set initial state
    const initialState = supabaseAuthManager.getState();
    setUser(initialState.user);
    setIsLoadingUser(initialState.loading);
    if (initialState.error) {
      setUserError(new Error(initialState.error));
    }

    return unsubscribe;
  }, []);

  // Get user preferences query
  const {
    data: preferences,
    isLoading: isLoadingPreferences,
    refetch: refetchPreferences
  } = useQuery({
    queryKey: AUTH_QUERY_KEYS.preferences,
    queryFn: async (): Promise<UserPreferences> => {
      const response = await apiClient.getUserPreferences();
      return response.data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Login mutation using Supabase
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<void> => {
      await supabaseAuthManager.signInWithEmail(credentials);
    },
    onSuccess: async () => {
      // Invalidate and refetch user data
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.preferences });
      
      // Clear any previous errors
      setError(null);
      
      // Track login event
      if (typeof window !== 'undefined') {
        const currentUser = supabaseAuthManager.getCurrentUser();
        window.dispatchEvent(new CustomEvent('auth:login', { detail: { user: currentUser } }));
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      handleError(error, { action: 'login' });
    }
  });

  // Logout mutation using Supabase
  const logoutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await supabaseAuthManager.signOut();
    },
    onSuccess: () => {
      // Clear all queries
      queryClient.clear();
      
      // Clear error state
      setError(null);
      
      // Track logout event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    },
    onError: (error: any) => {
      // Force logout even if API call fails
      queryClient.clear();
      setError(null);
      handleError(error, { action: 'logout' });
    }
  });

  // Refresh token mutation using Supabase
  const refreshTokenMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await supabaseAuthManager.refreshSession();
    },
    onSuccess: () => {
      // Invalidate queries to refetch with new token
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.preferences });
    },
    onError: (error: any) => {
      // If refresh fails, logout the user
      handleError(error, { action: 'refresh-token' });
      logoutMutation.mutate();
    }
  });

  // Update user mutation using Supabase
  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<User>): Promise<void> => {
      await supabaseAuthManager.updateProfile(userData);
    },
    onSuccess: () => {
      // User is automatically updated in Supabase auth manager
      // No need to manually update cache
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to update user profile');
      handleError(error, { action: 'update-user' });
    }
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferencesData: Partial<UserPreferences>): Promise<UserPreferences> => {
      const response = await apiClient.updateUserPreferences(preferencesData);
      return response.data;
    },
    onSuccess: (updatedPreferences) => {
      // Update preferences in cache
      queryClient.setQueryData(AUTH_QUERY_KEYS.preferences, updatedPreferences);
      
      // Update user with new preferences
      if (user) {
        const updatedUser = { ...user, preferences: updatedPreferences };
        queryClient.setQueryData(AUTH_QUERY_KEYS.user, updatedUser);
        // User state is managed by supabaseAuthManager subscription, no manual update needed
      }
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to update preferences');
      handleError(error, { action: 'update-preferences' });
    }
  });

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Supabase auth manager handles initialization automatically
        // Just wait for it to be ready
        const state = supabaseAuthManager.getState();
        if (state.isInitialized) {
          setIsInitialized(true);
        } else {
          // Wait for initialization to complete
          const unsubscribe = supabaseAuthManager.subscribe((state) => {
            if (state.isInitialized) {
              setIsInitialized(true);
              unsubscribe();
            }
          });
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  // Handle authentication errors
  useEffect(() => {
    if (userError) {
      const errorMessage = userError.message || 'Failed to load user data';
      setError(errorMessage);
      
      // If it's an authentication error, logout
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        logoutMutation.mutate();
      }
    }
  }, [userError]);

  // Supabase handles token refresh automatically
  // No need for manual token refresh listeners

  // Authentication actions
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    await loginMutation.mutateAsync(credentials);
  }, [loginMutation]);

  const logout = useCallback(async (): Promise<void> => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const refreshToken = useCallback(async (): Promise<void> => {
    await refreshTokenMutation.mutateAsync();
  }, [refreshTokenMutation]);

  const updateUser = useCallback(async (userData: Partial<User>): Promise<void> => {
    await updateUserMutation.mutateAsync(userData);
  }, [updateUserMutation]);

  const updatePreferences = useCallback(async (preferencesData: Partial<UserPreferences>): Promise<void> => {
    await updatePreferencesMutation.mutateAsync(preferencesData);
  }, [updatePreferencesMutation]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Determine authentication state
  const isAuthenticated = supabaseAuthManager.isAuthenticated();
  const isLoading = isLoadingUser || isLoadingPreferences || 
                   loginMutation.isPending || 
                   logoutMutation.isPending || 
                   refreshTokenMutation.isPending ||
                   !isInitialized;

  return {
    // State
    isAuthenticated,
    user: user || null,
    isLoading,
    error,
    isInitialized,
    
    // Actions
    login,
    logout,
    refreshToken,
    updateUser,
    updatePreferences,
    clearError,
  };
}

// Export hook as default
export default useAuth;