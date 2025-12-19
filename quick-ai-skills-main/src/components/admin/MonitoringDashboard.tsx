import type React from "react";
import { useState, useEffect, useCallback } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	AlertTriangle,
	Activity,
	Bug,
	BarChart3,
	RefreshCw,
	Trash2,
	Download,
	Server,
	Wifi,
	Shield,
	CheckCircle,
	XCircle,
	Info,
} from "lucide-react";
import {
	getMonitoringStats,
	clearMonitoringQueues,
	getErrorStats,
} from "@/services/monitoringService";
import { getPerformanceStats, getLogEntries } from "@/utils/interceptors";
import { ErrorSeverity, ErrorCategory } from "@/utils/errorHandling";

interface MonitoringStats {
	errors: number;
	performance: number;
	analytics: number;
	crashes: number;
	queueSizes: {
		errors: number;
		performance: number;
		analytics: number;
		crashes: number;
	};
}

interface PerformanceStats {
	totalRequests: number;
	averageResponseTime: number;
	successRate: number;
	errorRate: number;
	requestsByMethod: Record<string, number>;
	requestsByStatus: Record<number, number>;
}

interface ErrorStats {
	totalErrors: number;
	errorsByCategory: Record<ErrorCategory, number>;
	errorsBySeverity: Record<ErrorSeverity, number>;
	recentErrors: Array<{
		id: string;
		message: string;
		category: ErrorCategory;
		severity: ErrorSeverity;
		timestamp: string;
	}>;
	resolutionRate: number;
}

interface LogEntry {
	id: string;
	message: string;
	level: string;
	timestamp: string;
}

