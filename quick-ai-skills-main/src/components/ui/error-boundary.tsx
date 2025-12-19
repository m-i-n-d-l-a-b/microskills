import React, { Component, ErrorInfo, ReactNode } from "react";
import {
	AlertTriangle,
	RefreshCw,
	Bug,
	Activity,
	Home,
	ArrowLeft,
	Settings,
} from "lucide-react";
import { Button } from "./button";
import { Card } from "./card";
import { reportError, addBreadcrumb } from "@/services/monitoringService";
import { useAuth } from "@/hooks/useAuth";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	componentName?: string;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
	onRetry?: () => void;
	onReset?: () => void;
	retryCount?: number;
	maxRetries?: number;
	showErrorDetails?: boolean;
	errorType?: "boundary" | "fallback" | "critical";
}

interface State {
	hasError: boolean;
	error?: Error;
	errorInfo?: ErrorInfo;
	errorId?: string;
	reported: boolean;
	retryCount: number;
	isRecovering: boolean;
	lastErrorTime: number;
}

export class ErrorBoundary extends Component<Props, State> {
	private retryTimeout?: NodeJS.Timeout;
	private recoveryAttempts = 0;
	private readonly maxRecoveryAttempts = 3;

	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
			reported: false,
			retryCount: 0,
			isRecovering: false,
			lastErrorTime: 0,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		return {
			hasError: true,
			error,
			reported: false,
			lastErrorTime: Date.now(),
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		this.setState({ error, errorInfo });

		// Add breadcrumb for error tracking
		addBreadcrumb(
			`Error caught in ${this.props.componentName || "Unknown Component"}`,
			"error-boundary",
		);

		// Report error to monitoring service
		if (!this.state.reported) {
			const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			reportError(
				{
					message: error.message,
					stack: error.stack,
					name: error.name,
					code: "REACT_ERROR_BOUNDARY",
				},
				{
					componentStack: errorInfo.componentStack,
					tags: [
						"react",
						"error-boundary",
						this.props.componentName || "unknown",
					],
					metadata: {
						retryCount: this.state.retryCount,
						errorType: this.props.errorType || "boundary",
						timestamp: new Date().toISOString(),
					},
				},
			);

			this.setState({ errorId, reported: true });
		}

		// Call custom error handler if provided
		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}

		// Log to console for development
		if (process.env.NODE_ENV === "development") {
			console.error("Error Boundary caught an error:", error, errorInfo);
		}

