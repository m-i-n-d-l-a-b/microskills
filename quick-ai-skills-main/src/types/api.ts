// Base API Response Types
export interface ApiResponse<T = any> {
	data: T;
	status: number;
	message?: string;
	success: boolean;
}

export interface ApiError {
	message: string;
	status: number;
	code?: string;
	details?: any;
}

// Authentication Types
export interface LoginCredentials {
	email: string;
	password: string;
}

export interface LoginResponse {
	token: string;
	refreshToken: string;
	user: User;
	expiresAt: string;
}

export interface RefreshTokenRequest {
	refreshToken: string;
}

export interface RefreshTokenResponse {
	token: string;
	refreshToken: string;
	expiresAt: string;
}

export interface LogoutResponse {
	success: boolean;
	message: string;
}

// User Types
export interface User {
	id: string;
	email: string;
	username: string;
	firstName?: string;
	lastName?: string;
	avatar?: string;
	createdAt: string;
	updatedAt: string;
	isEmailVerified: boolean;
	lastLoginAt?: string;
	preferences: UserPreferences;
	profile: UserProfile;
}

export interface UserProfile {
	bio?: string;
	location?: string;
	website?: string;
	socialLinks?: {
		github?: string;
		linkedin?: string;
		twitter?: string;
	};
	skills: string[];
	experience: "beginner" | "intermediate" | "advanced" | "expert";
	timezone: string;
	language: string;
}

export interface UserPreferences {
	theme: "light" | "dark" | "system";
	notifications: NotificationPreferences;
	privacy: PrivacySettings;
	accessibility: AccessibilitySettings;
}

export interface NotificationPreferences {
	email: {
		enabled: boolean;
		dailyDigest: boolean;
		weeklyReport: boolean;
		achievements: boolean;
		newLessons: boolean;
	};
	push: {
		enabled: boolean;
		achievements: boolean;
		newLessons: boolean;
		reminders: boolean;
	};
	inApp: {
		enabled: boolean;
		achievements: boolean;
		newLessons: boolean;
		leaderboard: boolean;
	};
}

export interface PrivacySettings {
	profileVisibility: "public" | "private" | "friends";
	showProgress: boolean;
	showAchievements: boolean;
	allowAnalytics: boolean;
}

export interface AccessibilitySettings {
	fontSize: "small" | "medium" | "large";
	highContrast: boolean;
	reducedMotion: boolean;
	screenReader: boolean;
}

// Lesson Types
export interface Lesson {
	id: string;
	title: string;
	description: string;
	content: LessonContent;
	difficulty: "beginner" | "intermediate" | "advanced";
	duration: number; // in minutes
	tags: string[];
	category: string;
	prerequisites: string[];
	objectives: string[];
	estimatedTime: number;
	createdAt: string;
	updatedAt: string;
}

export interface LessonContent {
	sections: LessonSection[];
	resources: LessonResource[];
	quiz?: Quiz;
}

export interface LessonSection {
	id: string;
	title: string;
	content: string;
	order: number;
	type: "text" | "code" | "video" | "interactive";
	metadata?: {
		videoUrl?: string;
		codeLanguage?: string;
		interactiveConfig?: any;
	};
}

export interface LessonResource {
	id: string;
	title: string;
	type: "document" | "video" | "link" | "download";
	url: string;
	description?: string;
}

export interface Quiz {
	id: string;
	questions: QuizQuestion[];
	timeLimit?: number; // in seconds
	passingScore: number;
}

export interface QuizQuestion {
	id: string;
	question: string;
	type: "multiple-choice" | "true-false" | "fill-blank" | "code";
	options?: string[];
	correctAnswer: string | string[];
	explanation?: string;
	points: number;
}

export interface QuizSubmission {
	quizId: string;
	answers: QuizAnswer[];
	timeSpent: number;
}

export interface QuizAnswer {
	questionId: string;
	answer: string | string[];
}

export interface QuizResult {
	score: number;
	totalPoints: number;
	percentage: number;
	passed: boolean;
	feedback: QuizFeedback[];
	timeSpent: number;
	submittedAt: string;
}

export interface QuizFeedback {
	questionId: string;
	correct: boolean;
	explanation?: string;
	pointsEarned: number;
}

// Progress Types
export interface UserProgress {
	userId: string;
	lessonsCompleted: number;
	totalLessons: number;
	currentStreak: number;
	longestStreak: number;
	totalXp: number;
	level: number;
	achievements: Achievement[];
	recentActivity: ActivityItem[];
	weeklyProgress: WeeklyProgress;
	monthlyProgress: MonthlyProgress;
}

