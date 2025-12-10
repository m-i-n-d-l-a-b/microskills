import { supabase, type OAuthProvider, type AuthOptions, type SupabaseUser, type SupabaseSession } from './supabase';
import { STORAGE_KEYS, ERROR_MESSAGES } from './constants';
import type { User, LoginCredentials, LoginResponse, RefreshTokenResponse } from '@/types/api';

// Authentication state interface
export interface SupabaseAuthState {
  user: User | null;
  session: SupabaseSession | null;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
}

// Authentication actions interface
export interface SupabaseAuthActions {
  signInWithEmail: (credentials: LoginCredentials) => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider, options?: AuthOptions) => Promise<void>;
  signUp: (credentials: LoginCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (profile: Partial<User>) => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

// Hook return type
export type UseSupabaseAuthReturn = SupabaseAuthState & SupabaseAuthActions;

// Convert Supabase user to our User type
const convertSupabaseUser = (supabaseUser: SupabaseUser): User => {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || '',
    avatar: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || '',
    role: supabaseUser.role || 'user',
    preferences: supabaseUser.user_metadata?.preferences || {},
    createdAt: supabaseUser.created_at,
    updatedAt: supabaseUser.updated_at,
    emailVerified: !!supabaseUser.email_confirmed_at,
    phoneVerified: !!supabaseUser.phone_confirmed_at,
  };
};

// Convert our User type to Supabase user metadata
const convertToSupabaseMetadata = (user: Partial<User>) => {
  return {
    full_name: user.name,
    avatar_url: user.avatar,
    preferences: user.preferences,
  };
};

export class SupabaseAuthManager {
  private authState: SupabaseAuthState = {
    user: null,
    session: null,
    loading: true,
    error: null,
    isInitialized: false,
  };

  private listeners: Set<(state: SupabaseAuthState) => void> = new Set();

  constructor() {
    this.initialize();
  }

  // Initialize authentication state
  private async initialize(): Promise<void> {
    try {
      // Get initial session
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        this.updateState({ error: error.message, loading: false, isInitialized: true });
        return;
      }
      
      const session = data?.session || null;

      if (session) {
        const user = convertSupabaseUser(session.user);
        this.updateState({
          user,
          session,
          loading: false,
          isInitialized: true,
        });
      } else {
        this.updateState({ loading: false, isInitialized: true });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        await this.handleAuthStateChange(event, session);
      });

    } catch (error) {
      this.updateState({
        error: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
        loading: false,
        isInitialized: true,
      });
    }
  }

  // Handle authentication state changes
  private async handleAuthStateChange(event: string, session: SupabaseSession | null): Promise<void> {
    switch (event) {
      case 'SIGNED_IN':
        if (session) {
          const user = convertSupabaseUser(session.user);
          this.updateState({ user, session, error: null });
        }
        break;
      
      case 'SIGNED_OUT':
        this.updateState({ user: null, session: null, error: null });
        break;
      
      case 'TOKEN_REFRESHED':
        if (session) {
          const user = convertSupabaseUser(session.user);
          this.updateState({ user, session, error: null });
        }
        break;
      
      case 'USER_UPDATED':
        if (session) {
          const user = convertSupabaseUser(session.user);
          this.updateState({ user, session, error: null });
        }
        break;
    }
  }

  // Update authentication state
  private updateState(updates: Partial<SupabaseAuthState>): void {
    this.authState = { ...this.authState, ...updates };
    this.notifyListeners();
  }

  // Notify state change listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.authState));
  }

  // Subscribe to auth state changes
  public subscribe(listener: (state: SupabaseAuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Sign in with email and password
  public async signInWithEmail(credentials: LoginCredentials): Promise<void> {
    try {
      this.updateState({ loading: true, error: null });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user && data.session) {
        const user = convertSupabaseUser(data.user);
        this.updateState({ user, session: data.session, loading: false });
      }
    } catch (error) {
      this.updateState({
        error: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
        loading: false,
      });
      throw error;
    }
  }

  // Sign in with OAuth provider
  public async signInWithOAuth(provider: OAuthProvider, options?: AuthOptions): Promise<void> {
    try {
      this.updateState({ loading: true, error: null });
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: options?.redirectTo || `${window.location.origin}/auth/callback`,
          scopes: options?.scopes,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // OAuth redirect will happen automatically
      // The auth state change will be handled by the listener
    } catch (error) {
      this.updateState({
        error: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
        loading: false,
      });
      throw error;
    }
  }

  // Sign up with email and password
  public async signUp(credentials: LoginCredentials): Promise<void> {
    try {
      this.updateState({ loading: true, error: null });
      
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        this.updateState({
          loading: false,
          error: 'Please check your email to confirm your account.',
        });
      } else if (data.user && data.session) {
        const user = convertSupabaseUser(data.user);
        this.updateState({ user, session: data.session, loading: false });
      }
    } catch (error) {
      this.updateState({
        error: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
        loading: false,
      });
      throw error;
    }
  }

  // Sign out
  public async signOut(): Promise<void> {
    try {
      this.updateState({ loading: true, error: null });
      
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new Error(error.message);
      }

      this.updateState({ user: null, session: null, loading: false });
    } catch (error) {
      this.updateState({
        error: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
        loading: false,
      });
      throw error;
    }
  }

  // Reset password
  public async resetPassword(email: string): Promise<void> {
    try {
      this.updateState({ loading: true, error: null });
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw new Error(error.message);
      }

      this.updateState({ loading: false });
    } catch (error) {
      this.updateState({
        error: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
        loading: false,
      });
      throw error;
    }
  }

  // Update password
  public async updatePassword(password: string): Promise<void> {
    try {
      this.updateState({ loading: true, error: null });
      
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      this.updateState({ loading: false });
    } catch (error) {
      this.updateState({
        error: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
        loading: false,
      });
      throw error;
    }
  }

  // Update user profile
  public async updateProfile(profile: Partial<User>): Promise<void> {
    try {
      this.updateState({ loading: true, error: null });
      
      const metadata = convertToSupabaseMetadata(profile);
      
      const { data, error } = await supabase.auth.updateUser({
        data: metadata,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user) {
        const user = convertSupabaseUser(data.user);
        this.updateState({ user, loading: false });
      }
    } catch (error) {
      this.updateState({
        error: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
        loading: false,
      });
      throw error;
    }
  }

  // Refresh session
  public async refreshSession(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw new Error(error.message);
      }

      if (data.user && data.session) {
        const user = convertSupabaseUser(data.user);
        this.updateState({ user, session: data.session });
      }
    } catch (error) {
      this.updateState({
        error: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
      });
      throw error;
    }
  }

  // Clear error
  public clearError(): void {
    this.updateState({ error: null });
  }

  // Get current state
  public getState(): SupabaseAuthState {
    return { ...this.authState };
  }

  // Get current user
  public getCurrentUser(): User | null {
    return this.authState.user;
  }

  // Get current session
  public getCurrentSession(): SupabaseSession | null {
    return this.authState.session;
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return !!this.authState.user && !!this.authState.session;
  }

  // Get access token
  public getAccessToken(): string | null {
    return this.authState.session?.access_token || null;
  }

  // Get refresh token
  public getRefreshToken(): string | null {
    return this.authState.session?.refresh_token || null;
  }
}

// Create singleton instance
export const supabaseAuthManager = new SupabaseAuthManager();

// Export default instance
export default supabaseAuthManager; 