		// Attempt automatic recovery for non-critical errors (disabled for testing)
		if (
			process.env.NODE_ENV === "production" &&
			this.props.errorType !== "critical" &&
			this.recoveryAttempts < this.maxRecoveryAttempts
		) {
			this.attemptRecovery();
		}
	}

	componentWillUnmount() {
		if (this.retryTimeout) {
			clearTimeout(this.retryTimeout);
		}
	}

	private attemptRecovery = () => {
		this.recoveryAttempts++;
		this.setState({ isRecovering: true });

		// Wait before attempting recovery
		this.retryTimeout = setTimeout(
			() => {
				this.setState({
					hasError: false,
					error: undefined,
					errorInfo: undefined,
					isRecovering: false,
				});
			},
			Math.min(1000 * this.recoveryAttempts, 5000),
		); // Exponential backoff, max 5s
	};

	handleRetry = () => {
		const { retryCount, maxRetries = 3 } = this.state;
		const { onRetry } = this.props;

		if (retryCount >= maxRetries) {
			// Reset the component completely
			this.handleReset();
			return;
		}

		this.setState({
			hasError: false,
			error: undefined,
			errorInfo: undefined,
			retryCount: retryCount + 1,
			isRecovering: true,
		});

		if (onRetry) {
			onRetry();
		}

		// Clear recovery state after a short delay
		setTimeout(() => {
			this.setState({ isRecovering: false });
		}, 1000);
	};

	handleReset = () => {
		const { onReset } = this.props;

		this.setState({
			hasError: false,
			error: undefined,
			errorInfo: undefined,
			retryCount: 0,
			isRecovering: false,
			reported: false,
		});

		this.recoveryAttempts = 0;

		if (onReset) {
			onReset();
		}
	};

	handleGoHome = () => {
		window.location.href = "/";
	};

	handleGoBack = () => {
		window.history.back();
	};

	handleGoToSettings = () => {
		window.location.href = "/settings";
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			const { retryCount, maxRetries = 3, isRecovering } = this.state;
			const canRetry = retryCount < maxRetries;
			const isCritical = this.props.errorType === "critical";

			return (
				<Card className="p-6 m-4 text-center">
					<div className="flex flex-col items-center gap-4">
						<AlertTriangle className="h-12 w-12 text-destructive" />
						<div>
							<h2 className="text-lg font-semibold mb-2">
								{isCritical ? "Critical Error" : "Something went wrong"}
							</h2>
							<p className="text-muted-foreground mb-4">
								{isCritical
									? "A critical error has occurred. Please contact support if this persists."
									: "We encountered an unexpected error. Our team has been notified and is working to fix it."}
								{this.state.errorId && (
									<span className="block text-xs text-muted-foreground mt-2">
										Error ID: {this.state.errorId}
									</span>
								)}
								{canRetry && (
									<span className="block text-xs text-muted-foreground mt-1">
										Retry {retryCount + 1} of {maxRetries}
									</span>
								)}
							</p>
						</div>

						<div className="flex flex-wrap gap-2 justify-center">
							{canRetry && (
								<Button
									onClick={this.handleRetry}
									className="gap-2"
									disabled={isRecovering}
								>
									<RefreshCw
										className={`h-4 w-4 ${isRecovering ? "animate-spin" : ""}`}
									/>
									{isRecovering ? "Recovering..." : "Try Again"}
								</Button>
							)}

							<Button
								variant="outline"
								onClick={this.handleReset}
								className="gap-2"
							>
								<Activity className="h-4 w-4" />
								Reset
							</Button>

							<Button
								variant="outline"
								onClick={this.handleGoBack}
								className="gap-2"
							>
								<ArrowLeft className="h-4 w-4" />
								Go Back
							</Button>

							<Button
								variant="outline"
								onClick={this.handleGoHome}
								className="gap-2"
							>
								<Home className="h-4 w-4" />
								Home
							</Button>

							<Button
								variant="outline"
								onClick={this.handleGoToSettings}
								className="gap-2"
							>
								<Settings className="h-4 w-4" />
								Settings
							</Button>
						</div>

						{this.props.showErrorDetails &&
							process.env.NODE_ENV === "development" &&
							this.state.error && (
								<details className="mt-4 text-left w-full">
									<summary className="cursor-pointer text-sm text-muted-foreground flex items-center gap-2">
										<Bug className="h-4 w-4" />
										Error Details (Development)
									</summary>
									<div className="mt-2 space-y-2">
										<div className="text-xs bg-muted p-2 rounded">
											<strong>Error:</strong> {this.state.error.toString()}
										</div>
										{this.state.errorInfo?.componentStack && (
											<div className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
												<strong>Component Stack:</strong>
												<pre className="mt-1 whitespace-pre-wrap">
													{this.state.errorInfo.componentStack}
												</pre>
											</div>
										)}
										{this.state.errorId && (
											<div className="text-xs bg-muted p-2 rounded">
												<strong>Error ID:</strong> {this.state.errorId}
											</div>
										)}
										<div className="text-xs bg-muted p-2 rounded">
											<strong>Retry Count:</strong> {retryCount} / {maxRetries}
										</div>
										<div className="text-xs bg-muted p-2 rounded">
											<strong>Recovery Attempts:</strong>{" "}
											{this.recoveryAttempts} / {this.maxRecoveryAttempts}
										</div>
									</div>
								</details>
							)}
					</div>
				</Card>
			);
		}

		return this.props.children;
	}
}

// Specialized Error Boundary Components

// Top-level application error boundary
export class AppErrorBoundary extends Component<Props, State> {
	render() {
		return (
			<ErrorBoundary
				{...this.props}
				errorType="critical"
				componentName="App"
				fallback={
					<div className="min-h-screen flex items-center justify-center bg-background">
						<Card className="p-8 max-w-md w-full mx-4">
							<div className="text-center space-y-4">
								<AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
								<h1 className="text-2xl font-bold">Application Error</h1>
								<p className="text-muted-foreground">
									The application has encountered a critical error. Please
									refresh the page or contact support.
								</p>
								<div className="flex gap-2 justify-center">
									<Button onClick={() => window.location.reload()}>
										Refresh Page
									</Button>
									<Button
										variant="outline"
										onClick={() => (window.location.href = "/")}
									>
										Go Home
									</Button>
								</div>
							</div>
						</Card>
					</div>
				}
			/>
		);
	}
}

