import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	AuthManager,
	authManager,
	getAuthToken,
	isAuthenticated,
	getCurrentUser,
	logout,
} from "./auth";
import type { TokenData, SessionData, AuthState, User } from "./auth";
import type { LoginResponse } from "@/types/api";

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
});

// Mock window.location
const locationMock = {
	href: "",
};
Object.defineProperty(window, "location", {
	value: locationMock,
	writable: true,
});

// Mock setInterval and setTimeout
const mockSetInterval = vi.fn();
const mockSetTimeout = vi.fn();
const mockClearTimeout = vi.fn();

global.setInterval = mockSetInterval;
global.setTimeout = mockSetTimeout;
global.clearTimeout = mockClearTimeout;

// Mock window events
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

Object.defineProperty(window, "addEventListener", {
	value: mockAddEventListener,
});

Object.defineProperty(window, "removeEventListener", {
	value: mockRemoveEventListener,
});

describe("AuthManager", () => {
	let authManagerInstance: AuthManager;

	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.getItem.mockReturnValue(null);
		authManagerInstance = new AuthManager({ autoRefresh: false }); // Disable auto-refresh for testing
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Token Management", () => {
		it("should store token data correctly", () => {
			const tokenData: TokenData = {
				token: "test-token",
				refreshToken: "refresh-token",
				expiresAt: "2024-12-31T23:59:59Z",
				userId: "user-123",
			};

			authManagerInstance.setTokenData(tokenData);

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"auth_token",
				"test-token",
			);
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"refresh_token",
				"refresh-token",
			);
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"token_expires_at",
				"2024-12-31T23:59:59Z",
			);
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"user_id",
				"user-123",
			);
		});

		it("should retrieve token data correctly", () => {
			localStorageMock.getItem
				.mockReturnValueOnce("test-token")
				.mockReturnValueOnce("refresh-token")
				.mockReturnValueOnce("2024-12-31T23:59:59Z")
				.mockReturnValueOnce("user-123");

			const result = authManagerInstance.getTokenData();

			expect(result).toEqual({
				token: "test-token",
				refreshToken: "refresh-token",
				expiresAt: "2024-12-31T23:59:59Z",
				userId: "user-123",
			});
		});

		it("should return null when token data is incomplete", () => {
			localStorageMock.getItem
				.mockReturnValueOnce("test-token")
				.mockReturnValueOnce(null) // Missing refresh token
				.mockReturnValueOnce("2024-12-31T23:59:59Z")
				.mockReturnValueOnce("user-123");

			const result = authManagerInstance.getTokenData();

			expect(result).toBeNull();
		});

		it("should clear auth data correctly", () => {
			authManagerInstance.clearAuthData();

			expect(localStorageMock.removeItem).toHaveBeenCalledWith("auth_token");
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("refresh_token");
			expect(localStorageMock.removeItem).toHaveBeenCalledWith(
				"token_expires_at",
			);
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("user_id");
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("session_data");
		});
	});

	describe("Token Validation", () => {
		it("should validate token correctly when not expired", () => {
			const futureDate = new Date();
			futureDate.setHours(futureDate.getHours() + 1); // 1 hour from now

			const tokenData: TokenData = {
				token: "test-token",
				refreshToken: "refresh-token",
				expiresAt: futureDate.toISOString(),
				userId: "user-123",
			};

			const isValid = authManagerInstance.isTokenValid(tokenData);
			expect(isValid).toBe(true);
		});

		it("should invalidate token when expired", () => {
			const pastDate = new Date();
			pastDate.setHours(pastDate.getHours() - 1); // 1 hour ago

			const tokenData: TokenData = {
				token: "test-token",
				refreshToken: "refresh-token",
				expiresAt: pastDate.toISOString(),
				userId: "user-123",
			};

			const isValid = authManagerInstance.isTokenValid(tokenData);
			expect(isValid).toBe(false);
		});

		it("should return false for null token data", () => {
			const isValid = authManagerInstance.isTokenValid();
			expect(isValid).toBe(false);
		});
	});

	describe("Token Refresh Logic", () => {
		it("should detect when token needs refresh", () => {
			const nearExpiryDate = new Date();
			nearExpiryDate.setMinutes(nearExpiryDate.getMinutes() + 3); // 3 minutes from now

			const tokenData: TokenData = {
				token: "test-token",
				refreshToken: "refresh-token",
				expiresAt: nearExpiryDate.toISOString(),
				userId: "user-123",
			};

			const shouldRefresh = authManagerInstance.shouldRefreshToken(tokenData);
			expect(shouldRefresh).toBe(true);
		});

		it("should not refresh token when far from expiry", () => {
			const farExpiryDate = new Date();
			farExpiryDate.setHours(farExpiryDate.getHours() + 2); // 2 hours from now

			const tokenData: TokenData = {
				token: "test-token",
				refreshToken: "refresh-token",
				expiresAt: farExpiryDate.toISOString(),
				userId: "user-123",
			};

			const shouldRefresh = authManagerInstance.shouldRefreshToken(tokenData);
			expect(shouldRefresh).toBe(false);
		});

		it("should return null when no token data exists", () => {
			const shouldRefresh = authManagerInstance.shouldRefreshToken();
			expect(shouldRefresh).toBe(false);
		});
	});

	describe("Session Management", () => {
		it("should store session data correctly", () => {
			const mockUser: User = {
				id: "user-123",
				email: "test@example.com",
				username: "testuser",
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
				isEmailVerified: true,
				preferences: {
					theme: "light",
					notifications: {
						email: {
							enabled: true,
							dailyDigest: true,
							weeklyReport: true,
							achievements: true,
							newLessons: true,
						},
						push: {
							enabled: true,
							achievements: true,
							newLessons: true,
							reminders: true,
						},
						inApp: {
							enabled: true,
							achievements: true,
							newLessons: true,
							leaderboard: true,
						},
					},
					privacy: {
						profileVisibility: "public",
						showProgress: true,
						showAchievements: true,
						allowAnalytics: true,
					},
					accessibility: {
						fontSize: "medium",
						highContrast: false,
						reducedMotion: false,
						screenReader: false,
					},
				},
				profile: {
					skills: ["JavaScript"],
					experience: "beginner",
					timezone: "UTC",
					language: "en",
				},
			};

			const tokenData: TokenData = {
				token: "test-token",
				refreshToken: "refresh-token",
				expiresAt: "2024-12-31T23:59:59Z",
				userId: "user-123",
			};

			const sessionData: SessionData = {
				user: mockUser,
				tokenData,
				lastActivity: "2024-01-01T12:00:00Z",
			};

			authManagerInstance.setSessionData(sessionData);

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"session_data",
				JSON.stringify(sessionData),
			);
		});

		it("should retrieve session data correctly", () => {
			const mockSessionData = {
				user: { id: "user-123", email: "test@example.com" },
				tokenData: { token: "test-token" },
				lastActivity: "2024-01-01T12:00:00Z",
			};

			localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSessionData));

			const result = authManagerInstance.getSessionData();

			expect(result).toEqual(mockSessionData);
		});

		it("should return null for invalid session data", () => {
			localStorageMock.getItem.mockReturnValue("invalid-json");

			const result = authManagerInstance.getSessionData();

			expect(result).toBeNull();
		});
	});

	describe("Authentication State", () => {
		it("should return correct auth state when authenticated", () => {
			const futureDate = new Date();
			futureDate.setHours(futureDate.getHours() + 1);

			const mockUser: User = {
				id: "user-123",
				email: "test@example.com",
				username: "testuser",
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
				isEmailVerified: true,
				preferences: {
					theme: "light",
					notifications: {
						email: {
							enabled: true,
							dailyDigest: true,
							weeklyReport: true,
							achievements: true,
							newLessons: true,
						},
						push: {
							enabled: true,
							achievements: true,
							newLessons: true,
							reminders: true,
						},
						inApp: {
							enabled: true,
							achievements: true,
							newLessons: true,
							leaderboard: true,
						},
					},
					privacy: {
						profileVisibility: "public",
						showProgress: true,
						showAchievements: true,
						allowAnalytics: true,
					},
					accessibility: {
						fontSize: "medium",
						highContrast: false,
						reducedMotion: false,
						screenReader: false,
					},
				},
				profile: {
					skills: ["JavaScript"],
					experience: "beginner",
					timezone: "UTC",
					language: "en",
				},
			};

			const mockSessionData = {
				user: mockUser,
				tokenData: { token: "test-token", expiresAt: futureDate.toISOString() },
				lastActivity: new Date().toISOString(),
			};

			localStorageMock.getItem
				.mockReturnValueOnce("test-token")
				.mockReturnValueOnce("refresh-token")
				.mockReturnValueOnce(futureDate.toISOString())
				.mockReturnValueOnce("user-123")
				.mockReturnValue(JSON.stringify(mockSessionData));

			const authState = authManagerInstance.getAuthState();

			expect(authState.isAuthenticated).toBe(true);
			expect(authState.user).toEqual(mockUser);
			expect(authState.isLoading).toBe(false);
			expect(authState.error).toBeNull();
		});

		it("should return unauthenticated state when no token", () => {
			localStorageMock.getItem.mockReturnValue(null);

			const authState = authManagerInstance.getAuthState();

			expect(authState.isAuthenticated).toBe(false);
			expect(authState.user).toBeNull();
			expect(authState.tokenData).toBeNull();
		});
	});

	describe("Login Response Handling", () => {
		it("should handle login response correctly", () => {
			const mockUser: User = {
				id: "user-123",
				email: "test@example.com",
				username: "testuser",
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
				isEmailVerified: true,
				preferences: {
					theme: "light",
					notifications: {
						email: {
							enabled: true,
							dailyDigest: true,
							weeklyReport: true,
							achievements: true,
							newLessons: true,
						},
						push: {
							enabled: true,
							achievements: true,
							newLessons: true,
							reminders: true,
						},
						inApp: {
							enabled: true,
							achievements: true,
							newLessons: true,
							leaderboard: true,
						},
					},
					privacy: {
						profileVisibility: "public",
						showProgress: true,
						showAchievements: true,
						allowAnalytics: true,
					},
					accessibility: {
						fontSize: "medium",
						highContrast: false,
						reducedMotion: false,
						screenReader: false,
					},
				},
				profile: {
					skills: ["JavaScript"],
					experience: "beginner",
					timezone: "UTC",
					language: "en",
				},
			};

			const loginResponse: LoginResponse = {
				token: "new-token",
				refreshToken: "new-refresh-token",
				user: mockUser,
				expiresAt: "2024-12-31T23:59:59Z",
			};

			authManagerInstance.handleLoginResponse(loginResponse);

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"auth_token",
				"new-token",
			);
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"refresh_token",
				"new-refresh-token",
			);
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"token_expires_at",
				"2024-12-31T23:59:59Z",
			);
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"user_id",
				"user-123",
			);
		});
	});

	describe("Token Refresh Callbacks", () => {
		it("should register and notify refresh callbacks", () => {
			const callback = vi.fn();
			const tokenData: TokenData = {
				token: "new-token",
				refreshToken: "new-refresh-token",
				expiresAt: "2024-12-31T23:59:59Z",
				userId: "user-123",
			};

			authManagerInstance.onTokenRefresh(callback);

			// Simulate token refresh notification
			(authManagerInstance as any).notifyRefreshCallbacks(tokenData);

			expect(callback).toHaveBeenCalledWith(tokenData);
		});

		it("should remove refresh callbacks", () => {
			const callback = vi.fn();
			const tokenData: TokenData = {
				token: "new-token",
				refreshToken: "new-refresh-token",
				expiresAt: "2024-12-31T23:59:59Z",
				userId: "user-123",
			};

			authManagerInstance.onTokenRefresh(callback);
			authManagerInstance.offTokenRefresh(callback);

			// Simulate token refresh notification
			(authManagerInstance as any).notifyRefreshCallbacks(tokenData);

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe("Session Activity", () => {
		it("should check if session is active", () => {
			const recentActivity = new Date();
			recentActivity.setMinutes(recentActivity.getMinutes() - 5); // 5 minutes ago

			const mockSessionData = {
				user: { id: "user-123" },
				tokenData: { token: "test-token" },
				lastActivity: recentActivity.toISOString(),
			};

			localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSessionData));

			const isActive = authManagerInstance.isSessionActive();
			expect(isActive).toBe(true);
		});

		it("should detect inactive session", () => {
			const oldActivity = new Date();
			oldActivity.setMinutes(oldActivity.getMinutes() - 45); // 45 minutes ago

			const mockSessionData = {
				user: { id: "user-123" },
				tokenData: { token: "test-token" },
				lastActivity: oldActivity.toISOString(),
			};

			localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSessionData));

			const isActive = authManagerInstance.isSessionActive();
			expect(isActive).toBe(false);
		});
	});

	describe("Token Expiry Utilities", () => {
		it("should get token expiry time", () => {
			const expiryDate = new Date("2024-12-31T23:59:59Z");

			localStorageMock.getItem
				.mockReturnValueOnce("test-token")
				.mockReturnValueOnce("refresh-token")
				.mockReturnValueOnce("2024-12-31T23:59:59Z")
				.mockReturnValueOnce("user-123");

			const result = authManagerInstance.getTokenExpiryTime();
			expect(result).toEqual(expiryDate);
		});

		it("should calculate time until expiry", () => {
			const futureDate = new Date();
			futureDate.setMinutes(futureDate.getMinutes() + 30); // 30 minutes from now

			localStorageMock.getItem
				.mockReturnValueOnce("test-token")
				.mockReturnValueOnce("refresh-token")
				.mockReturnValueOnce(futureDate.toISOString())
				.mockReturnValueOnce("user-123");

			const result = authManagerInstance.getTimeUntilExpiry();
			expect(result).toBeGreaterThan(0);
			expect(result).toBeLessThan(31 * 60 * 1000); // Less than 31 minutes
		});

		it("should detect token expiring soon", () => {
			const nearExpiryDate = new Date();
			nearExpiryDate.setMinutes(nearExpiryDate.getMinutes() + 5); // 5 minutes from now

			localStorageMock.getItem
				.mockReturnValueOnce("test-token")
				.mockReturnValueOnce("refresh-token")
				.mockReturnValueOnce(nearExpiryDate.toISOString())
				.mockReturnValueOnce("user-123");

			const result = authManagerInstance.isTokenExpiringSoon(10);
			expect(result).toBe(true);
		});
	});

	describe("Logout", () => {
		it("should clear auth data and redirect on logout", () => {
			authManagerInstance.logout();

			expect(localStorageMock.removeItem).toHaveBeenCalledWith("auth_token");
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("refresh_token");
			expect(localStorageMock.removeItem).toHaveBeenCalledWith(
				"token_expires_at",
			);
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("user_id");
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("session_data");
			expect(locationMock.href).toBe("/login");
		});
	});

	describe("Utility Functions", () => {
		it("should provide working utility functions", () => {
			// Mock the authManager methods
			const mockGetCurrentToken = vi.fn().mockReturnValue("test-token");
			const mockGetAuthState = vi
				.fn()
				.mockReturnValue({ isAuthenticated: true });
			const mockGetCurrentUser = vi.fn().mockReturnValue({ id: "user-123" });
			const mockLogout = vi.fn();

			// Replace authManager methods temporarily
			const originalMethods = {
				getCurrentToken: authManager.getCurrentToken,
				getAuthState: authManager.getAuthState,
				getCurrentUser: authManager.getCurrentUser,
				logout: authManager.logout,
			};

			authManager.getCurrentToken = mockGetCurrentToken;
			authManager.getAuthState = mockGetAuthState;
			authManager.getCurrentUser = mockGetCurrentUser;
			authManager.logout = mockLogout;

			// Test utility functions
			expect(getAuthToken()).toBe("test-token");
			expect(isAuthenticated()).toBe(true);
			expect(getCurrentUser()).toEqual({ id: "user-123" });

			logout();
			expect(mockLogout).toHaveBeenCalled();

			// Restore original methods
			Object.assign(authManager, originalMethods);
		});
	});
});
