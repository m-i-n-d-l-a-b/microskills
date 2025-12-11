import {
	errorHandler,
	ErrorLogEntry,
	ErrorSeverity,
	ErrorCategory,
} from "@/utils/errorHandling";
import {
	interceptorManager,
	PerformanceMetrics,
	LogLevel,
	LogEntry,
} from "@/utils/interceptors";
import { ENV } from "@/lib/constants";

// Monitoring service configuration
export interface MonitoringConfig {
	enableErrorReporting: boolean;
	enablePerformanceMonitoring: boolean;
	enableUserAnalytics: boolean;
	enableCrashReporting: boolean;
	logLevel: LogLevel;
	batchSize: number;
	flushInterval: number;
	maxRetries: number;
	endpoints: {
		errors: string;
		performance: string;
		analytics: string;
		crashes: string;
	};
}

// Error reporting payload
export interface ErrorReport {
	id: string;
	error: {
		message: string;
		stack?: string;
		name: string;
		code?: string;
	};
	context: {
		url: string;
		userAgent: string;
		timestamp: string;
		userId?: string;
		sessionId?: string;
		requestId?: string;
		componentStack?: string;
	};
	metadata: {
		severity: ErrorSeverity;
		category: ErrorCategory;
		tags: string[];
		breadcrumbs: string[];
	};
	environment: {
		version: string;
		environment: string;
		build: string;
	};
}

// Performance monitoring payload
export interface PerformanceReport {
	id: string;
	metrics: {
		loadTime: number;
		renderTime: number;
		apiResponseTime: number;
		memoryUsage: number;
		cpuUsage: number;
	};
	context: {
		url: string;
		timestamp: string;
		userId?: string;
		sessionId?: string;
	};
	environment: {
		version: string;
		environment: string;
	};
}

// User analytics payload
export interface AnalyticsReport {
	id: string;
	event: string;
	properties: Record<string, any>;
	context: {
		url: string;
		timestamp: string;
		userId?: string;
		sessionId?: string;
	};
	environment: {
		version: string;
		environment: string;
	};
}

// Crash reporting payload
export interface CrashReport {
	id: string;
	error: {
		message: string;
		stack: string;
		name: string;
	};
	context: {
		url: string;
		userAgent: string;
		timestamp: string;
		userId?: string;
		sessionId?: string;
		componentStack?: string;
	};
	state: {
		reduxState?: any;
		componentState?: any;
		routeState?: any;
	};
	environment: {
		version: string;
		environment: string;
		build: string;
	};
}

// Monitoring service class
export class MonitoringService {
	private config: MonitoringConfig;
	private errorQueue: ErrorReport[] = [];
	private performanceQueue: PerformanceReport[] = [];
	private analyticsQueue: AnalyticsReport[] = [];
	private crashQueue: CrashReport[] = [];
	private flushTimer?: NodeJS.Timeout;
	private isInitialized = false;
	private breadcrumbs: string[] = [];
	private sessionId: string;

	constructor(config: Partial<MonitoringConfig> = {}) {
		this.config = {
			enableErrorReporting: true,
			enablePerformanceMonitoring: true,
			enableUserAnalytics: true,
			enableCrashReporting: true,
			logLevel: LogLevel.INFO,
			batchSize: 10,
			flushInterval: 5000, // 5 seconds
			maxRetries: 3,
			endpoints: {
				errors: ENV.ERROR_REPORTING_ENDPOINT || "/api/monitoring/errors",
				performance:
					ENV.PERFORMANCE_MONITORING_ENDPOINT || "/api/monitoring/performance",
				analytics: ENV.ANALYTICS_ENDPOINT || "/api/monitoring/analytics",
				crashes: ENV.CRASH_REPORTING_ENDPOINT || "/api/monitoring/crashes",
			},
			...config,
		};

		this.sessionId = this.generateSessionId();
		this.initialize();
	}

	// Initialize monitoring service
	private initialize(): void {
		if (this.isInitialized) return;

		// Set up periodic flushing
		this.flushTimer = setInterval(() => {
			this.flushQueues();
		}, this.config.flushInterval);

		// Set up global error handlers
		this.setupGlobalErrorHandlers();

		// Set up performance monitoring
		if (this.config.enablePerformanceMonitoring) {
			this.setupPerformanceMonitoring();
		}

		// Set up crash reporting
		if (this.config.enableCrashReporting) {
			this.setupCrashReporting();
		}

		this.isInitialized = true;
	}

