import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";
import { randomItem, randomIntBetween } from "k6/utils";

// Custom metrics
const authSuccessRate = new Rate("auth_success_rate");
const lessonLoadTime = new Trend("lesson_load_time");
const projectSubmissionTime = new Trend("project_submission_time");
const _apiErrorRate = new Rate("api_error_rate");
const activeUsers = new Counter("active_users");

// Test data
const testUsers = [
	{ email: "test1@example.com", password: "testpass123" },
	{ email: "test2@example.com", password: "testpass123" },
	{ email: "test3@example.com", password: "testpass123" },
	{ email: "test4@example.com", password: "testpass123" },
	{ email: "test5@example.com", password: "testpass123" },
];

const lessonTones = ["friendly", "professional", "casual", "formal"];
const projectTypes = ["web-app", "api", "data-analysis", "mobile-app"];

// Helper functions
function getAuthToken(email, password) {
	const loginPayload = JSON.stringify({
		email: email,
		password: password,
	});

	const loginResponse = http.post(
		`${__ENV.BASE_URL}/auth/login`,
		loginPayload,
		{
			headers: {
				"Content-Type": "application/json",
			},
		},
	);

	if (
		check(loginResponse, {
			"login successful": (r) => r.status === 200,
			"login response has token": (r) => r.json("token") !== undefined,
		})
	) {
		authSuccessRate.add(1);
		return loginResponse.json("token");
	} else {
		authSuccessRate.add(0);
		return null;
	}
}

function getHeaders(token = null) {
	const headers = {
		"Content-Type": "application/json",
		Accept: "application/json",
	};

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	return headers;
}

// Smoke test - basic functionality verification
export function smoke() {
	group("Smoke Test - Basic API Health", () => {
		// Health check
		const healthResponse = http.get(`${__ENV.BASE_URL}/health`);
		check(healthResponse, {
			"health check status is 200": (r) => r.status === 200,
			"health check response time < 500ms": (r) => r.timings.duration < 500,
		});

		// GraphQL health check
		if (__ENV.ENABLE_GRAPHQL === "true") {
			const graphqlHealthResponse = http.post(
				__ENV.GRAPHQL_URL,
				JSON.stringify({
					query: "{ __schema { types { name } } }",
				}),
				{
					headers: { "Content-Type": "application/json" },
				},
			);

			check(graphqlHealthResponse, {
				"GraphQL health check status is 200": (r) => r.status === 200,
				"GraphQL health check response time < 1000ms": (r) =>
					r.timings.duration < 1000,
			});
		}

		sleep(1);
	});
}

