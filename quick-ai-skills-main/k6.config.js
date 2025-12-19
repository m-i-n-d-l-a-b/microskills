import { defineConfig } from "k6/options";

export default defineConfig({
	// Test scenarios
	scenarios: {
		// Smoke test - minimal load to verify system works
		smoke: {
			executor: "constant-vus",
			vus: 1,
			duration: "1m",
			exec: "smoke",
			tags: { test_type: "smoke" },
		},

		// Load test - normal expected load
		load: {
			executor: "ramping-vus",
			startVUs: 0,
			stages: [
				{ duration: "2m", target: 10 }, // Ramp up to 10 users
				{ duration: "5m", target: 10 }, // Stay at 10 users
				{ duration: "2m", target: 0 }, // Ramp down to 0 users
			],
			exec: "load",
			tags: { test_type: "load" },
		},

		// Stress test - beyond normal capacity
		stress: {
			executor: "ramping-vus",
			startVUs: 0,
			stages: [
				{ duration: "2m", target: 20 }, // Ramp up to 20 users
				{ duration: "5m", target: 20 }, // Stay at 20 users
				{ duration: "2m", target: 0 }, // Ramp down to 0 users
			],
			exec: "stress",
			tags: { test_type: "stress" },
		},

		// Spike test - sudden increase in load
		spike: {
			executor: "ramping-vus",
			startVUs: 0,
			stages: [
				{ duration: "1m", target: 5 }, // Ramp up to 5 users
				{ duration: "1m", target: 50 }, // Spike to 50 users
				{ duration: "1m", target: 50 }, // Stay at 50 users
				{ duration: "1m", target: 5 }, // Ramp down to 5 users
				{ duration: "1m", target: 0 }, // Ramp down to 0 users
			],
			exec: "spike",
			tags: { test_type: "spike" },
		},

		// Soak test - long duration test
		soak: {
			executor: "constant-vus",
			vus: 5,
			duration: "30m",
			exec: "soak",
			tags: { test_type: "soak" },
		},
	},

	// Thresholds for performance requirements
	thresholds: {
		// Response time thresholds
		http_req_duration: ["p(95)<2000"], // 95% of requests should be under 2s
		"http_req_duration{test_type:smoke}": ["p(95)<1000"], // Smoke test should be faster
		"http_req_duration{test_type:load}": ["p(95)<2000"], // Load test threshold
		"http_req_duration{test_type:stress}": ["p(95)<5000"], // Stress test allows higher latency
		"http_req_duration{test_type:spike}": ["p(95)<3000"], // Spike test threshold

		// Error rate thresholds
		http_req_failed: ["rate<0.01"], // Less than 1% error rate
		"http_req_failed{test_type:smoke}": ["rate<0.001"], // Smoke test should have very few errors

		// Throughput thresholds
		http_reqs: ["rate>10"], // At least 10 requests per second
		"http_reqs{test_type:load}": ["rate>20"], // Load test should handle more throughput
		"http_reqs{test_type:stress}": ["rate>30"], // Stress test should handle even more

		// Custom metrics
		checks: ["rate>0.95"], // 95% of checks should pass
		"group_duration{group:::API Calls}": ["p(95)<1500"], // API calls should be under 1.5s
		"group_duration{group:::Authentication}": ["p(95)<1000"], // Auth should be under 1s
		"group_duration{group:::Lesson Operations}": ["p(95)<3000"], // Lessons can take up to 3s
		"group_duration{group:::Project Operations}": ["p(95)<5000"], // Projects can take up to 5s
	},

	// Global options
	options: {
		// Environment variables
		env: {
			BASE_URL: __ENV.BASE_URL || "http://localhost:4000",
			GRAPHQL_URL: __ENV.GRAPHQL_URL || "http://localhost:4000/graphql",
			TEST_USER_EMAIL: __ENV.TEST_USER_EMAIL || "test@example.com",
			TEST_USER_PASSWORD: __ENV.TEST_USER_PASSWORD || "testpassword123",
			ENABLE_AUTH: __ENV.ENABLE_AUTH !== "false",
			ENABLE_GRAPHQL: __ENV.ENABLE_GRAPHQL !== "false",
		},

		// Output options
		summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
		summaryTimeUnit: "s",

		// Logging
		consoleOutput: "text",
		httpDebug: false,

		// Timeouts
		httpTimeout: "30s",
		httpRequestTimeout: "30s",

		// User agent
		userAgent: "k6-load-test/1.0",
	},
});
