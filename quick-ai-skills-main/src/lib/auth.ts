import { STORAGE_KEYS, ERROR_MESSAGES } from "./constants";
import type { LoginResponse, RefreshTokenResponse, User } from "@/types/api";

// Token management interface
export interface TokenData {
	token: string;
	refreshToken: string;
	expiresAt: string;
	userId: string;
}

// Session management interface
export interface SessionData {
	user: User;
	tokenData: TokenData;
	lastActivity: string;
}

// Token refresh callback type
export type TokenRefreshCallback = (tokenData: TokenData) => void;

// Authentication state
export interface AuthState {
	isAuthenticated: boolean;
	user: User | null;
	tokenData: TokenData | null;
	isLoading: boolean;
	error: string | null;
}

// Token refresh options
export interface TokenRefreshOptions {
	autoRefresh?: boolean;
	refreshThreshold?: number; // minutes before expiry to refresh
	maxRetries?: number;
	retryDelay?: number;
}

export class AuthManager {
	private refreshCallbacks: TokenRefreshCallback[] = [];
	private refreshTimeout: NodeJS.Timeout | null = null;
	private isRefreshing = false;
	private refreshPromise: Promise<TokenData> | null = null;

	// Default options
	private options: Required<TokenRefreshOptions> = {
		autoRefresh: true,
		refreshThreshold: 5, // 5 minutes before expiry
		maxRetries: 3,
		retryDelay: 1000,
	};

	constructor(options?: TokenRefreshOptions) {
		this.options = { ...this.options, ...options };
		this.initializeAutoRefresh();
	}

	// Initialize auto-refresh mechanism
	private initializeAutoRefresh(): void {
		if (this.options.autoRefresh && typeof window !== "undefined") {
			// Check token on page load
			this.checkAndRefreshToken();

			// Set up periodic checks
			setInterval(() => {
				this.checkAndRefreshToken();
			}, 60000); // Check every minute

			// Set up activity listener for session management
			this.setupActivityListener();
		}
	}

	// Set up activity listener for session management
	private setupActivityListener(): void {
		if (typeof window === "undefined") return;

		const events = [
			"mousedown",
			"mousemove",
			"keypress",
			"scroll",
			"touchstart",
		];

		const updateActivity = () => {
			const sessionData = this.getSessionData();
			if (sessionData) {
				sessionData.lastActivity = new Date().toISOString();
				this.setSessionData(sessionData);
			}
		};

		events.forEach((event) => {
			window.addEventListener(event, updateActivity, { passive: true });
		});
	}

	// Store token data
	public setTokenData(tokenData: TokenData): void {
		try {
			localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, tokenData.token);
			localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refreshToken);
			localStorage.setItem("token_expires_at", tokenData.expiresAt);
			localStorage.setItem("user_id", tokenData.userId);

