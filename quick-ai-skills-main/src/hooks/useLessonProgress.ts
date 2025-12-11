import { useState, useCallback, useEffect, useRef } from "react";
import { useLazyQuery, useMutation } from "@apollo/client";
import { useAuth } from "./useAuth";
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
import { handleError } from "@/utils/errorHandling";
import type {
	LessonProgress,
	LessonProgressInput,
	SectionCompletionInput,
	LessonSessionInput,
	LessonSessionEndInput,
	LessonStateInput,
	ProgressAnalytics,
	UserLessonProgress,
} from "@/types/api";

// Progress tracking state interface
export interface ProgressTrackingState {
	currentLessonProgress: LessonProgress | null;
	userLessonProgress: UserLessonProgress[];
	progressAnalytics: ProgressAnalytics | null;
	isLoading: boolean;
	error: string | null;
	isUpdating: boolean;
	currentSessionId: string | null;
}

// Progress tracking actions interface
export interface ProgressTrackingActions {
	getLessonProgress: (lessonId: string) => Promise<LessonProgress>;
	getUserLessonProgress: () => Promise<UserLessonProgress[]>;
	getProgressAnalytics: (timeframe?: string) => Promise<ProgressAnalytics>;
	updateLessonProgress: (input: LessonProgressInput) => Promise<LessonProgress>;
	completeLessonSection: (input: SectionCompletionInput) => Promise<void>;
	startLessonSession: (input: LessonSessionInput) => Promise<string>;
	endLessonSession: (input: LessonSessionEndInput) => Promise<void>;
	saveLessonState: (input: LessonStateInput) => Promise<void>;
	getLessonState: (lessonId: string) => Promise<any>;
	refreshProgress: () => Promise<void>;
	clearError: () => void;
}

// Hook return type
export type UseLessonProgressReturn = ProgressTrackingState &
	ProgressTrackingActions;