export interface ActivityItem {
	id: string;
	type:
		| "lesson_completed"
		| "quiz_passed"
		| "achievement_earned"
		| "project_submitted";
	title: string;
	description: string;
	xpEarned: number;
	timestamp: string;
	metadata?: any;
}

export interface WeeklyProgress {
	weekStart: string;
	lessonsCompleted: number;
	xpEarned: number;
	streakDays: number;
	goals: ProgressGoal[];
}

export interface MonthlyProgress {
	month: string;
	lessonsCompleted: number;
	xpEarned: number;
	averageStreak: number;
	topCategories: CategoryProgress[];
}

export interface ProgressGoal {
	id: string;
	title: string;
	target: number;
	current: number;
	type: "lessons" | "xp" | "streak";
	deadline?: string;
	completed: boolean;
}

export interface CategoryProgress {
	category: string;
	lessonsCompleted: number;
	totalLessons: number;
	averageScore: number;
}

// Project Types
export interface Project {
	id: string;
	title: string;
	description: string;
	requirements: ProjectRequirement[];
	difficulty: "beginner" | "intermediate" | "advanced";
	estimatedTime: number;
	category: string;
	tags: string[];
	resources: ProjectResource[];
	rubric: ProjectRubric;
	createdAt: string;
	updatedAt: string;
}

export interface ProjectRequirement {
	id: string;
	description: string;
	type: "feature" | "functionality" | "design" | "performance";
	priority: "low" | "medium" | "high";
	points: number;
}

export interface ProjectResource {
	id: string;
	title: string;
	type: "document" | "template" | "starter-code" | "reference";
	url: string;
	description?: string;
}

export interface ProjectRubric {
	criteria: RubricCriteria[];
	totalPoints: number;
	passingScore: number;
}

export interface RubricCriteria {
	id: string;
	name: string;
	description: string;
	maxPoints: number;
	weight: number;
}

export interface ProjectSubmission {
	projectId: string;
	code: string;
	language: string;
	description?: string;
	files?: ProjectFile[];
	metadata?: {
		buildTime?: number;
		testResults?: any;
		dependencies?: string[];
	};
}

export interface ProjectFile {
	name: string;
	content: string;
	type: "code" | "document" | "config";
	path: string;
}

export interface ProjectResult {
	id: string;
	projectId: string;
	score: number;
	totalPoints: number;
	percentage: number;
	passed: boolean;
	feedback: ProjectFeedback[];
	gradingTime: number;
	submittedAt: string;
	gradedAt: string;
}

export interface ProjectFeedback {
	criteriaId: string;
	score: number;
	maxPoints: number;
	feedback: string;
	suggestions?: string[];
}

// Achievement Types
export interface Achievement {
	id: string;
	title: string;
	description: string;
	icon: string;
	category: "learning" | "streak" | "social" | "special";
	rarity: "common" | "rare" | "epic" | "legendary";
	xpReward: number;
	unlockedAt?: string;
	progress?: AchievementProgress;
}

export interface AchievementProgress {
	current: number;
	target: number;
	percentage: number;
}

// Leaderboard Types
export interface LeaderboardEntry {
	rank: number;
	user: {
		id: string;
		username: string;
		avatar?: string;
	};
	score: number;
	xp: number;
	level: number;
	achievements: number;
	streak: number;
}

export interface Leaderboard {
	period: "daily" | "weekly" | "monthly" | "all-time";
	entries: LeaderboardEntry[];
	userRank?: number;
	totalParticipants: number;
	lastUpdated: string;
}

// Certificate Types
export interface Certificate {
	id: string;
	userId: string;
	title: string;
	description: string;
	issuedAt: string;
	expiresAt?: string;
	verificationCode: string;
	metadata: {
		courseName?: string;
		completionDate: string;
		score?: number;
		instructor?: string;
	};
	template: "basic" | "premium" | "custom";
	status: "active" | "expired" | "revoked";
}

export interface CertificateGenerationRequest {
	trackId: string;
	template?: string;
	customData?: Record<string, any>;
}

export interface CertificateGenerationResponse {
	certificateId: string;
	downloadUrl: string;
	shareUrl: string;
	expiresAt?: string;
}

export interface BadgeShareRequest {
	certificateId: string;
	platform: "linkedin" | "twitter" | "github" | "notion";
	customMessage?: string;
}