// Route-level error boundary
export class RouteErrorBoundary extends Component<Props, State> {
	render() {
		return (
			<ErrorBoundary
				{...this.props}
				errorType="boundary"
				componentName="Route"
				fallback={
					<div className="min-h-[50vh] flex items-center justify-center">
						<Card className="p-6 max-w-md w-full mx-4">
							<div className="text-center space-y-4">
								<AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
								<h2 className="text-xl font-semibold">Page Error</h2>
								<p className="text-muted-foreground">
									This page encountered an error. You can try again or navigate
									to a different page.
								</p>
								<div className="flex gap-2 justify-center">
									<Button onClick={() => window.history.back()}>Go Back</Button>
									<Button
										variant="outline"
										onClick={() => (window.location.href = "/")}
									>
										Home
									</Button>
								</div>
							</div>
						</Card>
					</div>
				}
			/>
		);
	}
}

// Component-level error boundary
export class ComponentErrorBoundary extends Component<Props, State> {
	render() {
		return (
			<ErrorBoundary
				{...this.props}
				errorType="fallback"
				componentName="Component"
				fallback={
					<Card className="p-4 border-destructive/20 bg-destructive/5">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<AlertTriangle className="h-4 w-4" />
							<span>Component Error</span>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => window.location.reload()}
								className="ml-auto"
							>
								Retry
							</Button>
						</div>
					</Card>
				}
			/>
		);
	}
}

// Feature-specific error boundaries
export class LessonErrorBoundary extends Component<Props, State> {
	render() {
		return (
			<ErrorBoundary
				{...this.props}
				errorType="boundary"
				componentName="Lesson"
				fallback={
					<Card className="p-6">
						<div className="text-center space-y-4">
							<AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
							<h2 className="text-lg font-semibold">Lesson Error</h2>
							<p className="text-muted-foreground">
								There was an error loading this lesson. Please try again or
								contact support.
							</p>
							<div className="flex gap-2 justify-center">
								<Button onClick={() => window.location.reload()}>
									Reload Lesson
								</Button>
								<Button
									variant="outline"
									onClick={() => (window.location.href = "/")}
								>
									Back to Dashboard
								</Button>
							</div>
						</div>
					</Card>
				}
			/>
		);
	}
}

export class ProjectErrorBoundary extends Component<Props, State> {
	render() {
		return (
			<ErrorBoundary
				{...this.props}
				errorType="boundary"
				componentName="Project"
				fallback={
					<Card className="p-6">
						<div className="text-center space-y-4">
							<AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
							<h2 className="text-lg font-semibold">Project Error</h2>
							<p className="text-muted-foreground">
								There was an error with the project. Your work may have been
								saved automatically.
							</p>
							<div className="flex gap-2 justify-center">
								<Button onClick={() => window.location.reload()}>
									Retry Project
								</Button>
								<Button
									variant="outline"
									onClick={() => (window.location.href = "/")}
								>
									Back to Dashboard
								</Button>
							</div>
						</div>
					</Card>
				}
			/>
		);
	}
}

export class AuthErrorBoundary extends Component<Props, State> {
	render() {
		return (
			<ErrorBoundary
				{...this.props}
				errorType="boundary"
				componentName="Auth"
				fallback={
					<Card className="p-6">
						<div className="text-center space-y-4">
							<AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
							<h2 className="text-lg font-semibold">Authentication Error</h2>
							<p className="text-muted-foreground">
								There was an error with authentication. Please log in again.
							</p>
							<div className="flex gap-2 justify-center">
								<Button onClick={() => window.location.reload()}>
									Try Again
								</Button>
								<Button
									variant="outline"
									onClick={() => (window.location.href = "/auth")}
								>
									Login
								</Button>
							</div>
						</div>
					</Card>
				}
			/>
		);
	}
}

// Error Boundary Hooks for Functional Components
import { useState, useEffect, useCallback } from "react";

export interface UseErrorBoundaryReturn {
	error: Error | null;
	errorInfo: ErrorInfo | null;
	resetError: () => void;
	ErrorFallback: React.ComponentType<{ error: Error; resetError: () => void }>;
}

