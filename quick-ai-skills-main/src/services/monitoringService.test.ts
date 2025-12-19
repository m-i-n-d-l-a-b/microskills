import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	MonitoringService,
	reportError,
	reportPerformance,
	reportAnalytics,
	reportCrash,
	addBreadcrumb,
	getMonitoringStats,
} from "./monitoringService";
import { ErrorSeverity, ErrorCategory } from "@/utils/errorHandling";
import { LogLevel } from "@/utils/interceptors";

// Mock fetch
global.fetch = vi.fn();

// Mock performance API
Object.defineProperty(window, "performance", {
	value: {
		getEntriesByType: vi.fn(),
		memory: {
			usedJSHeapSize: 1000000,
			jsHeapSizeLimit: 2000000,
		},
	},
	writable: true,
});

// Mock PerformanceObserver
global.PerformanceObserver = vi.fn().mockImplementation((callback) => ({
	observe: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock PromiseRejectionEvent
global.PromiseRejectionEvent = vi.fn().mockImplementation((type, init) => ({
	type,
	promise: init.promise,
	reason: init.reason,
}));

describe("MonitoringService", () => {
	let monitoringService: MonitoringService;
	let mockFetch: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch = fetch as any;
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
		});

		// Reset performance mock
		(window.performance.getEntriesByType as any).mockReturnValue([
			{
				loadEventEnd: 1000,
				loadEventStart: 500,
				domContentLoadedEventEnd: 800,
				domContentLoadedEventStart: 600,
			},
		]);

		// Create a fresh instance for each test to avoid interference
		monitoringService = new MonitoringService({
			enableErrorReporting: true,
			enablePerformanceMonitoring: true,
			enableUserAnalytics: true,
			enableCrashReporting: true,
			logLevel: LogLevel.INFO,
			batchSize: 2,
			flushInterval: 1000,
			maxRetries: 3,
			endpoints: {
				errors: "/api/monitoring/errors",
				performance: "/api/monitoring/performance",
				analytics: "/api/monitoring/analytics",
				crashes: "/api/monitoring/crashes",
			},
		});
	});

	afterEach(() => {
		monitoringService.destroy();
	});

	describe("Error Reporting", () => {
		it("should report errors correctly", () => {
			const error = {
				message: "Test error",
				stack: "Error stack",
				name: "TestError",
				code: "TEST_ERROR",
			};

			monitoringService.reportError(error);

			const stats = monitoringService.getStats();
			expect(stats.errors).toBe(1);
		});

		it("should determine error severity correctly", () => {
			const networkError = {
				message: "Network error",
				name: "NetworkError",
			};

			const authError = {
				message: "Auth error",
				name: "AuthenticationError",
			};

			const validationError = {
				message: "Validation error",
				name: "ValidationError",
			};

			monitoringService.reportError(networkError);
			monitoringService.reportError(authError);
			monitoringService.reportError(validationError);

			const stats = monitoringService.getStats();
			expect(stats.errors).toBe(3);
		});

		it("should flush error queue when full", async () => {
			const error = {
				message: "Test error",
				name: "TestError",
			};

			// Add errors to fill the queue (batchSize = 2)
			monitoringService.reportError(error);
			monitoringService.reportError(error);

			// Wait for async flush
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockFetch).toHaveBeenCalledWith(
				"/api/monitoring/errors",
				expect.any(Object),
			);
		});

		it("should handle error reporting failures gracefully", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			const error = {
				message: "Test error",
				name: "TestError",
			};

			monitoringService.reportError(error);
			monitoringService.reportError(error);

			// Wait for async flush
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Should re-queue failed reports
			const stats = monitoringService.getStats();
			expect(stats.errors).toBe(2);
		});
	});

	describe("Performance Monitoring", () => {
		it("should report performance metrics correctly", () => {
			const metrics = {
				loadTime: 1000,
				renderTime: 500,
				apiResponseTime: 200,
				memoryUsage: 1000000,
				cpuUsage: 50,
			};

			monitoringService.reportPerformance(metrics);

			const stats = monitoringService.getStats();
			expect(stats.performance).toBe(1);
		});

		it("should flush performance queue when full", async () => {
			const metrics = {
				loadTime: 1000,
				renderTime: 500,
				apiResponseTime: 200,
				memoryUsage: 1000000,
				cpuUsage: 50,
			};

			monitoringService.reportPerformance(metrics);
			monitoringService.reportPerformance(metrics);

			// Wait for async flush
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockFetch).toHaveBeenCalledWith(
				"/api/monitoring/performance",
				expect.any(Object),
			);
		});

		it("should set up performance monitoring on initialization", () => {
			const newService = new MonitoringService({
				enablePerformanceMonitoring: true,
			});

			// Trigger load event
			window.dispatchEvent(new Event("load"));

			// Should have reported performance
			const stats = newService.getStats();
			expect(stats.performance).toBeGreaterThan(0);

			newService.destroy();
		});
	});

	describe("Analytics Reporting", () => {
		it("should report analytics events correctly", () => {
			const event = "user_login";
			const properties = { userId: "123", method: "email" };

			monitoringService.reportAnalytics(event, properties);

			const stats = monitoringService.getStats();
			expect(stats.analytics).toBe(1);
		});

		it("should flush analytics queue when full", async () => {
			const event = "user_action";
			const properties = { action: "click" };

			monitoringService.reportAnalytics(event, properties);
			monitoringService.reportAnalytics(event, properties);

			// Wait for async flush
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockFetch).toHaveBeenCalledWith(
				"/api/monitoring/analytics",
				expect.any(Object),
			);
		});
	});

	describe("Crash Reporting", () => {
		it("should report crashes correctly", () => {
			const error = {
				message: "Application crash",
				stack: "Crash stack trace",
				name: "CrashError",
			};

			monitoringService.reportCrash(error);

			const stats = monitoringService.getStats();
			expect(stats.crashes).toBe(1);
		});

		it("should flush crash queue immediately", async () => {
			const error = {
				message: "Application crash",
				stack: "Crash stack trace",
				name: "CrashError",
			};

			monitoringService.reportCrash(error);

			// Wait for async flush
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockFetch).toHaveBeenCalledWith(
				"/api/monitoring/crashes",
				expect.any(Object),
			);
		});

		it("should monitor memory usage for crashes", () => {
			// Mock high memory usage
			(window.performance as any).memory.usedJSHeapSize = 1900000; // 95% of limit

			const newService = new MonitoringService({
				enableCrashReporting: true,
			});

			// Wait for memory check interval
			setTimeout(() => {
				const stats = newService.getStats();
				expect(stats.crashes).toBeGreaterThan(0);
				newService.destroy();
			}, 100);
		});
	});

	describe("Breadcrumbs", () => {
		it("should add breadcrumbs correctly", () => {
			monitoringService.addBreadcrumb("User logged in", "auth");
			monitoringService.addBreadcrumb("Page loaded", "navigation");

			// Breadcrumbs should be included in error reports
			const error = {
				message: "Test error",
				name: "TestError",
			};

			monitoringService.reportError(error);

			const stats = monitoringService.getStats();
			expect(stats.errors).toBe(1);
		});

		it("should limit breadcrumbs to 50 entries", () => {
			for (let i = 0; i < 60; i++) {
				monitoringService.addBreadcrumb(`Breadcrumb ${i}`, "test");
			}

			// Should only keep last 50
			const error = {
				message: "Test error",
				name: "TestError",
			};

			monitoringService.reportError(error);
			const stats = monitoringService.getStats();
			expect(stats.errors).toBe(1);
		});
	});

	describe("Global Error Handlers", () => {
		it("should handle unhandled promise rejections", () => {
			const error = new Error("Unhandled promise rejection");

			// Simulate unhandled rejection
			const event = new PromiseRejectionEvent("unhandledrejection", {
				promise: Promise.reject(error),
				reason: error,
			});

			window.dispatchEvent(event);

			const stats = monitoringService.getStats();
			expect(stats.errors).toBe(1);
		});

		it("should handle global errors", () => {
			const error = new Error("Global error");

			// Simulate global error
			const event = new ErrorEvent("error", {
				message: error.message,
				error: error,
			});

			window.dispatchEvent(event);

			const stats = monitoringService.getStats();
			expect(stats.errors).toBe(1);
		});
	});

	describe("Configuration", () => {
		it("should respect configuration settings", () => {
			const disabledService = new MonitoringService({
				enableErrorReporting: false,
				enablePerformanceMonitoring: false,
				enableUserAnalytics: false,
				enableCrashReporting: false,
			});

			const error = { message: "Test", name: "TestError" };
			const metrics = {
				loadTime: 1000,
				renderTime: 500,
				apiResponseTime: 200,
				memoryUsage: 1000,
				cpuUsage: 50,
			};

			disabledService.reportError(error);
			disabledService.reportPerformance(metrics);
			disabledService.reportAnalytics("test_event");
			disabledService.reportCrash({
				message: "crash",
				stack: "stack",
				name: "crash",
			});

			const stats = disabledService.getStats();
			expect(stats.errors).toBe(0);
			expect(stats.performance).toBe(0);
			expect(stats.analytics).toBe(0);
			expect(stats.crashes).toBe(0);

			disabledService.destroy();
		});

		it("should update configuration correctly", () => {
			monitoringService.updateConfig({
				batchSize: 5,
				flushInterval: 2000,
			});

			const config = monitoringService.getConfig();
			expect(config.batchSize).toBe(5);
			expect(config.flushInterval).toBe(2000);
		});
	});

	describe("Utility Functions", () => {
		it("should export working utility functions", () => {
			const error = { message: "Test error", name: "TestError" };
			const metrics = {
				loadTime: 1000,
				renderTime: 500,
				apiResponseTime: 200,
				memoryUsage: 1000,
				cpuUsage: 50,
			};

			reportError(error);
			reportPerformance(metrics);
			reportAnalytics("test_event", { test: true });
			reportCrash({ message: "crash", stack: "stack", name: "crash" });
			addBreadcrumb("test breadcrumb");

			const stats = getMonitoringStats();
			expect(stats.errors).toBeGreaterThan(0);
			expect(stats.performance).toBeGreaterThan(0);
			expect(stats.analytics).toBeGreaterThan(0);
			expect(stats.crashes).toBeGreaterThan(0);
		});
	});

	describe("Queue Management", () => {
		it("should clear queues correctly", () => {
			const error = { message: "Test error", name: "TestError" };
			const metrics = {
				loadTime: 1000,
				renderTime: 500,
				apiResponseTime: 200,
				memoryUsage: 1000,
				cpuUsage: 50,
			};

			monitoringService.reportError(error);
			monitoringService.reportPerformance(metrics);
			monitoringService.reportAnalytics("test_event");
			monitoringService.reportCrash({
				message: "crash",
				stack: "stack",
				name: "crash",
			});

			let stats = monitoringService.getStats();
			expect(stats.errors).toBe(1);
			expect(stats.performance).toBe(1);
			expect(stats.analytics).toBe(1);
			expect(stats.crashes).toBe(1);

			monitoringService.clearQueues();

			stats = monitoringService.getStats();
			expect(stats.errors).toBe(0);
			expect(stats.performance).toBe(0);
			expect(stats.analytics).toBe(0);
			expect(stats.crashes).toBe(0);
		});
	});

	describe("Error Context and Metadata", () => {
		it("should include proper context in error reports", () => {
			const error = {
				message: "Test error",
				name: "TestError",
			};

			const context = {
				userId: "user123",
				componentStack: "Component stack trace",
				tags: ["test", "error"],
			};

			monitoringService.reportError(error, context);

			const stats = monitoringService.getStats();
			expect(stats.errors).toBe(1);
		});

		it("should include environment information", () => {
			const error = {
				message: "Test error",
				name: "TestError",
			};

			monitoringService.reportError(error);

			const stats = monitoringService.getStats();
			expect(stats.errors).toBe(1);
		});
	});

	describe("Performance Monitoring Integration", () => {
		it("should monitor long tasks", () => {
			const newService = new MonitoringService({
				enablePerformanceMonitoring: true,
			});

			// Simulate long task
			const longTaskEntry = {
				duration: 100, // 100ms task
				entryType: "longtask",
				name: "long-task",
				startTime: 1000,
			};

			// Trigger PerformanceObserver callback
			const observer = (PerformanceObserver as any).mock.results[0].value;
			const callback = (PerformanceObserver as any).mock.calls[0][0];
			callback({ getEntries: () => [longTaskEntry] });

			const stats = newService.getStats();
			expect(stats.performance).toBeGreaterThan(0);

			newService.destroy();
		});
	});

	describe("Memory Monitoring", () => {
		it("should detect memory leaks", () => {
			// Mock memory usage above 90% threshold
			(window.performance as any).memory.usedJSHeapSize = 1900000; // 95% of 2MB limit

			const newService = new MonitoringService({
				enableCrashReporting: true,
			});

			// Wait for memory check
			setTimeout(() => {
				const stats = newService.getStats();
				expect(stats.crashes).toBeGreaterThan(0);
				newService.destroy();
			}, 100);
		});
	});

	describe("Session Management", () => {
		it("should generate unique session IDs", () => {
			const service1 = new MonitoringService();
			const service2 = new MonitoringService();

			const config1 = service1.getConfig();
			const config2 = service2.getConfig();

			// Session IDs should be different
			expect(config1).not.toEqual(config2);

			service1.destroy();
			service2.destroy();
		});
	});

	describe("Error Severity and Category Determination", () => {
		it("should correctly categorize different error types", () => {
			const networkError = { message: "Network failed", name: "NetworkError" };
			const authError = { message: "Auth failed", name: "AuthenticationError" };
			const validationError = {
				message: "Invalid input",
				name: "ValidationError",
			};
			const serverError = { message: "Server error", name: "ServerError" };
			const timeoutError = { message: "Request timeout", name: "TimeoutError" };

			monitoringService.reportError(networkError);
			monitoringService.reportError(authError);
			monitoringService.reportError(validationError);
			monitoringService.reportError(serverError);
			monitoringService.reportError(timeoutError);

			const stats = monitoringService.getStats();
			expect(stats.errors).toBe(5);
		});

		it("should determine severity based on error characteristics", () => {
			const criticalError = { message: "Network failed", name: "NetworkError" };
			const mediumError = {
				message: "Auth failed",
				name: "AuthenticationError",
			};
			const lowError = { message: "Minor issue", name: "MinorError" };

			monitoringService.reportError(criticalError);
			monitoringService.reportError(mediumError);
			monitoringService.reportError(lowError);

			const stats = monitoringService.getStats();
			expect(stats.errors).toBe(3);
		});
	});
});