export interface BadgeShareResponse {
	success: boolean;
	shareUrl?: string;
	message: string;
}

// Analytics Types
export interface AnalyticsEvent {
	eventName: string;
	userId?: string;
	timestamp: string;
	properties: Record<string, any>;
	sessionId?: string;
}

export interface AnalyticsResponse {
	success: boolean;
	eventId: string;
}

export interface UserAnalytics {
	userId: string;
	totalSessions: number;
	totalTimeSpent: number;
	lessonsCompleted: number;
	quizzesTaken: number;
	projectsSubmitted: number;
	achievementsEarned: number;
	averageScore: number;
	favoriteCategories: string[];
	learningPatterns: LearningPattern[];
	retentionRate: number;
}

export interface LearningPattern {
	dayOfWeek: number;
	hourOfDay: number;
	sessionDuration: number;
	lessonsPerSession: number;
}

// Notification Types
export interface Notification {
	id: string;
	userId: string;
	type: "achievement" | "lesson" | "reminder" | "system";
	title: string;
	message: string;
	data?: Record<string, any>;
	read: boolean;
	createdAt: string;
	scheduledFor?: string;
	sentAt?: string;
}

export interface NotificationPreferences {
	email: EmailNotificationSettings;
	push: PushNotificationSettings;
	inApp: InAppNotificationSettings;
}

export interface EmailNotificationSettings {
	enabled: boolean;
	frequency: "immediate" | "daily" | "weekly";
	types: {
		achievements: boolean;
		newLessons: boolean;
		reminders: boolean;
		progress: boolean;
	};
}

export interface PushNotificationSettings {
	enabled: boolean;
	types: {
		achievements: boolean;
		newLessons: boolean;
		reminders: boolean;
		leaderboard: boolean;
	};
}

export interface InAppNotificationSettings {
	enabled: boolean;
	types: {
		achievements: boolean;
		newLessons: boolean;
		leaderboard: boolean;
		system: boolean;
	};
}

// Spaced Repetition Types
export interface SpacedRepetitionItem {
	id: string;
	userId: string;
	lessonId: string;
	interval: number; // days
	repetitions: number;
	easeFactor: number;
	nextReview: string;
	lastReview?: string;
	createdAt: string;
}

export interface SpacedRepetitionResponse {
	itemId: string;
	nextReview: string;
	interval: number;
	repetitions: number;
	easeFactor: number;
}

export interface SpacedRepetitionInput {
	lessonId: string;
	quality: number; // 0-5 rating
}

export interface CreateSpacedRepetitionInput {
	lessonId: string;
	initialQuality: number;
}

export interface DueReviewItem {
	id: string;
	lessonId: string;
	interval: number;
	repetitions: number;
	easeFactor: number;
	nextReview: string;
	lastReview?: string;
	priority: number;
	daysOverdue: number;
}

// Lesson Progress Tracking Types
export interface LessonProgress {
	id: string;
	userId: string;
	lessonId: string;
	status: "not_started" | "in_progress" | "completed" | "paused";
	progress: number; // 0-100 percentage
	sectionsCompleted: number;
	totalSections: number;
	timeSpent: number; // in seconds
	lastAccessedAt: string;
	completedAt?: string;
	score?: number;
	attempts: number;
	metadata?: Record<string, any>;
}

export interface LessonProgressInput {
	lessonId: string;
	progress?: number;
	sectionsCompleted?: number;
	timeSpent?: number;
	status?: "not_started" | "in_progress" | "completed" | "paused";
	metadata?: Record<string, any>;
}

export interface SectionCompletionInput {
	lessonId: string;
	sectionId: string;
	timeSpent: number;
	score?: number;
	metadata?: Record<string, any>;
}

export interface SectionCompletion {
	id: string;
	sectionId: string;
	completedAt: string;
	timeSpent: number;
	score?: number;
	success: boolean;
}

export interface LessonSessionInput {
	lessonId: string;
	sessionType?: "learning" | "review" | "quiz";
	metadata?: Record<string, any>;
}

export interface LessonSessionEndInput {
	sessionId: string;
	totalTimeSpent: number;
	progress: number;
	metadata?: Record<string, any>;
}

export interface LessonSession {
	sessionId: string;
	lessonId: string;
	startedAt: string;
	endedAt?: string;
	totalTimeSpent?: number;
	progress?: number;
	sessionType: "learning" | "review" | "quiz";
	metadata?: Record<string, any>;
}

export interface LessonStateInput {
	lessonId: string;
	state: Record<string, any>;
	metadata?: Record<string, any>;
}

