import type React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	ProtectedRoute,
	withAuth,
	useRequireAuth,
	AuthStatus,
} from "./ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types/api";

// Mock the useAuth hook
vi.mock("@/hooks/useAuth");
const mockUseAuth = vi.mocked(useAuth);

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockLocation = {
	pathname: "/protected",
	search: "",
	hash: "",
	state: null,
};

vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
		useLocation: () => mockLocation,
	};
});

// Create a wrapper component for testing
const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>{children}</BrowserRouter>
		</QueryClientProvider>
	);
};

// Test component for withAuth HOC
const TestComponent = ({ message }: { message: string }) => (
	<div data-testid="test-component">{message}</div>
);

describe("ProtectedRoute", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockNavigate.mockClear();
	});

	describe("Loading State", () => {
		it("should show loading spinner when authentication is initializing", () => {
			mockUseAuth.mockReturnValue({
				isAuthenticated: false,
				user: null,
				isLoading: true,
				isInitialized: false,
				error: null,
				login: vi.fn(),
				logout: vi.fn(),
				refreshToken: vi.fn(),
				updateUser: vi.fn(),
				updatePreferences: vi.fn(),
				clearError: vi.fn(),
			});

			render(
				<ProtectedRoute>
					<div>Protected Content</div>
				</ProtectedRoute>,
				{ wrapper: createWrapper() },
			);

			expect(screen.getByText("Loading...")).toBeInTheDocument();
		});

		it("should show loading spinner when authentication is loading", () => {
			mockUseAuth.mockReturnValue({
				isAuthenticated: false,
				user: null,
				isLoading: true,
				isInitialized: true,
				error: null,
				login: vi.fn(),
				logout: vi.fn(),
				refreshToken: vi.fn(),
				updateUser: vi.fn(),
				updatePreferences: vi.fn(),
				clearError: vi.fn(),
			});

			render(
				<ProtectedRoute>
					<div>Protected Content</div>
				</ProtectedRoute>,
				{ wrapper: createWrapper() },
			);

			expect(screen.getByText("Loading...")).toBeInTheDocument();
		});
	});

	describe("Unauthenticated State", () => {
		beforeEach(() => {
			mockUseAuth.mockReturnValue({
				isAuthenticated: false,
				user: null,
				isLoading: false,
				isInitialized: true,
				error: null,
				login: vi.fn(),
				logout: vi.fn(),
				refreshToken: vi.fn(),
				updateUser: vi.fn(),
				updatePreferences: vi.fn(),
				clearError: vi.fn(),
			});
		});

		it("should show login prompt when user is not authenticated", () => {
			render(
				<ProtectedRoute>
					<div>Protected Content</div>
				</ProtectedRoute>,
				{ wrapper: createWrapper() },
			);

			expect(screen.getByText("Authentication Required")).toBeInTheDocument();
			expect(
				screen.getByText("Please sign in to access this page"),
			).toBeInTheDocument();
			expect(screen.getByText("Sign In")).toBeInTheDocument();
			expect(screen.getByText("Create Account")).toBeInTheDocument();
		});

		it("should use custom fallback when provided", () => {
			const customFallback = (
				<div data-testid="custom-fallback">Custom Fallback</div>
			);

			render(
				<ProtectedRoute fallback={customFallback}>
					<div>Protected Content</div>
				</ProtectedRoute>,
				{ wrapper: createWrapper() },
			);

			expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
			expect(
				screen.queryByText("Authentication Required"),
			).not.toBeInTheDocument();
		});

		it("should redirect immediately when showLoginPrompt is false", () => {
			render(
				<ProtectedRoute showLoginPrompt={false}>
					<div>Protected Content</div>
				</ProtectedRoute>,
				{ wrapper: createWrapper() },
			);

			expect(mockNavigate).toHaveBeenCalledWith("/login", {
				state: { from: mockLocation },
			});
		});

		it("should use custom redirect path", () => {
			render(
				<ProtectedRoute redirectTo="/custom-login" showLoginPrompt={false}>
					<div>Protected Content</div>
				</ProtectedRoute>,
				{ wrapper: createWrapper() },
			);

			expect(mockNavigate).toHaveBeenCalledWith("/custom-login", {
				state: { from: mockLocation },
			});
		});
	});

	describe("Authenticated State", () => {
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

		beforeEach(() => {
			mockUseAuth.mockReturnValue({
				isAuthenticated: true,
				user: mockUser,
				isLoading: false,
				isInitialized: true,
				error: null,
				login: vi.fn(),
				logout: vi.fn(),
				refreshToken: vi.fn(),
				updateUser: vi.fn(),
				updatePreferences: vi.fn(),
				clearError: vi.fn(),
			});
		});

		it("should render children when user is authenticated", () => {
			render(
				<ProtectedRoute>
					<div data-testid="protected-content">Protected Content</div>
				</ProtectedRoute>,
				{ wrapper: createWrapper() },
			);

			expect(screen.getByTestId("protected-content")).toBeInTheDocument();
			expect(
				screen.queryByText("Authentication Required"),
			).not.toBeInTheDocument();
		});

		it("should render children when user has required role", () => {
			render(
				<ProtectedRoute requiredRole="user">
					<div data-testid="protected-content">Protected Content</div>
				</ProtectedRoute>,
				{ wrapper: createWrapper() },
			);

			expect(screen.getByTestId("protected-content")).toBeInTheDocument();
		});

		it("should show access denied when user lacks required role", () => {
			render(
				<ProtectedRoute requiredRole="admin">
					<div>Protected Content</div>
				</ProtectedRoute>,
				{ wrapper: createWrapper() },
			);

			expect(screen.getByText("Access Denied")).toBeInTheDocument();
			expect(
				screen.getByText("You don't have permission to access this page"),
			).toBeInTheDocument();
			expect(
				screen.getByText("This page requires admin privileges."),
			).toBeInTheDocument();
			expect(screen.getByText("Your current role: user")).toBeInTheDocument();
		});
	});
});

