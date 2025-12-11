import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";
import { randomItem, randomIntBetween } from "k6/utils";

// Custom metrics for GraphQL
const _graphqlSuccessRate = new Rate("graphql_success_rate");
const graphqlQueryTime = new Trend("graphql_query_time");
const graphqlMutationTime = new Trend("graphql_mutation_time");

// GraphQL queries and mutations
const queries = {
	getDailyLesson: `
    query GetDailyLesson {
      getDailyLesson {
        id
        title
        content
        difficulty
        estimatedTime
        topics
        quiz {
          id
          questions {
            id
            question
            options
            correctAnswer
          }
        }
      }
    }
  `,

	getUserProfile: `
    query GetUserProfile {
      getUserProfile {
        id
        email
        name
        avatar
        preferences {
          learningStyle
          difficulty
          notifications
        }
        progress {
          completedLessons
          totalXP
          currentStreak
          achievements {
            id
            name
            description
            unlockedAt
          }
        }
      }
    }
  `,

	getUserProgress: `
    query GetUserProgress {
      getUserProgress {
        completedLessons
        totalXP
        currentStreak
        longestStreak
        averageScore
        timeSpent
        lastActive
        achievements {
          id
          name
          description
          unlockedAt
        }
        lessonHistory {
          lessonId
          completedAt
          score
          timeSpent
        }
      }
    }
  `,

	getProjectHistory: `
    query GetProjectHistory {
      getProjectHistory {
        id
        title
        type
        status
        submittedAt
        completedAt
        score
        feedback
        requirements
      }
    }
  `,

	getLeaderboard: `
    query GetLeaderboard {
      getLeaderboard {
        rank
        user {
          id
          name
          avatar
        }
        totalXP
        completedLessons
        currentStreak
      }
    }
  `,
};

const mutations = {
	submitQuiz: `
    mutation SubmitQuiz($input: QuizSubmissionInput!) {
      submitQuiz(input: $input) {
        success
        score
        feedback
        correctAnswers
        totalQuestions
        timeSpent
        xpEarned
      }
    }
  `,

	switchTone: `
    mutation SwitchTone($input: ToneSwitchInput!) {
      switchTone(input: $input) {
        success
        newTone
        updatedContent
      }
    }
  `,

	submitProject: `
    mutation SubmitProject($input: ProjectSubmissionInput!) {
      submitProject(input: $input) {
        success
        projectId
        status
        estimatedCompletionTime
        queuePosition
      }
    }
  `,

	shareBadge: `
    mutation ShareBadge($input: BadgeShareInput!) {
      shareBadge(input: $input) {
        success
        shareUrl
        platform
        sharedAt
      }
    }
  `,

	trackEvent: `
    mutation TrackEvent($input: EventTrackingInput!) {
      trackEvent(input: $input) {
        success
        eventId
        trackedAt
      }
    }
  `,
};

// Helper function to make GraphQL requests
function graphqlRequest(query, variables = {}, headers = {}) {
	const payload = JSON.stringify({
		query: query,
		variables: variables,
	});

	const defaultHeaders = {
		"Content-Type": "application/json",
		Accept: "application/json",
	};

	const response = http.post(__ENV.GRAPHQL_URL, payload, {
		headers: { ...defaultHeaders, ...headers },
	});

	return response;
}

// Helper function to get auth headers
function _getAuthHeaders(token = null) {
	const headers = {};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}
	return headers;
}

