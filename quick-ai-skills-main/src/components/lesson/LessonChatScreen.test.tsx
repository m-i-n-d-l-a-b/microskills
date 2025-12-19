import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LessonChatScreen } from "./LessonChatScreen";

// Mock the UI components
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

vi.mock("@/components/ui/textarea", () => ({
	Textarea: ({ value, onChange, ...props }: any) => (
		<textarea
			value={value}
			onChange={onChange}
			{...props}
			data-testid="textarea"
		/>
	),
}));

vi.mock("@/components/ui/progress", () => ({
	Progress: ({ value, ...props }: any) => (
		<div {...props} data-testid="progress" data-value={value}>
			Progress: {value}%
		</div>
	),
}));

vi.mock("@/components/ui/badge", () => ({
	Badge: ({ children, ...props }: any) => (
		<span {...props} data-testid="badge">
			{children}
		</span>
	),
}));

vi.mock("@/components/ui/avatar", () => ({
	Avatar: ({ children, ...props }: any) => (
		<div {...props} data-testid="avatar">
			{children}
		</div>
	),
	AvatarFallback: ({ children, ...props }: any) => (
		<div {...props} data-testid="avatar-fallback">
			{children}
		</div>
	),
	AvatarImage: ({ ...props }: any) => (
		<img {...props} data-testid="avatar-image" alt="" />
	),
}));

vi.mock("@/components/lesson/QuickActionToolbar", () => ({
	QuickActionToolbar: ({ onAction }: any) => (
		<div data-testid="quick-action-toolbar">
			<button type="button" onClick={() => onAction("hint")}>
				Hint
			</button>
			<button type="button" onClick={() => onAction("explain")}>
				Explain
			</button>
			<button type="button" onClick={() => onAction("example")}>
				Example
			</button>
		</div>
	),
}));

vi.mock("lucide-react", () => ({
	Send: () => <div data-testid="send-icon">📤</div>,
	ArrowLeft: () => <div data-testid="arrow-left-icon">←</div>,
	BookOpen: () => <div data-testid="book-open-icon">📖</div>,
	MessageSquare: () => <div data-testid="message-square-icon">💬</div>,
	CheckCircle: () => <div data-testid="check-circle-icon">✅</div>,
	Clock: () => <div data-testid="clock-icon">⏰</div>,
	Target: () => <div data-testid="target-icon">🎯</div>,
	Lightbulb: () => <div data-testid="lightbulb-icon">💡</div>,
}));

// Mock the hooks
vi.mock("@/hooks/useLessons", () => ({
	useLessons: () => ({
		getDailyLesson: vi.fn(),
		submitQuiz: vi.fn(),
		switchTone: vi.fn(),
	}),
}));

vi.mock("@/hooks/useAnalytics", () => ({
	useAnalytics: () => ({
		track: vi.fn(),
	}),
	ANALYTICS_EVENTS: {
		LESSON_STARTED: "lesson_started",
		LESSON_COMPLETED: "lesson_completed",
		QUIZ_SUBMITTED: "quiz_submitted",
		MESSAGE_SENT: "message_sent",
	},
}));

vi.mock("@/hooks/useLessonProgress", () => ({
	useLessonProgress: () => ({
		getProgress: vi.fn(() => ({ completed: 0, total: 5 })),
		updateProgress: vi.fn(),
		markCompleted: vi.fn(),
	}),
}));

