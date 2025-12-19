import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { supabaseAuthManager } from "@/lib/supabaseAuth";
import type { LoginCredentials, User } from "@/types/api";

// Mock Supabase auth manager
vi.mock("@/lib/supabaseAuth", () => ({
	supabaseAuthManager: {
		subscribe: vi.fn(),
		getState: vi.fn(),
		signInWithEmail: vi.fn(),
		signOut: vi.fn(),
		refreshSession: vi.fn(),
		updateProfile: vi.fn(),
		isAuthenticated: vi.fn(),
		getCurrentUser: vi.fn(),
	},
}));

// Mock API client
vi.mock("@/services/api", () => ({
	apiClient: {
		getUserPreferences: vi.fn(),
		updateUserPreferences: vi.fn(),
	},
}));

// Mock error handling
vi.mock("@/utils/errorHandling", () => ({
	handleError: vi.fn(),
}));

// Create a wrapper component for testing
const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return ({ children }: { children: React.ReactNode }) => {
		return React.createElement(
			QueryClientProvider,
			{ client: queryClient },
			children,
		);
	};
};

describe("useAuth", () => {
	let mockSupabaseAuthManager: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseAuthManager = vi.mocked(supabaseAuthManager);

		// Default mock implementations
		mockSupabaseAuthManager.getState.mockReturnValue({
			user: null,
			session: null,
			loading: false,
			error: null,
			isInitialized: true,
		});

		mockSupabaseAuthManager.isAuthenticated.mockReturnValue(false);
		mockSupabaseAuthManager.getCurrentUser.mockReturnValue(null);
		mockSupabaseAuthManager.subscribe.mockReturnValue(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Initialization", () => {
		it("should initialize with default state", async () => {
			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isInitialized).toBe(true);
			});

			expect(result.current.isAuthenticated).toBe(false);
			expect(result.current.user).toBeNull();
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it("should subscribe to auth state changes", () => {
			renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			expect(mockSupabaseAuthManager.subscribe).toHaveBeenCalled();
		});

		it("should handle initialization with existing user", async () => {
			const mockUser: User = {
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				avatar: "",
				role: "user",
				preferences: {},
				createdAt: "2023-01-01T00:00:00Z",
				updatedAt: "2023-01-01T00:00:00Z",
				emailVerified: true,
				phoneVerified: false,
			};

			mockSupabaseAuthManager.getState.mockReturnValue({
				user: mockUser,
				session: { access_token: "token" },
				loading: false,
				error: null,
				isInitialized: true,
			});

			mockSupabaseAuthManager.isAuthenticated.mockReturnValue(true);

			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isAuthenticated).toBe(true);
			});

			expect(result.current.user).toEqual(mockUser);
		});
	});

	describe("Authentication Actions", () => {
		it("should handle login", async () => {
			const credentials: LoginCredentials = {
				email: "test@example.com",
				password: "password123",
			};

			mockSupabaseAuthManager.signInWithEmail.mockResolvedValue(undefined);

			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			await result.current.login(credentials);

			expect(mockSupabaseAuthManager.signInWithEmail).toHaveBeenCalledWith(
				credentials,
			);
		});

		it("should handle login error", async () => {
			const credentials: LoginCredentials = {
				email: "test@example.com",
				password: "wrongpassword",
			};

			const loginError = new Error("Invalid credentials");
			mockSupabaseAuthManager.signInWithEmail.mockRejectedValue(loginError);

			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			await expect(result.current.login(credentials)).rejects.toThrow(
				"Invalid credentials",
			);
		});

		it("should handle logout", async () => {
			mockSupabaseAuthManager.signOut.mockResolvedValue(undefined);

			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			await result.current.logout();

			expect(mockSupabaseAuthManager.signOut).toHaveBeenCalled();
		});

		it("should handle logout error", async () => {
			const logoutError = new Error("Logout failed");
			mockSupabaseAuthManager.signOut.mockRejectedValue(logoutError);

			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			await expect(result.current.logout()).rejects.toThrow("Logout failed");
		});

		it("should handle refresh token", async () => {
			mockSupabaseAuthManager.refreshSession.mockResolvedValue(undefined);

			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			await result.current.refreshToken();

			expect(mockSupabaseAuthManager.refreshSession).toHaveBeenCalled();
		});

		it("should handle update user", async () => {
			const userData = {
				name: "Updated Name",
				avatar: "https://example.com/avatar.jpg",
			};

			mockSupabaseAuthManager.updateProfile.mockResolvedValue(undefined);

			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			await result.current.updateUser(userData);

			expect(mockSupabaseAuthManager.updateProfile).toHaveBeenCalledWith(
				userData,
			);
		});

		it("should clear error", () => {
			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			// Set an error first
			result.current.clearError();

			expect(result.current.error).toBeNull();
		});
	});

	describe("State Management", () => {
		it("should handle auth state changes", async () => {
			let subscribeCallback: ((state: any) => void) | null = null;

			mockSupabaseAuthManager.subscribe.mockImplementation((callback) => {
				subscribeCallback = callback;
				return () => {};
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			// Simulate auth state change
			if (subscribeCallback) {
				const mockUser: User = {
					id: "user-123",
					email: "test@example.com",
					name: "Test User",
					avatar: "",
					role: "user",
					preferences: {},
					createdAt: "2023-01-01T00:00:00Z",
					updatedAt: "2023-01-01T00:00:00Z",
					emailVerified: true,
					phoneVerified: false,
				};

				subscribeCallback({
					user: mockUser,
					session: { access_token: "token" },
					loading: false,
					error: null,
					isInitialized: true,
				});
			}

			await waitFor(() => {
				expect(result.current.user).toBeDefined();
			});
		});

		it("should handle error state changes", async () => {
			let subscribeCallback: ((state: any) => void) | null = null;

			mockSupabaseAuthManager.subscribe.mockImplementation((callback) => {
				subscribeCallback = callback;
				return () => {};
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			// Simulate error state change
			if (subscribeCallback) {
				subscribeCallback({
					user: null,
					session: null,
					loading: false,
					error: "Authentication failed",
					isInitialized: true,
				});
			}

			await waitFor(() => {
				expect(result.current.error).toBe("Authentication failed");
			});
		});

		it("should handle loading state changes", async () => {
			let subscribeCallback: ((state: any) => void) | null = null;

			mockSupabaseAuthManager.subscribe.mockImplementation((callback) => {
				subscribeCallback = callback;
				return () => {};
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			// Simulate loading state change
			if (subscribeCallback) {
				subscribeCallback({
					user: null,
					session: null,
					loading: true,
					error: null,
					isInitialized: true,
				});
			}

			await waitFor(() => {
				expect(result.current.isLoading).toBe(true);
			});
		});
	});

	describe("Authentication Status", () => {
		it("should return correct authentication status", async () => {
			mockSupabaseAuthManager.isAuthenticated.mockReturnValue(true);

			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isAuthenticated).toBe(true);
			});
		});

		it("should return false when not authenticated", async () => {
			mockSupabaseAuthManager.isAuthenticated.mockReturnValue(false);

			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isAuthenticated).toBe(false);
			});
		});
	});

	describe("Error Handling", () => {
		it("should handle user error state", async () => {
			let subscribeCallback: ((state: any) => void) | null = null;

			mockSupabaseAuthManager.subscribe.mockImplementation((callback) => {
				subscribeCallback = callback;
				return () => {};
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			// Simulate user error
			if (subscribeCallback) {
				subscribeCallback({
					user: null,
					session: null,
					loading: false,
					error: "User not found",
					isInitialized: true,
				});
			}

			await waitFor(() => {
				expect(result.current.error).toBe("User not found");
			});
		});

		it("should handle network errors during login", async () => {
			const credentials: LoginCredentials = {
				email: "test@example.com",
				password: "password123",
			};

			const networkError = new Error("Network error");
			mockSupabaseAuthManager.signInWithEmail.mockRejectedValue(networkError);

			const { result } = renderHook(() => useAuth(), {
				wrapper: createWrapper(),
			});

			await expect(result.current.login(credentials)).rejects.toThrow(
				"Network error",
			);
		});
	});
});
