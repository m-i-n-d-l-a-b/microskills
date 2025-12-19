import { describe, it, expect, beforeEach, vi } from "vitest";
import FeedbackService, { feedbackService } from "./feedbackService";
import type {
	FeedbackTemplate,
	PersonalizedFeedback,
	FeedbackGenerationRequest,
} from "./feedbackService";
import type { OverallGradingResult } from "./rubricService";

// Mock the LLM service
vi.mock("./llmService", () => ({
	llmService: {
		generateFeedback: vi
			.fn()
			.mockResolvedValue("AI-generated feedback message"),
	},
}));

describe("FeedbackService", () => {
	let service: FeedbackService;

	beforeEach(() => {
		service = new FeedbackService();
	});

	describe("Initialization", () => {
		it("should initialize with default templates", () => {
			const templates = service.listTemplates();
			expect(templates.length).toBeGreaterThan(0);

			const encouragingTemplate = templates.find(
				(t) => t.type === "encouraging",
			);
			expect(encouragingTemplate).toBeDefined();
			expect(encouragingTemplate?.scoreRanges.length).toBeGreaterThan(0);
		});

		it("should have valid template structure", () => {
			const template = service.getTemplate("encouraging-beginner");
			expect(template).toBeDefined();
			expect(template?.type).toBe("encouraging");
			expect(template?.difficulty).toBe("beginner");
			expect(template?.scoreRanges.length).toBe(5);
		});
	});

	describe("Template Management", () => {
		it("should get template by ID", () => {
			const template = service.getTemplate("encouraging-beginner");
			expect(template).toBeDefined();
			expect(template?.name).toBe("Encouraging Feedback for Beginners");
		});

		it("should create custom template", () => {
			const customTemplate: Omit<
				FeedbackTemplate,
				"id" | "createdAt" | "updatedAt"
			> = {
				name: "Custom Test Template",
				type: "encouraging",
				language: "all",
				difficulty: "beginner",
				scoreRanges: [
					{
						min: 0,
						max: 100,
						template: "Test feedback template",
						suggestions: ["Test suggestion"],
					},
				],
			};

			const created = service.createTemplate(customTemplate);
			expect(created.id).toMatch(/^template_/);
			expect(created.name).toBe("Custom Test Template");
			expect(created.scoreRanges.length).toBe(1);
		});

		it("should update existing template", () => {
			const template = service.getTemplate("encouraging-beginner");
			expect(template).toBeDefined();

			const updated = service.updateTemplate("encouraging-beginner", {
				name: "Updated Template",
			});
			expect(updated?.name).toBe("Updated Template");
		});

		it("should delete template", () => {
			const customTemplate = service.createTemplate({
				name: "Delete Test Template",
				type: "encouraging",
				language: "all",
				difficulty: "beginner",
				scoreRanges: [],
			});

			const deleted = service.deleteTemplate(customTemplate.id);
			expect(deleted).toBe(true);

			const retrieved = service.getTemplate(customTemplate.id);
			expect(retrieved).toBeUndefined();
		});
	});

	describe("Feedback Generation", () => {
		it("should generate personalized feedback", async () => {
			const mockGradingResult: OverallGradingResult = {
				rubricId: "test-rubric",
				totalScore: 85,
				maxScore: 100,
				percentage: 85,
				passed: true,
				grade: "B",
				categoryScores: {
					functionality: 40,
					codeQuality: 30,
					bestPractices: 15,
					performance: 0,
					security: 0,
					documentation: 0,
				},
				criteriaResults: [
					{
						criteriaId: "func-1",
						category: "functionality",
						score: 40,
						maxScore: 40,
						percentage: 100,
						feedback: "Excellent functionality",
						suggestions: [],
						evidence: [],
					},
				],
				strengths: ["Good code structure"],
				weaknesses: ["Could improve error handling"],
				suggestions: ["Add more error handling"],
				complexity: "intermediate",
				processingTime: 1000,
				gradedAt: new Date().toISOString(),
			};

			const request: FeedbackGenerationRequest = {
				projectId: "test-project",
				userId: "test-user",
				code: 'function test() { return "hello"; }',
				language: "javascript",
				gradingResult: mockGradingResult,
				userHistory: {
					previousScores: [80, 85, 90],
					completedProjects: 5,
					averageScore: 85,
					strengths: ["Good problem solving"],
					weaknesses: ["Error handling"],
				},
				preferences: {
					feedbackStyle: "encouraging",
					detailLevel: "detailed",
					focusAreas: ["functionality"],
				},
			};

			const feedback = await service.generateFeedback(request);

			expect(feedback).toBeDefined();
			expect(feedback.projectId).toBe("test-project");
			expect(feedback.userId).toBe("test-user");
			expect(feedback.score).toBe(85);
			expect(feedback.grade).toBe("B");
			expect(feedback.feedback).toContain("AI-generated feedback message");
			expect(feedback.suggestions.length).toBeGreaterThan(0);
			expect(feedback.strengths).toEqual(["Good code structure"]);
			expect(feedback.weaknesses).toEqual(["Could improve error handling"]);
			expect(feedback.nextSteps.length).toBeGreaterThan(0);
			expect(feedback.motivationalMessage).toBeDefined();
			expect(feedback.learningPath).toBeDefined();
		});

		it("should handle different score ranges", async () => {
			const highScoreResult: OverallGradingResult = {
				rubricId: "test-rubric",
				totalScore: 95,
				maxScore: 100,
				percentage: 95,
				passed: true,
				grade: "A",
				categoryScores: {
					functionality: 40,
					codeQuality: 30,
					bestPractices: 25,
					performance: 0,
					security: 0,
					documentation: 0,
				},
				criteriaResults: [],
				strengths: ["Excellent work"],
				weaknesses: [],
				suggestions: [],
				complexity: "intermediate",
				processingTime: 1000,
				gradedAt: new Date().toISOString(),
			};

			const lowScoreResult: OverallGradingResult = {
				rubricId: "test-rubric",
				totalScore: 45,
				maxScore: 100,
				percentage: 45,
				passed: false,
				grade: "F",
				categoryScores: {
					functionality: 20,
					codeQuality: 15,
					bestPractices: 10,
					performance: 0,
					security: 0,
					documentation: 0,
				},
				criteriaResults: [],
				strengths: [],
				weaknesses: ["Needs improvement"],
				suggestions: ["Review fundamentals"],
				complexity: "beginner",
				processingTime: 1000,
				gradedAt: new Date().toISOString(),
			};

			const highRequest: FeedbackGenerationRequest = {
				projectId: "test-project",
				userId: "test-user",
				code: 'function test() { return "hello"; }',
				language: "javascript",
				gradingResult: highScoreResult,
			};

			const lowRequest: FeedbackGenerationRequest = {
				projectId: "test-project",
				userId: "test-user",
				code: 'function test() { return "hello"; }',
				language: "javascript",
				gradingResult: lowScoreResult,
			};

			const highFeedback = await service.generateFeedback(highRequest);
			const lowFeedback = await service.generateFeedback(lowRequest);

			expect(highFeedback.score).toBe(95);
			expect(highFeedback.grade).toBe("A");
			expect(lowFeedback.score).toBe(45);
			expect(lowFeedback.grade).toBe("F");
		});

		it("should generate appropriate learning path", async () => {
			const beginnerResult: OverallGradingResult = {
				rubricId: "test-rubric",
				totalScore: 60,
				maxScore: 100,
				percentage: 60,
				passed: false,
				grade: "D",
				categoryScores: {
					functionality: 25,
					codeQuality: 20,
					bestPractices: 15,
					performance: 0,
					security: 0,
					documentation: 0,
				},
				criteriaResults: [],
				strengths: [],
				weaknesses: ["Basic concepts"],
				suggestions: ["Review fundamentals"],
				complexity: "beginner",
				processingTime: 1000,
				gradedAt: new Date().toISOString(),
			};

			const request: FeedbackGenerationRequest = {
				projectId: "test-project",
				userId: "test-user",
				code: 'function test() { return "hello"; }',
				language: "javascript",
				gradingResult: beginnerResult,
			};

			const feedback = await service.generateFeedback(request);

			expect(feedback.learningPath.currentLevel).toBe("beginner");
			expect(feedback.learningPath.nextLevel).toBe("intermediate");
			expect(feedback.learningPath.recommendedTopics.length).toBeGreaterThan(0);
		});

		it("should generate motivational messages", async () => {
			const highScoreResult: OverallGradingResult = {
				rubricId: "test-rubric",
				totalScore: 90,
				maxScore: 100,
				percentage: 90,
				passed: true,
				grade: "A",
				categoryScores: {
					functionality: 40,
					codeQuality: 30,
					bestPractices: 20,
					performance: 0,
					security: 0,
					documentation: 0,
				},
				criteriaResults: [],
				strengths: ["Excellent work"],
				weaknesses: [],
				suggestions: [],
				complexity: "intermediate",
				processingTime: 1000,
				gradedAt: new Date().toISOString(),
			};

			const request: FeedbackGenerationRequest = {
				projectId: "test-project",
				userId: "test-user",
				code: 'function test() { return "hello"; }',
				language: "javascript",
				gradingResult: highScoreResult,
			};

			const feedback = await service.generateFeedback(request);

			expect(feedback.motivationalMessage).toContain("amazing");
			expect(feedback.motivationalMessage).toContain("boundaries");
		});
	});

	describe("Feedback Analysis", () => {
		it("should analyze feedback patterns", () => {
			const mockFeedbacks: PersonalizedFeedback[] = [
				{
					id: "feedback-1",
					projectId: "project-1",
					userId: "user-1",
					score: 85,
					grade: "B",
					feedback: "Good work",
					suggestions: ["Improve error handling"],
					strengths: ["Good structure"],
					weaknesses: ["Error handling"],
					nextSteps: ["Practice more"],
					motivationalMessage: "Keep going!",
					learningPath: {
						currentLevel: "intermediate",
						nextLevel: "advanced",
						recommendedTopics: [],
					},
					generatedAt: new Date().toISOString(),
				},
				{
					id: "feedback-2",
					projectId: "project-2",
					userId: "user-1",
					score: 90,
					grade: "A",
					feedback: "Excellent work",
					suggestions: ["Add more features"],
					strengths: ["Excellent structure"],
					weaknesses: ["Could add more features"],
					nextSteps: ["Try advanced topics"],
					motivationalMessage: "Great job!",
					learningPath: {
						currentLevel: "intermediate",
						nextLevel: "advanced",
						recommendedTopics: [],
					},
					generatedAt: new Date().toISOString(),
				},
			];

			const analysis = service.analyzeFeedbackPatterns(mockFeedbacks);

			expect(analysis.averageScore).toBe(88);
			expect(analysis.commonStrengths.length).toBeGreaterThan(0);
			expect(analysis.commonWeaknesses.length).toBeGreaterThan(0);
			expect(analysis.improvementTrend).toMatch(
				/^(improving|stable|declining)$/,
			);
		});

		it("should handle empty feedback array", () => {
			const analysis = service.analyzeFeedbackPatterns([]);

			expect(analysis.averageScore).toBe(0);
			expect(analysis.commonStrengths.length).toBe(0);
			expect(analysis.commonWeaknesses.length).toBe(0);
			expect(analysis.improvementTrend).toBe("stable");
		});
	});

	describe("Export/Import", () => {
		it("should export template to JSON", () => {
			const template = service.getTemplate("encouraging-beginner");
			expect(template).toBeDefined();

			const exported = service.exportTemplate("encouraging-beginner");
			expect(exported).toBeDefined();
			expect(typeof exported).toBe("string");

			const parsed = JSON.parse(exported!);
			expect(parsed.id).toBe("encouraging-beginner");
		});

		it("should import template from JSON", () => {
			const template = service.getTemplate("encouraging-beginner");
			expect(template).toBeDefined();

			const exported = service.exportTemplate("encouraging-beginner");
			expect(exported).toBeDefined();

			const imported = service.importTemplate(exported!);
			expect(imported).toBeDefined();
			expect(imported?.name).toBe(template?.name);
			expect(imported?.id).not.toBe("encouraging-beginner"); // Should have new ID
		});

		it("should handle invalid JSON import", () => {
			const result = service.importTemplate("invalid json");
			expect(result).toBeNull();
		});
	});

	describe("Error Handling", () => {
		it("should handle AI service failure gracefully", async () => {
			// Mock the LLM service to throw an error
			const { llmService } = await import("./llmService");
			vi.mocked(llmService.generateFeedback).mockRejectedValueOnce(
				new Error("AI service unavailable"),
			);

			const mockGradingResult: OverallGradingResult = {
				rubricId: "test-rubric",
				totalScore: 75,
				maxScore: 100,
				percentage: 75,
				passed: true,
				grade: "C",
				categoryScores: {
					functionality: 30,
					codeQuality: 25,
					bestPractices: 20,
					performance: 0,
					security: 0,
					documentation: 0,
				},
				criteriaResults: [],
				strengths: ["Good work"],
				weaknesses: ["Could improve"],
				suggestions: ["Practice more"],
				complexity: "intermediate",
				processingTime: 1000,
				gradedAt: new Date().toISOString(),
			};

			const request: FeedbackGenerationRequest = {
				projectId: "test-project",
				userId: "test-user",
				code: 'function test() { return "hello"; }',
				language: "javascript",
				gradingResult: mockGradingResult,
			};

			const feedback = await service.generateFeedback(request);

			expect(feedback).toBeDefined();
			expect(feedback.feedback).toBeDefined();
			expect(feedback.suggestions.length).toBeGreaterThan(0);
		});
	});

	describe("Template Selection", () => {
		it("should select appropriate template for user", async () => {
			const mockGradingResult: OverallGradingResult = {
				rubricId: "test-rubric",
				totalScore: 80,
				maxScore: 100,
				percentage: 80,
				passed: true,
				grade: "B",
				categoryScores: {
					functionality: 35,
					codeQuality: 25,
					bestPractices: 20,
					performance: 0,
					security: 0,
					documentation: 0,
				},
				criteriaResults: [],
				strengths: ["Good work"],
				weaknesses: ["Could improve"],
				suggestions: ["Practice more"],
				complexity: "intermediate",
				processingTime: 1000,
				gradedAt: new Date().toISOString(),
			};

			const encouragingRequest: FeedbackGenerationRequest = {
				projectId: "test-project",
				userId: "test-user",
				code: 'function test() { return "hello"; }',
				language: "javascript",
				gradingResult: mockGradingResult,
				preferences: {
					feedbackStyle: "encouraging",
					detailLevel: "detailed",
					focusAreas: [],
				},
			};

			const constructiveRequest: FeedbackGenerationRequest = {
				projectId: "test-project",
				userId: "test-user",
				code: 'function test() { return "hello"; }',
				language: "javascript",
				gradingResult: mockGradingResult,
				preferences: {
					feedbackStyle: "constructive",
					detailLevel: "detailed",
					focusAreas: [],
				},
			};

			const encouragingFeedback =
				await service.generateFeedback(encouragingRequest);
			const constructiveFeedback =
				await service.generateFeedback(constructiveRequest);

			expect(encouragingFeedback).toBeDefined();
			expect(constructiveFeedback).toBeDefined();
			// Both should generate feedback, but with different styles
			expect(encouragingFeedback.feedback).toBeDefined();
			expect(constructiveFeedback.feedback).toBeDefined();
		});
	});

	describe("Singleton Instance", () => {
		it("should provide singleton instance", () => {
			expect(feedbackService).toBeInstanceOf(FeedbackService);
			expect(feedbackService.listTemplates().length).toBeGreaterThan(0);
		});
	});
});
