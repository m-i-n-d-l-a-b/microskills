import { errorHandler } from "./errorHandling";
import { supabaseAuthManager } from "@/lib/supabaseAuth";
import { ENV } from "@/lib/constants";
import type { ApiResponse, ApiError } from "@/types/api";

// Request interceptor interface
export interface RequestInterceptor {
	onRequest?: (config: RequestConfig) => Promise<RequestConfig> | RequestConfig;
	onRequestError?: (
		error: Error,
		config: RequestConfig,
	) => Promise<never> | never;
}

// Response interceptor interface
export interface ResponseInterceptor {
	onResponse?: <T>(
		response: ApiResponse<T>,
		config: RequestConfig,
	) => Promise<ApiResponse<T>> | ApiResponse<T>;
	onResponseError?: (
		error: ApiError,
		config: RequestConfig,
	) => Promise<never> | never;
}

// Request configuration interface
export interface RequestConfig {
	url: string;
	method: string;
	headers: Record<string, string>;
	body?: any;
	timeout?: number;
	retries?: number;
	userId?: string;
	sessionId?: string;
	requestId: string;
	timestamp: string;
	metadata?: Record<string, any>;
}

// Performance metrics interface
export interface PerformanceMetrics {
	requestId: string;
	url: string;
	method: string;
	startTime: number;
	endTime?: number;
	duration?: number;
	status?: number;
	success: boolean;
	error?: string;
	userId?: string;
	sessionId?: string;
}

// Logging levels
export enum LogLevel {
	DEBUG = "debug",
	INFO = "info",
	WARN = "warn",
	ERROR = "error",
}

// Log entry interface
export interface LogEntry {
	level: LogLevel;
	message: string;
	timestamp: string;
	requestId?: string;
	userId?: string;
	sessionId?: string;
	metadata?: Record<string, any>;
}

// Interceptor chain interface
export interface InterceptorChain {
	request: RequestInterceptor[];
	response: ResponseInterceptor[];
}

class InterceptorManager {
	private interceptors: InterceptorChain = {
		request: [],
		response: [],
	};
	private performanceMetrics: PerformanceMetrics[] = [];
	private logEntries: LogEntry[] = [];
	private isLoggingEnabled: boolean = true;
	private isMonitoringEnabled: boolean = true;

	constructor() {
		this.setupDefaultInterceptors();
	}

	// Setup default interceptors
	private setupDefaultInterceptors(): void {
		// Request interceptors
		this.addRequestInterceptor({
			onRequest: this.logRequest.bind(this),
			onRequestError: this.handleRequestError.bind(this),
		});

		// Response interceptors
		this.addResponseInterceptor({
			onResponse: this.logResponse.bind(this),
			onResponseError: this.handleResponseError.bind(this),
		});
	}

	// Add request interceptor
	public addRequestInterceptor(interceptor: RequestInterceptor): void {
		this.interceptors.request.push(interceptor);
	}

	// Add response interceptor
	public addResponseInterceptor(interceptor: ResponseInterceptor): void {
		this.interceptors.response.push(interceptor);
	}

	// Remove request interceptor
	public removeRequestInterceptor(interceptor: RequestInterceptor): void {
		const index = this.interceptors.request.indexOf(interceptor);
		if (index > -1) {
			this.interceptors.request.splice(index, 1);
		}
	}

	// Remove response interceptor
	public removeResponseInterceptor(interceptor: ResponseInterceptor): void {
		const index = this.interceptors.response.indexOf(interceptor);
		if (index > -1) {
			this.interceptors.response.splice(index, 1);
		}
	}

	// Execute request interceptors
	public async executeRequestInterceptors(
		config: RequestConfig,
	): Promise<RequestConfig> {
		let currentConfig = config;

		for (const interceptor of this.interceptors.request) {
			if (interceptor.onRequest) {
				try {
					currentConfig = await interceptor.onRequest(currentConfig);
				} catch (error) {
					if (interceptor.onRequestError) {
						throw await interceptor.onRequestError(
							error as Error,
							currentConfig,
						);
					}
					throw error;
				}
			}
		}

		return currentConfig;
	}

