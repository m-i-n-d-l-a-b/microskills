import { useCallback, useState, useEffect } from "react";
import { useLazyQuery, useMutation as useApolloMutation } from "@apollo/client";
import { useAuth } from "./useAuth";
import {
	GET_SPACED_REPETITION_ITEMS,
	GET_DUE_REVIEWS,
	UPDATE_SPACED_REPETITION,
	CREATE_SPACED_REPETITION_ITEM,
} from "@/lib/graphql";
import { handleError } from "@/utils/errorHandling";
import type {
	SpacedRepetitionItem,
	SpacedRepetitionInput,
	CreateSpacedRepetitionInput,
	DueReviewItem,
} from "@/types/api";

interface SpacedRepetitionState {
	items: SpacedRepetitionItem[];
	dueReviews: DueReviewItem[];
	isLoading: boolean;
	error: string | null;
	isUpdating: boolean;
}

interface SpacedRepetitionActions {
	updateSpacedRepetition: (input: SpacedRepetitionInput) => Promise<void>;
	getNextReview: (lessonId: string) => SpacedRepetitionItem | null;
	getDueCards: () => DueReviewItem[];
	getRecommendedLessons: () => DueReviewItem[];
	refreshItems: () => Promise<void>;
}

export type UseSpacedRepetitionReturn = SpacedRepetitionState &
	SpacedRepetitionActions;

export const useSpacedRepetition = (): UseSpacedRepetitionReturn => {
	const { isAuthenticated, user } = useAuth();
	const [items, setItems] = useState<SpacedRepetitionItem[]>([]);
	const [dueReviews, setDueReviews] = useState<DueReviewItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);

	// GraphQL queries
	const [
		getSpacedRepetitionItemsQuery,
		{ data: itemsData, loading: isLoadingItems, refetch: refetchItems },
	] = useLazyQuery(GET_SPACED_REPETITION_ITEMS, {
		fetchPolicy: "cache-and-network",
		errorPolicy: "all",
	});

	const [
		getDueReviewsQuery,
		{
			data: dueReviewsData,
			loading: isLoadingDueReviews,
			refetch: refetchDueReviews,
		},
	] = useLazyQuery(GET_DUE_REVIEWS, {
		fetchPolicy: "cache-and-network",
		errorPolicy: "all",
	});

	// GraphQL mutations
	const [updateSpacedRepetitionMutation] = useApolloMutation(
		UPDATE_SPACED_REPETITION,
		{
			onCompleted: async (data) => {
				if (data.updateSpacedRepetition.success) {
					// Refresh the items to get updated data
					await refetchItems();
					await refetchDueReviews();
					setError(null);
				}
			},
			onError: (error: any) => {
				const errorMessage =
					error.message || "Failed to update spaced repetition.";
				setError(errorMessage);
				handleError(error, { action: "update-spaced-repetition" });
			},
		},
	);

	const [createSpacedRepetitionItemMutation] = useApolloMutation(
		CREATE_SPACED_REPETITION_ITEM,
		{
			onCompleted: async (data) => {
				if (data.createSpacedRepetitionItem.success) {
					// Refresh the items to get the new item
					await refetchItems();
					await refetchDueReviews();
					setError(null);
				}
			},
			onError: (error: any) => {
				const errorMessage =
					error.message || "Failed to create spaced repetition item.";
				setError(errorMessage);
				handleError(error, { action: "create-spaced-repetition-item" });
			},
		},
	);

	// Initialize queries when authenticated
	const initializeQueries = useCallback(() => {
		if (isAuthenticated) {
			getSpacedRepetitionItemsQuery();
			getDueReviewsQuery();
		}
	}, [isAuthenticated, getSpacedRepetitionItemsQuery, getDueReviewsQuery]);

	// Auto-initialize queries
	useEffect(() => {
		initializeQueries();
	}, [initializeQueries]);

	// Update local state when data changes
	useEffect(() => {
		if (itemsData?.spacedRepetitionItems) {
			setItems(itemsData.spacedRepetitionItems);
		}
	}, [itemsData]);

	useEffect(() => {
		if (dueReviewsData?.dueReviews) {
			setDueReviews(dueReviewsData.dueReviews);
		}
	}, [dueReviewsData]);

	// Update loading state
	useEffect(() => {
		setIsLoading(isLoadingItems || isLoadingDueReviews);
	}, [isLoadingItems, isLoadingDueReviews]);

	// Handle errors
	const handleQueryError = useCallback((error: any) => {
		const errorMessage =
			error.message || "Failed to load spaced repetition data.";
		setError(errorMessage);

		if (
			!errorMessage.includes("401") &&
			!errorMessage.includes("Unauthorized")
		) {
			handleError(error, { action: "load-spaced-repetition" });
		}
	}, []);

	// Update spaced repetition for a lesson
	const updateSpacedRepetition = useCallback(
		async (input: SpacedRepetitionInput) => {
			if (!isAuthenticated) {
				setError("User must be authenticated to update spaced repetition.");
				return;
			}

			setIsUpdating(true);
			setError(null);

			try {
				// Check if item exists
				const existingItem = items.find(
					(item) => item.lessonId === input.lessonId,
				);

				if (existingItem) {
					// Update existing item
					await updateSpacedRepetitionMutation({
						variables: { input },
					});
				} else {
					// Create new item
					const createInput: CreateSpacedRepetitionInput = {
						lessonId: input.lessonId,
						initialQuality: input.quality,
					};

					await createSpacedRepetitionItemMutation({
						variables: { input: createInput },
					});
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: "Failed to update spaced repetition.";
				setError(errorMessage);
				handleError(error, { action: "update-spaced-repetition" });
			} finally {
				setIsUpdating(false);
			}
		},
		[
			isAuthenticated,
			items,
			updateSpacedRepetitionMutation,
			createSpacedRepetitionItemMutation,
		],
	);

	// Get next review for a specific lesson
	const getNextReview = useCallback(
		(lessonId: string): SpacedRepetitionItem | null => {
			return items.find((item) => item.lessonId === lessonId) || null;
		},
		[items],
	);

	// Get all due cards
	const getDueCards = useCallback((): DueReviewItem[] => {
		return dueReviews;
	}, [dueReviews]);

	// Get recommended lessons (sorted by priority)
	const getRecommendedLessons = useCallback((): DueReviewItem[] => {
		return [...dueReviews].sort((a, b) => {
			// Sort by priority (higher priority first)
			if (a.priority !== b.priority) {
				return b.priority - a.priority;
			}

			// Then by days overdue (more overdue first)
			if (a.daysOverdue !== b.daysOverdue) {
				return b.daysOverdue - a.daysOverdue;
			}

			// Finally by ease factor (lower = harder, so prioritize)
			return a.easeFactor - b.easeFactor;
		});
	}, [dueReviews]);

	// Refresh all data
	const refreshItems = useCallback(async () => {
		if (!isAuthenticated) return;

		try {
			await Promise.all([refetchItems(), refetchDueReviews()]);
			setError(null);
		} catch (error) {
			handleQueryError(error);
		}
	}, [isAuthenticated, refetchItems, refetchDueReviews, handleQueryError]);

	return {
		// State
		items,
		dueReviews,
		isLoading,
		error,
		isUpdating,

		// Actions
		updateSpacedRepetition,
		getNextReview,
		getDueCards,
		getRecommendedLessons,
		refreshItems,
	};
};
