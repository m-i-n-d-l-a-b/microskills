import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
	ArrowLeft,
	User,
	CreditCard,
	Bell,
	Shield,
	HelpCircle,
	LogOut,
	Mail,
	Smartphone,
	Globe,
	Moon,
	Sun,
	Volume2,
} from "lucide-react";

interface SettingsProps {
	onBack: () => void;
}

export const Settings = ({ onBack }: SettingsProps) => {
	const [darkMode, setDarkMode] = useState(false);
	const [emailNotifications, setEmailNotifications] = useState(true);
	const [pushNotifications, setPushNotifications] = useState(true);
	const [soundEnabled, setSoundEnabled] = useState(true);

	return (
		<div className="min-h-screen bg-gradient-subtle">
			{/* Header */}
			<div className="border-b border-border/50 bg-surface/80 backdrop-blur-sm">
				<div className="max-w-4xl mx-auto p-4">
					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="sm"
							onClick={onBack}
							className="text-muted-foreground hover:text-foreground"
						>
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back
						</Button>
						<div className="flex-1">
							<h1 className="text-2xl font-semibold text-foreground">
								Settings
							</h1>
							<p className="text-sm text-muted-foreground">
								Manage your account and preferences
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-4xl mx-auto p-6 space-y-6">
				{/* Account Settings */}
				<Card className="border-primary/20 shadow-elegant">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<User className="w-5 h-5 text-primary" />
							Account
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="name">Full Name</Label>
								<Input id="name" defaultValue="Alex Johnson" />
							</div>
							<div>
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									defaultValue="alex@example.com"
								/>
							</div>
						</div>
						<div>
							<Label htmlFor="bio">Bio</Label>
							<Input id="bio" placeholder="Tell us about yourself..." />
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="secondary" className="bg-success/20 text-success">
								Pro Plan
							</Badge>
							<Badge variant="outline">Verified</Badge>
						</div>
					</CardContent>
				</Card>

				{/* Billing & Subscription */}
				<Card className="border-primary/20 shadow-elegant">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CreditCard className="w-5 h-5 text-primary" />
							Billing & Subscription
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between p-4 bg-gradient-primary/5 rounded-lg">
							<div>
								<h3 className="font-medium text-foreground">Pro Plan</h3>
								<p className="text-sm text-muted-foreground">
									Unlimited lessons, projects, and certificates
								</p>
							</div>
							<div className="text-right">
								<p className="font-semibold text-foreground">$19/month</p>
								<p className="text-xs text-muted-foreground">
									Next billing: Dec 15, 2024
								</p>
							</div>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" size="sm">
								<CreditCard className="w-4 h-4 mr-2" />
								Update Payment
							</Button>
							<Button variant="outline" size="sm">
								View Invoices
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Notifications */}
				<Card className="border-primary/20 shadow-elegant">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Bell className="w-5 h-5 text-primary" />
							Notifications
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Mail className="w-4 h-4 text-muted-foreground" />
								<div>
									<p className="font-medium">Email Notifications</p>
									<p className="text-sm text-muted-foreground">
										Lesson reminders and progress updates
									</p>
								</div>
							</div>
							<Switch
								checked={emailNotifications}
								onCheckedChange={setEmailNotifications}
							/>
						</div>

						<Separator />

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Smartphone className="w-4 h-4 text-muted-foreground" />
								<div>
									<p className="font-medium">Push Notifications</p>
									<p className="text-sm text-muted-foreground">
										Mobile app notifications
									</p>
								</div>
							</div>
							<Switch
								checked={pushNotifications}
								onCheckedChange={setPushNotifications}
							/>
						</div>

						<Separator />

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Volume2 className="w-4 h-4 text-muted-foreground" />
								<div>
									<p className="font-medium">Sound Effects</p>
									<p className="text-sm text-muted-foreground">
										Audio feedback for interactions
									</p>
								</div>
							</div>
							<Switch
								checked={soundEnabled}
								onCheckedChange={setSoundEnabled}
							/>
						</div>
					</CardContent>
				</Card>

				{/* Appearance */}
				<Card className="border-primary/20 shadow-elegant">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Globe className="w-5 h-5 text-primary" />
							Appearance & Preferences
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								{darkMode ? (
									<Moon className="w-4 h-4 text-muted-foreground" />
								) : (
									<Sun className="w-4 h-4 text-muted-foreground" />
								)}
								<div>
									<p className="font-medium">Dark Mode</p>
									<p className="text-sm text-muted-foreground">
										Switch between light and dark themes
									</p>
								</div>
							</div>
							<Switch checked={darkMode} onCheckedChange={setDarkMode} />
						</div>

						<Separator />

						<div>
							<Label htmlFor="language">Language</Label>
							<select
								id="language"
								className="w-full mt-2 p-2 border border-input rounded-md bg-background text-foreground"
								defaultValue="en"
							>
								<option value="en">English</option>
								<option value="es">Español</option>
								<option value="pt">Português</option>
								<option value="fr">Français</option>
							</select>
						</div>
					</CardContent>
				</Card>

				{/* Privacy & Security */}
				<Card className="border-primary/20 shadow-elegant">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Shield className="w-5 h-5 text-primary" />
							Privacy & Security
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Button variant="outline" className="w-full justify-start">
							Change Password
						</Button>
						<Button variant="outline" className="w-full justify-start">
							Two-Factor Authentication
						</Button>
						<Button variant="outline" className="w-full justify-start">
							Download My Data
						</Button>
						<Button
							variant="outline"
							className="w-full justify-start text-destructive hover:text-destructive"
						>
							Delete Account
						</Button>
					</CardContent>
				</Card>

				{/* Support & Help */}
				<Card className="border-primary/20 shadow-elegant">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<HelpCircle className="w-5 h-5 text-primary" />
							Support & Help
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Button variant="outline" className="w-full justify-start">
							Help Center
						</Button>
						<Button variant="outline" className="w-full justify-start">
							Contact Support
						</Button>
						<Button variant="outline" className="w-full justify-start">
							Feature Requests
						</Button>
						<div className="text-sm text-muted-foreground">
							App Version: 1.0.0
						</div>
					</CardContent>
				</Card>

				{/* Sign Out */}
				<Card className="border-destructive/20">
					<CardContent className="pt-6">
						<Button
							variant="destructive"
							className="w-full"
							onClick={() => {
								// Handle sign out
								alert("Sign out functionality would be implemented here");
							}}
						>
							<LogOut className="w-4 h-4 mr-2" />
							Sign Out
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};