			// Schedule next refresh
			this.scheduleTokenRefresh(tokenData.expiresAt);
		} catch (error) {
			console.error("Failed to store token data:", error);
			throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
		}
	}

	// Get token data
	public getTokenData(): TokenData | null {
		try {
			const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
			const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
			const expiresAt = localStorage.getItem("token_expires_at");
			const userId = localStorage.getItem("user_id");

			if (!token || !refreshToken || !expiresAt || !userId) {
				return null;
			}

			return {
				token,
				refreshToken,
				expiresAt,
				userId,
			};
		} catch (error) {
			console.error("Failed to retrieve token data:", error);
			return null;
		}
	}

	// Store session data
	public setSessionData(sessionData: SessionData): void {
		try {
			localStorage.setItem("session_data", JSON.stringify(sessionData));
		} catch (error) {
			console.error("Failed to store session data:", error);
		}
	}

	// Get session data
	public getSessionData(): SessionData | null {
		try {
			const sessionData = localStorage.getItem("session_data");
			return sessionData ? JSON.parse(sessionData) : null;
		} catch (error) {
			console.error("Failed to retrieve session data:", error);
			return null;
		}
	}

	// Clear all authentication data
	public clearAuthData(): void {
		try {
			localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
			localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
			localStorage.removeItem("token_expires_at");
			localStorage.removeItem("user_id");
			localStorage.removeItem("session_data");

			// Clear refresh timeout
			if (this.refreshTimeout) {
				clearTimeout(this.refreshTimeout);
				this.refreshTimeout = null;
			}
		} catch (error) {
			console.error("Failed to clear auth data:", error);
		}
	}

	// Check if token is valid
	public isTokenValid(tokenData?: TokenData): boolean {
		const data = tokenData || this.getTokenData();
		if (!data) return false;

		const now = new Date();
		const expiry = new Date(data.expiresAt);

		return now < expiry;
	}

	// Check if token needs refresh
	public shouldRefreshToken(tokenData?: TokenData): boolean {
		const data = tokenData || this.getTokenData();
		if (!data) return false;

		const now = new Date();
		const expiry = new Date(data.expiresAt);
		const threshold = new Date(
			expiry.getTime() - this.options.refreshThreshold * 60 * 1000,
		);

		return now >= threshold;
	}

	// Get current token
	public getCurrentToken(): string | null {
		const tokenData = this.getTokenData();
		return tokenData?.token || null;
	}

	// Schedule token refresh
	private scheduleTokenRefresh(expiresAt: string): void {
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}

		const expiry = new Date(expiresAt);
		const threshold = new Date(
			expiry.getTime() - this.options.refreshThreshold * 60 * 1000,
		);
		const now = new Date();

		if (now >= threshold) {
			// Token needs immediate refresh
			this.refreshToken();
		} else {
			// Schedule refresh
			const delay = threshold.getTime() - now.getTime();
			this.refreshTimeout = setTimeout(() => {
				this.refreshToken();
			}, delay);
		}
	}

	// Check and refresh token if needed
	public async checkAndRefreshToken(): Promise<TokenData | null> {
		const tokenData = this.getTokenData();

		if (!tokenData) {
			return null;
		}

		if (this.shouldRefreshToken(tokenData)) {
			return await this.refreshToken();
		}

		return tokenData;
	}

	// Refresh token with retry logic
	public async refreshToken(retryCount = 0): Promise<TokenData | null> {
		// Prevent multiple simultaneous refresh attempts
		if (this.isRefreshing && this.refreshPromise) {
			return this.refreshPromise;
		}

		const tokenData = this.getTokenData();
		if (!tokenData) {
			return null;
		}

		this.isRefreshing = true;
		this.refreshPromise = this.performTokenRefresh(tokenData, retryCount);

		try {
			const newTokenData = await this.refreshPromise;
			this.notifyRefreshCallbacks(newTokenData);
			return newTokenData;
		} finally {
			this.isRefreshing = false;
			this.refreshPromise = null;
		}
	}

	// Perform the actual token refresh
	private async performTokenRefresh(
		tokenData: TokenData,
		retryCount: number,
	): Promise<TokenData> {
		try {
			// Import API client dynamically to avoid circular dependencies
			const { apiClient } = await import("@/services/api");

			const response = await apiClient.refreshToken();

			if (response.success && response.data) {
				const newTokenData: TokenData = {
					token: response.data.token,
					refreshToken: response.data.refreshToken,
					expiresAt: response.data.expiresAt,
					userId: tokenData.userId,
				};

				this.setTokenData(newTokenData);
				return newTokenData;
			} else {
				throw new Error("Token refresh failed");
			}
		} catch (error) {
			console.error("Token refresh failed:", error);

			if (retryCount < this.options.maxRetries) {
				// Retry with exponential backoff
				await this.delay(this.options.retryDelay * Math.pow(2, retryCount));
				return this.performTokenRefresh(tokenData, retryCount + 1);
			} else {
				// Max retries reached, clear auth data
				this.clearAuthData();
				this.redirectToLogin();
				throw new Error("Token refresh failed after maximum retries");
			}
		}
	}

	// Delay utility
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	// Redirect to login page
	private redirectToLogin(): void {
		if (typeof window !== "undefined") {
			window.location.href = "/login";
		}
	}

	// Register refresh callback
	public onTokenRefresh(callback: TokenRefreshCallback): void {
		this.refreshCallbacks.push(callback);
	}

	// Remove refresh callback
	public offTokenRefresh(callback: TokenRefreshCallback): void {
		const index = this.refreshCallbacks.indexOf(callback);
		if (index > -1) {
			this.refreshCallbacks.splice(index, 1);
		}
	}

	// Notify all refresh callbacks
	private notifyRefreshCallbacks(tokenData: TokenData): void {
		this.refreshCallbacks.forEach((callback) => {
			try {
				callback(tokenData);
			} catch (error) {
				console.error("Error in token refresh callback:", error);
			}
		});
	}

	// Handle login response
	public handleLoginResponse(loginResponse: LoginResponse): void {
		const tokenData: TokenData = {
			token: loginResponse.token,
			refreshToken: loginResponse.refreshToken,
			expiresAt: loginResponse.expiresAt,
			userId: loginResponse.user.id,
		};

		const sessionData: SessionData = {
			user: loginResponse.user,
			tokenData,
			lastActivity: new Date().toISOString(),
		};

		this.setTokenData(tokenData);
		this.setSessionData(sessionData);
	}

	// Get current user
	public getCurrentUser(): User | null {
		const sessionData = this.getSessionData();
		return sessionData?.user || null;
	}

	// Update user data
	public updateUser(user: User): void {
		const sessionData = this.getSessionData();
		if (sessionData) {
			sessionData.user = user;
			this.setSessionData(sessionData);
		}
	}

	// Check if session is active
	public isSessionActive(): boolean {
		const sessionData = this.getSessionData();
		if (!sessionData) return false;

		const lastActivity = new Date(sessionData.lastActivity);
		const now = new Date();
		const sessionTimeout = 30 * 60 * 1000; // 30 minutes

		return now.getTime() - lastActivity.getTime() < sessionTimeout;
	}

	// Get authentication state
	public getAuthState(): AuthState {
		const tokenData = this.getTokenData();
		const user = this.getCurrentUser();
		const isAuthenticated = !!(
			tokenData &&
			this.isTokenValid(tokenData) &&
			this.isSessionActive()
		);

		return {
			isAuthenticated,
			user,
			tokenData,
			isLoading: this.isRefreshing,
			error: null,
		};
	}

	// Logout
	public logout(): void {
		this.clearAuthData();
		this.redirectToLogin();
	}

	// Force token refresh (for manual refresh)
	public async forceRefreshToken(): Promise<TokenData | null> {
		return this.refreshToken();
	}

	// Get token expiry time
	public getTokenExpiryTime(): Date | null {
		const tokenData = this.getTokenData();
		return tokenData ? new Date(tokenData.expiresAt) : null;
	}

	// Get time until token expires
	public getTimeUntilExpiry(): number | null {
		const expiry = this.getTokenExpiryTime();
		if (!expiry) return null;

		const now = new Date();
		return Math.max(0, expiry.getTime() - now.getTime());
	}

	// Check if token will expire soon
	public isTokenExpiringSoon(minutes = 10): boolean {
		const timeUntilExpiry = this.getTimeUntilExpiry();
		if (timeUntilExpiry === null) return true;

		return timeUntilExpiry < minutes * 60 * 1000;
	}
}

// Create singleton instance
export const authManager = new AuthManager();

// Export default instance
export default authManager;

// Utility functions
export const getAuthToken = (): string | null => authManager.getCurrentToken();
export const isAuthenticated = (): boolean =>
	authManager.getAuthState().isAuthenticated;
export const getCurrentUser = (): User | null => authManager.getCurrentUser();
export const logout = (): void => authManager.logout();
export const refreshToken = (): Promise<TokenData | null> =>
	authManager.refreshToken();