	// Generate unique session ID
	private generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	// Set up global error handlers
	private setupGlobalErrorHandlers(): void {
		// Handle unhandled promise rejections
		window.addEventListener("unhandledrejection", (event) => {
			this.reportError({
				message: event.reason?.message || "Unhandled Promise Rejection",
				stack: event.reason?.stack,
				name: "UnhandledPromiseRejection",
				code: "UNHANDLED_REJECTION",
			});
		});

		// Handle global errors
		window.addEventListener("error", (event) => {
			this.reportError({
				message: event.message,
				stack: event.error?.stack,
				name: event.error?.name || "GlobalError",
				code: "GLOBAL_ERROR",
			});
		});
	}

	// Set up performance monitoring
	private setupPerformanceMonitoring(): void {
		// Monitor page load performance
		if ("performance" in window) {
			window.addEventListener("load", () => {
				const navigation = performance.getEntriesByType(
					"navigation",
				)[0] as PerformanceNavigationTiming;
				if (navigation) {
					this.reportPerformance({
						loadTime: navigation.loadEventEnd - navigation.loadEventStart,
						renderTime:
							navigation.domContentLoadedEventEnd -
							navigation.domContentLoadedEventStart,
						apiResponseTime: 0, // Will be updated by interceptors
						memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
						cpuUsage: 0, // Not available in browser
					});
				}
			});
		}

		// Monitor long tasks
		if ("PerformanceObserver" in window) {
			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					if (entry.duration > 50) {
						// Tasks longer than 50ms
						this.reportPerformance({
							loadTime: 0,
							renderTime: entry.duration,
							apiResponseTime: 0,
							memoryUsage: 0,
							cpuUsage: 0,
						});
					}
				}
			});
			observer.observe({ entryTypes: ["longtask"] });
		}
	}

	// Set up crash reporting
	private setupCrashReporting(): void {
		// Monitor for memory leaks
		if ("memory" in performance) {
			setInterval(() => {
				const memory = (performance as any).memory;
				if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
					this.reportCrash({
						message: "Memory usage exceeded 90% of limit",
						stack: "Memory monitoring",
						name: "MemoryLeak",
					});
				}
			}, 30000); // Check every 30 seconds
		}
	}

	// Add breadcrumb for error tracking
	public addBreadcrumb(message: string, category: string = "default"): void {
		this.breadcrumbs.push(`${category}: ${message}`);

		// Keep only last 50 breadcrumbs
		if (this.breadcrumbs.length > 50) {
			this.breadcrumbs = this.breadcrumbs.slice(-50);
		}
	}

	// Report error
	public reportError(
		error: {
			message: string;
			stack?: string;
			name: string;
			code?: string;
		},
		context?: {
			userId?: string;
			componentStack?: string;
			tags?: string[];
		},
	): void {
		if (!this.config.enableErrorReporting) return;

		const errorReport: ErrorReport = {
			id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			error: {
				message: error.message,
				stack: error.stack,
				name: error.name,
				code: error.code,
			},
			context: {
				url: window.location.href,
				userAgent: navigator.userAgent,
				timestamp: new Date().toISOString(),
				userId: context?.userId,
				sessionId: this.sessionId,
				componentStack: context?.componentStack,
			},
			metadata: {
				severity: this.determineSeverity(error),
				category: this.determineCategory(error),
				tags: context?.tags || [],
				breadcrumbs: [...this.breadcrumbs],
			},
			environment: {
				version: ENV.APP_VERSION || "1.0.0",
				environment: ENV.NODE_ENV || "development",
				build: ENV.BUILD_ID || "unknown",
			},
		};

		this.errorQueue.push(errorReport);

		// Flush if queue is full
		if (this.errorQueue.length >= this.config.batchSize) {
			this.flushErrorQueue();
		}
	}

	// Report performance metrics
	public reportPerformance(metrics: {
		loadTime: number;
		renderTime: number;
		apiResponseTime: number;
		memoryUsage: number;
		cpuUsage: number;
	}): void {
		if (!this.config.enablePerformanceMonitoring) return;

		const performanceReport: PerformanceReport = {
			id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			metrics,
			context: {
				url: window.location.href,
				timestamp: new Date().toISOString(),
				sessionId: this.sessionId,
			},
			environment: {
				version: ENV.APP_VERSION || "1.0.0",
				environment: ENV.NODE_ENV || "development",
			},
		};

		this.performanceQueue.push(performanceReport);

		// Flush if queue is full
		if (this.performanceQueue.length >= this.config.batchSize) {
			this.flushPerformanceQueue();
		}
	}

	// Report analytics event
	public reportAnalytics(
		event: string,
		properties: Record<string, any> = {},
	): void {
		if (!this.config.enableUserAnalytics) return;

		const analyticsReport: AnalyticsReport = {
			id: `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			event,
			properties,
			context: {
				url: window.location.href,
				timestamp: new Date().toISOString(),
				sessionId: this.sessionId,
			},
			environment: {
				version: ENV.APP_VERSION || "1.0.0",
				environment: ENV.NODE_ENV || "development",
			},
		};

		this.analyticsQueue.push(analyticsReport);

		// Flush if queue is full
		if (this.analyticsQueue.length >= this.config.batchSize) {
			this.flushAnalyticsQueue();
		}
	}

	// Report crash
	public reportCrash(
		error: {
			message: string;
			stack: string;
			name: string;
		},
		state?: {
			reduxState?: any;
			componentState?: any;
			routeState?: any;
		},
	): void {
		if (!this.config.enableCrashReporting) return;

		const crashReport: CrashReport = {
			id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			error: {
				message: error.message,
				stack: error.stack,
				name: error.name,
			},
			context: {
				url: window.location.href,
				userAgent: navigator.userAgent,
				timestamp: new Date().toISOString(),
				sessionId: this.sessionId,
			},
			state: state || {},
			environment: {
				version: ENV.APP_VERSION || "1.0.0",
				environment: ENV.NODE_ENV || "development",
				build: ENV.BUILD_ID || "unknown",
			},
		};

		this.crashQueue.push(crashReport);

		// Flush immediately for crashes
		this.flushCrashQueue();
	}

	// Determine error severity
	private determineSeverity(error: {
		message: string;
		name: string;
		code?: string;
	}): ErrorSeverity {
		if (error.name === "NetworkError" || error.name === "TimeoutError") {
			return ErrorSeverity.CRITICAL;
		}
		if (
			error.name === "AuthenticationError" ||
			error.name === "AuthorizationError"
		) {
			return ErrorSeverity.MEDIUM;
		}
		if (error.message.includes("memory") || error.message.includes("crash")) {
			return ErrorSeverity.HIGH;
		}
		return ErrorSeverity.LOW;
	}

	// Determine error category
	private determineCategory(error: {
		message: string;
		name: string;
		code?: string;
	}): ErrorCategory {
		if (error.name === "NetworkError") return ErrorCategory.NETWORK;
		if (error.name === "AuthenticationError")
			return ErrorCategory.AUTHENTICATION;
		if (error.name === "AuthorizationError") return ErrorCategory.AUTHORIZATION;
		if (error.name === "ValidationError") return ErrorCategory.VALIDATION;
		if (error.name === "ServerError") return ErrorCategory.SERVER;
		if (error.name === "TimeoutError") return ErrorCategory.TIMEOUT;
		return ErrorCategory.UNKNOWN;
	}

	// Flush all queues
	private async flushQueues(): Promise<void> {
		await Promise.all([
			this.flushErrorQueue(),
			this.flushPerformanceQueue(),
			this.flushAnalyticsQueue(),
			this.flushCrashQueue(),
		]);
	}

	// Flush error queue
	private async flushErrorQueue(): Promise<void> {
		if (this.errorQueue.length === 0) return;

		const errors = [...this.errorQueue];
		this.errorQueue = [];

		try {
			await this.sendToEndpoint(this.config.endpoints.errors, errors);
		} catch (error) {
			console.warn("Failed to send error reports:", error);
			// Re-queue failed reports
			this.errorQueue.unshift(...errors);
		}
	}

	// Flush performance queue
	private async flushPerformanceQueue(): Promise<void> {
		if (this.performanceQueue.length === 0) return;

		const performance = [...this.performanceQueue];
		this.performanceQueue = [];

		try {
			await this.sendToEndpoint(this.config.endpoints.performance, performance);
		} catch (error) {
			console.warn("Failed to send performance reports:", error);
			// Re-queue failed reports
			this.performanceQueue.unshift(...performance);
		}
	}

	// Flush analytics queue
	private async flushAnalyticsQueue(): Promise<void> {
		if (this.analyticsQueue.length === 0) return;

		const analytics = [...this.analyticsQueue];
		this.analyticsQueue = [];

		try {
			await this.sendToEndpoint(this.config.endpoints.analytics, analytics);
		} catch (error) {
			console.warn("Failed to send analytics reports:", error);
			// Re-queue failed reports
			this.analyticsQueue.unshift(...analytics);
		}
	}

	// Flush crash queue
	private async flushCrashQueue(): Promise<void> {
		if (this.crashQueue.length === 0) return;

		const crashes = [...this.crashQueue];
		this.crashQueue = [];

		try {
			await this.sendToEndpoint(this.config.endpoints.crashes, crashes);
		} catch (error) {
			console.warn("Failed to send crash reports:", error);
			// Re-queue failed reports
			this.crashQueue.unshift(...crashes);
		}
	}

	// Send data to endpoint
	private async sendToEndpoint(endpoint: string, data: any[]): Promise<void> {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Monitoring-Version": ENV.APP_VERSION || "1.0.0",
			},
			body: JSON.stringify({
				timestamp: new Date().toISOString(),
				sessionId: this.sessionId,
				data,
			}),
		});

		if (!response.ok) {
			throw new Error(`Failed to send monitoring data: ${response.status}`);
		}
	}

	// Get monitoring statistics
	public getStats(): {
		errors: number;
		performance: number;
		analytics: number;
		crashes: number;
		queueSizes: {
			errors: number;
			performance: number;
			analytics: number;
			crashes: number;
		};
	} {
		return {
			errors: this.errorQueue.length,
			performance: this.performanceQueue.length,
			analytics: this.analyticsQueue.length,
			crashes: this.crashQueue.length,
			queueSizes: {
				errors: this.errorQueue.length,
				performance: this.performanceQueue.length,
				analytics: this.analyticsQueue.length,
				crashes: this.crashQueue.length,
			},
		};
	}

	// Clear all queues
	public clearQueues(): void {
		this.errorQueue = [];
		this.performanceQueue = [];
		this.analyticsQueue = [];
		this.crashQueue = [];
	}

	// Update configuration
	public updateConfig(updates: Partial<MonitoringConfig>): void {
		this.config = { ...this.config, ...updates };
	}

	// Get configuration
	public getConfig(): MonitoringConfig {
		return { ...this.config };
	}

	// Destroy monitoring service
	public destroy(): void {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
		}
		this.flushQueues();
		this.isInitialized = false;
	}
}

// Create singleton instance
export const monitoringService = new MonitoringService();

// Export default instance
export default monitoringService;

// Utility functions
export const reportError = (
	error: {
		message: string;
		stack?: string;
		name: string;
		code?: string;
	},
	context?: {
		userId?: string;
		componentStack?: string;
		tags?: string[];
	},
): void => monitoringService.reportError(error, context);

export const reportPerformance = (metrics: {
	loadTime: number;
	renderTime: number;
	apiResponseTime: number;
	memoryUsage: number;
	cpuUsage: number;
}): void => monitoringService.reportPerformance(metrics);

export const reportAnalytics = (
	event: string,
	properties: Record<string, any> = {},
): void => monitoringService.reportAnalytics(event, properties);

export const reportCrash = (
	error: {
		message: string;
		stack: string;
		name: string;
	},
	state?: {
		reduxState?: any;
		componentState?: any;
		routeState?: any;
	},
): void => monitoringService.reportCrash(error, state);

export const addBreadcrumb = (message: string, category?: string): void =>
	monitoringService.addBreadcrumb(message, category);

export const getMonitoringStats = () => monitoringService.getStats();
export const clearMonitoringQueues = (): void =>
	monitoringService.clearQueues();
export const destroyMonitoring = (): void => monitoringService.destroy();
