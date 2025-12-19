import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
	performanceService,
	setCache,
	getCache,
	clearCache,
	getCacheStats,
	getPerformanceMetrics,
	getAverageMetrics,
	updatePerformanceConfig,
	getPerformanceConfig,
	type PerformanceConfig,
	type PerformanceMetrics,
} from "@/services/performanceService";
import { addBreadcrumb } from "@/services/monitoringService";

// Hook for caching data
export function useCache<T>(
	key: string,
	fetcher: () => Promise<T> | T,
	options: {
		expiry?: number;
		dependencies?: any[];
		enabled?: boolean;
	} = {},
) {
	const { expiry, dependencies = [], enabled = true } = options;
	const [data, setData] = useState<T | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

	const fetchData = useCallback(async () => {
		if (!enabled) return;

		setIsLoading(true);
		setError(null);

		try {
			// Check cache first
			const cachedData = getCache<T>(key);
			if (cachedData) {
				setData(cachedData);
				setLastUpdated(new Date());
				addBreadcrumb(`Cache hit for key: ${key}`, "cache");
				return;
			}

			// Fetch fresh data
			const freshData = await fetcher();
			setData(freshData);
			setLastUpdated(new Date());

			// Cache the data
			setCache(key, freshData, expiry);
			addBreadcrumb(`Data cached for key: ${key}`, "cache");
		} catch (err) {
			const error = err instanceof Error ? err : new Error("Unknown error");
			setError(error);
			addBreadcrumb(`Cache error for key: ${key}: ${error.message}`, "cache");
		} finally {
			setIsLoading(false);
		}
	}, [key, fetcher, expiry, enabled, ...dependencies]);

	const invalidate = useCallback(() => {
		setData(null);
		setLastUpdated(null);
		addBreadcrumb(`Cache invalidated for key: ${key}`, "cache");
	}, [key]);

	const refresh = useCallback(() => {
		invalidate();
		fetchData();
	}, [invalidate, fetchData]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	return {
		data,
		isLoading,
		error,
		lastUpdated,
		invalidate,
		refresh,
	};
}

// Hook for lazy loading components
export function useLazyComponent<T>(
	importFn: () => Promise<{ default: React.ComponentType<T> }>,
	fallback?: React.ComponentType,
) {
	const [Component, setComponent] = useState<React.ComponentType<T> | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const loadComponent = useCallback(async () => {
		if (Component) return Component;

		setIsLoading(true);
		setError(null);

		try {
			const loadedComponent = await performanceService.lazyLoadComponent(
				importFn,
				fallback,
			);
			setComponent(() => loadedComponent);
			return loadedComponent;
		} catch (err) {
			const error =
				err instanceof Error ? err : new Error("Failed to load component");
			setError(error);
			addBreadcrumb(`Lazy load error: ${error.message}`, "lazy-load");
			throw error;
		} finally {
			setIsLoading(false);
		}
	}, [Component, importFn, fallback]);

	return {
		Component,
		isLoading,
		error,
		loadComponent,
	};
}

// Hook for lazy loading images
export function useLazyImage(
	src: string,
	placeholder?: string,
	options: {
		threshold?: number;
		rootMargin?: string;
	} = {},
) {
	const [isLoaded, setIsLoaded] = useState(false);
	const [isInView, setIsInView] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const imgRef = useRef<HTMLImageElement>(null);

	const loadImage = useCallback(() => {
		if (!imgRef.current || isLoaded) return;

		setIsInView(true);

		const img = imgRef.current;
		const actualSrc = src;

		const handleLoad = () => {
			setIsLoaded(true);
			setError(null);
			addBreadcrumb(`Image loaded: ${actualSrc}`, "lazy-load");
		};

		const handleError = () => {
			const error = new Error(`Failed to load image: ${actualSrc}`);
			setError(error);
			addBreadcrumb(`Image load error: ${actualSrc}`, "lazy-load");
		};

		img.addEventListener("load", handleLoad);
		img.addEventListener("error", handleError);

		performanceService.lazyLoadImage(img, actualSrc, placeholder);

		return () => {
			img.removeEventListener("load", handleLoad);
			img.removeEventListener("error", handleError);
		};
	}, [src, placeholder, isLoaded]);

	useEffect(() => {
		loadImage();
	}, [loadImage]);

	return {
		imgRef,
		isLoaded,
		isInView,
		error,
		loadImage,
	};
}

// Hook for performance monitoring
export function usePerformanceMonitoring() {
	const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
	const [averageMetrics, setAverageMetrics] = useState<
		Partial<PerformanceMetrics>
	>({});
	const [cacheStats, setCacheStats] = useState(getCacheStats());
	const [config, setConfig] = useState<PerformanceConfig>(
		getPerformanceConfig(),
	);

	const refreshMetrics = useCallback(() => {
		setMetrics(getPerformanceMetrics());
		setAverageMetrics(getAverageMetrics());
		setCacheStats(getCacheStats());
	}, []);

	const updateConfig = useCallback((updates: Partial<PerformanceConfig>) => {
		updatePerformanceConfig(updates);
		setConfig(getPerformanceConfig());
	}, []);

	const clearAllCache = useCallback(() => {
		clearCache();
		setCacheStats(getCacheStats());
	}, []);

	useEffect(() => {
		refreshMetrics();

		// Refresh metrics every 30 seconds
		const interval = setInterval(refreshMetrics, 30000);

		return () => clearInterval(interval);
	}, [refreshMetrics]);

	return {
		metrics,
		averageMetrics,
		cacheStats,
		config,
		refreshMetrics,
		updateConfig,
		clearAllCache,
	};
}

// Hook for performance optimization
export function usePerformanceOptimization() {
	const [isOptimized, setIsOptimized] = useState(false);
	const [optimizationStats, setOptimizationStats] = useState({
		cacheHits: 0,
		lazyLoads: 0,
		codeSplits: 0,
		memorySavings: 0,
	});

	const optimize = useCallback(() => {
		// Enable all performance optimizations
		updatePerformanceConfig({
			enableCaching: true,
			enableLazyLoading: true,
			enableCodeSplitting: true,
			enableImageOptimization: true,
			enableBundleAnalysis: true,
		});

		setIsOptimized(true);
		addBreadcrumb("Performance optimizations enabled", "performance");
	}, []);

	const disableOptimizations = useCallback(() => {
		updatePerformanceConfig({
			enableCaching: false,
			enableLazyLoading: false,
			enableCodeSplitting: false,
			enableImageOptimization: false,
			enableBundleAnalysis: false,
		});

		setIsOptimized(false);
		addBreadcrumb("Performance optimizations disabled", "performance");
	}, []);

	const getOptimizationStats = useCallback(() => {
		const stats = getCacheStats();
		const metrics = getAverageMetrics();

		setOptimizationStats({
			cacheHits: stats.totalHits,
			lazyLoads: metrics.lazyLoadCount || 0,
			codeSplits: metrics.codeSplitCount || 0,
			memorySavings: 0, // Calculate based on cache size and memory usage
		});

		return optimizationStats;
	}, [optimizationStats]);

	useEffect(() => {
		// Auto-optimize on mount
		optimize();
	}, [optimize]);

	return {
		isOptimized,
		optimizationStats,
		optimize,
		disableOptimizations,
		getOptimizationStats,
	};
}

// Hook for memory monitoring
export function useMemoryMonitoring() {
	const [memoryUsage, setMemoryUsage] = useState<{
		used: number;
		total: number;
		percentage: number;
	} | null>(null);

	const [isHighMemory, setIsHighMemory] = useState(false);

	const checkMemory = useCallback(() => {
		if ("memory" in performance) {
			const memory = (performance as any).memory;
			const used = memory.usedJSHeapSize;
			const total = memory.jsHeapSizeLimit;
			const percentage = (used / total) * 100;

			setMemoryUsage({
				used,
				total,
				percentage,
			});

			setIsHighMemory(percentage > 80);

			if (percentage > 90) {
				addBreadcrumb(
					`Critical memory usage: ${percentage.toFixed(1)}%`,
					"memory",
				);
			} else if (percentage > 80) {
				addBreadcrumb(`High memory usage: ${percentage.toFixed(1)}%`, "memory");
			}
		}
	}, []);

	useEffect(() => {
		checkMemory();

		const interval = setInterval(checkMemory, 10000); // Check every 10 seconds

		return () => clearInterval(interval);
	}, [checkMemory]);

	return {
		memoryUsage,
		isHighMemory,
		checkMemory,
	};
}

// Hook for bundle analysis
export function useBundleAnalysis() {
	const [bundleSize, setBundleSize] = useState<{
		total: number;
		js: number;
		css: number;
		images: number;
		other: number;
	} | null>(null);

	const analyzeBundle = useCallback(() => {
		if ("performance" in window) {
			const resources = performance.getEntriesByType("resource");

			const analysis = resources.reduce(
				(acc, resource) => {
					const size = resource.transferSize || 0;
					const name = resource.name.toLowerCase();

					if (name.includes(".js")) {
						acc.js += size;
					} else if (name.includes(".css")) {
						acc.css += size;
					} else if (
						name.includes(".png") ||
						name.includes(".jpg") ||
						name.includes(".jpeg") ||
						name.includes(".gif") ||
						name.includes(".svg")
					) {
						acc.images += size;
					} else {
						acc.other += size;
					}

					acc.total += size;
					return acc;
				},
				{ total: 0, js: 0, css: 0, images: 0, other: 0 },
			);

			setBundleSize(analysis);
			addBreadcrumb(
				`Bundle analyzed: ${(analysis.total / 1024 / 1024).toFixed(2)}MB total`,
				"bundle",
			);
		}
	}, []);

	useEffect(() => {
		// Analyze bundle after page load
		const handleLoad = () => {
			setTimeout(analyzeBundle, 1000); // Wait for all resources to load
		};

		if (document.readyState === "complete") {
			handleLoad();
		} else {
			window.addEventListener("load", handleLoad);
			return () => window.removeEventListener("load", handleLoad);
		}
	}, [analyzeBundle]);

	return {
		bundleSize,
		analyzeBundle,
	};
}

// Hook for performance thresholds
export function usePerformanceThresholds() {
	const [thresholds, setThresholds] = useState({
		slowLoadTime: 3000,
		slowRenderTime: 100,
		memoryWarningThreshold: 80,
	});

	const [violations, setViolations] = useState<{
		slowLoads: number;
		slowRenders: number;
		memoryWarnings: number;
	}>({
		slowLoads: 0,
		slowRenders: 0,
		memoryWarnings: 0,
	});

	const updateThresholds = useCallback(
		(newThresholds: Partial<typeof thresholds>) => {
			setThresholds((prev) => ({ ...prev, ...newThresholds }));
			updatePerformanceConfig({
				performanceThresholds: { ...thresholds, ...newThresholds },
			});
		},
		[thresholds],
	);

	const resetViolations = useCallback(() => {
		setViolations({
			slowLoads: 0,
			slowRenders: 0,
			memoryWarnings: 0,
		});
	}, []);

	return {
		thresholds,
		violations,
		updateThresholds,
		resetViolations,
	};
}
