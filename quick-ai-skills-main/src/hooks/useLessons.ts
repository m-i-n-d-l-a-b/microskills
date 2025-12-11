import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLazyQuery, useMutation as useApolloMutation } from "@apollo/client";
import { useAuth } from "./useAuth";
import { apiClient } from "@/services/api";
import {
	GET_DAILY_LESSON,
	GET_USER_PROGRESS,
	SUBMIT_QUIZ,
	SWITCH_TONE,
	MARK_LESSON_COMPLETE,
} from "@/lib/graphql";
import { handleError } from "@/utils/errorHandling";
import { useSpacedRepetition } from "./useSpacedRepetition";
import { useLessonProgress } from "./useLessonProgress";
import type {
	Lesson,
	QuizSubmission,
	QuizResult,
	ToneSwitchRequest,
	ToneSwitchResponse,
	UserProgress,
	SpacedRepetitionItem,
} from "@/types/api";

// Lesson state interface
export interface LessonState {
	currentLesson: Lesson | null;
	lessonProgress: UserProgress | null;
	isLoading: boolean;
	error: string | null;
	isSubmitting: boolean;
	isToneSwitching: boolean;
}

// Lesson actions interface
export interface LessonActions {
	getDailyLesson: () => Promise<Lesson>;
	submitQuiz: (submission: QuizSubmission) => Promise<QuizResult>;
	switchTone: (tone: string, lessonId?: string) => Promise<ToneSwitchResponse>;
	markLessonComplete: (lessonId: string, score?: number) => Promise<void>;
	getLessonProgress: () => Promise<UserProgress>;
	clearError: () => void;
}

// Hook return type
export type UseLessonsReturn = LessonState & LessonActions;

// Query keys
const LESSON_QUERY_KEYS = {
	dailyLesson: ["lessons", "daily"],
	lessonProgress: ["lessons", "progress"],
	lessonById: (id: string) => ["lessons", id],
	userProgress: ["user", "progress"],
} as const;

