import {
	ENV,
	API_ENDPOINTS,
	HTTP_STATUS,
	ERROR_MESSAGES,
} from "@/lib/constants";
import { handleError } from "@/utils/errorHandling";

// LLM Provider types
export type LLMProvider = "openai" | "anthropic" | "custom";

// Code evaluation request interface
export interface CodeEvaluationRequest {
	code: string;
	language: string;
	projectId: string;
	requirements: string[];
	rubric: {
		functionality: number;
		codeQuality: number;
		bestPractices: number;
	};
	context?: {
		lessonId?: string;
		difficulty?: string;
		learningObjectives?: string[];
	};
	metadata?: Record<string, any>;
}

// Code evaluation response interface
export interface CodeEvaluationResponse {
	id: string;
	projectId: string;
	score: number;
	percentage: number;
	passed: boolean;
	feedback: CodeFeedback[];
	rubric: {
		functionality: number;
		codeQuality: number;
		bestPractices: number;
	};
	analysis: {
		strengths: string[];
		weaknesses: string[];
		suggestions: string[];
		complexity: "beginner" | "intermediate" | "advanced";
	};
	processingTime: number;
	model: string;
	provider: string;
	evaluatedAt: string;
	metadata?: Record<string, any>;
}

// Code feedback interface
export interface CodeFeedback {
	id: string;
	type: "success" | "error" | "warning" | "info" | "suggestion";
	message: string;
	severity: "low" | "medium" | "high" | "critical";
	lineNumber?: number;
	suggestion?: string;
	category:
		| "syntax"
		| "logic"
		| "style"
		| "performance"
		| "security"
		| "best_practice";
}

// LLM health check response
export interface LLMHealthResponse {
	status: "healthy" | "degraded" | "unhealthy";
	provider: string;
	model: string;
	responseTime: number;
	lastChecked: string;
	errors?: string[];
}

// LLM service configuration
interface LLMServiceConfig {
	provider: LLMProvider;
	apiKey: string;
	model: string;
	baseUrl?: string;
	timeout: number;
	maxRetries: number;
}

// LLM Service class
export class LLMService {
	private config: LLMServiceConfig;
	private isHealthy: boolean = true;
	private lastHealthCheck: number = 0;
	private healthCheckInterval: number = 5 * 60 * 1000; // 5 minutes

	constructor(config?: Partial<LLMServiceConfig>) {
		this.config = {
			provider: (ENV.LLM_PROVIDER as LLMProvider) || "openai",
			apiKey: ENV.LLM_API_KEY,
			model: ENV.LLM_MODEL,
			baseUrl: ENV.LLM_BASE_URL,
			timeout: ENV.LLM_TIMEOUT,
			maxRetries: ENV.LLM_MAX_RETRIES,
			...config,
		};
	}

	/**
	 * Evaluate code submission using LLM
	 */
	async evaluateCode(
		request: CodeEvaluationRequest,
	): Promise<CodeEvaluationResponse> {
		const startTime = Date.now();

		try {
			// Check service health first
			await this.ensureHealthy();

			// Prepare the evaluation prompt
			const prompt = this.buildEvaluationPrompt(request);

			// Make the LLM request
			const llmResponse = await this.makeLLMRequest(prompt, request);

			// Parse and validate the response
			const evaluation = this.parseEvaluationResponse(llmResponse, request);

			// Calculate processing time
			const processingTime = Date.now() - startTime;

			return {
				...evaluation,
				processingTime,
				model: this.config.model,
				provider: this.config.provider,
				evaluatedAt: new Date().toISOString(),
			};
		} catch (error: any) {
			const processingTime = Date.now() - startTime;

			// Log the error
			handleError(error, {
				action: "llm-evaluate-code",
				projectId: request.projectId,
				language: request.language,
				processingTime,
			});

			// Return a fallback response
			return this.createFallbackResponse(
				request,
				error.message,
				processingTime,
			);
		}
	}

	/**
	 * Analyze code for detailed feedback
	 */
	async analyzeCode(
		code: string,
		language: string,
		context?: any,
	): Promise<CodeFeedback[]> {
		try {
			const prompt = this.buildAnalysisPrompt(code, language, context);
			const response = await this.makeLLMRequest(prompt, { code, language });

			return this.parseFeedbackResponse(response);
		} catch (error: any) {
			handleError(error, { action: "llm-analyze-code", language });
			return [];
		}
	}

	/**
	 * Generate personalized feedback
	 */
	async generateFeedback(
		code: string,
		language: string,
		score: number,
		previousFeedback?: CodeFeedback[],
	): Promise<string> {
		try {
			const prompt = this.buildFeedbackPrompt(
				code,
				language,
				score,
				previousFeedback,
			);
			const response = await this.makeLLMRequest(prompt, {
				code,
				language,
				score,
			});

			return this.parseFeedbackText(response);
		} catch (error: any) {
			handleError(error, { action: "llm-generate-feedback", language, score });
			return this.getDefaultFeedback(score);
		}
	}

