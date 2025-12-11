import posthog from "posthog-js";
import { ENV } from "@/lib/constants";
import { handleError } from "@/utils/errorHandling";

// Analytics event types
export interface AnalyticsEvent {
	event: string;
	properties?: Record<string, any>;
	userId?: string;
	timestamp?: number;
}

// User identification data
export interface UserTraits {
	email?: string;
	name?: string;
	role?: string;
	experience?: "beginner" | "intermediate" | "advanced";
	preferences?: Record<string, any>;
	subscription?: "free" | "pro" | "enterprise";
}

// Analytics service configuration
export interface AnalyticsConfig {
	enabled: boolean;
	debug: boolean;
	capturePageViews: boolean;
	captureClicks: boolean;
	captureFormInteractions: boolean;
	sessionRecording: boolean;
}

// Analytics service class
export class AnalyticsService {
	private static instance: AnalyticsService;
	private isInitialized: boolean = false;
	private config: AnalyticsConfig;
	private queue: AnalyticsEvent[] = [];
	private isOnline: boolean = navigator.onLine;

	constructor() {
		this.config = {
			enabled: ENV.ENABLE_ANALYTICS,
			debug: ENV.ENABLE_DEBUG_MODE,
			capturePageViews: true,
			captureClicks: true,
			captureFormInteractions: true,
			sessionRecording: false,
		};

		this.setupNetworkListener();
	}

	/**
	 * Get singleton instance without triggering eager module evaluation
	 */
	public static getInstance(): AnalyticsService {
		if (!AnalyticsService.instance) {
			AnalyticsService.instance = new AnalyticsService();
		}
		return AnalyticsService.instance;
	}

	/**
	 * Initialize PostHog analytics
	 */
	public async initialize(): Promise<void> {
		if (this.isInitialized || !this.config.enabled) {
			return;
		}

		try {
			// Initialize PostHog
			posthog.init(ENV.POSTHOG_KEY, {
				api_host: ENV.POSTHOG_HOST,
				loaded: (posthog) => {
					if (this.config.debug) {
						console.log("PostHog loaded successfully");
					}
				},
				capture_pageview: this.config.capturePageViews,
				capture_pageleave: true,
				autocapture: this.config.captureClicks,
				disable_session_recording: !this.config.sessionRecording,
				opt_out_capturing_by_default: false,
				respect_dnt: true,
				debug: this.config.debug,
			});

			this.isInitialized = true;

			// Process any queued events
			this.processQueue();

			if (this.config.debug) {
				console.log("Analytics service initialized");
			}
		} catch (error) {
			handleError(error, { endpoint: "analytics/initialize" });
			console.error("Failed to initialize analytics:", error);
		}
	}

	/**
	 * Track an analytics event
	 */
	public track(event: string, properties?: Record<string, any>): void {
		if (!this.config.enabled) {
			return;
		}

		const analyticsEvent: AnalyticsEvent = {
			event,
			properties: {
				...properties,
				timestamp: Date.now(),
				environment: ENV.NODE_ENV,
				app_version: ENV.APP_VERSION,
			},
			timestamp: Date.now(),
		};

		if (this.isInitialized) {
			this.sendEvent(analyticsEvent);
		} else {
			this.queue.push(analyticsEvent);
		}
	}

	/**
	 * Identify a user
	 */
	public identify(userId: string, traits?: UserTraits): void {
		if (!this.config.enabled || !this.isInitialized) {
			return;
		}

		try {
			posthog.identify(userId, traits);

			if (this.config.debug) {
				console.log("User identified:", { userId, traits });
			}
		} catch (error) {
			handleError(error, { endpoint: "analytics/identify" });
		}
	}

	/**
	 * Set user properties
	 */
	public setUserProperties(properties: Record<string, any>): void {
		if (!this.config.enabled || !this.isInitialized) {
			return;
		}

		try {
			posthog.people.set(properties);

			if (this.config.debug) {
				console.log("User properties set:", properties);
			}
		} catch (error) {
			handleError(error, { endpoint: "analytics/set-user-properties" });
		}
	}

	/**
	 * Track page view
	 */
	public trackPageView(
		pageName?: string,
		properties?: Record<string, any>,
	): void {
		if (!this.config.enabled || !this.isInitialized) {
			return;
		}

		try {
			if (pageName) {
				posthog.capture("$pageview", {
					page_name: pageName,
					...properties,
				});
			} else {
				posthog.capture("$pageview", properties);
			}
		} catch (error) {
			handleError(error, { endpoint: "analytics/track-pageview" });
		}
	}

	/**
	 * Track feature usage
	 */
	public trackFeatureUsage(
		feature: string,
		properties?: Record<string, any>,
	): void {
		this.track("feature_used", {
			feature,
			...properties,
		});
	}

	/**
	 * Track conversion event
	 */
	public trackConversion(
		funnel: string,
		step: string,
		properties?: Record<string, any>,
	): void {
		this.track("conversion", {
			funnel,
			step,
			...properties,
		});
	}

	/**
	 * Track error event
	 */
	public trackError(error: Error, context?: Record<string, any>): void {
		this.track("error_occurred", {
			error_message: error.message,
			error_stack: error.stack,
			error_name: error.name,
			...context,
		});
	}

	/**
	 * Track performance metrics
	 */
	public trackPerformance(
		metric: string,
		value: number,
		properties?: Record<string, any>,
	): void {
		this.track("performance_metric", {
			metric,
			value,
			...properties,
		});
	}

