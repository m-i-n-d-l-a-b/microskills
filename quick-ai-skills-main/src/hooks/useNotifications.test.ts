import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useNotifications } from "./useNotifications";

// Mock the notification service
vi.mock("@/services/notificationService", () => ({
	sendNotification: vi.fn(),
	scheduleNotification: vi.fn(),
	cancelNotification: vi.fn(),
	getNotificationPermission: vi.fn(),
	requestNotificationPermission: vi.fn(),
}));

// Mock the analytics hook
vi.mock("@/hooks/useAnalytics", () => ({
	useAnalytics: () => ({
		track: vi.fn(),
	}),
	ANALYTICS_EVENTS: {
		NOTIFICATION_SENT: "notification_sent",
		NOTIFICATION_SCHEDULED: "notification_scheduled",
		NOTIFICATION_CANCELLED: "notification_cancelled",
		NOTIFICATION_PERMISSION_REQUESTED: "notification_permission_requested",
	},
}));

describe("useNotifications", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Basic Functionality", () => {
		it("returns notification functions", () => {
			const { result } = renderHook(() => useNotifications());

			expect(result.current.sendNotification).toBeDefined();
			expect(result.current.scheduleNotification).toBeDefined();
			expect(result.current.cancelNotification).toBeDefined();
			expect(result.current.requestPermission).toBeDefined();
			expect(result.current.hasPermission).toBeDefined();
		});

		it("initializes with default permission state", () => {
			const { result } = renderHook(() => useNotifications());

			expect(result.current.hasPermission).toBe(false);
		});
	});

	describe("Permission Management", () => {
		it("requests notification permission", async () => {
			const { getNotificationPermission, requestNotificationPermission } =
				await import("@/services/notificationService");
			vi.mocked(getNotificationPermission).mockResolvedValue("granted");
			vi.mocked(requestNotificationPermission).mockResolvedValue("granted");

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				const permission = await result.current.requestPermission();
				expect(permission).toBe("granted");
			});

			expect(requestNotificationPermission).toHaveBeenCalled();
		});

		it("tracks permission request analytics", async () => {
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockTrack = vi.fn();
			vi.mocked(useAnalytics).mockReturnValue({ track: mockTrack });

			const { getNotificationPermission, requestNotificationPermission } =
				await import("@/services/notificationService");
			vi.mocked(getNotificationPermission).mockResolvedValue("granted");
			vi.mocked(requestNotificationPermission).mockResolvedValue("granted");

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				await result.current.requestPermission();
			});

			expect(mockTrack).toHaveBeenCalledWith(
				"notification_permission_requested",
				{
					permission: "granted",
				},
			);
		});

		it("handles permission denied", async () => {
			const { getNotificationPermission, requestNotificationPermission } =
				await import("@/services/notificationService");
			vi.mocked(getNotificationPermission).mockResolvedValue("denied");
			vi.mocked(requestNotificationPermission).mockResolvedValue("denied");

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				const permission = await result.current.requestPermission();
				expect(permission).toBe("denied");
			});

			expect(result.current.hasPermission).toBe(false);
		});

		it("handles permission default", async () => {
			const { getNotificationPermission, requestNotificationPermission } =
				await import("@/services/notificationService");
			vi.mocked(getNotificationPermission).mockResolvedValue("default");
			vi.mocked(requestNotificationPermission).mockResolvedValue("default");

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				const permission = await result.current.requestPermission();
				expect(permission).toBe("default");
			});

			expect(result.current.hasPermission).toBe(false);
		});
	});

	describe("Sending Notifications", () => {
		it("sends immediate notification", async () => {
			const { sendNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(sendNotification).mockResolvedValue(true);

			const { result } = renderHook(() => useNotifications());

			const notificationData = {
				title: "Test Notification",
				body: "This is a test notification",
				icon: "/icon.png",
				badge: "/badge.png",
				tag: "test-tag",
				data: { url: "/test" },
				actions: [
					{ action: "view", title: "View" },
					{ action: "dismiss", title: "Dismiss" },
				],
			};

			await act(async () => {
				const success = await result.current.sendNotification(notificationData);
				expect(success).toBe(true);
			});

			expect(sendNotification).toHaveBeenCalledWith(notificationData);
		});

		it("tracks notification sent analytics", async () => {
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockTrack = vi.fn();
			vi.mocked(useAnalytics).mockReturnValue({ track: mockTrack });

			const { sendNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(sendNotification).mockResolvedValue(true);

			const { result } = renderHook(() => useNotifications());

			const notificationData = {
				title: "Test Notification",
				body: "This is a test notification",
			};

			await act(async () => {
				await result.current.sendNotification(notificationData);
			});

			expect(mockTrack).toHaveBeenCalledWith("notification_sent", {
				title: "Test Notification",
				hasIcon: false,
				hasBadge: false,
				hasActions: false,
				hasData: false,
			});
		});

		it("handles notification send failure", async () => {
			const { sendNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(sendNotification).mockResolvedValue(false);

			const { result } = renderHook(() => useNotifications());

			const notificationData = {
				title: "Test Notification",
				body: "This is a test notification",
			};

			await act(async () => {
				const success = await result.current.sendNotification(notificationData);
				expect(success).toBe(false);
			});
		});

		it("handles notification send error", async () => {
			const { sendNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(sendNotification).mockRejectedValue(
				new Error("Notification error"),
			);

			const { result } = renderHook(() => useNotifications());

			const notificationData = {
				title: "Test Notification",
				body: "This is a test notification",
			};

			await act(async () => {
				const success = await result.current.sendNotification(notificationData);
				expect(success).toBe(false);
			});
		});
	});

	describe("Scheduling Notifications", () => {
		it("schedules notification for future", async () => {
			const { scheduleNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(scheduleNotification).mockResolvedValue("notification-id");

			const { result } = renderHook(() => useNotifications());

			const notificationData = {
				title: "Scheduled Notification",
				body: "This is a scheduled notification",
			};

			const scheduleTime = new Date(Date.now() + 60000); // 1 minute from now

			await act(async () => {
				const notificationId = await result.current.scheduleNotification(
					notificationData,
					scheduleTime,
				);
				expect(notificationId).toBe("notification-id");
			});

			expect(scheduleNotification).toHaveBeenCalledWith(
				notificationData,
				scheduleTime,
			);
		});

		it("tracks notification scheduled analytics", async () => {
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockTrack = vi.fn();
			vi.mocked(useAnalytics).mockReturnValue({ track: mockTrack });

			const { scheduleNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(scheduleNotification).mockResolvedValue("notification-id");

			const { result } = renderHook(() => useNotifications());

			const notificationData = {
				title: "Scheduled Notification",
				body: "This is a scheduled notification",
			};

			const scheduleTime = new Date(Date.now() + 60000);

			await act(async () => {
				await result.current.scheduleNotification(
					notificationData,
					scheduleTime,
				);
			});

			expect(mockTrack).toHaveBeenCalledWith("notification_scheduled", {
				title: "Scheduled Notification",
				scheduledFor: scheduleTime.toISOString(),
			});
		});

		it("handles schedule notification failure", async () => {
			const { scheduleNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(scheduleNotification).mockResolvedValue(null);

			const { result } = renderHook(() => useNotifications());

			const notificationData = {
				title: "Scheduled Notification",
				body: "This is a scheduled notification",
			};

			const scheduleTime = new Date(Date.now() + 60000);

			await act(async () => {
				const notificationId = await result.current.scheduleNotification(
					notificationData,
					scheduleTime,
				);
				expect(notificationId).toBeNull();
			});
		});

		it("handles schedule notification error", async () => {
			const { scheduleNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(scheduleNotification).mockRejectedValue(
				new Error("Schedule error"),
			);

			const { result } = renderHook(() => useNotifications());

			const notificationData = {
				title: "Scheduled Notification",
				body: "This is a scheduled notification",
			};

			const scheduleTime = new Date(Date.now() + 60000);

			await act(async () => {
				const notificationId = await result.current.scheduleNotification(
					notificationData,
					scheduleTime,
				);
				expect(notificationId).toBeNull();
			});
		});
	});

	describe("Canceling Notifications", () => {
		it("cancels scheduled notification", async () => {
			const { cancelNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(cancelNotification).mockResolvedValue(true);

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				const success =
					await result.current.cancelNotification("notification-id");
				expect(success).toBe(true);
			});

			expect(cancelNotification).toHaveBeenCalledWith("notification-id");
		});

		it("tracks notification cancelled analytics", async () => {
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockTrack = vi.fn();
			vi.mocked(useAnalytics).mockReturnValue({ track: mockTrack });

			const { cancelNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(cancelNotification).mockResolvedValue(true);

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				await result.current.cancelNotification("notification-id");
			});

			expect(mockTrack).toHaveBeenCalledWith("notification_cancelled", {
				notificationId: "notification-id",
			});
		});

		it("handles cancel notification failure", async () => {
			const { cancelNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(cancelNotification).mockResolvedValue(false);

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				const success =
					await result.current.cancelNotification("notification-id");
				expect(success).toBe(false);
			});
		});

		it("handles cancel notification error", async () => {
			const { cancelNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(cancelNotification).mockRejectedValue(
				new Error("Cancel error"),
			);

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				const success =
					await result.current.cancelNotification("notification-id");
				expect(success).toBe(false);
			});
		});
	});

	describe("Permission State Management", () => {
		it("updates permission state when permission is granted", async () => {
			const { getNotificationPermission, requestNotificationPermission } =
				await import("@/services/notificationService");
			vi.mocked(getNotificationPermission).mockResolvedValue("granted");
			vi.mocked(requestNotificationPermission).mockResolvedValue("granted");

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				await result.current.requestPermission();
			});

			expect(result.current.hasPermission).toBe(true);
		});

		it("maintains permission state across renders", async () => {
			const { getNotificationPermission } = await import(
				"@/services/notificationService"
			);
			vi.mocked(getNotificationPermission).mockResolvedValue("granted");

			const { result, rerender } = renderHook(() => useNotifications());

			// Simulate permission being granted
			await act(async () => {
				// Trigger permission check
				await result.current.requestPermission();
			});

			// Rerender should maintain the permission state
			rerender();
			expect(result.current.hasPermission).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("handles service errors gracefully", async () => {
			const { sendNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(sendNotification).mockRejectedValue(
				new Error("Service unavailable"),
			);

			const { result } = renderHook(() => useNotifications());

			const notificationData = {
				title: "Test Notification",
				body: "This is a test notification",
			};

			await act(async () => {
				const success = await result.current.sendNotification(notificationData);
				expect(success).toBe(false);
			});
		});

		it("handles permission request errors", async () => {
			const { getNotificationPermission, requestNotificationPermission } =
				await import("@/services/notificationService");
			vi.mocked(getNotificationPermission).mockRejectedValue(
				new Error("Permission error"),
			);
			vi.mocked(requestNotificationPermission).mockRejectedValue(
				new Error("Permission error"),
			);

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				const permission = await result.current.requestPermission();
				expect(permission).toBe("denied");
			});

			expect(result.current.hasPermission).toBe(false);
		});
	});

	describe("Analytics Integration", () => {
		it("tracks notification with all optional fields", async () => {
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockTrack = vi.fn();
			vi.mocked(useAnalytics).mockReturnValue({ track: mockTrack });

			const { sendNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(sendNotification).mockResolvedValue(true);

			const { result } = renderHook(() => useNotifications());

			const notificationData = {
				title: "Full Notification",
				body: "This notification has all fields",
				icon: "/icon.png",
				badge: "/badge.png",
				tag: "test-tag",
				data: { url: "/test", userId: "123" },
				actions: [
					{ action: "view", title: "View Details" },
					{ action: "dismiss", title: "Dismiss" },
				],
			};

			await act(async () => {
				await result.current.sendNotification(notificationData);
			});

			expect(mockTrack).toHaveBeenCalledWith("notification_sent", {
				title: "Full Notification",
				hasIcon: true,
				hasBadge: true,
				hasActions: true,
				hasData: true,
			});
		});

		it("tracks scheduled notification with delay", async () => {
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockTrack = vi.fn();
			vi.mocked(useAnalytics).mockReturnValue({ track: mockTrack });

			const { scheduleNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(scheduleNotification).mockResolvedValue("notification-id");

			const { result } = renderHook(() => useNotifications());

			const notificationData = {
				title: "Delayed Notification",
				body: "This will be sent later",
			};

			const scheduleTime = new Date(Date.now() + 300000); // 5 minutes from now

			await act(async () => {
				await result.current.scheduleNotification(
					notificationData,
					scheduleTime,
				);
			});

			expect(mockTrack).toHaveBeenCalledWith("notification_scheduled", {
				title: "Delayed Notification",
				scheduledFor: scheduleTime.toISOString(),
			});
		});
	});

	describe("Edge Cases", () => {
		it("handles empty notification data", async () => {
			const { sendNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(sendNotification).mockResolvedValue(true);

			const { result } = renderHook(() => useNotifications());

			const notificationData = {
				title: "",
				body: "",
			};

			await act(async () => {
				const success = await result.current.sendNotification(notificationData);
				expect(success).toBe(true);
			});
		});

		it("handles very long notification content", async () => {
			const { sendNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(sendNotification).mockResolvedValue(true);

			const { result } = renderHook(() => useNotifications());

			const longText = "A".repeat(1000);
			const notificationData = {
				title: longText,
				body: longText,
			};

			await act(async () => {
				const success = await result.current.sendNotification(notificationData);
				expect(success).toBe(true);
			});
		});

		it("handles past schedule times", async () => {
			const { scheduleNotification } = await import(
				"@/services/notificationService"
			);
			vi.mocked(scheduleNotification).mockResolvedValue(null);

			const { result } = renderHook(() => useNotifications());

			const notificationData = {
				title: "Past Notification",
				body: "This was scheduled for the past",
			};

			const pastTime = new Date(Date.now() - 60000); // 1 minute ago

			await act(async () => {
				const notificationId = await result.current.scheduleNotification(
					notificationData,
					pastTime,
				);
				expect(notificationId).toBeNull();
			});
		});
	});
});
