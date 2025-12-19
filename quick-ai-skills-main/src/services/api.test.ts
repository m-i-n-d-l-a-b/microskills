import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiClient, ApiResponse, ApiError } from "./api";
import {
	ENV,
	API_ENDPOINTS,
	HTTP_STATUS,
	ERROR_MESSAGES,
	STORAGE_KEYS,
} from "@/lib/constants";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

// Mock window.location
const locationMock = {
	href: "",
};
Object.defineProperty(window, "location", {
	value: locationMock,
	writable: true,
});

describe("ApiClient", () => {
	let apiClient: ApiClient;

	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.getItem.mockReturnValue("test-token");
		apiClient = new ApiClient();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Constructor", () => {
		it("should initialize with correct default values", () => {
			expect(apiClient).toBeInstanceOf(ApiClient);
		});
	});

	describe("Authentication", () => {
		it("should include auth token in headers when available", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ data: "test" }),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await apiClient.get("/test");

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Bearer test-token",
					}),
				}),
			);
		});

		it("should not include auth token when not available", async () => {
			localStorageMock.getItem.mockReturnValue(null);

			const mockResponse = {
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ data: "test" }),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await apiClient.get("/test");

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.not.objectContaining({
						Authorization: expect.any(String),
					}),
				}),
			);
		});
	});

	describe("Request Methods", () => {
		beforeEach(() => {
			const mockResponse = {
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ data: "test" }),
			};
			mockFetch.mockResolvedValue(mockResponse);
		});

		it("should make GET request correctly", async () => {
			const response = await apiClient.get("/test");

			expect(mockFetch).toHaveBeenCalledWith(
				`${ENV.API_BASE_URL}/test`,
				expect.objectContaining({
					method: "GET",
				}),
			);
			expect(response.success).toBe(true);
		});

		it("should make POST request correctly", async () => {
			const body = { test: "data" };
			const response = await apiClient.post("/test", body);

			expect(mockFetch).toHaveBeenCalledWith(
				`${ENV.API_BASE_URL}/test`,
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify(body),
				}),
			);
			expect(response.success).toBe(true);
		});

		it("should make PUT request correctly", async () => {
			const body = { test: "data" };
			const response = await apiClient.put("/test", body);

			expect(mockFetch).toHaveBeenCalledWith(
				`${ENV.API_BASE_URL}/test`,
				expect.objectContaining({
					method: "PUT",
					body: JSON.stringify(body),
				}),
			);
			expect(response.success).toBe(true);
		});

		it("should make DELETE request correctly", async () => {
			const response = await apiClient.delete("/test");

			expect(mockFetch).toHaveBeenCalledWith(
				`${ENV.API_BASE_URL}/test`,
				expect.objectContaining({
					method: "DELETE",
				}),
			);
			expect(response.success).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("should handle 401 unauthorized error", async () => {
			const mockResponse = {
				ok: false,
				status: 401,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ message: "Unauthorized" }),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await expect(apiClient.get("/test")).rejects.toThrow();

			expect(localStorageMock.removeItem).toHaveBeenCalledWith(
				STORAGE_KEYS.AUTH_TOKEN,
			);
			expect(localStorageMock.removeItem).toHaveBeenCalledWith(
				STORAGE_KEYS.REFRESH_TOKEN,
			);
		});

		it("should handle 403 forbidden error", async () => {
			const mockResponse = {
				ok: false,
				status: 403,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ message: "Forbidden" }),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await expect(apiClient.get("/test")).rejects.toThrow(
				ERROR_MESSAGES.FORBIDDEN,
			);
		});

		it("should handle 404 not found error", async () => {
			const mockResponse = {
				ok: false,
				status: 404,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ message: "Not Found" }),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await expect(apiClient.get("/test")).rejects.toThrow(
				ERROR_MESSAGES.NOT_FOUND,
			);
		});

		it("should handle timeout errors", async () => {
			const mockResponse = {
				ok: false,
				status: 408,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ message: "Request Timeout" }),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await expect(apiClient.get("/test")).rejects.toThrow();
		});
	});

	describe("Retry Logic", () => {
		it("should retry on server errors", async () => {
			const serverErrorResponse = {
				ok: false,
				status: 500,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ message: "Server Error" }),
			};
			const successResponse = {
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ data: "success" }),
			};

			mockFetch
				.mockResolvedValueOnce(serverErrorResponse)
				.mockResolvedValueOnce(successResponse);

			const response = await apiClient.get("/test", { retries: 1 });

			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(response.success).toBe(true);
		});

		it("should not retry on client errors", async () => {
			const clientErrorResponse = {
				ok: false,
				status: 400,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ message: "Bad Request" }),
			};

			mockFetch.mockResolvedValue(clientErrorResponse);

			await expect(apiClient.get("/test", { retries: 3 })).rejects.toThrow();

			expect(mockFetch).toHaveBeenCalledTimes(1);
		});
	});

	describe("Specific API Methods", () => {
		beforeEach(() => {
			const mockResponse = {
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ data: "test" }),
			};
			mockFetch.mockResolvedValue(mockResponse);
		});

		it("should call login endpoint correctly", async () => {
			const credentials = { email: "test@example.com", password: "password" };
			await apiClient.login(credentials);

			expect(mockFetch).toHaveBeenCalledWith(
				API_ENDPOINTS.AUTH.LOGIN,
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify(credentials),
				}),
			);
		});

		it("should call getDailyLesson endpoint correctly", async () => {
			await apiClient.getDailyLesson();

			expect(mockFetch).toHaveBeenCalledWith(
				API_ENDPOINTS.LESSONS.DAILY,
				expect.objectContaining({
					method: "GET",
				}),
			);
		});

		it("should call submitQuiz endpoint correctly", async () => {
			const quizData = { answers: ["A", "B", "C"] };
			await apiClient.submitQuiz(quizData);

			expect(mockFetch).toHaveBeenCalledWith(
				API_ENDPOINTS.LESSONS.SUBMIT_QUIZ,
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify(quizData),
				}),
			);
		});

		it("should call submitProject endpoint correctly", async () => {
			const projectData = {
				code: 'console.log("hello")',
				language: "javascript",
			};
			await apiClient.submitProject(projectData);

			expect(mockFetch).toHaveBeenCalledWith(
				API_ENDPOINTS.PROJECTS.SUBMIT,
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify(projectData),
				}),
			);
		});

		it("should call getUserProfile endpoint correctly", async () => {
			await apiClient.getUserProfile();

			expect(mockFetch).toHaveBeenCalledWith(
				API_ENDPOINTS.USER.PROFILE,
				expect.objectContaining({
					method: "GET",
				}),
			);
		});

		it("should call updateUserPreferences endpoint correctly", async () => {
			const preferences = { theme: "dark", notifications: true };
			await apiClient.updateUserPreferences(preferences);

			expect(mockFetch).toHaveBeenCalledWith(
				API_ENDPOINTS.USER.PREFERENCES,
				expect.objectContaining({
					method: "PUT",
					body: JSON.stringify(preferences),
				}),
			);
		});
	});

	describe("Response Handling", () => {
		it("should handle JSON responses correctly", async () => {
			const mockData = { id: 1, name: "Test" };
			const mockResponse = {
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve(mockData),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const response = await apiClient.get("/test");

			expect(response.data).toEqual(mockData);
			expect(response.status).toBe(200);
			expect(response.success).toBe(true);
		});

		it("should handle text responses correctly", async () => {
			const mockText = "Success message";
			const mockResponse = {
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "text/plain" }),
				text: () => Promise.resolve(mockText),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const response = await apiClient.get("/test");

			expect(response.data).toBe(mockText);
			expect(response.status).toBe(200);
			expect(response.success).toBe(true);
		});
	});

	describe("Timeout Handling", () => {
		it("should handle request timeouts", async () => {
			// Mock AbortController
			const mockAbort = vi.fn();
			const mockSignal = { aborted: false };
			global.AbortController = vi.fn().mockImplementation(() => ({
				signal: mockSignal,
				abort: mockAbort,
			}));

			// Mock setTimeout to immediately trigger timeout
			const originalSetTimeout = global.setTimeout;
			global.setTimeout = vi.fn((callback) => {
				callback();
				return 1;
			});

			mockFetch.mockImplementation(() => {
				const error = new Error("AbortError");
				error.name = "AbortError";
				throw error;
			});

			await expect(apiClient.get("/test", { timeout: 1000 })).rejects.toThrow(
				ERROR_MESSAGES.TIMEOUT_ERROR,
			);

			// Restore setTimeout
			global.setTimeout = originalSetTimeout;
		});
	});
});