export function useLessons(): UseLessonsReturn {
	const { isAuthenticated, user } = useAuth();
	const queryClient = useQueryClient();
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isToneSwitching, setIsToneSwitching] = useState(false);
	const [isStreaming, setIsStreaming] = useState(false);
	const [streamedContent, setStreamedContent] = useState<string>("");
	const eventSourceRef = useRef<EventSource | null>(null);

	const { updateSpacedRepetition, getNextReview } = useSpacedRepetition();
	const {
		startLessonSession,
		endLessonSession,
		updateLessonProgress,
		completeLessonSection,
		saveLessonState,
		getLessonState,
		currentSessionId,
	} = useLessonProgress();

	// GraphQL queries
	const [
		getDailyLessonQuery,
		{
			data: dailyLessonData,
			loading: isLoadingLesson,
			error: lessonError,
			refetch: refetchDailyLesson,
		},
	] = useLazyQuery(GET_DAILY_LESSON, {
		fetchPolicy: "cache-and-network",
		errorPolicy: "all",
	});

	const [
		getUserProgressQuery,
		{
			data: progressData,
			loading: isLoadingProgress,
			refetch: refetchProgress,
		},
	] = useLazyQuery(GET_USER_PROGRESS, {
		fetchPolicy: "cache-and-network",
		errorPolicy: "all",
	});

	// GraphQL mutations
	const [submitQuizMutation] = useApolloMutation(SUBMIT_QUIZ, {
		onCompleted: async (data, { variables }) => {
			// Update lesson progress
			await queryClient.invalidateQueries({
				queryKey: LESSON_QUERY_KEYS.lessonProgress,
			});
			await queryClient.invalidateQueries({
				queryKey: LESSON_QUERY_KEYS.userProgress,
			});

			// Update spaced repetition if quiz was passed
			if (data.submitQuiz.passed && variables.input.quizId) {
				await updateSpacedRepetition({
					lessonId: variables.input.quizId,
					quality:
						data.submitQuiz.percentage >= 80
							? 5
							: data.submitQuiz.percentage >= 60
								? 4
								: 3,
				});
			}

			// Clear any previous errors
			setError(null);

			// Track quiz completion event
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("lesson:quiz-completed", {
						detail: {
							lessonId: variables.input.quizId,
							score: data.submitQuiz.percentage,
							passed: data.submitQuiz.passed,
						},
					}),
				);
			}
		},
		onError: (error: any) => {
			const errorMessage =
				error.message || "Failed to submit quiz. Please try again.";
			setError(errorMessage);
			handleError(error, { action: "submit-quiz" });
		},
	});

	const [switchToneMutation] = useApolloMutation(SWITCH_TONE, {
		onCompleted: (data) => {
			// Invalidate lesson data to refetch with new tone
			queryClient.invalidateQueries({
				queryKey: LESSON_QUERY_KEYS.dailyLesson,
			});

			// Clear any previous errors
			setError(null);

			// Track tone switch event
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("lesson:tone-switched", {
						detail: {
							newTone: data.switchTone.newTone,
							lessonId: dailyLessonData?.getDailyLesson?.id,
						},
					}),
				);
			}
		},
		onError: (error: any) => {
			const errorMessage =
				error.message || "Failed to switch tone. Please try again.";
			setError(errorMessage);
			handleError(error, { action: "switch-tone" });
		},
	});

	const [markLessonCompleteMutation] = useApolloMutation(MARK_LESSON_COMPLETE, {
		onCompleted: async (data, { variables }) => {
			// Update progress
			await queryClient.invalidateQueries({
				queryKey: LESSON_QUERY_KEYS.lessonProgress,
			});
			await queryClient.invalidateQueries({
				queryKey: LESSON_QUERY_KEYS.userProgress,
			});

			// Update spaced repetition
			if (data.markLessonComplete.xpEarned) {
				await updateSpacedRepetition({
					lessonId: variables.input.lessonId,
					quality: 5, // High quality for completed lessons
				});
			}

			// Track lesson completion event
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("lesson:completed", {
						detail: {
							lessonId: variables.input.lessonId,
							xpEarned: data.markLessonComplete.xpEarned,
						},
					}),
				);
			}
		},
		onError: (error: any) => {
			const errorMessage =
				error.message || "Failed to mark lesson as complete.";
			setError(errorMessage);
			handleError(error, { action: "mark-lesson-complete" });
		},
	});

	// Initialize queries when authenticated
	const initializeQueries = useCallback(() => {
		if (isAuthenticated) {
			getDailyLessonQuery();
			getUserProgressQuery();
		}
	}, [isAuthenticated, getDailyLessonQuery, getUserProgressQuery]);

	// Auto-initialize queries
	useEffect(() => {
		initializeQueries();
	}, [initializeQueries]);

	// Start lesson session when lesson is loaded
	useEffect(() => {
		if (currentLesson && isAuthenticated && !currentSessionId) {
			startLessonSession({
				lessonId: currentLesson.id,
				sessionType: "learning",
			}).catch(console.error);
		}
	}, [currentLesson, isAuthenticated, currentSessionId, startLessonSession]);

	// Handle lesson errors
	const handleLessonError = useCallback((error: any) => {
		const errorMessage = error.message || "Failed to load lesson data.";
		setError(errorMessage);

		// If it's an authentication error, it will be handled by the auth hook
		if (
			!errorMessage.includes("401") &&
			!errorMessage.includes("Unauthorized")
		) {
			handleError(error, { action: "load-lesson" });
		}
	}, []);

	// Handle progress errors
	const handleProgressError = useCallback((error: any) => {
		const errorMessage = error.message || "Failed to load progress data.";
		setError(errorMessage);

		if (
			!errorMessage.includes("401") &&
			!errorMessage.includes("Unauthorized")
		) {
			handleError(error, { action: "load-progress" });
		}
	}, []);

	// Enhanced lesson actions with progress tracking
	const getDailyLesson = useCallback(async (): Promise<Lesson> => {
		try {
			const result = await refetchDailyLesson();
			if (result.data?.getDailyLesson) {
				const lesson = result.data.getDailyLesson;

				// Start session for the lesson
				if (isAuthenticated) {
					await startLessonSession({
						lessonId: lesson.id,
						sessionType: "learning",
					});
				}

				return lesson;
			}
			throw new Error("Failed to fetch daily lesson");
		} catch (error: any) {
			handleLessonError(error);
			throw error;
		}
	}, [
		refetchDailyLesson,
		handleLessonError,
		isAuthenticated,
		startLessonSession,
	]);

	const submitQuiz = useCallback(
		async (submission: QuizSubmission): Promise<QuizResult> => {
			setIsSubmitting(true);
			try {
				const result = await submitQuizMutation({
					variables: {
						input: {
							quizId: submission.quizId,
							answers: submission.answers,
							timeSpent: submission.timeSpent,
						},
					},
				});

				const quizResult = result.data.submitQuiz;

				// Update lesson progress after quiz submission
				if (isAuthenticated && currentLesson) {
					await updateLessonProgress({
						lessonId: currentLesson.id,
						progress: quizResult.passed ? 100 : 75, // Adjust based on quiz result
						status: quizResult.passed ? "completed" : "in_progress",
					});

					// Complete the quiz section
					await completeLessonSection({
						lessonId: currentLesson.id,
						sectionId: submission.quizId,
						timeSpent: submission.timeSpent,
						score: quizResult.percentage,
					});
				}

				return quizResult;
			} finally {
				setIsSubmitting(false);
			}
		},
		[
			submitQuizMutation,
			isAuthenticated,
			currentLesson,
			updateLessonProgress,
			completeLessonSection,
		],
	);

	const switchTone = useCallback(
		async (tone: string, lessonId?: string): Promise<ToneSwitchResponse> => {
			setIsToneSwitching(true);
			try {
				const result = await switchToneMutation({
					variables: {
						input: {
							tone,
							lessonId: lessonId || dailyLessonData?.getDailyLesson?.id,
							sessionId: sessionStorage.getItem("session_id") || undefined,
						},
					},
				});

				// Save tone preference to lesson state
				if (isAuthenticated && currentLesson) {
					await saveLessonState({
						lessonId: currentLesson.id,
						state: {
							preferredTone: tone,
							lastToneSwitch: new Date().toISOString(),
						},
					});
				}

				return result.data.switchTone;
			} finally {
				setIsToneSwitching(false);
			}
		},
		[
			switchToneMutation,
			dailyLessonData,
			isAuthenticated,
			currentLesson,
			saveLessonState,
		],
	);

	const markLessonComplete = useCallback(
		async (lessonId: string, score?: number): Promise<void> => {
			const result = await markLessonCompleteMutation({
				variables: {
					input: {
						lessonId,
						score,
						completedAt: new Date().toISOString(),
					},
				},
			});

			// Update lesson progress to completed
			if (isAuthenticated) {
				await updateLessonProgress({
					lessonId,
					progress: 100,
					status: "completed",
					score,
				});
			}

			return result.data.markLessonComplete;
		},
		[markLessonCompleteMutation, isAuthenticated, updateLessonProgress],
	);

	const getLessonProgress = useCallback(async (): Promise<UserProgress> => {
		try {
			const result = await refetchProgress();
			if (result.data?.userProgress) {
				return result.data.userProgress;
			}
			throw new Error("Failed to fetch lesson progress");
		} catch (error: any) {
			handleProgressError(error);
			throw error;
		}
	}, [refetchProgress, handleProgressError]);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	// Enhanced real-time lesson streaming with progress tracking
	const startLessonStream = useCallback(
		async (
			lessonId: string,
			options: {
				onChunk?: (chunk: string) => void;
				onComplete?: (data: any) => void;
				onError?: (error: any) => void;
			} = {},
		) => {
			if (!isAuthenticated) {
				throw new Error("User must be authenticated to stream lessons");
			}

			setIsStreaming(true);
			setStreamedContent("");

			try {
				// Start session if not already started
				if (!currentSessionId) {
					await startLessonSession({
						lessonId,
						sessionType: "learning",
					});
				}

				await apiClient.streamLesson(lessonId, {
					onChunk: (chunk) => {
						setStreamedContent((prev) => prev + chunk);
						options.onChunk?.(chunk);
					},
					onComplete: async (data) => {
						setIsStreaming(false);

						// Update progress when streaming completes
						if (isAuthenticated) {
							await updateLessonProgress({
								lessonId,
								progress: 50, // Adjust based on actual progress
								status: "in_progress",
							});
						}

						options.onComplete?.(data);
					},
					onError: (error) => {
						setIsStreaming(false);
						setError(error.message);
						options.onError?.(error);
					},
				});
			} catch (error: any) {
				setIsStreaming(false);
				setError(error.message);
				options.onError?.(error);
			}
		},
		[
			isAuthenticated,
			currentSessionId,
			startLessonSession,
			updateLessonProgress,
		],
	);

	const stopLessonStream = useCallback(async () => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}
		setIsStreaming(false);

		// End session if active
		if (currentSessionId && currentLesson) {
			try {
				await endLessonSession({
					sessionId: currentSessionId,
					totalTimeSpent: 0, // Calculate actual time spent
					progress: 0, // Calculate actual progress
				});
			} catch (error) {
				console.error("Failed to end lesson session:", error);
			}
		}
	}, [currentSessionId, currentLesson, endLessonSession]);

	// Determine loading state
	const isLoading = isLoadingLesson || isLoadingProgress || !isAuthenticated;

	// Handle errors from queries
	if (lessonError && !error) {
		handleLessonError(lessonError);
	}

	return {
		// State
		currentLesson: dailyLessonData?.getDailyLesson || null,
		lessonProgress: progressData?.userProgress || null,
		isLoading,
		error,
		isSubmitting,
		isToneSwitching,
		isStreaming,
		streamedContent,

		// Actions
		getDailyLesson,
		submitQuiz,
		switchTone,
		markLessonComplete,
		getLessonProgress,
		clearError,
		startLessonStream,
		stopLessonStream,
	};
}

// Export hook as default
export default useLessons;
