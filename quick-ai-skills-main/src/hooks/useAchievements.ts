import { useState, useCallback, useEffect } from "react";
import { achievementService } from "@/services/achievementService";
import {
	type Achievement,
	AchievementProgress,
	ApiResponse,
} from "@/types/api";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface AchievementState {
	achievements: Achievement[];
	loading: boolean;
	error: string | null;
	stats: {
		totalAchievements: number;
		unlockedAchievements: number;
		totalXpEarned: number;
		rarityBreakdown: Record<string, number>;
		categoryBreakdown: Record<string, number>;
	} | null;
	leaderboard: any[];
	eligibleAchievements: any[];
	recentlyUnlocked: any[];
}

interface AchievementActions {
	refreshAchievements: () => Promise<void>;
	unlockAchievement: (achievementId: string) => Promise<void>;
	updateProgress: (achievementId: string, progress: number) => Promise<void>;
	trackActivity: (
		activityType: string,
		metadata: Record<string, any>,
	) => Promise<void>;
	getAchievementCriteria: (achievementId: string) => Promise<any[]>;
	checkEligibility: () => Promise<void>;
	getStats: () => Promise<void>;
	getLeaderboard: (
		period?: "daily" | "weekly" | "monthly" | "all-time",
	) => Promise<void>;
	shareAchievement: (achievementId: string, platform: string) => Promise<void>;
	clearError: () => void;
}