	/**
	 * Check LLM service health
	 */
	async checkHealth(): Promise<LLMHealthResponse> {
		const startTime = Date.now();

		try {
			// Make a simple test request
			const testPrompt =
				"Please respond with 'OK' if you can read this message.";
			await this.makeLLMRequest(testPrompt, { test: true });

			const responseTime = Date.now() - startTime;
			this.isHealthy = true;
			this.lastHealthCheck = Date.now();

			return {
				status: "healthy",
				provider: this.config.provider,
				model: this.config.model,
				responseTime,
				lastChecked: new Date().toISOString(),
			};
		} catch (error: any) {
			const responseTime = Date.now() - startTime;
			this.isHealthy = false;
			this.lastHealthCheck = Date.now();

			return {
				status: "unhealthy",
				provider: this.config.provider,
				model: this.config.model,
				responseTime,
				lastChecked: new Date().toISOString(),
				errors: [error.message],
			};
		}
	}

	/**
	 * Ensure service is healthy before making requests
	 */
	private async ensureHealthy(): Promise<void> {
		const now = Date.now();

		// Check if we need to perform a health check
		if (now - this.lastHealthCheck > this.healthCheckInterval) {
			try {
				await this.checkHealth();
			} catch (error) {
				// If health check fails, mark as unhealthy but don't throw
				this.isHealthy = false;
				this.lastHealthCheck = now;
			}
		}

		// Don't block requests if health check fails - let the actual request handle errors
	}

