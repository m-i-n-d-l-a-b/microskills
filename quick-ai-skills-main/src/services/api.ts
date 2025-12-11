import {
	ENV,
	API_ENDPOINTS,
	HTTP_STATUS,
	ERROR_MESSAGES,
	STORAGE_KEYS,
	REQUEST_CONFIG,
} from "@/lib/constants";
import { interceptorManager } from "@/utils/interceptors";

// Types for API responses
export interface ApiResponse<T = any> {
	data: T;
	status: number;
	message?: string;
	success: boolean;
}

export interface ApiError {
	message: string;
	status: number;
	code?: string;
	details?: any;
}

export interface RequestConfig {
	method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	headers?: Record<string, string>;
	body?: any;
	timeout?: number;
	retries?: number;
	retryDelay?: number;
}

// API Client class
export class ApiClient {
	private baseURL: string;
	private defaultTimeout: number;
	private defaultRetries: number;
	private defaultRetryDelay: number;

	constructor() {
		this.baseURL = ENV.API_BASE_URL;
		this.defaultTimeout = REQUEST_CONFIG.TIMEOUT;
		this.defaultRetries = REQUEST_CONFIG.RETRY_ATTEMPTS;
		this.defaultRetryDelay = REQUEST_CONFIG.RETRY_DELAY;
	}

	// Get authentication token
	private getAuthToken(): string | null {
		return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
	}

