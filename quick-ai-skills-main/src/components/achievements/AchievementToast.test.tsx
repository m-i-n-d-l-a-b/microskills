import type React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AchievementToast, useAchievements } from "./AchievementToast";

// Mock the UI components
vi.mock("@/components/ui/toast", () => ({
	useToast: () => ({
		toast: vi.fn(),
	}),
}));

vi.mock("@/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		...props
	}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button onClick={onClick} {...props} data-testid="button">
			{children}
		</button>
	),
}));

vi.mock("@/components/ui/card", () => ({
	Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
		<div {...props} data-testid="card">
			{children}
		</div>
	),
	CardContent: ({
		children,
		...props
	}: React.HTMLAttributes<HTMLDivElement>) => (
		<div {...props} data-testid="card-content">
			{children}
		</div>
	),
}));

vi.mock("lucide-react", () => ({
	Trophy: () => <div data-testid="trophy-icon">🏆</div>,
	X: () => <div data-testid="x-icon">✕</div>,
	Sparkles: () => <div data-testid="sparkles-icon">✨</div>,
	Star: () => <div data-testid="star-icon">⭐</div>,
	Zap: () => <div data-testid="zap-icon">⚡</div>,
	Target: () => <div data-testid="target-icon">🎯</div>,
}));

// Mock the analytics hook
vi.mock("@/hooks/useAnalytics", () => ({
	useAnalytics: () => ({
		track: vi.fn(),
	}),
	ANALYTICS_EVENTS: {
		ACHIEVEMENT_UNLOCKED: "achievement_unlocked",
		ACHIEVEMENT_VIEWED: "achievement_viewed",
	},
}));