	// Execute response interceptors
	public async executeResponseInterceptors<T>(
		response: ApiResponse<T>,
		config: RequestConfig,
	): Promise<ApiResponse<T>> {
		let currentResponse = response;

		for (const interceptor of this.interceptors.response) {
			if (interceptor.onResponse) {
				try {
					currentResponse = await interceptor.onResponse(
						currentResponse,
						config,
					);
				} catch (error) {
					if (interceptor.onResponseError) {
						throw await interceptor.onResponseError(error as ApiError, config);
					}
					throw error;
				}
			}
		}

		return currentResponse;
	}

	// Execute response error interceptors
	public async executeResponseErrorInterceptors(
		error: ApiError,
		config: RequestConfig,
	): Promise<never> {
		for (const interceptor of this.interceptors.response) {
			if (interceptor.onResponseError) {
				try {
					throw await interceptor.onResponseError(error, config);
				} catch (interceptorError) {
					error = interceptorError as ApiError;
				}
			}
		}

		// Always throw the final error
		throw error;
	}

	// Default request logging interceptor
	private async logRequest(config: RequestConfig): Promise<RequestConfig> {
		const startTime = performance.now();

		// Add performance tracking
		const metrics: PerformanceMetrics = {
			requestId: config.requestId,
			url: config.url,
			method: config.method,
			startTime,
			success: false,
			userId: config.userId,
			sessionId: config.sessionId,
		};

		this.performanceMetrics.push(metrics);

		// Log request
		this.log(LogLevel.INFO, `Request: ${config.method} ${config.url}`, {
			requestId: config.requestId,
			userId: config.userId,
			sessionId: config.sessionId,
			headers: this.sanitizeHeaders(config.headers),
			body: this.sanitizeBody(config.body),
		});

		return config;
	}

	// Default request error handling interceptor
	private async handleRequestError(
		error: Error,
		config: RequestConfig,
	): Promise<never> {
		// Update performance metrics
		const metrics = this.performanceMetrics.find(
			(m) => m.requestId === config.requestId,
		);
		if (metrics) {
			metrics.endTime = performance.now();
			metrics.duration = metrics.endTime - metrics.startTime;
			metrics.success = false;
			metrics.error = error.message;
		}

		// Log error
		this.log(LogLevel.ERROR, `Request Error: ${error.message}`, {
			requestId: config.requestId,
			userId: config.userId,
			sessionId: config.sessionId,
			url: config.url,
			method: config.method,
		});

		// Report to error handler
		await errorHandler.handleNetworkError(
			error,
			config.url,
			config.method,
			config.userId,
			config.sessionId,
		);

		throw error;
	}

	// Default response logging interceptor
	private async logResponse<T>(
		response: ApiResponse<T>,
		config: RequestConfig,
	): Promise<ApiResponse<T>> {
		const endTime = performance.now();

		// Update performance metrics
		const metrics = this.performanceMetrics.find(
			(m) => m.requestId === config.requestId,
		);
		if (metrics) {
			metrics.endTime = endTime;
			metrics.duration = endTime - metrics.startTime;
			metrics.success = response.success;
			metrics.status = response.status;
		}

		// Log response
		this.log(
			LogLevel.INFO,
			`Response: ${config.method} ${config.url} - ${response.status}`,
			{
				requestId: config.requestId,
				userId: config.userId,
				sessionId: config.sessionId,
				status: response.status,
				success: response.success,
				duration: metrics?.duration,
			},
		);

		return response;
	}

