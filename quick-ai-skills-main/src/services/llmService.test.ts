import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LLMService, llmService } from "./llmService";
import type {
	CodeEvaluationRequest,
	CodeEvaluationResponse,
	CodeFeedback,
} from "./llmService";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables
vi.mock("@/lib/constants", () => ({
	ENV: {
		LLM_PROVIDER: "openai",
		LLM_API_KEY: "test-api-key",
		LLM_MODEL: "gpt-4",
		LLM_BASE_URL: "",
		LLM_TIMEOUT: 30000,
		LLM_MAX_RETRIES: 3,
	},
	API_ENDPOINTS: {
		LLM: {
			EVALUATE: "http://localhost:4000/llm/evaluate",
			ANALYZE: "http://localhost:4000/llm/analyze",
			FEEDBACK: "http://localhost:4000/llm/feedback",
			HEALTH: "http://localhost:4000/llm/health",
		},
	},
	HTTP_STATUS: {
		OK: 200,
		BAD_REQUEST: 400,
		UNAUTHORIZED: 401,
		INTERNAL_SERVER_ERROR: 500,
	},
	ERROR_MESSAGES: {
		TIMEOUT_ERROR: "Request timed out",
		UNKNOWN_ERROR: "An unknown error occurred",
	},
}));

// Mock error handling
vi.mock("@/utils/errorHandling", () => ({
	handleError: vi.fn(),
}));

