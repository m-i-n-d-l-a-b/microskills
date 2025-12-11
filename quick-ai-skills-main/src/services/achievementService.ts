import { ApolloClient, gql } from "@apollo/client";
import { client } from "@/lib/graphql";
import {
	Achievement,
	AchievementProgress,
	ApiResponse,
	ApiError,
	UserProgress,
} from "@/types/api";
import { ENV, ERROR_MESSAGES } from "@/lib/constants";

// GraphQL Operations
export const GET_USER_ACHIEVEMENTS = gql`
  query GetUserAchievements {
    userAchievements {
      id
      title
      description
      icon
      category
      rarity
      xpReward
      unlockedAt
      progress {
        current
        target
        percentage
      }
    }
  }
`;

export const UNLOCK_ACHIEVEMENT = gql`
  mutation UnlockAchievement($achievementId: String!) {
    unlockAchievement(achievementId: $achievementId) {
      success
      achievement {
        id
        title
        description
        icon
        category
        rarity
        xpReward
        unlockedAt
      }
      xpEarned
      message
    }
  }
`;

export const UPDATE_ACHIEVEMENT_PROGRESS = gql`
  mutation UpdateAchievementProgress($achievementId: String!, $progress: Int!) {
    updateAchievementProgress(achievementId: $achievementId, progress: $progress) {
      success
      achievement {
        id
        progress {
          current
          target
          percentage
        }
      }
      unlocked
    }
  }
`;

export const GET_ACHIEVEMENT_CRITERIA = gql`
  query GetAchievementCriteria($achievementId: String!) {
    achievementCriteria(achievementId: $achievementId) {
      id
      type
      target
      current
      description
      category
    }
  }
`;

export const CHECK_ACHIEVEMENT_ELIGIBILITY = gql`
  query CheckAchievementEligibility($userId: String!) {
    checkAchievementEligibility(userId: $userId) {
      eligibleAchievements {
        id
        title
        description
        category
        rarity
        xpReward
        criteria {
          type
          target
          current
          description
        }
      }
      recentlyUnlocked {
        id
        title
        description
        unlockedAt
        xpEarned
      }
    }
  }
`;

export class AchievementService {
	private baseUrl: string;

	constructor() {
		this.baseUrl = ENV.API_BASE_URL;
	}

	/**
	 * Get all user achievements
	 */
	async getUserAchievements(): Promise<ApiResponse<Achievement[]>> {
		try {
			const { data } = await client.query({
				query: GET_USER_ACHIEVEMENTS,
				fetchPolicy: "cache-and-network",
			});

			return {
				data: data.userAchievements || [],
				success: true,
				status: 200,
			};
		} catch (error) {
			return this.handleError(error);
		}
	}

	/**
	 * Unlock a specific achievement
	 */
	async unlockAchievement(achievementId: string): Promise<
		ApiResponse<{
			achievement: Achievement;
			xpEarned: number;
			message: string;
		}>
	> {
		try {
			const { data } = await client.mutate({
				mutation: UNLOCK_ACHIEVEMENT,
				variables: { achievementId },
				update: (cache, { data }) => {
					if (data?.unlockAchievement?.success) {
						// Update cache to reflect the unlocked achievement
						cache.modify({
							fields: {
								userAchievements(existingAchievements = []) {
									const newAchievement = data.unlockAchievement.achievement;
									return [...existingAchievements, newAchievement];
								},
							},
						});
					}
				},
			});

			if (data?.unlockAchievement?.success) {
				return {
					data: {
						achievement: data.unlockAchievement.achievement,
						xpEarned: data.unlockAchievement.xpEarned,
						message: data.unlockAchievement.message,
					},
					success: true,
					status: 200,
				};
			} else {
				throw new Error(
					data?.unlockAchievement?.message || "Failed to unlock achievement",
				);
			}
		} catch (error) {
			return this.handleError(error);
		}
	}

	/**
	 * Update achievement progress
	 */
	async updateAchievementProgress(
		achievementId: string,
		progress: number,
	): Promise<
		ApiResponse<{
			achievement: Achievement;
			unlocked: boolean;
		}>
	> {
		try {
			const { data } = await client.mutate({
				mutation: UPDATE_ACHIEVEMENT_PROGRESS,
				variables: { achievementId, progress },
			});

			if (data?.updateAchievementProgress?.success) {
				return {
					data: {
						achievement: data.updateAchievementProgress.achievement,
						unlocked: data.updateAchievementProgress.unlocked,
					},
					success: true,
					status: 200,
				};
			} else {
				throw new Error("Failed to update achievement progress");
			}
		} catch (error) {
			return this.handleError(error);
		}
	}

