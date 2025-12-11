import { describe, it, expect, beforeEach, vi } from "vitest";
import ProjectHistoryService, {
	projectHistoryService,
} from "./projectHistoryService";
import type {
	ProjectSubmission,
	ProjectResult,
	ProjectHistory,
	ProjectComparison,
} from "./projectHistoryService";
import type { OverallGradingResult } from "./rubricService";

// Mock the feedback service
vi.mock("./feedbackService", () => ({
	feedbackService: {
		generateFeedback: vi.fn().mockResolvedValue({
			id: "feedback-1",
			projectId: "test-project",
			userId: "test-user",
			score: 85,
			grade: "B",
			feedback: "Good work!",
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
		}),
	},
}));

describe("ProjectHistoryService", () => {
	let service: ProjectHistoryService;

	beforeEach(() => {
		service = new ProjectHistoryService();
	});

	describe("Project Submission", () => {
		it("should submit a new project", async () => {
			const submission = await service.submitProject(
				"test-project",
				"test-user",
				'function test() { return "hello"; }',
				"javascript",
				[],
				{ test: true },
			);

			expect(submission).toBeDefined();
			expect(submission.projectId).toBe("test-project");
			expect(submission.userId).toBe("test-user");
			expect(submission.version).toBe(1);
			expect(submission.status).toBe("pending");
			expect(submission.metadata.test).toBe(true);
		});

		it("should increment version for subsequent submissions", async () => {
			await service.submitProject(
				"test-project",
				"test-user",
				"code1",
				"javascript",
			);
			const submission2 = await service.submitProject(
				"test-project",
				"test-user",
				"code2",
				"javascript",
			);

			expect(submission2.version).toBe(2);
		});

		it("should get submission by ID", async () => {
			const submission = await service.submitProject(
				"test-project",
				"test-user",
				"code",
				"javascript",
			);
			const retrieved = service.getSubmission(submission.id);

			expect(retrieved).toBeDefined();
			expect(retrieved?.id).toBe(submission.id);
			expect(retrieved?.code).toBe("code");
		});

		it("should get project submissions", async () => {
			await service.submitProject(
				"test-project",
				"test-user",
				"code1",
				"javascript",
			);
			await service.submitProject(
				"test-project",
				"test-user",
				"code2",
				"javascript",
			);

			const submissions = service.getProjectSubmissions(
				"test-project",
				"test-user",
			);
			expect(submissions.length).toBe(2);
			expect(submissions[0].version).toBe(2); // Latest first
			expect(submissions[1].version).toBe(1);
		});
	});

	describe("Project Results", () => {
		it("should add project result", async () => {
			const submission = await service.submitProject(
				"test-project",
				"test-user",
				"code",
				"javascript",
			);

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
				criteriaResults: [],
				strengths: ["Good work"],
				weaknesses: ["Could improve"],
				suggestions: ["Practice more"],
				complexity: "intermediate",
				processingTime: 1000,
				gradedAt: new Date().toISOString(),
			};

			const result = await service.addProjectResult(
				submission.id,
				mockGradingResult,
				1500,
			);

			expect(result).toBeDefined();
			expect(result.submissionId).toBe(submission.id);
			expect(result.score).toBe(85);
			expect(result.passed).toBe(true);
			expect(result.grade).toBe("B");
			expect(result.feedback).toBeDefined();
		});

		it("should get project results", async () => {
			const submission = await service.submitProject(
				"test-project",
				"test-user",
				"code",
				"javascript",
			);

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
				criteriaResults: [],
				strengths: ["Good work"],
				weaknesses: ["Could improve"],
				suggestions: ["Practice more"],
				complexity: "intermediate",
				processingTime: 1000,
				gradedAt: new Date().toISOString(),
			};

			await service.addProjectResult(submission.id, mockGradingResult, 1500);

			const results = service.getProjectResults("test-project", "test-user");
			expect(results.length).toBe(1);
			expect(results[0].score).toBe(85);
		});

		it("should get best result", async () => {
			const submission1 = await service.submitProject(
				"test-project",
				"test-user",
				"code1",
				"javascript",
			);
			const submission2 = await service.submitProject(
				"test-project",
				"test-user",
				"code2",
				"javascript",
			);

			const mockGradingResult1: OverallGradingResult = {
				rubricId: "test-rubric",
				totalScore: 70,
				maxScore: 100,
				percentage: 70,
				passed: true,
				grade: "C",
				categoryScores: {
					functionality: 30,
					codeQuality: 25,
					bestPractices: 15,
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

			const mockGradingResult2: OverallGradingResult = {
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

			await service.addProjectResult(submission1.id, mockGradingResult1, 1500);
			await service.addProjectResult(submission2.id, mockGradingResult2, 1500);

			const bestResult = service.getBestResult("test-project", "test-user");
			expect(bestResult).toBeDefined();
			expect(bestResult?.score).toBe(90);
		});
	});

	describe("Project History", () => {
		it("should get project history", async () => {
			const submission = await service.submitProject(
				"test-project",
				"test-user",
				"code",
				"javascript",
			);

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
				criteriaResults: [],
				strengths: ["Good work"],
				weaknesses: ["Could improve"],
				suggestions: ["Practice more"],
				complexity: "intermediate",
				processingTime: 1000,
				gradedAt: new Date().toISOString(),
			};

			await service.addProjectResult(submission.id, mockGradingResult, 1500);

			const history = service.getProjectHistory("test-project", "test-user");
			expect(history).toBeDefined();
			expect(history?.projectId).toBe("test-project");
			expect(history?.userId).toBe("test-user");
			expect(history?.submissions.length).toBe(1);
			expect(history?.results.length).toBe(1);
			expect(history?.bestScore).toBe(85);
			expect(history?.attempts).toBe(1);
		});

		it("should track improvement trend", async () => {
			// Submit multiple projects with improving scores
			const submission1 = await service.submitProject(
				"test-project",
				"test-user",
				"code1",
				"javascript",
			);
			const submission2 = await service.submitProject(
				"test-project",
				"test-user",
				"code2",
				"javascript",
			);

			const mockGradingResult1: OverallGradingResult = {
				rubricId: "test-rubric",
				totalScore: 70,
				maxScore: 100,
				percentage: 70,
				passed: true,
				grade: "C",
				categoryScores: {
					functionality: 30,
					codeQuality: 25,
					bestPractices: 15,
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

			const mockGradingResult2: OverallGradingResult = {
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

			await service.addProjectResult(submission1.id, mockGradingResult1, 1500);
			await service.addProjectResult(submission2.id, mockGradingResult2, 1500);

			const history = service.getProjectHistory("test-project", "test-user");
			expect(history?.improvementTrend).toBe("improving");
		});
	});

	describe("Resubmission", () => {
		it("should resubmit project", async () => {
			const originalSubmission = await service.submitProject(
				"test-project",
				"test-user",
				"code1",
				"javascript",
			);

			const resubmission = await service.resubmitProject(
				originalSubmission.id,
				"code2",
				[],
				{ resubmission: true },
			);

			expect(resubmission.projectId).toBe("test-project");
			expect(resubmission.userId).toBe("test-user");
			expect(resubmission.version).toBe(2);
			expect(resubmission.metadata.resubmission).toBe(true);
			expect(resubmission.metadata.originalSubmissionId).toBe(
				originalSubmission.id,
			);
		});

		it("should handle resubmission with non-existent original", async () => {
			await expect(
				service.resubmitProject("non-existent", "code", []),
			).rejects.toThrow("Original submission not found");
		});
	});

	describe("Submission Comparison", () => {
		it("should compare two submissions", async () => {
			const submission1 = await service.submitProject(
				"test-project",
				"test-user",
				"code1",
				"javascript",
			);
			const submission2 = await service.submitProject(
				"test-project",
				"test-user",
				"code2",
				"javascript",
			);

			const mockGradingResult1: OverallGradingResult = {
				rubricId: "test-rubric",
				totalScore: 70,
				maxScore: 100,
				percentage: 70,
				passed: true,
				grade: "C",
				categoryScores: {
					functionality: 30,
					codeQuality: 25,
					bestPractices: 15,
					performance: 0,
					security: 0,
					documentation: 0,
				},
				criteriaResults: [
					{
						criteriaId: "func-1",
						category: "functionality",
						score: 30,
						maxScore: 40,
						percentage: 75,
						feedback: "Good functionality",
						suggestions: [],
						evidence: [],
					},
				],
				strengths: ["Good work"],
				weaknesses: ["Could improve"],
				suggestions: ["Practice more"],
				complexity: "intermediate",
				processingTime: 1000,
				gradedAt: new Date().toISOString(),
			};

			const mockGradingResult2: OverallGradingResult = {
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
				strengths: ["Excellent work"],
				weaknesses: [],
				suggestions: [],
				complexity: "intermediate",
				processingTime: 1000,
				gradedAt: new Date().toISOString(),
			};

			await service.addProjectResult(submission1.id, mockGradingResult1, 1500);
			await service.addProjectResult(submission2.id, mockGradingResult2, 1500);

			const comparison = service.compareSubmissions(
				submission1.id,
				submission2.id,
			);
			expect(comparison).toBeDefined();
			expect(comparison?.improvements.score).toBe(20);
			expect(comparison?.improvements.percentage).toBe(20);
			expect(comparison?.improvements.areas.length).toBeGreaterThan(0);
		});

		it("should handle comparison with missing data", () => {
			const comparison = service.compareSubmissions(
				"non-existent-1",
				"non-existent-2",
			);
			expect(comparison).toBeNull();
		});
	});

	describe("Statistics", () => {
		it("should get submission statistics", async () => {
			const submission1 = await service.submitProject(
				"test-project",
				"test-user",
				"code1",
				"javascript",
			);
			const submission2 = await service.submitProject(
				"test-project",
				"test-user",
				"code2",
				"javascript",
			);

			const mockGradingResult1: OverallGradingResult = {
				rubricId: "test-rubric",
				totalScore: 70,
				maxScore: 100,
				percentage: 70,
				passed: true,
				grade: "C",
				categoryScores: {
					functionality: 30,
					codeQuality: 25,
					bestPractices: 15,
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

			const mockGradingResult2: OverallGradingResult = {
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

			await service.addProjectResult(submission1.id, mockGradingResult1, 1500);
			await service.addProjectResult(submission2.id, mockGradingResult2, 1500);

			const stats = service.getSubmissionStats("test-project", "test-user");
			expect(stats.totalSubmissions).toBe(2);
			expect(stats.averageScore).toBe(80);
			expect(stats.bestScore).toBe(90);
			expect(stats.successRate).toBe(100);
		});

		it("should get user progress", async () => {
			const submission1 = await service.submitProject(
				"project-1",
				"test-user",
				"code1",
				"javascript",
			);
			const submission2 = await service.submitProject(
				"project-2",
				"test-user",
				"code2",
				"javascript",
			);

			const mockGradingResult1: OverallGradingResult = {
				rubricId: "test-rubric",
				totalScore: 70,
				maxScore: 100,
				percentage: 70,
				passed: true,
				grade: "C",
				categoryScores: {
					functionality: 30,
					codeQuality: 25,
					bestPractices: 15,
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

			const mockGradingResult2: OverallGradingResult = {
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

			await service.addProjectResult(submission1.id, mockGradingResult1, 1500);
			await service.addProjectResult(submission2.id, mockGradingResult2, 1500);

			const progress = service.getUserProgress("test-user");
			expect(progress.totalProjects).toBe(2);
			expect(progress.completedProjects).toBe(2);
			expect(progress.averageScore).toBe(80);
			expect(progress.bestScore).toBe(90);
			expect(progress.totalSubmissions).toBe(2);
			expect(progress.recentActivity.length).toBe(2);
		});
	});

	describe("Status Management", () => {
		it("should update submission status", async () => {
			const submission = await service.submitProject(
				"test-project",
				"test-user",
				"code",
				"javascript",
			);

			service.updateSubmissionStatus(submission.id, "processing");

			const updated = service.getSubmission(submission.id);
			expect(updated?.status).toBe("processing");
		});
	});

	describe("Data Management", () => {
		it("should delete submission", async () => {
			const submission = await service.submitProject(
				"test-project",
				"test-user",
				"code",
				"javascript",
			);

			const deleted = service.deleteSubmission(submission.id);
			expect(deleted).toBe(true);

			const retrieved = service.getSubmission(submission.id);
			expect(retrieved).toBeUndefined();
		});

		it("should export project history", async () => {
			const submission = await service.submitProject(
				"test-project",
				"test-user",
				"code",
				"javascript",
			);

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
				criteriaResults: [],
				strengths: ["Good work"],
				weaknesses: ["Could improve"],
				suggestions: ["Practice more"],
				complexity: "intermediate",
				processingTime: 1000,
				gradedAt: new Date().toISOString(),
			};

			await service.addProjectResult(submission.id, mockGradingResult, 1500);

			const exported = service.exportProjectHistory(
				"test-project",
				"test-user",
			);
			expect(exported).toBeDefined();
			expect(typeof exported).toBe("string");

			const parsed = JSON.parse(exported!);
			expect(parsed.projectId).toBe("test-project");
			expect(parsed.userId).toBe("test-user");
		});

		it("should import project history", async () => {
			const submission = await service.submitProject(
				"test-project",
				"test-user",
				"code",
				"javascript",
			);

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
				criteriaResults: [],
				strengths: ["Good work"],
				weaknesses: ["Could improve"],
				suggestions: ["Practice more"],
				complexity: "intermediate",
				processingTime: 1000,
				gradedAt: new Date().toISOString(),
			};

			await service.addProjectResult(submission.id, mockGradingResult, 1500);

			const exported = service.exportProjectHistory(
				"test-project",
				"test-user",
			);
			expect(exported).toBeDefined();

			// Clear service and import
			service.clear();
			const imported = service.importProjectHistory(exported!);
			expect(imported).toBe(true);

			const history = service.getProjectHistory("test-project", "test-user");
			expect(history).toBeDefined();
			expect(history?.projectId).toBe("test-project");
		});

		it("should handle invalid import", () => {
			const result = service.importProjectHistory("invalid json");
			expect(result).toBe(false);
		});
	});

	describe("Error Handling", () => {
		it("should handle non-existent submission", () => {
			const submission = service.getSubmission("non-existent");
			expect(submission).toBeUndefined();
		});

		it("should handle non-existent result", () => {
			const result = service.getResult("non-existent");
			expect(result).toBeUndefined();
		});

		it("should handle non-existent history", () => {
			const history = service.getProjectHistory("non-existent", "non-existent");
			expect(history).toBeUndefined();
		});
	});

	describe("Singleton Instance", () => {
		it("should provide singleton instance", () => {
			expect(projectHistoryService).toBeInstanceOf(ProjectHistoryService);
		});
	});
});