describe("LessonChatScreen", () => {
	const defaultProps = {
		lessonId: "test-lesson-1",
		lessonTitle: "Test Lesson",
		stepNumber: 1,
		totalSteps: 5,
		onComplete: vi.fn(),
		onBack: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("renders lesson header with title and progress", () => {
			render(<LessonChatScreen {...defaultProps} />);

			expect(screen.getByText("Test Lesson")).toBeInTheDocument();
			expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
			expect(screen.getByTestId("progress")).toBeInTheDocument();
		});

		it("renders back button", () => {
			render(<LessonChatScreen {...defaultProps} />);

			expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
			expect(screen.getByTestId("arrow-left-icon")).toBeInTheDocument();
		});

		it("renders chat interface", () => {
			render(<LessonChatScreen {...defaultProps} />);

			expect(screen.getByTestId("textarea")).toBeInTheDocument();
			expect(screen.getByTestId("button")).toBeInTheDocument();
			expect(screen.getByText("Send")).toBeInTheDocument();
		});

		it("renders quick action toolbar", () => {
			render(<LessonChatScreen {...defaultProps} />);

			expect(screen.getByTestId("quick-action-toolbar")).toBeInTheDocument();
			expect(screen.getByText("Hint")).toBeInTheDocument();
			expect(screen.getByText("Explain")).toBeInTheDocument();
			expect(screen.getByText("Example")).toBeInTheDocument();
		});

		it("renders lesson info card", () => {
			render(<LessonChatScreen {...defaultProps} />);

			expect(screen.getByText("Lesson Overview")).toBeInTheDocument();
			expect(screen.getByText("test-lesson-1")).toBeInTheDocument();
		});
	});

	describe("Progress Tracking", () => {
		it("displays correct progress percentage", () => {
			render(<LessonChatScreen {...defaultProps} />);

			const progress = screen.getByTestId("progress");
			expect(progress).toHaveAttribute("data-value", "20"); // 1/5 = 20%
		});

		it("updates progress when step changes", () => {
			const { rerender } = render(
				<LessonChatScreen {...defaultProps} stepNumber={3} />,
			);

			let progress = screen.getByTestId("progress");
			expect(progress).toHaveAttribute("data-value", "60"); // 3/5 = 60%

			rerender(<LessonChatScreen {...defaultProps} stepNumber={5} />);

			progress = screen.getByTestId("progress");
			expect(progress).toHaveAttribute("data-value", "100"); // 5/5 = 100%
		});

		it("shows completion state when all steps are done", () => {
			render(
				<LessonChatScreen {...defaultProps} stepNumber={5} totalSteps={5} />,
			);

			expect(screen.getByText("Step 5 of 5")).toBeInTheDocument();
			expect(screen.getByTestId("progress")).toHaveAttribute(
				"data-value",
				"100",
			);
		});
	});

	describe("Navigation", () => {
		it("calls onBack when back button is clicked", () => {
			render(<LessonChatScreen {...defaultProps} />);

			const backButton = screen.getByText("Back to Dashboard");
			fireEvent.click(backButton);

			expect(defaultProps.onBack).toHaveBeenCalled();
		});

		it("tracks back navigation analytics", async () => {
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockTrack = vi.fn();
			vi.mocked(useAnalytics).mockReturnValue({ track: mockTrack });

			render(<LessonChatScreen {...defaultProps} />);

			const backButton = screen.getByText("Back to Dashboard");
			fireEvent.click(backButton);

			await waitFor(() => {
				expect(mockTrack).toHaveBeenCalledWith("lesson_navigation", {
					action: "back",
					lessonId: "test-lesson-1",
					stepNumber: 1,
				});
			});
		});
	});

	describe("Message Handling", () => {
		it("allows typing in textarea", () => {
			render(<LessonChatScreen {...defaultProps} />);

			const textarea = screen.getByTestId("textarea");
			fireEvent.change(textarea, { target: { value: "Hello, AI!" } });

			expect(textarea).toHaveValue("Hello, AI!");
		});

		it("sends message when send button is clicked", async () => {
			const { useLessons } = await import("@/hooks/useLessons");
			const mockSubmitQuiz = vi.fn();
			vi.mocked(useLessons).mockReturnValue({
				getDailyLesson: vi.fn(),
				submitQuiz: mockSubmitQuiz,
				switchTone: vi.fn(),
			});

			render(<LessonChatScreen {...defaultProps} />);

			const textarea = screen.getByTestId("textarea");
			const sendButton = screen.getByText("Send");

			fireEvent.change(textarea, { target: { value: "Test message" } });
			fireEvent.click(sendButton);

			await waitFor(() => {
				expect(mockSubmitQuiz).toHaveBeenCalledWith({
					lessonId: "test-lesson-1",
					message: "Test message",
					stepNumber: 1,
				});
			});
		});

		it("sends message when Enter key is pressed", async () => {
			const { useLessons } = await import("@/hooks/useLessons");
			const mockSubmitQuiz = vi.fn();
			vi.mocked(useLessons).mockReturnValue({
				getDailyLesson: vi.fn(),
				submitQuiz: mockSubmitQuiz,
				switchTone: vi.fn(),
			});

			render(<LessonChatScreen {...defaultProps} />);

			const textarea = screen.getByTestId("textarea");
			fireEvent.change(textarea, { target: { value: "Test message" } });
			fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

			await waitFor(() => {
				expect(mockSubmitQuiz).toHaveBeenCalledWith({
					lessonId: "test-lesson-1",
					message: "Test message",
					stepNumber: 1,
				});
			});
		});

		it("clears textarea after sending message", async () => {
			const { useLessons } = await import("@/hooks/useLessons");
			const mockSubmitQuiz = vi.fn();
			vi.mocked(useLessons).mockReturnValue({
				getDailyLesson: vi.fn(),
				submitQuiz: mockSubmitQuiz,
				switchTone: vi.fn(),
			});

			render(<LessonChatScreen {...defaultProps} />);

			const textarea = screen.getByTestId("textarea");
			const sendButton = screen.getByText("Send");

			fireEvent.change(textarea, { target: { value: "Test message" } });
			fireEvent.click(sendButton);

			await waitFor(() => {
				expect(textarea).toHaveValue("");
			});
		});

		it("tracks message sent analytics", async () => {
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockTrack = vi.fn();
			vi.mocked(useAnalytics).mockReturnValue({ track: mockTrack });

			const { useLessons } = await import("@/hooks/useLessons");
			const mockSubmitQuiz = vi.fn();
			vi.mocked(useLessons).mockReturnValue({
				getDailyLesson: vi.fn(),
				submitQuiz: mockSubmitQuiz,
				switchTone: vi.fn(),
			});

			render(<LessonChatScreen {...defaultProps} />);

			const textarea = screen.getByTestId("textarea");
			const sendButton = screen.getByText("Send");

			fireEvent.change(textarea, { target: { value: "Test message" } });
			fireEvent.click(sendButton);

			await waitFor(() => {
				expect(mockTrack).toHaveBeenCalledWith("message_sent", {
					lessonId: "test-lesson-1",
					stepNumber: 1,
					messageLength: 12,
				});
			});
		});
	});

	describe("Quick Actions", () => {
		it("handles hint action", async () => {
			const { useLessons } = await import("@/hooks/useLessons");
			const mockSubmitQuiz = vi.fn();
			vi.mocked(useLessons).mockReturnValue({
				getDailyLesson: vi.fn(),
				submitQuiz: mockSubmitQuiz,
				switchTone: vi.fn(),
			});

			render(<LessonChatScreen {...defaultProps} />);

			const hintButton = screen.getByText("Hint");
			fireEvent.click(hintButton);

			await waitFor(() => {
				expect(mockSubmitQuiz).toHaveBeenCalledWith({
					lessonId: "test-lesson-1",
					message: "Can you give me a hint?",
					stepNumber: 1,
				});
			});
		});

		it("handles explain action", async () => {
			const { useLessons } = await import("@/hooks/useLessons");
			const mockSubmitQuiz = vi.fn();
			vi.mocked(useLessons).mockReturnValue({
				getDailyLesson: vi.fn(),
				submitQuiz: mockSubmitQuiz,
				switchTone: vi.fn(),
			});

			render(<LessonChatScreen {...defaultProps} />);

			const explainButton = screen.getByText("Explain");
			fireEvent.click(explainButton);

			await waitFor(() => {
				expect(mockSubmitQuiz).toHaveBeenCalledWith({
					lessonId: "test-lesson-1",
					message: "Can you explain this concept in more detail?",
					stepNumber: 1,
				});
			});
		});

		it("handles example action", async () => {
			const { useLessons } = await import("@/hooks/useLessons");
			const mockSubmitQuiz = vi.fn();
			vi.mocked(useLessons).mockReturnValue({
				getDailyLesson: vi.fn(),
				submitQuiz: mockSubmitQuiz,
				switchTone: vi.fn(),
			});

			render(<LessonChatScreen {...defaultProps} />);

			const exampleButton = screen.getByText("Example");
			fireEvent.click(exampleButton);

			await waitFor(() => {
				expect(mockSubmitQuiz).toHaveBeenCalledWith({
					lessonId: "test-lesson-1",
					message: "Can you provide an example?",
					stepNumber: 1,
				});
			});
		});
	});

	describe("Lesson Completion", () => {
		it("calls onComplete when lesson is finished", async () => {
			const { useLessons } = await import("@/hooks/useLessons");
			const mockSubmitQuiz = vi.fn().mockResolvedValue({
				isComplete: true,
				feedback: "Great job!",
				nextStep: null,
			});
			vi.mocked(useLessons).mockReturnValue({
				getDailyLesson: vi.fn(),
				submitQuiz: mockSubmitQuiz,
				switchTone: vi.fn(),
			});

			render(
				<LessonChatScreen {...defaultProps} stepNumber={5} totalSteps={5} />,
			);

			const textarea = screen.getByTestId("textarea");
			const sendButton = screen.getByText("Send");

			fireEvent.change(textarea, { target: { value: "Final answer" } });
			fireEvent.click(sendButton);

			await waitFor(() => {
				expect(defaultProps.onComplete).toHaveBeenCalledWith({
					lessonId: "test-lesson-1",
					completed: true,
					score: expect.any(Number),
				});
			});
		});

		it("tracks lesson completion analytics", async () => {
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockTrack = vi.fn();
			vi.mocked(useAnalytics).mockReturnValue({ track: mockTrack });

			const { useLessons } = await import("@/hooks/useLessons");
			const mockSubmitQuiz = vi.fn().mockResolvedValue({
				isComplete: true,
				feedback: "Great job!",
				nextStep: null,
			});
			vi.mocked(useLessons).mockReturnValue({
				getDailyLesson: vi.fn(),
				submitQuiz: mockSubmitQuiz,
				switchTone: vi.fn(),
			});

			render(
				<LessonChatScreen {...defaultProps} stepNumber={5} totalSteps={5} />,
			);

			const textarea = screen.getByTestId("textarea");
			const sendButton = screen.getByText("Send");

			fireEvent.change(textarea, { target: { value: "Final answer" } });
			fireEvent.click(sendButton);

			await waitFor(() => {
				expect(mockTrack).toHaveBeenCalledWith("lesson_completed", {
					lessonId: "test-lesson-1",
					stepNumber: 5,
					totalSteps: 5,
				});
			});
		});
	});

	describe("Error Handling", () => {
		it("handles submission errors gracefully", async () => {
			const { useLessons } = await import("@/hooks/useLessons");
			const mockSubmitQuiz = vi
				.fn()
				.mockRejectedValue(new Error("Network error"));
			vi.mocked(useLessons).mockReturnValue({
				getDailyLesson: vi.fn(),
				submitQuiz: mockSubmitQuiz,
				switchTone: vi.fn(),
			});

			render(<LessonChatScreen {...defaultProps} />);

			const textarea = screen.getByTestId("textarea");
			const sendButton = screen.getByText("Send");

			fireEvent.change(textarea, { target: { value: "Test message" } });
			fireEvent.click(sendButton);

			await waitFor(() => {
				expect(
					screen.getByText("Error sending message. Please try again."),
				).toBeInTheDocument();
			});
		});

		it("disables send button during submission", async () => {
			const { useLessons } = await import("@/hooks/useLessons");
			const mockSubmitQuiz = vi
				.fn()
				.mockImplementation(
					() => new Promise((resolve) => setTimeout(resolve, 100)),
				);
			vi.mocked(useLessons).mockReturnValue({
				getDailyLesson: vi.fn(),
				submitQuiz: mockSubmitQuiz,
				switchTone: vi.fn(),
			});

			render(<LessonChatScreen {...defaultProps} />);

			const textarea = screen.getByTestId("textarea");
			const sendButton = screen.getByText("Send");

			fireEvent.change(textarea, { target: { value: "Test message" } });
			fireEvent.click(sendButton);

			expect(sendButton).toBeDisabled();
			expect(sendButton).toHaveTextContent("Sending...");
		});
	});

	describe("Accessibility", () => {
		it("has proper ARIA labels", () => {
			render(<LessonChatScreen {...defaultProps} />);

			const textarea = screen.getByTestId("textarea");
			const sendButton = screen.getByText("Send");

			expect(textarea).toHaveAttribute("aria-label", "Type your message");
			expect(sendButton).toHaveAttribute("aria-label", "Send message");
		});

		it("has proper keyboard navigation", () => {
			render(<LessonChatScreen {...defaultProps} />);

			const textarea = screen.getByTestId("textarea");
			const sendButton = screen.getByText("Send");

			// Tab navigation should work
			textarea.focus();
			expect(textarea).toHaveFocus();

			sendButton.focus();
			expect(sendButton).toHaveFocus();
		});
	});

	describe("Responsive Design", () => {
		it("adapts to mobile screen sizes", () => {
			// Mock window.innerWidth for mobile
			Object.defineProperty(window, "innerWidth", {
				writable: true,
				configurable: true,
				value: 375,
			});

			render(<LessonChatScreen {...defaultProps} />);

			// Should still render all essential elements
			expect(screen.getByText("Test Lesson")).toBeInTheDocument();
			expect(screen.getByTestId("textarea")).toBeInTheDocument();
			expect(screen.getByText("Send")).toBeInTheDocument();
		});
	});
});
