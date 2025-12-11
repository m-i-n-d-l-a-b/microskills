import { handleError } from "@/utils/errorHandling";
import { llmService } from "./llmService";
import {
	rubricService,
	type OverallGradingResult,
	type GradingResult,
} from "./rubricService";

// Feedback types
export type FeedbackType =
	| "encouraging"
	| "constructive"
	| "detailed"
	| "actionable";

// Feedback template interface
export interface FeedbackTemplate {
	id: string;
	name: string;
	type: FeedbackType;
	language: string;
	difficulty: "beginner" | "intermediate" | "advanced";
	scoreRanges: {
		min: number;
		max: number;
		template: string;
		suggestions: string[];
	}[];
	createdAt: string;
	updatedAt: string;
}

// Personalized feedback interface
export interface PersonalizedFeedback {
	id: string;
	projectId: string;
	userId: string;
	score: number;
	grade: string;
	feedback: string;
	suggestions: string[];
	strengths: string[];
	weaknesses: string[];
	nextSteps: string[];
	motivationalMessage: string;
	learningPath: {
		currentLevel: string;
		nextLevel: string;
		recommendedTopics: string[];
	};
	generatedAt: string;
	metadata?: Record<string, any>;
}

// Feedback generation request interface
export interface FeedbackGenerationRequest {
	projectId: string;
	userId: string;
	code: string;
	language: string;
	gradingResult: OverallGradingResult;
	userHistory?: {
		previousScores: number[];
		completedProjects: number;
		averageScore: number;
		strengths: string[];
		weaknesses: string[];
	};
	preferences?: {
		feedbackStyle: FeedbackType;
		detailLevel: "basic" | "detailed" | "comprehensive";
		focusAreas: string[];
	};
}

// Feedback Service class
export class FeedbackService {
	private templates: Map<string, FeedbackTemplate> = new Map();
	private defaultTemplates: FeedbackTemplate[] = [];

	constructor() {
		this.initializeDefaultTemplates();
	}

