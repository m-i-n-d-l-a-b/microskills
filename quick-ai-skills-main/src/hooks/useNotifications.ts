import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import {
	notificationService,
	type Notification,
	type NotificationPreferences,
	type NotificationType,
	type NotificationPriority,
} from "@/services/notificationService";

// Hook return type
export interface UseNotificationsReturn {
	// State
	isInitialized: boolean;
	isEnabled: boolean;
	permission: NotificationPermission;
	queueLength: number;

	// Actions
	initialize: () => Promise<void>;
	requestPermission: () => Promise<NotificationPermission>;
	sendNotification: (
		notification: Omit<Notification, "id" | "status" | "sentAt">,
	) => Promise<Notification>;
	scheduleNotification: (
		notification: Omit<Notification, "id" | "status" | "sentAt">,
		scheduledAt: string,
	) => Promise<Notification>;
	markAsRead: (notificationId: string) => void;
	dismissNotification: (notificationId: string) => void;

	// Preferences
	getPreferences: () => Promise<NotificationPreferences>;
	updatePreferences: (
		updates: Partial<NotificationPreferences>,
	) => Promise<NotificationPreferences>;

	// Utility
	getStatus: () => {
		isInitialized: boolean;
		isEnabled: boolean;
		permission: NotificationPermission;
		queueLength: number;
	};
}

export function useNotifications(): UseNotificationsReturn {
	const { user, isAuthenticated } = useAuth();
	const [isInitialized, setIsInitialized] = useState(false);
	const [isEnabled, setIsEnabled] = useState(false);
	const [permission, setPermission] =
		useState<NotificationPermission>("default");
	const [queueLength, setQueueLength] = useState(0);

	// Initialize notification service
	const initialize = useCallback(async () => {
		try {
			await notificationService.initialize();
			const status = notificationService.getStatus();
			setIsInitialized(status.isInitialized);
			setIsEnabled(status.isEnabled);
			setPermission(status.permission);
			setQueueLength(status.queueLength);
		} catch (error) {
			console.error("Failed to initialize notifications:", error);
		}
	}, []);

	// Request permission
	const requestPermission =
		useCallback(async (): Promise<NotificationPermission> => {
			try {
				const result = await notificationService.requestPermission();
				setPermission(result);
				return result;
			} catch (error) {
				console.error("Failed to request notification permission:", error);
				return "denied";
			}
		}, []);

	// Send notification
	const sendNotification = useCallback(
		async (
			notification: Omit<Notification, "id" | "status" | "sentAt">,
		): Promise<Notification> => {
			if (!user) {
				throw new Error("User must be authenticated to send notifications");
			}

			const fullNotification = {
				...notification,
				userId: user.id,
			};

			const result =
				await notificationService.sendNotification(fullNotification);

			// Update queue length
			const status = notificationService.getStatus();
			setQueueLength(status.queueLength);

			return result;
		},
		[user],
	);

	// Schedule notification
	const scheduleNotification = useCallback(
		async (
			notification: Omit<Notification, "id" | "status" | "sentAt">,
			scheduledAt: string,
		): Promise<Notification> => {
			if (!user) {
				throw new Error("User must be authenticated to schedule notifications");
			}

			const fullNotification = {
				...notification,
				userId: user.id,
			};

			const result = await notificationService.scheduleNotification(
				fullNotification,
				scheduledAt,
			);

			// Update queue length
			const status = notificationService.getStatus();
			setQueueLength(status.queueLength);

			return result;
		},
		[user],
	);

	// Mark as read
	const markAsRead = useCallback((notificationId: string) => {
		notificationService.markAsRead(notificationId);
	}, []);

	// Dismiss notification
	const dismissNotification = useCallback((notificationId: string) => {
		notificationService.dismissNotification(notificationId);

		// Update queue length
		const status = notificationService.getStatus();
		setQueueLength(status.queueLength);
	}, []);

	// Get preferences
	const getPreferences =
		useCallback(async (): Promise<NotificationPreferences> => {
			if (!user) {
				throw new Error(
					"User must be authenticated to get notification preferences",
				);
			}

			return await notificationService.getNotificationPreferences(user.id);
		}, [user]);

	// Update preferences
	const updatePreferences = useCallback(
		async (
			updates: Partial<NotificationPreferences>,
		): Promise<NotificationPreferences> => {
			if (!user) {
				throw new Error(
					"User must be authenticated to update notification preferences",
				);
			}

			return await notificationService.updateNotificationPreferences(
				user.id,
				updates,
			);
		},
		[user],
	);

	// Get status
	const getStatus = useCallback(() => {
		return notificationService.getStatus();
	}, []);

	// Initialize on mount if user is authenticated
	useEffect(() => {
		if (isAuthenticated && user) {
			initialize();
		}
	}, [isAuthenticated, user, initialize]);

	// Update status periodically
	useEffect(() => {
		if (!isInitialized) return;

		const interval = setInterval(() => {
			const status = notificationService.getStatus();
			setIsInitialized(status.isInitialized);
			setIsEnabled(status.isEnabled);
			setPermission(status.permission);
			setQueueLength(status.queueLength);
		}, 5000); // Update every 5 seconds

		return () => clearInterval(interval);
	}, [isInitialized]);

	return {
		// State
		isInitialized,
		isEnabled,
		permission,
		queueLength,

		// Actions
		initialize,
		requestPermission,
		sendNotification,
		scheduleNotification,
		markAsRead,
		dismissNotification,

		// Preferences
		getPreferences,
		updatePreferences,

		// Utility
		getStatus,
	};
}