// GraphQL smoke test
export function graphqlSmoke() {
	group("GraphQL Smoke Test", () => {
		// Test introspection query
		const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          types {
            name
            kind
          }
          queryType {
            name
          }
          mutationType {
            name
          }
        }
      }
    `;

		const response = graphqlRequest(introspectionQuery);

		check(response, {
			"GraphQL introspection successful": (r) => r.status === 200,
			"GraphQL introspection response time < 1000ms": (r) =>
				r.timings.duration < 1000,
			"GraphQL introspection has schema": (r) => {
				try {
					const data = r.json("data");
					return data?.__schema?.types;
				} catch (_e) {
					return false;
				}
			},
		});

		sleep(1);
	});
}

// GraphQL load test
export function graphqlLoad() {
	group("GraphQL Load Test - Queries", () => {
		// Test getDailyLesson query
		const lessonStart = Date.now();
		const lessonResponse = graphqlRequest(queries.getDailyLesson);
		const lessonDuration = Date.now() - lessonStart;
		graphqlQueryTime.add(lessonDuration);

		check(lessonResponse, {
			"getDailyLesson query successful": (r) => r.status === 200,
			"getDailyLesson response time < 2000ms": (r) => r.timings.duration < 2000,
			"getDailyLesson has data": (r) => {
				try {
					const data = r.json("data");
					return data?.getDailyLesson;
				} catch (_e) {
					return false;
				}
			},
		});

		// Test getUserProfile query
		const profileResponse = graphqlRequest(queries.getUserProfile);

		check(profileResponse, {
			"getUserProfile query successful": (r) => r.status === 200,
			"getUserProfile response time < 1500ms": (r) => r.timings.duration < 1500,
		});

		// Test getUserProgress query
		const progressResponse = graphqlRequest(queries.getUserProgress);

		check(progressResponse, {
			"getUserProgress query successful": (r) => r.status === 200,
			"getUserProgress response time < 1500ms": (r) =>
				r.timings.duration < 1500,
		});

		// Test getLeaderboard query
		const leaderboardResponse = graphqlRequest(queries.getLeaderboard);

		check(leaderboardResponse, {
			"getLeaderboard query successful": (r) => r.status === 200,
			"getLeaderboard response time < 2000ms": (r) => r.timings.duration < 2000,
		});
	});

	group("GraphQL Load Test - Mutations", () => {
		// Test submitQuiz mutation
		const quizVariables = {
			input: {
				lessonId: "mock-lesson-id",
				answers: [
					{ questionId: "q1", answer: "A" },
					{ questionId: "q2", answer: "B" },
					{ questionId: "q3", answer: "C" },
				],
				timeSpent: randomIntBetween(60, 300),
			},
		};

		const quizStart = Date.now();
		const quizResponse = graphqlRequest(mutations.submitQuiz, quizVariables);
		const quizDuration = Date.now() - quizStart;
		graphqlMutationTime.add(quizDuration);

		check(quizResponse, {
			"submitQuiz mutation successful": (r) => r.status === 200,
			"submitQuiz response time < 3000ms": (r) => r.timings.duration < 3000,
		});

		// Test switchTone mutation
		const toneVariables = {
			input: {
				lessonId: "mock-lesson-id",
				tone: randomItem(["friendly", "professional", "casual", "formal"]),
			},
		};

		const toneResponse = graphqlRequest(mutations.switchTone, toneVariables);

		check(toneResponse, {
			"switchTone mutation successful": (r) => r.status === 200,
			"switchTone response time < 2000ms": (r) => r.timings.duration < 2000,
		});

		// Test trackEvent mutation
		const eventVariables = {
			input: {
				event: "lesson_completed",
				properties: {
					lessonId: "mock-lesson-id",
					timeSpent: randomIntBetween(60, 600),
					score: randomIntBetween(70, 100),
				},
			},
		};

		const eventResponse = graphqlRequest(mutations.trackEvent, eventVariables);

		check(eventResponse, {
			"trackEvent mutation successful": (r) => r.status === 200,
			"trackEvent response time < 1000ms": (r) => r.timings.duration < 1000,
		});
	});

	sleep(randomIntBetween(1, 3));
}

// GraphQL stress test
export function graphqlStress() {
	group("GraphQL Stress Test - Complex Queries", () => {
		// Test complex project submission
		const projectVariables = {
			input: {
				type: randomItem(["web-app", "api", "data-analysis", "mobile-app"]),
				title: "Stress Test Project",
				description: "This is a complex project for stress testing",
				code: `
          function fibonacci(n) {
            if (n <= 1) return n;
            return fibonacci(n-1) + fibonacci(n-2);
          }
          
          function bubbleSort(arr) {
            const len = arr.length;
            for (let i = 0; i < len; i++) {
              for (let j = 0; j < len - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                  [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                }
              }
            }
            return arr;
          }
          
          // Test the functions
          console.log(fibonacci(10));
          console.log(bubbleSort([64, 34, 25, 12, 22, 11, 90]));
        `,
				requirements: [
					"Implement efficient algorithms",
					"Include proper error handling",
					"Add comprehensive documentation",
					"Optimize for performance",
					"Include unit tests",
				],
				language: "javascript",
			},
		};

		const projectStart = Date.now();
		const projectResponse = graphqlRequest(
			mutations.submitProject,
			projectVariables,
		);
		const projectDuration = Date.now() - projectStart;
		graphqlMutationTime.add(projectDuration);

		check(projectResponse, {
			"submitProject mutation successful": (r) => r.status === 200,
			"submitProject response time < 5000ms": (r) => r.timings.duration < 5000,
		});

		// Test badge sharing
		const badgeVariables = {
			input: {
				certificateId: "mock-certificate-id",
				platform: randomItem(["linkedin", "twitter", "notion", "portfolio"]),
				message: "Just completed an AI skills course!",
			},
		};

		const badgeResponse = graphqlRequest(mutations.shareBadge, badgeVariables);

		check(badgeResponse, {
			"shareBadge mutation successful": (r) => r.status === 200,
			"shareBadge response time < 3000ms": (r) => r.timings.duration < 3000,
		});
	});

	sleep(randomIntBetween(2, 5));
}

// GraphQL spike test
export function graphqlSpike() {
	group("GraphQL Spike Test - Rapid Queries", () => {
		// Rapid fire GraphQL queries
		const queryList = [
			queries.getDailyLesson,
			queries.getUserProfile,
			queries.getUserProgress,
			queries.getLeaderboard,
		];

		const responses = queryList.map((query) => graphqlRequest(query));

		responses.forEach((response, index) => {
			check(response, {
				[`GraphQL spike query ${index + 1} successful`]: (r) =>
					r.status === 200,
				[`GraphQL spike query ${index + 1} response time < 2000ms`]: (r) =>
					r.timings.duration < 2000,
			});
		});
	});

	sleep(randomIntBetween(0.5, 1.5));
}

// GraphQL soak test
export function graphqlSoak() {
	group("GraphQL Soak Test - Sustained Queries", () => {
		// Simulate normal GraphQL usage over time
		const operations = [
			() => graphqlRequest(queries.getDailyLesson),
			() => graphqlRequest(queries.getUserProfile),
			() => graphqlRequest(queries.getUserProgress),
			() =>
				graphqlRequest(mutations.trackEvent, {
					input: {
						event: "heartbeat",
						properties: { timestamp: Date.now() },
					},
				}),
		];

		const randomOperation = randomItem(operations);
		const response = randomOperation();

		check(response, {
			"GraphQL soak test operation successful": (r) => r.status === 200,
			"GraphQL soak test response time < 3000ms": (r) =>
				r.timings.duration < 3000,
		});
	});

	sleep(randomIntBetween(5, 15));
}

// Setup and teardown for GraphQL tests
export function graphqlSetup() {
	console.log("Setting up GraphQL load test environment...");

	// Verify GraphQL endpoint
	const healthResponse = graphqlRequest("{ __schema { types { name } } }");
	if (healthResponse.status !== 200) {
		throw new Error(`GraphQL health check failed: ${healthResponse.status}`);
	}

	console.log("GraphQL load test environment ready");
}

export function graphqlTeardown(_data) {
	console.log("Cleaning up GraphQL load test environment...");
	console.log("GraphQL load test completed");
}

// Default export
export default function () {
	// This function is not used when using scenarios
	// Each scenario has its own function
}
