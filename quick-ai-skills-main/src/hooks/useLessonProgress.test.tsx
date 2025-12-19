import { renderHook, waitFor, act } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLessonProgress } from "./useLessonProgress";
import {
	GET_LESSON_PROGRESS,
	GET_USER_LESSON_PROGRESS,
	GET_PROGRESS_ANALYTICS,
	UPDATE_LESSON_PROGRESS,
	COMPLETE_LESSON_SECTION,
	START_LESSON_SESSION,
	END_LESSON_SESSION,
	SAVE_LESSON_STATE,
	GET_LESSON_STATE,
} from "@/lib/graphql";

// Mock useAuth hook
vi.mock("./useAuth", () => ({
	useAuth: () => ({
		isAuthenticated: true,
		user: { id: "user-1", email: "test@example.com" },
	}),
}));

// Mock error handling
vi.mock("@/utils/errorHandling", () => ({
	handleError: vi.fn(),
}));

describe("useLessonProgress", () => {
	const mockLessonProgress = {
		id: "progress-1",
		userId: "user-1",
		lessonId: "lesson-1",
		status: "in_progress",
		progress: 50,
		sectionsCompleted: 2,
		totalSections: 4,
		timeSpent: 300,
		lastAccessedAt: "2024-01-01T00:00:00Z",
		completedAt: null,
		score: null,
		attempts: 1,
		metadata: {},
	};

	const mockUserLessonProgress = [
		{
			id: "progress-1",
			lessonId: "lesson-1",
			status: "in_progress",
			progress: 50,
			sectionsCompleted: 2,
			totalSections: 4,
			timeSpent: 300,
			lastAccessedAt: "2024-01-01T00:00:00Z",
			completedAt: null,
			score: null,
			attempts: 1,
			metadata: {},
			lesson: {
				id: "lesson-1",
				title: "Test Lesson",
				category: "programming",
				difficulty: "beginner",
			},
		},
	];

	const mockProgressAnalytics = {
		totalLessons: 10,
		completedLessons: 5,
		inProgressLessons: 3,
		averageScore: 85,
		totalTimeSpent: 3600,
		averageTimePerLesson: 720,
		completionRate: 0.5,
		categoryBreakdown: [],
		weeklyProgress: [],
		monthlyProgress: [],
	};

	const mocks = [
		{
			request: {
				query: GET_LESSON_PROGRESS,
				variables: { lessonId: "lesson-1" },
			},
			result: {
				data: {
					lessonProgress: mockLessonProgress,
				},
			},
		},
		{
			request: {
				query: GET_USER_LESSON_PROGRESS,
			},
			result: {
				data: {
					userLessonProgress: mockUserLessonProgress,
				},
			},
		},
		{
			request: {
				query: GET_PROGRESS_ANALYTICS,
				variables: { timeframe: "all" },
			},
			result: {
				data: {
					progressAnalytics: mockProgressAnalytics,
				},
			},
		},
		{
			request: {
				query: UPDATE_LESSON_PROGRESS,
				variables: {
					input: {
						lessonId: "lesson-1",
						progress: 75,
						sectionsCompleted: 3,
					},
				},
			},
			result: {
				data: {
					updateLessonProgress: {
						...mockLessonProgress,
						progress: 75,
						sectionsCompleted: 3,
					},
				},
			},
		},
		{
			request: {
				query: COMPLETE_LESSON_SECTION,
				variables: {
					input: {
						lessonId: "lesson-1",
						sectionId: "section-1",
						timeSpent: 120,
					},
				},
			},
			result: {
				data: {
					completeLessonSection: {
						id: "completion-1",
						sectionId: "section-1",
						completedAt: "2024-01-01T00:00:00Z",
						timeSpent: 120,
						score: 100,
						success: true,
					},
				},
			},
		},
		{
			request: {
				query: START_LESSON_SESSION,
				variables: {
					input: {
						lessonId: "lesson-1",
						sessionType: "learning",
					},
				},
			},
			result: {
				data: {
					startLessonSession: {
						sessionId: "session-1",
						lessonId: "lesson-1",
						startedAt: "2024-01-01T00:00:00Z",
						success: true,
					},
				},
			},
		},
		{
			request: {
				query: END_LESSON_SESSION,
				variables: {
					input: {
						sessionId: "session-1",
						totalTimeSpent: 600,
						progress: 75,
					},
				},
			},
			result: {
				data: {
					endLessonSession: {
						sessionId: "session-1",
						totalTimeSpent: 600,
						progress: 75,
						success: true,
					},
				},
			},
		},
		{
			request: {
				query: SAVE_LESSON_STATE,
				variables: {
					input: {
						lessonId: "lesson-1",
						state: { currentSection: 2, notes: "test" },
					},
				},
			},
			result: {
				data: {
					saveLessonState: {
						id: "state-1",
						lessonId: "lesson-1",
						state: { currentSection: 2, notes: "test" },
						savedAt: "2024-01-01T00:00:00Z",
						success: true,
					},
				},
			},
		},
		{
			request: {
				query: GET_LESSON_STATE,
				variables: { lessonId: "lesson-1" },
			},
			result: {
				data: {
					lessonState: {
						id: "state-1",
						lessonId: "lesson-1",
						state: { currentSection: 2, notes: "test" },
						savedAt: "2024-01-01T00:00:00Z",
					},
				},
			},
		},
	];

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<MockedProvider mocks={mocks} addTypename={false}>
			{children}
		</MockedProvider>
	);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should initialize with default state", () => {
		const { result } = renderHook(() => useLessonProgress(), { wrapper });

		expect(result.current.currentLessonProgress).toBeNull();
		expect(result.current.userLessonProgress).toEqual([]);
		expect(result.current.progressAnalytics).toBeNull();
		expect(result.current.isLoading).toBe(true);
		expect(result.current.error).toBeNull();
		expect(result.current.isUpdating).toBe(false);
		expect(result.current.currentSessionId).toBeNull();
	});

	it("should load user lesson progress and analytics on mount", async () => {
		const { result } = renderHook(() => useLessonProgress(), { wrapper });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.userLessonProgress).toEqual(mockUserLessonProgress);
		expect(result.current.progressAnalytics).toEqual(mockProgressAnalytics);
	});

	it("should get lesson progress for specific lesson", async () => {
		const { result } = renderHook(() => useLessonProgress(), { wrapper });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		const progress = await result.current.getLessonProgress("lesson-1");
		expect(progress).toEqual(mockLessonProgress);
	});

	it("should update lesson progress", async () => {
		const { result } = renderHook(() => useLessonProgress(), { wrapper });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		await act(async () => {
			const updatedProgress = await result.current.updateLessonProgress({
				lessonId: "lesson-1",
				progress: 75,
				sectionsCompleted: 3,
			});

			expect(updatedProgress.progress).toBe(75);
			expect(updatedProgress.sectionsCompleted).toBe(3);
		});
	});

	it("should complete lesson section", async () => {
		const { result } = renderHook(() => useLessonProgress(), { wrapper });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		await act(async () => {
			await result.current.completeLessonSection({
				lessonId: "lesson-1",
				sectionId: "section-1",
				timeSpent: 120,
			});
		});

		// Should not throw error
		expect(result.current.error).toBeNull();
	});

	it("should start lesson session", async () => {
		const { result } = renderHook(() => useLessonProgress(), { wrapper });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		await act(async () => {
			const sessionId = await result.current.startLessonSession({
				lessonId: "lesson-1",
				sessionType: "learning",
			});

			expect(sessionId).toBe("session-1");
			expect(result.current.currentSessionId).toBe("session-1");
		});
	});

	it("should end lesson session", async () => {
		const { result } = renderHook(() => useLessonProgress(), { wrapper });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		// Start session first
		await act(async () => {
			await result.current.startLessonSession({
				lessonId: "lesson-1",
				sessionType: "learning",
			});
		});

		// End session
		await act(async () => {
			await result.current.endLessonSession({
				sessionId: "session-1",
				totalTimeSpent: 600,
				progress: 75,
			});
		});

		expect(result.current.currentSessionId).toBeNull();
	});

	it("should save lesson state", async () => {
		const { result } = renderHook(() => useLessonProgress(), { wrapper });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		await act(async () => {
			await result.current.saveLessonState({
				lessonId: "lesson-1",
				state: { currentSection: 2, notes: "test" },
			});
		});

		expect(result.current.error).toBeNull();
	});

	it("should get lesson state", async () => {
		const { result } = renderHook(() => useLessonProgress(), { wrapper });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		const state = await result.current.getLessonState("lesson-1");
		expect(state).toEqual({
			id: "state-1",
			lessonId: "lesson-1",
			state: { currentSection: 2, notes: "test" },
			savedAt: "2024-01-01T00:00:00Z",
		});
	});

	it("should get progress analytics with timeframe", async () => {
		const { result } = renderHook(() => useLessonProgress(), { wrapper });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		const analytics = await result.current.getProgressAnalytics("weekly");
		expect(analytics).toEqual(mockProgressAnalytics);
	});

	it("should refresh progress data", async () => {
		const { result } = renderHook(() => useLessonProgress(), { wrapper });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		await act(async () => {
			await result.current.refreshProgress();
		});

		// Should not throw error
		expect(result.current.error).toBeNull();
	});

	it("should clear error", () => {
		const { result } = renderHook(() => useLessonProgress(), { wrapper });

		// Simulate setting an error
		act(() => {
			result.current.clearError();
		});

		expect(result.current.error).toBeNull();
	});

	it("should handle errors gracefully", async () => {
		const errorMocks = [
			{
				request: {
					query: GET_USER_LESSON_PROGRESS,
				},
				error: new Error("Network error"),
			},
		];

		const errorWrapper = ({ children }: { children: React.ReactNode }) => (
			<MockedProvider mocks={errorMocks} addTypename={false}>
				{children}
			</MockedProvider>
		);

		const { result } = renderHook(() => useLessonProgress(), {
			wrapper: errorWrapper,
		});

		await waitFor(() => {
			expect(result.current.error).toBeTruthy();
		});
	});

	it("should handle authentication state changes", async () => {
		const { result } = renderHook(() => useLessonProgress(), { wrapper });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		// Should load data when authenticated
		expect(result.current.userLessonProgress).toEqual(mockUserLessonProgress);
	});
});
