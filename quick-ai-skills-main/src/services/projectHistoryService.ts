import { handleError } from "@/utils/errorHandling";
import { rubricService, type OverallGradingResult } from "./rubricService";
import { feedbackService, type PersonalizedFeedback } from "./feedbackService";

// Project submission interface
export interface ProjectSubmission {
	id: string;
	projectId: string;
	userId: string;
	version: number;
	code: string;
	language: string;
	files: ProjectFile[];
	metadata: Record<string, any>;
	submittedAt: string;
	status: "pending" | "processing" | "completed" | "failed";
}

// Project file interface
export interface ProjectFile {
	id: string;
	name: string;
	content: string;
	type: "code" | "documentation" | "test" | "config";
	size: number;
	path?: string;
}

// Project result interface
export interface ProjectResult {
	id: string;
	submissionId: string;
	projectId: string;
	userId: string;
	score: number;
	percentage: number;
	passed: boolean;
	grade: string;
	feedback: PersonalizedFeedback;
	gradingResult: OverallGradingResult;
	processingTime: number;
	evaluatedAt: string;
	metadata?: Record<string, any>;
}

// Project history interface
export interface ProjectHistory {
	projectId: string;
	userId: string;
	submissions: ProjectSubmission[];
	results: ProjectResult[];
	bestScore: number;
	attempts: number;
	firstSubmittedAt: string;
	lastSubmittedAt: string;
	averageScore: number;
	improvementTrend: "improving" | "stable" | "declining";
}

// Project comparison interface
export interface ProjectComparison {
	submission1: ProjectSubmission;
	submission2: ProjectSubmission;
	result1: ProjectResult;
	result2: ProjectResult;
	improvements: {
		score: number;
		percentage: number;
		areas: string[];
	};
	regressions: {
		score: number;
		percentage: number;
		areas: string[];
	};
	unchanged: string[];
}

// Project History Service class
export class ProjectHistoryService {
	private submissions: Map<string, ProjectSubmission> = new Map();
	private results: Map<string, ProjectResult> = new Map();
	private histories: Map<string, ProjectHistory> = new Map();

	/**
	 * Submit a new project
	 */
	async submitProject(
		projectId: string,
		userId: string,
		code: string,
		language: string,
		files: ProjectFile[] = [],
		metadata: Record<string, any> = {},
	): Promise<ProjectSubmission> {
		try {
			// Get current version for this project
			const currentVersion = this.getCurrentVersion(projectId, userId);
			const newVersion = currentVersion + 1;

			const submission: ProjectSubmission = {
				id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				projectId,
				userId,
				version: newVersion,
				code,
				language,
				files,
				metadata: {
					...metadata,
					submittedAt: new Date().toISOString(),
					version: newVersion,
				},
				submittedAt: new Date().toISOString(),
				status: "pending",
			};

			this.submissions.set(submission.id, submission);
			this.updateProjectHistory(projectId, userId, submission);

			return submission;
		} catch (error: any) {
			handleError(error, { action: "submit-project", projectId, userId });
			throw error;
		}
	}

	/**
	 * Get project submission by ID
	 */
	getSubmission(submissionId: string): ProjectSubmission | undefined {
		return this.submissions.get(submissionId);
	}

	/**
	 * Get project result by ID
	 */
	getResult(resultId: string): ProjectResult | undefined {
		return this.results.get(resultId);
	}

	/**
	 * Get project history
	 */
	getProjectHistory(
		projectId: string,
		userId: string,
	): ProjectHistory | undefined {
		const key = `${projectId}_${userId}`;
		return this.histories.get(key);
	}

	/**
	 * Get all submissions for a project
	 */
	getProjectSubmissions(
		projectId: string,
		userId: string,
	): ProjectSubmission[] {
		return Array.from(this.submissions.values())
			.filter((sub) => sub.projectId === projectId && sub.userId === userId)
			.sort((a, b) => b.version - a.version);
	}