export interface LessonState {
	id: string;
	lessonId: string;
	state: Record<string, any>;
	savedAt: string;
}

export interface ProgressAnalytics {
	totalLessons: number;
	completedLessons: number;
	inProgressLessons: number;
	averageScore: number;
	totalTimeSpent: number;
	averageTimePerLesson: number;
	completionRate: number;
	categoryBreakdown: CategoryProgress[];
	weeklyProgress: WeeklyProgressDetail[];
	monthlyProgress: MonthlyProgressDetail[];
}

export interface WeeklyProgressDetail {
	weekStart: string;
	lessonsCompleted: number;
	timeSpent: number;
	averageScore: number;
}

export interface MonthlyProgressDetail {
	month: string;
	lessonsCompleted: number;
	timeSpent: number;
	averageScore: number;
}

export interface UserLessonProgress {
	id: string;
	lessonId: string;
	status: "not_started" | "in_progress" | "completed" | "paused";
	progress: number;
	sectionsCompleted: number;
	totalSections: number;
	timeSpent: number;
	lastAccessedAt: string;
	completedAt?: string;
	score?: number;
	attempts: number;
	metadata?: Record<string, any>;
	lesson: {
		id: string;
		title: string;
		category: string;
		difficulty: string;
	};
}

// Tone and Interaction Types
export interface ToneSettings {
	tone: "friendly" | "professional" | "casual" | "formal" | "humorous";
	language: string;
	complexity: "simple" | "moderate" | "advanced";
	culturalContext?: string;
}

export interface ToneSwitchRequest {
	tone: string;
	lessonId?: string;
	sessionId?: string;
}

export interface ToneSwitchResponse {
	success: boolean;
	newTone: string;
	message: string;
}

// Error Types
export interface ValidationError {
	field: string;
	message: string;
	code: string;
}

export interface ApiErrorResponse {
	error: {
		message: string;
		code: string;
		status: number;
		details?: ValidationError[];
	};
}

// Pagination Types
export interface PaginationParams {
	page: number;
	limit: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}

// Search Types
export interface SearchParams {
	query: string;
	filters?: Record<string, any>;
	pagination?: PaginationParams;
}

export interface SearchResult<T> {
	items: T[];
	total: number;
	query: string;
	filters: Record<string, any>;
	pagination: PaginationParams;
}

// Export all types for easy importing
export type {
	ApiResponse,
	ApiError,
	LoginCredentials,
	LoginResponse,
	RefreshTokenRequest,
	RefreshTokenResponse,
	LogoutResponse,
	User,
	UserProfile,
	UserPreferences,
	NotificationPreferences as UserNotificationPreferences,
	PrivacySettings,
	AccessibilitySettings,
	Lesson,
	LessonContent,
	LessonSection,
	LessonResource,
	Quiz,
	QuizQuestion,
	QuizSubmission,
	QuizAnswer,
	QuizResult,
	QuizFeedback,
	UserProgress,
	ActivityItem,
	WeeklyProgress,
	MonthlyProgress,
	ProgressGoal,
	CategoryProgress,
	Project,
	ProjectRequirement,
	ProjectResource,
	ProjectRubric,
	RubricCriteria,
	ProjectSubmission,
	ProjectFile,
	ProjectResult,
	ProjectFeedback,
	Achievement,
	AchievementProgress,
	LeaderboardEntry,
	Leaderboard,
	Certificate,
	CertificateGenerationRequest,
	CertificateGenerationResponse,
	BadgeShareRequest,
	BadgeShareResponse,
	AnalyticsEvent,
	AnalyticsResponse,
	UserAnalytics,
	LearningPattern,
	Notification,
	NotificationPreferences,
	EmailNotificationSettings,
	PushNotificationSettings,
	InAppNotificationSettings,
	SpacedRepetitionItem,
	SpacedRepetitionResponse,
	ToneSettings,
	ToneSwitchRequest,
	ToneSwitchResponse,
	ValidationError,
	ApiErrorResponse,
	PaginationParams,
	PaginatedResponse,
	SearchParams,
	SearchResult,
	LessonProgress,
	LessonProgressInput,
	SectionCompletionInput,
	SectionCompletion,
	LessonSessionInput,
	LessonSessionEndInput,
	LessonSession,
	LessonStateInput,
	LessonState,
	ProgressAnalytics,
	WeeklyProgressDetail,
	MonthlyProgressDetail,
	UserLessonProgress,
};