	// Default response error handling interceptor
	private async handleResponseError(
		error: ApiError,
		config: RequestConfig,
	): Promise<never> {
		// Update performance metrics
		const metrics = this.performanceMetrics.find(
			(m) => m.requestId === config.requestId,
		);
		if (metrics) {
			metrics.endTime = performance.now();
			metrics.duration = metrics.endTime - metrics.startTime;
			metrics.success = false;
			metrics.status = error.status;
			metrics.error = error.message;
		}

		// Log error
		this.log(LogLevel.ERROR, `Response Error: ${error.message}`, {
			requestId: config.requestId,
			userId: config.userId,
			sessionId: config.sessionId,
			url: config.url,
			method: config.method,
			status: error.status,
			code: error.code,
		});

		// Report to error handler
		await errorHandler.handleError(error, {
			endpoint: config.url,
			method: config.method,
			userId: config.userId,
			sessionId: config.sessionId,
		});

		throw error;
	}

	// Logging utility
	private log(
		level: LogLevel,
		message: string,
		metadata?: Record<string, any>,
	): void {
		if (!this.isLoggingEnabled) return;

		const logEntry: LogEntry = {
			level,
			message,
			timestamp: new Date().toISOString(),
			requestId: metadata?.requestId,
			userId: metadata?.userId,
			sessionId: metadata?.sessionId,
			metadata,
		};

		this.logEntries.push(logEntry);

		// Keep only last 1000 log entries
		if (this.logEntries.length > 1000) {
			this.logEntries = this.logEntries.slice(-1000);
		}

		// Console logging based on level
		switch (level) {
			case LogLevel.DEBUG:
				if (ENV.ENABLE_DEBUG_MODE) {
					console.debug(`[DEBUG] ${message}`, metadata);
				}
				break;
			case LogLevel.INFO:
				console.info(`[INFO] ${message}`, metadata);
				break;
			case LogLevel.WARN:
				console.warn(`[WARN] ${message}`, metadata);
				break;
			case LogLevel.ERROR:
				console.error(`[ERROR] ${message}`, metadata);
				break;
		}
	}

	// Sanitize headers for logging (remove sensitive data)
	private sanitizeHeaders(
		headers: Record<string, string>,
	): Record<string, string> {
		const sanitized = { ...headers };
		const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];

		// Create a case-insensitive map of headers
		const headerMap = new Map<string, string>();
		Object.entries(sanitized).forEach(([key, _value]) => {
			headerMap.set(key.toLowerCase(), key);
		});

		sensitiveHeaders.forEach((header) => {
			const headerKey = headerMap.get(header.toLowerCase());
			if (headerKey) {
				sanitized[headerKey] = "[REDACTED]";
			}
		});

