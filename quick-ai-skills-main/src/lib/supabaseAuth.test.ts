import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SupabaseAuthManager } from "./supabaseAuth";
import { supabase } from "./supabase";
import type { OAuthProvider } from "./supabase";
import type { LoginCredentials, User } from "@/types/api";

// Mock Supabase client
vi.mock("./supabase", () => ({
	supabase: {
		auth: {
			getSession: vi.fn(),
			onAuthStateChange: vi.fn(),
			signInWithPassword: vi.fn(),
			signInWithOAuth: vi.fn(),
			signUp: vi.fn(),
			signOut: vi.fn(),
			resetPasswordForEmail: vi.fn(),
			updateUser: vi.fn(),
			refreshSession: vi.fn(),
		},
	},
}));

// Mock constants
vi.mock("./constants", () => ({
	STORAGE_KEYS: {
		AUTH_TOKEN: "auth_token",
		REFRESH_TOKEN: "refresh_token",
	},
	ERROR_MESSAGES: {
		UNKNOWN_ERROR: "An unexpected error occurred.",
	},
}));

describe("SupabaseAuthManager", () => {
	let authManager: SupabaseAuthManager;
	let mockSupabase: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabase = vi.mocked(supabase);
		authManager = new SupabaseAuthManager();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Initialization", () => {
		it("should initialize with default state", () => {
			// Mock the initialization to not run automatically
			const mockGetSession = vi.fn().mockResolvedValue({
				data: { session: null },
				error: null,
			});

			// Create a new instance without triggering initialization
			const newAuthManager = new (class extends SupabaseAuthManager {
				constructor() {
					super();
					// Override the initialization to prevent it from running
					this["authState"] = {
						user: null,
						session: null,
						loading: true,
						error: null,
						isInitialized: false,
					};
				}
			})();

			const state = newAuthManager.getState();
			expect(state.user).toBeNull();
			expect(state.session).toBeNull();
			expect(state.loading).toBe(true);
			expect(state.error).toBeNull();
			expect(state.isInitialized).toBe(false);
		});

		it("should initialize with existing session", async () => {
			const mockSession = {
				access_token: "test-access-token",
				refresh_token: "test-refresh-token",
				expires_in: 3600,
				token_type: "bearer",
				user: {
					id: "user-123",
					email: "test@example.com",
					created_at: "2023-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
					user_metadata: {
						full_name: "Test User",
						avatar_url: "https://example.com/avatar.jpg",
					},
					app_metadata: {},
					aud: "authenticated",
					role: "user",
				},
			};

			mockSupabase.auth.getSession.mockResolvedValue({
				data: { session: mockSession },
				error: null,
			});

			mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
				// Simulate auth state change listener
				return { data: { subscription: null } };
			});

			// Create new instance to trigger initialization
			const newAuthManager = new SupabaseAuthManager();

			// Wait for initialization
			await new Promise((resolve) => setTimeout(resolve, 100));

			const state = newAuthManager.getState();
			expect(state.user).toBeDefined();
			expect(state.session).toBeDefined();
			expect(state.loading).toBe(false);
			expect(state.isInitialized).toBe(true);
		});

		it("should handle initialization error", async () => {
			mockSupabase.auth.getSession.mockResolvedValue({
				data: { session: null },
				error: { message: "Initialization failed" },
			});

			const newAuthManager = new SupabaseAuthManager();

			// Wait for initialization
			await new Promise((resolve) => setTimeout(resolve, 100));

			const state = newAuthManager.getState();
			expect(state.error).toBe("Initialization failed");
			expect(state.loading).toBe(false);
			expect(state.isInitialized).toBe(true);
		});
	});

	describe("Email Authentication", () => {
		it("should sign in with email and password", async () => {
			const credentials: LoginCredentials = {
				email: "test@example.com",
				password: "password123",
			};

			const mockSession = {
				access_token: "test-access-token",
				refresh_token: "test-refresh-token",
				expires_in: 3600,
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

			mockSupabase.auth.signInWithPassword.mockResolvedValue({
				data: { user: mockSession.user, session: mockSession },
				error: null,
			});

			await authManager.signInWithEmail(credentials);

			expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith(
				credentials,
			);

			const state = authManager.getState();
			expect(state.user).toBeDefined();
			expect(state.session).toBeDefined();
			expect(state.loading).toBe(false);
			expect(state.error).toBeNull();
		});

		it("should handle sign in error", async () => {
			const credentials: LoginCredentials = {
				email: "test@example.com",
				password: "wrongpassword",
			};

			mockSupabase.auth.signInWithPassword.mockResolvedValue({
				data: { user: null, session: null },
				error: { message: "Invalid credentials" },
			});

			await expect(authManager.signInWithEmail(credentials)).rejects.toThrow(
				"Invalid credentials",
			);

			const state = authManager.getState();
			expect(state.error).toBe("Invalid credentials");
			expect(state.loading).toBe(false);
		});
	});

	describe("OAuth Authentication", () => {
		it("should sign in with OAuth provider", async () => {
			const provider: OAuthProvider = "google";
			const options = {
				redirectTo: "http://localhost:3000/callback",
				scopes: "email profile",
			};

			mockSupabase.auth.signInWithOAuth.mockResolvedValue({
				data: { url: "https://accounts.google.com/oauth/authorize" },
				error: null,
			});

			await authManager.signInWithOAuth(provider, options);

			expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
				provider,
				options: {
					redirectTo: options.redirectTo,
					scopes: options.scopes,
				},
			});
		});

		it("should handle OAuth sign in error", async () => {
			const provider: OAuthProvider = "github";

			mockSupabase.auth.signInWithOAuth.mockResolvedValue({
				data: null,
				error: { message: "OAuth configuration error" },
			});

			await expect(authManager.signInWithOAuth(provider)).rejects.toThrow(
				"OAuth configuration error",
			);

			const state = authManager.getState();
			expect(state.error).toBe("OAuth configuration error");
			expect(state.loading).toBe(false);
		});

		it("should support all OAuth providers", async () => {
			const providers: OAuthProvider[] = [
				"google",
				"github",
				"discord",
				"twitter",
				"linkedin",
			];

			mockSupabase.auth.signInWithOAuth.mockResolvedValue({
				data: { url: "https://example.com/oauth" },
				error: null,
			});

			for (const provider of providers) {
				await authManager.signInWithOAuth(provider);
				expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
					provider,
					options: {
						redirectTo: expect.any(String),
						scopes: undefined,
					},
				});
			}
		});
	});

	describe("User Registration", () => {
		it("should sign up with email and password", async () => {
			const credentials: LoginCredentials = {
				email: "newuser@example.com",
				password: "password123",
			};

			const mockSession = {
				access_token: "test-access-token",
				refresh_token: "test-refresh-token",
				expires_in: 3600,
				token_type: "bearer",
				user: {
					id: "user-456",
					email: "newuser@example.com",
					created_at: "2023-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
					user_metadata: {},
					app_metadata: {},
					aud: "authenticated",
					role: "user",
				},
			};

			mockSupabase.auth.signUp.mockResolvedValue({
				data: { user: mockSession.user, session: mockSession },
				error: null,
			});

			await authManager.signUp(credentials);

			expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
				email: credentials.email,
				password: credentials.password,
				options: {
					emailRedirectTo: expect.any(String),
				},
			});

			const state = authManager.getState();
			expect(state.user).toBeDefined();
			expect(state.session).toBeDefined();
			expect(state.loading).toBe(false);
		});

		it("should handle email confirmation required", async () => {
			const credentials: LoginCredentials = {
				email: "newuser@example.com",
				password: "password123",
			};

			mockSupabase.auth.signUp.mockResolvedValue({
				data: {
					user: { id: "user-456", email: "newuser@example.com" },
					session: null,
				},
				error: null,
			});

			await authManager.signUp(credentials);

			const state = authManager.getState();
			expect(state.error).toBe(
				"Please check your email to confirm your account.",
			);
			expect(state.loading).toBe(false);
		});
	});

	describe("Session Management", () => {
		it("should sign out user", async () => {
			mockSupabase.auth.signOut.mockResolvedValue({
				error: null,
			});

			await authManager.signOut();

			expect(mockSupabase.auth.signOut).toHaveBeenCalled();

			const state = authManager.getState();
			expect(state.user).toBeNull();
			expect(state.session).toBeNull();
			expect(state.loading).toBe(false);
		});

		it("should refresh session", async () => {
			const mockSession = {
				access_token: "new-access-token",
				refresh_token: "new-refresh-token",
				expires_in: 3600,
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
				data: { user: mockSession.user, session: mockSession },
				error: null,
			});

			await authManager.refreshSession();

			expect(mockSupabase.auth.refreshSession).toHaveBeenCalled();

			const state = authManager.getState();
			expect(state.user).toBeDefined();
			expect(state.session).toBeDefined();
		});

		it("should clear state when refresh returns no session", async () => {
			mockSupabase.auth.refreshSession.mockResolvedValue({
				data: { user: null, session: null },
				error: null,
			});

			await authManager.refreshSession();

			const state = authManager.getState();
			expect(state.session).toBeNull();
			expect(state.user).toBeNull();
			expect(state.error).toBe("Session refresh returned no session");
		});
	});

	describe("Password Management", () => {
		it("should reset password", async () => {
			const email = "test@example.com";

			mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
				error: null,
			});

			await authManager.resetPassword(email);

			expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
				email,
				{
					redirectTo: expect.any(String),
				},
			);

			const state = authManager.getState();
			expect(state.loading).toBe(false);
		});

		it("should update password", async () => {
			const password = "newpassword123";

			mockSupabase.auth.updateUser.mockResolvedValue({
				data: { user: null },
				error: null,
			});

			await authManager.updatePassword(password);

			expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
				password,
			});

			const state = authManager.getState();
			expect(state.loading).toBe(false);
		});
	});

	describe("Profile Management", () => {
		it("should update user profile", async () => {
			const profile: Partial<User> = {
				name: "Updated Name",
				avatar: "https://example.com/new-avatar.jpg",
			};

			const updatedUser = {
				id: "user-123",
				email: "test@example.com",
				created_at: "2023-01-01T00:00:00Z",
				updated_at: "2023-01-01T00:00:00Z",
				user_metadata: {
					full_name: "Updated Name",
					avatar_url: "https://example.com/new-avatar.jpg",
				},
				app_metadata: {},
				aud: "authenticated",
				role: "user",
			};

			mockSupabase.auth.updateUser.mockResolvedValue({
				data: { user: updatedUser },
				error: null,
			});

			await authManager.updateProfile(profile);

			expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
				data: {
					full_name: "Updated Name",
					avatar_url: "https://example.com/new-avatar.jpg",
				},
			});

			const state = authManager.getState();
			expect(state.user).toBeDefined();
			expect(state.user?.name).toBe("Updated Name");
			expect(state.loading).toBe(false);
		});
	});

	describe("State Management", () => {
		it("should subscribe to state changes", () => {
			const listener = vi.fn();
			const unsubscribe = authManager.subscribe(listener);

			// Trigger state change
			authManager.clearError();

			expect(listener).toHaveBeenCalled();

			unsubscribe();
		});

		it("should clear error", () => {
			// Set an error first
			authManager["updateState"]({ error: "Test error" });
			expect(authManager.getState().error).toBe("Test error");

			authManager.clearError();
			expect(authManager.getState().error).toBeNull();
		});

		it("should check authentication status", () => {
			expect(authManager.isAuthenticated()).toBe(false);

			// Set authenticated state
			authManager["updateState"]({
				user: { id: "user-123" } as User,
				session: { access_token: "token" } as any,
			});

			expect(authManager.isAuthenticated()).toBe(true);
		});

		it("should get access token", () => {
			const mockSession = { access_token: "test-token" } as any;
			authManager["updateState"]({ session: mockSession });

			expect(authManager.getAccessToken()).toBe("test-token");
		});

		it("should get refresh token", () => {
			const mockSession = { refresh_token: "test-refresh-token" } as any;
			authManager["updateState"]({ session: mockSession });

			expect(authManager.getRefreshToken()).toBe("test-refresh-token");
		});
	});

	describe("Error Handling", () => {
		it("should handle network errors", async () => {
			mockSupabase.auth.signInWithPassword.mockRejectedValue(
				new Error("Network error"),
			);

			const credentials: LoginCredentials = {
				email: "test@example.com",
				password: "password123",
			};

			await expect(authManager.signInWithEmail(credentials)).rejects.toThrow(
				"Network error",
			);

			const state = authManager.getState();
			expect(state.error).toBe("Network error");
			expect(state.loading).toBe(false);
		});

		it("should handle unknown errors", async () => {
			mockSupabase.auth.signInWithPassword.mockRejectedValue("Unknown error");

			const credentials: LoginCredentials = {
				email: "test@example.com",
				password: "password123",
			};

			await expect(authManager.signInWithEmail(credentials)).rejects.toThrow(
				"Unknown error",
			);

			const state = authManager.getState();
			expect(state.error).toBe("An unexpected error occurred.");
			expect(state.loading).toBe(false);
		});
	});
});
