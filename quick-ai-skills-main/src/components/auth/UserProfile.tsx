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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
	Loader2,
	User as UserIcon,
	Mail,
	Calendar,
	Shield,
	Settings,
	Save,
	Edit3,
} from "lucide-react";
import type { User, UserPreferences } from "@/types/api";

interface UserProfileProps {
	onProfileUpdate?: (user: User) => void;
	onPreferencesUpdate?: (preferences: UserPreferences) => void;
}

export function UserProfile({
	onProfileUpdate,
	onPreferencesUpdate,
}: UserProfileProps) {
	const { user, updateUser, updatePreferences, isLoading } = useAuth();
	const { toast } = useToast();

	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [formData, setFormData] = useState<Partial<User>>({});
	const [preferences, setPreferences] = useState<Partial<UserPreferences>>({});

	// Initialize form data when user changes
	useEffect(() => {
		if (user) {
			setFormData({
				name: user.name || "",
				email: user.email || "",
				avatar: user.avatar || "",
			});
			setPreferences(user.preferences || {});
		}
	}, [user]);

	const handleInputChange = (field: keyof User, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handlePreferenceChange = (
		field: keyof UserPreferences,
		value: UserPreferences[keyof UserPreferences],
	) => {
		setPreferences((prev) => ({ ...prev, [field]: value }));
	};

	const handleSave = async () => {
		if (!user) return;

		setIsSaving(true);
		try {
			// Update profile
			await updateUser(formData);

			// Update preferences
			await updatePreferences(preferences);

			setIsEditing(false);
			toast({
				title: "Profile Updated",
				description:
					"Your profile and preferences have been saved successfully.",
			});

			// Call callbacks
			onProfileUpdate?.(user);
			onPreferencesUpdate?.(preferences as UserPreferences);
		} catch (_error) {
			toast({
				title: "Update Failed",
				description: "Failed to update profile. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleCancel = () => {
		if (user) {
			setFormData({
				name: user.name || "",
				email: user.email || "",
				avatar: user.avatar || "",
			});
			setPreferences(user.preferences || {});
		}
		setIsEditing(false);
	};

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((word) => word.charAt(0))
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	if (isLoading || !user) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Profile Header */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<Avatar className="h-16 w-16">
								<AvatarImage src={user.avatar} alt={user.name} />
								<AvatarFallback className="text-lg">
									{getInitials(user.name || user.email)}
								</AvatarFallback>
							</Avatar>
							<div>
								<CardTitle className="text-2xl">
									{user.name || "User"}
								</CardTitle>
								<CardDescription className="flex items-center space-x-2">
									<Mail className="h-4 w-4" />
									<span>{user.email}</span>
									{user.emailVerified && (
										<Badge variant="secondary" className="text-xs">
											Verified
										</Badge>
									)}
								</CardDescription>
							</div>
						</div>
						<div className="flex items-center space-x-2">
							<Badge variant={user.role === "admin" ? "default" : "secondary"}>
								{user.role}
							</Badge>
							{!isEditing && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setIsEditing(true)}
								>
									<Edit3 className="h-4 w-4 mr-2" />
									Edit Profile
								</Button>
							)}
						</div>
					</div>
				</CardHeader>
			</Card>

			{/* Profile Information */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<UserIcon className="h-5 w-5" />
						<span>Profile Information</span>
					</CardTitle>
					<CardDescription>
						Manage your personal information and account details
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="name">Full Name</Label>
							{isEditing ? (
								<Input
									id="name"
									value={formData.name || ""}
									onChange={(e) => handleInputChange("name", e.target.value)}
									placeholder="Enter your full name"
								/>
							) : (
								<div className="p-3 bg-muted rounded-md">
									{user.name || "Not provided"}
								</div>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">Email Address</Label>
							<div className="p-3 bg-muted rounded-md flex items-center justify-between">
								<span>{user.email}</span>
								{user.emailVerified && (
									<Badge variant="secondary" className="text-xs">
										Verified
									</Badge>
								)}
							</div>
						</div>

						<div className="space-y-2">
							<Label>Account Created</Label>
							<div className="p-3 bg-muted rounded-md flex items-center space-x-2">
								<Calendar className="h-4 w-4" />
								<span>{new Date(user.createdAt).toLocaleDateString()}</span>
							</div>
						</div>

						<div className="space-y-2">
							<Label>Last Updated</Label>
							<div className="p-3 bg-muted rounded-md flex items-center space-x-2">
								<Calendar className="h-4 w-4" />
								<span>{new Date(user.updatedAt).toLocaleDateString()}</span>
							</div>
						</div>
					</div>

					{isEditing && (
						<div className="flex items-center justify-end space-x-2 pt-4">
							<Button variant="outline" onClick={handleCancel}>
								Cancel
							</Button>
							<Button onClick={handleSave} disabled={isSaving}>
								{isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
								<Save className="h-4 w-4 mr-2" />
								Save Changes
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Preferences */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<Settings className="h-5 w-5" />
						<span>Preferences</span>
					</CardTitle>
					<CardDescription>
						Customize your experience and notification settings
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Theme Preferences */}
					<div className="space-y-4">
						<h4 className="font-medium">Appearance</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="theme">Theme</Label>
								{isEditing ? (
									<Select
										value={preferences.theme || "system"}
										onValueChange={(value) =>
											handlePreferenceChange("theme", value)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select theme" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="light">Light</SelectItem>
											<SelectItem value="dark">Dark</SelectItem>
											<SelectItem value="system">System</SelectItem>
										</SelectContent>
									</Select>
								) : (
									<div className="p-3 bg-muted rounded-md">
										{preferences.theme || "System"}
									</div>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="language">Language</Label>
								{isEditing ? (
									<Select
										value={preferences.language || "en"}
										onValueChange={(value) =>
											handlePreferenceChange("language", value)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select language" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="en">English</SelectItem>
											<SelectItem value="es">Spanish</SelectItem>
											<SelectItem value="fr">French</SelectItem>
											<SelectItem value="de">German</SelectItem>
										</SelectContent>
									</Select>
								) : (
									<div className="p-3 bg-muted rounded-md">
										{preferences.language === "en"
											? "English"
											: preferences.language === "es"
												? "Spanish"
												: preferences.language === "fr"
													? "French"
													: preferences.language === "de"
														? "German"
														: "English"}
									</div>
								)}
							</div>
						</div>
					</div>

					<Separator />

					{/* Notification Preferences */}
					<div className="space-y-4">
						<h4 className="font-medium">Notifications</h4>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label>Email Notifications</Label>
									<p className="text-sm text-muted-foreground">
										Receive updates and important information via email
									</p>
								</div>
								{isEditing ? (
									<Switch
										checked={preferences.emailNotifications !== false}
										onCheckedChange={(checked) =>
											handlePreferenceChange("emailNotifications", checked)
										}
									/>
								) : (
									<Badge
										variant={
											preferences.emailNotifications !== false
												? "default"
												: "secondary"
										}
									>
										{preferences.emailNotifications !== false
											? "Enabled"
											: "Disabled"}
									</Badge>
								)}
							</div>

							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label>Push Notifications</Label>
									<p className="text-sm text-muted-foreground">
										Get real-time notifications in your browser
									</p>
								</div>
								{isEditing ? (
									<Switch
										checked={preferences.pushNotifications !== false}
										onCheckedChange={(checked) =>
											handlePreferenceChange("pushNotifications", checked)
										}
									/>
								) : (
									<Badge
										variant={
											preferences.pushNotifications !== false
												? "default"
												: "secondary"
										}
									>
										{preferences.pushNotifications !== false
											? "Enabled"
											: "Disabled"}
									</Badge>
								)}
							</div>

							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label>Learning Reminders</Label>
									<p className="text-sm text-muted-foreground">
										Receive daily reminders to continue your learning
									</p>
								</div>
								{isEditing ? (
									<Switch
										checked={preferences.learningReminders !== false}
										onCheckedChange={(checked) =>
											handlePreferenceChange("learningReminders", checked)
										}
									/>
								) : (
									<Badge
										variant={
											preferences.learningReminders !== false
												? "default"
												: "secondary"
										}
									>
										{preferences.learningReminders !== false
											? "Enabled"
											: "Disabled"}
									</Badge>
								)}
							</div>
						</div>
					</div>

					<Separator />

					{/* Learning Preferences */}
					<div className="space-y-4">
						<h4 className="font-medium">Learning</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="difficulty">Preferred Difficulty</Label>
								{isEditing ? (
									<Select
										value={preferences.difficulty || "beginner"}
										onValueChange={(value) =>
											handlePreferenceChange("difficulty", value)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select difficulty" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="beginner">Beginner</SelectItem>
											<SelectItem value="intermediate">Intermediate</SelectItem>
											<SelectItem value="advanced">Advanced</SelectItem>
										</SelectContent>
									</Select>
								) : (
									<div className="p-3 bg-muted rounded-md capitalize">
										{preferences.difficulty || "Beginner"}
									</div>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="sessionLength">Session Length (minutes)</Label>
								{isEditing ? (
									<Select
										value={preferences.sessionLength?.toString() || "30"}
										onValueChange={(value) =>
											handlePreferenceChange(
												"sessionLength",
												parseInt(value, 10),
											)
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
										</SelectContent>
									</Select>
								) : (
									<div className="p-3 bg-muted rounded-md">
										{preferences.sessionLength || 30} minutes
									</div>
								)}
							</div>
						</div>
					</div>

					{isEditing && (
						<div className="flex items-center justify-end space-x-2 pt-4">
							<Button variant="outline" onClick={handleCancel}>
								Cancel
							</Button>
							<Button onClick={handleSave} disabled={isSaving}>
								{isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
								<Save className="h-4 w-4 mr-2" />
								Save Preferences
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Account Security */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<Shield className="h-5 w-5" />
						<span>Account Security</span>
					</CardTitle>
					<CardDescription>
						Manage your account security settings
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>Email Verification</Label>
							<p className="text-sm text-muted-foreground">
								Your email address verification status
							</p>
						</div>
						<Badge variant={user.emailVerified ? "default" : "destructive"}>
							{user.emailVerified ? "Verified" : "Not Verified"}
						</Badge>
					</div>

					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>Phone Verification</Label>
							<p className="text-sm text-muted-foreground">
								Your phone number verification status
							</p>
						</div>
						<Badge variant={user.phoneVerified ? "default" : "secondary"}>
							{user.phoneVerified ? "Verified" : "Not Verified"}
						</Badge>
					</div>

					<Separator />

					<div className="flex flex-col space-y-2">
						<Button variant="outline" size="sm">
							Change Password
						</Button>
						<Button variant="outline" size="sm">
							Enable Two-Factor Authentication
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default UserProfile;