	/**
	 * Get all results for a project
	 */
	getProjectResults(projectId: string, userId: string): ProjectResult[] {
		return Array.from(this.results.values())
			.filter(
				(result) => result.projectId === projectId && result.userId === userId,
			)
			.sort(
				(a, b) =>
					new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime(),
			);
	}

	/**
	 * Get best submission for a project
	 */
	getBestSubmission(
		projectId: string,
		userId: string,
	): ProjectSubmission | undefined {
		const results = this.getProjectResults(projectId, userId);
		if (results.length === 0) return undefined;

		const bestResult = results.reduce((best, current) =>
			current.score > best.score ? current : best,
		);

		return this.getSubmission(bestResult.submissionId);
	}

	/**
	 * Get best result for a project
	 */
	getBestResult(projectId: string, userId: string): ProjectResult | undefined {
		const results = this.getProjectResults(projectId, userId);
		if (results.length === 0) return undefined;

		return results.reduce((best, current) =>
			current.score > best.score ? current : best,
		);
	}

	/**
	 * Resubmit a project
	 */
	async resubmitProject(
		submissionId: string,
		code: string,
		files: ProjectFile[] = [],
		metadata: Record<string, any> = {},
	): Promise<ProjectSubmission> {
		try {
			const originalSubmission = this.getSubmission(submissionId);
			if (!originalSubmission) {
				throw new Error("Original submission not found");
			}

			// Create new submission with incremented version
			const newSubmission = await this.submitProject(
				originalSubmission.projectId,
				originalSubmission.userId,
				code,
				originalSubmission.language,
				files,
				{
					...metadata,
					originalSubmissionId: submissionId,
					resubmission: true,
				},
			);

			return newSubmission;
		} catch (error: any) {
			handleError(error, { action: "resubmit-project", submissionId });
			throw error;
		}
	}

	/**
	 * Compare two submissions
	 */
	compareSubmissions(
		submissionId1: string,
		submissionId2: string,
	): ProjectComparison | null {
		try {
			const submission1 = this.getSubmission(submissionId1);
			const submission2 = this.getSubmission(submissionId2);
			const result1 = this.getResultBySubmissionId(submissionId1);
			const result2 = this.getResultBySubmissionId(submissionId2);

			if (!submission1 || !submission2 || !result1 || !result2) {
				return null;
			}

			const scoreDiff = result2.score - result1.score;
			const percentageDiff = result2.percentage - result1.percentage;

			// Analyze improvements and regressions
			const improvements: string[] = [];
			const regressions: string[] = [];
			const unchanged: string[] = [];

			// Compare grading results
			result1.gradingResult.criteriaResults.forEach((criteria1) => {
				const criteria2 = result2.gradingResult.criteriaResults.find(
					(c) => c.criteriaId === criteria1.criteriaId,
				);
				if (criteria2) {
					if (criteria2.score > criteria1.score) {
						improvements.push(
							`${criteria1.category} (${criteria2.score - criteria1.score} points)`,
						);
					} else if (criteria2.score < criteria1.score) {
						regressions.push(
							`${criteria1.category} (${criteria1.score - criteria2.score} points)`,
						);
					} else {
						unchanged.push(criteria1.category);
					}
				}
			});

			return {
				submission1,
				submission2,
				result1,
				result2,
				improvements: {
					score: Math.max(0, scoreDiff),
					percentage: Math.max(0, percentageDiff),
					areas: improvements,
				},
				regressions: {
					score: Math.max(0, -scoreDiff),
					percentage: Math.max(0, -percentageDiff),
					areas: regressions,
				},
				unchanged,
			};
		} catch (error: any) {
			handleError(error, {
				action: "compare-submissions",
				submissionId1,
				submissionId2,
			});
			return null;
		}
	}

