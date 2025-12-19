import { ERROR_MESSAGES, STORAGE_KEYS } from "@/lib/constants";
import type { ApiError } from "@/types/api";

// Error severity levels
export enum ErrorSeverity {
	LOW = "low",
	MEDIUM = "medium",
	HIGH = "high",
	CRITICAL = "critical",
}

// Error categories
export enum ErrorCategory {
	NETWORK = "network",
	AUTHENTICATION = "authentication",
	AUTHORIZATION = "authorization",
	VALIDATION = "validation",
	SERVER = "server",
	CLIENT = "client",
	TIMEOUT = "timeout",
	UNKNOWN = "unknown",
}

// Error context interface
export interface ErrorContext {
	userId?: string;
	sessionId?: string;
	requestId?: string;
	endpoint?: string;
	method?: string;
	timestamp: string;
	userAgent?: string;
	url?: string;
	stack?: string;
	metadata?: Record<string, any>;
}

// Error log entry interface
export interface ErrorLogEntry {
	id: string;
	error: ApiError;
	severity: ErrorSeverity;
	category: ErrorCategory;
	context: ErrorContext;
	userMessage: string;
	technicalMessage: string;
	timestamp: string;
	resolved: boolean;
	retryCount: number;
	maxRetries: number;
}

// Error handler configuration
export interface ErrorHandlerConfig {
	enableLogging: boolean;
	enableMonitoring: boolean;
	enableUserNotifications: boolean;
	logLevel: "debug" | "info" | "warn" | "error";
	maxRetries: number;
	retryDelay: number;
	errorReportingEndpoint?: string;
}

// Error reporting service interface
export interface ErrorReportingService {
	reportError(error: ErrorLogEntry): Promise<void>;
	getErrorStats(): Promise<ErrorStats>;
	resolveError(errorId: string): Promise<void>;
}

// Error statistics interface
export interface ErrorStats {
	totalErrors: number;
	errorsByCategory: Record<ErrorCategory, number>;
	errorsBySeverity: Record<ErrorSeverity, number>;
	recentErrors: ErrorLogEntry[];
	resolutionRate: number;
}

export class ErrorHandler {
	private config: ErrorHandlerConfig;
	private errorLog: ErrorLogEntry[] = [];
	private reportingService?: ErrorReportingService;
	private requestIdCounter = 0;

	constructor(config: Partial<ErrorHandlerConfig> = {}) {
		this.config = {
			enableLogging: true,
			enableMonitoring: true,
			enableUserNotifications: true,
			logLevel: "error",
			maxRetries: 3,
			retryDelay: 1000,
			...config,
		};
	}

	// Set error reporting service
	public setReportingService(service: ErrorReportingService): void {
		this.reportingService = service;
	}

	// Generate unique request ID
	private generateRequestId(): string {
		return `req_${Date.now()}_${++this.requestIdCounter}`;
	}

	// Get error category from status code
	private getErrorCategory(status: number): ErrorCategory {
		if (status >= 500) return ErrorCategory.SERVER;
		if (status === 401) return ErrorCategory.AUTHENTICATION;
		if (status === 403) return ErrorCategory.AUTHORIZATION;
		if (status === 400 || status === 422) return ErrorCategory.VALIDATION;
		if (status >= 400 && status < 500) return ErrorCategory.CLIENT;
		if (status === 0) return ErrorCategory.NETWORK;
		if (status === 408) return ErrorCategory.TIMEOUT;
		return ErrorCategory.UNKNOWN;
	}

	// Get error severity from status code and context
	private getErrorSeverity(
		status: number,
		context: ErrorContext,
	): ErrorSeverity {
		if (status >= 500) return ErrorSeverity.HIGH;
		if (status === 401 || status === 403) return ErrorSeverity.MEDIUM;
		if (status === 0) return ErrorSeverity.CRITICAL; // Network error
		if (status === 408) return ErrorSeverity.CRITICAL; // Timeout error
		if (context.endpoint?.includes("/auth/")) return ErrorSeverity.MEDIUM;
		return ErrorSeverity.LOW;
	}

	// Get user-friendly error message
	private getUserMessage(error: ApiError, category: ErrorCategory): string {
		switch (category) {
			case ErrorCategory.NETWORK:
				return ERROR_MESSAGES.NETWORK_ERROR;
			case ErrorCategory.AUTHENTICATION:
				return ERROR_MESSAGES.UNAUTHORIZED;
			case ErrorCategory.AUTHORIZATION:
				return ERROR_MESSAGES.FORBIDDEN;
			case ErrorCategory.VALIDATION:
				return ERROR_MESSAGES.VALIDATION_ERROR;
			case ErrorCategory.SERVER:
				return ERROR_MESSAGES.SERVER_ERROR;
			case ErrorCategory.CLIENT:
				return ERROR_MESSAGES.NOT_FOUND;
			default:
				return error.message || ERROR_MESSAGES.UNKNOWN_ERROR;
		}
	}

