import { describe, it, expect } from "vitest";
import type {
	ApiResponse,
	ApiError,
	LoginCredentials,
	LoginResponse,
	User,
	UserProfile,
	UserPreferences,
	Lesson,
	LessonContent,
	Quiz,
	QuizQuestion,
	UserProgress,
	Project,
	ProjectSubmission,
	Achievement,
	Leaderboard,
	Certificate,
	AnalyticsEvent,
	Notification,
	SpacedRepetitionItem,
	ToneSettings,
	ValidationError,
	PaginationParams,
	PaginatedResponse,
} from "./api";

describe("API Types", () => {
	describe("Base Types", () => {
		it("should have ApiResponse type defined", () => {
			const response: ApiResponse<string> = {
				data: "test",
				status: 200,
				message: "Success",
				success: true,
			};

			expect(response.data).toBe("test");
			expect(response.status).toBe(200);
			expect(response.success).toBe(true);
		});

		it("should have ApiError type defined", () => {
			const error: ApiError = {
				message: "Test error",
				status: 400,
				code: "VALIDATION_ERROR",
				details: { field: "email" },
			};

			expect(error.message).toBe("Test error");
			expect(error.status).toBe(400);
			expect(error.code).toBe("VALIDATION_ERROR");
		});
	});

	describe("Authentication Types", () => {
		it("should have LoginCredentials type defined", () => {
			const credentials: LoginCredentials = {
				email: "test@example.com",
				password: "password123",
			};

			expect(credentials.email).toBe("test@example.com");
			expect(credentials.password).toBe("password123");
		});

		it("should have LoginResponse type defined", () => {
			const loginResponse: LoginResponse = {
				token: "jwt-token",
				refreshToken: "refresh-token",
				user: {
					id: "user-1",
					email: "test@example.com",
					username: "testuser",
					createdAt: "2024-01-01T00:00:00Z",
					updatedAt: "2024-01-01T00:00:00Z",
					isEmailVerified: true,
					preferences: {
						theme: "dark",
						notifications: {
							email: {
								enabled: true,
								dailyDigest: true,
								weeklyReport: true,
								achievements: true,
								newLessons: true,
							},
							push: {
								enabled: true,
								achievements: true,
								newLessons: true,
								reminders: true,
							},
							inApp: {
								enabled: true,
								achievements: true,
								newLessons: true,
								leaderboard: true,
							},
						},
						privacy: {
							profileVisibility: "public",
							showProgress: true,
							showAchievements: true,
							allowAnalytics: true,
						},
						accessibility: {
							fontSize: "medium",
							highContrast: false,
							reducedMotion: false,
							screenReader: false,
						},
					},
					profile: {
						skills: ["JavaScript", "React"],
						experience: "intermediate",
						timezone: "UTC",
						language: "en",
					},
				},
				expiresAt: "2024-01-02T00:00:00Z",
			};

			expect(loginResponse.token).toBe("jwt-token");
			expect(loginResponse.user.id).toBe("user-1");
			expect(loginResponse.user.preferences.theme).toBe("dark");
		});
	});

	describe("User Types", () => {
		it("should have User type defined", () => {
			const user: User = {
				id: "user-1",
				email: "test@example.com",
				username: "testuser",
				firstName: "John",
				lastName: "Doe",
				avatar: "https://example.com/avatar.jpg",
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
				isEmailVerified: true,
				lastLoginAt: "2024-01-01T12:00:00Z",
				preferences: {
					theme: "light",
					notifications: {
						email: {
							enabled: true,
							dailyDigest: false,
							weeklyReport: true,
							achievements: true,
							newLessons: true,
						},
						push: {
							enabled: false,
							achievements: true,
							newLessons: true,
							reminders: false,
						},
						inApp: {
							enabled: true,
							achievements: true,
							newLessons: true,
							leaderboard: true,
						},
					},
					privacy: {
						profileVisibility: "friends",
						showProgress: true,
						showAchievements: false,
						allowAnalytics: true,
					},
					accessibility: {
						fontSize: "large",
						highContrast: true,
						reducedMotion: true,
						screenReader: false,
					},
				},
				profile: {
					bio: "Software developer",
					location: "San Francisco",
					website: "https://example.com",
					socialLinks: {
						github: "https://github.com/testuser",
						linkedin: "https://linkedin.com/in/testuser",
					},
					skills: ["JavaScript", "TypeScript", "React"],
					experience: "advanced",
					timezone: "America/Los_Angeles",
					language: "en",
				},
			};

			expect(user.id).toBe("user-1");
			expect(user.profile.skills).toContain("JavaScript");
			expect(user.preferences.theme).toBe("light");
		});

		it("should have UserProfile type defined", () => {
			const profile: UserProfile = {
				bio: "Full-stack developer",
				location: "New York",
				website: "https://mywebsite.com",
				socialLinks: {
					github: "https://github.com/dev",
					twitter: "https://twitter.com/dev",
				},
				skills: ["Python", "Django", "PostgreSQL"],
				experience: "expert",
				timezone: "America/New_York",
				language: "en",
			};

			expect(profile.bio).toBe("Full-stack developer");
			expect(profile.experience).toBe("expert");
			expect(profile.skills).toHaveLength(3);
		});
	});

	describe("Lesson Types", () => {
		it("should have Lesson type defined", () => {
			const lesson: Lesson = {
				id: "lesson-1",
				title: "Introduction to React",
				description: "Learn the basics of React",
				content: {
					sections: [
						{
							id: "section-1",
							title: "What is React?",
							content: "React is a JavaScript library...",
							order: 1,
							type: "text",
						},
					],
					resources: [
						{
							id: "resource-1",
							title: "React Documentation",
							type: "link",
							url: "https://reactjs.org/docs",
							description: "Official React documentation",
						},
					],
					quiz: {
						id: "quiz-1",
						questions: [
							{
								id: "question-1",
								question: "What is React?",
								type: "multiple-choice",
								options: ["A library", "A framework", "A language"],
								correctAnswer: "A library",
								explanation:
									"React is a JavaScript library for building user interfaces",
								points: 10,
							},
						],
						passingScore: 70,
					},
				},
				difficulty: "beginner",
				duration: 30,
				tags: ["react", "javascript", "frontend"],
				category: "Frontend Development",
				prerequisites: [],
				objectives: ["Understand React basics", "Create a simple component"],
				estimatedTime: 30,
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
			};

			expect(lesson.title).toBe("Introduction to React");
			expect(lesson.difficulty).toBe("beginner");
			expect(lesson.content.sections).toHaveLength(1);
		});

		it("should have Quiz type defined", () => {
			const quiz: Quiz = {
				id: "quiz-1",
				questions: [
					{
						id: "q1",
						question: "What is TypeScript?",
						type: "multiple-choice",
						options: [
							"A superset of JavaScript",
							"A new language",
							"A framework",
						],
						correctAnswer: "A superset of JavaScript",
						explanation: "TypeScript extends JavaScript with static typing",
						points: 10,
					},
				],
				timeLimit: 300,
				passingScore: 80,
			};

			expect(quiz.id).toBe("quiz-1");
			expect(quiz.questions).toHaveLength(1);
			expect(quiz.passingScore).toBe(80);
		});
	});

	describe("Progress Types", () => {
		it("should have UserProgress type defined", () => {
			const progress: UserProgress = {
				userId: "user-1",
				lessonsCompleted: 15,
				totalLessons: 50,
				currentStreak: 7,
				longestStreak: 14,
				totalXp: 2500,
				level: 5,
				achievements: [
					{
						id: "achievement-1",
						title: "First Lesson",
						description: "Complete your first lesson",
						icon: "🎯",
						category: "learning",
						rarity: "common",
						xpReward: 100,
						unlockedAt: "2024-01-01T00:00:00Z",
					},
				],
				recentActivity: [
					{
						id: "activity-1",
						type: "lesson_completed",
						title: "Completed React Basics",
						description: "You completed the React Basics lesson",
						xpEarned: 150,
						timestamp: "2024-01-01T12:00:00Z",
					},
				],
				weeklyProgress: {
					weekStart: "2024-01-01T00:00:00Z",
					lessonsCompleted: 3,
					xpEarned: 450,
					streakDays: 7,
					goals: [
						{
							id: "goal-1",
							title: "Complete 5 lessons",
							target: 5,
							current: 3,
							type: "lessons",
							completed: false,
						},
					],
				},
				monthlyProgress: {
					month: "2024-01",
					lessonsCompleted: 12,
					xpEarned: 1800,
					averageStreak: 6,
					topCategories: [
						{
							category: "Frontend",
							lessonsCompleted: 8,
							totalLessons: 20,
							averageScore: 85,
						},
					],
				},
			};

			expect(progress.userId).toBe("user-1");
			expect(progress.currentStreak).toBe(7);
			expect(progress.achievements).toHaveLength(1);
		});
	});

	describe("Project Types", () => {
		it("should have Project type defined", () => {
			const project: Project = {
				id: "project-1",
				title: "Todo App",
				description: "Build a simple todo application",
				requirements: [
					{
						id: "req-1",
						description: "Add new todos",
						type: "functionality",
						priority: "high",
						points: 20,
					},
				],
				difficulty: "beginner",
				estimatedTime: 120,
				category: "Web Development",
				tags: ["react", "javascript", "todo"],
				resources: [
					{
						id: "resource-1",
						title: "Starter Code",
						type: "starter-code",
						url: "https://github.com/example/todo-starter",
						description: "Basic project structure",
					},
				],
				rubric: {
					criteria: [
						{
							id: "criteria-1",
							name: "Functionality",
							description: "All features work correctly",
							maxPoints: 50,
							weight: 1,
						},
					],
					totalPoints: 100,
					passingScore: 70,
				},
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
			};

			expect(project.title).toBe("Todo App");
			expect(project.difficulty).toBe("beginner");
			expect(project.requirements).toHaveLength(1);
		});

		it("should have ProjectSubmission type defined", () => {
			const submission: ProjectSubmission = {
				projectId: "project-1",
				code: "function addTodo() { /* implementation */ }",
				language: "javascript",
				description: "A simple todo app with add/remove functionality",
				files: [
					{
						name: "index.js",
						content: 'console.log("Hello World");',
						type: "code",
						path: "/src/index.js",
					},
				],
				metadata: {
					buildTime: 5000,
					dependencies: ["react", "react-dom"],
				},
			};

			expect(submission.projectId).toBe("project-1");
			expect(submission.language).toBe("javascript");
			expect(submission.files).toHaveLength(1);
		});
	});

	describe("Achievement Types", () => {
		it("should have Achievement type defined", () => {
			const achievement: Achievement = {
				id: "achievement-1",
				title: "Streak Master",
				description: "Maintain a 30-day learning streak",
				icon: "🔥",
				category: "streak",
				rarity: "epic",
				xpReward: 500,
				unlockedAt: "2024-01-30T00:00:00Z",
				progress: {
					current: 30,
					target: 30,
					percentage: 100,
				},
			};

			expect(achievement.title).toBe("Streak Master");
			expect(achievement.rarity).toBe("epic");
			expect(achievement.progress?.percentage).toBe(100);
		});
	});

	describe("Leaderboard Types", () => {
		it("should have Leaderboard type defined", () => {
			const leaderboard: Leaderboard = {
				period: "weekly",
				entries: [
					{
						rank: 1,
						user: {
							id: "user-1",
							username: "toplearner",
							avatar: "https://example.com/avatar.jpg",
						},
						score: 9500,
						xp: 5000,
						level: 10,
						achievements: 25,
						streak: 21,
					},
				],
				userRank: 5,
				totalParticipants: 1000,
				lastUpdated: "2024-01-07T00:00:00Z",
			};

			expect(leaderboard.period).toBe("weekly");
			expect(leaderboard.entries).toHaveLength(1);
			expect(leaderboard.totalParticipants).toBe(1000);
		});
	});

	describe("Certificate Types", () => {
		it("should have Certificate type defined", () => {
			const certificate: Certificate = {
				id: "cert-1",
				userId: "user-1",
				title: "React Developer Certificate",
				description: "Completed React Fundamentals Course",
				issuedAt: "2024-01-15T00:00:00Z",
				expiresAt: "2025-01-15T00:00:00Z",
				verificationCode: "REACT-2024-001",
				metadata: {
					courseName: "React Fundamentals",
					completionDate: "2024-01-15T00:00:00Z",
					score: 95,
					instructor: "John Smith",
				},
				template: "premium",
				status: "active",
			};

			expect(certificate.title).toBe("React Developer Certificate");
			expect(certificate.status).toBe("active");
			expect(certificate.metadata.score).toBe(95);
		});
	});

	describe("Analytics Types", () => {
		it("should have AnalyticsEvent type defined", () => {
			const event: AnalyticsEvent = {
				eventName: "lesson_completed",
				userId: "user-1",
				timestamp: "2024-01-01T12:00:00Z",
				properties: {
					lessonId: "lesson-1",
					duration: 1800,
					score: 85,
				},
				sessionId: "session-123",
			};

			expect(event.eventName).toBe("lesson_completed");
			expect(event.properties.lessonId).toBe("lesson-1");
		});
	});

	describe("Notification Types", () => {
		it("should have Notification type defined", () => {
			const notification: Notification = {
				id: "notif-1",
				userId: "user-1",
				type: "achievement",
				title: "Achievement Unlocked!",
				message: 'You earned the "First Lesson" achievement',
				data: {
					achievementId: "achievement-1",
					xpEarned: 100,
				},
				read: false,
				createdAt: "2024-01-01T12:00:00Z",
			};

			expect(notification.type).toBe("achievement");
			expect(notification.read).toBe(false);
		});
	});

	describe("Spaced Repetition Types", () => {
		it("should have SpacedRepetitionItem type defined", () => {
			const item: SpacedRepetitionItem = {
				id: "item-1",
				userId: "user-1",
				lessonId: "lesson-1",
				interval: 7,
				repetitions: 3,
				easeFactor: 2.5,
				nextReview: "2024-01-08T00:00:00Z",
				lastReview: "2024-01-01T00:00:00Z",
				createdAt: "2023-12-25T00:00:00Z",
			};

			expect(item.interval).toBe(7);
			expect(item.repetitions).toBe(3);
			expect(item.easeFactor).toBe(2.5);
		});
	});

	describe("Tone Types", () => {
		it("should have ToneSettings type defined", () => {
			const tone: ToneSettings = {
				tone: "friendly",
				language: "en",
				complexity: "moderate",
				culturalContext: "US",
			};

			expect(tone.tone).toBe("friendly");
			expect(tone.complexity).toBe("moderate");
		});
	});

	describe("Error Types", () => {
		it("should have ValidationError type defined", () => {
			const error: ValidationError = {
				field: "email",
				message: "Email is required",
				code: "REQUIRED_FIELD",
			};

			expect(error.field).toBe("email");
			expect(error.code).toBe("REQUIRED_FIELD");
		});
	});

	describe("Pagination Types", () => {
		it("should have PaginationParams type defined", () => {
			const params: PaginationParams = {
				page: 1,
				limit: 10,
				sortBy: "createdAt",
				sortOrder: "desc",
			};

			expect(params.page).toBe(1);
			expect(params.limit).toBe(10);
			expect(params.sortOrder).toBe("desc");
		});

		it("should have PaginatedResponse type defined", () => {
			const response: PaginatedResponse<string> = {
				data: ["item1", "item2", "item3"],
				pagination: {
					page: 1,
					limit: 10,
					total: 25,
					totalPages: 3,
					hasNext: true,
					hasPrev: false,
				},
			};

			expect(response.data).toHaveLength(3);
			expect(response.pagination.total).toBe(25);
			expect(response.pagination.hasNext).toBe(true);
		});
	});
});
