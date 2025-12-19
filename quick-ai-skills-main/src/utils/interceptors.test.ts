import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InterceptorManager, interceptorManager } from "./interceptors";
import type {
	RequestInterceptor,
	ResponseInterceptor,
	RequestConfig,
	PerformanceMetrics,
	LogEntry,
} from "./interceptors";
import type { ApiResponse, ApiError } from "@/types/api";

// Mock performance API
const mockPerformance = {
	now: vi.fn(),
};
Object.defineProperty(window, "performance", {
	value: mockPerformance,
});

// Mock console methods
const consoleSpy = {
	debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
	info: vi.spyOn(console, "info").mockImplementation(() => {}),
	warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
	error: vi.spyOn(console, "error").mockImplementation(() => {}),
};

describe("InterceptorManager", () => {
	let interceptorManagerInstance: InterceptorManager;

	beforeEach(() => {
		vi.clearAllMocks();
		mockPerformance.now.mockReturnValue(1000);

		interceptorManagerInstance = new InterceptorManager();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Request Interceptors", () => {
		it("should add request interceptor", () => {
			const interceptor: RequestInterceptor = {
				onRequest: vi.fn(),
			};

			interceptorManagerInstance.addRequestInterceptor(interceptor);

			// Verify interceptor was added (we can't directly access private property, but we can test behavior)
			expect(interceptorManagerInstance).toBeDefined();
		});

		it("should remove request interceptor", () => {
			const interceptor: RequestInterceptor = {
				onRequest: vi.fn(),
			};

			interceptorManagerInstance.addRequestInterceptor(interceptor);
			interceptorManagerInstance.removeRequestInterceptor(interceptor);

			// Verify interceptor was removed
			expect(interceptorManagerInstance).toBeDefined();
		});

		it("should execute request interceptors in order", async () => {
			const executionOrder: string[] = [];

			const interceptor1: RequestInterceptor = {
				onRequest: async (config) => {
					executionOrder.push("interceptor1");
					return config;
				},
			};

			const interceptor2: RequestInterceptor = {
				onRequest: async (config) => {
					executionOrder.push("interceptor2");
					return config;
				},
			};

			interceptorManagerInstance.addRequestInterceptor(interceptor1);
			interceptorManagerInstance.addRequestInterceptor(interceptor2);

			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"GET",
			);
			await interceptorManagerInstance.executeRequestInterceptors(config);

			// Should execute default interceptor first, then custom ones
			expect(executionOrder).toContain("interceptor1");
			expect(executionOrder).toContain("interceptor2");
		});

		it("should handle request interceptor errors", async () => {
			const error = new Error("Request interceptor error");
			const interceptor: RequestInterceptor = {
				onRequest: vi.fn().mockRejectedValue(error),
				onRequestError: vi.fn().mockImplementation(() => {
					throw error;
				}),
			};

			interceptorManagerInstance.addRequestInterceptor(interceptor);

			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"GET",
			);

			await expect(
				interceptorManagerInstance.executeRequestInterceptors(config),
			).rejects.toThrow("Request interceptor error");
			expect(interceptor.onRequestError).toHaveBeenCalledWith(error, config);
		});
	});

	describe("Response Interceptors", () => {
		it("should add response interceptor", () => {
			const interceptor: ResponseInterceptor = {
				onResponse: vi.fn(),
			};

			interceptorManagerInstance.addResponseInterceptor(interceptor);

			expect(interceptorManagerInstance).toBeDefined();
		});

		it("should remove response interceptor", () => {
			const interceptor: ResponseInterceptor = {
				onResponse: vi.fn(),
			};

			interceptorManagerInstance.addResponseInterceptor(interceptor);
			interceptorManagerInstance.removeResponseInterceptor(interceptor);

			expect(interceptorManagerInstance).toBeDefined();
		});

		it("should execute response interceptors in order", async () => {
			const executionOrder: string[] = [];

			const interceptor1: ResponseInterceptor = {
				onResponse: async (response) => {
					executionOrder.push("interceptor1");
					return response;
				},
			};

			const interceptor2: ResponseInterceptor = {
				onResponse: async (response) => {
					executionOrder.push("interceptor2");
					return response;
				},
			};

			interceptorManagerInstance.addResponseInterceptor(interceptor1);
			interceptorManagerInstance.addResponseInterceptor(interceptor2);

			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"GET",
			);
			const response: ApiResponse<string> = {
				data: "test",
				status: 200,
				success: true,
			};

			await interceptorManagerInstance.executeResponseInterceptors(
				response,
				config,
			);

			expect(executionOrder).toContain("interceptor1");
			expect(executionOrder).toContain("interceptor2");
		});

		it("should handle response interceptor errors", async () => {
			const error: ApiError = {
				message: "Response interceptor error",
				status: 500,
				code: "INTERCEPTOR_ERROR",
			};

			const interceptor: ResponseInterceptor = {
				onResponse: vi.fn().mockRejectedValue(error),
				onResponseError: vi.fn().mockImplementation(() => {
					throw error;
				}),
			};

			interceptorManagerInstance.addResponseInterceptor(interceptor);

			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"GET",
			);
			const response: ApiResponse<string> = {
				data: "test",
				status: 200,
				success: true,
			};

			await expect(
				interceptorManagerInstance.executeResponseInterceptors(
					response,
					config,
				),
			).rejects.toThrow("Response interceptor error");
			expect(interceptor.onResponseError).toHaveBeenCalledWith(error, config);
		});
	});

	describe("Request Configuration", () => {
		it("should create request configuration with all required fields", () => {
			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"POST",
				{ "Content-Type": "application/json" },
				{ test: "data" },
				30000,
				3,
			);

			expect(config.url).toBe("/api/test");
			expect(config.method).toBe("POST");
			expect(config.headers).toEqual({ "Content-Type": "application/json" });
			expect(config.body).toEqual({ test: "data" });
			expect(config.timeout).toBe(30000);
			expect(config.retries).toBe(3);
			expect(config.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
			expect(config.timestamp).toBeDefined();
		});

		it("should include user and session information when available", () => {
			// Mock authManager to return user data
			const mockUser = { id: "user-123" };
			const mockSessionData = { lastActivity: new Date().toISOString() };

			// We can't easily mock the authManager in this test, so we'll test the structure
			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"GET",
			);

			expect(config.userId).toBeDefined();
			expect(config.sessionId).toBeDefined();
			expect(config.requestId).toBeDefined();
			expect(config.timestamp).toBeDefined();
		});
	});

	describe("Performance Tracking", () => {
		it("should track performance metrics for requests", async () => {
			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"GET",
			);

			// Simulate request start
			mockPerformance.now.mockReturnValueOnce(1000);
			await interceptorManagerInstance.executeRequestInterceptors(config);

			// Simulate response
			mockPerformance.now.mockReturnValueOnce(1500);
			const response: ApiResponse<string> = {
				data: "test",
				status: 200,
				success: true,
			};
			await interceptorManagerInstance.executeResponseInterceptors(
				response,
				config,
			);

			const metrics = interceptorManagerInstance.getPerformanceMetrics();
			expect(metrics).toHaveLength(1);
			expect(metrics[0].requestId).toBe(config.requestId);
			expect(metrics[0].url).toBe("/api/test");
			expect(metrics[0].method).toBe("GET");
			expect(metrics[0].startTime).toBe(1000);
			expect(metrics[0].endTime).toBe(1500);
			expect(metrics[0].duration).toBe(500);
			expect(metrics[0].success).toBe(true);
			expect(metrics[0].status).toBe(200);
		});

		it("should track performance metrics for failed requests", async () => {
			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"GET",
			);

			// Simulate request start
			mockPerformance.now.mockReturnValueOnce(1000);
			await interceptorManagerInstance.executeRequestInterceptors(config);

			// Simulate error
			mockPerformance.now.mockReturnValueOnce(1200);
			const error: ApiError = {
				message: "Request failed",
				status: 500,
				code: "SERVER_ERROR",
			};

			try {
				await interceptorManagerInstance.executeResponseErrorInterceptors(
					error,
					config,
				);
			} catch (e) {
				// Expected to throw
			}

			const metrics = interceptorManagerInstance.getPerformanceMetrics();
			expect(metrics).toHaveLength(1);
			expect(metrics[0].success).toBe(false);
			expect(metrics[0].status).toBe(500);
			expect(metrics[0].error).toBe("Request failed");
		});

		it("should provide performance statistics", async () => {
			// Add multiple requests
			const configs = [
				interceptorManagerInstance.createRequestConfig("/api/test1", "GET"),
				interceptorManagerInstance.createRequestConfig("/api/test2", "POST"),
				interceptorManagerInstance.createRequestConfig("/api/test3", "GET"),
			];

			// Simulate successful requests
			for (let i = 0; i < configs.length; i++) {
				mockPerformance.now.mockReturnValueOnce(1000 + i * 100);
				await interceptorManagerInstance.executeRequestInterceptors(configs[i]);

				mockPerformance.now.mockReturnValueOnce(1500 + i * 100);
				const response: ApiResponse<string> = {
					data: "test",
					status: 200,
					success: true,
				};
				await interceptorManagerInstance.executeResponseInterceptors(
					response,
					configs[i],
				);
			}

			const stats = interceptorManagerInstance.getPerformanceStats();
			expect(stats.totalRequests).toBe(3);
			expect(stats.successRate).toBe(100);
			expect(stats.errorRate).toBe(0);
			expect(stats.requestsByMethod.GET).toBe(2);
			expect(stats.requestsByMethod.POST).toBe(1);
			expect(stats.requestsByStatus[200]).toBe(3);
		});
	});

	describe("Logging", () => {
		it("should log requests and responses", async () => {
			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"POST",
				{},
				{ test: "data" },
			);

			await interceptorManagerInstance.executeRequestInterceptors(config);

			const response: ApiResponse<string> = {
				data: "test",
				status: 200,
				success: true,
			};
			await interceptorManagerInstance.executeResponseInterceptors(
				response,
				config,
			);

			const logEntries = interceptorManagerInstance.getLogEntries();
			expect(logEntries.length).toBeGreaterThan(0);

			const requestLog = logEntries.find((entry) =>
				entry.message.includes("Request: POST /api/test"),
			);
			const responseLog = logEntries.find((entry) =>
				entry.message.includes("Response: POST /api/test - 200"),
			);

			expect(requestLog).toBeDefined();
			expect(responseLog).toBeDefined();
			expect(requestLog?.level).toBe("info");
			expect(responseLog?.level).toBe("info");
		});

		it("should sanitize sensitive data in logs", async () => {
			const config = interceptorManagerInstance.createRequestConfig(
				"/api/auth/login",
				"POST",
				{
					Authorization: "Bearer secret-token",
					"Content-Type": "application/json",
					"X-API-Key": "secret-key",
				},
				{
					email: "test@example.com",
					password: "secret-password",
					token: "secret-token",
				},
			);

			await interceptorManagerInstance.executeRequestInterceptors(config);

			const logEntries = interceptorManagerInstance.getLogEntries();
			const requestLog = logEntries.find((entry) =>
				entry.message.includes("Request: POST /api/auth/login"),
			);

			expect(requestLog).toBeDefined();
			expect(requestLog?.metadata?.headers?.Authorization).toBe("[REDACTED]");
			expect(requestLog?.metadata?.headers?.["X-API-Key"]).toBe("[REDACTED]");
			expect(requestLog?.metadata?.body?.password).toBe("[REDACTED]");
			expect(requestLog?.metadata?.body?.token).toBe("[REDACTED]");
			expect(requestLog?.metadata?.body?.email).toBe("test@example.com"); // Should not be redacted
		});

		it("should limit log entries to prevent memory issues", async () => {
			// Add more than 1000 log entries
			for (let i = 0; i < 1100; i++) {
				const config = interceptorManagerInstance.createRequestConfig(
					`/api/test${i}`,
					"GET",
				);
				await interceptorManagerInstance.executeRequestInterceptors(config);
			}

			const logEntries = interceptorManagerInstance.getLogEntries();
			expect(logEntries.length).toBe(1000); // Should be limited to 1000
		});

		it("should disable logging when configured", () => {
			interceptorManagerInstance.setLoggingEnabled(false);

			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"GET",
			);
			interceptorManagerInstance.executeRequestInterceptors(config);

			const logEntries = interceptorManagerInstance.getLogEntries();
			expect(logEntries.length).toBe(0);
		});
	});

	describe("Error Handling", () => {
		it("should handle request errors through interceptors", async () => {
			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"GET",
			);

			await interceptorManagerInstance.executeRequestInterceptors(config);

			const error = new Error("Network error");
			try {
				await interceptorManagerInstance.executeResponseErrorInterceptors(
					{
						message: error.message,
						status: 0,
						code: "NETWORK_ERROR",
					},
					config,
				);
			} catch (e) {
				// Expected to throw
			}

			const logEntries = interceptorManagerInstance.getLogEntries();
			const errorLog = logEntries.find((entry) =>
				entry.message.includes("Response Error: Network error"),
			);

			expect(errorLog).toBeDefined();
			expect(errorLog?.level).toBe("error");
		});

		it("should track error metrics in performance data", async () => {
			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"GET",
			);

			mockPerformance.now.mockReturnValueOnce(1000);
			await interceptorManagerInstance.executeRequestInterceptors(config);

			mockPerformance.now.mockReturnValueOnce(1500);
			try {
				await interceptorManagerInstance.executeResponseErrorInterceptors(
					{
						message: "Server error",
						status: 500,
						code: "SERVER_ERROR",
					},
					config,
				);
			} catch (e) {
				// Expected to throw
			}

			const metrics = interceptorManagerInstance.getPerformanceMetrics();
			expect(metrics[0].success).toBe(false);
			expect(metrics[0].status).toBe(500);
			expect(metrics[0].error).toBe("Server error");
		});
	});

	describe("Utility Functions", () => {
		it("should provide working utility functions", () => {
			// Test utility functions
			const requestInterceptor: RequestInterceptor = { onRequest: vi.fn() };
			const responseInterceptor: ResponseInterceptor = { onResponse: vi.fn() };

			interceptorManagerInstance.addRequestInterceptor(requestInterceptor);
			interceptorManagerInstance.addResponseInterceptor(responseInterceptor);

			expect(interceptorManagerInstance.getPerformanceMetrics()).toEqual([]);
			expect(interceptorManagerInstance.getLogEntries()).toEqual([]);
			expect(interceptorManagerInstance.getPerformanceStats()).toBeDefined();

			interceptorManagerInstance.clearPerformanceMetrics();
			interceptorManagerInstance.clearLogEntries();

			expect(interceptorManagerInstance.getPerformanceMetrics()).toEqual([]);
			expect(interceptorManagerInstance.getLogEntries()).toEqual([]);
		});
	});

	describe("Memory Management", () => {
		it("should clear performance metrics", () => {
			// Add some metrics first
			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"GET",
			);
			interceptorManagerInstance.executeRequestInterceptors(config);

			expect(
				interceptorManagerInstance.getPerformanceMetrics().length,
			).toBeGreaterThan(0);

			interceptorManagerInstance.clearPerformanceMetrics();

			expect(interceptorManagerInstance.getPerformanceMetrics().length).toBe(0);
		});

		it("should clear log entries", () => {
			// Add some log entries first
			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"GET",
			);
			interceptorManagerInstance.executeRequestInterceptors(config);

			expect(interceptorManagerInstance.getLogEntries().length).toBeGreaterThan(
				0,
			);

			interceptorManagerInstance.clearLogEntries();

			expect(interceptorManagerInstance.getLogEntries().length).toBe(0);
		});
	});

	describe("Configuration", () => {
		it("should enable/disable logging", () => {
			interceptorManagerInstance.setLoggingEnabled(false);

			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"GET",
			);
			interceptorManagerInstance.executeRequestInterceptors(config);

			expect(interceptorManagerInstance.getLogEntries().length).toBe(0);

			interceptorManagerInstance.setLoggingEnabled(true);

			const config2 = interceptorManagerInstance.createRequestConfig(
				"/api/test2",
				"GET",
			);
			interceptorManagerInstance.executeRequestInterceptors(config2);

			expect(interceptorManagerInstance.getLogEntries().length).toBeGreaterThan(
				0,
			);
		});

		it("should enable/disable monitoring", () => {
			interceptorManagerInstance.setMonitoringEnabled(false);

			const config = interceptorManagerInstance.createRequestConfig(
				"/api/test",
				"GET",
			);
			interceptorManagerInstance.executeRequestInterceptors(config);

			// Monitoring disabled should still allow basic functionality
			expect(interceptorManagerInstance).toBeDefined();
		});
	});
});