describe("withAuth HOC", () => {
	beforeEach(() => {
		mockUseAuth.mockReturnValue({
			isAuthenticated: true,
			user: {
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
			},
			isLoading: false,
			isInitialized: true,
			error: null,
			login: vi.fn(),
			logout: vi.fn(),
			refreshToken: vi.fn(),
			updateUser: vi.fn(),
			updatePreferences: vi.fn(),
			clearError: vi.fn(),
		});
	});

	it("should wrap component with authentication protection", () => {
		const ProtectedTestComponent = withAuth(TestComponent);

		render(<ProtectedTestComponent message="Hello World" />, {
			wrapper: createWrapper(),
		});

		expect(screen.getByTestId("test-component")).toBeInTheDocument();
		expect(screen.getByText("Hello World")).toBeInTheDocument();
	});

	it("should pass through props to wrapped component", () => {
		const ProtectedTestComponent = withAuth(TestComponent, {
			requiredRole: "user",
		});

		render(<ProtectedTestComponent message="Custom Message" />, {
			wrapper: createWrapper(),
		});

		expect(screen.getByText("Custom Message")).toBeInTheDocument();
	});
});

describe("useRequireAuth Hook", () => {
	beforeEach(() => {
		mockUseAuth.mockReturnValue({
			isAuthenticated: true,
			user: {
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
			},
			isLoading: false,
			isInitialized: true,
			error: null,
			login: vi.fn(),
			logout: vi.fn(),
			refreshToken: vi.fn(),
			updateUser: vi.fn(),
			updatePreferences: vi.fn(),
			clearError: vi.fn(),
		});
	});

	it("should return authentication status", () => {
		const TestHookComponent = () => {
			const auth = useRequireAuth();
			return (
				<div>
					<span data-testid="is-authenticated">
						{auth.isAuthenticated.toString()}
					</span>
					<span data-testid="has-role">{auth.hasRequiredRole.toString()}</span>
				</div>
			);
		};

		render(<TestHookComponent />, { wrapper: createWrapper() });

		expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
		expect(screen.getByTestId("has-role")).toHaveTextContent("true");
	});

	it("should redirect unauthenticated users", async () => {
		mockUseAuth.mockReturnValue({
			isAuthenticated: false,
			user: null,
			isLoading: false,
			isInitialized: true,
			error: null,
			login: vi.fn(),
			logout: vi.fn(),
			refreshToken: vi.fn(),
			updateUser: vi.fn(),
			updatePreferences: vi.fn(),
			clearError: vi.fn(),
		});

		const TestHookComponent = () => {
			useRequireAuth();
			return <div>Test Component</div>;
		};

		render(<TestHookComponent />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith("/login", {
				state: { from: mockLocation },
			});
		});
	});
});

describe("AuthStatus Component", () => {
	it("should show loading state", () => {
		mockUseAuth.mockReturnValue({
			isAuthenticated: false,
			user: null,
			isLoading: true,
			isInitialized: false,
			error: null,
			login: vi.fn(),
			logout: vi.fn(),
			refreshToken: vi.fn(),
			updateUser: vi.fn(),
			updatePreferences: vi.fn(),
			clearError: vi.fn(),
		});

		render(<AuthStatus />, { wrapper: createWrapper() });

		expect(screen.getByText("Loading...")).toBeInTheDocument();
	});

	it("should show unauthenticated state", () => {
		mockUseAuth.mockReturnValue({
			isAuthenticated: false,
			user: null,
			isLoading: false,
			isInitialized: true,
			error: null,
			login: vi.fn(),
			logout: vi.fn(),
			refreshToken: vi.fn(),
			updateUser: vi.fn(),
			updatePreferences: vi.fn(),
			clearError: vi.fn(),
		});

		render(<AuthStatus />, { wrapper: createWrapper() });

		expect(screen.getByText("Not authenticated")).toBeInTheDocument();
	});

	it("should show authenticated state with user name", () => {
		mockUseAuth.mockReturnValue({
			isAuthenticated: true,
			user: {
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
			},
			isLoading: false,
			isInitialized: true,
			error: null,
			login: vi.fn(),
			logout: vi.fn(),
			refreshToken: vi.fn(),
			updateUser: vi.fn(),
			updatePreferences: vi.fn(),
			clearError: vi.fn(),
		});

		render(<AuthStatus />, { wrapper: createWrapper() });

		expect(screen.getByText("Authenticated as Test User")).toBeInTheDocument();
	});

	it("should show authenticated state with email when name is not available", () => {
		mockUseAuth.mockReturnValue({
			isAuthenticated: true,
			user: {
				id: "user-123",
				email: "test@example.com",
				name: "",
				avatar: "",
				role: "user",
				preferences: {},
				createdAt: "2023-01-01T00:00:00Z",
				updatedAt: "2023-01-01T00:00:00Z",
				emailVerified: true,
				phoneVerified: false,
			},
			isLoading: false,
			isInitialized: true,
			error: null,
			login: vi.fn(),
			logout: vi.fn(),
			refreshToken: vi.fn(),
			updateUser: vi.fn(),
			updatePreferences: vi.fn(),
			clearError: vi.fn(),
		});

		render(<AuthStatus />, { wrapper: createWrapper() });

		expect(
			screen.getByText("Authenticated as test@example.com"),
		).toBeInTheDocument();
	});
});