// Convenience functions for common notification types
export const useNotificationHelpers = () => {
	const { sendNotification, scheduleNotification } = useNotifications();

	const sendLessonReminder = useCallback(
		async (title: string, body: string, lessonId?: string) => {
			return await sendNotification({
				type: "lesson_reminder",
				title,
				body,
				priority: "normal",
				userId: "", // Will be set by the hook
				data: { lessonId },
			});
		},
		[sendNotification],
	);

	const sendAchievementNotification = useCallback(
		async (title: string, body: string, achievementId?: string) => {
			return await sendNotification({
				type: "achievement_unlocked",
				title,
				body,
				priority: "high",
				userId: "", // Will be set by the hook
				data: { achievementId },
			});
		},
		[sendNotification],
	);

	const sendStreakNotification = useCallback(
		async (title: string, body: string, streakCount?: number) => {
			return await sendNotification({
				type: "streak_achieved",
				title,
				body,
				priority: "normal",
				userId: "", // Will be set by the hook
				data: { streakCount },
			});
		},
		[sendNotification],
	);

	const sendProjectGradedNotification = useCallback(
		async (title: string, body: string, projectId?: string, score?: number) => {
			return await sendNotification({
				type: "project_graded",
				title,
				body,
				priority: "normal",
				userId: "", // Will be set by the hook
				data: { projectId, score },
			});
		},
		[sendNotification],
	);

	const sendWelcomeNotification = useCallback(
		async (title: string, body: string) => {
			return await sendNotification({
				type: "welcome",
				title,
				body,
				priority: "normal",
				userId: "", // Will be set by the hook
			});
		},
		[sendNotification],
	);

	const scheduleDailyReminder = useCallback(
		async (
			title: string,
			body: string,
			hour: number = 9,
			minute: number = 0,
		) => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(hour, minute, 0, 0);

			return await scheduleNotification(
				{
					type: "lesson_reminder",
					title,
					body,
					priority: "normal",
					userId: "", // Will be set by the hook
				},
				tomorrow.toISOString(),
			);
		},
		[scheduleNotification],
	);

	return {
		sendLessonReminder,
		sendAchievementNotification,
		sendStreakNotification,
		sendProjectGradedNotification,
		sendWelcomeNotification,
		scheduleDailyReminder,
	};
};
