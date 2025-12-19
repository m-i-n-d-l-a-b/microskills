import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Activity,
	Zap,
	Database,
	Code,
	Memory,
	Settings,
	RefreshCw,
	Trash2,
	TrendingUp,
	Clock,
	HardDrive,
	AlertTriangle,
	CheckCircle,
	XCircle,
} from "lucide-react";
import {
	usePerformanceMonitoring,
	usePerformanceOptimization,
	useMemoryMonitoring,
	useBundleAnalysis,
	usePerformanceThresholds,
} from "@/hooks/usePerformance";
import { getPerformanceConfig } from "@/services/performanceService";

interface PerformanceStats {
	loadTime: number;
	renderTime: number;
	memoryUsage: number;
	cacheHitRate: number;
	lazyLoadCount: number;
	codeSplitCount: number;
}

interface CacheStats {
	size: number;
	hitRate: number;
	totalHits: number;
	totalMisses: number;
}

export const PerformanceDashboard: React.FC = () => {
	const [isLoading, setIsLoading] = useState(true);
	const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
	const [performanceStats, setPerformanceStats] =
		useState<PerformanceStats | null>(null);
	const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
	const [config, setConfig] = useState(getPerformanceConfig());

	const {
		averageMetrics,
		cacheStats: hookCacheStats,
		config: hookConfig,
		refreshMetrics,
		clearAllCache,
	} = usePerformanceMonitoring();

	const {
		isOptimized,
		optimizationStats,
		optimize,
		disableOptimizations,
		getOptimizationStats,
	} = usePerformanceOptimization();

	const { memoryUsage, isHighMemory, checkMemory } = useMemoryMonitoring();

	const { bundleSize, analyzeBundle } = useBundleAnalysis();

	const { thresholds, violations, updateThresholds, resetViolations } =
		usePerformanceThresholds();

	const refreshData = useCallback(async () => {
		setIsLoading(true);
		try {
			await Promise.all([
				refreshMetrics(),
				checkMemory(),
				analyzeBundle(),
				getOptimizationStats(),
			]);
			setPerformanceStats({
				loadTime: averageMetrics.loadTime || 0,
				renderTime: averageMetrics.renderTime || 0,
				memoryUsage: averageMetrics.memoryUsage || 0,
				cacheHitRate: averageMetrics.cacheHitRate || 0,
				lazyLoadCount: averageMetrics.lazyLoadCount || 0,
				codeSplitCount: averageMetrics.codeSplitCount || 0,
			});
			setCacheStats(hookCacheStats);
			setConfig(hookConfig);
			setLastRefresh(new Date());
		} catch (error) {
			console.error("Failed to refresh performance data:", error);
		} finally {
			setIsLoading(false);
		}
	}, [
		refreshMetrics,
		checkMemory,
		analyzeBundle,
		getOptimizationStats,
		averageMetrics,
		hookCacheStats,
		hookConfig,
	]);

	const handleOptimize = () => {
		optimize();
		refreshData();
	};

	const handleDisableOptimizations = () => {
		disableOptimizations();
		refreshData();
	};

	const handleClearCache = () => {
		clearAllCache();
		refreshData();
	};

	const handleUpdateThresholds = (
		newThresholds: Partial<typeof thresholds>,
	) => {
		updateThresholds(newThresholds);
		refreshData();
	};

	useEffect(() => {
		refreshData();

		// Auto-refresh every 30 seconds
		const interval = setInterval(refreshData, 30000);

		return () => clearInterval(interval);
	}, [refreshData]);

	const getPerformanceStatus = () => {
		if (!performanceStats) return "unknown";

		const { loadTime, renderTime, cacheHitRate } = performanceStats;

		if (loadTime < 1000 && renderTime < 50 && cacheHitRate > 0.8) {
			return "excellent";
		} else if (loadTime < 2000 && renderTime < 100 && cacheHitRate > 0.6) {
			return "good";
		} else if (loadTime < 3000 && renderTime < 150 && cacheHitRate > 0.4) {
			return "fair";
		} else {
			return "poor";
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "excellent":
				return "text-green-600";
			case "good":
				return "text-blue-600";
			case "fair":
				return "text-yellow-600";
			case "poor":
				return "text-red-600";
			default:
				return "text-gray-600";
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "excellent":
				return <CheckCircle className="h-4 w-4" />;
			case "good":
				return <TrendingUp className="h-4 w-4" />;
			case "fair":
				return <AlertTriangle className="h-4 w-4" />;
			case "poor":
				return <XCircle className="h-4 w-4" />;
			default:
				return <Activity className="h-4 w-4" />;
		}
	};

	if (isLoading && !performanceStats) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="flex items-center gap-2">
					<RefreshCw className="h-6 w-6 animate-spin" />
					<span>Loading performance data...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Performance Dashboard</h1>
					<p className="text-muted-foreground">
						Monitor and optimize application performance
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant={isOptimized ? "default" : "secondary"}>
						{isOptimized ? "Optimized" : "Not Optimized"}
					</Badge>
					<Button onClick={refreshData} variant="outline" size="sm">
						<RefreshCw className="h-4 w-4 mr-2" />
						Refresh
					</Button>
				</div>
			</div>

			{/* Last Updated */}
			<div className="text-sm text-muted-foreground">
				Last updated: {lastRefresh.toLocaleTimeString()}
			</div>

			{/* Performance Status */}
			{performanceStats && (
				<Alert>
					<Activity className="h-4 w-4" />
					<AlertDescription>
						Overall Performance:
						<span
							className={`ml-2 font-semibold ${getStatusColor(getPerformanceStatus())}`}
						>
							{getPerformanceStatus().toUpperCase()}
						</span>
						<span className="ml-2">
							{getStatusIcon(getPerformanceStatus())}
						</span>
					</AlertDescription>
				</Alert>
			)}

			{/* Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Load Time</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{performanceStats?.loadTime
								? `${performanceStats.loadTime.toFixed(0)}ms`
								: "N/A"}
						</div>
						<p className="text-xs text-muted-foreground">
							Average page load time
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
						<Memory className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{memoryUsage ? `${(memoryUsage.percentage).toFixed(1)}%` : "N/A"}
						</div>
						<p className="text-xs text-muted-foreground">
							{memoryUsage
								? `${(memoryUsage.used / 1024 / 1024).toFixed(1)}MB / ${(memoryUsage.total / 1024 / 1024).toFixed(1)}MB`
								: "Memory usage"}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Cache Hit Rate
						</CardTitle>
						<Database className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{cacheStats ? `${(cacheStats.hitRate * 100).toFixed(1)}%` : "N/A"}
						</div>
						<p className="text-xs text-muted-foreground">
							{cacheStats
								? `${cacheStats.totalHits} hits, ${cacheStats.totalMisses} misses`
								: "Cache performance"}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Bundle Size</CardTitle>
						<HardDrive className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{bundleSize
								? `${(bundleSize.total / 1024 / 1024).toFixed(2)}MB`
								: "N/A"}
						</div>
						<p className="text-xs text-muted-foreground">
							Total application bundle size
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Main Content Tabs */}
			<Tabs defaultValue="overview" className="space-y-4">
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="optimization">Optimization</TabsTrigger>
					<TabsTrigger value="monitoring">Monitoring</TabsTrigger>
					<TabsTrigger value="settings">Settings</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="space-y-4">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Performance Metrics */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<TrendingUp className="h-5 w-5" />
									Performance Metrics
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<div className="flex justify-between text-sm mb-1">
										<span>Render Time</span>
										<span>
											{performanceStats?.renderTime
												? `${performanceStats.renderTime.toFixed(0)}ms`
												: "N/A"}
										</span>
									</div>
									<Progress
										value={
											performanceStats?.renderTime
												? Math.min(
														(performanceStats.renderTime / 200) * 100,
														100,
													)
												: 0
										}
									/>
								</div>
								<div>
									<div className="flex justify-between text-sm mb-1">
										<span>Lazy Loads</span>
										<span>{performanceStats?.lazyLoadCount || 0}</span>
									</div>
									<Progress
										value={
											performanceStats?.lazyLoadCount
												? Math.min(
														(performanceStats.lazyLoadCount / 10) * 100,
														100,
													)
												: 0
										}
									/>
								</div>
								<div>
									<div className="flex justify-between text-sm mb-1">
										<span>Code Splits</span>
										<span>{performanceStats?.codeSplitCount || 0}</span>
									</div>
									<Progress
										value={
											performanceStats?.codeSplitCount
												? Math.min(
														(performanceStats.codeSplitCount / 5) * 100,
														100,
													)
												: 0
										}
									/>
								</div>
							</CardContent>
						</Card>

						{/* Bundle Analysis */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Code className="h-5 w-5" />
									Bundle Analysis
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{bundleSize ? (
									<>
										<div>
											<div className="flex justify-between text-sm mb-1">
												<span>JavaScript</span>
												<span>
													{(bundleSize.js / 1024 / 1024).toFixed(2)}MB
												</span>
											</div>
											<Progress
												value={(bundleSize.js / bundleSize.total) * 100}
											/>
										</div>
										<div>
											<div className="flex justify-between text-sm mb-1">
												<span>CSS</span>
												<span>
													{(bundleSize.css / 1024 / 1024).toFixed(2)}MB
												</span>
											</div>
											<Progress
												value={(bundleSize.css / bundleSize.total) * 100}
											/>
										</div>
										<div>
											<div className="flex justify-between text-sm mb-1">
												<span>Images</span>
												<span>
													{(bundleSize.images / 1024 / 1024).toFixed(2)}MB
												</span>
											</div>
											<Progress
												value={(bundleSize.images / bundleSize.total) * 100}
											/>
										</div>
									</>
								) : (
									<p className="text-muted-foreground">
										Bundle analysis not available
									</p>
								)}
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="optimization" className="space-y-4">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Optimization Controls */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Zap className="h-5 w-5" />
									Optimization Controls
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">
										Performance Optimizations
									</span>
									<Badge variant={isOptimized ? "default" : "secondary"}>
										{isOptimized ? "Enabled" : "Disabled"}
									</Badge>
								</div>
								<div className="flex gap-2">
									<Button
										onClick={handleOptimize}
										disabled={isOptimized}
										size="sm"
									>
										Enable Optimizations
									</Button>
									<Button
										onClick={handleDisableOptimizations}
										disabled={!isOptimized}
										variant="outline"
										size="sm"
									>
										Disable Optimizations
									</Button>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">Cache Management</span>
									<Button
										onClick={handleClearCache}
										variant="outline"
										size="sm"
									>
										<Trash2 className="h-4 w-4 mr-2" />
										Clear Cache
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* Optimization Stats */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Activity className="h-5 w-5" />
									Optimization Statistics
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<div className="text-2xl font-bold">
											{optimizationStats.cacheHits}
										</div>
										<div className="text-xs text-muted-foreground">
											Cache Hits
										</div>
									</div>
									<div>
										<div className="text-2xl font-bold">
											{optimizationStats.lazyLoads}
										</div>
										<div className="text-xs text-muted-foreground">
											Lazy Loads
										</div>
									</div>
									<div>
										<div className="text-2xl font-bold">
											{optimizationStats.codeSplits}
										</div>
										<div className="text-xs text-muted-foreground">
											Code Splits
										</div>
									</div>
									<div>
										<div className="text-2xl font-bold">
											{optimizationStats.memorySavings}MB
										</div>
										<div className="text-xs text-muted-foreground">
											Memory Saved
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="monitoring" className="space-y-4">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Memory Monitoring */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Memory className="h-5 w-5" />
									Memory Monitoring
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{memoryUsage ? (
									<>
										<div>
											<div className="flex justify-between text-sm mb-1">
												<span>Memory Usage</span>
												<span>{memoryUsage.percentage.toFixed(1)}%</span>
											</div>
											<Progress
												value={memoryUsage.percentage}
												className={isHighMemory ? "bg-red-100" : ""}
											/>
										</div>
										<div className="text-sm text-muted-foreground">
											Used: {(memoryUsage.used / 1024 / 1024).toFixed(1)}MB /{" "}
											{(memoryUsage.total / 1024 / 1024).toFixed(1)}MB
										</div>
										{isHighMemory && (
											<Alert>
												<AlertTriangle className="h-4 w-4" />
												<AlertDescription>
													High memory usage detected. Consider clearing cache or
													optimizing memory usage.
												</AlertDescription>
											</Alert>
										)}
									</>
								) : (
									<p className="text-muted-foreground">
										Memory monitoring not available
									</p>
								)}
							</CardContent>
						</Card>

						{/* Performance Violations */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<AlertTriangle className="h-5 w-5" />
									Performance Violations
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 gap-2">
									<div className="flex justify-between">
										<span className="text-sm">Slow Loads</span>
										<Badge
											variant={
												violations.slowLoads > 0 ? "destructive" : "secondary"
											}
										>
											{violations.slowLoads}
										</Badge>
									</div>
									<div className="flex justify-between">
										<span className="text-sm">Slow Renders</span>
										<Badge
											variant={
												violations.slowRenders > 0 ? "destructive" : "secondary"
											}
										>
											{violations.slowRenders}
										</Badge>
									</div>
									<div className="flex justify-between">
										<span className="text-sm">Memory Warnings</span>
										<Badge
											variant={
												violations.memoryWarnings > 0
													? "destructive"
													: "secondary"
											}
										>
											{violations.memoryWarnings}
										</Badge>
									</div>
								</div>
								<Button onClick={resetViolations} variant="outline" size="sm">
									Reset Violations
								</Button>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="settings" className="space-y-4">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Performance Configuration */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Settings className="h-5 w-5" />
									Performance Configuration
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-sm">Caching</span>
										<Badge
											variant={config.enableCaching ? "default" : "secondary"}
										>
											{config.enableCaching ? "Enabled" : "Disabled"}
										</Badge>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm">Lazy Loading</span>
										<Badge
											variant={
												config.enableLazyLoading ? "default" : "secondary"
											}
										>
											{config.enableLazyLoading ? "Enabled" : "Disabled"}
										</Badge>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm">Code Splitting</span>
										<Badge
											variant={
												config.enableCodeSplitting ? "default" : "secondary"
											}
										>
											{config.enableCodeSplitting ? "Enabled" : "Disabled"}
										</Badge>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm">Bundle Analysis</span>
										<Badge
											variant={
												config.enableBundleAnalysis ? "default" : "secondary"
											}
										>
											{config.enableBundleAnalysis ? "Enabled" : "Disabled"}
										</Badge>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Performance Thresholds */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Clock className="h-5 w-5" />
									Performance Thresholds
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<label
										htmlFor="slow-load-time"
										className="text-sm font-medium"
									>
										Slow Load Time (ms)
									</label>
									<input
										id="slow-load-time"
										type="number"
										value={thresholds.slowLoadTime}
										onChange={(e) =>
											handleUpdateThresholds({
												slowLoadTime: parseInt(e.target.value, 10),
											})
										}
										className="w-full mt-1 px-3 py-2 border rounded-md"
									/>
								</div>
								<div>
									<label
										htmlFor="slow-render-time"
										className="text-sm font-medium"
									>
										Slow Render Time (ms)
									</label>
									<input
										id="slow-render-time"
										type="number"
										value={thresholds.slowRenderTime}
										onChange={(e) =>
											handleUpdateThresholds({
												slowRenderTime: parseInt(e.target.value, 10),
											})
										}
										className="w-full mt-1 px-3 py-2 border rounded-md"
									/>
								</div>
								<div>
									<label
										htmlFor="memory-warning-threshold"
										className="text-sm font-medium"
									>
										Memory Warning Threshold (%)
									</label>
									<input
										id="memory-warning-threshold"
										type="number"
										value={thresholds.memoryWarningThreshold}
										onChange={(e) =>
											handleUpdateThresholds({
												memoryWarningThreshold: parseInt(e.target.value, 10),
											})
										}
										className="w-full mt-1 px-3 py-2 border rounded-md"
									/>
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default PerformanceDashboard;
