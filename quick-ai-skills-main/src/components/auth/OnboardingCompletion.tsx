import type React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, ArrowRight } from "lucide-react";
import type { User as ApiUser, UserPreferences } from "@/types/api";

interface OnboardingStep {
	id: string;
	title: string;
	description: string;
	component: React.ReactNode;
	isCompleted: boolean;
	isRequired: boolean;
}

interface OnboardingCompletionProps {
	onComplete?: (user: ApiUser, preferences: UserPreferences) => void;
	onSkip?: () => void;
}

export function OnboardingCompletion({
	onComplete,
	onSkip,
}: OnboardingCompletionProps) {
	const { user, updateUser, updatePreferences, isLoading } = useAuth();
	const { toast } = useToast();

	const [currentStep, setCurrentStep] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);
	type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "";
	type FormDataState = {
		name: string;
		learningGoals: string[];
		experienceLevel: ExperienceLevel;
		preferredTopics: string[];
		timeCommitment: string;
		notifications: boolean;
	};

	const [formData, setFormData] = useState<FormDataState>({
		name: "",
		learningGoals: [],
		experienceLevel: "",
		preferredTopics: [],
		timeCommitment: "",
		notifications: true,
	});

	const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

	// Initialize form data with user info if available
	useEffect(() => {
		if (user) {
			setFormData((prev) => ({
				...prev,
				name: user.name || "",
			}));
		}
	}, [user]);

	const handleInputChange = <K extends keyof FormDataState>(
		field: K,
		value: FormDataState[K],
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleStepComplete = (stepId: string) => {
		setCompletedSteps((prev) => new Set([...prev, stepId]));
	};

	const handleNext = () => {
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handlePrevious = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleComplete = async () => {
		if (!user) return;

		setIsSubmitting(true);
		try {
			// Update user profile
			const updatedUser = await updateUser({
				name: formData.name,
			});

			// Create preferences object
			const sessionLength = formData.timeCommitment
				? parseInt(formData.timeCommitment, 10)
				: 30;

			const preferences: UserPreferences = {
				theme: "system",
				language: "en",
				emailNotifications: formData.notifications,
				pushNotifications: formData.notifications,
				learningReminders: formData.notifications,
				difficulty: formData.experienceLevel || "beginner",
				sessionLength,
				learningGoals: formData.learningGoals,
				preferredTopics: formData.preferredTopics,
				onboardingCompleted: true,
				onboardingCompletedAt: new Date().toISOString(),
			};

			// Update preferences
			await updatePreferences(preferences);

			toast({
				title: "Onboarding Complete!",
				description: "Welcome to your personalized learning journey.",
			});

			onComplete?.(updatedUser, preferences);
		} catch (_error) {
			toast({
				title: "Setup Failed",
				description: "Failed to complete onboarding. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSkip = () => {
		onSkip?.();
	};

	const steps: OnboardingStep[] = [
		{
			id: "profile",
			title: "Complete Your Profile",
			description:
				"Tell us a bit about yourself to personalize your experience",
			isCompleted: completedSteps.has("profile"),
			isRequired: true,
			component: (
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Full Name</Label>
						<Input
							id="name"
							value={formData.name}
							onChange={(e) => handleInputChange("name", e.target.value)}
							placeholder="Enter your full name"
						/>
					</div>
					<div className="flex items-center space-x-2">
						<Checkbox
							id="notifications"
							checked={formData.notifications}
							onCheckedChange={(checked) =>
								handleInputChange("notifications", checked === true)
							}
						/>
						<Label htmlFor="notifications">
							Send me notifications about my learning progress
						</Label>
					</div>
					<Button
						onClick={() => handleStepComplete("profile")}
						disabled={!formData.name.trim()}
						className="w-full"
					>
						Continue
						<ArrowRight className="h-4 w-4 ml-2" />
					</Button>
				</div>
			),
		},
		{
			id: "goals",
			title: "Set Your Learning Goals",
			description:
				"What do you want to achieve? This helps us recommend the right content",
			isCompleted: completedSteps.has("goals"),
			isRequired: true,
			component: (
				<div className="space-y-4">
					<div className="space-y-2">
						<Label>What are your main learning goals?</Label>
						<div className="grid grid-cols-1 gap-3">
							{[
								"Improve my technical skills",
								"Learn new programming languages",
								"Build real-world projects",
								"Prepare for job interviews",
								"Stay updated with latest technologies",
								"Collaborate with other developers",
							].map((goal) => (
								<div key={goal} className="flex items-center space-x-2">
									<Checkbox
										id={goal}
										checked={formData.learningGoals.includes(goal)}
										onCheckedChange={(checked) => {
											if (checked) {
												handleInputChange("learningGoals", [
													...formData.learningGoals,
													goal,
												]);
											} else {
												handleInputChange(
													"learningGoals",
													formData.learningGoals.filter((g) => g !== goal),
												);
											}
										}}
									/>
									<Label htmlFor={goal} className="text-sm">
										{goal}
									</Label>
								</div>
							))}
						</div>
					</div>
					<Button
						onClick={() => handleStepComplete("goals")}
						disabled={formData.learningGoals.length === 0}
						className="w-full"
					>
						Continue
						<ArrowRight className="h-4 w-4 ml-2" />
					</Button>
				</div>
			),
		},
		{
			id: "experience",
			title: "Your Experience Level",
			description: "Help us understand your current skill level",
			isCompleted: completedSteps.has("experience"),
			isRequired: true,
			component: (
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="experience">
							What's your current experience level?
						</Label>
						<Select
							value={formData.experienceLevel}
							onValueChange={(value) =>
								handleInputChange("experienceLevel", value)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select your experience level" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="beginner">
									<div className="flex items-center space-x-2">
										<span>Beginner</span>
										<Badge variant="secondary">0-1 years</Badge>
									</div>
								</SelectItem>
								<SelectItem value="intermediate">
									<div className="flex items-center space-x-2">
										<span>Intermediate</span>
										<Badge variant="secondary">1-3 years</Badge>
									</div>
								</SelectItem>
								<SelectItem value="advanced">
									<div className="flex items-center space-x-2">
										<span>Advanced</span>
										<Badge variant="secondary">3+ years</Badge>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<Button
						onClick={() => handleStepComplete("experience")}
						disabled={!formData.experienceLevel}
						className="w-full"
					>
						Continue
						<ArrowRight className="h-4 w-4 ml-2" />
					</Button>
				</div>
			),
		},
		{
			id: "topics",
			title: "Choose Your Topics",
			description: "Select the topics you're most interested in learning",
			isCompleted: completedSteps.has("topics"),
			isRequired: false,
			component: (
				<div className="space-y-4">
					<div className="space-y-2">
						<Label>What topics interest you most?</Label>
						<div className="grid grid-cols-2 gap-3">
							{[
								"JavaScript",
								"Python",
								"React",
								"Node.js",
								"TypeScript",
								"Vue.js",
								"Angular",
								"Java",
								"C#",
								"Go",
								"Rust",
								"PHP",
								"Ruby",
								"Swift",
								"Kotlin",
								"Docker",
								"Kubernetes",
								"AWS",
								"Azure",
								"GCP",
							].map((topic) => (
								<div key={topic} className="flex items-center space-x-2">
									<Checkbox
										id={topic}
										checked={formData.preferredTopics.includes(topic)}
										onCheckedChange={(checked) => {
											if (checked) {
												handleInputChange("preferredTopics", [
													...formData.preferredTopics,
													topic,
												]);
											} else {
												handleInputChange(
													"preferredTopics",
													formData.preferredTopics.filter((t) => t !== topic),
												);
											}
										}}
									/>
									<Label htmlFor={topic} className="text-sm">
										{topic}
									</Label>
								</div>
							))}
						</div>
					</div>
					<Button
						onClick={() => handleStepComplete("topics")}
						className="w-full"
					>
						Continue
						<ArrowRight className="h-4 w-4 ml-2" />
					</Button>
				</div>
			),
		},
		{
			id: "time",
			title: "Time Commitment",
			description: "How much time can you dedicate to learning each day?",
			isCompleted: completedSteps.has("time"),
			isRequired: true,
			component: (
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="time">Daily learning session length</Label>
						<Select
							value={formData.timeCommitment}
							onValueChange={(value) =>
								handleInputChange("timeCommitment", value)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select session length" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="15">15 minutes</SelectItem>
								<SelectItem value="30">30 minutes</SelectItem>
								<SelectItem value="45">45 minutes</SelectItem>
								<SelectItem value="60">1 hour</SelectItem>
								<SelectItem value="90">1.5 hours</SelectItem>
								<SelectItem value="120">2+ hours</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<Button
						onClick={() => handleStepComplete("time")}
						disabled={!formData.timeCommitment}
						className="w-full"
					>
						Continue
						<ArrowRight className="h-4 w-4 ml-2" />
					</Button>
				</div>
			),
		},
	];

	const progress = (completedSteps.size / steps.length) * 100;

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	const currentStepData = steps[currentStep];

	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<Card className="w-full max-w-2xl">
				<CardHeader className="text-center">
					<div className="flex items-center justify-center space-x-2 mb-4">
						<User className="h-6 w-6" />
						<CardTitle className="text-2xl">
							Welcome to Quick AI Skills!
						</CardTitle>
					</div>
					<CardDescription>
						Let's personalize your learning experience in just a few steps
					</CardDescription>

					{/* Progress Bar */}
					<div className="mt-6 space-y-2">
						<div className="flex justify-between text-sm text-muted-foreground">
							<span>
								Step {currentStep + 1} of {steps.length}
							</span>
							<span>{Math.round(progress)}% Complete</span>
						</div>
						<Progress value={progress} className="h-2" />
					</div>
				</CardHeader>

				<CardContent className="space-y-6">
					{/* Step Content */}
					<div className="space-y-4">
						<div className="text-center space-y-2">
							<h3 className="text-xl font-semibold flex items-center justify-center space-x-2">
								{currentStepData.isCompleted && (
									<CheckCircle className="h-5 w-5 text-green-500" />
								)}
								<span>{currentStepData.title}</span>
							</h3>
							<p className="text-muted-foreground">
								{currentStepData.description}
							</p>
						</div>

						<div className="py-4">{currentStepData.component}</div>
					</div>

					{/* Navigation */}
					<div className="flex items-center justify-between pt-4">
						<div className="flex space-x-2">
							{currentStep > 0 && (
								<Button variant="outline" onClick={handlePrevious}>
									Previous
								</Button>
							)}
							<Button variant="ghost" onClick={handleSkip}>
								Skip for now
							</Button>
						</div>

						<div className="flex space-x-2">
							{currentStep === steps.length - 1 ? (
								<Button
									onClick={handleComplete}
									disabled={isSubmitting || !currentStepData.isCompleted}
								>
									{isSubmitting && (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									)}
									Complete Setup
								</Button>
							) : (
								<Button
									onClick={handleNext}
									disabled={!currentStepData.isCompleted}
								>
									Next Step
									<ArrowRight className="h-4 w-4 ml-2" />
								</Button>
							)}
						</div>
					</div>

					{/* Step Indicators */}
					<div className="flex justify-center space-x-2 pt-4">
						{steps.map((step, index) => (
							<div
								key={step.id}
								className={`w-2 h-2 rounded-full transition-colors ${
									index === currentStep
										? "bg-primary"
										: step.isCompleted
											? "bg-green-500"
											: "bg-muted"
								}`}
							/>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default OnboardingCompletion;
