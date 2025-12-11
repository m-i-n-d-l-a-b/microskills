import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Index from "./Index";

// Mock all the imported components and hooks
vi.mock("@/components/ui/button", () => ({
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props} data-testid="button">
			{children}
		</button>
	),
}));

vi.mock("@/components/ui/card", () => ({
	Card: ({ children, ...props }: any) => (
		<div {...props} data-testid="card">
			{children}
		</div>
	),
	CardContent: ({ children, ...props }: any) => (
		<div {...props} data-testid="card-content">
			{children}
		</div>
	),
	CardHeader: ({ children, ...props }: any) => (
		<div {...props} data-testid="card-header">
			{children}
		</div>
	),
	CardTitle: ({ children, ...props }: any) => (
		<h3 {...props} data-testid="card-title">
			{children}
		</h3>
	),
}));

vi.mock("@/components/ui/badge", () => ({
	Badge: ({ children, ...props }: any) => (
		<span {...props} data-testid="badge">
			{children}
		</span>
	),
}));

vi.mock("@/components/onboarding/OnboardingWizard", () => ({
	OnboardingWizard: ({ onComplete }: any) => (
		<div data-testid="onboarding-wizard">
			<button
				onClick={() =>
					onComplete({
						role: "Developer",
						timeCommit: 15,
						tone: "Professional",
						difficulty: "Intermediate",
					})
				}
			>
				Complete Onboarding
			</button>
		</div>
	),
}));

vi.mock("@/components/lesson/LessonChatScreen", () => ({
	LessonChatScreen: ({ onComplete, onBack }: any) => (
		<div data-testid="lesson-chat-screen">
			<button onClick={onComplete}>Complete Lesson</button>
			<button onClick={onBack}>Back to Dashboard</button>
		</div>
	),
}));

vi.mock("@/components/project/MiniProjectSandbox", () => ({
	MiniProjectSandbox: () => (
		<div data-testid="mini-project-sandbox">Project Sandbox</div>
	),
}));

vi.mock("@/components/admin/AdminAnalytics", () => ({
	AdminAnalytics: () => (
		<div data-testid="admin-analytics">Admin Analytics</div>
	),
}));

vi.mock("@/components/settings/NotificationPreferences", () => ({
	NotificationPreferences: () => (
		<div data-testid="notification-preferences">Notification Preferences</div>
	),
}));

vi.mock("@/components/badges/BadgeShareModal", () => ({
	BadgeShareModal: () => (
		<div data-testid="badge-share-modal">Badge Share Modal</div>
	),
}));

vi.mock("@/components/progress/StreakCounter", () => ({
	StreakCounter: ({ streak, lastActive }: any) => (
		<div data-testid="streak-counter">
			Streak: {streak}, Last Active: {lastActive.toDateString()}
		</div>
	),
}));

vi.mock("@/components/progress/XPProgressBar", () => ({
	XPProgressBar: ({ currentXP, nextLevelXP, level }: any) => (
		<div data-testid="xp-progress-bar">
			XP: {currentXP}/{nextLevelXP}, Level: {level}
		</div>
	),
}));

vi.mock("@/components/leaderboard/Leaderboard", () => ({
	Leaderboard: ({ entries, currentUserId }: any) => (
		<div data-testid="leaderboard">
			Leaderboard with {entries.length} entries, Current User: {currentUserId}
		</div>
	),
}));

vi.mock("@/components/achievements/AchievementToast", () => ({
	AchievementToast: ({ achievement, onClose }: any) => (
		<div data-testid="achievement-toast">
			Achievement: {achievement.title}
			<button onClick={onClose}>Close</button>
		</div>
	),
	useAchievements: () => ({
		achievements: [
			{
				id: "test-1",
				title: "Test Achievement 1",
				description: "Test Description 1",
			},
			{
				id: "test-2",
				title: "Test Achievement 2",
				description: "Test Description 2",
			},
		],
		triggerAchievement: vi.fn(),
		removeAchievement: vi.fn(),
	}),
}));

vi.mock("@/components/ui/error-boundary", () => ({
	RouteErrorBoundary: ({ children }: any) => (
		<div data-testid="route-error-boundary">{children}</div>
	),
}));

vi.mock("@/hooks/useAnalytics", () => ({
	useAnalytics: () => ({
		track: vi.fn(),
	}),
	ANALYTICS_EVENTS: {
		ONBOARDING_COMPLETED: "onboarding_completed",
		LESSON_STARTED: "lesson_started",
	},
}));

vi.mock("@/hooks/useSpacedRepetition", () => ({
	useSpacedRepetition: () => ({
		getRecommendedLessons: vi.fn(),
	}),
}));

vi.mock("@/hooks/useAchievements", () => ({
	useAchievements: () => ({
		achievements: [
			{
				id: "test-1",
				title: "Test Achievement 1",
				description: "Test Description 1",
			},
			{
				id: "test-2",
				title: "Test Achievement 2",
				description: "Test Description 2",
			},
		],
		triggerAchievement: vi.fn(),
		removeAchievement: vi.fn(),
	}),
}));

