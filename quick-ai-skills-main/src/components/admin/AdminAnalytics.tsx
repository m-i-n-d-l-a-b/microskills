import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	LineChart,
	Line,
	PieChart,
	Pie,
	Cell,
} from "recharts";
import {
	Users,
	BookOpen,
	Trophy,
	TrendingUp,
	Bell,
	Mail,
	Activity,
} from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useNotifications } from "@/hooks/useNotifications";
import { emailService } from "@/services/emailService";

type AnalyticsEvent = {
	event: string;
	timestamp?: string;
	sentAt?: string;
	properties?: {
		lessonTitle?: string;
		score?: number;
		user_id?: string;
		[key: string]: unknown;
	};
	userId?: string;
};

// Analytics data interface
interface AnalyticsData {
	overview: {
		totalUsers: number;
		activeUsers: number;
		lessonsCompleted: number;
		avgCompletionRate: number;
		avgSessionTime: number;
		retentionRate: number;
	};
	userEngagement: Array<{
		date: string;
		users: number;
		lessons: number;
		retention: number;
	}>;
	topTracks: Array<{
		name: string;
		completions: number;
		avgScore: number;
	}>;
	notificationStats: {
		pushSent: number;
		emailSent: number;
		inAppSent: number;
		openRate: number;
		clickRate: number;
	};
	roiData: Array<{
		metric: string;
		value: string;
		trend: number;
	}>;
}

// Default analytics data
const defaultAnalytics: AnalyticsData = {
	overview: {
		totalUsers: 0,
		activeUsers: 0,
		lessonsCompleted: 0,
		avgCompletionRate: 0,
		avgSessionTime: 0,
		retentionRate: 0,
	},
	userEngagement: [],
	topTracks: [],
	notificationStats: {
		pushSent: 0,
		emailSent: 0,
		inAppSent: 0,
		openRate: 0,
		clickRate: 0,
	},
	roiData: [],
};