describe("LLMService", () => {
	let service: LLMService;

	beforeEach(() => {
		service = new LLMService();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const mockEvaluationRequest: CodeEvaluationRequest = {
		code: 'console.log("Hello, World!");',
		language: "javascript",
		projectId: "project-1",
		requirements: ['Print "Hello, World!" to console'],
		rubric: {
			functionality: 40,
			codeQuality: 30,
			bestPractices: 30,
		},
		context: {
			lessonId: "lesson-1",
			difficulty: "beginner",
			learningObjectives: ["Understand basic console output"],
		},
	};

	const mockEvaluationResponse: CodeEvaluationResponse = {
		id: "eval_123",
		projectId: "project-1",
		score: 85,
		percentage: 85,
		passed: true,
		feedback: [
			{
				id: "feedback-1",
				type: "success",
				message: "Code successfully prints to console",
				severity: "low",
				category: "logic",
			},
		],
		rubric: {
			functionality: 85,
			codeQuality: 80,
			bestPractices: 90,
		},
		analysis: {
			strengths: ["Correct syntax", "Simple and clear"],
			weaknesses: ["Could add comments"],
			suggestions: ["Add comments for clarity"],
			complexity: "beginner",
		},
		processingTime: 1500,
		model: "gpt-4",
		provider: "openai",
		evaluatedAt: new Date().toISOString(),
	};

	describe("Configuration", () => {
		it("should initialize with default configuration", () => {
			expect(service).toBeDefined();
		});

		it("should accept custom configuration", () => {
			const customService = new LLMService({
				provider: "anthropic",
				apiKey: "custom-key",
				model: "claude-3",
				timeout: 60000,
				maxRetries: 5,
			});

			expect(customService).toBeDefined();
		});
	});

	describe("evaluateCode", () => {
		it("should evaluate code successfully", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockEvaluationResponse,
			});

			const result = await service.evaluateCode(mockEvaluationRequest);

			expect(result).toEqual(mockEvaluationResponse);
			expect(mockFetch).toHaveBeenCalledWith(
				"http://localhost:4000/llm/evaluate",
				expect.objectContaining({
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer test-api-key",
					},
					body: expect.stringContaining('console.log("Hello, World!");'),
				}),
			);
		});

		it("should handle evaluation errors gracefully", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			const result = await service.evaluateCode(mockEvaluationRequest);

			expect(result.score).toBe(0);
			expect(result.passed).toBe(false);
			expect(result.feedback[0].type).toBe("error");
			expect(result.feedback[0].message).toContain("Network error");
		});

		it("should retry on transient errors", async () => {
			mockFetch
				.mockRejectedValueOnce(new Error("Temporary error"))
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockEvaluationResponse,
				});

			const result = await service.evaluateCode(mockEvaluationRequest);

			expect(result).toEqual(mockEvaluationResponse);
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it("should not retry on permanent errors", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Unauthorized"));

			const result = await service.evaluateCode(mockEvaluationRequest);

			expect(result.score).toBe(0);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("should handle timeout errors", async () => {
			mockFetch.mockImplementationOnce(
				() =>
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error("AbortError")), 100),
					),
			);

			const result = await service.evaluateCode(mockEvaluationRequest);

			expect(result.score).toBe(0);
			expect(result.feedback[0].message).toContain("timed out");
		});
	});

	describe("analyzeCode", () => {
		it("should analyze code successfully", async () => {
			const mockFeedback: CodeFeedback[] = [
				{
					id: "analysis-1",
					type: "suggestion",
					message: "Consider adding comments",
					severity: "low",
					category: "style",
				},
			];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockFeedback,
			});

			const result = await service.analyzeCode(
				'console.log("test");',
				"javascript",
			);

			expect(result).toEqual(mockFeedback);
			expect(mockFetch).toHaveBeenCalledWith(
				"http://localhost:4000/llm/analyze",
				expect.objectContaining({
					method: "POST",
					body: expect.stringContaining('console.log("test");'),
				}),
			);
		});

		it("should handle analysis errors gracefully", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Analysis failed"));

			const result = await service.analyzeCode(
				'console.log("test");',
				"javascript",
			);

			expect(result).toEqual([]);
		});
	});

	describe("generateFeedback", () => {
		it("should generate feedback successfully", async () => {
			const mockFeedback = "Great job! Your code is well-structured.";

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ feedback: mockFeedback }),
			});

			const result = await service.generateFeedback(
				'console.log("test");',
				"javascript",
				85,
			);

			expect(result).toBe(mockFeedback);
		});

		it("should return default feedback on error", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Feedback generation failed"));

			const result = await service.generateFeedback(
				'console.log("test");',
				"javascript",
				85,
			);

			expect(result).toContain("Good job");
		});

		it("should provide appropriate default feedback for different scores", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Error"));

			const highScoreFeedback = await service.generateFeedback(
				"code",
				"javascript",
				95,
			);
			const lowScoreFeedback = await service.generateFeedback(
				"code",
				"javascript",
				60,
			);

			expect(highScoreFeedback).toContain("Excellent");
			expect(lowScoreFeedback).toContain("Keep working");
		});
	});

	describe("checkHealth", () => {
		it("should return healthy status when service is working", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ response: "OK" }),
			});

			const result = await service.checkHealth();

			expect(result.status).toBe("healthy");
			expect(result.provider).toBe("openai");
			expect(result.model).toBe("gpt-4");
			expect(result.responseTime).toBeGreaterThan(0);
		});

		it("should return unhealthy status when service fails", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Service unavailable"));

			const result = await service.checkHealth();

			expect(result.status).toBe("unhealthy");
			expect(result.errors).toContain("Service unavailable");
		});
	});

	describe("Prompt Building", () => {
		it("should build evaluation prompt correctly", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockEvaluationResponse,
			});

			await service.evaluateCode(mockEvaluationRequest);

			const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(callBody.prompt).toContain('console.log("Hello, World!");');
			expect(callBody.prompt).toContain('Print "Hello, World!" to console');
			expect(callBody.prompt).toContain("Functionality: 40%");
			expect(callBody.prompt).toContain("Understand basic console output");
		});

		it("should build analysis prompt correctly", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [],
			});

			await service.analyzeCode("test code", "python", { context: "test" });

			const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(callBody.prompt).toContain("test code");
			expect(callBody.prompt).toContain("python");
			expect(callBody.prompt).toContain("CONTEXT");
		});

		it("should build feedback prompt correctly", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ feedback: "test" }),
			});

			await service.generateFeedback("test code", "javascript", 85);

			const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(callBody.prompt).toContain("test code");
			expect(callBody.prompt).toContain("SCORE: 85/100");
		});
	});

	describe("Response Parsing", () => {
		it("should parse evaluation response correctly", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockEvaluationResponse,
			});

			const result = await service.evaluateCode(mockEvaluationRequest);

			expect(result.id).toBeDefined();
			expect(result.projectId).toBe("project-1");
			expect(result.score).toBe(85);
			expect(result.feedback).toHaveLength(1);
		});

		it("should handle malformed evaluation response", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => "invalid json",
			});

			const result = await service.evaluateCode(mockEvaluationRequest);

			expect(result.score).toBe(0);
			expect(result.feedback[0].message).toContain("Failed to parse");
		});

		it("should parse feedback response correctly", async () => {
			const mockFeedback = [
				{
					type: "suggestion",
					message: "test",
					severity: "low",
					category: "style",
				},
			];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockFeedback,
			});

			const result = await service.analyzeCode("test", "javascript");

			expect(result).toEqual(mockFeedback);
		});

		it("should handle malformed feedback response", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => "invalid",
			});

			const result = await service.analyzeCode("test", "javascript");

			expect(result).toEqual([]);
		});
	});

	describe("Error Handling", () => {
		it("should handle HTTP errors", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
			});

			const result = await service.evaluateCode(mockEvaluationRequest);

			expect(result.score).toBe(0);
			expect(result.feedback[0].message).toContain("500");
		});

		it("should handle network errors", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			const result = await service.evaluateCode(mockEvaluationRequest);

			expect(result.score).toBe(0);
			expect(result.feedback[0].message).toContain("Network error");
		});

		it("should handle timeout errors", async () => {
			const controller = new AbortController();
			controller.abort();

			mockFetch.mockImplementationOnce(() =>
				Promise.reject(new Error("AbortError")),
			);

			const result = await service.evaluateCode(mockEvaluationRequest);

			expect(result.score).toBe(0);
			expect(result.feedback[0].message).toContain("timed out");
		});
	});

	describe("Retry Logic", () => {
		it("should retry on transient errors", async () => {
			mockFetch
				.mockRejectedValueOnce(new Error("Rate limit"))
				.mockRejectedValueOnce(new Error("Rate limit"))
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockEvaluationResponse,
				});

			const result = await service.evaluateCode(mockEvaluationRequest);

			expect(result).toEqual(mockEvaluationResponse);
			expect(mockFetch).toHaveBeenCalledTimes(3);
		});

		it("should not retry on permanent errors", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Unauthorized"));

			const result = await service.evaluateCode(mockEvaluationRequest);

			expect(result.score).toBe(0);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("should respect max retries configuration", async () => {
			const customService = new LLMService({ maxRetries: 1 });

			mockFetch
				.mockRejectedValueOnce(new Error("Error 1"))
				.mockRejectedValueOnce(new Error("Error 2"));

			const result = await customService.evaluateCode(mockEvaluationRequest);

			expect(result.score).toBe(0);
			expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
		});
	});

	describe("Health Management", () => {
		it("should check health before making requests", async () => {
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ response: "OK" }),
				}) // Health check
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockEvaluationResponse,
				}); // Evaluation

			await service.evaluateCode(mockEvaluationRequest);

			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it("should fail fast when service is unhealthy", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Service unavailable")); // Health check fails

			const result = await service.evaluateCode(mockEvaluationRequest);

			expect(result.score).toBe(0);
			expect(result.feedback[0].message).toContain("unavailable");
		});
	});

	describe("Singleton Instance", () => {
		it("should export singleton instance", () => {
			expect(llmService).toBeInstanceOf(LLMService);
		});

		it("should use default configuration for singleton", () => {
			expect(llmService).toBeDefined();
		});
	});
});