	/**
	 * Make LLM request with retry logic
	 */
	private async makeLLMRequest(prompt: string, context: any): Promise<any> {
		let lastError: Error;

		for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
			try {
				const response = await this.makeRequest(prompt, context);
				return response;
			} catch (error: any) {
				lastError = error;

				// Don't retry on certain errors
				if (this.shouldNotRetry(error)) {
					throw error;
				}

				// Wait before retrying (exponential backoff)
				if (attempt < this.config.maxRetries) {
					const delay = Math.min(1000 * 2 ** (attempt - 1), 10000);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		throw lastError!;
	}

	/**
	 * Make the actual HTTP request to LLM provider
	 */
	private async makeRequest(prompt: string, context: any): Promise<any> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

		try {
			// Determine the endpoint based on context
			let endpoint = API_ENDPOINTS.LLM.EVALUATE;
			if (context.test) {
				endpoint = API_ENDPOINTS.LLM.HEALTH;
			} else if (context.code && !context.projectId) {
				endpoint = API_ENDPOINTS.LLM.ANALYZE;
			} else if (context.score !== undefined) {
				endpoint = API_ENDPOINTS.LLM.FEEDBACK;
			}

			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.config.apiKey}`,
				},
				body: JSON.stringify({
					prompt,
					context,
					provider: this.config.provider,
					model: this.config.model,
					baseUrl: this.config.baseUrl,
				}),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(
					`LLM request failed: ${response.status} ${response.statusText}`,
				);
			}

			return await response.json();
		} catch (error: any) {
			clearTimeout(timeoutId);

			if (error.name === "AbortError") {
				throw new Error("LLM request timed out");
			}

			throw error;
		}
	}

	/**
	 * Build evaluation prompt for code assessment
	 */
	private buildEvaluationPrompt(request: CodeEvaluationRequest): string {
		const { code, language, requirements, rubric, context } = request;

		return `You are an expert code reviewer and educator. Please evaluate the following ${language} code submission:

PROJECT REQUIREMENTS:
${requirements.map((req, i) => `${i + 1}. ${req}`).join("\n")}

RUBRIC WEIGHTS:
- Functionality: ${rubric.functionality}%
- Code Quality: ${rubric.codeQuality}%
- Best Practices: ${rubric.bestPractices}%

${context?.learningObjectives ? `LEARNING OBJECTIVES:\n${context.learningObjectives.join(", ")}\n` : ""}

CODE TO EVALUATE:
\`\`\`${language}
${code}
\`\`\`

Please provide a comprehensive evaluation in the following JSON format:
{
  "score": <overall_score_0_100>,
  "percentage": <percentage_0_100>,
  "passed": <boolean>,
  "feedback": [
    {
      "type": "success|error|warning|info|suggestion",
      "message": "<detailed_message>",
      "severity": "low|medium|high|critical",
      "lineNumber": <optional_line_number>,
      "suggestion": "<optional_suggestion>",
      "category": "syntax|logic|style|performance|security|best_practice"
    }
  ],
  "rubric": {
    "functionality": <score_0_100>,
    "codeQuality": <score_0_100>,
    "bestPractices": <score_0_100>
  },
  "analysis": {
    "strengths": ["<strength1>", "<strength2>"],
    "weaknesses": ["<weakness1>", "<weakness2>"],
    "suggestions": ["<suggestion1>", "<suggestion2>"],
    "complexity": "beginner|intermediate|advanced"
  }
}

Be thorough, constructive, and educational in your feedback.`;
	}

	/**
	 * Build analysis prompt for detailed code review
	 */
	private buildAnalysisPrompt(
		code: string,
		language: string,
		context?: any,
	): string {
		return `Please analyze the following ${language} code and provide detailed feedback:

CODE:
\`\`\`${language}
${code}
\`\`\`

${context ? `CONTEXT: ${JSON.stringify(context)}\n` : ""}

Provide feedback in JSON format:
[
  {
    "type": "success|error|warning|info|suggestion",
    "message": "<detailed_message>",
    "severity": "low|medium|high|critical",
    "lineNumber": <optional_line_number>,
    "suggestion": "<optional_suggestion>",
    "category": "syntax|logic|style|performance|security|best_practice"
  }
]`;
	}

	/**
	 * Build feedback prompt for personalized guidance
	 */
	private buildFeedbackPrompt(
		code: string,
		language: string,
		score: number,
		previousFeedback?: CodeFeedback[],
	): string {
		return `As an encouraging coding mentor, provide personalized feedback for this ${language} code submission:

CODE:
\`\`\`${language}
${code}
\`\`\`

SCORE: ${score}/100

${previousFeedback ? `PREVIOUS FEEDBACK:\n${previousFeedback.map((f) => `- ${f.message}`).join("\n")}\n` : ""}

Please provide encouraging, constructive feedback that:
1. Acknowledges what was done well
2. Suggests specific improvements
3. Provides actionable next steps
4. Maintains a positive, growth-oriented tone

Keep the response under 200 words.`;
	}

	/**
	 * Parse evaluation response from LLM
	 */
	private parseEvaluationResponse(
		response: any,
		request: CodeEvaluationRequest,
	): CodeEvaluationResponse {
		try {
			const data =
				typeof response === "string" ? JSON.parse(response) : response;

			return {
				id: `eval_${Date.now()}`,
				projectId: request.projectId,
				score: data.score || 0,
				percentage: data.percentage || 0,
				passed: data.passed || false,
				feedback: data.feedback || [],
				rubric: data.rubric || {
					functionality: 0,
					codeQuality: 0,
					bestPractices: 0,
				},
				analysis: data.analysis || {
					strengths: [],
					weaknesses: [],
					suggestions: [],
					complexity: "beginner",
				},
				processingTime: 0, // Will be set by caller
				model: this.config.model,
				provider: this.config.provider,
				evaluatedAt: new Date().toISOString(),
				metadata: request.metadata,
			};
		} catch (error) {
			throw new Error("Failed to parse LLM evaluation response");
		}
	}

	/**
	 * Parse feedback response from LLM
	 */
	private parseFeedbackResponse(response: any): CodeFeedback[] {
		try {
			const data =
				typeof response === "string" ? JSON.parse(response) : response;
			return Array.isArray(data) ? data : [];
		} catch (error) {
			return [];
		}
	}

	/**
	 * Parse feedback text from LLM
	 */
	private parseFeedbackText(response: any): string {
		try {
			const data =
				typeof response === "string" ? JSON.parse(response) : response;
			return (
				data.feedback || data.message || response || "No feedback available"
			);
		} catch (error) {
			return typeof response === "string" ? response : "No feedback available";
		}
	}

	/**
	 * Create fallback response when LLM fails
	 */
	private createFallbackResponse(
		request: CodeEvaluationRequest,
		errorMessage: string,
		processingTime: number,
	): CodeEvaluationResponse {
		return {
			id: `eval_${Date.now()}`,
			projectId: request.projectId,
			score: 0,
			percentage: 0,
			passed: false,
			feedback: [
				{
					id: "fallback_1",
					type: "error",
					message: `Evaluation failed: ${errorMessage}`,
					severity: "high",
					category: "logic",
				},
			],
			rubric: {
				functionality: 0,
				codeQuality: 0,
				bestPractices: 0,
			},
			analysis: {
				strengths: [],
				weaknesses: ["LLM service unavailable"],
				suggestions: ["Please try again later"],
				complexity: "beginner",
			},
			processingTime,
			model: this.config.model,
			provider: this.config.provider,
			evaluatedAt: new Date().toISOString(),
			metadata: request.metadata,
		};
	}

	/**
	 * Get default feedback based on score
	 */
	private getDefaultFeedback(score: number): string {
		if (score >= 90) {
			return "Excellent work! Your implementation demonstrates strong understanding and follows best practices.";
		} else if (score >= 80) {
			return "Good job! Your solution works well. Consider reviewing the feedback for areas of improvement.";
		} else if (score >= 70) {
			return "Nice effort! Your basic implementation is correct. Focus on the suggested improvements.";
		} else {
			return "Keep working on it! Review the lesson materials and try implementing the core requirements.";
		}
	}

	/**
	 * Determine if error should not be retried
	 */
	private shouldNotRetry(error: any): boolean {
		const message = error.message?.toLowerCase() || "";
		return (
			message.includes("unauthorized") ||
			message.includes("forbidden") ||
			message.includes("invalid") ||
			message.includes("malformed")
		);
	}
}

// Export singleton instance
export const llmService = new LLMService();

// Export for testing
export default LLMService;