// Mock the hero image
vi.mock("@/assets/hero-learning.jpg", () => "mocked-hero-image.jpg");

describe("Index", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Onboarding State", () => {
		it("renders onboarding wizard when not onboarded", () => {
			render(<Index />);
			expect(screen.getByTestId("onboarding-wizard")).toBeInTheDocument();
		});

		it("handles onboarding completion", async () => {
			render(<Index />);

			const completeButton = screen.getByText("Complete Onboarding");
			fireEvent.click(completeButton);

			await waitFor(() => {
				expect(screen.getByTestId("route-error-boundary")).toBeInTheDocument();
			});
		});

		it("tracks onboarding completion analytics", async () => {
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockTrack = vi.fn();
			vi.mocked(useAnalytics).mockReturnValue({ track: mockTrack });

			render(<Index />);

			const completeButton = screen.getByText("Complete Onboarding");
			fireEvent.click(completeButton);

			await waitFor(() => {
				expect(mockTrack).toHaveBeenCalledWith("onboarding_completed", {
					role: "Developer",
					timeCommit: 15,
					tone: "Professional",
					difficulty: "Intermediate",
				});
			});
		});
	});

	describe("Main Dashboard", () => {
		const renderOnboarded = () => {
			const component = render(<Index />);
			const completeButton = screen.getByText("Complete Onboarding");
			fireEvent.click(completeButton);
			return component;
		};

		it("renders main dashboard after onboarding", async () => {
			renderOnboarded();

			await waitFor(() => {
				expect(screen.getByText("AI Skills")).toBeInTheDocument();
				expect(screen.getByText("Master AI Skills in")).toBeInTheDocument();
				expect(screen.getByText("5 Minutes")).toBeInTheDocument();
			});
		});

		it("renders user role badge", async () => {
			renderOnboarded();

			await waitFor(() => {
				expect(screen.getByText("Developer")).toBeInTheDocument();
			});
		});

		it("renders navigation buttons", async () => {
			renderOnboarded();

			await waitFor(() => {
				expect(screen.getByText("Leaderboard")).toBeInTheDocument();
				expect(screen.getByText("Settings")).toBeInTheDocument();
			});
		});

		it("renders progress components", async () => {
			renderOnboarded();

			await waitFor(() => {
				expect(screen.getByTestId("streak-counter")).toBeInTheDocument();
				expect(screen.getByTestId("xp-progress-bar")).toBeInTheDocument();
			});
		});

		it("renders achievement toasts", async () => {
			renderOnboarded();

			await waitFor(() => {
				const achievementToasts = screen.getAllByTestId("achievement-toast");
				expect(achievementToasts).toHaveLength(2);
				expect(screen.getByText("Test Achievement 1")).toBeInTheDocument();
				expect(screen.getByText("Test Achievement 2")).toBeInTheDocument();
			});
		});

		it("renders quick stats cards", async () => {
			renderOnboarded();

			await waitFor(() => {
				const cards = screen.getAllByTestId("card");
				expect(cards.length).toBeGreaterThan(0);
				expect(screen.getByText("Lessons Complete")).toBeInTheDocument();
				expect(screen.getByText("Badges Earned")).toBeInTheDocument();
				expect(screen.getByText("Quiz Average")).toBeInTheDocument();
			});
		});

		it("renders today's lesson preview", async () => {
			renderOnboarded();

			await waitFor(() => {
				expect(
					screen.getByText("Today's Lesson: Prompt Engineering"),
				).toBeInTheDocument();
				expect(screen.getByText("Start Lesson")).toBeInTheDocument();
			});
		});
	});

	describe("Lesson State", () => {
		const renderInLesson = async () => {
			const component = render(<Index />);
			const completeButton = screen.getByText("Complete Onboarding");
			fireEvent.click(completeButton);

			await waitFor(() => {
				const startLessonButton = screen.getByText("Start Lesson");
				fireEvent.click(startLessonButton);
			});

			return component;
		};

		it("transitions to lesson state when start lesson is clicked", async () => {
			await renderInLesson();

			await waitFor(() => {
				expect(screen.getByTestId("lesson-chat-screen")).toBeInTheDocument();
			});
		});

		it("tracks lesson start analytics", async () => {
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockTrack = vi.fn();
			vi.mocked(useAnalytics).mockReturnValue({ track: mockTrack });

			await renderInLesson();

			await waitFor(() => {
				expect(mockTrack).toHaveBeenCalledWith("lesson_started", {
					source: "dashboard",
				});
			});
		});

		it("handles lesson completion", async () => {
			await renderInLesson();

			await waitFor(() => {
				const completeButton = screen.getByText("Complete Lesson");
				fireEvent.click(completeButton);
			});

			await waitFor(() => {
				expect(screen.getByText("AI Skills")).toBeInTheDocument();
			});
		});

		it("handles back from lesson", async () => {
			await renderInLesson();

			await waitFor(() => {
				const backButton = screen.getByText("Back to Dashboard");
				fireEvent.click(backButton);
			});

			await waitFor(() => {
				expect(screen.getByText("AI Skills")).toBeInTheDocument();
			});
		});
	});

	describe("Leaderboard State", () => {
		const renderLeaderboard = async () => {
			const component = render(<Index />);
			const completeButton = screen.getByText("Complete Onboarding");
			fireEvent.click(completeButton);

			await waitFor(() => {
				const leaderboardButton = screen.getByText("Leaderboard");
				fireEvent.click(leaderboardButton);
			});

			return component;
		};

		it("transitions to leaderboard state", async () => {
			await renderLeaderboard();

			await waitFor(() => {
				expect(screen.getByTestId("leaderboard")).toBeInTheDocument();
				expect(screen.getByText("Leaderboard")).toBeInTheDocument();
			});
		});

		it("handles back from leaderboard", async () => {
			await renderLeaderboard();

			await waitFor(() => {
				const backButton = screen.getByText("← Back to Dashboard");
				fireEvent.click(backButton);
			});

			await waitFor(() => {
				expect(screen.getByText("AI Skills")).toBeInTheDocument();
			});
		});
	});

	describe("Settings State", () => {
		const renderSettings = async () => {
			const component = render(<Index />);
			const completeButton = screen.getByText("Complete Onboarding");
			fireEvent.click(completeButton);

			await waitFor(() => {
				const settingsButton = screen.getByText("Settings");
				fireEvent.click(settingsButton);
			});

			return component;
		};

		it("transitions to settings state", async () => {
			await renderSettings();

			await waitFor(() => {
				expect(
					screen.getByTestId("notification-preferences"),
				).toBeInTheDocument();
			});
		});
	});

	describe("Error Boundary Integration", () => {
		it("wraps main content in route error boundary", async () => {
			const component = render(<Index />);
			const completeButton = screen.getByText("Complete Onboarding");
			fireEvent.click(completeButton);

			await waitFor(() => {
				expect(screen.getByTestId("route-error-boundary")).toBeInTheDocument();
			});
		});

		it("wraps leaderboard in route error boundary", async () => {
			const component = render(<Index />);
			const completeButton = screen.getByText("Complete Onboarding");
			fireEvent.click(completeButton);

			await waitFor(() => {
				const leaderboardButton = screen.getByText("Leaderboard");
				fireEvent.click(leaderboardButton);
			});

			await waitFor(() => {
				expect(screen.getByTestId("route-error-boundary")).toBeInTheDocument();
			});
		});
	});

	describe("User Data and Progress", () => {
		it("displays user progress data correctly", async () => {
			const component = render(<Index />);
			const completeButton = screen.getByText("Complete Onboarding");
			fireEvent.click(completeButton);

			await waitFor(() => {
				expect(screen.getByText("15 min/day")).toBeInTheDocument();
				expect(screen.getByText("24 lessons completed")).toBeInTheDocument();
			});
		});

		it("displays streak and XP information", async () => {
			const component = render(<Index />);
			const completeButton = screen.getByText("Complete Onboarding");
			fireEvent.click(completeButton);

			await waitFor(() => {
				expect(screen.getByText(/Streak: 7/)).toBeInTheDocument();
				expect(screen.getByText(/XP: 2450\/3000/)).toBeInTheDocument();
				expect(screen.getByText(/Level: 12/)).toBeInTheDocument();
			});
		});
	});

	describe("Achievement System", () => {
		it("triggers welcome achievement on onboarding completion", async () => {
			const { useAchievements } = await import("@/hooks/useAchievements");
			const mockTriggerAchievement = vi.fn();
			vi.mocked(useAchievements).mockReturnValue({
				achievements: [],
				triggerAchievement: mockTriggerAchievement,
				removeAchievement: vi.fn(),
			});

			render(<Index />);
			const completeButton = screen.getByText("Complete Onboarding");
			fireEvent.click(completeButton);

			await waitFor(() => {
				expect(mockTriggerAchievement).toHaveBeenCalledWith({
					id: "welcome",
					title: "Welcome Aboard!",
					description: "You've completed onboarding and are ready to learn!",
					type: "completion",
					rarity: "common",
				});
			});
		});

		it("allows closing achievement toasts", async () => {
			const { useAchievements } = await import("@/hooks/useAchievements");
			const mockRemoveAchievement = vi.fn();
			vi.mocked(useAchievements).mockReturnValue({
				achievements: [
					{ id: "test-1", title: "Test Achievement", description: "Test" },
				],
				triggerAchievement: vi.fn(),
				removeAchievement: mockRemoveAchievement,
			});

			const component = render(<Index />);
			const completeButton = screen.getByText("Complete Onboarding");
			fireEvent.click(completeButton);

			await waitFor(() => {
				const closeButton = screen.getByText("Close");
				fireEvent.click(closeButton);
				expect(mockRemoveAchievement).toHaveBeenCalledWith("test-1");
			});
		});
	});
});
