import { z } from "zod";

/**
 * Environment variable validation schema
 * Validates all required and optional environment variables
 */
const envSchema = z.object({
	// API Configuration
	VITE_GRAPHQL_ENDPOINT: z
		.string()
		.url()
		.default("http://localhost:4000/graphql"),
	VITE_API_BASE_URL: z.string().url().default("http://localhost:4000"),

	// Authentication
	VITE_AUTH_DOMAIN: z.string().min(1).default("localhost"),
	VITE_AUTH_CLIENT_ID: z.string().optional(),

	// Supabase Configuration (optional for development)
	VITE_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
	VITE_SUPABASE_ANON_KEY: z.string().optional().or(z.literal("")),

	// Analytics (PostHog) - optional
	VITE_POSTHOG_KEY: z.string().optional().or(z.literal("")),
	VITE_POSTHOG_HOST: z
		.string()
		.url()
		.optional()
		.default("https://app.posthog.com"),

	// Firebase Configuration - optional
	VITE_FIREBASE_API_KEY: z.string().optional().or(z.literal("")),
	VITE_FIREBASE_AUTH_DOMAIN: z.string().optional().or(z.literal("")),
	VITE_FIREBASE_PROJECT_ID: z.string().optional().or(z.literal("")),
	VITE_FIREBASE_STORAGE_BUCKET: z.string().optional().or(z.literal("")),
	VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().optional().or(z.literal("")),
	VITE_FIREBASE_APP_ID: z.string().optional().or(z.literal("")),

	// LLM Configuration
	VITE_LLM_PROVIDER: z.enum(["openai", "anthropic", "mock"]).default("openai"),
	VITE_LLM_API_KEY: z.string().optional().or(z.literal("")),
	VITE_LLM_MODEL: z.string().default("gpt-4"),
	VITE_LLM_BASE_URL: z.string().url().optional().or(z.literal("")),
	VITE_LLM_TIMEOUT: z
		.string()
		.regex(/^\d+$/)
		.transform(Number)
		.default("30000"),
	VITE_LLM_MAX_RETRIES: z
		.string()
		.regex(/^\d+$/)
		.transform(Number)
		.default("3"),

	// Feature Flags
	VITE_ENABLE_ANALYTICS: z
		.string()
		.transform((val) => val === "true")
		.default("true"),
	VITE_ENABLE_NOTIFICATIONS: z
		.string()
		.transform((val) => val === "true")
		.default("true"),
	VITE_ENABLE_DEBUG_MODE: z
		.string()
		.transform((val) => val === "true")
		.default("false"),

	// App Configuration
	VITE_APP_NAME: z.string().default("AI Skills"),
	VITE_APP_VERSION: z.string().default("1.0.0"),

	// Development Configuration
	VITE_NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
});

type EnvSchema = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns validated config
 * Throws error if required variables are missing or invalid
 */
export function validateEnv(): EnvSchema {
	try {
		// Collect all environment variables
		const env = {
			VITE_GRAPHQL_ENDPOINT: import.meta.env.VITE_GRAPHQL_ENDPOINT,
			VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
			VITE_AUTH_DOMAIN: import.meta.env.VITE_AUTH_DOMAIN,
			VITE_AUTH_CLIENT_ID: import.meta.env.VITE_AUTH_CLIENT_ID,
			VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
			VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
			VITE_POSTHOG_KEY: import.meta.env.VITE_POSTHOG_KEY,
			VITE_POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST,
			VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
			VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
			VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
			VITE_FIREBASE_STORAGE_BUCKET: import.meta.env
				.VITE_FIREBASE_STORAGE_BUCKET,
			VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env
				.VITE_FIREBASE_MESSAGING_SENDER_ID,
			VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
			VITE_LLM_PROVIDER: import.meta.env.VITE_LLM_PROVIDER,
			VITE_LLM_API_KEY: import.meta.env.VITE_LLM_API_KEY,
			VITE_LLM_MODEL: import.meta.env.VITE_LLM_MODEL,
			VITE_LLM_BASE_URL: import.meta.env.VITE_LLM_BASE_URL,
			VITE_LLM_TIMEOUT: import.meta.env.VITE_LLM_TIMEOUT,
			VITE_LLM_MAX_RETRIES: import.meta.env.VITE_LLM_MAX_RETRIES,
			VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS,
			VITE_ENABLE_NOTIFICATIONS: import.meta.env.VITE_ENABLE_NOTIFICATIONS,
			VITE_ENABLE_DEBUG_MODE: import.meta.env.VITE_ENABLE_DEBUG_MODE,
			VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
			VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
			VITE_NODE_ENV: import.meta.env.VITE_NODE_ENV,
		};

		return envSchema.parse(env);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const missingVars = error.errors
				.filter((e) => e.code === "invalid_type" && e.received === "undefined")
				.map((e) => e.path.join("."));

			const invalidVars = error.errors
				.filter((e) => e.code !== "invalid_type" || e.received !== "undefined")
				.map((e) => `${e.path.join(".")}: ${e.message}`);

			const errorMessage = [
				"Environment variable validation failed:",
				missingVars.length > 0 &&
					`Missing required variables: ${missingVars.join(", ")}`,
				invalidVars.length > 0 &&
					`Invalid variables: ${invalidVars.join("; ")}`,
			]
				.filter(Boolean)
				.join("\n");

			console.error(errorMessage);
			console.error("Full validation errors:", error.errors);

			// In development, throw error to prevent silent failures
			if (import.meta.env.DEV) {
				throw new Error(errorMessage);
			}

			// In production, log but continue with defaults
			console.warn(
				"Continuing with default values for missing/invalid environment variables",
			);
		}

		// Return defaults if validation fails in production
		return envSchema.parse({});
	}
}

/**
 * Get validated environment variables
 * Call this at application startup to ensure all required env vars are present
 */
export const validatedEnv = validateEnv();

/**
 * Check if required environment variables are set for production
 */
export function validateProductionEnv(): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (import.meta.env.PROD) {
		// In production, these should be set
		const requiredVars = ["VITE_GRAPHQL_ENDPOINT", "VITE_API_BASE_URL"];

		for (const varName of requiredVars) {
			const value = import.meta.env[varName];
			if (!value || value === "") {
				errors.push(`${varName} is required in production`);
			}
		}

		// Check Supabase if authentication is enabled
		if (
			import.meta.env.VITE_SUPABASE_URL &&
			!import.meta.env.VITE_SUPABASE_ANON_KEY
		) {
			errors.push(
				"VITE_SUPABASE_ANON_KEY is required when VITE_SUPABASE_URL is set",
			);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}