// Load test - normal expected load
export function load() {
	const user = randomItem(testUsers);
	const token = getAuthToken(user.email, user.password);

	group("Load Test - Authentication", () => {
		if (token) {
			// Test token refresh
			const refreshResponse = http.post(
				`${__ENV.BASE_URL}/auth/refresh`,
				JSON.stringify({
					refreshToken: "mock-refresh-token",
				}),
				{
					headers: getHeaders(token),
				},
			);

			check(refreshResponse, {
				"token refresh successful": (r) => r.status === 200 || r.status === 401, // 401 is expected for mock token
			});
		}
	});

	group("Load Test - User Operations", () => {
		if (token) {
			// Get user profile
			const profileResponse = http.get(`${__ENV.BASE_URL}/user/profile`, {
				headers: getHeaders(token),
			});

			check(profileResponse, {
				"get profile successful": (r) => r.status === 200,
				"profile response time < 1000ms": (r) => r.timings.duration < 1000,
			});

			// Get user preferences
			const preferencesResponse = http.get(
				`${__ENV.BASE_URL}/user/preferences`,
				{
					headers: getHeaders(token),
				},
			);

			check(preferencesResponse, {
				"get preferences successful": (r) => r.status === 200,
			});

			// Get user progress
			const progressResponse = http.get(`${__ENV.BASE_URL}/user/progress`, {
				headers: getHeaders(token),
			});

			check(progressResponse, {
				"get progress successful": (r) => r.status === 200,
			});
		}
	});

	group("Load Test - Lesson Operations", () => {
		if (token) {
			// Get daily lesson
			const lessonStart = Date.now();
			const lessonResponse = http.get(`${__ENV.BASE_URL}/lessons/daily`, {
				headers: getHeaders(token),
			});
			const lessonDuration = Date.now() - lessonStart;
			lessonLoadTime.add(lessonDuration);

			check(lessonResponse, {
				"get daily lesson successful": (r) => r.status === 200,
				"lesson response time < 3000ms": (r) => r.timings.duration < 3000,
			});

			// Submit quiz
			const quizPayload = JSON.stringify({
				lessonId: "mock-lesson-id",
				answers: [
					{ questionId: "q1", answer: "A" },
					{ questionId: "q2", answer: "B" },
				],
				timeSpent: randomIntBetween(30, 300),
			});

			const quizResponse = http.post(
				`${__ENV.BASE_URL}/lessons/quiz`,
				quizPayload,
				{
					headers: getHeaders(token),
				},
			);

			check(quizResponse, {
				"submit quiz successful": (r) => r.status === 200,
				"quiz response time < 2000ms": (r) => r.timings.duration < 2000,
			});

			// Switch lesson tone
			const tonePayload = JSON.stringify({
				lessonId: "mock-lesson-id",
				tone: randomItem(lessonTones),
			});

			const toneResponse = http.post(
				`${__ENV.BASE_URL}/lessons/tone`,
				tonePayload,
				{
					headers: getHeaders(token),
				},
			);

			check(toneResponse, {
				"switch tone successful": (r) => r.status === 200,
			});
		}
	});

	group("Load Test - Project Operations", () => {
		if (token) {
			// Submit project
			const projectStart = Date.now();
			const projectPayload = JSON.stringify({
				type: randomItem(projectTypes),
				title: "Test Project",
				description: "This is a test project submission",
				code: 'console.log("Hello World");',
				requirements: ["feature1", "feature2"],
			});

			const projectResponse = http.post(
				`${__ENV.BASE_URL}/projects/submit`,
				projectPayload,
				{
					headers: getHeaders(token),
				},
			);
			const projectDuration = Date.now() - projectStart;
			projectSubmissionTime.add(projectDuration);

			check(projectResponse, {
				"submit project successful": (r) => r.status === 200,
				"project response time < 5000ms": (r) => r.timings.duration < 5000,
			});

			// Get project status
			const statusResponse = http.get(
				`${__ENV.BASE_URL}/projects/status/mock-project-id`,
				{
					headers: getHeaders(token),
				},
			);

			check(statusResponse, {
				"get project status successful": (r) => r.status === 200,
			});

			// Get project history
			const historyResponse = http.get(`${__ENV.BASE_URL}/projects/history`, {
				headers: getHeaders(token),
			});

			check(historyResponse, {
				"get project history successful": (r) => r.status === 200,
			});
		}
	});

	group("Load Test - Analytics", () => {
		if (token) {
			// Track analytics event
			const eventPayload = JSON.stringify({
				event: "lesson_completed",
				properties: {
					lessonId: "mock-lesson-id",
					timeSpent: randomIntBetween(60, 600),
					score: randomIntBetween(70, 100),
				},
			});

			const eventResponse = http.post(
				`${__ENV.BASE_URL}/analytics/events`,
				eventPayload,
				{
					headers: getHeaders(token),
				},
			);

			check(eventResponse, {
				"track event successful": (r) => r.status === 200,
			});
		}
	});

	sleep(randomIntBetween(1, 3));
}

