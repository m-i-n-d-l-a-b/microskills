import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	ENV,
	API_ENDPOINTS,
	HTTP_STATUS,
	ERROR_MESSAGES,
	STORAGE_KEYS,
	REQUEST_CONFIG,
	FEATURES,
	VALIDATION_RULES,
	ROUTES,
} from "./constants";

describe("Constants Configuration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Environment Variables", () => {
		it("should have default GraphQL endpoint", () => {
			expect(ENV.GRAPHQL_ENDPOINT).toBeDefined();
			expect(typeof ENV.GRAPHQL_ENDPOINT).toBe("string");
		});

		it("should have default API base URL", () => {
			expect(ENV.API_BASE_URL).toBeDefined();
			expect(typeof ENV.API_BASE_URL).toBe("string");
		});

		it("should have Firebase configuration", () => {
			expect(ENV.FIREBASE_CONFIG).toBeDefined();
			expect(typeof ENV.FIREBASE_CONFIG).toBe("object");
			expect(ENV.FIREBASE_CONFIG.apiKey).toBeDefined();
			expect(ENV.FIREBASE_CONFIG.authDomain).toBeDefined();
			expect(ENV.FIREBASE_CONFIG.projectId).toBeDefined();
		});

		it("should have feature flags", () => {
			expect(ENV.ENABLE_ANALYTICS).toBeDefined();
			expect(typeof ENV.ENABLE_ANALYTICS).toBe("boolean");
			expect(ENV.ENABLE_NOTIFICATIONS).toBeDefined();
			expect(typeof ENV.ENABLE_NOTIFICATIONS).toBe("boolean");
			expect(ENV.ENABLE_DEBUG_MODE).toBeDefined();
			expect(typeof ENV.ENABLE_DEBUG_MODE).toBe("boolean");
		});

		it("should have app configuration", () => {
			expect(ENV.APP_NAME).toBeDefined();
			expect(typeof ENV.APP_NAME).toBe("string");
			expect(ENV.APP_VERSION).toBeDefined();
			expect(typeof ENV.APP_VERSION).toBe("string");
			expect(ENV.NODE_ENV).toBeDefined();
			expect(typeof ENV.NODE_ENV).toBe("string");
		});
	});

	describe("API Endpoints", () => {
		it("should have GraphQL endpoint", () => {
			expect(API_ENDPOINTS.GRAPHQL).toBeDefined();
			expect(typeof API_ENDPOINTS.GRAPHQL).toBe("string");
		});

		it("should have authentication endpoints", () => {
			expect(API_ENDPOINTS.AUTH).toBeDefined();
			expect(API_ENDPOINTS.AUTH.LOGIN).toBeDefined();
			expect(API_ENDPOINTS.AUTH.LOGOUT).toBeDefined();
			expect(API_ENDPOINTS.AUTH.REFRESH).toBeDefined();
			expect(API_ENDPOINTS.AUTH.REGISTER).toBeDefined();
		});

		it("should have user endpoints", () => {
			expect(API_ENDPOINTS.USER).toBeDefined();
			expect(API_ENDPOINTS.USER.PROFILE).toBeDefined();
			expect(API_ENDPOINTS.USER.PREFERENCES).toBeDefined();
			expect(API_ENDPOINTS.USER.PROGRESS).toBeDefined();
			expect(API_ENDPOINTS.USER.ACHIEVEMENTS).toBeDefined();
		});

		it("should have lesson endpoints", () => {
			expect(API_ENDPOINTS.LESSONS).toBeDefined();
			expect(API_ENDPOINTS.LESSONS.DAILY).toBeDefined();
			expect(API_ENDPOINTS.LESSONS.PROGRESS).toBeDefined();
			expect(API_ENDPOINTS.LESSONS.SUBMIT_QUIZ).toBeDefined();
			expect(API_ENDPOINTS.LESSONS.SWITCH_TONE).toBeDefined();
		});

		it("should have project endpoints", () => {
			expect(API_ENDPOINTS.PROJECTS).toBeDefined();
			expect(API_ENDPOINTS.PROJECTS.SUBMIT).toBeDefined();
			expect(API_ENDPOINTS.PROJECTS.STATUS).toBeDefined();
			expect(API_ENDPOINTS.PROJECTS.HISTORY).toBeDefined();
		});

		it("should have certificate endpoints", () => {
			expect(API_ENDPOINTS.CERTIFICATES).toBeDefined();
			expect(API_ENDPOINTS.CERTIFICATES.GENERATE).toBeDefined();
			expect(API_ENDPOINTS.CERTIFICATES.SHARE).toBeDefined();
			expect(API_ENDPOINTS.CERTIFICATES.VERIFY).toBeDefined();
		});

		it("should have analytics endpoints", () => {
			expect(API_ENDPOINTS.ANALYTICS).toBeDefined();
			expect(API_ENDPOINTS.ANALYTICS.EVENTS).toBeDefined();
			expect(API_ENDPOINTS.ANALYTICS.FUNNELS).toBeDefined();
			expect(API_ENDPOINTS.ANALYTICS.RETENTION).toBeDefined();
		});

		it("should have notification endpoints", () => {
			expect(API_ENDPOINTS.NOTIFICATIONS).toBeDefined();
			expect(API_ENDPOINTS.NOTIFICATIONS.PREFERENCES).toBeDefined();
			expect(API_ENDPOINTS.NOTIFICATIONS.SEND).toBeDefined();
			expect(API_ENDPOINTS.NOTIFICATIONS.SCHEDULE).toBeDefined();
		});
	});

	describe("HTTP Status Codes", () => {
		it("should have all required status codes", () => {
			expect(HTTP_STATUS.OK).toBe(200);
			expect(HTTP_STATUS.CREATED).toBe(201);
			expect(HTTP_STATUS.NO_CONTENT).toBe(204);
			expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
			expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
			expect(HTTP_STATUS.FORBIDDEN).toBe(403);
			expect(HTTP_STATUS.NOT_FOUND).toBe(404);
			expect(HTTP_STATUS.CONFLICT).toBe(409);
			expect(HTTP_STATUS.UNPROCESSABLE_ENTITY).toBe(422);
			expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
			expect(HTTP_STATUS.BAD_GATEWAY).toBe(502);
			expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
		});
	});

	describe("Error Messages", () => {
		it("should have all error messages defined", () => {
			expect(ERROR_MESSAGES.NETWORK_ERROR).toBeDefined();
			expect(ERROR_MESSAGES.UNAUTHORIZED).toBeDefined();
			expect(ERROR_MESSAGES.FORBIDDEN).toBeDefined();
			expect(ERROR_MESSAGES.NOT_FOUND).toBeDefined();
			expect(ERROR_MESSAGES.VALIDATION_ERROR).toBeDefined();
			expect(ERROR_MESSAGES.SERVER_ERROR).toBeDefined();
			expect(ERROR_MESSAGES.TIMEOUT_ERROR).toBeDefined();
			expect(ERROR_MESSAGES.UNKNOWN_ERROR).toBeDefined();
		});

		it("should have meaningful error messages", () => {
			expect(ERROR_MESSAGES.NETWORK_ERROR).toContain("Network error");
			expect(ERROR_MESSAGES.UNAUTHORIZED).toContain("not authorized");
			expect(ERROR_MESSAGES.FORBIDDEN).toContain("Access denied");
			expect(ERROR_MESSAGES.NOT_FOUND).toContain("not found");
		});
	});

	describe("Storage Keys", () => {
		it("should have all storage keys defined", () => {
			expect(STORAGE_KEYS.AUTH_TOKEN).toBe("auth_token");
			expect(STORAGE_KEYS.REFRESH_TOKEN).toBe("refresh_token");
			expect(STORAGE_KEYS.USER_PREFERENCES).toBe("user_preferences");
			expect(STORAGE_KEYS.LESSON_PROGRESS).toBe("lesson_progress");
			expect(STORAGE_KEYS.ANALYTICS_EVENTS).toBe("analytics_events");
			expect(STORAGE_KEYS.NOTIFICATION_SETTINGS).toBe("notification_settings");
		});
	});

	describe("Request Configuration", () => {
		it("should have reasonable timeout values", () => {
			expect(REQUEST_CONFIG.TIMEOUT).toBe(30000);
			expect(REQUEST_CONFIG.RETRY_ATTEMPTS).toBe(3);
			expect(REQUEST_CONFIG.RETRY_DELAY).toBe(1000);
			expect(REQUEST_CONFIG.CACHE_DURATION).toBe(5 * 60 * 1000);
		});

		it("should have positive values", () => {
			expect(REQUEST_CONFIG.TIMEOUT).toBeGreaterThan(0);
			expect(REQUEST_CONFIG.RETRY_ATTEMPTS).toBeGreaterThan(0);
			expect(REQUEST_CONFIG.RETRY_DELAY).toBeGreaterThan(0);
			expect(REQUEST_CONFIG.CACHE_DURATION).toBeGreaterThan(0);
		});
	});

	describe("Feature Flags", () => {
		it("should have all feature flags defined", () => {
			expect(FEATURES.SPACED_REPETITION).toBeDefined();
			expect(FEATURES.REAL_TIME_LESSONS).toBeDefined();
			expect(FEATURES.PROJECT_GRADING).toBeDefined();
			expect(FEATURES.ACHIEVEMENTS).toBeDefined();
			expect(FEATURES.LEADERBOARD).toBeDefined();
			expect(FEATURES.BADGE_SHARING).toBeDefined();
			expect(FEATURES.PUSH_NOTIFICATIONS).toBeDefined();
			expect(FEATURES.ANALYTICS).toBeDefined();
		});

		it("should have boolean values", () => {
			expect(typeof FEATURES.SPACED_REPETITION).toBe("boolean");
			expect(typeof FEATURES.REAL_TIME_LESSONS).toBe("boolean");
			expect(typeof FEATURES.PROJECT_GRADING).toBe("boolean");
			expect(typeof FEATURES.ACHIEVEMENTS).toBe("boolean");
			expect(typeof FEATURES.LEADERBOARD).toBe("boolean");
			expect(typeof FEATURES.BADGE_SHARING).toBe("boolean");
		});
	});

	describe("Validation Rules", () => {
		it("should have email validation regex", () => {
			expect(VALIDATION_RULES.EMAIL).toBeInstanceOf(RegExp);
		});

		it("should validate correct email format", () => {
			const validEmails = [
				"test@example.com",
				"user.name@domain.co.uk",
				"user+tag@example.org",
			];

			validEmails.forEach((email) => {
				expect(VALIDATION_RULES.EMAIL.test(email)).toBe(true);
			});
		});

		it("should reject invalid email format", () => {
			const invalidEmails = [
				"invalid-email",
				"@example.com",
				"user@",
				"user@.com",
			];

			invalidEmails.forEach((email) => {
				expect(VALIDATION_RULES.EMAIL.test(email)).toBe(false);
			});
		});

		it("should have password length requirements", () => {
			expect(VALIDATION_RULES.PASSWORD_MIN_LENGTH).toBe(8);
			expect(VALIDATION_RULES.PASSWORD_MIN_LENGTH).toBeGreaterThan(0);
		});

		it("should have username length requirements", () => {
			expect(VALIDATION_RULES.USERNAME_MIN_LENGTH).toBe(3);
			expect(VALIDATION_RULES.USERNAME_MAX_LENGTH).toBe(20);
			expect(VALIDATION_RULES.USERNAME_MAX_LENGTH).toBeGreaterThan(
				VALIDATION_RULES.USERNAME_MIN_LENGTH,
			);
		});
	});

	describe("App Routes", () => {
		it("should have all required routes", () => {
			expect(ROUTES.HOME).toBe("/");
			expect(ROUTES.LOGIN).toBe("/login");
			expect(ROUTES.REGISTER).toBe("/register");
			expect(ROUTES.DASHBOARD).toBe("/dashboard");
			expect(ROUTES.LESSONS).toBe("/lessons");
			expect(ROUTES.PROJECTS).toBe("/projects");
			expect(ROUTES.PROFILE).toBe("/profile");
			expect(ROUTES.SETTINGS).toBe("/settings");
			expect(ROUTES.LEADERBOARD).toBe("/leaderboard");
			expect(ROUTES.ACHIEVEMENTS).toBe("/achievements");
			expect(ROUTES.CERTIFICATES).toBe("/certificates");
			expect(ROUTES.ADMIN).toBe("/admin");
		});

		it("should have valid route paths", () => {
			Object.values(ROUTES).forEach((route) => {
				expect(route).toMatch(/^\//);
				expect(typeof route).toBe("string");
			});
		});
	});
});