export const useAchievements = (): AchievementState & AchievementActions => {
	const [state, setState] = useState<AchievementState>({
		achievements: [],
		loading: false,
		error: null,
		stats: null,
		leaderboard: [],
		eligibleAchievements: [],
		recentlyUnlocked: [],
	});

	const { user } = useAuth();
	const { toast } = useToast();

	// Load achievements on mount and when user changes
	useEffect(() => {
		if (user?.id) {
			refreshAchievements();
			checkEligibility();
			getStats();
		}
	}, [user?.id]);

	const refreshAchievements = useCallback(async () => {
		if (!user?.id) return;

		setState((prev) => ({ ...prev, loading: true, error: null }));

		try {
			const response = await achievementService.getUserAchievements();

			if (response.success) {
				setState((prev) => ({
					...prev,
					achievements: response.data || [],
					loading: false,
				}));
			} else {
				throw new Error(response.message || "Failed to load achievements");
			}
		} catch (error) {
			setState((prev) => ({
				...prev,
				loading: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to load achievements",
			}));
		}
	}, [user?.id]);

	const unlockAchievement = useCallback(
		async (achievementId: string) => {
			if (!user?.id) return;

			setState((prev) => ({ ...prev, loading: true, error: null }));

			try {
				const response =
					await achievementService.unlockAchievement(achievementId);

				if (response.success) {
					const { achievement, xpEarned, message } = response.data;

					// Update achievements list
					setState((prev) => ({
						...prev,
						achievements: [...prev.achievements, achievement],
						loading: false,
					}));

					// Show success toast
					toast({
						title: "🎉 Achievement Unlocked!",
						description: `${achievement.title} - ${xpEarned} XP earned!`,
					});

					// Refresh stats
					getStats();
				} else {
					throw new Error(response.message || "Failed to unlock achievement");
				}
			} catch (error) {
				setState((prev) => ({
					...prev,
					loading: false,
					error:
						error instanceof Error
							? error.message
							: "Failed to unlock achievement",
				}));

				toast({
					title: "Error",
					description:
						error instanceof Error
							? error.message
							: "Failed to unlock achievement",
					variant: "destructive",
				});
			}
		},
		[user?.id, toast],
	);

	const updateProgress = useCallback(
		async (achievementId: string, progress: number) => {
			if (!user?.id) return;

			try {
				const response = await achievementService.updateAchievementProgress(
					achievementId,
					progress,
				);

				if (response.success) {
					const { achievement, unlocked } = response.data;

					// Update achievement in the list
					setState((prev) => ({
						...prev,
						achievements: prev.achievements.map((a) =>
							a.id === achievementId
								? { ...a, progress: achievement.progress }
								: a,
						),
					}));

					// If achievement was unlocked, show notification
					if (unlocked) {
						toast({
							title: "🎉 Achievement Unlocked!",
							description: `You've unlocked a new achievement!`,
						});

						// Refresh achievements and stats
						refreshAchievements();
						getStats();
					}
				} else {
					throw new Error(response.message || "Failed to update progress");
				}
			} catch (error) {
				console.error("Failed to update achievement progress:", error);
			}
		},
		[user?.id, toast, refreshAchievements],
	);

	const getStats = useCallback(async () => {
		if (!user?.id) return;

		try {
			const response = await achievementService.getAchievementStats();

			if (response.success) {
				setState((prev) => ({
					...prev,
					stats: response.data,
				}));
			}
		} catch (error) {
			console.error("Failed to get achievement stats:", error);
		}
	}, [user?.id]);

	const trackActivity = useCallback(
		async (activityType: string, metadata: Record<string, any>) => {
			if (!user?.id) return;

			try {
				const response = await achievementService.trackActivity(
					activityType,
					metadata,
				);

				if (response.success) {
					const { unlockedAchievements, progressUpdates } = response.data;

					// Handle newly unlocked achievements
					if (unlockedAchievements.length > 0) {
						setState((prev) => ({
							...prev,
							achievements: [...prev.achievements, ...unlockedAchievements],
						}));

						// Show notifications for each unlocked achievement
						unlockedAchievements.forEach((achievement) => {
							toast({
								title: "🎉 Achievement Unlocked!",
								description: achievement.title,
							});
						});

						// Refresh stats
						getStats();
					}

					// Handle progress updates
					if (progressUpdates.length > 0) {
						setState((prev) => ({
							...prev,
							achievements: prev.achievements.map((achievement) => {
								const progressUpdate = progressUpdates.find(
									(p) => p.achievementId === achievement.id,
								);
								return progressUpdate
									? { ...achievement, progress: progressUpdate }
									: achievement;
							}),
						}));
					}
				}
			} catch (error) {
				console.error("Failed to track activity:", error);
			}
		},
		[user?.id, toast, getStats],
	);

	const getAchievementCriteria = useCallback(
		async (achievementId: string): Promise<any[]> => {
			try {
				const response =
					await achievementService.getAchievementCriteria(achievementId);

				if (response.success) {
					return response.data || [];
				} else {
					throw new Error(
						response.message || "Failed to get achievement criteria",
					);
				}
			} catch (error) {
				console.error("Failed to get achievement criteria:", error);
				return [];
			}
		},
		[],
	);

	const checkEligibility = useCallback(async () => {
		if (!user?.id) return;

		try {
			const response = await achievementService.checkAchievementEligibility(
				user.id,
			);

			if (response.success) {
				const { eligibleAchievements, recentlyUnlocked } = response.data;

				setState((prev) => ({
					...prev,
					eligibleAchievements: eligibleAchievements || [],
					recentlyUnlocked: recentlyUnlocked || [],
				}));

				// Show notifications for recently unlocked achievements
				recentlyUnlocked.forEach((achievement) => {
					toast({
						title: "🎉 Achievement Unlocked!",
						description: achievement.title,
					});
				});
			}
		} catch (error) {
			console.error("Failed to check achievement eligibility:", error);
		}
	}, [user?.id, toast]);

	const getLeaderboard = useCallback(
		async (
			period: "daily" | "weekly" | "monthly" | "all-time" = "all-time",
		) => {
			if (!user?.id) return;

			setState((prev) => ({ ...prev, loading: true }));

			try {
				const response =
					await achievementService.getAchievementLeaderboard(period);

				if (response.success) {
					setState((prev) => ({
						...prev,
						leaderboard: response.data || [],
						loading: false,
					}));
				} else {
					throw new Error(response.message || "Failed to get leaderboard");
				}
			} catch (error) {
				setState((prev) => ({
					...prev,
					loading: false,
					error:
						error instanceof Error
							? error.message
							: "Failed to get leaderboard",
				}));
			}
		},
		[user?.id],
	);

	const shareAchievement = useCallback(
		async (achievementId: string, platform: string) => {
			if (!user?.id) return;

			try {
				const response = await achievementService.shareAchievement(
					achievementId,
					platform,
				);

				if (response.success) {
					const { shareUrl, message } = response.data;

					// Open share URL in new window
					window.open(shareUrl, "_blank");

					toast({
						title: "Shared!",
						description: message,
					});
				} else {
					throw new Error(response.message || "Failed to share achievement");
				}
			} catch (error) {
				toast({
					title: "Error",
					description:
						error instanceof Error
							? error.message
							: "Failed to share achievement",
					variant: "destructive",
				});
			}
		},
		[user?.id, toast],
	);

	const clearError = useCallback(() => {
		setState((prev) => ({ ...prev, error: null }));
	}, []);

	return {
		...state,
		refreshAchievements,
		unlockAchievement,
		updateProgress,
		trackActivity,
		getAchievementCriteria,
		checkEligibility,
		getStats,
		getLeaderboard,
		shareAchievement,
		clearError,
	};
};
