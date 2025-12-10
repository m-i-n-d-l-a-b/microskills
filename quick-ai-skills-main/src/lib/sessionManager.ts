import { supabase } from './supabase';
import { STORAGE_KEYS } from './constants';
import type { SupabaseSession } from './supabase';

// Session management interface
export interface SessionInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  isExpired: boolean;
  timeUntilExpiry: number;
}

// Session event types
export type SessionEvent = 'session_created' | 'session_refreshed' | 'session_expired' | 'session_cleared';

// Session event listener type
export type SessionEventListener = (event: SessionEvent, session?: SessionInfo) => void;

export class SessionManager {
  private listeners: Map<SessionEvent, Set<SessionEventListener>> = new Map();
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

  constructor() {
    this.initialize();
  }

  // Initialize session manager
  private async initialize(): Promise<void> {
    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      await this.handleAuthStateChange(event, session);
    });

    // Set up automatic token refresh
    await this.setupAutoRefresh();
  }

  // Handle authentication state changes
  private async handleAuthStateChange(event: string, session: SupabaseSession | null): Promise<void> {
    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
        if (session) {
          await this.setSession(session);
          this.emit('session_created', this.getSessionInfo(session));
        }
        break;
      
      case 'SIGNED_OUT':
        this.clearSession();
        this.emit('session_cleared');
        break;
    }
  }

  // Set up automatic token refresh
  private async setupAutoRefresh(): Promise<void> {
    const session = await this.getCurrentSession();
    if (session) {
      this.scheduleRefresh(session);
    }
  }

  // Schedule token refresh
  private scheduleRefresh(session: SupabaseSession): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const expiresAt = session.expires_at || (Date.now() + session.expires_in * 1000);
    const timeUntilRefresh = expiresAt - Date.now() - this.REFRESH_THRESHOLD;

    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(async () => {
        await this.refreshSession();
      }, timeUntilRefresh);
    } else {
      // Token is already close to expiry, refresh immediately
      // Use void to explicitly mark as fire-and-forget, but handle errors
      void this.refreshSession().catch((error) => {
        console.error('Failed to refresh session immediately:', error);
        // Session refresh failure is already handled in refreshSession method
      });
    }
  }

  // Get current session from Supabase
  private async getCurrentSession(): Promise<SupabaseSession | null> {
    try {
      const response = await supabase.auth.getSession();
      if (!response) {
        return null;
      }
      const { data, error } = response;
      if (error) {
        console.error('Failed to get session:', error);
        return null;
      }
      const session = data?.session || null;
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  // Set session data
  private async setSession(session: SupabaseSession): Promise<void> {
    // Store session data in localStorage for persistence
    const sessionData = {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at || (Date.now() + session.expires_in * 1000),
      userId: session.user.id,
    };

    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, sessionData.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, sessionData.refreshToken);
    localStorage.setItem('session_expires_at', sessionData.expiresAt.toString());
    localStorage.setItem('session_user_id', sessionData.userId);

    // Schedule next refresh
    this.scheduleRefresh(session);
  }

  // Clear session data
  private clearSession(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem('session_expires_at');
    localStorage.removeItem('session_user_id');

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // Refresh session
  public async refreshSession(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Failed to refresh session:', error);
        this.clearSession();
        this.emit('session_expired');
        return false;
      }

      if (data.session) {
        await this.setSession(data.session);
        this.emit('session_refreshed', this.getSessionInfo(data.session));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error refreshing session:', error);
      this.clearSession();
      this.emit('session_expired');
      return false;
    }
  }

  // Get session info
  public getSessionInfo(session?: SupabaseSession): SessionInfo | null {
    const currentSession = session || this.getStoredSession();
    
    if (!currentSession) {
      return null;
    }

    const expiresAt = currentSession.expires_at || (Date.now() + currentSession.expires_in * 1000);
    const now = Date.now();

    return {
      accessToken: currentSession.access_token,
      refreshToken: currentSession.refresh_token,
      expiresAt,
      userId: currentSession.user.id,
      isExpired: now >= expiresAt,
      timeUntilExpiry: Math.max(0, expiresAt - now),
    };
  }

  // Get stored session from localStorage
  private getStoredSession(): SupabaseSession | null {
    const accessToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const expiresAt = localStorage.getItem('session_expires_at');
    const userId = localStorage.getItem('session_user_id');

    if (!accessToken || !refreshToken || !expiresAt || !userId) {
      return null;
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: Math.floor((parseInt(expiresAt) - Date.now()) / 1000),
      expires_at: parseInt(expiresAt),
      token_type: 'bearer',
      user: {
        id: userId,
        email: '',
        created_at: '',
        updated_at: '',
        user_metadata: {},
        app_metadata: {},
        aud: 'authenticated',
        role: 'user',
      },
    };
  }

  // Check if session is valid
  public isSessionValid(): boolean {
    const sessionInfo = this.getSessionInfo();
    return sessionInfo !== null && !sessionInfo.isExpired;
  }

  // Get access token
  public getAccessToken(): string | null {
    const sessionInfo = this.getSessionInfo();
    return sessionInfo?.accessToken || null;
  }

  // Get refresh token
  public getRefreshToken(): string | null {
    const sessionInfo = this.getSessionInfo();
    return sessionInfo?.refreshToken || null;
  }

  // Check if session needs refresh
  public shouldRefreshSession(): boolean {
    const sessionInfo = this.getSessionInfo();
    if (!sessionInfo) return false;

    // Refresh if session expires within the threshold
    return sessionInfo.timeUntilExpiry <= this.REFRESH_THRESHOLD;
  }

  // Force refresh session
  public async forceRefresh(): Promise<boolean> {
    return await this.refreshSession();
  }

  // Add event listener
  public on(event: SessionEvent, listener: SessionEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  // Remove event listener
  public off(event: SessionEvent, listener: SessionEventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  // Emit event to listeners
  private emit(event: SessionEvent, session?: SessionInfo): void {
    this.listeners.get(event)?.forEach(listener => {
      try {
        listener(event, session);
      } catch (error) {
        console.error(`Error in session event listener for ${event}:`, error);
      }
    });
  }

  // Get session statistics
  public getSessionStats(): {
    isActive: boolean;
    timeUntilExpiry: number;
    lastRefresh: number | null;
    refreshCount: number;
  } {
    const sessionInfo = this.getSessionInfo();
    const lastRefresh = localStorage.getItem('last_refresh_time');
    const refreshCount = parseInt(localStorage.getItem('refresh_count') || '0');

    return {
      isActive: this.isSessionValid(),
      timeUntilExpiry: sessionInfo?.timeUntilExpiry || 0,
      lastRefresh: lastRefresh ? parseInt(lastRefresh) : null,
      refreshCount,
    };
  }

  // Clear all session data and listeners
  public destroy(): void {
    this.clearSession();
    this.listeners.clear();
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Create singleton instance
export const sessionManager = new SessionManager();

// Export default instance
export default sessionManager; 