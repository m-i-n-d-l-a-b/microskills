import { useCallback, useEffect } from 'react';
import { getAnalyticsService, ANALYTICS_EVENTS, type UserTraits } from '@/services/analyticsService';
import { useAuth } from './useAuth';

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
}

export const useAnalytics = () => {
  const { user, isAuthenticated } = useAuth();
  const analyticsService = getAnalyticsService();

  // Initialize analytics service on mount
  useEffect(() => {
    analyticsService.initialize();
  }, []);

  // Identify user when authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      const traits: UserTraits = {
        email: user.email,
        name: user.name,
        role: user.role,
        experience: user.experience,
        preferences: user.preferences,
        subscription: user.subscription,
      };
      
      analyticsService.identify(user.id, traits);
    }
  }, [isAuthenticated, user]);

  const track = useCallback((event: string, properties?: Record<string, any>) => {
    // Track with PostHog analytics service
    analyticsService.track(event, {
      ...properties,
      user_id: user?.id,
      is_authenticated: isAuthenticated,
    });
  }, [user?.id, isAuthenticated]);

  const identify = useCallback((userId: string, traits?: UserTraits) => {
    analyticsService.identify(userId, traits);
  }, []);

  const trackPageView = useCallback((pageName?: string, properties?: Record<string, any>) => {
    analyticsService.trackPageView(pageName, {
      ...properties,
      user_id: user?.id,
      is_authenticated: isAuthenticated,
    });
  }, [user?.id, isAuthenticated]);

  const trackFeatureUsage = useCallback((feature: string, properties?: Record<string, any>) => {
    analyticsService.trackFeatureUsage(feature, {
      ...properties,
      user_id: user?.id,
      is_authenticated: isAuthenticated,
    });
  }, [user?.id, isAuthenticated]);

  const trackConversion = useCallback((funnel: string, step: string, properties?: Record<string, any>) => {
    analyticsService.trackConversion(funnel, step, {
      ...properties,
      user_id: user?.id,
      is_authenticated: isAuthenticated,
    });
  }, [user?.id, isAuthenticated]);

  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    analyticsService.trackError(error, {
      ...context,
      user_id: user?.id,
      is_authenticated: isAuthenticated,
    });
  }, [user?.id, isAuthenticated]);

  const trackPerformance = useCallback((metric: string, value: number, properties?: Record<string, any>) => {
    analyticsService.trackPerformance(metric, value, {
      ...properties,
      user_id: user?.id,
      is_authenticated: isAuthenticated,
    });
  }, [user?.id, isAuthenticated]);

  const trackEngagement = useCallback((action: string, duration?: number, properties?: Record<string, any>) => {
    analyticsService.trackEngagement(action, duration, {
      ...properties,
      user_id: user?.id,
      is_authenticated: isAuthenticated,
    });
  }, [user?.id, isAuthenticated]);

  const setUserProperties = useCallback((properties: Record<string, any>) => {
    analyticsService.setUserProperties(properties);
  }, []);

  const getDebugData = useCallback(() => {
    return analyticsService.getDebugData();
  }, []);

  return { 
    track, 
    identify, 
    trackPageView,
    trackFeatureUsage,
    trackConversion,
    trackError,
    trackPerformance,
    trackEngagement,
    setUserProperties,
    getDebugData,
  };
};

// Export the same events for backward compatibility
export { ANALYTICS_EVENTS };