	// Get default headers
	private getDefaultHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json",
		};

		const token = this.getAuthToken();
		if (token) {
			headers["Authorization"] = `Bearer ${token}`;
		}

		return headers;
	}

	// Create timeout promise
	private createTimeoutPromise(timeout: number): Promise<never> {
		return new Promise((_, reject) => {
			setTimeout(() => {
				reject(new Error(ERROR_MESSAGES.TIMEOUT_ERROR));
			}, timeout);
		});
	}

	// Handle response
	private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
		const contentType = response.headers.get("content-type");
		const isJson = contentType && contentType.includes("application/json");

		let data: T;
		try {
			data = isJson ? await response.json() : ((await response.text()) as T);
		} catch (error) {
			throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
		}

		if (!response.ok) {
			const error: ApiError = {
				message:
					isJson && data && typeof data === "object" && "message" in data
						? (data as any).message
						: ERROR_MESSAGES.UNKNOWN_ERROR,
				status: response.status,
				code:
					isJson && data && typeof data === "object" && "code" in data
						? (data as any).code
						: undefined,
				details: data,
			};

			// Handle specific error cases
			switch (response.status) {
				case HTTP_STATUS.UNAUTHORIZED:
					this.handleUnauthorized();
					break;
				case HTTP_STATUS.FORBIDDEN:
					error.message = ERROR_MESSAGES.FORBIDDEN;
					break;
				case HTTP_STATUS.NOT_FOUND:
					error.message = ERROR_MESSAGES.NOT_FOUND;
					break;
				case HTTP_STATUS.INTERNAL_SERVER_ERROR:
					error.message = ERROR_MESSAGES.SERVER_ERROR;
					break;
			}

			throw error;
		}

		return {
			data,
			status: response.status,
			success: true,
		};
	}

	// Handle unauthorized access
	private handleUnauthorized(): void {
		localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
		localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

		// Redirect to login page
		if (typeof window !== "undefined") {
			window.location.href = "/login";
		}
	}

	// Retry logic
	private async retryRequest<T>(
		requestFn: () => Promise<ApiResponse<T>>,
		retries: number,
		delay: number,
	): Promise<ApiResponse<T>> {
		try {
			return await requestFn();
		} catch (error) {
			if (retries > 0 && this.shouldRetry(error)) {
				await this.delay(delay);
				return this.retryRequest(requestFn, retries - 1, delay * 2);
			}
			throw error;
		}
	}

	// Determine if request should be retried
	private shouldRetry(error: any): boolean {
		// Don't retry on client errors (4xx) except for 408 (Request Timeout)
		if (error.status >= 400 && error.status < 500 && error.status !== 408) {
			return false;
		}

		// Retry on server errors (5xx) and network errors
		return error.status >= 500 || !error.status;
	}

	// Delay function
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	// Main request method
	async request<T>(
		endpoint: string,
		config: RequestConfig = {},
	): Promise<ApiResponse<T>> {
		const {
			method = "GET",
			headers = {},
			body,
			timeout = this.defaultTimeout,
			retries = this.defaultRetries,
			retryDelay = this.defaultRetryDelay,
		} = config;

		const url = endpoint.startsWith("http")
			? endpoint
			: `${this.baseURL}${endpoint}`;
		const requestHeaders = { ...this.getDefaultHeaders(), ...headers };

		// Create interceptor request config
		const interceptorConfig = interceptorManager.createRequestConfig(
			url,
			method,
			requestHeaders,
			body,
			timeout,
			retries,
		);

		const requestFn = async (): Promise<ApiResponse<T>> => {
			try {
				// Execute request interceptors
				const processedConfig =
					await interceptorManager.executeRequestInterceptors(
						interceptorConfig,
					);

				const controller = new AbortController();
				const timeoutId = setTimeout(
					() => controller.abort(),
					processedConfig.timeout || timeout,
				);

				try {
					const requestConfig: RequestInit = {
						method: processedConfig.method,
						headers: processedConfig.headers,
						signal: controller.signal,
					};

					if (processedConfig.body && processedConfig.method !== "GET") {
						requestConfig.body =
							typeof processedConfig.body === "string"
								? processedConfig.body
								: JSON.stringify(processedConfig.body);
					}

					const response = await fetch(processedConfig.url, requestConfig);
					clearTimeout(timeoutId);

					const apiResponse = await this.handleResponse<T>(response);

					// Execute response interceptors
					return await interceptorManager.executeResponseInterceptors(
						apiResponse,
						processedConfig,
					);
				} catch (error) {
					clearTimeout(timeoutId);

					let apiError: ApiError;

					if (error.name === "AbortError") {
						apiError = {
							message: ERROR_MESSAGES.TIMEOUT_ERROR,
							status: 0,
							code: "TIMEOUT_ERROR",
						};
					} else if (error instanceof TypeError) {
						apiError = {
							message: ERROR_MESSAGES.NETWORK_ERROR,
							status: 0,
							code: "NETWORK_ERROR",
						};
					} else {
						apiError = {
							message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR,
							status: 0,
							code: "UNKNOWN_ERROR",
						};
					}

					// Execute response error interceptors
					await interceptorManager.executeResponseErrorInterceptors(
						apiError,
						processedConfig,
					);
					// Re-throw to propagate failure to retry/backoff logic
					throw apiError;
				}
			} catch (error) {
				// If interceptor execution fails, throw the error
				throw error;
			}
		};

		return this.retryRequest(requestFn, retries, retryDelay);
	}

	// Convenience methods
	async get<T>(
		endpoint: string,
		config?: Omit<RequestConfig, "method" | "body">,
	): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { ...config, method: "GET" });
	}

	async post<T>(
		endpoint: string,
		body?: any,
		config?: Omit<RequestConfig, "method">,
	): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { ...config, method: "POST", body });
	}

	async put<T>(
		endpoint: string,
		body?: any,
		config?: Omit<RequestConfig, "method">,
	): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { ...config, method: "PUT", body });
	}

	async patch<T>(
		endpoint: string,
		body?: any,
		config?: Omit<RequestConfig, "method">,
	): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { ...config, method: "PATCH", body });
	}

	async delete<T>(
		endpoint: string,
		config?: Omit<RequestConfig, "method" | "body">,
	): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { ...config, method: "DELETE" });
	}

	// Specific API methods
	// Authentication
	async login(credentials: {
		email: string;
		password: string;
	}): Promise<ApiResponse<{ token: string; user: any }>> {
		return this.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
	}

	async logout(): Promise<ApiResponse<void>> {
		return this.post(API_ENDPOINTS.AUTH.LOGOUT);
	}

	async refreshToken(): Promise<ApiResponse<{ token: string }>> {
		const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
		return this.post(API_ENDPOINTS.AUTH.REFRESH, { refreshToken });
	}

	// User
	async getUserProfile(): Promise<ApiResponse<any>> {
		return this.get(API_ENDPOINTS.USER.PROFILE);
	}

	async updateUserProfile(profile: any): Promise<ApiResponse<any>> {
		return this.put(API_ENDPOINTS.USER.PROFILE, profile);
	}

	async getUserPreferences(): Promise<ApiResponse<any>> {
		return this.get(API_ENDPOINTS.USER.PREFERENCES);
	}

	async updateUserPreferences(preferences: any): Promise<ApiResponse<any>> {
		return this.put(API_ENDPOINTS.USER.PREFERENCES, preferences);
	}

	async getUserProgress(): Promise<ApiResponse<any>> {
		return this.get(API_ENDPOINTS.USER.PROGRESS);
	}

	// Lessons
	async getDailyLesson(): Promise<ApiResponse<any>> {
		return this.get(API_ENDPOINTS.LESSONS.DAILY);
	}

	async submitQuiz(quizData: any): Promise<ApiResponse<any>> {
		return this.post(API_ENDPOINTS.LESSONS.SUBMIT_QUIZ, quizData);
	}

	async switchTone(toneData: any): Promise<ApiResponse<any>> {
		return this.post(API_ENDPOINTS.LESSONS.SWITCH_TONE, toneData);
	}

	// Projects
	async submitProject(projectData: any): Promise<ApiResponse<any>> {
		return this.post(API_ENDPOINTS.PROJECTS.SUBMIT, projectData);
	}

	async getProjectStatus(projectId: string): Promise<ApiResponse<any>> {
		return this.get(`${API_ENDPOINTS.PROJECTS.STATUS}/${projectId}`);
	}

	async getProjectHistory(): Promise<ApiResponse<any>> {
		return this.get(API_ENDPOINTS.PROJECTS.HISTORY);
	}

	// LLM Services
	async evaluateCode(evaluationData: any): Promise<ApiResponse<any>> {
		return this.post(API_ENDPOINTS.LLM.EVALUATE, evaluationData);
	}

	async analyzeCode(analysisData: any): Promise<ApiResponse<any>> {
		return this.post(API_ENDPOINTS.LLM.ANALYZE, analysisData);
	}

	async generateFeedback(feedbackData: any): Promise<ApiResponse<any>> {
		return this.post(API_ENDPOINTS.LLM.FEEDBACK, feedbackData);
	}

	async checkLLMHealth(): Promise<ApiResponse<any>> {
		return this.get(API_ENDPOINTS.LLM.HEALTH);
	}

	// Queue Services
	async addToQueue(queueData: any): Promise<ApiResponse<any>> {
		return this.post(API_ENDPOINTS.QUEUE.ADD, queueData);
	}

	async getQueueItem(itemId: string): Promise<ApiResponse<any>> {
		return this.get(`${API_ENDPOINTS.QUEUE.ITEM}/${itemId}`);
	}

	async getUserQueueItems(userId: string): Promise<ApiResponse<any>> {
		return this.get(`${API_ENDPOINTS.QUEUE.USER_ITEMS}/${userId}`);
	}

	async getQueueStats(): Promise<ApiResponse<any>> {
		return this.get(API_ENDPOINTS.QUEUE.STATS);
	}

	async cancelQueueItem(itemId: string): Promise<ApiResponse<any>> {
		return this.post(`${API_ENDPOINTS.QUEUE.CANCEL}/${itemId}`);
	}

	async retryQueueItem(itemId: string): Promise<ApiResponse<any>> {
		return this.post(`${API_ENDPOINTS.QUEUE.RETRY}/${itemId}`);
	}

	// Certificates
	async generateCertificate(trackId: string): Promise<ApiResponse<any>> {
		return this.post(API_ENDPOINTS.CERTIFICATES.GENERATE, { trackId });
	}

	async shareBadge(
		certificateId: string,
		platform: string,
	): Promise<ApiResponse<any>> {
		return this.post(API_ENDPOINTS.CERTIFICATES.SHARE, {
			certificateId,
			platform,
		});
	}

	// Analytics
	async trackEvent(eventData: any): Promise<ApiResponse<void>> {
		return this.post(API_ENDPOINTS.ANALYTICS.EVENTS, eventData);
	}

	// Notifications
	async updateNotificationPreferences(
		preferences: any,
	): Promise<ApiResponse<any>> {
		return this.put(API_ENDPOINTS.NOTIFICATIONS.PREFERENCES, preferences);
	}

	async sendNotification(notificationData: any): Promise<ApiResponse<any>> {
		return this.post(API_ENDPOINTS.NOTIFICATIONS.SEND, notificationData);
	}

	// Server-Sent Events for real-time lesson streaming
	async createEventSource(
		endpoint: string,
		options: {
			onMessage?: (event: MessageEvent) => void;
			onError?: (event: Event) => void;
			onOpen?: (event: Event) => void;
			headers?: Record<string, string>;
		} = {},
	): Promise<EventSource> {
		const url = endpoint.startsWith("http")
			? endpoint
			: `${this.baseURL}${endpoint}`;

		// Create EventSource with authentication
		const token = this.getAuthToken();
		const eventSourceUrl = new URL(url);
		if (token) {
			eventSourceUrl.searchParams.append("token", token);
		}

		const eventSource = new EventSource(eventSourceUrl.toString());

		// Set up event handlers
		if (options.onMessage) {
			eventSource.onmessage = options.onMessage;
		}

		if (options.onError) {
			eventSource.onerror = options.onError;
		}

		if (options.onOpen) {
			eventSource.onopen = options.onOpen;
		}

		return eventSource;
	}

	// Real-time lesson streaming
	async streamLesson(
		lessonId: string,
		options: {
			onChunk?: (chunk: any) => void;
			onComplete?: (data: any) => void;
			onError?: (error: any) => void;
		} = {},
	): Promise<void> {
		const endpoint = `${API_ENDPOINTS.LESSONS.STREAM}/${lessonId}`;

		try {
			const eventSource = await this.createEventSource(endpoint, {
				onMessage: (event) => {
					try {
						const data = JSON.parse(event.data);

						if (data.type === "chunk") {
							options.onChunk?.(data.content);
						} else if (data.type === "complete") {
							options.onComplete?.(data);
							eventSource.close();
						} else if (data.type === "error") {
							options.onError?.(new Error(data.message));
							eventSource.close();
						}
					} catch (error) {
						options.onError?.(error);
						eventSource.close();
					}
				},
				onError: (event) => {
					options.onError?.(new Error("EventSource error"));
				},
			});
		} catch (error) {
			options.onError?.(error);
		}
	}
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export default instance
export default apiClient;