	// Get technical error message for logging
	private getTechnicalMessage(error: ApiError, context: ErrorContext): string {
		const parts = [
			`Status: ${error.status}`,
			`Code: ${error.code || "N/A"}`,
			`Endpoint: ${context.endpoint || "N/A"}`,
			`Method: ${context.method || "N/A"}`,
		];

		if (error.details) {
			parts.push(`Details: ${JSON.stringify(error.details)}`);
		}

		return parts.join(" | ");
	}

	// Create error context
	private createErrorContext(
		error: ApiError,
		requestInfo?: {
			endpoint?: string;
			method?: string;
			userId?: string;
			sessionId?: string;
		},
	): ErrorContext {
		return {
			userId: requestInfo?.userId,
			sessionId: requestInfo?.sessionId,
			requestId: this.generateRequestId(),
			endpoint: requestInfo?.endpoint,
			method: requestInfo?.method,
			timestamp: new Date().toISOString(),
			userAgent:
				typeof navigator !== "undefined" ? navigator.userAgent : undefined,
			url: typeof window !== "undefined" ? window.location.href : undefined,
			stack: error.details?.stack,
			metadata: {
				errorCode: error.code,
				errorDetails: error.details,
			},
		};
	}

	// Log error to console
	private logError(error: ErrorLogEntry): void {
		if (!this.config.enableLogging) return;

		const logMessage = `[${error.severity.toUpperCase()}] ${error.category}: ${error.technicalMessage}`;

		switch (error.severity) {
			case ErrorSeverity.CRITICAL:
			case ErrorSeverity.HIGH:
				console.error(logMessage);
				break;
			case ErrorSeverity.MEDIUM:
				console.warn(logMessage);
				break;
			case ErrorSeverity.LOW:
				console.info(logMessage);
				break;
		}
	}

	// Store error in local log
	private storeError(error: ErrorLogEntry): void {
		this.errorLog.push(error);

		// Keep only last 100 errors to prevent memory issues
		if (this.errorLog.length > 100) {
			this.errorLog = this.errorLog.slice(-100);
		}

		// Store in localStorage for persistence across sessions
		if (typeof localStorage !== "undefined") {
			try {
				localStorage.setItem(
					"error_log",
					JSON.stringify(this.errorLog.slice(-50)),
				);
			} catch (e) {
				console.warn("Failed to store error log in localStorage:", e);
			}
		}
	}

	// Report error to external service
	private async reportError(error: ErrorLogEntry): Promise<void> {
		if (!this.config.enableMonitoring || !this.reportingService) return;

		try {
			await this.reportingService.reportError(error);
		} catch (reportingError) {
			console.warn(
				"Failed to report error to external service:",
				reportingError,
			);
		}
	}

	// Show user notification
	private showUserNotification(error: ErrorLogEntry): void {
		if (!this.config.enableUserNotifications) return;

		// In a real app, this would integrate with a notification system
		// For now, we'll just log the user message
		console.log("User Notification:", error.userMessage);
	}

	// Main error handling method
	public async handleError(
		error: ApiError,
		requestInfo?: {
			endpoint?: string;
			method?: string;
			userId?: string;
			sessionId?: string;
		},
	): Promise<void> {
		const context = this.createErrorContext(error, requestInfo);
		const category = this.getErrorCategory(error.status);
		const severity = this.getErrorSeverity(error.status, context);
		const userMessage = this.getUserMessage(error, category);
		const technicalMessage = this.getTechnicalMessage(error, context);

		const errorEntry: ErrorLogEntry = {
			id: context.requestId,
			error,
			severity,
			category,
			context,
			userMessage,
			technicalMessage,
			timestamp: context.timestamp,
			resolved: false,
			retryCount: 0,
			maxRetries: this.config.maxRetries,
		};

		// Log error
		this.logError(errorEntry);

		// Store error
		this.storeError(errorEntry);

		// Report to external service
		await this.reportError(errorEntry);

		// Show user notification
		this.showUserNotification(errorEntry);
	}

	// Handle API response errors
	public async handleApiError(
		response: Response,
		endpoint: string,
		method: string,
		userId?: string,
		sessionId?: string,
	): Promise<ApiError> {
		let errorData: any;

		try {
			const contentType = response.headers.get("content-type");
			if (contentType && contentType.includes("application/json")) {
				errorData = await response.json();
			} else {
				const textData = await response.text();
				errorData = { message: textData };
			}
		} catch (e) {
			errorData = { message: "Failed to parse error response" };
		}

		const apiError: ApiError = {
			message: errorData.message || ERROR_MESSAGES.UNKNOWN_ERROR,
			status: response.status,
			code: errorData.code,
			details: errorData,
		};

		await this.handleError(apiError, {
			endpoint,
			method,
			userId,
			sessionId,
		});

		return apiError;
	}