// Stress test - beyond normal capacity
export function stress() {
	const user = randomItem(testUsers);
	const token = getAuthToken(user.email, user.password);

	group("Stress Test - Heavy Operations", () => {
		if (token) {
			// Simulate heavy lesson streaming
			const streamResponse = http.get(
				`${__ENV.BASE_URL}/lessons/stream/mock-lesson-id`,
				{
					headers: getHeaders(token),
				},
			);

			check(streamResponse, {
				"lesson stream successful": (r) => r.status === 200,
			});

			// Simulate LLM evaluation
			const llmPayload = JSON.stringify({
				code: "function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }",
				requirements: ["efficiency", "readability", "correctness"],
				language: "javascript",
			});

			const llmResponse = http.post(
				`${__ENV.BASE_URL}/llm/evaluate`,
				llmPayload,
				{
					headers: getHeaders(token),
				},
			);

			check(llmResponse, {
				"LLM evaluation successful": (r) => r.status === 200,
			});

			// Simulate certificate generation
			const certPayload = JSON.stringify({
				trackId: "mock-track-id",
				userId: "mock-user-id",
			});

			const certResponse = http.post(
				`${__ENV.BASE_URL}/certificates/generate`,
				certPayload,
				{
					headers: getHeaders(token),
				},
			);

			check(certResponse, {
				"certificate generation successful": (r) => r.status === 200,
			});
		}
	});

	sleep(randomIntBetween(2, 5));
}

// Spike test - sudden increase in load
export function spike() {
	const user = randomItem(testUsers);
	const token = getAuthToken(user.email, user.password);

	group("Spike Test - Rapid Requests", () => {
		if (token) {
			// Rapid fire API calls
			const responses = http.batch([
				[
					"GET",
					`${__ENV.BASE_URL}/user/profile`,
					null,
					{ headers: getHeaders(token) },
				],
				[
					"GET",
					`${__ENV.BASE_URL}/lessons/daily`,
					null,
					{ headers: getHeaders(token) },
				],
				[
					"GET",
					`${__ENV.BASE_URL}/user/progress`,
					null,
					{ headers: getHeaders(token) },
				],
				[
					"POST",
					`${__ENV.BASE_URL}/analytics/events`,
					JSON.stringify({ event: "page_view" }),
					{ headers: getHeaders(token) },
				],
			]);

			responses.forEach((response, index) => {
				check(response, {
					[`spike request ${index + 1} successful`]: (r) => r.status === 200,
					[`spike request ${index + 1} response time < 2000ms`]: (r) =>
						r.timings.duration < 2000,
				});
			});
		}
	});

	sleep(randomIntBetween(0.5, 1.5));
}

// Soak test - long duration test
export function soak() {
	const user = randomItem(testUsers);
	const token = getAuthToken(user.email, user.password);

	group("Soak Test - Sustained Load", () => {
		if (token) {
			// Simulate normal user behavior over time
			const operations = [
				() =>
					http.get(`${__ENV.BASE_URL}/user/profile`, {
						headers: getHeaders(token),
					}),
				() =>
					http.get(`${__ENV.BASE_URL}/lessons/daily`, {
						headers: getHeaders(token),
					}),
				() =>
					http.get(`${__ENV.BASE_URL}/user/progress`, {
						headers: getHeaders(token),
					}),
				() =>
					http.post(
						`${__ENV.BASE_URL}/analytics/events`,
						JSON.stringify({ event: "heartbeat" }),
						{ headers: getHeaders(token) },
					),
			];

			const randomOperation = randomItem(operations);
			const response = randomOperation();

			check(response, {
				"soak test operation successful": (r) => r.status === 200,
				"soak test response time < 3000ms": (r) => r.timings.duration < 3000,
			});
		}
	});

	sleep(randomIntBetween(5, 15));
}

// Setup and teardown
export function setup() {
	console.log("Setting up load test environment...");
	activeUsers.add(1);

	// Verify test environment
	const healthResponse = http.get(`${__ENV.BASE_URL}/health`);
	if (healthResponse.status !== 200) {
		throw new Error(`Health check failed: ${healthResponse.status}`);
	}

	console.log("Load test environment ready");
}

export function teardown(_data) {
	console.log("Cleaning up load test environment...");
	activeUsers.add(-1);
	console.log("Load test completed");
}

// Default export for k6
export default function () {
	// This function is not used when using scenarios
	// Each scenario has its own function
}