	/**
	 * Initialize default feedback templates
	 */
	private initializeDefaultTemplates(): void {
		// Encouraging template for beginners
		const encouragingTemplate: FeedbackTemplate = {
			id: "encouraging-beginner",
			name: "Encouraging Feedback for Beginners",
			type: "encouraging",
			language: "all",
			difficulty: "beginner",
			scoreRanges: [
				{
					min: 90,
					max: 100,
					template:
						"🎉 Outstanding work! You've demonstrated excellent understanding of the concepts. Your code is clean, well-structured, and shows great attention to detail. Keep up this fantastic work!",
					suggestions: [
						"Try adding some advanced features to challenge yourself",
						"Consider exploring related topics to expand your knowledge",
						"Share your code with others to get different perspectives",
					],
				},
				{
					min: 80,
					max: 89,
					template:
						"Great job! You've successfully implemented the core requirements and your code shows good understanding of the fundamentals. You're making excellent progress!",
					suggestions: [
						"Review the feedback to identify areas for improvement",
						"Practice the concepts you learned in this project",
						"Try implementing additional features to enhance your skills",
					],
				},
				{
					min: 70,
					max: 79,
					template:
						"Good effort! You've completed the main requirements and your code is working. With a bit more practice, you'll be able to tackle more complex challenges.",
					suggestions: [
						"Focus on the areas mentioned in the feedback",
						"Review the lesson materials to strengthen your understanding",
						"Practice similar problems to build confidence",
					],
				},
				{
					min: 60,
					max: 69,
					template:
						"You're on the right track! Your code shows understanding of the basic concepts. Don't get discouraged - every programmer faces challenges. Keep practicing!",
					suggestions: [
						"Take time to understand the feedback thoroughly",
						"Review the lesson materials and examples",
						"Ask for help if you're stuck on specific concepts",
					],
				},
				{
					min: 0,
					max: 59,
					template:
						"Don't worry! Learning to code takes time and practice. Your attempt shows you're willing to learn. Let's work together to improve your understanding.",
					suggestions: [
						"Start with the fundamentals and build up gradually",
						"Review the lesson materials step by step",
						"Don't hesitate to ask questions and seek help",
					],
				},
			],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		// Constructive template for intermediate learners
		const constructiveTemplate: FeedbackTemplate = {
			id: "constructive-intermediate",
			name: "Constructive Feedback for Intermediate Learners",
			type: "constructive",
			language: "all",
			difficulty: "intermediate",
			scoreRanges: [
				{
					min: 90,
					max: 100,
					template:
						"Excellent work! Your code demonstrates advanced understanding and follows best practices. You're ready to tackle more complex challenges.",
					suggestions: [
						"Consider optimizing your code for performance",
						"Explore design patterns and advanced concepts",
						"Mentor others to reinforce your knowledge",
					],
				},
				{
					min: 80,
					max: 89,
					template:
						"Very good work! Your implementation is solid and shows good understanding. There are a few areas where you can enhance your code further.",
					suggestions: [
						"Focus on the specific areas mentioned in the feedback",
						"Practice refactoring to improve code quality",
						"Study advanced language features",
					],
				},
				{
					min: 70,
					max: 79,
					template:
						"Good work! Your code meets the requirements and shows understanding. With some refinements, you can achieve even better results.",
					suggestions: [
						"Review the feedback carefully and implement the suggestions",
						"Practice writing cleaner, more maintainable code",
						"Study best practices for your programming language",
					],
				},
				{
					min: 60,
					max: 69,
					template:
						"You're making progress! Your code works but needs some improvements. Focus on the fundamentals and best practices.",
					suggestions: [
						"Review the lesson materials and examples",
						"Practice the concepts you're struggling with",
						"Seek feedback from more experienced developers",
					],
				},
				{
					min: 0,
					max: 59,
					template:
						"Keep going! Learning programming is a journey. Your attempt shows you're learning. Let's identify the key areas to focus on.",
					suggestions: [
						"Break down the problem into smaller parts",
						"Review the fundamentals step by step",
						"Practice with simpler examples first",
					],
				},
			],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		this.defaultTemplates = [encouragingTemplate, constructiveTemplate];
		this.defaultTemplates.forEach((template) => {
			this.templates.set(template.id, template);
		});
	}

	/**
	 * Generate personalized feedback
	 */
	async generateFeedback(
		request: FeedbackGenerationRequest,
	): Promise<PersonalizedFeedback> {
		try {
			const { gradingResult, userHistory, preferences } = request;

			// Get appropriate template
			const template = this.getTemplateForUser(
				preferences?.feedbackStyle || "encouraging",
				gradingResult.complexity,
			);

			// Generate base feedback using template
			const baseFeedback = this.generateBaseFeedback(template, gradingResult);

			// Enhance with AI-generated insights
			const enhancedFeedback = await this.enhanceWithAI(request, baseFeedback);

			// Generate learning path
			const learningPath = this.generateLearningPath(
				gradingResult,
				userHistory,
			);

			// Create motivational message
			const motivationalMessage = this.generateMotivationalMessage(
				gradingResult,
				userHistory,
			);

			return {
				id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				projectId: request.projectId,
				userId: request.userId,
				score: gradingResult.totalScore,
				grade: gradingResult.grade,
				feedback: enhancedFeedback.feedback,
				suggestions: enhancedFeedback.suggestions,
				strengths: gradingResult.strengths,
				weaknesses: gradingResult.weaknesses,
				nextSteps: enhancedFeedback.nextSteps,
				motivationalMessage,
				learningPath,
				generatedAt: new Date().toISOString(),
				metadata: {
					template: template.id,
					complexity: gradingResult.complexity,
					processingTime: gradingResult.processingTime,
				},
			};
		} catch (error: any) {
			handleError(error, {
				action: "generate-feedback",
				projectId: request.projectId,
			});
			throw error;
		}
	}

	/**
	 * Get appropriate template for user
	 */
	private getTemplateForUser(
		style: FeedbackType,
		complexity: string,
	): FeedbackTemplate {
		const difficulty = complexity as "beginner" | "intermediate" | "advanced";

		// Find template that matches style and difficulty
		const template = this.defaultTemplates.find(
			(t) => t.type === style && t.difficulty === difficulty,
		);

		// Fallback to encouraging template if not found
		return template || this.defaultTemplates[0];
	}

	/**
	 * Generate base feedback using template
	 */
	private generateBaseFeedback(
		template: FeedbackTemplate,
		gradingResult: OverallGradingResult,
	): {
		feedback: string;
		suggestions: string[];
	} {
		const percentage = gradingResult.percentage;

		// Find appropriate score range
		const scoreRange =
			template.scoreRanges.find(
				(range) => percentage >= range.min && percentage <= range.max,
			) || template.scoreRanges[template.scoreRanges.length - 1];

		// Customize template with specific details
		let feedback = scoreRange.template;

		// Add specific strengths if available
		if (gradingResult.strengths.length > 0) {
			feedback += `\n\nYour strengths include: ${gradingResult.strengths.slice(0, 2).join(", ")}.`;
		}

		// Add specific areas for improvement
		if (gradingResult.weaknesses.length > 0) {
			feedback += `\n\nAreas to focus on: ${gradingResult.weaknesses.slice(0, 2).join(", ")}.`;
		}

		return {
			feedback,
			suggestions: scoreRange.suggestions,
		};
	}

	/**
	 * Enhance feedback with AI-generated insights
	 */
	private async enhanceWithAI(
		request: FeedbackGenerationRequest,
		baseFeedback: { feedback: string; suggestions: string[] },
	): Promise<{
		feedback: string;
		suggestions: string[];
		nextSteps: string[];
	}> {
		try {
			const { code, language, gradingResult, userHistory } = request;

			// Generate AI-enhanced feedback
			const aiFeedback = await llmService.generateFeedback(
				code,
				language,
				gradingResult.totalScore,
				gradingResult.criteriaResults.map((cr) => ({
					id: cr.criteriaId,
					type: "info",
					message: cr.feedback,
					severity:
						cr.percentage >= 80
							? "low"
							: cr.percentage >= 60
								? "medium"
								: "high",
					category: cr.category,
				})),
			);

			// Combine base feedback with AI insights
			const enhancedFeedback = `${baseFeedback.feedback}\n\n${aiFeedback}`;

			// Generate specific next steps based on weaknesses
			const nextSteps = this.generateNextSteps(gradingResult, userHistory);

			// Enhance suggestions with AI insights
			const enhancedSuggestions = [
				...baseFeedback.suggestions,
				...this.generateSpecificSuggestions(gradingResult, language),
			];

			return {
				feedback: enhancedFeedback,
				suggestions: enhancedSuggestions,
				nextSteps,
			};
		} catch (error: any) {
			// Fallback to base feedback if AI enhancement fails
			handleError(error, { action: "enhance-feedback-ai" });
			return {
				feedback: baseFeedback.feedback,
				suggestions: baseFeedback.suggestions,
				nextSteps: this.generateNextSteps(
					request.gradingResult,
					request.userHistory,
				),
			};
		}
	}

	/**
	 * Generate specific next steps
	 */
	private generateNextSteps(
		gradingResult: OverallGradingResult,
		userHistory?: FeedbackGenerationRequest["userHistory"],
	): string[] {
		const nextSteps: string[] = [];

		// Based on weaknesses
		gradingResult.weaknesses.forEach((weakness) => {
			if (weakness.includes("functionality")) {
				nextSteps.push("Practice implementing core features step by step");
			} else if (weakness.includes("quality")) {
				nextSteps.push("Focus on writing cleaner, more readable code");
			} else if (weakness.includes("practices")) {
				nextSteps.push(
					"Study and apply best practices for your programming language",
				);
			}
		});

		// Based on user history
		if (userHistory) {
			if (userHistory.averageScore < 70) {
				nextSteps.push(
					"Review fundamental concepts before moving to advanced topics",
				);
			} else if (userHistory.completedProjects < 5) {
				nextSteps.push(
					"Complete more projects to build confidence and experience",
				);
			}
		}

		// General next steps
		if (nextSteps.length === 0) {
			nextSteps.push("Practice similar problems to reinforce your learning");
			nextSteps.push(
				"Review the lesson materials to deepen your understanding",
			);
		}

		return nextSteps.slice(0, 3); // Limit to 3 next steps
	}

	/**
	 * Generate specific suggestions based on grading results
	 */
	private generateSpecificSuggestions(
		gradingResult: OverallGradingResult,
		language: string,
	): string[] {
		const suggestions: string[] = [];

		gradingResult.criteriaResults.forEach((criteria) => {
			if (criteria.percentage < 70) {
				switch (criteria.category) {
					case "functionality":
						suggestions.push(
							"Break down the problem into smaller, manageable functions",
						);
						break;
					case "codeQuality":
						suggestions.push(
							"Use more descriptive variable and function names",
						);
						break;
					case "bestPractices":
						if (language === "javascript") {
							suggestions.push(
								"Use const/let instead of var, and add error handling",
							);
						} else if (language === "python") {
							suggestions.push(
								"Follow PEP 8 style guidelines and add docstrings",
							);
						}
						break;
				}
			}
		});

		return suggestions.slice(0, 3); // Limit to 3 suggestions
	}

	/**
	 * Generate learning path
	 */
	private generateLearningPath(
		gradingResult: OverallGradingResult,
		userHistory?: FeedbackGenerationRequest["userHistory"],
	): PersonalizedFeedback["learningPath"] {
		const currentLevel = gradingResult.complexity;
		let nextLevel: string;
		let recommendedTopics: string[] = [];

		// Determine next level
		switch (currentLevel) {
			case "beginner":
				nextLevel = "intermediate";
				recommendedTopics = [
					"Error handling and debugging",
					"Data structures and algorithms",
					"Code organization and modularity",
				];
				break;
			case "intermediate":
				nextLevel = "advanced";
				recommendedTopics = [
					"Design patterns",
					"Performance optimization",
					"Testing and debugging strategies",
				];
				break;
			case "advanced":
				nextLevel = "expert";
				recommendedTopics = [
					"System design",
					"Advanced algorithms",
					"Code architecture and scalability",
				];
				break;
			default:
				nextLevel = "intermediate";
				recommendedTopics = ["Core programming concepts"];
		}

		// Adjust based on performance
		if (gradingResult.percentage < 70) {
			recommendedTopics = [
				"Review fundamental concepts",
				"Practice basic programming skills",
				"Build confidence with simpler projects",
			];
		}

		return {
			currentLevel,
			nextLevel,
			recommendedTopics,
		};
	}

	/**
	 * Generate motivational message
	 */
	private generateMotivationalMessage(
		gradingResult: OverallGradingResult,
		userHistory?: FeedbackGenerationRequest["userHistory"],
	): string {
		const score = gradingResult.percentage;

		if (score >= 90) {
			return "You're doing amazing! Keep pushing your boundaries and exploring new challenges.";
		} else if (score >= 80) {
			return "Great progress! You're building a solid foundation. Keep up the excellent work!";
		} else if (score >= 70) {
			return "You're on the right track! Every challenge is an opportunity to grow. Keep learning!";
		} else if (score >= 60) {
			return "Don't give up! Learning to code is a journey, and you're making progress. Keep practicing!";
		} else {
			return "Remember, every expert was once a beginner. Your persistence will pay off. Keep going!";
		}
	}

	/**
	 * Get feedback template by ID
	 */
	getTemplate(templateId: string): FeedbackTemplate | undefined {
		return this.templates.get(templateId);
	}

	/**
	 * List all feedback templates
	 */
	listTemplates(): FeedbackTemplate[] {
		return Array.from(this.templates.values());
	}

	/**
	 * Create custom feedback template
	 */
	createTemplate(
		template: Omit<FeedbackTemplate, "id" | "createdAt" | "updatedAt">,
	): FeedbackTemplate {
		const newTemplate: FeedbackTemplate = {
			...template,
			id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		this.templates.set(newTemplate.id, newTemplate);
		return newTemplate;
	}

	/**
	 * Update existing template
	 */
	updateTemplate(
		templateId: string,
		updates: Partial<FeedbackTemplate>,
	): FeedbackTemplate | undefined {
		const template = this.templates.get(templateId);
		if (!template) return undefined;

		const updatedTemplate: FeedbackTemplate = {
			...template,
			...updates,
			updatedAt: new Date().toISOString(),
		};

		this.templates.set(templateId, updatedTemplate);
		return updatedTemplate;
	}

	/**
	 * Delete template
	 */
	deleteTemplate(templateId: string): boolean {
		return this.templates.delete(templateId);
	}

	/**
	 * Analyze feedback patterns
	 */
	analyzeFeedbackPatterns(feedbacks: PersonalizedFeedback[]): {
		averageScore: number;
		commonStrengths: string[];
		commonWeaknesses: string[];
		improvementTrend: "improving" | "stable" | "declining";
	} {
		if (feedbacks.length === 0) {
			return {
				averageScore: 0,
				commonStrengths: [],
				commonWeaknesses: [],
				improvementTrend: "stable",
			};
		}

		const scores = feedbacks.map((f) => f.score);
		const averageScore =
			scores.reduce((sum, score) => sum + score, 0) / scores.length;

		// Find common strengths and weaknesses
		const allStrengths = feedbacks.flatMap((f) => f.strengths);
		const allWeaknesses = feedbacks.flatMap((f) => f.weaknesses);

		const strengthCounts = this.countOccurrences(allStrengths);
		const weaknessCounts = this.countOccurrences(allWeaknesses);

		const commonStrengths = Object.entries(strengthCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 3)
			.map(([strength]) => strength);

		const commonWeaknesses = Object.entries(weaknessCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 3)
			.map(([weakness]) => weakness);

		// Determine improvement trend
		const recentScores = scores.slice(-5); // Last 5 scores
		const olderScores = scores.slice(0, -5); // Previous scores

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
			averageScore: Math.round(averageScore),
			commonStrengths,
			commonWeaknesses,
			improvementTrend,
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
	 * Export feedback template
	 */
	exportTemplate(templateId: string): string | null {
		const template = this.getTemplate(templateId);
		return template ? JSON.stringify(template, null, 2) : null;
	}

	/**
	 * Import feedback template
	 */
	importTemplate(templateJson: string): FeedbackTemplate | null {
		try {
			const template = JSON.parse(templateJson) as FeedbackTemplate;

			// Generate new ID to avoid conflicts
			template.id = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			template.createdAt = new Date().toISOString();
			template.updatedAt = new Date().toISOString();

			this.templates.set(template.id, template);
			return template;
		} catch (error: any) {
			handleError(error, { action: "import-feedback-template" });
			return null;
		}
	}
}

// Export singleton instance
export const feedbackService = new FeedbackService();

// Export for testing
export default FeedbackService;
