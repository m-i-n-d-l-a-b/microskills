import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "./api";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Mock the monitoring service
vi.mock("@/services/monitoringService", () => ({
	reportError: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

// Mock the auth utilities
vi.mock("@/lib/auth", () => ({
	getAuthToken: vi.fn(() => "mock-token"),
	refreshAuthToken: vi.fn(() => Promise.resolve("new-mock-token")),
}));

// Create MSW server for API mocking
const server = setupServer(
	// GraphQL endpoint
	http.post("/api/graphql", async ({ request }) => {
		const body = await request.json();

		// Mock different GraphQL operations
		if (body.query.includes("getDailyLesson")) {
			return HttpResponse.json({
				data: {
					getDailyLesson: {
						id: "lesson-1",
						title: "Test Lesson",
						content: "Test content",
						difficulty: "beginner",
						estimatedTime: 5,
					},
				},
			});
		}

		if (body.query.includes("submitQuiz")) {
			return HttpResponse.json({
				data: {
					submitQuiz: {
						success: true,
						score: 85,
						feedback: "Great job!",
						nextStep: 2,
					},
				},
			});
		}

		if (body.query.includes("submitProject")) {
			return HttpResponse.json({
				data: {
					submitProject: {
						success: true,
						projectId: "project-123",
						status: "submitted",
						estimatedGradingTime: 30,
					},
				},
			});
		}

		if (body.query.includes("getUserProgress")) {
			return HttpResponse.json({
				data: {
					getUserProgress: {
						userId: "user-123",
						lessonsCompleted: 24,
						totalXP: 2450,
						currentLevel: 12,
						streak: 7,
					},
				},
			});
		}

		// Default response
		return HttpResponse.json({
			data: null,
			errors: [{ message: "Unknown operation" }],
		});
	}),

	// REST API endpoints
	http.get("/api/health", () => {
		return HttpResponse.json({
			status: "ok",
			timestamp: new Date().toISOString(),
		});
	}),

	http.post("/api/auth/refresh", () => {
		return HttpResponse.json({
			accessToken: "new-access-token",
			refreshToken: "new-refresh-token",
		});
	}),

	http.get("/api/user/profile", () => {
		return HttpResponse.json({
			id: "user-123",
			email: "test@example.com",
			name: "Test User",
			role: "Developer",
			preferences: {
				notifications: true,
				theme: "dark",
			},
		});
	}),

	http.put("/api/user/preferences", async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json({
			success: true,
			preferences: body,
		});
	}),

	http.get("/api/leaderboard", () => {
		return HttpResponse.json({
			entries: [
				{ userId: "user-1", name: "User 1", xp: 3000, rank: 1 },
				{ userId: "user-2", name: "User 2", xp: 2800, rank: 2 },
				{ userId: "user-3", name: "User 3", xp: 2500, rank: 3 },
			],
		});
	}),

	http.post("/api/analytics/event", async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json({
			success: true,
			eventId: "event-123",
			timestamp: new Date().toISOString(),
		});
	}),
);

describe("API Integration Tests", () => {
	beforeAll(() => {
		server.listen();
	});

	afterEach(() => {
		server.resetHandlers();
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.close();
	});

	describe("GraphQL Operations", () => {
		it("fetches daily lesson successfully", async () => {
			const result = await api.query({
				query: `
          query GetDailyLesson {
            getDailyLesson {
              id
              title
              content
              difficulty
              estimatedTime
            }
          }
        `,
			});

			expect(result.data).toBeDefined();
			expect(result.data.getDailyLesson).toEqual({
				id: "lesson-1",
				title: "Test Lesson",
				content: "Test content",
				difficulty: "beginner",
				estimatedTime: 5,
			});
			expect(result.errors).toBeUndefined();
		});

		it("submits quiz successfully", async () => {
			const result = await api.mutate({
				mutation: `
          mutation SubmitQuiz($lessonId: ID!, $answers: [String!]!) {
            submitQuiz(lessonId: $lessonId, answers: $answers) {
              success
              score
              feedback
              nextStep
            }
          }
        `,
				variables: {
					lessonId: "lesson-1",
					answers: ["answer1", "answer2"],
				},
			});

			expect(result.data).toBeDefined();
			expect(result.data.submitQuiz).toEqual({
				success: true,
				score: 85,
				feedback: "Great job!",
				nextStep: 2,
			});
			expect(result.errors).toBeUndefined();
		});

		it("submits project successfully", async () => {
			const result = await api.mutate({
				mutation: `
          mutation SubmitProject($projectData: ProjectInput!) {
            submitProject(projectData: $projectData) {
              success
              projectId
              status
              estimatedGradingTime
            }
          }
        `,
				variables: {
					projectData: {
						title: "Test Project",
						description: "A test project",
						code: 'console.log("Hello World");',
						language: "javascript",
					},
				},
			});

			expect(result.data).toBeDefined();
			expect(result.data.submitProject).toEqual({
				success: true,
				projectId: "project-123",
				status: "submitted",
				estimatedGradingTime: 30,
			});
			expect(result.errors).toBeUndefined();
		});

		it("fetches user progress successfully", async () => {
			const result = await api.query({
				query: `
          query GetUserProgress($userId: ID!) {
            getUserProgress(userId: $userId) {
              userId
              lessonsCompleted
              totalXP
              currentLevel
              streak
            }
          }
        `,
				variables: {
					userId: "user-123",
				},
			});

			expect(result.data).toBeDefined();
			expect(result.data.getUserProgress).toEqual({
				userId: "user-123",
				lessonsCompleted: 24,
				totalXP: 2450,
				currentLevel: 12,
				streak: 7,
			});
			expect(result.errors).toBeUndefined();
		});

		it("handles GraphQL errors gracefully", async () => {
			server.use(
				http.post("/api/graphql", () => {
					return HttpResponse.json({
						data: null,
						errors: [
							{ message: "Authentication required", code: "UNAUTHENTICATED" },
						],
					});
				}),
			);

			const result = await api.query({
				query: `
          query GetDailyLesson {
            getDailyLesson {
              id
              title
            }
          }
        `,
			});

			expect(result.data).toBeNull();
			expect(result.errors).toBeDefined();
			expect(result.errors[0].message).toBe("Authentication required");
		});
	});

	describe("REST API Endpoints", () => {
		it("checks health endpoint", async () => {
			const response = await api.get("/health");

			expect(response.status).toBe(200);
			expect(response.data).toEqual({
				status: "ok",
				timestamp: expect.any(String),
			});
		});

		it("refreshes auth token", async () => {
			const response = await api.post("/auth/refresh", {
				refreshToken: "old-refresh-token",
			});

			expect(response.status).toBe(200);
			expect(response.data).toEqual({
				accessToken: "new-access-token",
				refreshToken: "new-refresh-token",
			});
		});

		it("fetches user profile", async () => {
			const response = await api.get("/user/profile");

			expect(response.status).toBe(200);
			expect(response.data).toEqual({
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "Developer",
				preferences: {
					notifications: true,
					theme: "dark",
				},
			});
		});

		it("updates user preferences", async () => {
			const preferences = {
				notifications: false,
				theme: "light",
				language: "en",
			};

			const response = await api.put("/user/preferences", preferences);

			expect(response.status).toBe(200);
			expect(response.data).toEqual({
				success: true,
				preferences,
			});
		});

		it("fetches leaderboard data", async () => {
			const response = await api.get("/leaderboard");

			expect(response.status).toBe(200);
			expect(response.data).toEqual({
				entries: [
					{ userId: "user-1", name: "User 1", xp: 3000, rank: 1 },
					{ userId: "user-2", name: "User 2", xp: 2800, rank: 2 },
					{ userId: "user-3", name: "User 3", xp: 2500, rank: 3 },
				],
			});
		});

		it("tracks analytics events", async () => {
			const eventData = {
				event: "lesson_completed",
				properties: {
					lessonId: "lesson-1",
					score: 85,
					timeSpent: 300,
				},
			};

			const response = await api.post("/analytics/event", eventData);

			expect(response.status).toBe(200);
			expect(response.data).toEqual({
				success: true,
				eventId: "event-123",
				timestamp: expect.any(String),
			});
		});
	});

	describe("Error Handling", () => {
		it("handles network errors", async () => {
			server.use(
				http.post("/api/graphql", () => {
					return HttpResponse.error();
				}),
			);

			await expect(
				api.query({
					query: `
            query GetDailyLesson {
              getDailyLesson {
                id
                title
              }
            }
          `,
				}),
			).rejects.toThrow();
		});

		it("handles 404 errors", async () => {
			server.use(
				http.get("/api/nonexistent", () => {
					return new HttpResponse(null, { status: 404 });
				}),
			);

			await expect(api.get("/nonexistent")).rejects.toThrow();
		});

		it("handles 500 server errors", async () => {
			server.use(
				http.post("/api/graphql", () => {
					return new HttpResponse(null, { status: 500 });
				}),
			);

			await expect(
				api.query({
					query: `
            query GetDailyLesson {
              getDailyLesson {
                id
                title
              }
            }
          `,
				}),
			).rejects.toThrow();
		});

		it("handles authentication errors", async () => {
			server.use(
				http.post("/api/graphql", () => {
					return new HttpResponse(null, { status: 401 });
				}),
			);

			await expect(
				api.query({
					query: `
            query GetDailyLesson {
              getDailyLesson {
                id
                title
              }
            }
          `,
				}),
			).rejects.toThrow();
		});

		it("handles rate limiting", async () => {
			server.use(
				http.post("/api/graphql", () => {
					return new HttpResponse(null, { status: 429 });
				}),
			);

			await expect(
				api.query({
					query: `
            query GetDailyLesson {
              getDailyLesson {
                id
                title
              }
            }
          `,
				}),
			).rejects.toThrow();
		});
	});

	describe("Request/Response Interceptors", () => {
		it("adds auth token to requests", async () => {
			const { getAuthToken } = await import("@/lib/auth");

			await api.get("/user/profile");

			expect(getAuthToken).toHaveBeenCalled();
		});

		it("handles token refresh on 401", async () => {
			const { refreshAuthToken } = await import("@/lib/auth");

			server.use(
				http.post("/api/graphql", ({ request }) => {
					const authHeader = request.headers.get("authorization");
					if (authHeader === "Bearer mock-token") {
						return new HttpResponse(null, { status: 401 });
					}
					return HttpResponse.json({
						data: {
							getDailyLesson: {
								id: "lesson-1",
								title: "Test Lesson",
							},
						},
					});
				}),
			);

			await api.query({
				query: `
          query GetDailyLesson {
            getDailyLesson {
              id
              title
            }
          }
        `,
			});

			expect(refreshAuthToken).toHaveBeenCalled();
		});

		it("adds breadcrumbs for requests", async () => {
			const { addBreadcrumb } = await import("@/services/monitoringService");

			await api.get("/user/profile");

			expect(addBreadcrumb).toHaveBeenCalledWith({
				message: "API Request",
				category: "api",
				data: {
					method: "GET",
					url: "/user/profile",
					status: 200,
				},
			});
		});

		it("reports errors to monitoring service", async () => {
			const { reportError } = await import("@/services/monitoringService");

			server.use(
				http.post("/api/graphql", () => {
					return new HttpResponse(null, { status: 500 });
				}),
			);

			try {
				await api.query({
					query: `
            query GetDailyLesson {
              getDailyLesson {
                id
                title
              }
            }
          `,
				});
			} catch (error) {
				// Expected to throw
			}

			expect(reportError).toHaveBeenCalled();
		});
	});

	describe("Performance and Timeouts", () => {
		it("handles slow responses", async () => {
			server.use(
				http.post("/api/graphql", async () => {
					await new Promise((resolve) => setTimeout(resolve, 100));
					return HttpResponse.json({
						data: {
							getDailyLesson: {
								id: "lesson-1",
								title: "Slow Response",
							},
						},
					});
				}),
			);

			const startTime = Date.now();
			const result = await api.query({
				query: `
          query GetDailyLesson {
            getDailyLesson {
              id
              title
            }
          }
        `,
			});
			const endTime = Date.now();

			expect(result.data).toBeDefined();
			expect(endTime - startTime).toBeGreaterThan(100);
		});

		it("handles request timeouts", async () => {
			server.use(
				http.post("/api/graphql", async () => {
					await new Promise((resolve) => setTimeout(resolve, 10000));
					return HttpResponse.json({ data: null });
				}),
			);

			await expect(
				api.query({
					query: `
            query GetDailyLesson {
              getDailyLesson {
                id
                title
              }
            }
          `,
				}),
			).rejects.toThrow();
		});
	});

	describe("Data Validation", () => {
		it("validates GraphQL response structure", async () => {
			server.use(
				http.post("/api/graphql", () => {
					return HttpResponse.json({
						data: {
							getDailyLesson: {
								id: "lesson-1",
								// Missing required fields
							},
						},
					});
				}),
			);

			const result = await api.query({
				query: `
          query GetDailyLesson {
            getDailyLesson {
              id
              title
              content
            }
          }
        `,
			});

			expect(result.data.getDailyLesson.title).toBeUndefined();
			expect(result.data.getDailyLesson.content).toBeUndefined();
		});

		it("handles malformed JSON responses", async () => {
			server.use(
				http.post("/api/graphql", () => {
					return new HttpResponse("Invalid JSON", {
						headers: { "content-type": "application/json" },
					});
				}),
			);

			await expect(
				api.query({
					query: `
            query GetDailyLesson {
              getDailyLesson {
                id
                title
              }
            }
          `,
				}),
			).rejects.toThrow();
		});
	});

	describe("Concurrent Requests", () => {
		it("handles multiple concurrent GraphQL requests", async () => {
			const promises = [
				api.query({
					query: `
            query GetDailyLesson {
              getDailyLesson {
                id
                title
              }
            }
          `,
				}),
				api.query({
					query: `
            query GetUserProgress($userId: ID!) {
              getUserProgress(userId: $userId) {
                userId
                lessonsCompleted
              }
            }
          `,
					variables: { userId: "user-123" },
				}),
				api.mutate({
					mutation: `
            mutation SubmitQuiz($lessonId: ID!, $answers: [String!]!) {
              submitQuiz(lessonId: $lessonId, answers: $answers) {
                success
                score
              }
            }
          `,
					variables: {
						lessonId: "lesson-1",
						answers: ["answer1"],
					},
				}),
			];

			const results = await Promise.all(promises);

			expect(results).toHaveLength(3);
			expect(results[0].data.getDailyLesson).toBeDefined();
			expect(results[1].data.getUserProgress).toBeDefined();
			expect(results[2].data.submitQuiz).toBeDefined();
		});

		it("handles concurrent REST API requests", async () => {
			const promises = [
				api.get("/health"),
				api.get("/user/profile"),
				api.get("/leaderboard"),
			];

			const results = await Promise.all(promises);

			expect(results).toHaveLength(3);
			expect(results[0].data.status).toBe("ok");
			expect(results[1].data.id).toBe("user-123");
			expect(results[2].data.entries).toBeDefined();
		});
	});
});
