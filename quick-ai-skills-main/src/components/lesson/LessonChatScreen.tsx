import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Bot,
	User,
	Send,
	Volume2,
	Lightbulb,
	Zap,
	ArrowLeft,
} from "lucide-react";
import { QuickActionToolbar } from "./QuickActionToolbar";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { ChatBubbleSkeleton } from "@/components/ui/loading-skeleton";
import { useAnalytics, ANALYTICS_EVENTS } from "@/hooks/useAnalytics";
import { useLessons } from "@/hooks/useLessons";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Lesson, QuizSubmission, QuizResult } from "@/types/api";

type QuizQuestion = {
	id: string;
	question?: string;
	type?: string;
	options?: string[];
};

type QuizFeedback = {
	correct?: boolean;
	explanation?: string;
};

type LessonProgress = Record<
	string,
	{
		lastMessage?: string;
		timestamp?: string;
		stepNumber?: number;
		completed?: boolean;
	}
>;

interface ChatMessage {
	id: string;
	type: "ai" | "user" | "quiz";
	content: string;
	timestamp: Date;
	isCode?: boolean;
	quickReplies?: string[];
	quiz?: {
		id: string;
		questions: QuizQuestion[];
		timeLimit?: number;
		passingScore: number;
	};
	quizResult?: {
		score: number;
		percentage: number;
		passed: boolean;
		feedback: QuizFeedback[];
	};
}

interface LessonChatScreenProps {
	lessonId: string;
	lessonTitle: string;
	stepNumber: number;
	totalSteps: number;
	onComplete?: () => void;
	onBack?: () => void;
}

