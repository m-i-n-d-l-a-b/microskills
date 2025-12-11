import { handleError } from "@/utils/errorHandling";

// Rubric criteria types
export type RubricCategory =
	| "functionality"
	| "codeQuality"
	| "bestPractices"
	| "performance"
	| "security"
	| "documentation";

// Rubric criteria interface
export interface RubricCriteria {
	id: string;
	category: RubricCategory;
	name: string;
	description: string;
	weight: number; // 0-100
	maxScore: number; // Maximum points for this criteria
	requirements: string[];
	examples?: {
		excellent: string;
		good: string;
		poor: string;
	};
}

// Rubric interface
export interface Rubric {
	id: string;
	name: string;
	description: string;
	version: string;
	criteria: RubricCriteria[];
	passingScore: number; // 0-100
	maxScore: number;
	difficulty: "beginner" | "intermediate" | "advanced";
	language: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

// Grading result interface
export interface GradingResult {
	criteriaId: string;
	category: RubricCategory;
	score: number;
	maxScore: number;
	percentage: number;
	feedback: string;
	suggestions: string[];
	evidence: string[];
}

// Overall grading result interface
export interface OverallGradingResult {
	rubricId: string;
	totalScore: number;
	maxScore: number;
	percentage: number;
	passed: boolean;
	grade: "A" | "B" | "C" | "D" | "F";
	categoryScores: Record<RubricCategory, number>;
	criteriaResults: GradingResult[];
	strengths: string[];
	weaknesses: string[];
	suggestions: string[];
	complexity: "beginner" | "intermediate" | "advanced";
	processingTime: number;
	gradedAt: string;
}

// Rubric Service class
export class RubricService {
	private rubrics: Map<string, Rubric> = new Map();
	private defaultRubrics: Rubric[] = [];

	constructor() {
		this.initializeDefaultRubrics();
	}