	// Handle network errors
	public async handleNetworkError(
		error: Error,
		endpoint: string,
		method: string,
		userId?: string,
		sessionId?: string,
	): Promise<ApiError> {
		const apiError: ApiError = {
			message: ERROR_MESSAGES.NETWORK_ERROR,
			status: 0,
			code: "NETWORK_ERROR",
			details: {
				originalError: error.message,
				stack: error.stack,
			},
		};

		await this.handleError(apiError, {
			endpoint,
			method,
			userId,
			sessionId,
		});

		return apiError;
	}

	// Handle timeout errors
	public async handleTimeoutError(
		endpoint: string,
		method: string,
		timeout: number,
		userId?: string,
		sessionId?: string,
	): Promise<ApiError> {
		const apiError: ApiError = {
			message: ERROR_MESSAGES.TIMEOUT_ERROR,
			status: 408,
			code: "TIMEOUT_ERROR",
			details: {
				timeout,
				endpoint,
				method,
			},
		};

		await this.handleError(apiError, {
			endpoint,
			method,
			userId,
			sessionId,
		});

		return apiError;
	}

	// Get error statistics
	public getErrorStats(): ErrorStats {
		const totalErrors = this.errorLog.length;
		const errorsByCategory: Record<ErrorCategory, number> = {
			[ErrorCategory.NETWORK]: 0,
			[ErrorCategory.AUTHENTICATION]: 0,
			[ErrorCategory.AUTHORIZATION]: 0,
			[ErrorCategory.VALIDATION]: 0,
			[ErrorCategory.SERVER]: 0,
			[ErrorCategory.CLIENT]: 0,
			[ErrorCategory.TIMEOUT]: 0,
			[ErrorCategory.UNKNOWN]: 0,
		};

		const errorsBySeverity: Record<ErrorSeverity, number> = {
			[ErrorSeverity.LOW]: 0,
			[ErrorSeverity.MEDIUM]: 0,
			[ErrorSeverity.HIGH]: 0,
			[ErrorSeverity.CRITICAL]: 0,
		};

		this.errorLog.forEach((error) => {
			errorsByCategory[error.category]++;
			errorsBySeverity[error.severity]++;
		});

		const resolvedErrors = this.errorLog.filter(
			(error) => error.resolved,
		).length;
		const resolutionRate =
			totalErrors > 0 ? (resolvedErrors / totalErrors) * 100 : 0;

		return {
			totalErrors,
			errorsByCategory,
			errorsBySeverity,
			recentErrors: this.errorLog.slice(-10),
			resolutionRate,
		};
	}

	// Resolve an error
	public async resolveError(errorId: string): Promise<void> {
		const error = this.errorLog.find((e) => e.id === errorId);
		if (error) {
			error.resolved = true;

			if (this.reportingService) {
				await this.reportingService.resolveError(errorId);
			}
		}
	}

	// Clear error log
	public clearErrorLog(): void {
		this.errorLog = [];

		if (typeof localStorage !== "undefined") {
			localStorage.removeItem("error_log");
		}
	}

	// Load error log from localStorage
	public loadErrorLog(): void {
		if (typeof localStorage !== "undefined") {
			try {
				const storedLog = localStorage.getItem("error_log");
				if (storedLog) {
					const parsedLog = JSON.parse(storedLog);
					this.errorLog = Array.isArray(parsedLog) ? parsedLog : [];
				}
			} catch (e) {
				console.warn("Failed to load error log from localStorage:", e);
			}
		}
	}

	// Get configuration
	public getConfig(): ErrorHandlerConfig {
		return { ...this.config };
	}

	// Update configuration
	public updateConfig(updates: Partial<ErrorHandlerConfig>): void {
		this.config = { ...this.config, ...updates };
	}
}

// Create singleton instance
export const errorHandler = new ErrorHandler();

// Export default instance
export default errorHandler;

// Utility functions
export const handleApiError = (
	response: Response,
	endpoint: string,
	method: string,
	userId?: string,
	sessionId?: string,
): Promise<ApiError> =>
	errorHandler.handleApiError(response, endpoint, method, userId, sessionId);

export const handleNetworkError = (
	error: Error,
	endpoint: string,
	method: string,
	userId?: string,
	sessionId?: string,
): Promise<ApiError> =>
	errorHandler.handleNetworkError(error, endpoint, method, userId, sessionId);

export const handleTimeoutError = (
	endpoint: string,
	method: string,
	timeout: number,
	userId?: string,
	sessionId?: string,
): Promise<ApiError> =>
	errorHandler.handleTimeoutError(endpoint, method, timeout, userId, sessionId);

export const handleError = (
	error: ApiError,
	requestInfo?: {
		endpoint?: string;
		method?: string;
		userId?: string;
		sessionId?: string;
	},
): Promise<void> => errorHandler.handleError(error, requestInfo);

export const getErrorStats = (): ErrorStats => errorHandler.getErrorStats();
export const resolveError = (errorId: string): Promise<void> =>
	errorHandler.resolveError(errorId);
export const clearErrorLog = (): void => errorHandler.clearErrorLog();