		return sanitized;
	}

	// Sanitize body for logging (remove sensitive data)
	private sanitizeBody(body: any): any {
		if (!body) return body;

		const sensitiveFields = ["password", "token", "secret", "key"];
		const sanitized = JSON.parse(JSON.stringify(body));

		const sanitizeObject = (obj: any): any => {
			if (typeof obj !== "object" || obj === null) return obj;

			if (Array.isArray(obj)) {
				return obj.map(sanitizeObject);
			}

			const result: any = {};
			for (const [key, value] of Object.entries(obj)) {
				if (
					sensitiveFields.some((field) => key.toLowerCase().includes(field))
				) {
					result[key] = "[REDACTED]";
				} else {
					result[key] = sanitizeObject(value);
				}
			}

			return result;
		};

		return sanitizeObject(sanitized);
	}

	// Get performance metrics
	public getPerformanceMetrics(): PerformanceMetrics[] {
		return [...this.performanceMetrics];
	}

	// Get log entries
	public getLogEntries(): LogEntry[] {
		return [...this.logEntries];
	}

	// Clear performance metrics
	public clearPerformanceMetrics(): void {
		this.performanceMetrics = [];
	}

	// Clear log entries
	public clearLogEntries(): void {
		this.logEntries = [];
	}

	// Enable/disable logging
	public setLoggingEnabled(enabled: boolean): void {
		this.isLoggingEnabled = enabled;
	}

	// Enable/disable monitoring
	public setMonitoringEnabled(enabled: boolean): void {
		this.isMonitoringEnabled = enabled;
	}

	// Get performance statistics
	public getPerformanceStats(): {
		totalRequests: number;
		averageResponseTime: number;
		successRate: number;
		errorRate: number;
		requestsByMethod: Record<string, number>;
		requestsByStatus: Record<number, number>;
	} {
		const totalRequests = this.performanceMetrics.length;
		const successfulRequests = this.performanceMetrics.filter(
			(m) => m.success,
		).length;
		const totalDuration = this.performanceMetrics
			.filter((m) => m.duration !== undefined)
			.reduce((sum, m) => sum + (m.duration || 0), 0);
		const completedRequests = this.performanceMetrics.filter(
			(m) => m.duration !== undefined,
		).length;

		const requestsByMethod: Record<string, number> = {};
		const requestsByStatus: Record<number, number> = {};

		this.performanceMetrics.forEach((metric) => {
			requestsByMethod[metric.method] =
				(requestsByMethod[metric.method] || 0) + 1;
			if (metric.status) {
				requestsByStatus[metric.status] =
					(requestsByStatus[metric.status] || 0) + 1;
			}
		});

		return {
			totalRequests,
			averageResponseTime:
				completedRequests > 0 ? totalDuration / completedRequests : 0,
			successRate:
				totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
			errorRate:
				totalRequests > 0
					? ((totalRequests - successfulRequests) / totalRequests) * 100
					: 0,
			requestsByMethod,
			requestsByStatus,
		};
	}

	// Create request configuration
	public createRequestConfig(
		url: string,
		method: string,
		headers: Record<string, string> = {},
		body?: any,
		timeout?: number,
		retries?: number,
	): RequestConfig {
		const currentUser = supabaseAuthManager.getCurrentUser();
		const session = supabaseAuthManager.getState().session;
		// Create session data compatible with old structure
		const sessionData = session
			? {
					accessToken: session.access_token,
					refreshToken: session.refresh_token,
					expiresAt:
						session.expires_at ||
						Date.now() + (session.expires_in || 3600) * 1000,
					lastActivity: new Date().toISOString(), // Use current time as last activity
				}
			: null;

		return {
			url,
			method,
			headers,
			body,
			timeout,
			retries,
			userId: currentUser?.id || "anonymous",
			sessionId: sessionData?.lastActivity
				? new Date(sessionData.lastActivity).getTime().toString()
				: "no-session",
			requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			timestamp: new Date().toISOString(),
		};
	}
}

// Create singleton instance
export const interceptorManager = new InterceptorManager();

// Export the class for testing
export { InterceptorManager };

// Export default instance
export default interceptorManager;

// Utility functions
export const addRequestInterceptor = (
	interceptor: RequestInterceptor,
): void => {
	interceptorManager.addRequestInterceptor(interceptor);
};

export const addResponseInterceptor = (
	interceptor: ResponseInterceptor,
): void => {
	interceptorManager.addResponseInterceptor(interceptor);
};

export const removeRequestInterceptor = (
	interceptor: RequestInterceptor,
): void => {
	interceptorManager.removeRequestInterceptor(interceptor);
};

export const removeResponseInterceptor = (
	interceptor: ResponseInterceptor,
): void => {
	interceptorManager.removeResponseInterceptor(interceptor);
};

export const getPerformanceMetrics = (): PerformanceMetrics[] => {
	return interceptorManager.getPerformanceMetrics();
};

export const getLogEntries = (): LogEntry[] => {
	return interceptorManager.getLogEntries();
};

export const getPerformanceStats = () => {
	return interceptorManager.getPerformanceStats();
};

export const clearPerformanceMetrics = (): void => {
	interceptorManager.clearPerformanceMetrics();
};

export const clearLogEntries = (): void => {
	interceptorManager.clearLogEntries();
};