	/**
	 * Initialize default rubrics for common project types
	 */
	private initializeDefaultRubrics(): void {
		// Default JavaScript/TypeScript rubric
		const jsRubric: Rubric = {
			id: "js-basic",
			name: "JavaScript Basic Project Rubric",
			description: "Standard rubric for JavaScript/TypeScript projects",
			version: "1.0.0",
			passingScore: 70,
			maxScore: 100,
			difficulty: "intermediate",
			language: "javascript",
			tags: ["javascript", "typescript", "basic"],
			criteria: [
				{
					id: "func-1",
					category: "functionality",
					name: "Core Functionality",
					description: "Does the code implement the required functionality?",
					weight: 40,
					maxScore: 40,
					requirements: [
						"Implements all required features",
						"Handles edge cases appropriately",
						"Produces correct output for given inputs",
					],
					examples: {
						excellent: "All requirements met with additional features",
						good: "All core requirements met",
						poor: "Missing key functionality or incorrect output",
					},
				},
				{
					id: "qual-1",
					category: "codeQuality",
					name: "Code Structure",
					description: "Is the code well-structured and readable?",
					weight: 30,
					maxScore: 30,
					requirements: [
						"Clear variable and function names",
						"Logical code organization",
						"Appropriate use of data structures",
					],
					examples: {
						excellent: "Clean, modular code with excellent readability",
						good: "Generally readable with good structure",
						poor: "Poor naming, unclear structure, hard to follow",
					},
				},
				{
					id: "prac-1",
					category: "bestPractices",
					name: "Best Practices",
					description:
						"Does the code follow language and industry best practices?",
					weight: 30,
					maxScore: 30,
					requirements: [
						"Follows language conventions",
						"Uses appropriate error handling",
						"Avoids common anti-patterns",
					],
					examples: {
						excellent: "Exemplary use of best practices and patterns",
						good: "Generally follows best practices",
						poor: "Multiple violations of best practices",
					},
				},
			],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		// Default Python rubric
		const pythonRubric: Rubric = {
			id: "python-basic",
			name: "Python Basic Project Rubric",
			description: "Standard rubric for Python projects",
			version: "1.0.0",
			passingScore: 70,
			maxScore: 100,
			difficulty: "intermediate",
			language: "python",
			tags: ["python", "basic"],
			criteria: [
				{
					id: "func-1",
					category: "functionality",
					name: "Core Functionality",
					description: "Does the code implement the required functionality?",
					weight: 40,
					maxScore: 40,
					requirements: [
						"Implements all required features",
						"Handles edge cases appropriately",
						"Produces correct output for given inputs",
					],
				},
				{
					id: "qual-1",
					category: "codeQuality",
					name: "Code Structure",
					description: "Is the code well-structured and readable?",
					weight: 30,
					maxScore: 30,
					requirements: [
						"Clear variable and function names",
						"Logical code organization",
						"Appropriate use of data structures",
					],
				},
				{
					id: "prac-1",
					category: "bestPractices",
					name: "Python Best Practices",
					description: "Does the code follow Python best practices?",
					weight: 30,
					maxScore: 30,
					requirements: [
						"Follows PEP 8 style guidelines",
						"Uses appropriate error handling",
						"Uses Python idioms effectively",
					],
				},
			],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		this.defaultRubrics = [jsRubric, pythonRubric];
		this.defaultRubrics.forEach((rubric) => {
			this.rubrics.set(rubric.id, rubric);
		});
	}

	/**
	 * Get rubric by ID
	 */
	getRubric(rubricId: string): Rubric | undefined {
		return this.rubrics.get(rubricId);
	}

	/**
	 * Get rubric by language and difficulty
	 */
	getRubricByLanguage(
		language: string,
		difficulty: "beginner" | "intermediate" | "advanced" = "intermediate",
	): Rubric | undefined {
		return this.defaultRubrics.find(
			(rubric) =>
				rubric.language === language && rubric.difficulty === difficulty,
		);
	}

	/**
	 * Create custom rubric
	 */
	createRubric(rubric: Omit<Rubric, "id" | "createdAt" | "updatedAt">): Rubric {
		const newRubric: Rubric = {
			...rubric,
			id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		this.rubrics.set(newRubric.id, newRubric);
		return newRubric;
	}

	/**
	 * Update existing rubric
	 */
	updateRubric(rubricId: string, updates: Partial<Rubric>): Rubric | undefined {
		const rubric = this.rubrics.get(rubricId);
		if (!rubric) return undefined;

		const updatedRubric: Rubric = {
			...rubric,
			...updates,
			updatedAt: new Date().toISOString(),
		};

		this.rubrics.set(rubricId, updatedRubric);
		return updatedRubric;
	}

	/**
	 * Delete rubric
	 */
	deleteRubric(rubricId: string): boolean {
		return this.rubrics.delete(rubricId);
	}

	/**
	 * List all rubrics
	 */
	listRubrics(): Rubric[] {
		return Array.from(this.rubrics.values());
	}

	/**
	 * Search rubrics by tags or language
	 */
	searchRubrics(query: string): Rubric[] {
		const searchTerm = query.toLowerCase();
		return this.listRubrics().filter(
			(rubric) =>
				rubric.name.toLowerCase().includes(searchTerm) ||
				rubric.description.toLowerCase().includes(searchTerm) ||
				rubric.language.toLowerCase().includes(searchTerm) ||
				rubric.tags.some((tag) => tag.toLowerCase().includes(searchTerm)),
		);
	}

	/**
	 * Grade code submission using rubric
	 */
	async gradeSubmission(
		code: string,
		language: string,
		rubricId: string,
		requirements: string[] = [],
		context?: any,
	): Promise<OverallGradingResult> {
		const startTime = Date.now();

		try {
			const rubric = this.getRubric(rubricId);
			if (!rubric) {
				throw new Error(`Rubric not found: ${rubricId}`);
			}

			// Grade each criteria
			const criteriaResults: GradingResult[] = [];
			const categoryScores: Record<RubricCategory, number> = {
				functionality: 0,
				codeQuality: 0,
				bestPractices: 0,
				performance: 0,
				security: 0,
				documentation: 0,
			};

			for (const criteria of rubric.criteria) {
				const result = await this.gradeCriteria(
					criteria,
					code,
					language,
					requirements,
					context,
				);
				criteriaResults.push(result);

				// Update category scores
				categoryScores[criteria.category] += result.score;
			}

			// Calculate total score
			const totalScore = criteriaResults.reduce(
				(sum, result) => sum + result.score,
				0,
			);
			const percentage = Math.round((totalScore / rubric.maxScore) * 100);
			const passed = percentage >= rubric.passingScore;

			// Determine grade
			const grade = this.calculateGrade(percentage);

			// Analyze strengths and weaknesses
			const { strengths, weaknesses, suggestions } =
				this.analyzeResults(criteriaResults);

			// Determine complexity
			const complexity = this.determineComplexity(
				code,
				language,
				criteriaResults,
			);

			const processingTime = Date.now() - startTime;

			return {
				rubricId,
				totalScore,
				maxScore: rubric.maxScore,
				percentage,
				passed,
				grade,
				categoryScores,
				criteriaResults,
				strengths,
				weaknesses,
				suggestions,
				complexity,
				processingTime,
				gradedAt: new Date().toISOString(),
			};
		} catch (error: any) {
			handleError(error, { action: "grade-submission", rubricId, language });
			throw error;
		}
	}

	/**
	 * Grade individual criteria
	 */
	private async gradeCriteria(
		criteria: RubricCriteria,
		code: string,
		language: string,
		requirements: string[],
		context?: any,
	): Promise<GradingResult> {
		// This would integrate with the LLM service for actual grading
		// For now, we'll use a simplified scoring algorithm

		let score = 0;
		let feedback = "";
		let suggestions: string[] = [];
		let evidence: string[] = [];

		// Handle empty code
		if (!code || code.trim().length === 0) {
			return {
				criteriaId: criteria.id,
				category: criteria.category,
				score: 0,
				maxScore: criteria.maxScore,
				percentage: 0,
				feedback: "No code provided",
				suggestions: ["Please provide code for evaluation"],
				evidence: ["Empty code submission"],
			};
		}

		// Basic scoring based on requirements
		const requirementMatches = requirements.filter((req) =>
			code.toLowerCase().includes(req.toLowerCase()),
		);

		const requirementScore =
			(requirementMatches.length / Math.max(requirements.length, 1)) *
			criteria.maxScore;

		// Code quality checks
		const qualityScore = this.assessCodeQuality(code, language, criteria);

		// Best practices checks
		const practicesScore = this.assessBestPractices(code, language, criteria);

		// Calculate final score based on category
		switch (criteria.category) {
			case "functionality":
				score = requirementScore;
				feedback = `Functionality score: ${Math.round(requirementScore)}/${criteria.maxScore}`;
				break;
			case "codeQuality":
				score = qualityScore;
				feedback = `Code quality score: ${Math.round(qualityScore)}/${criteria.maxScore}`;
				break;
			case "bestPractices":
				score = practicesScore;
				feedback = `Best practices score: ${Math.round(practicesScore)}/${criteria.maxScore}`;
				break;
			default:
				score = (requirementScore + qualityScore + practicesScore) / 3;
				feedback = `Overall score: ${Math.round(score)}/${criteria.maxScore}`;
		}

		// Generate suggestions based on score
		if (score < criteria.maxScore * 0.7) {
			suggestions = this.generateSuggestions(criteria, score, code, language);
		}

		// Collect evidence
		evidence = this.collectEvidence(criteria, code, language);

		return {
			criteriaId: criteria.id,
			category: criteria.category,
			score: Math.round(score),
			maxScore: criteria.maxScore,
			percentage: Math.round((score / criteria.maxScore) * 100),
			feedback,
			suggestions,
			evidence,
		};
	}

	/**
	 * Assess code quality
	 */
	private assessCodeQuality(
		code: string,
		language: string,
		criteria: RubricCriteria,
	): number {
		let score = criteria.maxScore;

		// Check for clear variable names
		const variablePattern =
			language === "javascript"
				? /\b(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g
				: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
		const variables = code.match(variablePattern) || [];
		const unclearNames = variables.filter(
			(v) => v.length < 2 || v.includes("x") || v.includes("temp"),
		);

		if (unclearNames.length > 0) {
			score -= criteria.maxScore * 0.2;
		}

		// Check for function length (simplified)
		const lines = code.split("\n").filter((line) => line.trim().length > 0);
		if (lines.length > 50) {
			score -= criteria.maxScore * 0.1;
		}

		return Math.max(0, score);
	}

	/**
	 * Assess best practices
	 */
	private assessBestPractices(
		code: string,
		language: string,
		criteria: RubricCriteria,
	): number {
		let score = criteria.maxScore;

		// Check for error handling
		const errorHandlingPatterns = [
			"try",
			"catch",
			"throw",
			"error",
			"exception",
		];
		const hasErrorHandling = errorHandlingPatterns.some((pattern) =>
			code.toLowerCase().includes(pattern),
		);

		if (!hasErrorHandling) {
			score -= criteria.maxScore * 0.3;
		}

		// Check for comments
		const commentPatterns = ["//", "/*", "#", '"""', "'''"];
		const hasComments = commentPatterns.some((pattern) =>
			code.includes(pattern),
		);

		if (!hasComments) {
			score -= criteria.maxScore * 0.1;
		}

		return Math.max(0, score);
	}

	/**
	 * Generate suggestions for improvement
	 */
	private generateSuggestions(
		criteria: RubricCriteria,
		score: number,
		code: string,
		language: string,
	): string[] {
		const suggestions: string[] = [];

		if (criteria.category === "functionality") {
			suggestions.push(
				"Review the project requirements and ensure all features are implemented",
			);
			suggestions.push(
				"Test your code with different inputs to ensure it handles edge cases",
			);
		}

		if (criteria.category === "codeQuality") {
			suggestions.push("Use more descriptive variable and function names");
			suggestions.push(
				"Break down complex functions into smaller, more manageable pieces",
			);
		}

		if (criteria.category === "bestPractices") {
			suggestions.push("Add error handling to make your code more robust");
			suggestions.push("Add comments to explain complex logic");
		}

		return suggestions;
	}

	/**
	 * Collect evidence for grading
	 */
	private collectEvidence(
		criteria: RubricCriteria,
		code: string,
		language: string,
	): string[] {
		const evidence: string[] = [];

		// Count functions
		const functionCount = (code.match(/function|def/g) || []).length;
		evidence.push(`Found ${functionCount} functions`);

		// Count lines of code
		const lineCount = code
			.split("\n")
			.filter((line) => line.trim().length > 0).length;
		evidence.push(`Code length: ${lineCount} lines`);

		// Check for specific patterns based on criteria
		if (criteria.category === "functionality") {
			const hasReturn = code.includes("return");
			evidence.push(
				hasReturn ? "Contains return statements" : "No return statements found",
			);
		}

		return evidence;
	}

	/**
	 * Calculate letter grade
	 */
	private calculateGrade(percentage: number): "A" | "B" | "C" | "D" | "F" {
		if (percentage >= 90) return "A";
		if (percentage >= 80) return "B";
		if (percentage >= 70) return "C";
		if (percentage >= 60) return "D";
		return "F";
	}

	/**
	 * Analyze results to find strengths and weaknesses
	 */
	private analyzeResults(results: GradingResult[]): {
		strengths: string[];
		weaknesses: string[];
		suggestions: string[];
	} {
		const strengths: string[] = [];
		const weaknesses: string[] = [];
		const suggestions: string[] = [];

		results.forEach((result) => {
			if (result.percentage >= 80) {
				strengths.push(`Strong performance in ${result.category}`);
			} else if (result.percentage < 60) {
				weaknesses.push(`Needs improvement in ${result.category}`);
				suggestions.push(...result.suggestions);
			}
		});

		return { strengths, weaknesses, suggestions };
	}

	/**
	 * Determine code complexity
	 */
	private determineComplexity(
		code: string,
		language: string,
		results: GradingResult[],
	): "beginner" | "intermediate" | "advanced" {
		const lineCount = code
			.split("\n")
			.filter((line) => line.trim().length > 0).length;
		const functionCount = (code.match(/function|def/g) || []).length;
		const averageScore =
			results.reduce((sum, r) => sum + r.percentage, 0) / results.length;

		// More nuanced complexity determination
		if (lineCount > 100 || functionCount > 10 || averageScore > 85) {
			return "advanced";
		} else if (lineCount > 8 || functionCount > 1 || averageScore > 60) {
			return "intermediate";
		} else {
			return "beginner";
		}
	}

	/**
	 * Validate rubric configuration
	 */
	validateRubric(rubric: Rubric): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!rubric.name || rubric.name.trim().length === 0) {
			errors.push("Rubric name is required");
		}

		if (!rubric.criteria || rubric.criteria.length === 0) {
			errors.push("At least one criteria is required");
		}

		const totalWeight = rubric.criteria.reduce(
			(sum, criteria) => sum + criteria.weight,
			0,
		);
		if (Math.abs(totalWeight - 100) > 1) {
			// Allow for rounding errors
			errors.push(
				`Total criteria weight must equal 100 (current: ${totalWeight})`,
			);
		}

		if (rubric.passingScore < 0 || rubric.passingScore > 100) {
			errors.push("Passing score must be between 0 and 100");
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Export rubric to JSON
	 */
	exportRubric(rubricId: string): string | null {
		const rubric = this.getRubric(rubricId);
		return rubric ? JSON.stringify(rubric, null, 2) : null;
	}

	/**
	 * Import rubric from JSON
	 */
	importRubric(rubricJson: string): Rubric | null {
		try {
			const rubric = JSON.parse(rubricJson) as Rubric;
			const validation = this.validateRubric(rubric);

			if (!validation.isValid) {
				throw new Error(`Invalid rubric: ${validation.errors.join(", ")}`);
			}

			// Generate new ID to avoid conflicts
			rubric.id = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			rubric.createdAt = new Date().toISOString();
			rubric.updatedAt = new Date().toISOString();

			this.rubrics.set(rubric.id, rubric);
			return rubric;
		} catch (error: any) {
			handleError(error, { action: "import-rubric" });
			return null;
		}
	}
}

// Export singleton instance
export const rubricService = new RubricService();

// Export for testing
export default RubricService;
