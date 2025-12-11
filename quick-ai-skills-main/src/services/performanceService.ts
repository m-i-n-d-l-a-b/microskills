import React from "react";
import { reportPerformance, addBreadcrumb } from "./monitoringService";
import { ENV } from "@/lib/constants";

// Performance optimization configuration
export interface PerformanceConfig {
	enableCaching: boolean;
	enableLazyLoading: boolean;
	enableCodeSplitting: boolean;
	enableImageOptimization: boolean;
	enableBundleAnalysis: boolean;
	cacheExpiry: number; // milliseconds
	maxCacheSize: number; // number of items
	lazyLoadThreshold: number; // pixels from viewport
	performanceThresholds: {
		slowLoadTime: number; // milliseconds
		slowRenderTime: number; // milliseconds
		memoryWarningThreshold: number; // percentage
	};
}

// Cache entry interface
export interface CacheEntry<T = any> {
	key: string;
	value: T;
	timestamp: number;
	expiry: number;
	size: number;
}

// Performance metrics interface
export interface PerformanceMetrics {
	loadTime: number;
	renderTime: number;
	memoryUsage: number;
	bundleSize: number;
	cacheHitRate: number;
	lazyLoadCount: number;
	codeSplitCount: number;
}

// Lazy load configuration
export interface LazyLoadConfig {
	threshold?: number;
	rootMargin?: string;
	root?: Element | null;
}

// Performance service class
export class PerformanceService {
	private config: PerformanceConfig;
	private cache: Map<string, CacheEntry> = new Map();
	private performanceMetrics: PerformanceMetrics[] = [];
	private isInitialized = false;
	private intersectionObserver?: IntersectionObserver;
	private lazyLoadCallbacks: Map<Element, () => void> = new Map();

	constructor(config: Partial<PerformanceConfig> = {}) {
		this.config = {
			enableCaching: true,
			enableLazyLoading: true,
			enableCodeSplitting: true,
			enableImageOptimization: true,
			enableBundleAnalysis: true,
			cacheExpiry: 5 * 60 * 1000, // 5 minutes
			maxCacheSize: 100,
			lazyLoadThreshold: 100,
			performanceThresholds: {
				slowLoadTime: 3000,
				slowRenderTime: 100,
				memoryWarningThreshold: 80,
			},
			...config,
		};

		this.initialize();
	}

	private initialize(): void {
		if (this.isInitialized) return;

		// Set up performance monitoring
		this.setupPerformanceMonitoring();

		// Set up lazy loading
		if (this.config.enableLazyLoading) {
			this.setupLazyLoading();
		}

		// Set up memory monitoring
		this.setupMemoryMonitoring();

		// Set up bundle analysis
		if (this.config.enableBundleAnalysis) {
			this.setupBundleAnalysis();
		}

		this.isInitialized = true;
		addBreadcrumb("Performance service initialized", "performance");
	}

	// Cache management
	public setCache<T>(key: string, value: T, expiry?: number): void {
		if (!this.config.enableCaching) return;

		const entry: CacheEntry<T> = {
			key,
			value,
			timestamp: Date.now(),
			expiry: expiry || this.config.cacheExpiry,
			size: this.calculateSize(value),
		};

		// Remove oldest entries if cache is full
		if (this.cache.size >= this.config.maxCacheSize) {
			const oldestKey = this.cache.keys().next().value;
			this.cache.delete(oldestKey);
		}

		this.cache.set(key, entry);
		addBreadcrumb(`Cache set: ${key}`, "cache");
	}

	public getCache<T>(key: string): T | null {
		if (!this.config.enableCaching) return null;

		const entry = this.cache.get(key);
		if (!entry) return null;

		// Check if entry has expired
		if (Date.now() - entry.timestamp > entry.expiry) {
			this.cache.delete(key);
			return null;
		}

		addBreadcrumb(`Cache hit: ${key}`, "cache");
		return entry.value as T;
	}

	public clearCache(): void {
		this.cache.clear();
		addBreadcrumb("Cache cleared", "cache");
	}

	public getCacheStats(): {
		size: number;
		hitRate: number;
		totalHits: number;
		totalMisses: number;
	} {
		const totalHits = this.performanceMetrics.reduce(
			(sum, metric) => sum + metric.cacheHitRate,
			0,
		);
		const totalMisses = this.performanceMetrics.length - totalHits;
		const hitRate =
			this.performanceMetrics.length > 0
				? totalHits / this.performanceMetrics.length
				: 0;

		return {
			size: this.cache.size,
			hitRate,
			totalHits,
			totalMisses,
		};
	}

