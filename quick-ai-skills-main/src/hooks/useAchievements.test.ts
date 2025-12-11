import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAchievements } from "./useAchievements";
import { achievementService } from "@/services/achievementService";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

// Mock the dependencies
vi.mock("@/services/achievementService");
vi.mock("./useAuth");
vi.mock("./use-toast");

const mockAchievementService = vi.mocked(achievementService);
const mockUseAuth = vi.mocked(useAuth);
const mockUseToast = vi.mocked(useToast);

// Mock window.open
Object.assign(window, {
	open: vi.fn(),
});

describe("useAchievements", () => {
	const mockUser = { id: "user-1", email: "test@example.com" };
	const mockToast = vi.fn();

	const mockAchievement = {
		id: "achievement-1",
		title: "First Lesson",
		description: "Complete your first lesson",
		icon: "🎓",
		category: "learning" as const,
		rarity: "common" as const,
		xpReward: 50,
		unlockedAt: "2024-01-15T10:00:00Z",
		progress: {
			current: 1,
			target: 1,
			percentage: 100,
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockUseAuth.mockReturnValue({
			user: mockUser,
			login: vi.fn(),
			logout: vi.fn(),
			loading: false,
			error: null,
		});

		mockUseToast.mockReturnValue({
			toast: mockToast,
		});

		// Mock successful service responses
		mockAchievementService.getUserAchievements.mockResolvedValue({
			success: true,
			data: [mockAchievement],
			status: 200,
		});

		mockAchievementService.checkAchievementEligibility.mockResolvedValue({
			success: true,
			data: {
				eligibleAchievements: [],
				recentlyUnlocked: [],
			},
			status: 200,
		});

		mockAchievementService.getAchievementStats.mockResolvedValue({
			success: true,
			data: {
				totalAchievements: 50,
				unlockedAchievements: 15,
				totalXpEarned: 1250,
				rarityBreakdown: { common: 10, rare: 3, epic: 2, legendary: 0 },
				categoryBreakdown: { learning: 8, streak: 4, social: 2, special: 1 },
			},
			status: 200,
		});
	});

	describe("initialization", () => {
		it("should initialize with default state", async () => {
			const { result } = renderHook(() => useAchievements());

			// Wait for the initial load to complete
			await waitFor(() => {
				expect(result.current.achievements).toEqual([mockAchievement]);
			});

			// After loading completes, check the final state
			expect(result.current.loading).toBe(false);
			expect(result.current.error).toBe(null);
			expect(result.current.stats).not.toBe(null);
			expect(result.current.leaderboard).toEqual([]);
			expect(result.current.eligibleAchievements).toEqual([]);
			expect(result.current.recentlyUnlocked).toEqual([]);
		});

		it("should load achievements on mount when user exists", async () => {
			const { result } = renderHook(() => useAchievements());

			await waitFor(() => {
				expect(result.current.achievements).toEqual([mockAchievement]);
			});

			expect(mockAchievementService.getUserAchievements).toHaveBeenCalled();
			expect(
				mockAchievementService.checkAchievementEligibility,
			).toHaveBeenCalledWith("user-1");
			expect(mockAchievementService.getAchievementStats).toHaveBeenCalled();
		});

		it("should not load achievements when user does not exist", () => {
			mockUseAuth.mockReturnValue({
				user: null,
				login: vi.fn(),
				logout: vi.fn(),
				loading: false,
				error: null,
			});

			renderHook(() => useAchievements());

			expect(mockAchievementService.getUserAchievements).not.toHaveBeenCalled();
		});
	});

	describe("refreshAchievements", () => {
		it("should refresh achievements successfully", async () => {
			const { result } = renderHook(() => useAchievements());

			await act(async () => {
				await result.current.refreshAchievements();
			});

			expect(result.current.achievements).toEqual([mockAchievement]);
			expect(result.current.loading).toBe(false);
			expect(result.current.error).toBe(null);
		});

		it("should handle refresh errors", async () => {
			mockAchievementService.getUserAchievements.mockResolvedValue({
				success: false,
				message: "Failed to load achievements",
				status: 500,
			});

			const { result } = renderHook(() => useAchievements());

			await act(async () => {
				await result.current.refreshAchievements();
			});

			expect(result.current.error).toBe("Failed to load achievements");
			expect(result.current.loading).toBe(false);
		});
	});

	describe("unlockAchievement", () => {
		it("should unlock achievement successfully", async () => {
			mockAchievementService.unlockAchievement.mockResolvedValue({
				success: true,
				data: {
					achievement: mockAchievement,
					xpEarned: 50,
					message: "Achievement unlocked!",
				},
				status: 200,
			});

			const { result } = renderHook(() => useAchievements());

			await act(async () => {
				await result.current.unlockAchievement("achievement-1");
			});

			expect(result.current.achievements).toContain(mockAchievement);
			expect(mockToast).toHaveBeenCalledWith({
				title: "🎉 Achievement Unlocked!",
				description: "First Lesson - 50 XP earned!",
			});
		});

		it("should handle unlock errors", async () => {
			mockAchievementService.unlockAchievement.mockResolvedValue({
				success: false,
				message: "Achievement already unlocked",
				status: 400,
			});

			const { result } = renderHook(() => useAchievements());

			await act(async () => {
				await result.current.unlockAchievement("achievement-1");
			});

			expect(result.current.error).toBe("Achievement already unlocked");
			expect(mockToast).toHaveBeenCalledWith({
				title: "Error",
				description: "Achievement already unlocked",
				variant: "destructive",
			});
		});
	});

	describe("updateProgress", () => {
		it("should update achievement progress successfully", async () => {
			mockAchievementService.updateAchievementProgress.mockResolvedValue({
				success: true,
				data: {
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
				status: 200,
			});

			const { result } = renderHook(() => useAchievements());

			// First load achievements
			await waitFor(() => {
				expect(result.current.achievements).toEqual([mockAchievement]);
			});

			await act(async () => {
				await result.current.updateProgress("achievement-1", 5);
			});

			const updatedAchievement = result.current.achievements.find(
				(a) => a.id === "achievement-1",
			);
			expect(updatedAchievement?.progress?.percentage).toBe(50);
		});

		it("should show notification when achievement is unlocked", async () => {
			mockAchievementService.updateAchievementProgress.mockResolvedValue({
				success: true,
				data: {
					achievement: mockAchievement,
					unlocked: true,
				},
				status: 200,
			});

			const { result } = renderHook(() => useAchievements());

			await act(async () => {
				await result.current.updateProgress("achievement-1", 10);
			});

			expect(mockToast).toHaveBeenCalledWith({
				title: "🎉 Achievement Unlocked!",
				description: "You've unlocked a new achievement!",
			});
		});
	});

	describe("trackActivity", () => {
		it("should track activity and handle unlocked achievements", async () => {
			mockAchievementService.trackActivity.mockResolvedValue({
				success: true,
				data: {
					unlockedAchievements: [mockAchievement],
					progressUpdates: [],
				},
				status: 200,
			});

			const { result } = renderHook(() => useAchievements());

			await act(async () => {
				await result.current.trackActivity("lesson_completed", {
					lessonId: "lesson-1",
					score: 85,
				});
			});

			expect(result.current.achievements).toContain(mockAchievement);
			expect(mockToast).toHaveBeenCalledWith({
				title: "🎉 Achievement Unlocked!",
				description: "First Lesson",
			});
		});

		it("should handle progress updates from activity tracking", async () => {
			mockAchievementService.trackActivity.mockResolvedValue({
				success: true,
				data: {
					unlockedAchievements: [],
					progressUpdates: [
						{
							achievementId: "achievement-1",
							current: 5,
							target: 10,
							percentage: 50,
						},
					],
				},
				status: 200,
			});

			const { result } = renderHook(() => useAchievements());

			await act(async () => {
				await result.current.trackActivity("lesson_completed", {
					lessonId: "lesson-1",
					score: 85,
				});
			});

			const updatedAchievement = result.current.achievements.find(
				(a) => a.id === "achievement-1",
			);
			expect(updatedAchievement?.progress?.percentage).toBe(50);
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

			mockAchievementService.getAchievementCriteria.mockResolvedValue({
				success: true,
				data: mockCriteria,
				status: 200,
			});

			const { result } = renderHook(() => useAchievements());

			const criteria = await act(async () => {
				return await result.current.getAchievementCriteria("achievement-1");
			});

			expect(criteria).toEqual(mockCriteria);
		});

		it("should handle criteria fetch errors", async () => {
			mockAchievementService.getAchievementCriteria.mockResolvedValue({
				success: false,
				message: "Failed to get criteria",
				status: 500,
			});

			const { result } = renderHook(() => useAchievements());

			const criteria = await act(async () => {
				return await result.current.getAchievementCriteria("achievement-1");
			});

			expect(criteria).toEqual([]);
		});
	});

	describe("checkEligibility", () => {
		it("should check eligibility and update state", async () => {
			const mockEligibleAchievements = [mockAchievement];
			const mockRecentlyUnlocked = [mockAchievement];

			mockAchievementService.checkAchievementEligibility.mockResolvedValue({
				success: true,
				data: {
					eligibleAchievements: mockEligibleAchievements,
					recentlyUnlocked: mockRecentlyUnlocked,
				},
				status: 200,
			});

			const { result } = renderHook(() => useAchievements());

			await act(async () => {
				await result.current.checkEligibility();
			});

			expect(result.current.eligibleAchievements).toEqual(
				mockEligibleAchievements,
			);
			expect(result.current.recentlyUnlocked).toEqual(mockRecentlyUnlocked);
		});

		it("should show notifications for recently unlocked achievements", async () => {
			const mockRecentlyUnlocked = [mockAchievement];

			mockAchievementService.checkAchievementEligibility.mockResolvedValue({
				success: true,
				data: {
					eligibleAchievements: [],
					recentlyUnlocked: mockRecentlyUnlocked,
				},
				status: 200,
			});

			const { result } = renderHook(() => useAchievements());

			await act(async () => {
				await result.current.checkEligibility();
			});

			expect(mockToast).toHaveBeenCalledWith({
				title: "🎉 Achievement Unlocked!",
				description: "First Lesson",
			});
		});
	});

	describe("getStats", () => {
		it("should fetch and update achievement stats", async () => {
			const mockStats = {
				totalAchievements: 50,
				unlockedAchievements: 15,
				totalXpEarned: 1250,
				rarityBreakdown: { common: 10, rare: 3, epic: 2, legendary: 0 },
				categoryBreakdown: { learning: 8, streak: 4, social: 2, special: 1 },
			};

			mockAchievementService.getAchievementStats.mockResolvedValue({
				success: true,
				data: mockStats,
				status: 200,
			});

			const { result } = renderHook(() => useAchievements());

			await act(async () => {
				await result.current.getStats();
			});

			expect(result.current.stats).toEqual(mockStats);
		});
	});

	describe("getLeaderboard", () => {
		it("should fetch leaderboard successfully", async () => {
			const mockLeaderboard = [
				{
					rank: 1,
					user: { id: "user-1", username: "topUser" },
					achievements: 25,
					xp: 5000,
				},
			];

			mockAchievementService.getAchievementLeaderboard.mockResolvedValue({
				success: true,
				data: mockLeaderboard,
				status: 200,
			});

			const { result } = renderHook(() => useAchievements());

			await act(async () => {
				await result.current.getLeaderboard("all-time");
			});

			expect(result.current.leaderboard).toEqual(mockLeaderboard);
			expect(result.current.loading).toBe(false);
		});

		it("should handle leaderboard fetch errors", async () => {
			mockAchievementService.getAchievementLeaderboard.mockResolvedValue({
				success: false,
				message: "Failed to get leaderboard",
				status: 500,
			});

			const { result } = renderHook(() => useAchievements());

			await act(async () => {
				await result.current.getLeaderboard("all-time");
			});

			expect(result.current.error).toBe("Failed to get leaderboard");
			expect(result.current.loading).toBe(false);
		});
	});

	describe("shareAchievement", () => {
		it("should share achievement successfully", async () => {
			const mockShareResponse = {
				shareUrl: "https://example.com/share/achievement-1",
				message: "Achievement shared successfully",
			};

			mockAchievementService.shareAchievement.mockResolvedValue({
				success: true,
				data: mockShareResponse,
				status: 200,
			});

			const { result } = renderHook(() => useAchievements());

			await act(async () => {
				await result.current.shareAchievement("achievement-1", "linkedin");
			});

			expect(window.open).toHaveBeenCalledWith(
				"https://example.com/share/achievement-1",
				"_blank",
			);
			expect(mockToast).toHaveBeenCalledWith({
				title: "Shared!",
				description: "Achievement shared successfully",
			});
		});

		it("should handle share errors", async () => {
			mockAchievementService.shareAchievement.mockResolvedValue({
				success: false,
				message: "Failed to share achievement",
				status: 500,
			});

			const { result } = renderHook(() => useAchievements());

			await act(async () => {
				await result.current.shareAchievement("achievement-1", "linkedin");
			});

			expect(mockToast).toHaveBeenCalledWith({
				title: "Error",
				description: "Failed to share achievement",
				variant: "destructive",
			});
		});
	});

	describe("clearError", () => {
		it("should clear error state", async () => {
			mockAchievementService.getUserAchievements.mockResolvedValue({
				success: false,
				message: "Test error",
				status: 500,
			});

			const { result } = renderHook(() => useAchievements());

			// Trigger an error
			await act(async () => {
				await result.current.refreshAchievements();
			});

			expect(result.current.error).toBe("Test error");

			// Clear the error
			act(() => {
				result.current.clearError();
			});

			expect(result.current.error).toBe(null);
		});
	});
});
