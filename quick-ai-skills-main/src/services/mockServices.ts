// Mock services to simulate backend functionality

// Analytics Service (PostHog mock)
class AnalyticsService {
	private events: any[] = [];

	track(eventName: string, properties?: Record<string, any>) {
		const event = {
			event: eventName,
			properties: {
				...properties,
				timestamp: new Date().toISOString(),
				userId: "user_123", // Mock user ID
			},
		};

		this.events.push(event);
		console.log("📊 Analytics Event:", event);

		// In real app, this would send to PostHog
		// posthog.capture(eventName, properties);
	}

	identify(userId: string, traits?: Record<string, any>) {
		console.log("👤 User Identified:", { userId, traits });
	}

	getEvents() {
		return this.events;
	}
}

// Notification Service Mock
class NotificationService {
	private permissions: NotificationPermission = "default";

	async requestPermission(): Promise<boolean> {
		if ("Notification" in window) {
			const permission = await Notification.requestPermission();
			this.permissions = permission;
			return permission === "granted";
		}
		return false;
	}

	async sendNotification(title: string, options?: NotificationOptions) {
		if (this.permissions === "granted") {
			new Notification(title, {
				icon: "/favicon.ico",
				badge: "/favicon.ico",
				...options,
			});
		}
		console.log("🔔 Notification:", { title, options });
	}

	async scheduleDailyReminder(lessonId: string, time: string = "09:00") {
		// Mock scheduling
		console.log("⏰ Daily reminder scheduled:", { lessonId, time });
		return Promise.resolve();
	}

	async sendPushNotification(payload: {
		title: string;
		body: string;
		deepLink?: string;
		data?: Record<string, any>;
	}) {
		console.log("📱 Push notification:", payload);
		// In real app, this would use Firebase/APNs
		return Promise.resolve();
	}
}

// Lesson Engine Service Mock
class LessonEngineService {
	private cache = new Map();

	async getDailyLesson(userId: string): Promise<any> {
		const lessonId = `lesson_${new Date().toDateString()}`;

		if (this.cache.has(lessonId)) {
			return this.cache.get(lessonId);
		}

		// Mock lesson data
		const lesson = {
			id: lessonId,
			title: "Advanced Prompt Engineering",
			description: "Learn to craft prompts that get better AI responses",
			steps: [
				{
					id: "step_1",
					type: "introduction",
					content:
						"Today we'll explore advanced prompt engineering techniques...",
					media: null,
				},
				{
					id: "step_2",
					type: "interactive",
					content:
						"Try creating a prompt with specific context and constraints.",
					quickReplies: ["Let's start", "Show example", "Skip to practice"],
				},
				{
					id: "step_3",
					type: "quiz",
					content: "Which prompt structure is most effective?",
					options: [
						"Be specific and provide context",
						"Keep it as short as possible",
						"Use complex technical language",
						"Ask multiple questions at once",
					],
					correctAnswer: 0,
				},
			],
			difficulty: "intermediate",
			estimatedTime: 5,
			xpReward: 150,
		};

		this.cache.set(lessonId, lesson);
		return lesson;
	}

	async submitQuiz(stepId: string, answers: any[]): Promise<any> {
		// Mock quiz feedback
		await new Promise((resolve) => setTimeout(resolve, 1000));

		return {
			correct: Math.random() > 0.3, // 70% chance of correct
			feedback:
				"Good thinking! Context and specificity help AI models understand exactly what you need.",
			explanation:
				"Specific prompts with clear context lead to more accurate and useful responses.",
			xpEarned: 50,
		};
	}

	async switchTone(lessonId: string, tone: string): Promise<any> {
		console.log("🎭 Switching tone:", { lessonId, tone });

		// Mock tone switching
		return {
			success: true,
			nextMessage: `Switching to ${tone} tone. Let me adjust my teaching style...`,
		};
	}
}

// Project Grading Service Mock
class ProjectGradingService {
	async submitProject(projectId: string, payload: any): Promise<any> {
		console.log("📝 Project submitted:", { projectId, payload });

		// Simulate LLM grading (30s turnaround as per spec)
		await new Promise((resolve) => setTimeout(resolve, 3000));

		const score = Math.floor(Math.random() * 30) + 70; // 70-100
		const feedback = this.generateFeedback(score, payload);

		return {
			id: `submission_${Date.now()}`,
			projectId,
			score,
			feedback,
			gradedAt: new Date(),
			rubric: {
				functionality: Math.floor(score * 0.4),
				codeQuality: Math.floor(score * 0.3),
				bestPractices: Math.floor(score * 0.3),
			},
		};
	}

	private generateFeedback(score: number, payload: any): string {
		if (score >= 90) {
			return "Excellent work! Your implementation demonstrates strong understanding of prompt engineering principles. The code is clean, well-structured, and follows best practices.";
		} else if (score >= 80) {
			return "Good job! Your solution works well and shows good understanding. Consider adding more specific context to your prompts for even better results.";
		} else if (score >= 70) {
			return "Nice effort! Your basic implementation is correct. To improve, focus on making your prompts more specific and adding better error handling.";
		} else {
			return "Keep working on it! Review the lesson materials and try to implement the core requirements more completely.";
		}
	}
}

// Authentication Service Mock (Supabase-style)
class AuthService {
	private user: any = null;

	async signInWithOAuth(provider: "google" | "github" | "linkedin") {
		console.log("🔐 OAuth sign-in:", provider);

		// Mock OAuth flow
		await new Promise((resolve) => setTimeout(resolve, 1000));

		this.user = {
			id: "user_123",
			email: "user@example.com",
			name: "Demo User",
			provider,
			created_at: new Date().toISOString(),
		};

		return { user: this.user, session: { access_token: "mock_token" } };
	}

	async signInWithMagicLink(email: string) {
		console.log("✨ Magic link sent to:", email);

		// In real app, this would send email
		return { success: true };
	}

	async completeOnboarding(userData: any) {
		console.log("✅ Onboarding completed:", userData);

		// Mock user preferences save
		const preferences = {
			...userData,
			onboardedAt: new Date().toISOString(),
			userId: this.user?.id,
		};

		localStorage.setItem("userPreferences", JSON.stringify(preferences));
		return preferences;
	}

	getCurrentUser() {
		return this.user;
	}

	async signOut() {
		this.user = null;
		localStorage.removeItem("userPreferences");
		console.log("👋 User signed out");
	}
}

// Certificate Service Mock
class CertificateService {
	async issueCertificate(userId: string, trackId: string): Promise<any> {
		const certificate = {
			id: `cert_${Date.now()}`,
			userId,
			trackId,
			title: "AI Prompt Engineering Specialist",
			trackName: "Prompt Engineering Fundamentals",
			level: "gold" as const,
			issuedAt: new Date(),
			shareLink: `https://ai-skills.app/certificates/cert_${Date.now()}`,
			badgeImageUrl: "/certificate-badge.png",
		};

		console.log("🏆 Certificate issued:", certificate);
		return certificate;
	}

	async shareBadge(certificateId: string, platform: string) {
		console.log("📤 Badge shared:", { certificateId, platform });

		// Track analytics
		analytics.track("badge_share_click", {
			certificateId,
			platform,
			timestamp: Date.now(),
		});
	}
}

// Export singleton instances
export const analytics = new AnalyticsService();
export const notifications = new NotificationService();
export const lessonEngine = new LessonEngineService();
export const projectGrading = new ProjectGradingService();
export const auth = new AuthService();
export const certificates = new CertificateService();

// Initialize analytics
analytics.identify("user_123", {
	role: "developer",
	timeCommit: 10,
	tone: "friendly",
	onboarded: true,
});