	/**
	 * Get submission statistics
	 */
	getSubmissionStats(
		projectId: string,
		userId: string,
	): {
		totalSubmissions: number;
		averageScore: number;
		bestScore: number;
		improvementTrend: "improving" | "stable" | "declining";
		averageAttemptsPerProject: number;
		successRate: number;
	} {
		const results = this.getProjectResults(projectId, userId);
		const submissions = this.getProjectSubmissions(projectId, userId);

		if (results.length === 0) {
			return {
				totalSubmissions: 0,
				averageScore: 0,
				bestScore: 0,
				improvementTrend: "stable",
				averageAttemptsPerProject: 0,
				successRate: 0,
			};
		}

		const scores = results.map((r) => r.score);
		const averageScore =
			scores.reduce((sum, score) => sum + score, 0) / scores.length;
		const bestScore = Math.max(...scores);
		const successRate =
			(results.filter((r) => r.passed).length / results.length) * 100;

		// Calculate improvement trend
		const recentScores = scores.slice(-3);
		const olderScores = scores.slice(0, -3);
		let improvementTrend: "improving" | "stable" | "declining" = "stable";

		if (recentScores.length > 0 && olderScores.length > 0) {
			const recentAvg =
				recentScores.reduce((sum, score) => sum + score, 0) /
				recentScores.length;
			const olderAvg =
				olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length;

			if (recentAvg > olderAvg + 5) {
				improvementTrend = "improving";
			} else if (recentAvg < olderAvg - 5) {
				improvementTrend = "declining";
			}
		}

		return {
			totalSubmissions: submissions.length,
			averageScore: Math.round(averageScore),
			bestScore,
			improvementTrend,
			averageAttemptsPerProject: submissions.length,
			successRate: Math.round(successRate),
		};
	}

	/**
	 * Get user progress across all projects
	 */
	getUserProgress(userId: string): {
		totalProjects: number;
		completedProjects: number;
		averageScore: number;
		bestScore: number;
		totalSubmissions: number;
		improvementTrend: "improving" | "stable" | "declining";
		recentActivity: {
			projectId: string;
			lastSubmittedAt: string;
			bestScore: number;
		}[];
	} {
		const allResults = Array.from(this.results.values()).filter(
			(r) => r.userId === userId,
		);
		const allSubmissions = Array.from(this.submissions.values()).filter(
			(s) => s.userId === userId,
		);

		if (allResults.length === 0) {
			return {
				totalProjects: 0,
				completedProjects: 0,
				averageScore: 0,
				bestScore: 0,
				totalSubmissions: 0,
				improvementTrend: "stable",
				recentActivity: [],
			};
		}

		const projectIds = new Set(allResults.map((r) => r.projectId));
		const completedProjects = Array.from(projectIds).filter((projectId) => {
			const projectResults = allResults.filter(
				(r) => r.projectId === projectId,
			);
			return projectResults.some((r) => r.passed);
		}).length;

		const scores = allResults.map((r) => r.score);
		const averageScore =
			scores.reduce((sum, score) => sum + score, 0) / scores.length;
		const bestScore = Math.max(...scores);

		// Calculate improvement trend
		const recentScores = scores.slice(-10);
		const olderScores = scores.slice(0, -10);
		let improvementTrend: "improving" | "stable" | "declining" = "stable";

		if (recentScores.length > 0 && olderScores.length > 0) {
			const recentAvg =
				recentScores.reduce((sum, score) => sum + score, 0) /
				recentScores.length;
			const olderAvg =
				olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length;

			if (recentAvg > olderAvg + 5) {
				improvementTrend = "improving";
			} else if (recentAvg < olderAvg - 5) {
				improvementTrend = "declining";
			}
		}

		// Get recent activity
		const recentActivity = Array.from(projectIds)
			.map((projectId) => {
				const projectSubmissions = allSubmissions.filter(
					(s) => s.projectId === projectId,
				);
				const projectResults = allResults.filter(
					(r) => r.projectId === projectId,
				);

				return {
					projectId,
					lastSubmittedAt: projectSubmissions[0]?.submittedAt || "",
					bestScore: Math.max(...projectResults.map((r) => r.score), 0),
				};
			})
			.sort(
				(a, b) =>
					new Date(b.lastSubmittedAt).getTime() -
					new Date(a.lastSubmittedAt).getTime(),
			)
			.slice(0, 5);

		return {
			totalProjects: projectIds.size,
			completedProjects,
			averageScore: Math.round(averageScore),
			bestScore,
			totalSubmissions: allSubmissions.length,
			improvementTrend,
			recentActivity,
		};
	}