export function useLessonProgress(): UseLessonProgressReturn {
	const { isAuthenticated, user } = useAuth();
	const [error, setError] = useState<string | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);
	const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
	const sessionStartTime = useRef<number | null>(null);

	// GraphQL queries
	const [
		getLessonProgressQuery,
		{
			data: lessonProgressData,
			loading: isLoadingLessonProgress,
			refetch: refetchLessonProgress,
		},
	] = useLazyQuery(GET_LESSON_PROGRESS, {
		fetchPolicy: "cache-and-network",
		errorPolicy: "all",
	});

	const [
		getUserLessonProgressQuery,
		{
			data: userLessonProgressData,
			loading: isLoadingUserProgress,
			refetch: refetchUserProgress,
		},
	] = useLazyQuery(GET_USER_LESSON_PROGRESS, {
		fetchPolicy: "cache-and-network",
		errorPolicy: "all",
	});

	const [
		getProgressAnalyticsQuery,
		{
			data: analyticsData,
			loading: isLoadingAnalytics,
			refetch: refetchAnalytics,
		},
	] = useLazyQuery(GET_PROGRESS_ANALYTICS, {
		fetchPolicy: "cache-and-network",
		errorPolicy: "all",
	});

	const [
		getLessonStateQuery,
		{ data: lessonStateData, refetch: refetchLessonState },
	] = useLazyQuery(GET_LESSON_STATE, {
		fetchPolicy: "cache-first",
		errorPolicy: "all",
	});

	// GraphQL mutations
	const [updateLessonProgressMutation] = useMutation(UPDATE_LESSON_PROGRESS, {
		onCompleted: (data) => {
			setError(null);
			// Invalidate related queries
			refetchLessonProgress();
			refetchUserProgress();
			refetchAnalytics();
		},
		onError: (error: any) => {
			const errorMessage = error.message || "Failed to update lesson progress.";
			setError(errorMessage);
			handleError(error, { action: "update-lesson-progress" });
		},
	});

	const [completeLessonSectionMutation] = useMutation(COMPLETE_LESSON_SECTION, {
		onCompleted: (data) => {
			setError(null);
			// Invalidate related queries
			refetchLessonProgress();
			refetchUserProgress();
			refetchAnalytics();
		},
		onError: (error: any) => {
			const errorMessage =
				error.message || "Failed to complete lesson section.";
			setError(errorMessage);
			handleError(error, { action: "complete-lesson-section" });
		},
	});

	const [startLessonSessionMutation] = useMutation(START_LESSON_SESSION, {
		onCompleted: (data) => {
			setError(null);
			setCurrentSessionId(data.startLessonSession.sessionId);
			sessionStartTime.current = Date.now();
		},
		onError: (error: any) => {
			const errorMessage = error.message || "Failed to start lesson session.";
			setError(errorMessage);
			handleError(error, { action: "start-lesson-session" });
		},
	});

	const [endLessonSessionMutation] = useMutation(END_LESSON_SESSION, {
		onCompleted: (data) => {
			setError(null);
			setCurrentSessionId(null);
			sessionStartTime.current = null;
			// Invalidate related queries
			refetchLessonProgress();
			refetchUserProgress();
			refetchAnalytics();
		},
		onError: (error: any) => {
			const errorMessage = error.message || "Failed to end lesson session.";
			setError(errorMessage);
			handleError(error, { action: "end-lesson-session" });
		},
	});

	const [saveLessonStateMutation] = useMutation(SAVE_LESSON_STATE, {
		onCompleted: (data) => {
			setError(null);
		},
		onError: (error: any) => {
			const errorMessage = error.message || "Failed to save lesson state.";
			setError(errorMessage);
			handleError(error, { action: "save-lesson-state" });
		},
	});

	// Initialize queries when authenticated
	const initializeQueries = useCallback(() => {
		if (isAuthenticated) {
			getUserLessonProgressQuery();
			getProgressAnalyticsQuery({ variables: { timeframe: "all" } });
		}
	}, [isAuthenticated, getUserLessonProgressQuery, getProgressAnalyticsQuery]);

	// Auto-initialize queries
	useEffect(() => {
		initializeQueries();
	}, [initializeQueries]);

	// Handle errors
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

	// Progress tracking actions
	const getLessonProgress = useCallback(
		async (lessonId: string): Promise<LessonProgress> => {
			try {
				const result = await getLessonProgressQuery({
					variables: { lessonId },
				});
				if (result.data?.lessonProgress) {
					return result.data.lessonProgress;
				}
				throw new Error("Failed to fetch lesson progress");
			} catch (error: any) {
				handleProgressError(error);
				throw error;
			}
		},
		[getLessonProgressQuery, handleProgressError],
	);

	const getUserLessonProgress = useCallback(async (): Promise<
		UserLessonProgress[]
	> => {
		try {
			const result = await refetchUserProgress();
			if (result.data?.userLessonProgress) {
				return result.data.userLessonProgress;
			}
			throw new Error("Failed to fetch user lesson progress");
		} catch (error: any) {
			handleProgressError(error);
			throw error;
		}
	}, [refetchUserProgress, handleProgressError]);

	const getProgressAnalytics = useCallback(
		async (timeframe: string = "all"): Promise<ProgressAnalytics> => {
			try {
				const result = await getProgressAnalyticsQuery({
					variables: { timeframe },
				});
				if (result.data?.progressAnalytics) {
					return result.data.progressAnalytics;
				}
				throw new Error("Failed to fetch progress analytics");
			} catch (error: any) {
				handleProgressError(error);
				throw error;
			}
		},
		[getProgressAnalyticsQuery, handleProgressError],
	);

	const updateLessonProgress = useCallback(
		async (input: LessonProgressInput): Promise<LessonProgress> => {
			setIsUpdating(true);
			try {
				const result = await updateLessonProgressMutation({
					variables: { input },
				});
				return result.data.updateLessonProgress;
			} finally {
				setIsUpdating(false);
			}
		},
		[updateLessonProgressMutation],
	);

	const completeLessonSection = useCallback(
		async (input: SectionCompletionInput): Promise<void> => {
			setIsUpdating(true);
			try {
				await completeLessonSectionMutation({
					variables: { input },
				});
			} finally {
				setIsUpdating(false);
			}
		},
		[completeLessonSectionMutation],
	);

	const startLessonSession = useCallback(
		async (input: LessonSessionInput): Promise<string> => {
			const result = await startLessonSessionMutation({
				variables: { input },
			});
			return result.data.startLessonSession.sessionId;
		},
		[startLessonSessionMutation],
	);

	const endLessonSession = useCallback(
		async (input: LessonSessionEndInput): Promise<void> => {
			await endLessonSessionMutation({
				variables: { input },
			});
		},
		[endLessonSessionMutation],
	);

	const saveLessonState = useCallback(
		async (input: LessonStateInput): Promise<void> => {
			await saveLessonStateMutation({
				variables: { input },
			});
		},
		[saveLessonStateMutation],
	);

	const getLessonState = useCallback(
		async (lessonId: string): Promise<any> => {
			try {
				const result = await getLessonStateQuery({ variables: { lessonId } });
				return result.data?.lessonState || null;
			} catch (error: any) {
				handleProgressError(error);
				throw error;
			}
		},
		[getLessonStateQuery, handleProgressError],
	);

	const refreshProgress = useCallback(async (): Promise<void> => {
		try {
			await Promise.all([refetchUserProgress(), refetchAnalytics()]);
		} catch (error: any) {
			handleProgressError(error);
		}
	}, [refetchUserProgress, refetchAnalytics, handleProgressError]);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	// Auto-save session data when component unmounts
	useEffect(() => {
		return () => {
			if (currentSessionId && sessionStartTime.current) {
				const timeSpent = Math.floor(
					(Date.now() - sessionStartTime.current) / 1000,
				);
				endLessonSession({
					sessionId: currentSessionId,
					totalTimeSpent: timeSpent,
					progress: 0, // This would be calculated based on actual progress
				}).catch(console.error);
			}
		};
	}, [currentSessionId, endLessonSession]);

	// Determine loading state
	const isLoading =
		isLoadingLessonProgress ||
		isLoadingUserProgress ||
		isLoadingAnalytics ||
		!isAuthenticated;

	return {
		// State
		currentLessonProgress: lessonProgressData?.lessonProgress || null,
		userLessonProgress: userLessonProgressData?.userLessonProgress || [],
		progressAnalytics: analyticsData?.progressAnalytics || null,
		isLoading,
		error,
		isUpdating,
		currentSessionId,

		// Actions
		getLessonProgress,
		getUserLessonProgress,
		getProgressAnalytics,
		updateLessonProgress,
		completeLessonSection,
		startLessonSession,
		endLessonSession,
		saveLessonState,
		getLessonState,
		refreshProgress,
		clearError,
	};
}

// Export hook as default
export default useLessonProgress;