export const MonitoringDashboard: React.FC = () => {
	const [monitoringStats, setMonitoringStats] =
		useState<MonitoringStats | null>(null);
	const [performanceStats, setPerformanceStats] =
		useState<PerformanceStats | null>(null);
	const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
	const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

	const refreshData = useCallback(async () => {
		setIsLoading(true);
		try {
			const [monitoring, performance, errors, logs] = await Promise.all([
				getMonitoringStats(),
				getPerformanceStats(),
				getErrorStats(),
				getLogEntries(),
			]);

			setMonitoringStats(monitoring);
			setPerformanceStats(performance);
			setErrorStats(errors);
			setLogEntries(logs.slice(-50)); // Last 50 log entries
			setLastRefresh(new Date());
		} catch (error) {
			console.error("Failed to refresh monitoring data:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const clearAllData = async () => {
		try {
			clearMonitoringQueues();
			await refreshData();
		} catch (error) {
			console.error("Failed to clear monitoring data:", error);
		}
	};

	const exportData = () => {
		const data = {
			monitoringStats,
			performanceStats,
			errorStats,
			logEntries,
			exportedAt: new Date().toISOString(),
		};

		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `monitoring-data-${new Date().toISOString().split("T")[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	useEffect(() => {
		refreshData();

		// Auto-refresh every 30 seconds
		const interval = setInterval(refreshData, 30000);

		return () => clearInterval(interval);
	}, [refreshData]);

	const getSeverityColor = (severity: ErrorSeverity) => {
		switch (severity) {
			case ErrorSeverity.CRITICAL:
				return "bg-red-500 text-white";
			case ErrorSeverity.HIGH:
				return "bg-orange-500 text-white";
			case ErrorSeverity.MEDIUM:
				return "bg-yellow-500 text-black";
			case ErrorSeverity.LOW:
				return "bg-blue-500 text-white";
			default:
				return "bg-gray-500 text-white";
		}
	};

	const getCategoryIcon = (category: ErrorCategory) => {
		switch (category) {
			case ErrorCategory.NETWORK:
				return <Wifi className="h-4 w-4" />;
			case ErrorCategory.AUTHENTICATION:
				return <Shield className="h-4 w-4" />;
			case ErrorCategory.SERVER:
				return <Server className="h-4 w-4" />;
			case ErrorCategory.VALIDATION:
				return <CheckCircle className="h-4 w-4" />;
			default:
				return <Bug className="h-4 w-4" />;
		}
	};

	const getStatusColor = (status: number) => {
		if (status >= 500) return "text-red-500";
		if (status >= 400) return "text-orange-500";
		if (status >= 300) return "text-blue-500";
		if (status >= 200) return "text-green-500";
		return "text-gray-500";
	};

	if (isLoading && !monitoringStats) {
		return (
			<div className="flex items-center justify-center h-64">
				<RefreshCw className="h-8 w-8 animate-spin" />
				<span className="ml-2">Loading monitoring data...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
					<p className="text-muted-foreground">
						Real-time monitoring and error tracking
					</p>
				</div>
				<div className="flex gap-2">
					<Button onClick={refreshData} disabled={isLoading} className="gap-2">
						<RefreshCw
							className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
						/>
						Refresh
					</Button>
					<Button variant="outline" onClick={exportData} className="gap-2">
						<Download className="h-4 w-4" />
						Export
					</Button>
					<Button
						variant="destructive"
						onClick={clearAllData}
						className="gap-2"
					>
						<Trash2 className="h-4 w-4" />
						Clear All
					</Button>
				</div>
			</div>

			{/* Last Updated */}
			<div className="text-sm text-muted-foreground">
				Last updated: {lastRefresh.toLocaleString()}
			</div>

			{/* Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Errors</CardTitle>
						<AlertTriangle className="h-4 w-4 text-red-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{monitoringStats?.errors || 0}
						</div>
						<p className="text-xs text-muted-foreground">
							{errorStats?.totalErrors || 0} total tracked
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Performance Issues
						</CardTitle>
						<Activity className="h-4 w-4 text-orange-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{monitoringStats?.performance || 0}
						</div>
						<p className="text-xs text-muted-foreground">
							{performanceStats?.totalRequests || 0} requests tracked
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Success Rate</CardTitle>
						<CheckCircle className="h-4 w-4 text-green-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{performanceStats?.successRate
								? `${performanceStats.successRate.toFixed(1)}%`
								: "0%"}
						</div>
						<p className="text-xs text-muted-foreground">
							{performanceStats?.errorRate
								? `${performanceStats.errorRate.toFixed(1)}%`
								: "0%"}{" "}
							error rate
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Crashes</CardTitle>
						<Bug className="h-4 w-4 text-red-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{monitoringStats?.crashes || 0}
						</div>
						<p className="text-xs text-muted-foreground">
							Application crashes detected
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Main Content Tabs */}
			<Tabs defaultValue="overview" className="space-y-4">
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="errors">Errors</TabsTrigger>
					<TabsTrigger value="performance">Performance</TabsTrigger>
					<TabsTrigger value="logs">Logs</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="space-y-4">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{/* Error Categories */}
						<Card>
							<CardHeader>
								<CardTitle>Error Categories</CardTitle>
								<CardDescription>
									Distribution of errors by category
								</CardDescription>
							</CardHeader>
							<CardContent>
								{errorStats?.errorsByCategory &&
									Object.entries(errorStats.errorsByCategory).map(
										([category, count]) => (
											<div
												key={category}
												className="flex items-center justify-between py-2"
											>
												<div className="flex items-center gap-2">
													{getCategoryIcon(category as ErrorCategory)}
													<span className="capitalize">{category}</span>
												</div>
												<Badge variant="secondary">{count}</Badge>
											</div>
										),
									)}
							</CardContent>
						</Card>

						{/* Error Severity */}
						<Card>
							<CardHeader>
								<CardTitle>Error Severity</CardTitle>
								<CardDescription>
									Distribution of errors by severity
								</CardDescription>
							</CardHeader>
							<CardContent>
								{errorStats?.errorsBySeverity &&
									Object.entries(errorStats.errorsBySeverity).map(
										([severity, count]) => (
											<div
												key={severity}
												className="flex items-center justify-between py-2"
											>
												<Badge
													className={getSeverityColor(
														severity as ErrorSeverity,
													)}
												>
													{severity.toUpperCase()}
												</Badge>
												<span>{count}</span>
											</div>
										),
									)}
							</CardContent>
						</Card>
					</div>

					{/* Performance Metrics */}
					<Card>
						<CardHeader>
							<CardTitle>Performance Metrics</CardTitle>
							<CardDescription>Key performance indicators</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<div className="text-sm font-medium">
										Average Response Time
									</div>
									<div className="text-2xl font-bold">
										{performanceStats?.averageResponseTime
											? `${performanceStats.averageResponseTime.toFixed(2)}ms`
											: "0ms"}
									</div>
								</div>
								<div>
									<div className="text-sm font-medium">Total Requests</div>
									<div className="text-2xl font-bold">
										{performanceStats?.totalRequests || 0}
									</div>
								</div>
								<div>
									<div className="text-sm font-medium">Resolution Rate</div>
									<div className="text-2xl font-bold">
										{errorStats?.resolutionRate
											? `${errorStats.resolutionRate.toFixed(1)}%`
											: "0%"}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="errors" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Recent Errors</CardTitle>
							<CardDescription>
								Latest error reports and their details
							</CardDescription>
						</CardHeader>
						<CardContent>
							{errorStats?.recentErrors &&
							errorStats.recentErrors.length > 0 ? (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Time</TableHead>
											<TableHead>Error</TableHead>
											<TableHead>Category</TableHead>
											<TableHead>Severity</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{errorStats.recentErrors.map((error) => (
											<TableRow key={error.id}>
												<TableCell className="text-sm">
													{new Date(error.timestamp).toLocaleString()}
												</TableCell>
												<TableCell className="max-w-xs truncate">
													{error.error.message}
												</TableCell>
												<TableCell>
													<Badge variant="outline" className="gap-1">
														{getCategoryIcon(error.category)}
														{error.category}
													</Badge>
												</TableCell>
												<TableCell>
													<Badge className={getSeverityColor(error.severity)}>
														{error.severity}
													</Badge>
												</TableCell>
												<TableCell>
													{error.resolved ? (
														<CheckCircle className="h-4 w-4 text-green-500" />
													) : (
														<XCircle className="h-4 w-4 text-red-500" />
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							) : (
								<Alert>
									<Info className="h-4 w-4" />
									<AlertDescription>No errors reported yet.</AlertDescription>
								</Alert>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="performance" className="space-y-4">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{/* Request Methods */}
						<Card>
							<CardHeader>
								<CardTitle>Requests by Method</CardTitle>
								<CardDescription>Distribution of HTTP methods</CardDescription>
							</CardHeader>
							<CardContent>
								{performanceStats?.requestsByMethod &&
									Object.entries(performanceStats.requestsByMethod).map(
										([method, count]) => (
											<div
												key={method}
												className="flex items-center justify-between py-2"
											>
												<Badge variant="outline">{method}</Badge>
												<span>{count}</span>
											</div>
										),
									)}
							</CardContent>
						</Card>

						{/* Response Status Codes */}
						<Card>
							<CardHeader>
								<CardTitle>Response Status Codes</CardTitle>
								<CardDescription>
									Distribution of HTTP status codes
								</CardDescription>
							</CardHeader>
							<CardContent>
								{performanceStats?.requestsByStatus &&
									Object.entries(performanceStats.requestsByStatus).map(
										([status, count]) => (
											<div
												key={status}
												className="flex items-center justify-between py-2"
											>
												<span className={getStatusColor(parseInt(status, 10))}>
													{status}
												</span>
												<span>{count}</span>
											</div>
										),
									)}
							</CardContent>
						</Card>
					</div>

					{/* Performance Chart Placeholder */}
					<Card>
						<CardHeader>
							<CardTitle>Response Time Trend</CardTitle>
							<CardDescription>Average response time over time</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="h-64 flex items-center justify-center text-muted-foreground">
								<BarChart3 className="h-12 w-12" />
								<span className="ml-2">Performance chart coming soon</span>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="logs" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Recent Log Entries</CardTitle>
							<CardDescription>Latest application logs</CardDescription>
						</CardHeader>
						<CardContent>
							{logEntries.length > 0 ? (
								<div className="space-y-2 max-h-96 overflow-y-auto">
									{logEntries.map((log) => (
										<div
											key={log.id}
											className="flex items-start gap-2 p-2 rounded border"
										>
											<div className="flex-shrink-0">
												{log.level === "error" && (
													<XCircle className="h-4 w-4 text-red-500" />
												)}
												{log.level === "warn" && (
													<AlertTriangle className="h-4 w-4 text-orange-500" />
												)}
												{log.level === "info" && (
													<Info className="h-4 w-4 text-blue-500" />
												)}
												{log.level === "debug" && (
													<Bug className="h-4 w-4 text-gray-500" />
												)}
											</div>
											<div className="flex-1 min-w-0">
												<div className="text-sm font-medium">{log.message}</div>
												<div className="text-xs text-muted-foreground">
													{new Date(log.timestamp).toLocaleString()}
													{log.requestId && ` • Request: ${log.requestId}`}
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<Alert>
									<Info className="h-4 w-4" />
									<AlertDescription>No log entries available.</AlertDescription>
								</Alert>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default MonitoringDashboard;