	/**
	 * Update submission status
	 */
	updateSubmissionStatus(
		submissionId: string,
		status: ProjectSubmission["status"],
	): void {
		const submission = this.submissions.get(submissionId);
		if (submission) {
			submission.status = status;
			this.submissions.set(submissionId, submission);
		}
	}

	/**
	 * Add project result
	 */
	async addProjectResult(
		submissionId: string,
		gradingResult: OverallGradingResult,
		processingTime: number,
	): Promise<ProjectResult> {
		try {
			const submission = this.getSubmission(submissionId);
			if (!submission) {
				throw new Error("Submission not found");
			}

			// Generate personalized feedback
			const feedback = await feedbackService.generateFeedback({
				projectId: submission.projectId,
				userId: submission.userId,
				code: submission.code,
				language: submission.language,
				gradingResult,
				userHistory: this.getUserHistoryForFeedback(submission.userId),
			});

			const result: ProjectResult = {
				id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				submissionId,
				projectId: submission.projectId,
				userId: submission.userId,
				score: gradingResult.totalScore,
				percentage: gradingResult.percentage,
				passed: gradingResult.passed,
				grade: gradingResult.grade,
				feedback,
				gradingResult,
				processingTime,
				evaluatedAt: new Date().toISOString(),
				metadata: {
					model: gradingResult.gradingResult?.model,
					provider: gradingResult.gradingResult?.provider,
				},
			};

			this.results.set(result.id, result);
			this.updateProjectHistory(
				submission.projectId,
				submission.userId,
				undefined,
				result,
			);

			return result;
		} catch (error: any) {
			handleError(error, { action: "add-project-result", submissionId });
			throw error;
		}
	}

	/**
	 * Delete project submission and related data
	 */
	deleteSubmission(submissionId: string): boolean {
		const submission = this.submissions.get(submissionId);
		if (!submission) return false;

		// Delete submission
		this.submissions.delete(submissionId);

		// Delete related results
		const relatedResults = Array.from(this.results.values()).filter(
			(r) => r.submissionId === submissionId,
		);
		relatedResults.forEach((r) => this.results.delete(r.id));

		// Update project history
		this.updateProjectHistory(submission.projectId, submission.userId);

		return true;
	}

	/**
	 * Export project history
	 */
	exportProjectHistory(projectId: string, userId: string): string | null {
		const history = this.getProjectHistory(projectId, userId);
		if (!history) return null;

		return JSON.stringify(history, null, 2);
	}

	/**
	 * Import project history
	 */
	importProjectHistory(historyJson: string): boolean {
		try {
			const history = JSON.parse(historyJson) as ProjectHistory;

			// Import submissions
			history.submissions.forEach((submission) => {
				this.submissions.set(submission.id, submission);
			});

			// Import results
			history.results.forEach((result) => {
				this.results.set(result.id, result);
			});

			// Update history
			const key = `${history.projectId}_${history.userId}`;
			this.histories.set(key, history);

			return true;
		} catch (error: any) {
			handleError(error, { action: "import-project-history" });
			return false;
		}
	}

	/**
	 * Get current version for a project
	 */
	private getCurrentVersion(projectId: string, userId: string): number {
		const submissions = this.getProjectSubmissions(projectId, userId);
		return submissions.length > 0 ? submissions[0].version : 0;
	}