describe("AchievementToast", () => {
	const mockAchievement = {
		id: "test-achievement",
		title: "Test Achievement",
		description: "This is a test achievement",
		type: "completion" as const,
		rarity: "common" as const,
		icon: "trophy",
		color: "gold",
		points: 100,
	};

	const mockOnClose = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("renders achievement toast with basic information", () => {
			render(
				<AchievementToast
					achievement={mockAchievement}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByText("Test Achievement")).toBeInTheDocument();
			expect(
				screen.getByText("This is a test achievement"),
			).toBeInTheDocument();
			expect(screen.getByTestId("card")).toBeInTheDocument();
		});

		it("renders achievement icon based on type", () => {
			render(
				<AchievementToast
					achievement={mockAchievement}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByTestId("trophy-icon")).toBeInTheDocument();
		});

		it("renders different icons for different achievement types", () => {
			const speedAchievement = { ...mockAchievement, icon: "zap" };

			render(
				<AchievementToast
					achievement={speedAchievement}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByTestId("zap-icon")).toBeInTheDocument();
		});

		it("renders rarity badge", () => {
			render(
				<AchievementToast
					achievement={mockAchievement}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByText("common")).toBeInTheDocument();
		});

		it("renders points if available", () => {
			render(
				<AchievementToast
					achievement={mockAchievement}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByText("+100")).toBeInTheDocument();
		});

		it("does not render points if not available", () => {
			const achievementWithoutPoints = { ...mockAchievement };
			delete achievementWithoutPoints.points;

			render(
				<AchievementToast
					achievement={achievementWithoutPoints}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.queryByText("+100")).not.toBeInTheDocument();
		});
	});

	describe("Interaction", () => {
		it("calls onClose when close button is clicked", () => {
			render(
				<AchievementToast
					achievement={mockAchievement}
					onClose={mockOnClose}
				/>,
			);

			const closeButton = screen.getByTestId("button");
			fireEvent.click(closeButton);

			expect(mockOnClose).toHaveBeenCalledWith("test-achievement");
		});

		it("tracks achievement view analytics", async () => {
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockTrack = vi.fn();
			vi.mocked(useAnalytics).mockReturnValue({ track: mockTrack });

			render(
				<AchievementToast
					achievement={mockAchievement}
					onClose={mockOnClose}
				/>,
			);

			await waitFor(() => {
				expect(mockTrack).toHaveBeenCalledWith("achievement_viewed", {
					achievementId: "test-achievement",
					achievementTitle: "Test Achievement",
					achievementType: "completion",
					achievementRarity: "common",
				});
			});
		});
	});

	describe("Animation and Styling", () => {
		it("applies correct CSS classes for animation", () => {
			render(
				<AchievementToast
					achievement={mockAchievement}
					onClose={mockOnClose}
				/>,
			);

			const card = screen.getByTestId("card");
			expect(card).toHaveClass("animate-slide-in");
		});

		it("applies correct color classes based on achievement color", () => {
			render(
				<AchievementToast
					achievement={mockAchievement}
					onClose={mockOnClose}
				/>,
			);

			const card = screen.getByTestId("card");
			expect(card).toHaveClass("border-gold");
		});

		it("applies different colors for different achievement types", () => {
			const rareAchievement = { ...mockAchievement, color: "purple" };

			render(
				<AchievementToast
					achievement={rareAchievement}
					onClose={mockOnClose}
				/>,
			);

			const card = screen.getByTestId("card");
			expect(card).toHaveClass("border-purple");
		});
	});

	describe("Rarity Styling", () => {
		it("applies correct styling for common rarity", () => {
			render(
				<AchievementToast
					achievement={mockAchievement}
					onClose={mockOnClose}
				/>,
			);

			const rarityBadge = screen.getByText("common");
			expect(rarityBadge).toHaveClass("bg-gray-100", "text-gray-800");
		});

		it("applies correct styling for rare rarity", () => {
			const rareAchievement = { ...mockAchievement, rarity: "rare" as const };

			render(
				<AchievementToast
					achievement={rareAchievement}
					onClose={mockOnClose}
				/>,
			);

			const rarityBadge = screen.getByText("rare");
			expect(rarityBadge).toHaveClass("bg-blue-100", "text-blue-800");
		});

		it("applies correct styling for epic rarity", () => {
			const epicAchievement = { ...mockAchievement, rarity: "epic" as const };

			render(
				<AchievementToast
					achievement={epicAchievement}
					onClose={mockOnClose}
				/>,
			);

			const rarityBadge = screen.getByText("epic");
			expect(rarityBadge).toHaveClass("bg-purple-100", "text-purple-800");
		});

		it("applies correct styling for legendary rarity", () => {
			const legendaryAchievement = {
				...mockAchievement,
				rarity: "legendary" as const,
			};

			render(
				<AchievementToast
					achievement={legendaryAchievement}
					onClose={mockOnClose}
				/>,
			);

			const rarityBadge = screen.getByText("legendary");
			expect(rarityBadge).toHaveClass("bg-orange-100", "text-orange-800");
		});
	});

	describe("Icon Mapping", () => {
		it("maps trophy icon correctly", () => {
			render(
				<AchievementToast
					achievement={mockAchievement}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByTestId("trophy-icon")).toBeInTheDocument();
		});

		it("maps sparkles icon correctly", () => {
			const sparklesAchievement = { ...mockAchievement, icon: "sparkles" };

			render(
				<AchievementToast
					achievement={sparklesAchievement}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByTestId("sparkles-icon")).toBeInTheDocument();
		});

		it("maps star icon correctly", () => {
			const starAchievement = { ...mockAchievement, icon: "star" };

			render(
				<AchievementToast
					achievement={starAchievement}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByTestId("star-icon")).toBeInTheDocument();
		});

		it("maps zap icon correctly", () => {
			const zapAchievement = { ...mockAchievement, icon: "zap" };

			render(
				<AchievementToast achievement={zapAchievement} onClose={mockOnClose} />,
			);

			expect(screen.getByTestId("zap-icon")).toBeInTheDocument();
		});

		it("maps target icon correctly", () => {
			const targetAchievement = { ...mockAchievement, icon: "target" };

			render(
				<AchievementToast
					achievement={targetAchievement}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByTestId("target-icon")).toBeInTheDocument();
		});

		it("defaults to trophy icon for unknown icon types", () => {
			const unknownIconAchievement = {
				...mockAchievement,
				icon: "unknown" as any,
			};

			render(
				<AchievementToast
					achievement={unknownIconAchievement}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByTestId("trophy-icon")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("has proper ARIA labels", () => {
			render(
				<AchievementToast
					achievement={mockAchievement}
					onClose={mockOnClose}
				/>,
			);

			const closeButton = screen.getByTestId("button");
			expect(closeButton).toHaveAttribute(
				"aria-label",
				"Close achievement toast",
			);
		});

		it("has proper role attributes", () => {
			render(
				<AchievementToast
					achievement={mockAchievement}
					onClose={mockOnClose}
				/>,
			);

			const card = screen.getByTestId("card");
			expect(card).toHaveAttribute("role", "alert");
		});
	});

	describe("useAchievements Hook", () => {
		it("provides achievement management functions", () => {
			const { achievements, triggerAchievement, removeAchievement } =
				useAchievements();

			expect(Array.isArray(achievements)).toBe(true);
			expect(typeof triggerAchievement).toBe("function");
			expect(typeof removeAchievement).toBe("function");
		});

		it("allows triggering new achievements", () => {
			const { triggerAchievement } = useAchievements();

			expect(() => {
				triggerAchievement({
					id: "new-achievement",
					title: "New Achievement",
					description: "A new achievement",
					type: "completion",
					rarity: "common",
				});
			}).not.toThrow();
		});

		it("allows removing achievements", () => {
			const { removeAchievement } = useAchievements();

			expect(() => {
				removeAchievement("test-achievement");
			}).not.toThrow();
		});
	});

	describe("Edge Cases", () => {
		it("handles achievement without description", () => {
			const achievementWithoutDescription = { ...mockAchievement };
			delete achievementWithoutDescription.description;

			render(
				<AchievementToast
					achievement={achievementWithoutDescription}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByText("Test Achievement")).toBeInTheDocument();
			expect(
				screen.queryByText("This is a test achievement"),
			).not.toBeInTheDocument();
		});

		it("handles achievement without rarity", () => {
			const achievementWithoutRarity = { ...mockAchievement };
			delete achievementWithoutRarity.rarity;

			render(
				<AchievementToast
					achievement={achievementWithoutRarity}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.queryByText("common")).not.toBeInTheDocument();
		});

		it("handles achievement without color", () => {
			const achievementWithoutColor = { ...mockAchievement };
			delete achievementWithoutColor.color;

			render(
				<AchievementToast
					achievement={achievementWithoutColor}
					onClose={mockOnClose}
				/>,
			);

			const card = screen.getByTestId("card");
			expect(card).not.toHaveClass("border-gold");
		});

		it("handles zero points", () => {
			const zeroPointsAchievement = { ...mockAchievement, points: 0 };

			render(
				<AchievementToast
					achievement={zeroPointsAchievement}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByText("+0")).toBeInTheDocument();
		});

		it("handles negative points", () => {
			const negativePointsAchievement = { ...mockAchievement, points: -50 };

			render(
				<AchievementToast
					achievement={negativePointsAchievement}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByText("-50")).toBeInTheDocument();
		});
	});
});