	/**
	 * Get achievement criteria
	 */
	async getAchievementCriteria(
		achievementId: string,
	): Promise<ApiResponse<any[]>> {
		try {
			const { data } = await client.query({
				query: GET_ACHIEVEMENT_CRITERIA,
				variables: { achievementId },
			});

			return {
				data: data.achievementCriteria || [],
				success: true,
				status: 200,
			};
		} catch (error) {
			return this.handleError(error);
		}
	}

	/**
	 * Check achievement eligibility for a user
	 */
	async checkAchievementEligibility(userId: string): Promise<
		ApiResponse<{
			eligibleAchievements: any[];
			recentlyUnlocked: any[];
		}>
	> {
		try {
			const { data } = await client.query({
				query: CHECK_ACHIEVEMENT_ELIGIBILITY,
				variables: { userId },
			});

			return {
				data: {
					eligibleAchievements:
						data.checkAchievementEligibility.eligibleAchievements || [],
					recentlyUnlocked:
						data.checkAchievementEligibility.recentlyUnlocked || [],
				},
				success: true,
				status: 200,
			};
		} catch (error) {
			return this.handleError(error);
		}
	}

	/**
	 * Track user activity for achievement progress
	 */
	async trackActivity(
		activityType: string,
		metadata: Record<string, any>,
	): Promise<
		ApiResponse<{
			unlockedAchievements: Achievement[];
			progressUpdates: AchievementProgress[];
		}>
	> {
		try {
			const response = await fetch(
				`${this.baseUrl}/achievements/track-activity`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${this.getAuthToken()}`,
					},
					body: JSON.stringify({
						activityType,
						metadata,
					}),
				},
			);

			const result = await response.json();

			if (response.ok) {
				return {
					data: result.data,
					success: true,
					status: response.status,
				};
			} else {
				throw new Error(result.message || ERROR_MESSAGES.API_ERROR);
			}
		} catch (error) {
			return this.handleError(error);
		}
	}

	/**
	 * Get achievement statistics
	 */
	async getAchievementStats(): Promise<
		ApiResponse<{
			totalAchievements: number;
			unlockedAchievements: number;
			totalXpEarned: number;
			rarityBreakdown: Record<string, number>;
			categoryBreakdown: Record<string, number>;
		}>
	> {
		try {
			const response = await fetch(`${this.baseUrl}/achievements/stats`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${this.getAuthToken()}`,
				},
			});

			const result = await response.json();

			if (response.ok) {
				return {
					data: result.data,
					success: true,
					status: response.status,
				};
			} else {
				throw new Error(result.message || ERROR_MESSAGES.API_ERROR);
			}
		} catch (error) {
			return this.handleError(error);
		}
	}

	/**
	 * Get achievement leaderboard
	 */
	async getAchievementLeaderboard(
		period: "daily" | "weekly" | "monthly" | "all-time" = "all-time",
	): Promise<ApiResponse<any[]>> {
		try {
			const response = await fetch(
				`${this.baseUrl}/achievements/leaderboard?period=${period}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${this.getAuthToken()}`,
					},
				},
			);

			const result = await response.json();

			if (response.ok) {
				return {
					data: result.data,
					success: true,
					status: response.status,
				};
			} else {
				throw new Error(result.message || ERROR_MESSAGES.API_ERROR);
			}
		} catch (error) {
			return this.handleError(error);
		}
	}

	/**
	 * Share achievement on social media
	 */
	async shareAchievement(
		achievementId: string,
		platform: string,
	): Promise<
		ApiResponse<{
			shareUrl: string;
			message: string;
		}>
	> {
		try {
			const response = await fetch(
				`${this.baseUrl}/achievements/${achievementId}/share`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${this.getAuthToken()}`,
					},
					body: JSON.stringify({ platform }),
				},
			);

			const result = await response.json();

			if (response.ok) {
				return {
					data: result.data,
					success: true,
					status: response.status,
				};
			} else {
				throw new Error(result.message || ERROR_MESSAGES.API_ERROR);
			}
		} catch (error) {
			return this.handleError(error);
		}
	}

	/**
	 * Get auth token from localStorage
	 */
	private getAuthToken(): string | null {
		return localStorage.getItem("auth_token");
	}

	/**
	 * Handle API errors consistently
	 */
	private handleError(error: any): ApiResponse<any> {
		console.error("Achievement service error:", error);

		const errorMessage = error?.message || ERROR_MESSAGES.API_ERROR;
		const status = error?.status || 500;

		return {
			data: null,
			success: false,
			status,
			message: errorMessage,
		};
	}
}

// Export singleton instance
export const achievementService = new AchievementService();