	/**
	 * Get result by submission ID
	 */
	private getResultBySubmissionId(
		submissionId: string,
	): ProjectResult | undefined {
		return Array.from(this.results.values()).find(
			(r) => r.submissionId === submissionId,
		);
	}

	/**
	 * Update project history
	 */
	private updateProjectHistory(
		projectId: string,
		userId: string,
		submission?: ProjectSubmission,
		result?: ProjectResult,
	): void {
		const key = `${projectId}_${userId}`;
		let history = this.histories.get(key);

		if (!history) {
			history = {
				projectId,
				userId,
				submissions: [],
				results: [],
				bestScore: 0,
				attempts: 0,
				firstSubmittedAt: "",
				lastSubmittedAt: "",
				averageScore: 0,
				improvementTrend: "stable",
			};
		}

		// Add submission if provided
		if (submission) {
			history.submissions.unshift(submission);
			history.attempts = history.submissions.length;
			history.lastSubmittedAt = submission.submittedAt;

			if (!history.firstSubmittedAt) {
				history.firstSubmittedAt = submission.submittedAt;
			}
		}

		// Add result if provided
		if (result) {
			history.results.unshift(result);
			history.bestScore = Math.max(history.bestScore, result.score);

			// Calculate average score
			const scores = history.results.map((r) => r.score);
			history.averageScore =
				scores.reduce((sum, score) => sum + score, 0) / scores.length;

			// Calculate improvement trend
			if (history.results.length >= 2) {
				// For 2 results, compare the latest (index 0) with the previous (index 1)
				const latestScore = history.results[0].score;
				const previousScore = history.results[1].score;

				if (latestScore > previousScore + 1) {
					history.improvementTrend = "improving";
				} else if (latestScore < previousScore - 1) {
					history.improvementTrend = "declining";
				} else {
					history.improvementTrend = "stable";
				}
			}
		}

		this.histories.set(key, history);
	}

	/**
	 * Get user history for feedback generation
	 */
	private getUserHistoryForFeedback(userId: string): {
		previousScores: number[];
		completedProjects: number;
		averageScore: number;
		strengths: string[];
		weaknesses: string[];
	} {
		const allResults = Array.from(this.results.values()).filter(
			(r) => r.userId === userId,
		);

		if (allResults.length === 0) {
			return {
				previousScores: [],
				completedProjects: 0,
				averageScore: 0,
				strengths: [],
				weaknesses: [],
			};
		}

		const scores = allResults.map((r) => r.score);
		const completedProjects = allResults.filter((r) => r.passed).length;
		const averageScore =
			scores.reduce((sum, score) => sum + score, 0) / scores.length;

		// Extract common strengths and weaknesses from feedback
		const allStrengths = allResults.flatMap((r) => r.feedback.strengths);
		const allWeaknesses = allResults.flatMap((r) => r.feedback.weaknesses);

		const strengthCounts = this.countOccurrences(allStrengths);
		const weaknessCounts = this.countOccurrences(allWeaknesses);

		const strengths = Object.entries(strengthCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 3)
			.map(([strength]) => strength);

		const weaknesses = Object.entries(weaknessCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 3)
			.map(([weakness]) => weakness);

		return {
			previousScores: scores,
			completedProjects,
			averageScore: Math.round(averageScore),
			strengths,
			weaknesses,
		};
	}

	/**
	 * Count occurrences in array
	 */
	private countOccurrences(items: string[]): Record<string, number> {
		return items.reduce(
			(counts, item) => {
				counts[item] = (counts[item] || 0) + 1;
				return counts;
			},
			{} as Record<string, number>,
		);
	}

	/**
	 * Clear all data (for testing)
	 */
	clear(): void {
		this.submissions.clear();
		this.results.clear();
		this.histories.clear();
	}
}

// Export singleton instance
export const projectHistoryService = new ProjectHistoryService();

// Export for testing
export default ProjectHistoryService;