export const LessonChatScreen = ({
	lessonId,
	lessonTitle,
	stepNumber,
	totalSteps,
	onComplete,
	onBack,
}: LessonChatScreenProps) => {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [lessonProgress, setLessonProgress] = useLocalStorage<LessonProgress>(
		"lesson_progress",
		{},
	);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const { track } = useAnalytics();

	// Use real lesson data
	const {
		currentLesson,
		isLoading,
		error,
		isSubmitting,
		isStreaming,
		streamedContent,
		submitQuiz,
		switchTone,
		markLessonComplete,
		startLessonStream,
		stopLessonStream,
		clearError,
	} = useLessons();

	// Initialize lesson when data is loaded
	useEffect(() => {
		if (currentLesson && messages.length === 0) {
			const welcomeMessage: ChatMessage = {
				id: "1",
				type: "ai",
				content:
					currentLesson.description ||
					"Welcome to your AI lesson! Ready to dive in?",
				timestamp: new Date(),
				quickReplies: ["Let's start!", "Tell me more", "I'm ready"],
			};
			setMessages([welcomeMessage]);

			// Track lesson started
			track(ANALYTICS_EVENTS.LESSON_STARTED, {
				lessonId: currentLesson.id,
				lessonTitle: currentLesson.title,
				difficulty: currentLesson.difficulty,
				category: currentLesson.category,
			});
		}
	}, [currentLesson, messages.length, track]);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const handleSendMessage = async (content: string) => {
		if (!content.trim() || !currentLesson) return;

		const newUserMessage: ChatMessage = {
			id: Date.now().toString(),
			type: "user",
			content,
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, newUserMessage]);
		setInputValue("");
		setIsTyping(true);

		// Save progress
		setLessonProgress((prev) => ({
			...prev,
			[lessonId]: {
				...prev[lessonId],
				lastMessage: content,
				timestamp: new Date().toISOString(),
				stepNumber,
			},
		}));

		try {
			// Start real-time streaming for AI response
			const aiMessageId = (Date.now() + 1).toString();
			const aiMessage: ChatMessage = {
				id: aiMessageId,
				type: "ai",
				content: "",
				timestamp: new Date(),
			};

			setMessages((prev) => [...prev, aiMessage]);

			// Stream the AI response
			await startLessonStream(currentLesson.id, {
				onChunk: (chunk) => {
					setMessages((prev) =>
						prev.map((msg) =>
							msg.id === aiMessageId
								? { ...msg, content: msg.content + chunk }
								: msg,
						),
					);
				},
				onComplete: (data) => {
					// Add quick replies if not the final step
					setMessages((prev) =>
						prev.map((msg) =>
							msg.id === aiMessageId
								? {
										...msg,
										quickReplies:
											stepNumber < totalSteps
												? ["Continue", "Example please", "Got it!"]
												: undefined,
									}
								: msg,
						),
					);

					// If this is the final step, mark lesson as complete
					if (stepNumber >= totalSteps) {
						setTimeout(async () => {
							try {
								await markLessonComplete(currentLesson.id);
								onComplete?.();
							} catch (error) {
								console.error("Failed to mark lesson complete:", error);
							}
						}, 1000);
					}
				},
				onError: (error) => {
					console.error("Streaming error:", error);
					setMessages((prev) =>
						prev.map((msg) =>
							msg.id === aiMessageId
								? {
										...msg,
										content:
											"I apologize, but I'm having trouble processing your request right now. Please try again.",
									}
								: msg,
						),
					);
				},
			});
		} catch (error) {
			console.error("Failed to start lesson stream:", error);
			const errorMessage: ChatMessage = {
				id: (Date.now() + 1).toString(),
				type: "ai",
				content:
					"I apologize, but I'm having trouble processing your request right now. Please try again.",
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsTyping(false);
		}
	};

	// Cleanup streaming on unmount
	useEffect(() => {
		return () => {
			stopLessonStream();
		};
	}, [stopLessonStream]);

	const generateAIResponse = async (
		userInput: string,
		lesson: Lesson,
		currentStep: number,
	): Promise<{ content: string; quickReplies?: string[] }> => {
		// This would typically call an AI service to generate contextual responses
		// For now, we'll use the lesson content to generate appropriate responses

		const lessonSection = lesson.content.sections[currentStep - 1];
		if (lessonSection) {
			return {
				content: `Great question! ${lessonSection.content}`,
				quickReplies:
					currentStep < lesson.content.sections.length
						? ["Continue", "Example please", "Got it!"]
						: undefined,
			};
		}

		// Fallback response
		const responses = [
			`Great question! Let me break that down for you. ${lesson.description}`,
			"That's an excellent observation! Here's how we can build on that idea...",
			"Perfect! You're really getting the hang of this. Let's try something more advanced...",
		];

		return {
			content: responses[Math.floor(Math.random() * responses.length)],
			quickReplies:
				currentStep < totalSteps
					? ["Continue", "Example please", "Got it!"]
					: undefined,
		};
	};

	const handleQuickReply = (reply: string) => {
		handleSendMessage(reply);
	};

	const handleToneSwitch = async (newTone: string) => {
		if (!currentLesson) return;

		track(ANALYTICS_EVENTS.TONE_SWITCHED, {
			newTone,
			lessonId: currentLesson.id,
		});

		try {
			await switchTone(newTone, currentLesson.id);

			// Show immediate feedback
			const toneMessage: ChatMessage = {
				id: Date.now().toString(),
				type: "ai",
				content: `Great! I've switched to a ${newTone} tone. Let's continue with this style.`,
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, toneMessage]);
		} catch (error) {
			console.error("Failed to switch tone:", error);
			const errorMessage: ChatMessage = {
				id: Date.now().toString(),
				type: "ai",
				content:
					"I apologize, but I couldn't switch the tone right now. Let's continue with our current style.",
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, errorMessage]);
		}
	};

	const handleQuizSubmission = async (
		quizId: string,
		answers: Array<{ questionId: string; answer: string }>,
		timeSpent: number,
	) => {
		if (!currentLesson) return;

		try {
			const submission: QuizSubmission = {
				quizId,
				answers,
				timeSpent,
			};

			const result = await submitQuiz(submission);

			// Add quiz result message
			const resultMessage: ChatMessage = {
				id: Date.now().toString(),
				type: "quiz",
				content: `Quiz completed! You scored ${result.percentage}% and ${result.passed ? "passed" : "need to review"} the material.`,
				timestamp: new Date(),
				quizResult: result,
			};

			setMessages((prev) => [...prev, resultMessage]);

			// Track quiz completion
			track(ANALYTICS_EVENTS.QUIZ_COMPLETED, {
				lessonId: currentLesson.id,
				quizId,
				score: result.percentage,
				passed: result.passed,
				timeSpent,
			});

			return result;
		} catch (error) {
			console.error("Failed to submit quiz:", error);
			const errorMessage: ChatMessage = {
				id: Date.now().toString(),
				type: "ai",
				content:
					"I apologize, but there was an error submitting your quiz. Please try again.",
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, errorMessage]);
			throw error;
		}
	};

	const startQuiz = (quiz: {
		id: string;
		questions: QuizQuestion[];
		passingScore?: number;
		timeLimit?: number;
	}) => {
		const quizMessage: ChatMessage = {
			id: Date.now().toString(),
			type: "quiz",
			content: "Let's test your knowledge! Answer the following questions:",
			timestamp: new Date(),
			quiz,
		};
		setMessages((prev) => [...prev, quizMessage]);
	};

	// Show loading state
	if (isLoading) {
		return (
			<div className="flex flex-col h-screen bg-background">
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
						<p className="text-muted-foreground">Loading your lesson...</p>
					</div>
				</div>
			</div>
		);
	}

	// Show error state
	if (error) {
		return (
			<div className="flex flex-col h-screen bg-background">
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<p className="text-destructive mb-4">{error}</p>
						<Button onClick={clearError}>Try Again</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-screen bg-background">
			{/* Header */}
			<div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
				<div className="max-w-4xl mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							{onBack && (
								<Button
									variant="ghost"
									size="sm"
									onClick={onBack}
									className="text-muted-foreground hover:text-foreground"
								>
									<ArrowLeft className="w-4 h-4" />
								</Button>
							)}
							<div>
								<h1 className="font-semibold text-lg text-foreground">
									{currentLesson?.title || lessonTitle}
								</h1>
								<div className="flex items-center gap-2 mt-1">
									<Badge variant="secondary" className="text-xs">
										Step {stepNumber} of {totalSteps}
									</Badge>
									<div className="flex gap-1">
										{Array.from({ length: totalSteps }, (_, i) => (
											<div
												key={i}
												className={`w-2 h-2 rounded-full ${
													i < stepNumber ? "bg-primary" : "bg-muted"
												}`}
											/>
										))}
									</div>
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="ghost" size="sm">
								<Volume2 className="w-4 h-4" />
							</Button>
							<Button variant="ghost" size="sm">
								<Lightbulb className="w-4 h-4" />
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Chat Messages */}
			<div className="flex-1 overflow-y-auto">
				<div className="max-w-4xl mx-auto px-4 py-6">
					<div className="space-y-4">
						{messages.map((message) => (
							<div
								key={message.id}
								className={`flex ${message.type === "user" ? "justify-end" : "justify-start"} animate-bubble-pop`}
							>
								<div
									className={`flex items-start gap-3 max-w-[80%] ${
										message.type === "user" ? "flex-row-reverse" : "flex-row"
									}`}
								>
									<div
										className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
											message.type === "ai"
												? "bg-gradient-primary"
												: message.type === "quiz"
													? "bg-quiz-bubble"
													: "bg-user-bubble"
										}`}
									>
										{message.type === "ai" ? (
											<Bot className="w-4 h-4 text-primary-foreground" />
										) : message.type === "quiz" ? (
											<Zap className="w-4 h-4 text-quiz-foreground" />
										) : (
											<User className="w-4 h-4 text-foreground" />
										)}
									</div>

									<div className="space-y-2">
										<Card
											className={`${
												message.type === "ai"
													? "bg-lesson-bubble text-primary-foreground shadow-glow"
													: message.type === "quiz"
														? "bg-quiz-bubble text-quiz-foreground shadow-glow"
														: "bg-user-bubble"
											}`}
										>
											<CardContent className="p-3">
												{message.type === "ai" ? (
													<TypingAnimation
														text={message.content}
														speed={30}
														className="text-sm leading-relaxed"
													/>
												) : (
													<p className="text-sm leading-relaxed">
														{message.content}
													</p>
												)}

												{/* Quiz Questions */}
												{message.type === "quiz" &&
													message.quiz &&
													!message.quizResult && (
														<div className="mt-4 space-y-4">
															{message.quiz.questions.map((question, index) => (
																<div
																	key={question.id}
																	className="border rounded-lg p-3 bg-background/50"
																>
																	<p className="font-medium mb-2">
																		{index + 1}. {question.question}
																	</p>
																	{question.type === "multiple-choice" &&
																		question.options && (
																			<div className="space-y-2">
																				{question.options.map(
																					(
																						option: string,
																						optionIndex: number,
																					) => (
																						<label
																							key={optionIndex}
																							className="flex items-center space-x-2 cursor-pointer"
																						>
																							<input
																								type="radio"
																								name={`question-${question.id}`}
																								value={option}
																								className="text-primary"
																							/>
																							<span className="text-sm">
																								{option}
																							</span>
																						</label>
																					),
																				)}
																			</div>
																		)}
																	{question.type === "true-false" && (
																		<div className="space-y-2">
																			<label className="flex items-center space-x-2 cursor-pointer">
																				<input
																					type="radio"
																					name={`question-${question.id}`}
																					value="true"
																					className="text-primary"
																				/>
																				<span className="text-sm">True</span>
																			</label>
																			<label className="flex items-center space-x-2 cursor-pointer">
																				<input
																					type="radio"
																					name={`question-${question.id}`}
																					value="false"
																					className="text-primary"
																				/>
																				<span className="text-sm">False</span>
																			</label>
																		</div>
																	)}
																	{question.type === "fill-blank" && (
																		<input
																			type="text"
																			placeholder="Enter your answer..."
																			className="w-full p-2 border rounded text-sm"
																		/>
																	)}
																</div>
															))}
															<Button
																onClick={() => {
																	// Collect answers and submit quiz
																	const answers = message.quiz!.questions.map(
																		(question) => {
																			const input = document.querySelector(
																				`input[name="question-${question.id}"]:checked`,
																			) as HTMLInputElement;
																			return {
																				questionId: question.id,
																				answer: input?.value || "",
																			};
																		},
																	);
																	handleQuizSubmission(
																		message.quiz!.id,
																		answers,
																		0,
																	);
																}}
																className="w-full bg-primary text-primary-foreground"
															>
																Submit Quiz
															</Button>
														</div>
													)}

												{/* Quiz Results */}
												{message.type === "quiz" && message.quizResult && (
													<div className="mt-4 p-3 bg-background/50 rounded-lg">
														<div className="flex items-center justify-between mb-2">
															<span className="font-medium">
																Score: {message.quizResult.percentage}%
															</span>
															<Badge
																variant={
																	message.quizResult.passed
																		? "default"
																		: "destructive"
																}
															>
																{message.quizResult.passed
																	? "Passed"
																	: "Failed"}
															</Badge>
														</div>
														{message.quizResult.feedback && (
															<div className="space-y-2">
																<p className="text-sm font-medium">Feedback:</p>
																{message.quizResult.feedback.map(
																	(item, index) => (
																		<div key={index} className="text-sm">
																			<span
																				className={
																					item.correct
																						? "text-green-600"
																						: "text-red-600"
																				}
																			>
																				{item.correct ? "✓" : "✗"}
																			</span>
																			<span className="ml-2">
																				{item.explanation}
																			</span>
																		</div>
																	),
																)}
															</div>
														)}
													</div>
												)}
											</CardContent>
										</Card>

										{message.quickReplies && message.type === "ai" && (
											<div className="flex flex-wrap gap-2 mt-2">
												{message.quickReplies.map((reply, index) => (
													<Button
														key={index}
														variant="outline"
														size="sm"
														className="text-xs transition-smooth hover:bg-primary hover:text-primary-foreground"
														onClick={() => handleQuickReply(reply)}
													>
														{reply}
													</Button>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						))}

						{isTyping && <ChatBubbleSkeleton />}
					</div>
					<div ref={messagesEndRef} />
				</div>
			</div>

			{/* Quick Action Toolbar */}
			<QuickActionToolbar onToneSwitch={handleToneSwitch} />

			{/* Input Area */}
			<div className="border-t bg-card/50 backdrop-blur-sm sticky bottom-0">
				<div className="max-w-4xl mx-auto px-4 py-4">
					<div className="flex gap-2">
						<Input
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							placeholder="Type your response..."
							onKeyPress={(e) =>
								e.key === "Enter" && handleSendMessage(inputValue)
							}
							className="flex-1"
							disabled={isSubmitting}
						/>
						<Button
							onClick={() => handleSendMessage(inputValue)}
							disabled={!inputValue.trim() || isSubmitting}
							className="bg-gradient-primary border-0 text-primary-foreground hover:opacity-90"
						>
							<Send className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};
