import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalyticsService, getAnalyticsService, ANALYTICS_EVENTS } from './analyticsService';

// Mock PostHog
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    people: {
      set: vi.fn(),
    },
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn(),
    reset: vi.fn(),
  },
}));

// Mock environment variables
vi.mock('@/lib/constants', () => ({
  ENV: {
    ENABLE_ANALYTICS: true,
    ENABLE_DEBUG_MODE: false,
    POSTHOG_KEY: 'test-key',
    POSTHOG_HOST: 'https://app.posthog.com',
    NODE_ENV: 'test',
    APP_VERSION: '1.0.0',
  },
}));

// Mock error handling
vi.mock('@/utils/errorHandling', () => ({
  handleError: vi.fn(),
}));

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let posthog: any;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Reset localStorage
    localStorage.clear();
    
    // Get mocked PostHog
    posthog = require('posthog-js').default;
    
    // Create new instance for each test
    service = new AnalyticsService();
  });

  afterEach(() => {
    // Clean up
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = AnalyticsService.getInstance();
      const instance2 = AnalyticsService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should initialize with correct configuration', () => {
      const config = service.getConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.debug).toBe(false);
      expect(config.capturePageViews).toBe(true);
      expect(config.captureClicks).toBe(true);
      expect(config.captureFormInteractions).toBe(true);
      expect(config.sessionRecording).toBe(false);
    });

    it('should initialize PostHog when enabled', async () => {
      await service.initialize();
      
      expect(posthog.init).toHaveBeenCalledWith('test-key', {
        api_host: 'https://app.posthog.com',
        loaded: expect.any(Function),
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
        disable_session_recording: true,
        opt_out_capturing_by_default: false,
        respect_dnt: true,
        debug: false,
      });
    });

    it('should not initialize when disabled', async () => {
      service.updateConfig({ enabled: false });
      
      await service.initialize();
      
      expect(posthog.init).not.toHaveBeenCalled();
    });
  });

  describe('Event Tracking', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should track events when enabled', () => {
      service.track('test_event', { property: 'value' });
      
      expect(posthog.capture).toHaveBeenCalledWith('test_event', {
        property: 'value',
        timestamp: expect.any(Number),
        environment: 'test',
        app_version: '1.0.0',
      });
    });

    it('should not track events when disabled', () => {
      service.updateConfig({ enabled: false });
      
      service.track('test_event', { property: 'value' });
      
      expect(posthog.capture).not.toHaveBeenCalled();
    });

    it('should queue events before initialization', () => {
      // Create new instance that hasn't been initialized
      const newService = new AnalyticsService();
      newService.track('queued_event', { property: 'value' });
      
      expect(posthog.capture).not.toHaveBeenCalled();
      
      // Initialize and check that queued events are processed
      newService.initialize();
      
      expect(posthog.capture).toHaveBeenCalledWith('queued_event', {
        property: 'value',
        timestamp: expect.any(Number),
        environment: 'test',
        app_version: '1.0.0',
      });
    });

    it('should handle tracking errors gracefully', () => {
      posthog.capture.mockImplementation(() => {
        throw new Error('Tracking failed');
      });
      
      // Should not throw
      expect(() => {
        service.track('test_event', { property: 'value' });
      }).not.toThrow();
    });
  });

  describe('User Identification', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should identify users', () => {
      const traits = { email: 'test@example.com', name: 'Test User' };
      
      service.identify('user-123', traits);
      
      expect(posthog.identify).toHaveBeenCalledWith('user-123', traits);
    });

    it('should set user properties', () => {
      const properties = { plan: 'pro', team_size: 5 };
      
      service.setUserProperties(properties);
      
      expect(posthog.people.set).toHaveBeenCalledWith(properties);
    });

    it('should not identify users when disabled', () => {
      service.updateConfig({ enabled: false });
      
      service.identify('user-123', { email: 'test@example.com' });
      
      expect(posthog.identify).not.toHaveBeenCalled();
    });
  });

  describe('Specialized Tracking Methods', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should track page views', () => {
      service.trackPageView('Home Page', { referrer: 'google.com' });
      
      expect(posthog.capture).toHaveBeenCalledWith('$pageview', {
        page_name: 'Home Page',
        referrer: 'google.com',
      });
    });

    it('should track feature usage', () => {
      service.trackFeatureUsage('code_editor', { language: 'javascript' });
      
      expect(posthog.capture).toHaveBeenCalledWith('feature_used', {
        feature: 'code_editor',
        language: 'javascript',
        timestamp: expect.any(Number),
        environment: 'test',
        app_version: '1.0.0',
      });
    });

    it('should track conversions', () => {
      service.trackConversion('onboarding', 'step_2', { time_spent: 30 });
      
      expect(posthog.capture).toHaveBeenCalledWith('conversion', {
        funnel: 'onboarding',
        step: 'step_2',
        time_spent: 30,
        timestamp: expect.any(Number),
        environment: 'test',
        app_version: '1.0.0',
      });
    });

    it('should track errors', () => {
      const error = new Error('Test error');
      
      service.trackError(error, { context: 'test' });
      
      expect(posthog.capture).toHaveBeenCalledWith('error_occurred', {
        error_message: 'Test error',
        error_stack: error.stack,
        error_name: 'Error',
        context: 'test',
        timestamp: expect.any(Number),
        environment: 'test',
        app_version: '1.0.0',
      });
    });

    it('should track performance metrics', () => {
      service.trackPerformance('page_load', 1500, { page: 'home' });
      
      expect(posthog.capture).toHaveBeenCalledWith('performance_metric', {
        metric: 'page_load',
        value: 1500,
        page: 'home',
        timestamp: expect.any(Number),
        environment: 'test',
        app_version: '1.0.0',
      });
    });

    it('should track user engagement', () => {
      service.trackEngagement('lesson_completed', 300, { lesson_id: 'lesson-1' });
      
      expect(posthog.capture).toHaveBeenCalledWith('user_engagement', {
        action: 'lesson_completed',
        duration: 300,
        lesson_id: 'lesson-1',
        timestamp: expect.any(Number),
        environment: 'test',
        app_version: '1.0.0',
      });
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const originalConfig = service.getConfig();
      
      service.updateConfig({ debug: true, sessionRecording: true });
      
      const updatedConfig = service.getConfig();
      expect(updatedConfig.debug).toBe(true);
      expect(updatedConfig.sessionRecording).toBe(true);
      expect(updatedConfig.enabled).toBe(originalConfig.enabled);
    });

    it('should enable/disable analytics', () => {
      service.setEnabled(false);
      expect(posthog.opt_out_capturing).toHaveBeenCalled();
      
      service.setEnabled(true);
      expect(posthog.opt_in_capturing).toHaveBeenCalled();
    });
  });

  describe('Data Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should reset user data', () => {
      service.reset();
      
      expect(posthog.reset).toHaveBeenCalled();
    });

    it('should provide debug data', () => {
      const debugData = service.getDebugData();
      
      expect(debugData).toEqual({
        isInitialized: true,
        isEnabled: true,
        queueLength: 0,
        isOnline: true,
      });
    });
  });

  describe('Network Handling', () => {
    it('should handle offline/online events', () => {
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      
      const newService = new AnalyticsService();
      expect(newService.getDebugData().isOnline).toBe(false);
      
      // Simulate going online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      
      const onlineService = new AnalyticsService();
      expect(onlineService.getDebugData().isOnline).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should store events locally when tracking fails', () => {
      posthog.capture.mockImplementation(() => {
        throw new Error('Network error');
      });
      
      service.track('test_event', { property: 'value' });
      
      const storedEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      expect(storedEvents).toHaveLength(1);
      expect(storedEvents[0].event).toBe('test_event');
    });
  });
});

describe('Analytics Events Constants', () => {
  it('should export all required event constants', () => {
    expect(ANALYTICS_EVENTS.USER_SIGNED_UP).toBe('user_signed_up');
    expect(ANALYTICS_EVENTS.ONBOARDING_STARTED).toBe('onboarding_started');
    expect(ANALYTICS_EVENTS.LESSON_STARTED).toBe('lesson_started');
    expect(ANALYTICS_EVENTS.PROJECT_SUBMITTED).toBe('project_submitted');
    expect(ANALYTICS_EVENTS.ACHIEVEMENT_UNLOCKED).toBe('achievement_unlocked');
    expect(ANALYTICS_EVENTS.FEATURE_USED).toBe('feature_used');
    expect(ANALYTICS_EVENTS.ERROR_OCCURRED).toBe('error_occurred');
    expect(ANALYTICS_EVENTS.PERFORMANCE_METRIC).toBe('performance_metric');
  });
});

describe('Analytics Service Singleton', () => {
  it('should export singleton instance', () => {
    const analyticsService = getAnalyticsService();
    expect(analyticsService).toBeInstanceOf(AnalyticsService);
    expect(analyticsService).toBe(AnalyticsService.getInstance());
  });
}); 