	// Lazy loading utilities
	public setupLazyLoading(): void {
		if (!("IntersectionObserver" in window)) {
			console.warn(
				"IntersectionObserver not supported, falling back to scroll events",
			);
			this.setupScrollBasedLazyLoading();
			return;
		}

		this.intersectionObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const callback = this.lazyLoadCallbacks.get(entry.target);
						if (callback) {
							callback();
							this.lazyLoadCallbacks.delete(entry.target);
							this.intersectionObserver?.unobserve(entry.target);
						}
					}
				});
			},
			{
				threshold: 0.1,
				rootMargin: `${this.config.lazyLoadThreshold}px`,
			},
		);
	}

	public lazyLoadElement(element: Element, callback: () => void): void {
		if (!this.config.enableLazyLoading) {
			callback();
			return;
		}

		this.lazyLoadCallbacks.set(element, callback);
		this.intersectionObserver?.observe(element);
	}

	public lazyLoadImage(
		img: HTMLImageElement,
		src: string,
		placeholder?: string,
	): void {
		if (!this.config.enableLazyLoading) {
			img.src = src;
			return;
		}

		if (placeholder) {
			img.src = placeholder;
		}

		this.lazyLoadElement(img, () => {
			img.src = src;
			addBreadcrumb(`Lazy loaded image: ${src}`, "lazy-load");
		});
	}

	// Code splitting utilities
	public async lazyLoadComponent<T>(
		importFn: () => Promise<{ default: React.ComponentType<T> }>,
		fallback?: React.ComponentType,
	): Promise<React.ComponentType<T>> {
		if (!this.config.enableCodeSplitting) {
			return (await importFn()).default;
		}

		const startTime = performance.now();

		try {
			const component = await importFn();
			const loadTime = performance.now() - startTime;

			addBreadcrumb(
				`Code split loaded in ${loadTime.toFixed(2)}ms`,
				"code-split",
			);

			if (loadTime > this.config.performanceThresholds.slowLoadTime) {
				reportPerformance({
					loadTime,
					renderTime: 0,
					apiResponseTime: 0,
					memoryUsage: 0,
					cpuUsage: 0,
				});
			}

			return component.default;
		} catch (error) {
			addBreadcrumb(`Code split failed: ${error}`, "code-split");
			return fallback || (() => React.createElement("div", null, "Loading..."));
		}
	}

	// Performance monitoring
	private setupPerformanceMonitoring(): void {
		// Monitor page load performance
		if ("performance" in window) {
			window.addEventListener("load", () => {
				const navigation = performance.getEntriesByType(
					"navigation",
				)[0] as PerformanceNavigationTiming;
				if (navigation) {
					const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
					const renderTime =
						navigation.domContentLoadedEventEnd -
						navigation.domContentLoadedEventStart;

					this.recordPerformanceMetrics({
						loadTime,
						renderTime,
						memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
						bundleSize: 0, // Will be calculated separately
						cacheHitRate: this.getCacheStats().hitRate,
						lazyLoadCount: this.lazyLoadCallbacks.size,
						codeSplitCount: 0, // Will be tracked separately
					});

					// Report slow performance
					if (loadTime > this.config.performanceThresholds.slowLoadTime) {
						reportPerformance({
							loadTime,
							renderTime,
							apiResponseTime: 0,
							memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
							cpuUsage: 0,
						});
					}
				}
			});
		}

		// Monitor long tasks
		if ("PerformanceObserver" in window) {
			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					if (
						entry.duration > this.config.performanceThresholds.slowRenderTime
					) {
						reportPerformance({
							loadTime: 0,
							renderTime: entry.duration,
							apiResponseTime: 0,
							memoryUsage: 0,
							cpuUsage: 0,
						});
					}
				}
			});
			observer.observe({ entryTypes: ["longtask"] });
		}
	}

	// Memory monitoring
	private setupMemoryMonitoring(): void {
		if ("memory" in performance) {
			setInterval(() => {
				const memory = (performance as any).memory;
				const usagePercentage =
					(memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

				if (
					usagePercentage >
					this.config.performanceThresholds.memoryWarningThreshold
				) {
					addBreadcrumb(
						`High memory usage: ${usagePercentage.toFixed(1)}%`,
						"memory",
					);

					// Clear cache if memory usage is too high
					if (usagePercentage > 90) {
						this.clearCache();
						addBreadcrumb("Cache cleared due to high memory usage", "memory");
					}
				}
			}, 30000); // Check every 30 seconds
		}
	}

	// Bundle analysis
	private setupBundleAnalysis(): void {
		if (ENV.NODE_ENV === "production") {
			// Calculate bundle size from performance entries
			const resources = performance.getEntriesByType("resource");
			const totalSize = resources.reduce((sum, resource) => {
				return sum + (resource.transferSize || 0);
			}, 0);

			addBreadcrumb(
				`Bundle size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
				"bundle",
			);
		}
	}

	// Scroll-based lazy loading fallback
	private setupScrollBasedLazyLoading(): void {
		let ticking = false;

		const handleScroll = () => {
			if (!ticking) {
				requestAnimationFrame(() => {
					this.checkLazyLoadElements();
					ticking = false;
				});
				ticking = true;
			}
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
	}

	private checkLazyLoadElements(): void {
		const viewportHeight = window.innerHeight;
		const threshold = this.config.lazyLoadThreshold;

		this.lazyLoadCallbacks.forEach((callback, element) => {
			const rect = element.getBoundingClientRect();
			if (rect.top <= viewportHeight + threshold) {
				callback();
				this.lazyLoadCallbacks.delete(element);
			}
		});
	}

	// Utility methods
	private calculateSize(value: any): number {
		try {
			return JSON.stringify(value).length;
		} catch {
			return 0;
		}
	}

	private recordPerformanceMetrics(metrics: PerformanceMetrics): void {
		this.performanceMetrics.push(metrics);

		// Keep only last 100 metrics
		if (this.performanceMetrics.length > 100) {
			this.performanceMetrics = this.performanceMetrics.slice(-100);
		}
	}

	public getPerformanceMetrics(): PerformanceMetrics[] {
		return [...this.performanceMetrics];
	}

	public getAverageMetrics(): Partial<PerformanceMetrics> {
		if (this.performanceMetrics.length === 0) {
			return {};
		}

		const sum = this.performanceMetrics.reduce(
			(acc, metric) => ({
				loadTime: acc.loadTime + metric.loadTime,
				renderTime: acc.renderTime + metric.renderTime,
				memoryUsage: acc.memoryUsage + metric.memoryUsage,
				cacheHitRate: acc.cacheHitRate + metric.cacheHitRate,
				lazyLoadCount: acc.lazyLoadCount + metric.lazyLoadCount,
				codeSplitCount: acc.codeSplitCount + metric.codeSplitCount,
			}),
			{
				loadTime: 0,
				renderTime: 0,
				memoryUsage: 0,
				cacheHitRate: 0,
				lazyLoadCount: 0,
				codeSplitCount: 0,
			},
		);

		const count = this.performanceMetrics.length;
		return {
			loadTime: sum.loadTime / count,
			renderTime: sum.renderTime / count,
			memoryUsage: sum.memoryUsage / count,
			cacheHitRate: sum.cacheHitRate / count,
			lazyLoadCount: sum.lazyLoadCount / count,
			codeSplitCount: sum.codeSplitCount / count,
		};
	}

	public updateConfig(updates: Partial<PerformanceConfig>): void {
		this.config = { ...this.config, ...updates };
		addBreadcrumb("Performance config updated", "performance");
	}

	public getConfig(): PerformanceConfig {
		return { ...this.config };
	}

	public destroy(): void {
		this.intersectionObserver?.disconnect();
		this.lazyLoadCallbacks.clear();
		this.cache.clear();
		this.performanceMetrics = [];
		this.isInitialized = false;
	}
}

// Create singleton instance
export const performanceService = new PerformanceService();

// Export utility functions
export const setCache = <T>(key: string, value: T, expiry?: number): void =>
	performanceService.setCache(key, value, expiry);

export const getCache = <T>(key: string): T | null =>
	performanceService.getCache<T>(key);

export const clearCache = (): void => performanceService.clearCache();

export const getCacheStats = () => performanceService.getCacheStats();

export const lazyLoadElement = (element: Element, callback: () => void): void =>
	performanceService.lazyLoadElement(element, callback);

export const lazyLoadImage = (
	img: HTMLImageElement,
	src: string,
	placeholder?: string,
): void => performanceService.lazyLoadImage(img, src, placeholder);

export const lazyLoadComponent = <T>(
	importFn: () => Promise<{ default: React.ComponentType<T> }>,
	fallback?: React.ComponentType,
): Promise<React.ComponentType<T>> =>
	performanceService.lazyLoadComponent(importFn, fallback);

export const getPerformanceMetrics = () =>
	performanceService.getPerformanceMetrics();

export const getAverageMetrics = () => performanceService.getAverageMetrics();

export const updatePerformanceConfig = (
	updates: Partial<PerformanceConfig>,
): void => performanceService.updateConfig(updates);

export const getPerformanceConfig = () => performanceService.getConfig();

export const destroyPerformanceService = (): void =>
	performanceService.destroy();

export default performanceService;
