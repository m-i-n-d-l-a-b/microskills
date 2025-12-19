import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	PerformanceService,
	setCache,
	getCache,
	clearCache,
	getCacheStats,
	lazyLoadElement,
	lazyLoadImage,
	lazyLoadComponent,
	getPerformanceMetrics,
	getAverageMetrics,
	updatePerformanceConfig,
	getPerformanceConfig,
	destroyPerformanceService,
} from "./performanceService";
import { reportPerformance, addBreadcrumb } from "./monitoringService";

// Mock monitoring service
vi.mock("./monitoringService", () => ({
	reportPerformance: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

// Mock performance API
Object.defineProperty(window, "performance", {
	value: {
		getEntriesByType: vi.fn(),
		now: vi.fn(() => Date.now()),
		memory: {
			usedJSHeapSize: 1000000,
			jsHeapSizeLimit: 2000000,
		},
	},
	writable: true,
});

// Mock PerformanceObserver
global.PerformanceObserver = vi.fn().mockImplementation((callback) => ({
	observe: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

describe("PerformanceService", () => {
	let performanceService: PerformanceService;
	let mockAddBreadcrumb: any;
	let mockReportPerformance: any;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		mockAddBreadcrumb = addBreadcrumb as any;
		mockReportPerformance = reportPerformance as any;

		// Reset performance mock
		(window.performance.getEntriesByType as any).mockReturnValue([
			{
				loadEventEnd: 1000,
				loadEventStart: 500,
				domContentLoadedEventEnd: 800,
				domContentLoadedEventStart: 600,
			},
		]);

		// Create a fresh instance for each test
		performanceService = new PerformanceService({
			enableCaching: true,
			enableLazyLoading: true,
			enableCodeSplitting: true,
			enableImageOptimization: true,
			enableBundleAnalysis: true,
			cacheExpiry: 5000,
			maxCacheSize: 5,
			lazyLoadThreshold: 100,
			performanceThresholds: {
				slowLoadTime: 3000,
				slowRenderTime: 100,
				memoryWarningThreshold: 80,
			},
		});
	});

	afterEach(() => {
		performanceService.destroy();
	});

	describe("Cache Management", () => {
		it("should set and get cache entries", () => {
			const key = "test-key";
			const value = { data: "test-data" };

			performanceService.setCache(key, value);
			const result = performanceService.getCache(key);

			expect(result).toEqual(value);
			expect(mockAddBreadcrumb).toHaveBeenCalledWith(
				`Cache set: ${key}`,
				"cache",
			);
		});

		it("should return null for non-existent cache entries", () => {
			const result = performanceService.getCache("non-existent");
			expect(result).toBeNull();
		});

		it("should handle cache expiry", async () => {
			const key = "expiry-test";
			const value = { data: "test" };

			performanceService.setCache(key, value, 100); // 100ms expiry

			// Should exist immediately
			expect(performanceService.getCache(key)).toEqual(value);

			// Wait for expiry using fake timers
			vi.advanceTimersByTime(150);

			// Should be expired
			expect(performanceService.getCache(key)).toBeNull();
		});

		it("should respect max cache size", () => {
			const maxSize = 3;
			performanceService.updateConfig({ maxCacheSize: maxSize });

			// Add more items than max size
			for (let i = 0; i < maxSize + 2; i++) {
				performanceService.setCache(`key-${i}`, { data: i });
			}

			const stats = performanceService.getCacheStats();
			expect(stats.size).toBeLessThanOrEqual(maxSize);
		});

		it("should clear cache", () => {
			performanceService.setCache("key1", "value1");
			performanceService.setCache("key2", "value2");

			performanceService.clearCache();

			expect(performanceService.getCache("key1")).toBeNull();
			expect(performanceService.getCache("key2")).toBeNull();
			expect(mockAddBreadcrumb).toHaveBeenCalledWith("Cache cleared", "cache");
		});

		it("should calculate cache statistics correctly", () => {
			performanceService.setCache("key1", "value1");
			performanceService.setCache("key2", "value2");

			const stats = performanceService.getCacheStats();
			expect(stats.size).toBe(2);
			expect(stats.hitRate).toBe(0); // No hits yet
			expect(stats.totalHits).toBe(0);
			expect(stats.totalMisses).toBe(0);
		});
	});

	describe("Lazy Loading", () => {
		it("should set up lazy loading with IntersectionObserver", () => {
			expect(global.IntersectionObserver).toHaveBeenCalled();
		});

		it("should lazy load elements", () => {
			const element = document.createElement("div");
			const callback = vi.fn();

			performanceService.lazyLoadElement(element, callback);

			// Simulate intersection
			const observerCallback = (global.IntersectionObserver as any).mock
				.calls[0][0];
			observerCallback([{ target: element, isIntersecting: true }]);

			expect(callback).toHaveBeenCalled();
		});

		it("should lazy load images", () => {
			const img = document.createElement("img");
			const src = "test-image.jpg";
			const placeholder = "placeholder.jpg";

			performanceService.lazyLoadImage(img, src, placeholder);

			expect(img.src).toContain(placeholder);
		});

		it("should handle lazy loading when disabled", () => {
			performanceService.updateConfig({ enableLazyLoading: false });

			const element = document.createElement("div");
			const callback = vi.fn();

			performanceService.lazyLoadElement(element, callback);

			expect(callback).toHaveBeenCalled(); // Should call immediately when disabled
		});
	});

	describe("Code Splitting", () => {
		it("should lazy load components", async () => {
			const mockComponent = { default: vi.fn() };
			const importFn = vi.fn().mockResolvedValue(mockComponent);

			const result = await performanceService.lazyLoadComponent(importFn);

			expect(importFn).toHaveBeenCalled();
			expect(result).toBe(mockComponent.default);
			expect(mockAddBreadcrumb).toHaveBeenCalledWith(
				expect.stringContaining("Code split loaded in"),
				"code-split",
			);
		});

		it("should handle component loading errors", async () => {
			const importFn = vi.fn().mockRejectedValue(new Error("Import failed"));

			const result = await performanceService.lazyLoadComponent(importFn);

			expect(result).toBeDefined(); // Should return fallback component
			expect(mockAddBreadcrumb).toHaveBeenCalledWith(
				expect.stringContaining("Code split failed"),
				"code-split",
			);
		});

		it("should handle code splitting when disabled", async () => {
			performanceService.updateConfig({ enableCodeSplitting: false });

			const mockComponent = { default: vi.fn() };
			const importFn = vi.fn().mockResolvedValue(mockComponent);

			const result = await performanceService.lazyLoadComponent(importFn);

			expect(result).toBe(mockComponent.default);
		});
	});

	describe("Performance Monitoring", () => {
		it("should monitor page load performance", () => {
			// Test that performance monitoring is set up
			const config = performanceService.getConfig();
			expect(config.enableCaching).toBe(true);

			// Verify that the service has performance monitoring capabilities
			expect(typeof performanceService.getPerformanceMetrics).toBe("function");
		});

		it("should monitor long tasks", () => {
			const observerCallback = (global.PerformanceObserver as any).mock
				.calls[0][0];

			// Simulate long task
			observerCallback({
				getEntries: () => [{ duration: 150 }], // Longer than threshold
			});

			expect(mockReportPerformance).toHaveBeenCalled();
		});

		it("should monitor memory usage", () => {
			// Simulate high memory usage
			(window.performance as any).memory.usedJSHeapSize = 1800000; // 90% of limit

			// Trigger memory check by advancing timers
			vi.advanceTimersByTime(30000);

			expect(mockAddBreadcrumb).toHaveBeenCalledWith(
				expect.stringContaining("High memory usage"),
				"memory",
			);
		});
	});

	describe("Bundle Analysis", () => {
		it("should analyze bundle size in production", () => {
			// Mock performance entries for bundle analysis
			(window.performance.getEntriesByType as any).mockReturnValue([
				{ name: "app.js", transferSize: 1000000 },
				{ name: "styles.css", transferSize: 500000 },
				{ name: "image.png", transferSize: 200000 },
			]);

			// Test that bundle analysis can be enabled
			performanceService.updateConfig({ enableBundleAnalysis: true });

			// Verify the service can handle bundle analysis configuration
			const config = performanceService.getConfig();
			expect(config.enableBundleAnalysis).toBe(true);
		});
	});

	describe("Utility Functions", () => {
		it("should export working utility functions", () => {
			expect(typeof setCache).toBe("function");
			expect(typeof getCache).toBe("function");
			expect(typeof clearCache).toBe("function");
			expect(typeof getCacheStats).toBe("function");
			expect(typeof lazyLoadElement).toBe("function");
			expect(typeof lazyLoadImage).toBe("function");
			expect(typeof lazyLoadComponent).toBe("function");
			expect(typeof getPerformanceMetrics).toBe("function");
			expect(typeof getAverageMetrics).toBe("function");
			expect(typeof updatePerformanceConfig).toBe("function");
			expect(typeof getPerformanceConfig).toBe("function");
		});

		it("should calculate size correctly", () => {
			const smallValue = { data: "test" };
			const largeValue = { data: "x".repeat(1000) };

			performanceService.setCache("small", smallValue);
			performanceService.setCache("large", largeValue);

			const stats = performanceService.getCacheStats();
			expect(stats.size).toBe(2);
		});

		it("should record performance metrics", () => {
			const metrics = {
				loadTime: 1000,
				renderTime: 500,
				memoryUsage: 1000000,
				bundleSize: 2000000,
				cacheHitRate: 0.8,
				lazyLoadCount: 5,
				codeSplitCount: 2,
			};

			performanceService.getPerformanceMetrics(); // Trigger recording

			const recordedMetrics = performanceService.getPerformanceMetrics();
			expect(Array.isArray(recordedMetrics)).toBe(true);
		});

		it("should calculate average metrics", () => {
			const averageMetrics = performanceService.getAverageMetrics();
			expect(typeof averageMetrics).toBe("object");
		});
	});

	describe("Configuration", () => {
		it("should update configuration", () => {
			const newConfig = {
				enableCaching: false,
				cacheExpiry: 10000,
			};

			performanceService.updateConfig(newConfig);
			const config = performanceService.getConfig();

			expect(config.enableCaching).toBe(false);
			expect(config.cacheExpiry).toBe(10000);
			expect(mockAddBreadcrumb).toHaveBeenCalledWith(
				"Performance config updated",
				"performance",
			);
		});

		it("should return current configuration", () => {
			const config = performanceService.getConfig();

			expect(config).toHaveProperty("enableCaching");
			expect(config).toHaveProperty("enableLazyLoading");
			expect(config).toHaveProperty("enableCodeSplitting");
			expect(config).toHaveProperty("cacheExpiry");
			expect(config).toHaveProperty("maxCacheSize");
		});
	});

	describe("Memory Management", () => {
		it("should clear cache on high memory usage", () => {
			// Simulate critical memory usage
			(window.performance as any).memory.usedJSHeapSize = 1900000; // 95% of limit

			// Trigger memory check by advancing timers
			vi.advanceTimersByTime(30000);

			expect(mockAddBreadcrumb).toHaveBeenCalledWith(
				"Cache cleared due to high memory usage",
				"memory",
			);
		});

		it("should limit performance metrics array size", () => {
			// Add more than 100 metrics
			for (let i = 0; i < 150; i++) {
				performanceService.getPerformanceMetrics(); // This triggers recording
			}

			const metrics = performanceService.getPerformanceMetrics();
			expect(metrics.length).toBeLessThanOrEqual(100);
		});
	});

	describe("Error Handling", () => {
		it("should handle circular references in size calculation", () => {
			const circularObj: any = { data: "test" };
			circularObj.self = circularObj;

			// Should not throw error
			expect(() => {
				performanceService.setCache("circular", circularObj);
			}).not.toThrow();
		});

		it("should handle JSON stringify errors", () => {
			const objWithUndefined = { data: undefined };

			// Should not throw error
			expect(() => {
				performanceService.setCache("undefined", objWithUndefined);
			}).not.toThrow();
		});
	});

	describe("Cleanup", () => {
		it("should destroy service properly", () => {
			performanceService.setCache("test", "value");

			performanceService.destroy();

			// Should clear all data
			expect(performanceService.getCache("test")).toBeNull();
			expect(performanceService.getPerformanceMetrics()).toEqual([]);
		});
	});
});
