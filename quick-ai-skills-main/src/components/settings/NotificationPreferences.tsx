import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Bell,
	Smartphone,
	MessageSquare,
	Zap,
	Moon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationPreferences as NotificationPrefs } from "@/services/notificationService";

export const NotificationPreferences = () => {
	const {
		isInitialized,
		isEnabled,
		permission,
		requestPermission,
		getPreferences,
		updatePreferences,
	} = useNotifications();

	const [preferences, setPreferences] = useState<NotificationPrefs | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(false);
	const { toast } = useToast();

	// Load preferences on mount
	useEffect(() => {
		if (isInitialized) {
			loadPreferences();
		}
	}, [isInitialized]);

	const loadPreferences = async () => {
		try {
			const prefs = await getPreferences();
			setPreferences(prefs);
		} catch (error) {
			console.error("Failed to load notification preferences:", error);
			toast({
				title: "Error loading preferences",
				description: "Please refresh the page and try again.",
				variant: "destructive",
			});
		}
	};

	const handleToggle = async (
		key: keyof NotificationPrefs["types"] | keyof NotificationPrefs["channels"],
		value: boolean,
	) => {
		if (!preferences) return;

		const updates: Partial<NotificationPrefs> = {};

		if (key in preferences.types) {
			updates.types = { ...preferences.types, [key]: value };
		} else if (key in preferences.channels) {
			updates.channels = { ...preferences.channels, [key]: value };
		}

		try {
			const updated = await updatePreferences(updates);
			setPreferences(updated);

			toast({
				title: "Preference updated",
				description: `${key} notifications ${value ? "enabled" : "disabled"}.`,
			});
		} catch (error) {
			console.error("Failed to update preference:", error);
			toast({
				title: "Error updating preference",
				description: "Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleQuietHoursToggle = async (enabled: boolean) => {
		if (!preferences) return;

		try {
			const updated = await updatePreferences({
				quietHours: { ...preferences.quietHours, enabled },
			});
			setPreferences(updated);

			toast({
				title: "Quiet hours updated",
				description: `Quiet hours ${enabled ? "enabled" : "disabled"}.`,
			});
		} catch (error) {
			console.error("Failed to update quiet hours:", error);
			toast({
				title: "Error updating quiet hours",
				description: "Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleQuietHoursTimeChange = async (
		type: "start" | "end",
		time: string,
	) => {
		if (!preferences) return;

		try {
			const updated = await updatePreferences({
				quietHours: { ...preferences.quietHours, [type]: time },
			});
			setPreferences(updated);
		} catch (error) {
			console.error("Failed to update quiet hours time:", error);
		}
	};

	const handleFrequencyChange = async (
		frequency: NotificationPrefs["frequency"],
	) => {
		if (!preferences) return;

		try {
			const updated = await updatePreferences({ frequency });
			setPreferences(updated);

			toast({
				title: "Frequency updated",
				description: `Notifications will be sent ${frequency}.`,
			});
		} catch (error) {
			console.error("Failed to update frequency:", error);
			toast({
				title: "Error updating frequency",
				description: "Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleSave = async () => {
		setIsLoading(true);

		try {
			// Preferences are saved automatically when updated
			toast({
				title: "Preferences saved!",
				description: "Your notification settings have been updated.",
			});
		} catch (error) {
			toast({
				title: "Error saving preferences",
				description: "Please try again later.",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const requestNotificationPermission = async () => {
		try {
			const result = await requestPermission();
			if (result === "granted") {
				toast({
					title: "Notifications enabled!",
					description: "You'll receive learning reminders and updates.",
				});
				await loadPreferences(); // Reload preferences
			} else {
				toast({
					title: "Permission denied",
					description: "You can enable notifications in your browser settings.",
					variant: "destructive",
				});
			}
		} catch (error) {
			toast({
				title: "Error requesting permission",
				description: "Please try again.",
				variant: "destructive",
			});
		}
	};

	if (!preferences) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Bell className="h-5 w-5" />
						Notification Preferences
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center py-8">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
							<p className="text-muted-foreground">Loading preferences...</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Bell className="h-5 w-5" />
					Notification Preferences
				</CardTitle>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Badge variant={isEnabled ? "default" : "secondary"}>
						{isEnabled ? "Enabled" : "Disabled"}
					</Badge>
					<Badge variant={permission === "granted" ? "default" : "destructive"}>
						{permission === "granted"
							? "Permission Granted"
							: "Permission Required"}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Permission Request */}
				{permission !== "granted" && (
					<div className="p-4 border rounded-lg bg-muted/50">
						<div className="flex items-center justify-between">
							<div>
								<h4 className="font-medium">Enable Push Notifications</h4>
								<p className="text-sm text-muted-foreground">
									Get notified about lessons, achievements, and progress
									updates.
								</p>
							</div>
							<Button onClick={requestNotificationPermission} size="sm">
								Enable Notifications
							</Button>
						</div>
					</div>
				)}

				{/* Notification Types */}
				<div className="space-y-4">
					<h3 className="text-lg font-medium">Notification Types</h3>
					<div className="grid gap-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Zap className="h-4 w-4 text-yellow-500" />
								<div>
									<p className="font-medium">Lesson Reminders</p>
									<p className="text-sm text-muted-foreground">
										Daily learning reminders
									</p>
								</div>
							</div>
							<Switch
								checked={preferences.types.lesson_reminder}
								onCheckedChange={(checked) =>
									handleToggle("lesson_reminder", checked)
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Bell className="h-4 w-4 text-blue-500" />
								<div>
									<p className="font-medium">Achievements</p>
									<p className="text-sm text-muted-foreground">
										When you unlock badges
									</p>
								</div>
							</div>
							<Switch
								checked={preferences.types.achievement_unlocked}
								onCheckedChange={(checked) =>
									handleToggle("achievement_unlocked", checked)
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<MessageSquare className="h-4 w-4 text-green-500" />
								<div>
									<p className="font-medium">Streak Alerts</p>
									<p className="text-sm text-muted-foreground">
										Learning streak updates
									</p>
								</div>
							</div>
							<Switch
								checked={preferences.types.streak_achieved}
								onCheckedChange={(checked) =>
									handleToggle("streak_achieved", checked)
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Smartphone className="h-4 w-4 text-purple-500" />
								<div>
									<p className="font-medium">Project Grading</p>
									<p className="text-sm text-muted-foreground">
										When projects are evaluated
									</p>
								</div>
							</div>
							<Switch
								checked={preferences.types.project_graded}
								onCheckedChange={(checked) =>
									handleToggle("project_graded", checked)
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Bell className="h-4 w-4 text-orange-500" />
								<div>
									<p className="font-medium">System Alerts</p>
									<p className="text-sm text-muted-foreground">
										Important app updates
									</p>
								</div>
							</div>
							<Switch
								checked={preferences.types.system_alert}
								onCheckedChange={(checked) =>
									handleToggle("system_alert", checked)
								}
							/>
						</div>
					</div>
				</div>

				{/* Delivery Channels */}
				<div className="space-y-4">
					<h3 className="text-lg font-medium">Delivery Channels</h3>
					<div className="grid gap-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Smartphone className="h-4 w-4" />
								<div>
									<p className="font-medium">Push Notifications</p>
									<p className="text-sm text-muted-foreground">
										Browser notifications
									</p>
								</div>
							</div>
							<Switch
								checked={preferences.channels.push}
								onCheckedChange={(checked) => handleToggle("push", checked)}
								disabled={permission !== "granted"}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<MessageSquare className="h-4 w-4" />
								<div>
									<p className="font-medium">In-App Notifications</p>
									<p className="text-sm text-muted-foreground">
										Notifications within the app
									</p>
								</div>
							</div>
							<Switch
								checked={preferences.channels.inApp}
								onCheckedChange={(checked) => handleToggle("inApp", checked)}
							/>
						</div>
					</div>
				</div>

				{/* Quiet Hours */}
				<div className="space-y-4">
					<h3 className="text-lg font-medium">Quiet Hours</h3>
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Moon className="h-4 w-4" />
								<div>
									<p className="font-medium">Enable Quiet Hours</p>
									<p className="text-sm text-muted-foreground">
										Pause notifications during specific hours
									</p>
								</div>
							</div>
							<Switch
								checked={preferences.quietHours.enabled}
								onCheckedChange={handleQuietHoursToggle}
							/>
						</div>

						{preferences.quietHours.enabled && (
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="quiet-hours-start"
										className="text-sm font-medium"
									>
										Start Time
									</label>
									<input
										id="quiet-hours-start"
										type="time"
										value={preferences.quietHours.start}
										onChange={(e) =>
											handleQuietHoursTimeChange("start", e.target.value)
										}
										className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									/>
								</div>
								<div>
									<label
										htmlFor="quiet-hours-end"
										className="text-sm font-medium"
									>
										End Time
									</label>
									<input
										id="quiet-hours-end"
										type="time"
										value={preferences.quietHours.end}
										onChange={(e) =>
											handleQuietHoursTimeChange("end", e.target.value)
										}
										className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									/>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Frequency */}
				<div className="space-y-4">
					<h3 className="text-lg font-medium">Notification Frequency</h3>
					<Select
						value={preferences.frequency}
						onValueChange={handleFrequencyChange}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="immediate">Immediate</SelectItem>
							<SelectItem value="hourly">Hourly Digest</SelectItem>
							<SelectItem value="daily">Daily Digest</SelectItem>
							<SelectItem value="weekly">Weekly Digest</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Save Button */}
				<div className="flex justify-end">
					<Button onClick={handleSave} disabled={isLoading}>
						{isLoading ? "Saving..." : "Save Preferences"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
};