export const AdminAnalytics = () => {
	const [timeRange, setTimeRange] = useState("7d");
	const [data, setData] = useState<AnalyticsData>(defaultAnalytics);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const { getDebugData } = useAnalytics();
	const { getStatus: getNotificationStatus } = useNotifications();

	const getTimeRangeMs = useCallback((timeRange: string) => {
		switch (timeRange) {
			case "24h":
				return 24 * 60 * 60 * 1000;
			case "7d":
				return 7 * 24 * 60 * 60 * 1000;
			case "30d":
				return 30 * 24 * 60 * 60 * 1000;
			case "90d":
				return 90 * 24 * 60 * 60 * 1000;
			default:
				return 7 * 24 * 60 * 60 * 1000;
		}
	}, []);

	const getDaysInRange = useCallback((timeRange: string) => {
		const days =
			timeRange === "24h"
				? 1
				: timeRange === "7d"
					? 7
					: timeRange === "30d"
						? 30
						: 90;
		const result = [];
		for (let i = days - 1; i >= 0; i--) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			result.push(date.toISOString().split("T")[0]);
		}
		return result;
	}, []);

	const calculateRetention = useCallback((events: AnalyticsEvent[]) => {
		const uniqueUsers = new Set(
			events
				.map((e) => {
					const propUser = e.properties?.user_id;
					if (typeof propUser === "string") return propUser;
					if (typeof e.userId === "string") return e.userId;
					return null;
				})
				.filter((id): id is string => Boolean(id)),
		);
		return uniqueUsers.size > 0 ? Math.round(Math.random() * 20 + 70) : 0; // Mock calculation
	}, []);

	const generateUserEngagementData = useCallback(
		(timeRange: string, events: AnalyticsEvent[]) => {
			const days = getDaysInRange(timeRange);
			return days.map((date) => {
				const dayEvents = events.filter((e) => {
					const eventDate = new Date(e.timestamp || e.sentAt || 0)
						.toISOString()
						.split("T")[0];
					return eventDate === date;
				});

				return {
					date,
					users: dayEvents.filter((e) => e.event === "user_signed_in").length,
					lessons: dayEvents.filter((e) => e.event === "lesson_completed")
						.length,
					retention: calculateRetention(dayEvents),
				};
			});
		},
		[getDaysInRange, calculateRetention],
	);

	const generateTopTracksData = useCallback((events: AnalyticsEvent[]) => {
		const trackCompletions: Record<
			string,
			{ completions: number; scores: number[] }
		> = {};

		events.forEach((event) => {
			const lessonTitle = event.properties?.lessonTitle;
			if (
				event.event === "lesson_completed" &&
				typeof lessonTitle === "string"
			) {
				const track = lessonTitle;
				if (!trackCompletions[track]) {
					trackCompletions[track] = { completions: 0, scores: [] };
				}
				trackCompletions[track].completions++;
				const score = event.properties?.score;
				if (typeof score === "number") {
					trackCompletions[track].scores.push(score);
				}
			}
		});

		return Object.entries(trackCompletions)
			.map(([name, data]) => ({
				name,
				completions: data.completions,
				avgScore:
					data.scores.length > 0
						? Math.round(
								data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
							)
						: 0,
			}))
			.sort((a, b) => b.completions - a.completions)
			.slice(0, 5);
	}, []);

	const calculateOpenRate = useCallback((events: AnalyticsEvent[]) => {
		const notificationsSent = events.filter(
			(e) => e.event === "notification_sent",
		).length;
		const notificationsOpened = events.filter(
			(e) => e.event === "notification_clicked",
		).length;
		return notificationsSent > 0
			? Math.round((notificationsOpened / notificationsSent) * 100)
			: 0;
	}, []);

	const calculateClickRate = useCallback((events: AnalyticsEvent[]) => {
		const notificationsSent = events.filter(
			(e) => e.event === "notification_sent",
		).length;
		const notificationsClicked = events.filter(
			(e) => e.event === "notification_action",
		).length;
		return notificationsSent > 0
			? Math.round((notificationsClicked / notificationsSent) * 100)
			: 0;
	}, []);

	const processAnalyticsEvents = useCallback(
		(events: AnalyticsEvent[], timeRange: string): Partial<AnalyticsData> => {
			const now = new Date();
			const timeRangeMs = getTimeRangeMs(timeRange);
			const filteredEvents = events.filter((event) => {
				const eventTime = new Date(event.timestamp || event.sentAt || 0);
				return now.getTime() - eventTime.getTime() <= timeRangeMs;
			});

			// Calculate metrics from events
			const lessonsCompleted = filteredEvents.filter(
				(e) => e.event === "lesson_completed",
			).length;
			const lessonsStarted = filteredEvents.filter(
				(e) => e.event === "lesson_started",
			).length;

			// Generate user engagement data
			const userEngagement = generateUserEngagementData(
				timeRange,
				filteredEvents,
			);

			// Generate top tracks data
			const topTracks = generateTopTracksData(filteredEvents);

			return {
				overview: {
					totalUsers: 0, // Would come from user database
					activeUsers: 0, // Would come from user database
					lessonsCompleted,
					avgCompletionRate:
						lessonsStarted > 0
							? Math.round((lessonsCompleted / lessonsStarted) * 100)
							: 0,
					avgSessionTime: 6.2, // Would be calculated from session data
					retentionRate: 73, // Would be calculated from user retention data
				},
				userEngagement,
				topTracks,
				roiData: [
					{ metric: "User Acquisition Cost", value: "$12.50", trend: -8 },
					{ metric: "Lifetime Value", value: "$89.20", trend: 15 },
					{ metric: "Monthly Churn", value: "4.2%", trend: -12 },
					{ metric: "Revenue per User", value: "$34.80", trend: 23 },
				],
			};
		},
		[
			timeRange,
			getTimeRangeMs,
			generateUserEngagementData,
			generateTopTracksData,
		],
	);

	const fetchAnalyticsData = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			// Get analytics service status
			const analyticsStatus = getDebugData();

			// Get notification service status
			const notificationStatus = getNotificationStatus();

			// Get email service status
			const emailStatus = emailService.getStatus();

			// Fetch analytics data from localStorage (in real app, this would be from PostHog API)
			const analyticsEvents = JSON.parse(
				localStorage.getItem("analytics_events") || "[]",
			) as AnalyticsEvent[];

			// Process analytics events to generate insights
			const processedData = processAnalyticsEvents(analyticsEvents, timeRange);

			// Combine with service status data
			const combinedData: AnalyticsData = {
				...processedData,
				notificationStats: {
					pushSent: notificationStatus.queueLength,
					emailSent: emailStatus.queueLength,
					inAppSent: analyticsEvents.filter(
						(e) => e.event === "notification_sent",
					).length,
					openRate: calculateOpenRate(analyticsEvents),
					clickRate: calculateClickRate(analyticsEvents),
				},
				overview: {
					...processedData.overview,
					totalUsers: analyticsStatus.isInitialized ? 1 : 0, // In real app, this would be from user database
					activeUsers: analyticsStatus.isEnabled ? 1 : 0,
				},
			};

			setData(combinedData);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to fetch analytics data",
			);
		} finally {
			setIsLoading(false);
		}
	}, [
		getDebugData,
		getNotificationStatus,
		timeRange,
		processAnalyticsEvents,
		calculateOpenRate,
		calculateClickRate,
	]);

	useEffect(() => {
		fetchAnalyticsData();
	}, [fetchAnalyticsData]);

	const pieChartData = [
		{
			name: "Completed",
			value: data.overview.avgCompletionRate,
			color: "hsl(var(--success))",
		},
		{
			name: "In Progress",
			value: 100 - data.overview.avgCompletionRate,
			color: "hsl(var(--muted))",
		},
	];

	if (isLoading) {
		return (
			<div className="p-6 space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
						<p className="text-muted-foreground">Loading analytics data...</p>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<p className="text-destructive mb-4">{error}</p>
						<Button onClick={fetchAnalyticsData}>Retry</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-foreground">
						Analytics Dashboard
					</h1>
					<p className="text-muted-foreground">
						AI Skills micro-learning platform insights
					</p>
				</div>
				<div className="flex items-center gap-2">
					{["24h", "7d", "30d", "90d"].map((range) => (
						<Button
							key={range}
							variant={timeRange === range ? "default" : "outline"}
							size="sm"
							onClick={() => setTimeRange(range)}
							className={
								timeRange === range
									? "bg-gradient-primary border-0 text-primary-foreground"
									: ""
							}
						>
							{range}
						</Button>
					))}
				</div>
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="shadow-card hover:shadow-glow transition-smooth">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Total Users
								</p>
								<p className="text-2xl font-bold text-foreground">
									{data.overview.totalUsers.toLocaleString()}
								</p>
							</div>
							<Users className="w-8 h-8 text-primary" />
						</div>
						<div className="mt-2">
							<Badge variant="secondary" className="text-xs">
								<TrendingUp className="w-3 h-3 mr-1" />
								+12% vs last week
							</Badge>
						</div>
					</CardContent>
				</Card>

				<Card className="shadow-card hover:shadow-glow transition-smooth">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Lessons Completed
								</p>
								<p className="text-2xl font-bold text-foreground">
									{data.overview.lessonsCompleted.toLocaleString()}
								</p>
							</div>
							<BookOpen className="w-8 h-8 text-primary" />
						</div>
						<div className="mt-2">
							<Badge variant="secondary" className="text-xs">
								<TrendingUp className="w-3 h-3 mr-1" />
								+8% vs last week
							</Badge>
						</div>
					</CardContent>
				</Card>

				<Card className="shadow-card hover:shadow-glow transition-smooth">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Completion Rate
								</p>
								<p className="text-2xl font-bold text-foreground">
									{data.overview.avgCompletionRate}%
								</p>
							</div>
							<Target className="w-8 h-8 text-primary" />
						</div>
						<div className="mt-2">
							<Progress
								value={data.overview.avgCompletionRate}
								className="h-2"
							/>
						</div>
					</CardContent>
				</Card>

				<Card className="shadow-card hover:shadow-glow transition-smooth">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Retention Rate
								</p>
								<p className="text-2xl font-bold text-foreground">
									{data.overview.retentionRate}%
								</p>
							</div>
							<Trophy className="w-8 h-8 text-primary" />
						</div>
						<div className="mt-2">
							<Badge variant="secondary" className="text-xs">
								<TrendingUp className="w-3 h-3 mr-1" />
								+5% vs last week
							</Badge>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Notification Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Bell className="w-5 h-5" />
							Push Notifications
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex justify-between">
								<span>Sent</span>
								<span className="font-medium">
									{data.notificationStats.pushSent}
								</span>
							</div>
							<div className="flex justify-between">
								<span>Open Rate</span>
								<span className="font-medium">
									{data.notificationStats.openRate}%
								</span>
							</div>
							<div className="flex justify-between">
								<span>Click Rate</span>
								<span className="font-medium">
									{data.notificationStats.clickRate}%
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Mail className="w-5 h-5" />
							Email Notifications
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex justify-between">
								<span>Sent</span>
								<span className="font-medium">
									{data.notificationStats.emailSent}
								</span>
							</div>
							<div className="flex justify-between">
								<span>Open Rate</span>
								<span className="font-medium">
									{data.notificationStats.openRate}%
								</span>
							</div>
							<div className="flex justify-between">
								<span>Click Rate</span>
								<span className="font-medium">
									{data.notificationStats.clickRate}%
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Activity className="w-5 h-5" />
							In-App Notifications
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex justify-between">
								<span>Sent</span>
								<span className="font-medium">
									{data.notificationStats.inAppSent}
								</span>
							</div>
							<div className="flex justify-between">
								<span>Open Rate</span>
								<span className="font-medium">
									{data.notificationStats.openRate}%
								</span>
							</div>
							<div className="flex justify-between">
								<span>Click Rate</span>
								<span className="font-medium">
									{data.notificationStats.clickRate}%
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Charts */}
			<Tabs defaultValue="engagement" className="space-y-4">
				<TabsList>
					<TabsTrigger value="engagement">User Engagement</TabsTrigger>
					<TabsTrigger value="tracks">Top Tracks</TabsTrigger>
					<TabsTrigger value="completion">Completion Rate</TabsTrigger>
				</TabsList>

				<TabsContent value="engagement" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>User Engagement Over Time</CardTitle>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
								<LineChart data={data.userEngagement}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="date" />
									<YAxis />
									<Tooltip />
									<Line
										type="monotone"
										dataKey="users"
										stroke="#3B82F6"
										strokeWidth={2}
									/>
									<Line
										type="monotone"
										dataKey="lessons"
										stroke="#10B981"
										strokeWidth={2}
									/>
								</LineChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="tracks" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Top Learning Tracks</CardTitle>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
								<BarChart data={data.topTracks}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="name" />
									<YAxis />
									<Tooltip />
									<Bar dataKey="completions" fill="#3B82F6" />
								</BarChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="completion" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Lesson Completion Rate</CardTitle>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
								<PieChart>
									<Pie
										data={pieChartData}
										cx="50%"
										cy="50%"
										labelLine={false}
										label={({ name, percent }) =>
											`${name} ${(percent * 100).toFixed(0)}%`
										}
										outerRadius={80}
										fill="#8884d8"
										dataKey="value"
									>
										{pieChartData.map((entry) => (
											<Cell key={entry.name} fill={entry.color} />
										))}
									</Pie>
									<Tooltip />
								</PieChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};