export function useErrorBoundary(
	componentName?: string,
	fallback?: React.ComponentType<{ error: Error; resetError: () => void }>,
): UseErrorBoundaryReturn {
	const [error, setError] = useState<Error | null>(null);
	const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

	const resetError = useCallback(() => {
		setError(null);
		setErrorInfo(null);
	}, []);

	const ErrorFallback =
		fallback ||
		(({ error, resetError }) => (
			<Card className="p-4 border-destructive/20 bg-destructive/5">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<AlertTriangle className="h-4 w-4" />
					<span>Error in {componentName || "component"}</span>
					<Button
						variant="ghost"
						size="sm"
						onClick={resetError}
						className="ml-auto"
					>
						Retry
					</Button>
				</div>
			</Card>
		));

	useEffect(() => {
		const handleError = (event: ErrorEvent) => {
			setError(event.error);
			setErrorInfo({
				componentStack: event.filename || "Unknown",
			} as ErrorInfo);
		};

		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			setError(new Error(event.reason));
			setErrorInfo({
				componentStack: "Promise rejection",
			} as ErrorInfo);
		};

		window.addEventListener("error", handleError);
		window.addEventListener("unhandledrejection", handleUnhandledRejection);

		return () => {
			window.removeEventListener("error", handleError);
			window.removeEventListener(
				"unhandledrejection",
				handleUnhandledRejection,
			);
		};
	}, []);

	return { error, errorInfo, resetError, ErrorFallback };
}

// Error Boundary Provider for Context-based Error Handling
import { createContext, useContext, ReactNode } from "react";

interface ErrorBoundaryContextType {
	reportError: (error: Error, errorInfo: ErrorInfo) => void;
	clearErrors: () => void;
	hasErrors: boolean;
	errorCount: number;
}

const ErrorBoundaryContext = createContext<
	ErrorBoundaryContextType | undefined
>(undefined);

interface ErrorBoundaryProviderProps {
	children: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export function ErrorBoundaryProvider({
	children,
	onError,
}: ErrorBoundaryProviderProps) {
	const [errors, setErrors] = useState<
		Array<{ error: Error; errorInfo: ErrorInfo; timestamp: number }>
	>([]);

	const reportError = useCallback(
		(error: Error, errorInfo: ErrorInfo) => {
			setErrors((prev) => [
				...prev,
				{ error, errorInfo, timestamp: Date.now() },
			]);

			if (onError) {
				onError(error, errorInfo);
			}
		},
		[onError],
	);

	const clearErrors = useCallback(() => {
		setErrors([]);
	}, []);

	const value: ErrorBoundaryContextType = {
		reportError,
		clearErrors,
		hasErrors: errors.length > 0,
		errorCount: errors.length,
	};

	return (
		<ErrorBoundaryContext.Provider value={value}>
			{children}
		</ErrorBoundaryContext.Provider>
	);
}

export function useErrorBoundaryContext(): ErrorBoundaryContextType {
	const context = useContext(ErrorBoundaryContext);
	if (!context) {
		throw new Error(
			"useErrorBoundaryContext must be used within an ErrorBoundaryProvider",
		);
	}
	return context;
}

// Error Recovery Utilities
export const ErrorRecoveryUtils = {
	// Check if error is recoverable
	isRecoverable: (error: Error): boolean => {
		const nonRecoverableErrors = [
			"NetworkError",
			"QuotaExceededError",
			"SecurityError",
			"NotSupportedError",
		];

		return !nonRecoverableErrors.some(
			(errorType) =>
				error.name.includes(errorType) || error.message.includes(errorType),
		);
	},

	// Get recovery strategy for error type
	getRecoveryStrategy: (
		error: Error,
	): "retry" | "reset" | "redirect" | "none" => {
		if (
			error.name.includes("NetworkError") ||
			error.message.includes("fetch")
		) {
			return "retry";
		}

		if (error.name.includes("Auth") || error.message.includes("unauthorized")) {
			return "redirect";
		}

		if (
			error.name.includes("Validation") ||
			error.message.includes("validation")
		) {
			return "reset";
		}

		return "none";
	},

	// Calculate retry delay with exponential backoff
	getRetryDelay: (attempt: number, baseDelay: number = 1000): number => {
		return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
	},

	// Check if error should be reported
	shouldReportError: (error: Error, context?: string): boolean => {
		// Don't report expected errors
		const expectedErrors = [
			"User cancelled",
			"Network request aborted",
			"Component unmounted",
		];

		return !expectedErrors.some((expected) => error.message.includes(expected));
	},
};

// Default export for backward compatibility
export default ErrorBoundary;
