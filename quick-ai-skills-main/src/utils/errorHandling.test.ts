import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorHandler, errorHandler } from "./errorHandling";
import type {
	ErrorHandlerConfig,
	ErrorLogEntry,
	ErrorContext,
	ErrorReportingService,
	ErrorStats,
} from "./errorHandling";
import type { ApiError } from "@/types/api";

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
});

// Mock console methods
let consoleSpy: {
	error: any;
	warn: any;
	info: any;
	log: any;
};

beforeEach(() => {
	consoleSpy = {
		error: vi.spyOn(console, "error").mockImplementation(() => {}),
		warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
		info: vi.spyOn(console, "info").mockImplementation(() => {}),
		log: vi.spyOn(console, "log").mockImplementation(() => {}),
	};
});

// Mock navigator
Object.defineProperty(window, "navigator", {
	value: {
		userAgent: "Mozilla/5.0 (Test Browser)",
	},
	writable: true,
});

// Mock window.location
Object.defineProperty(window, "location", {
	value: {
		href: "https://example.com/test",
	},
	writable: true,
});

describe("ErrorHandler", () => {
	let errorHandlerInstance: ErrorHandler;
	let mockReportingService: ErrorReportingService;

	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.getItem.mockReturnValue(null);

		mockReportingService = {
			reportError: vi.fn().mockResolvedValue(undefined),
			getErrorStats: vi.fn().mockResolvedValue({} as ErrorStats),
			resolveError: vi.fn().mockResolvedValue(undefined),
		};

		errorHandlerInstance = new ErrorHandler({
			enableLogging: true,
			enableMonitoring: true,
			enableUserNotifications: true,
			logLevel: "error",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Configuration", () => {
		it("should initialize with default configuration", () => {
			const config = errorHandlerInstance.getConfig();

			expect(config.enableLogging).toBe(true);
			expect(config.enableMonitoring).toBe(true);
			expect(config.enableUserNotifications).toBe(true);
			expect(config.logLevel).toBe("error");
			expect(config.maxRetries).toBe(3);
			expect(config.retryDelay).toBe(1000);
		});

		it("should allow custom configuration", () => {
			const customConfig: Partial<ErrorHandlerConfig> = {
				enableLogging: false,
				enableMonitoring: false,
				logLevel: "debug",
				maxRetries: 5,
			};

			const handler = new ErrorHandler(customConfig);
			const config = handler.getConfig();

			expect(config.enableLogging).toBe(false);
			expect(config.enableMonitoring).toBe(false);
			expect(config.logLevel).toBe("debug");
			expect(config.maxRetries).toBe(5);
		});

		it("should update configuration", () => {
			errorHandlerInstance.updateConfig({
				enableLogging: false,
				logLevel: "warn",
			});

			const config = errorHandlerInstance.getConfig();
			expect(config.enableLogging).toBe(false);
			expect(config.logLevel).toBe("warn");
		});
	});

	describe("Error Categorization", () => {
		it("should categorize server errors correctly", async () => {
			const apiError: ApiError = {
				message: "Internal Server Error",
				status: 500,
				code: "INTERNAL_ERROR",
			};

			await errorHandlerInstance.handleError(apiError, {
				endpoint: "/api/test",
				method: "GET",
			});

			const stats = errorHandlerInstance.getErrorStats();
			expect(stats.errorsByCategory.server).toBe(1);
			expect(stats.errorsBySeverity.high).toBe(1);
		});

		it("should categorize authentication errors correctly", async () => {
			const apiError: ApiError = {
				message: "Unauthorized",
				status: 401,
				code: "UNAUTHORIZED",
			};

			await errorHandlerInstance.handleError(apiError, {
				endpoint: "/api/auth/login",
				method: "POST",
			});

			const stats = errorHandlerInstance.getErrorStats();
			expect(stats.errorsByCategory.authentication).toBe(1);
			expect(stats.errorsBySeverity.medium).toBe(1);
		});

		it("should categorize authorization errors correctly", async () => {
			const apiError: ApiError = {
				message: "Forbidden",
				status: 403,
				code: "FORBIDDEN",
			};

			await errorHandlerInstance.handleError(apiError, {
				endpoint: "/api/admin/users",
				method: "GET",
			});

			const stats = errorHandlerInstance.getErrorStats();
			expect(stats.errorsByCategory.authorization).toBe(1);
			expect(stats.errorsBySeverity.medium).toBe(1);
		});

		it("should categorize validation errors correctly", async () => {
			const apiError: ApiError = {
				message: "Validation Error",
				status: 400,
				code: "VALIDATION_ERROR",
			};

			await errorHandlerInstance.handleError(apiError, {
				endpoint: "/api/users",
				method: "POST",
			});

			const stats = errorHandlerInstance.getErrorStats();
			expect(stats.errorsByCategory.validation).toBe(1);
			expect(stats.errorsBySeverity.low).toBe(1);
		});

		it("should categorize network errors correctly", async () => {
			const apiError: ApiError = {
				message: "Network Error",
				status: 0,
				code: "NETWORK_ERROR",
			};

			await errorHandlerInstance.handleError(apiError, {
				endpoint: "/api/test",
				method: "GET",
			});

			const stats = errorHandlerInstance.getErrorStats();
			expect(stats.errorsByCategory.network).toBe(1);
			expect(stats.errorsBySeverity.critical).toBe(1);
		});
	});

	describe("Error Logging", () => {
		it("should log errors with appropriate severity", async () => {
			const apiError: ApiError = {
				message: "Test Error",
				status: 500,
				code: "TEST_ERROR",
			};

			await errorHandlerInstance.handleError(apiError, {
				endpoint: "/api/test",
				method: "GET",
			});

			// Wait for the async operation to complete
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(consoleSpy.error).toHaveBeenCalled();
			expect(consoleSpy.error.mock.calls[0][0]).toContain("[HIGH]");
			expect(consoleSpy.error.mock.calls[0][0]).toContain("server");
		});

		it("should not log when logging is disabled", async () => {
			errorHandlerInstance.updateConfig({ enableLogging: false });

			const apiError: ApiError = {
				message: "Test Error",
				status: 500,
				code: "TEST_ERROR",
			};

			await errorHandlerInstance.handleError(apiError);

			expect(consoleSpy.error).not.toHaveBeenCalled();
		});

		it("should store errors in local log", async () => {
			const apiError: ApiError = {
				message: "Test Error",
				status: 500,
				code: "TEST_ERROR",
			};

			await errorHandlerInstance.handleError(apiError, {
				endpoint: "/api/test",
				method: "GET",
				userId: "user-123",
			});

			const stats = errorHandlerInstance.getErrorStats();
			expect(stats.totalErrors).toBe(1);
			expect(stats.recentErrors).toHaveLength(1);
			expect(stats.recentErrors[0].error).toEqual(apiError);
			expect(stats.recentErrors[0].context.userId).toBe("user-123");
		});

		it("should persist errors to localStorage", async () => {
			const apiError: ApiError = {
				message: "Test Error",
				status: 500,
				code: "TEST_ERROR",
			};

			await errorHandlerInstance.handleError(apiError);

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"error_log",
				expect.any(String),
			);

			const storedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
			expect(storedData).toHaveLength(1);
			expect(storedData[0].error).toEqual(apiError);
		});
	});

	describe("Error Reporting", () => {
		it("should report errors to external service", async () => {
			errorHandlerInstance.setReportingService(mockReportingService);

			const apiError: ApiError = {
				message: "Test Error",
				status: 500,
				code: "TEST_ERROR",
			};

			await errorHandlerInstance.handleError(apiError, {
				endpoint: "/api/test",
				method: "GET",
			});

			expect(mockReportingService.reportError).toHaveBeenCalledWith(
				expect.objectContaining({
					error: apiError,
					severity: "high",
					category: "server",
				}),
			);
		});

		it("should not report when monitoring is disabled", async () => {
			errorHandlerInstance.updateConfig({ enableMonitoring: false });
			errorHandlerInstance.setReportingService(mockReportingService);

			const apiError: ApiError = {
				message: "Test Error",
				status: 500,
				code: "TEST_ERROR",
			};

			await errorHandlerInstance.handleError(apiError);

			expect(mockReportingService.reportError).not.toHaveBeenCalled();
		});

		it("should handle reporting service failures gracefully", async () => {
			const failingService: ErrorReportingService = {
				reportError: vi.fn().mockRejectedValue(new Error("Reporting failed")),
				getErrorStats: vi.fn().mockResolvedValue({} as ErrorStats),
				resolveError: vi.fn().mockResolvedValue(undefined),
			};

			errorHandlerInstance.setReportingService(failingService);

			const apiError: ApiError = {
				message: "Test Error",
				status: 500,
				code: "TEST_ERROR",
			};

			// Should not throw
			await expect(
				errorHandlerInstance.handleError(apiError),
			).resolves.toBeUndefined();
		});
	});

	describe("API Error Handling", () => {
		it("should handle API response errors", async () => {
			const mockResponse = new Response(
				JSON.stringify({ message: "API Error", code: "API_ERROR" }),
				{
					status: 400,
					headers: { "content-type": "application/json" },
				},
			);

			const result = await errorHandlerInstance.handleApiError(
				mockResponse,
				"/api/test",
				"POST",
				"user-123",
			);

			expect(result.status).toBe(400);
			expect(result.message).toBe("API Error");
			expect(result.code).toBe("API_ERROR");

			const stats = errorHandlerInstance.getErrorStats();
			expect(stats.totalErrors).toBe(1);
			expect(stats.errorsByCategory.validation).toBe(1);
		});

		it("should handle non-JSON error responses", async () => {
			const mockResponse = new Response("Plain text error", {
				status: 500,
				headers: { "content-type": "text/plain" },
			});

			const result = await errorHandlerInstance.handleApiError(
				mockResponse,
				"/api/test",
				"GET",
			);

			expect(result.status).toBe(500);
			expect(result.message).toBe("Plain text error");
		});

		it("should handle response parsing errors", async () => {
			const mockResponse = new Response("Invalid JSON {", {
				status: 500,
				headers: { "content-type": "application/json" },
			});

			const result = await errorHandlerInstance.handleApiError(
				mockResponse,
				"/api/test",
				"GET",
			);

			expect(result.status).toBe(500);
			expect(result.message).toBe("Failed to parse error response");
		});
	});

	describe("Network Error Handling", () => {
		it("should handle network errors", async () => {
			const networkError = new Error("Network request failed");

			const result = await errorHandlerInstance.handleNetworkError(
				networkError,
				"/api/test",
				"GET",
				"user-123",
			);

			expect(result.status).toBe(0);
			expect(result.code).toBe("NETWORK_ERROR");
			expect(result.message).toBe(
				"Network error occurred. Please check your connection.",
			);

			const stats = errorHandlerInstance.getErrorStats();
			expect(stats.errorsByCategory.network).toBe(1);
			expect(stats.errorsBySeverity.critical).toBe(1);
		});
	});

	describe("Timeout Error Handling", () => {
		it("should handle timeout errors", async () => {
			const result = await errorHandlerInstance.handleTimeoutError(
				"/api/test",
				"GET",
				30000,
				"user-123",
			);

			expect(result.status).toBe(408);
			expect(result.code).toBe("TIMEOUT_ERROR");
			expect(result.message).toBe("Request timed out. Please try again.");

			// Wait for the async operation to complete
			await new Promise((resolve) => setTimeout(resolve, 0));

			const stats = errorHandlerInstance.getErrorStats();
			expect(stats.errorsByCategory.timeout).toBe(1);
		});
	});

	describe("Error Statistics", () => {
		it("should provide accurate error statistics", async () => {
			// Add multiple errors
			const errors = [
				{ status: 500, code: "SERVER_ERROR" },
				{ status: 401, code: "AUTH_ERROR" },
				{ status: 400, code: "VALIDATION_ERROR" },
				{ status: 0, code: "NETWORK_ERROR" },
			];

			for (const error of errors) {
				await errorHandlerInstance.handleError({
					message: "Test Error",
					...error,
				});
			}

			const stats = errorHandlerInstance.getErrorStats();

			expect(stats.totalErrors).toBe(4);
			expect(stats.errorsByCategory.server).toBe(1);
			expect(stats.errorsByCategory.authentication).toBe(1);
			expect(stats.errorsByCategory.validation).toBe(1);
			expect(stats.errorsByCategory.network).toBe(1);
			expect(stats.errorsBySeverity.critical).toBe(1);
			expect(stats.errorsBySeverity.high).toBe(1);
			expect(stats.errorsBySeverity.medium).toBe(1);
			expect(stats.errorsBySeverity.low).toBe(1);
			expect(stats.recentErrors).toHaveLength(4);
			expect(stats.resolutionRate).toBe(0);
		});

		it("should calculate resolution rate correctly", async () => {
			const apiError: ApiError = {
				message: "Test Error",
				status: 500,
				code: "TEST_ERROR",
			};

			await errorHandlerInstance.handleError(apiError);

			const stats = errorHandlerInstance.getErrorStats();
			expect(stats.resolutionRate).toBe(0);

			// Resolve the error
			await errorHandlerInstance.resolveError(stats.recentErrors[0].id);

			const updatedStats = errorHandlerInstance.getErrorStats();
			expect(updatedStats.resolutionRate).toBe(100);
		});
	});

	describe("Error Resolution", () => {
		it("should resolve errors correctly", async () => {
			const apiError: ApiError = {
				message: "Test Error",
				status: 500,
				code: "TEST_ERROR",
			};

			await errorHandlerInstance.handleError(apiError);

			const stats = errorHandlerInstance.getErrorStats();
			const errorId = stats.recentErrors[0].id;

			await errorHandlerInstance.resolveError(errorId);

			const updatedStats = errorHandlerInstance.getErrorStats();
			const resolvedError = updatedStats.recentErrors.find(
				(e) => e.id === errorId,
			);
			expect(resolvedError?.resolved).toBe(true);
		});

		it("should report resolution to external service", async () => {
			errorHandlerInstance.setReportingService(mockReportingService);

			const apiError: ApiError = {
				message: "Test Error",
				status: 500,
				code: "TEST_ERROR",
			};

			await errorHandlerInstance.handleError(apiError);

			const stats = errorHandlerInstance.getErrorStats();
			const errorId = stats.recentErrors[0].id;

			await errorHandlerInstance.resolveError(errorId);

			expect(mockReportingService.resolveError).toHaveBeenCalledWith(errorId);
		});
	});

	describe("Error Log Management", () => {
		it("should clear error log", () => {
			errorHandlerInstance.clearErrorLog();

			expect(localStorageMock.removeItem).toHaveBeenCalledWith("error_log");

			const stats = errorHandlerInstance.getErrorStats();
			expect(stats.totalErrors).toBe(0);
		});

		it("should load error log from localStorage", () => {
			const mockErrorLog = [
				{
					id: "test-1",
					error: { message: "Test Error", status: 500 },
					severity: "high",
					category: "server",
					context: { timestamp: new Date().toISOString() },
					userMessage: "Test Error",
					technicalMessage: "Test Error",
					timestamp: new Date().toISOString(),
					resolved: false,
					retryCount: 0,
					maxRetries: 3,
				},
			];

			localStorageMock.getItem.mockReturnValue(JSON.stringify(mockErrorLog));

			errorHandlerInstance.loadErrorLog();

			const stats = errorHandlerInstance.getErrorStats();
			expect(stats.totalErrors).toBe(1);
		});

		it("should handle invalid localStorage data gracefully", () => {
			localStorageMock.getItem.mockReturnValue("invalid-json");

			// Should not throw
			expect(() => errorHandlerInstance.loadErrorLog()).not.toThrow();
		});
	});

	describe("User Notifications", () => {
		it("should show user notifications when enabled", async () => {
			const apiError: ApiError = {
				message: "Test Error",
				status: 500,
				code: "TEST_ERROR",
			};

			await errorHandlerInstance.handleError(apiError);

			// Wait for the async operation to complete
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(consoleSpy.log).toHaveBeenCalledWith(
				"User Notification:",
				expect.any(String),
			);
		});

		it("should not show notifications when disabled", async () => {
			errorHandlerInstance.updateConfig({ enableUserNotifications: false });

			const apiError: ApiError = {
				message: "Test Error",
				status: 500,
				code: "TEST_ERROR",
			};

			await errorHandlerInstance.handleError(apiError);

			expect(consoleSpy.log).not.toHaveBeenCalledWith(
				"User Notification:",
				expect.any(String),
			);
		});
	});

	describe("Error Context", () => {
		it("should include browser information in error context", async () => {
			const apiError: ApiError = {
				message: "Test Error",
				status: 500,
				code: "TEST_ERROR",
			};

			await errorHandlerInstance.handleError(apiError, {
				endpoint: "/api/test",
				method: "GET",
				userId: "user-123",
				sessionId: "session-456",
			});

			const stats = errorHandlerInstance.getErrorStats();
			const context = stats.recentErrors[0].context;

			expect(context.userAgent).toBe("Mozilla/5.0 (Test Browser)");
			expect(context.url).toBe("https://example.com/test");
			expect(context.userId).toBe("user-123");
			expect(context.sessionId).toBe("session-456");
			expect(context.endpoint).toBe("/api/test");
			expect(context.method).toBe("GET");
			expect(context.requestId).toMatch(/^req_\d+_\d+$/);
		});
	});

	describe("Memory Management", () => {
		it("should limit error log size to prevent memory issues", async () => {
			// Add more than 100 errors
			for (let i = 0; i < 105; i++) {
				await errorHandlerInstance.handleError({
					message: `Error ${i}`,
					status: 500,
					code: `ERROR_${i}`,
				});
			}

			const stats = errorHandlerInstance.getErrorStats();
			expect(stats.totalErrors).toBe(100); // Should be limited to 100
		});

		it("should store only last 50 errors in localStorage", async () => {
			// Add 60 errors
			for (let i = 0; i < 60; i++) {
				await errorHandlerInstance.handleError({
					message: `Error ${i}`,
					status: 500,
					code: `ERROR_${i}`,
				});
			}

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"error_log",
				expect.any(String),
			);

			const storedData = JSON.parse(
				localStorageMock.setItem.mock.calls[
					localStorageMock.setItem.mock.calls.length - 1
				][1],
			);
			expect(storedData).toHaveLength(50); // Should store only last 50
		});
	});
});
