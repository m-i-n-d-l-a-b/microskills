import React, { type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface ProtectedRouteProps {
	children: ReactNode;
	requiredRole?: string;
	fallback?: ReactNode;
	redirectTo?: string;
	showLoginPrompt?: boolean;
}

export function ProtectedRoute({
	children,
	requiredRole,
	fallback,
	redirectTo = "/login",
	showLoginPrompt = true,
}: ProtectedRouteProps) {
	const { isAuthenticated, user, isLoading, isInitialized } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	// Show loading spinner while authentication is being initialized
	if (!isInitialized || isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="flex flex-col items-center space-y-4">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<p className="text-sm text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	// Check if user is authenticated
	if (!isAuthenticated) {
		// If custom fallback is provided, use it
		if (fallback) {
			return <>{fallback}</>;
		}

		// If login prompt is disabled, redirect immediately
		if (!showLoginPrompt) {
			navigate(redirectTo, { state: { from: location } });
			return null;
		}

		// Show login prompt
		return (
			<div className="flex items-center justify-center min-h-screen bg-background">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle>Authentication Required</CardTitle>
						<CardDescription>
							Please sign in to access this page
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="text-center text-sm text-muted-foreground">
							You need to be logged in to view this content.
						</div>
						<div className="flex flex-col space-y-2">
							<Button
								onClick={() =>
									navigate("/login", { state: { from: location } })
								}
								className="w-full"
							>
								Sign In
							</Button>
							<Button
								variant="outline"
								onClick={() =>
									navigate("/register", { state: { from: location } })
								}
								className="w-full"
							>
								Create Account
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Check if user has required role
	if (requiredRole && user?.role !== requiredRole) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-background">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle>Access Denied</CardTitle>
						<CardDescription>
							You don't have permission to access this page
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="text-center text-sm text-muted-foreground">
							This page requires {requiredRole} privileges.
							<br />
							Your current role: {user?.role || "None"}
						</div>
						<div className="flex flex-col space-y-2">
							<Button onClick={() => navigate("/")} className="w-full">
								Go Home
							</Button>
							<Button
								variant="outline"
								onClick={() => navigate("/contact")}
								className="w-full"
							>
								Contact Support
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// User is authenticated and has required role (if specified)
	return <>{children}</>;
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(
	Component: React.ComponentType<P>,
	options: Omit<ProtectedRouteProps, "children"> = {},
) {
	return function AuthenticatedComponent(props: P) {
		return (
			<ProtectedRoute {...options}>
				<Component {...props} />
			</ProtectedRoute>
		);
	};
}

// Hook for checking authentication status
export function useRequireAuth(requiredRole?: string) {
	const { isAuthenticated, user, isLoading, isInitialized } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	React.useEffect(() => {
		if (isInitialized && !isLoading) {
			if (!isAuthenticated) {
				navigate("/login", { state: { from: location } });
			} else if (requiredRole && user?.role !== requiredRole) {
				navigate("/unauthorized");
			}
		}
	}, [
		isAuthenticated,
		user?.role,
		requiredRole,
		isInitialized,
		isLoading,
		navigate,
		location,
	]);

	return {
		isAuthenticated,
		user,
		isLoading,
		isInitialized,
		hasRequiredRole: !requiredRole || user?.role === requiredRole,
	};
}

// Component for showing authentication status
export function AuthStatus() {
	const { isAuthenticated, user, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="flex items-center space-x-2">
				<Loader2 className="h-4 w-4 animate-spin" />
				<span className="text-sm text-muted-foreground">Loading...</span>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="flex items-center space-x-2">
				<div className="h-2 w-2 rounded-full bg-red-500" />
				<span className="text-sm text-muted-foreground">Not authenticated</span>
			</div>
		);
	}

	return (
		<div className="flex items-center space-x-2">
			<div className="h-2 w-2 rounded-full bg-green-500" />
			<span className="text-sm text-muted-foreground">
				Authenticated as {user?.name || user?.email}
			</span>
		</div>
	);
}

export default ProtectedRoute;
