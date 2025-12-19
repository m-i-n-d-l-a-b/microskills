import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AchievementService } from "./achievementService";
import { client } from "@/lib/graphql";
import { Achievement } from "@/types/api";

// Mock the GraphQL client
vi.mock("@/lib/graphql", () => ({
	client: {
		query: vi.fn(),
		mutate: vi.fn(),
	},
}));

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
});

const mockClient = vi.mocked(client);

describe("AchievementService", () => {
	let achievementService: AchievementService;

	const mockAchievement: Achievement = {
		id: "achievement-1",
		title: "First Lesson",
		description: "Complete your first lesson",
		icon: "🎓",
		category: "learning",
		rarity: "common",
		xpReward: 50,
		unlockedAt: "2024-01-15T10:00:00Z",
		progress: {
			current: 1,
			target: 1,
			percentage: 100,
		},
	};

	beforeEach(() => {
		achievementService = new AchievementService();
		vi.clearAllMocks();
		localStorageMock.getItem.mockReturnValue("mock-token");
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("getUserAchievements", () => {
		it("should fetch user achievements successfully", async () => {
			const mockResponse = {
				data: {
					userAchievements: [mockAchievement],
				},
			};

			mockClient.query.mockResolvedValue(mockResponse);

			const result = await achievementService.getUserAchievements();

			expect(result.success).toBe(true);
			expect(result.data).toEqual([mockAchievement]);
			expect(mockClient.query).toHaveBeenCalledWith({
				query: expect.any(Object),
				fetchPolicy: "cache-and-network",
			});
		});

		it("should handle query errors", async () => {
			const error = new Error("GraphQL error");
			mockClient.query.mockRejectedValue(error);

			const result = await achievementService.getUserAchievements();

			expect(result.success).toBe(false);
			expect(result.message).toBe("GraphQL error");
		});
	});

	describe("unlockAchievement", () => {
		it("should unlock achievement successfully", async () => {
			const mockResponse = {
				data: {
					unlockAchievement: {
						success: true,
						achievement: mockAchievement,
						xpEarned: 50,
						message: "Achievement unlocked!",
					},
				},
			};

			mockClient.mutate.mockResolvedValue(mockResponse);

			const result =
				await achievementService.unlockAchievement("achievement-1");

			expect(result.success).toBe(true);
			expect(result.data.achievement).toEqual(mockAchievement);
			expect(result.data.xpEarned).toBe(50);
			expect(mockClient.mutate).toHaveBeenCalledWith({
				mutation: expect.any(Object),
				variables: { achievementId: "achievement-1" },
				update: expect.any(Function),
			});
		});

		it("should handle unlock failure", async () => {
			const mockResponse = {
				data: {
					unlockAchievement: {
						success: false,
						message: "Achievement already unlocked",
					},
				},
			};

			mockClient.mutate.mockResolvedValue(mockResponse);

			const result =
				await achievementService.unlockAchievement("achievement-1");

			expect(result.success).toBe(false);
			expect(result.message).toBe("Achievement already unlocked");
		});

		it("should handle mutation errors", async () => {
			const error = new Error("Mutation error");
			mockClient.mutate.mockRejectedValue(error);

			const result =
				await achievementService.unlockAchievement("achievement-1");

			expect(result.success).toBe(false);
			expect(result.message).toBe("Mutation error");
		});
	});

	describe("updateAchievementProgress", () => {
		it("should update achievement progress successfully", async () => {
			const mockResponse = {
				data: {
					updateAchievementProgress: {
						success: true,
						achievement: {
							id: "achievement-1",
							progress: {
								current: 5,
								target: 10,
								percentage: 50,
							},
						},
						unlocked: false,
					},
				},
			};

			mockClient.mutate.mockResolvedValue(mockResponse);

			const result = await achievementService.updateAchievementProgress(
				"achievement-1",
				5,
			);

			expect(result.success).toBe(true);
			expect(result.data.achievement.progress.percentage).toBe(50);
			expect(result.data.unlocked).toBe(false);
		});

		it("should handle progress update failure", async () => {
			const mockResponse = {
				data: {
					updateAchievementProgress: {
						success: false,
					},
				},
			};

			mockClient.mutate.mockResolvedValue(mockResponse);

			const result = await achievementService.updateAchievementProgress(
				"achievement-1",
				5,
			);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Failed to update achievement progress");
		});
	});

	describe("getAchievementCriteria", () => {
		it("should fetch achievement criteria successfully", async () => {
			const mockCriteria = [
				{
					id: "criteria-1",
					type: "lessons_completed",
					target: 10,
					current: 5,
					description: "Complete 10 lessons",
					category: "learning",
				},
			];

			const mockResponse = {
				data: {
					achievementCriteria: mockCriteria,
				},
			};

			mockClient.query.mockResolvedValue(mockResponse);

			const result =
				await achievementService.getAchievementCriteria("achievement-1");

			expect(result.success).toBe(true);
			expect(result.data).toEqual(mockCriteria);
		});
	});

	describe("checkAchievementEligibility", () => {
		it("should check eligibility successfully", async () => {
			const mockEligibleAchievements = [mockAchievement];
			const mockRecentlyUnlocked = [mockAchievement];

			const mockResponse = {
				data: {
					checkAchievementEligibility: {
						eligibleAchievements: mockEligibleAchievements,
						recentlyUnlocked: mockRecentlyUnlocked,
					},
				},
			};

			mockClient.query.mockResolvedValue(mockResponse);

			const result =
				await achievementService.checkAchievementEligibility("user-1");

			expect(result.success).toBe(true);
			expect(result.data.eligibleAchievements).toEqual(
				mockEligibleAchievements,
			);
			expect(result.data.recentlyUnlocked).toEqual(mockRecentlyUnlocked);
		});
	});

	describe("trackActivity", () => {
		it("should track activity successfully", async () => {
			const mockResponse = {
				data: {
					unlockedAchievements: [mockAchievement],
					progressUpdates: [
						{
							achievementId: "achievement-1",
							current: 5,
							target: 10,
							percentage: 50,
						},
					],
				},
			};

			(global.fetch as any).mockResolvedValue({
				ok: true,
				json: async () => ({ data: mockResponse.data }),
			});

			const result = await achievementService.trackActivity(
				"lesson_completed",
				{
					lessonId: "lesson-1",
					score: 85,
				},
			);

			expect(result.success).toBe(true);
			expect(result.data.unlockedAchievements).toEqual([mockAchievement]);
			expect(result.data.progressUpdates).toHaveLength(1);
		});

		it("should handle activity tracking failure", async () => {
			(global.fetch as any).mockResolvedValue({
				ok: false,
				json: async () => ({ message: "Activity tracking failed" }),
			});

			const result = await achievementService.trackActivity(
				"lesson_completed",
				{},
			);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Activity tracking failed");
		});
	});

	describe("getAchievementStats", () => {
		it("should fetch achievement stats successfully", async () => {
			const mockStats = {
				totalAchievements: 50,
				unlockedAchievements: 15,
				totalXpEarned: 1250,
				rarityBreakdown: {
					common: 10,
					rare: 3,
					epic: 2,
					legendary: 0,
				},
				categoryBreakdown: {
					learning: 8,
					streak: 4,
					social: 2,
					special: 1,
				},
			};

			(global.fetch as any).mockResolvedValue({
				ok: true,
				json: async () => ({ data: mockStats }),
			});

			const result = await achievementService.getAchievementStats();

			expect(result.success).toBe(true);
			expect(result.data).toEqual(mockStats);
		});
	});

	describe("getAchievementLeaderboard", () => {
		it("should fetch leaderboard successfully", async () => {
			const mockLeaderboard = [
				{
					rank: 1,
					user: { id: "user-1", username: "topUser" },
					achievements: 25,
					xp: 5000,
				},
			];

			(global.fetch as any).mockResolvedValue({
				ok: true,
				json: async () => ({ data: mockLeaderboard }),
			});

			const result =
				await achievementService.getAchievementLeaderboard("all-time");

			expect(result.success).toBe(true);
			expect(result.data).toEqual(mockLeaderboard);
		});

		it("should use correct period parameter", async () => {
			(global.fetch as any).mockResolvedValue({
				ok: true,
				json: async () => ({ data: [] }),
			});

			await achievementService.getAchievementLeaderboard("weekly");

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining("period=weekly"),
				expect.any(Object),
			);
		});
	});

	describe("shareAchievement", () => {
		it("should share achievement successfully", async () => {
			const mockShareResponse = {
				shareUrl: "https://example.com/share/achievement-1",
				message: "Achievement shared successfully",
			};

			(global.fetch as any).mockResolvedValue({
				ok: true,
				json: async () => ({ data: mockShareResponse }),
			});

			const result = await achievementService.shareAchievement(
				"achievement-1",
				"linkedin",
			);

			expect(result.success).toBe(true);
			expect(result.data.shareUrl).toBe(mockShareResponse.shareUrl);
			expect(result.data.message).toBe(mockShareResponse.message);
		});
	});

	describe("error handling", () => {
		it("should handle missing auth token", async () => {
			localStorageMock.getItem.mockReturnValue(null);

			const result = await achievementService.getUserAchievements();

			expect(result.success).toBe(false);
			expect(result.message).toBe(
				"Cannot destructure property 'data' of '(intermediate value)' as it is undefined.",
			);
		});

		it("should handle network errors", async () => {
			(global.fetch as any).mockRejectedValue(new Error("Network error"));

			const result = await achievementService.getAchievementStats();

			expect(result.success).toBe(false);
			expect(result.message).toBe("Network error");
		});
	});
});
