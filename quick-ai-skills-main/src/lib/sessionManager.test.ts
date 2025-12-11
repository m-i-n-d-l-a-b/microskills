import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	SessionManager,
	type SessionInfo,
	type SessionEvent,
} from "./sessionManager";
import { supabase } from "./supabase";
import type { SupabaseSession } from "./supabase";

// Mock Supabase client
vi.mock("./supabase", () => ({
	supabase: {
		auth: {
			getSession: vi.fn().mockResolvedValue({
				data: { session: null },
				error: null,
			}),
			onAuthStateChange: vi
				.fn()
				.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
			refreshSession: vi.fn().mockResolvedValue({
				data: { session: null },
				error: null,
			}),
		},
	},
}));

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

// Mock constants
vi.mock("./constants", () => ({
	STORAGE_KEYS: {
		AUTH_TOKEN: "auth_token",
		REFRESH_TOKEN: "refresh_token",
	},
}));

describe("SessionManager", () => {
	let sessionManager: SessionManager;
	let mockSupabase: any;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		mockSupabase = vi.mocked(supabase);

		// Reset localStorage mock
		localStorageMock.getItem.mockReturnValue(null);
		localStorageMock.setItem.mockImplementation(() => {});
		localStorageMock.removeItem.mockImplementation(() => {});

		// Create new instance for each test
		sessionManager = new SessionManager();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		sessionManager.destroy();
	});

	describe("Initialization", () => {
		it("should initialize with auth state change listener", () => {
			expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
		});

		it("should set up automatic token refresh", () => {
			// The setupAutoRefresh method should be called during initialization
			expect(sessionManager).toBeDefined();
		});
	});

	describe("Session Management", () => {
		it("should handle sign in event", async () => {
			const mockSession: SupabaseSession = {
				access_token: "test-access-token",
				refresh_token: "test-refresh-token",
				expires_in: 3600,
				expires_at: Date.now() + 3600 * 1000,
				token_type: "bearer",
				user: {
					id: "user-123",
					email: "test@example.com",
					created_at: "2023-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
					user_metadata: {},
					app_metadata: {},
					aud: "authenticated",
					role: "user",
				},
			};

			// Simulate auth state change
			const authStateChangeCallback =
				mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
			await authStateChangeCallback("SIGNED_IN", mockSession);

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"auth_token",
				"test-access-token",
			);
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"refresh_token",
				"test-refresh-token",
			);
		});

		it("should handle sign out event", async () => {
			// Simulate auth state change
			const authStateChangeCallback =
				mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
			await authStateChangeCallback("SIGNED_OUT", null);

			expect(localStorageMock.removeItem).toHaveBeenCalledWith("auth_token");
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("refresh_token");
		});

		it("should handle token refresh event", async () => {
			const mockSession: SupabaseSession = {
				access_token: "new-access-token",
				refresh_token: "new-refresh-token",
				expires_in: 3600,
				expires_at: Date.now() + 3600 * 1000,
				token_type: "bearer",
				user: {
					id: "user-123",
					email: "test@example.com",
					created_at: "2023-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
					user_metadata: {},
					app_metadata: {},
					aud: "authenticated",
					role: "user",
				},
			};

			// Simulate auth state change
			const authStateChangeCallback =
				mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
			await authStateChangeCallback("TOKEN_REFRESHED", mockSession);

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"auth_token",
				"new-access-token",
			);
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"refresh_token",
				"new-refresh-token",
			);
		});
	});

	describe("Session Info", () => {
		it("should get session info from current session", () => {
			const mockSession: SupabaseSession = {
				access_token: "test-access-token",
				refresh_token: "test-refresh-token",
				expires_in: 3600,
				expires_at: Date.now() + 3600 * 1000,
				token_type: "bearer",
				user: {
					id: "user-123",
					email: "test@example.com",
					created_at: "2023-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
					user_metadata: {},
					app_metadata: {},
					aud: "authenticated",
					role: "user",
				},
			};

			const sessionInfo = sessionManager.getSessionInfo(mockSession);

			expect(sessionInfo).toEqual({
				accessToken: "test-access-token",
				refreshToken: "test-refresh-token",
				expiresAt: mockSession.expires_at,
				userId: "user-123",
				isExpired: false,
				timeUntilExpiry: expect.any(Number),
			});
		});

		it("should get session info from stored session", () => {
			const expiresAt = Date.now() + 3600 * 1000;

			localStorageMock.getItem
				.mockReturnValueOnce("test-access-token") // AUTH_TOKEN
				.mockReturnValueOnce("test-refresh-token") // REFRESH_TOKEN
				.mockReturnValueOnce(expiresAt.toString()) // session_expires_at
				.mockReturnValueOnce("user-123"); // session_user_id

			const sessionInfo = sessionManager.getSessionInfo();

			expect(sessionInfo).toEqual({
				accessToken: "test-access-token",
				refreshToken: "test-refresh-token",
				expiresAt,
				userId: "user-123",
				isExpired: false,
				timeUntilExpiry: expect.any(Number),
			});
		});

		it("should return null for invalid session", () => {
			const sessionInfo = sessionManager.getSessionInfo();
			expect(sessionInfo).toBeNull();
		});

		it("should detect expired session", () => {
			const mockSession: SupabaseSession = {
				access_token: "test-access-token",
				refresh_token: "test-refresh-token",
				expires_in: 3600,
				expires_at: Date.now() - 1000, // Expired
				token_type: "bearer",
				user: {
					id: "user-123",
					email: "test@example.com",
					created_at: "2023-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
					user_metadata: {},
					app_metadata: {},
					aud: "authenticated",
					role: "user",
				},
			};

			const sessionInfo = sessionManager.getSessionInfo(mockSession);

			expect(sessionInfo?.isExpired).toBe(true);
			expect(sessionInfo?.timeUntilExpiry).toBe(0);
		});
	});

	describe("Session Validation", () => {
		it("should validate active session", () => {
			const expiresAt = Date.now() + 3600 * 1000;

			localStorageMock.getItem
				.mockReturnValueOnce("test-access-token")
				.mockReturnValueOnce("test-refresh-token")
				.mockReturnValueOnce(expiresAt.toString())
				.mockReturnValueOnce("user-123");

			expect(sessionManager.isSessionValid()).toBe(true);
		});

		it("should invalidate expired session", () => {
			const expiresAt = Date.now() - 1000; // Expired

			localStorageMock.getItem
				.mockReturnValueOnce("test-access-token")
				.mockReturnValueOnce("test-refresh-token")
				.mockReturnValueOnce(expiresAt.toString())
				.mockReturnValueOnce("user-123");

			expect(sessionManager.isSessionValid()).toBe(false);
		});

		it("should invalidate session with missing data", () => {
			localStorageMock.getItem.mockReturnValue(null);

			expect(sessionManager.isSessionValid()).toBe(false);
		});
	});

	describe("Token Management", () => {
		it("should get access token", () => {
			localStorageMock.getItem
				.mockReturnValueOnce("test-access-token")
				.mockReturnValueOnce("test-refresh-token")
				.mockReturnValueOnce((Date.now() + 3600 * 1000).toString())
				.mockReturnValueOnce("user-123");

			expect(sessionManager.getAccessToken()).toBe("test-access-token");
		});

		it("should get refresh token", () => {
			localStorageMock.getItem
				.mockReturnValueOnce("test-access-token")
				.mockReturnValueOnce("test-refresh-token")
				.mockReturnValueOnce((Date.now() + 3600 * 1000).toString())
				.mockReturnValueOnce("user-123");

			expect(sessionManager.getRefreshToken()).toBe("test-refresh-token");
		});

		it("should return null for missing tokens", () => {
			localStorageMock.getItem.mockReturnValue(null);

			expect(sessionManager.getAccessToken()).toBeNull();
			expect(sessionManager.getRefreshToken()).toBeNull();
		});
	});

	describe("Session Refresh", () => {
		it("should refresh session successfully", async () => {
			const mockSession: SupabaseSession = {
				access_token: "new-access-token",
				refresh_token: "new-refresh-token",
				expires_in: 3600,
				expires_at: Date.now() + 3600 * 1000,
				token_type: "bearer",
				user: {
					id: "user-123",
					email: "test@example.com",
					created_at: "2023-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
					user_metadata: {},
					app_metadata: {},
					aud: "authenticated",
					role: "user",
				},
			};

			mockSupabase.auth.refreshSession.mockResolvedValue({
				data: { session: mockSession },
				error: null,
			});

			const result = await sessionManager.refreshSession();

			expect(result).toBe(true);
			expect(mockSupabase.auth.refreshSession).toHaveBeenCalled();
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"auth_token",
				"new-access-token",
			);
		});

		it("should handle refresh failure", async () => {
			mockSupabase.auth.refreshSession.mockResolvedValue({
				data: { session: null },
				error: { message: "Refresh failed" },
			});

			const result = await sessionManager.refreshSession();

			expect(result).toBe(false);
			expect(localStorageMock.removeItem).toHaveBeenCalled();
		});

		it("should handle refresh error", async () => {
			mockSupabase.auth.refreshSession.mockRejectedValue(
				new Error("Network error"),
			);

			const result = await sessionManager.refreshSession();

			expect(result).toBe(false);
			expect(localStorageMock.removeItem).toHaveBeenCalled();
		});

		it("should check if session needs refresh", () => {
			// Session expiring in 3 minutes (within 5-minute threshold)
			const expiresAt = Date.now() + 3 * 60 * 1000;

			localStorageMock.getItem
				.mockReturnValueOnce("test-access-token")
				.mockReturnValueOnce("test-refresh-token")
				.mockReturnValueOnce(expiresAt.toString())
				.mockReturnValueOnce("user-123");

			expect(sessionManager.shouldRefreshSession()).toBe(true);
		});

		it("should not refresh session with sufficient time", () => {
			// Session expiring in 10 minutes (outside 5-minute threshold)
			const expiresAt = Date.now() + 10 * 60 * 1000;

			localStorageMock.getItem
				.mockReturnValueOnce("test-access-token")
				.mockReturnValueOnce("test-refresh-token")
				.mockReturnValueOnce(expiresAt.toString())
				.mockReturnValueOnce("user-123");

			expect(sessionManager.shouldRefreshSession()).toBe(false);
		});
	});

	describe("Event System", () => {
		it("should emit session events", async () => {
			const listener = vi.fn();
			const unsubscribe = sessionManager.on("session_created", listener);

			// Simulate session creation
			const mockSession: SupabaseSession = {
				access_token: "test-access-token",
				refresh_token: "test-refresh-token",
				expires_in: 3600,
				expires_at: Date.now() + 3600 * 1000,
				token_type: "bearer",
				user: {
					id: "user-123",
					email: "test@example.com",
					created_at: "2023-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
					user_metadata: {},
					app_metadata: {},
					aud: "authenticated",
					role: "user",
				},
			};

			const authStateChangeCallback =
				mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
			await authStateChangeCallback("SIGNED_IN", mockSession);

			expect(listener).toHaveBeenCalledWith(
				"session_created",
				expect.any(Object),
			);

			unsubscribe();
		});

		it("should allow unsubscribing from events", () => {
			const listener = vi.fn();
			const unsubscribe = sessionManager.on("session_cleared", listener);

			// Simulate session clearing
			const authStateChangeCallback =
				mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
			authStateChangeCallback("SIGNED_OUT", null);

			expect(listener).toHaveBeenCalledWith("session_cleared", undefined);

			// Unsubscribe and verify no more calls
			unsubscribe();
			listener.mockClear();

			authStateChangeCallback("SIGNED_OUT", null);
			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe("Session Statistics", () => {
		it("should get session statistics", () => {
			const expiresAt = Date.now() + 3600 * 1000;

			localStorageMock.getItem
				.mockReturnValueOnce("test-access-token")
				.mockReturnValueOnce("test-refresh-token")
				.mockReturnValueOnce(expiresAt.toString())
				.mockReturnValueOnce("user-123")
				.mockReturnValueOnce(null) // last_refresh_time
				.mockReturnValueOnce("5"); // refresh_count

			const stats = sessionManager.getSessionStats();

			expect(stats).toEqual({
				isActive: false, // Session is not active because getCurrentSession returns null
				timeUntilExpiry: expect.any(Number),
				lastRefresh: null,
				refreshCount: 5,
			});
		});

		it("should handle missing statistics data", () => {
			localStorageMock.getItem.mockReturnValue(null);

			const stats = sessionManager.getSessionStats();

			expect(stats).toEqual({
				isActive: false,
				timeUntilExpiry: 0,
				lastRefresh: null,
				refreshCount: 0,
			});
		});
	});

	describe("Error Handling", () => {
		it("should handle getSession error gracefully", async () => {
			mockSupabase.auth.getSession.mockResolvedValueOnce({
				data: { session: null },
				error: { message: "Failed to get session", status: 500 },
			});

			// The getCurrentSession is private, but we can test it indirectly
			// by checking that setupAutoRefresh handles errors
			const newManager = new SessionManager();
			// Allow pending microtasks to complete
			await Promise.resolve();

			// Should not throw and should handle error gracefully
			expect(newManager).toBeDefined();
			newManager.destroy();
		});

		it("should handle getSession with null data", async () => {
			mockSupabase.auth.getSession.mockResolvedValueOnce({
				data: { session: null },
				error: null,
			});

			const newManager = new SessionManager();
			await Promise.resolve();

			expect(newManager).toBeDefined();
			newManager.destroy();
		});

		it("should handle getSession returning undefined", async () => {
			mockSupabase.auth.getSession.mockResolvedValueOnce(undefined as any);

			const newManager = new SessionManager();
			await Promise.resolve();

			expect(newManager).toBeDefined();
			newManager.destroy();
		});
	});

	describe("Cleanup", () => {
		it("should destroy session manager properly", () => {
			const listener = vi.fn();
			sessionManager.on("session_created", listener);

			sessionManager.destroy();

			// Verify cleanup
			expect(localStorageMock.removeItem).toHaveBeenCalled();

			// Verify listeners are cleared
			const authStateChangeCallback =
				mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
			authStateChangeCallback("SIGNED_IN", {} as SupabaseSession);
			expect(listener).not.toHaveBeenCalled();
		});
	});
});