	/**
	 * Track user engagement
	 */
	public trackEngagement(
		action: string,
		duration?: number,
		properties?: Record<string, any>,
	): void {
		this.track("user_engagement", {
			action,
			duration,
			...properties,
		});
	}

	/**
	 * Get analytics configuration
	 */
	public getConfig(): AnalyticsConfig {
		return { ...this.config };
	}

	/**
	 * Update analytics configuration
	 */
	public updateConfig(updates: Partial<AnalyticsConfig>): void {
		this.config = { ...this.config, ...updates };
	}

	/**
	 * Enable/disable analytics
	 */
	public setEnabled(enabled: boolean): void {
		this.config.enabled = enabled;

		if (!enabled) {
			this.optOut();
		} else {
			this.optIn();
		}
	}

	/**
	 * Opt out of analytics
	 */
	public optOut(): void {
		if (this.isInitialized) {
			posthog.opt_out_capturing();
		}
	}

	/**
	 * Opt in to analytics
	 */
	public optIn(): void {
		if (this.isInitialized) {
			posthog.opt_in_capturing();
		}
	}

	/**
	 * Reset user data
	 */
	public reset(): void {
		if (this.isInitialized) {
			posthog.reset();
		}
		this.queue = [];
	}

	/**
	 * Get analytics data for debugging
	 */
	public getDebugData(): {
		isInitialized: boolean;
		isEnabled: boolean;
		queueLength: number;
		isOnline: boolean;
	} {
		return {
			isInitialized: this.isInitialized,
			isEnabled: this.config.enabled,
			queueLength: this.queue.length,
			isOnline: this.isOnline,
		};
	}

	/**
	 * Send event to PostHog
	 */
	private sendEvent(event: AnalyticsEvent): void {
		try {
			posthog.capture(event.event, event.properties);

			if (this.config.debug) {
				console.log("Analytics event sent:", event);
			}
		} catch (error) {
			handleError(error, { endpoint: "analytics/send-event" });

			// Fallback to localStorage for debugging
			this.storeEventLocally(event);
		}
	}

	/**
	 * Process queued events
	 */
	private processQueue(): void {
		while (this.queue.length > 0) {
			const event = this.queue.shift();
			if (event) {
				this.sendEvent(event);
			}
		}
	}

	/**
	 * Store event locally for debugging
	 */
	private storeEventLocally(event: AnalyticsEvent): void {
		try {
			const events = JSON.parse(
				localStorage.getItem("analytics_events") || "[]",
			);
			events.push(event);
			localStorage.setItem(
				"analytics_events",
				JSON.stringify(events.slice(-100)),
			);
		} catch (error) {
			console.error("Failed to store analytics event locally:", error);
		}
	}

	/**
	 * Setup network status listener
	 */
	private setupNetworkListener(): void {
		window.addEventListener("online", () => {
			this.isOnline = true;
			this.processQueue();
		});

		window.addEventListener("offline", () => {
			this.isOnline = false;
		});
	}
}

// Lazy singleton accessor to avoid eager initialization during circular imports
let analyticsServiceInstance: AnalyticsService | null = null;
export const getAnalyticsService = (): AnalyticsService => {
	if (!analyticsServiceInstance) {
		analyticsServiceInstance = AnalyticsService.getInstance();
	}
	return analyticsServiceInstance;
};

// Common analytics events
export const ANALYTICS_EVENTS = {
	// User lifecycle
	USER_SIGNED_UP: "user_signed_up",
	USER_SIGNED_IN: "user_signed_in",
	USER_SIGNED_OUT: "user_signed_out",

	// Onboarding
	ONBOARDING_STARTED: "onboarding_started",
	ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
	ONBOARDING_COMPLETED: "onboarding_completed",
	ONBOARDING_ABANDONED: "onboarding_abandoned",

	// Lessons
	LESSON_STARTED: "lesson_started",
	LESSON_COMPLETED: "lesson_completed",
	LESSON_ABANDONED: "lesson_abandoned",
	QUIZ_ATTEMPTED: "quiz_attempted",
	QUIZ_PASSED: "quiz_passed",
	QUIZ_FAILED: "quiz_failed",
	TONE_SWITCHED: "tone_switched",

	// Projects
	PROJECT_STARTED: "project_started",
	PROJECT_SUBMITTED: "project_submitted",
	PROJECT_PASSED: "project_passed",
	PROJECT_FAILED: "project_failed",
	PROJECT_RESUBMITTED: "project_resubmitted",

	// Achievements
	ACHIEVEMENT_UNLOCKED: "achievement_unlocked",
	BADGE_EARNED: "badge_earned",
	STREAK_ACHIEVED: "streak_achieved",
	LEVEL_UP: "level_up",

	// Engagement
	FEATURE_USED: "feature_used",
	BUTTON_CLICKED: "button_clicked",
	PAGE_VIEWED: "page_viewed",
	SEARCH_PERFORMED: "search_performed",

	// Errors
	ERROR_OCCURRED: "error_occurred",
	API_ERROR: "api_error",
	VALIDATION_ERROR: "validation_error",

	// Performance
	PERFORMANCE_METRIC: "performance_metric",
	LOAD_TIME: "load_time",
	API_RESPONSE_TIME: "api_response_time",
} as const;
