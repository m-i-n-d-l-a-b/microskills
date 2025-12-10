import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getMessaging, 
  getToken, 
  onMessage, 
  isSupported,
  type Messaging,
  type MessagePayload
} from 'firebase/messaging';
import { ENV } from '@/lib/constants';
import { handleError } from '@/utils/errorHandling';
import { getAnalyticsService } from './analyticsService';

const analytics = () => getAnalyticsService();
import { emailService } from './emailService';

// Notification types
export type NotificationType = 
  | 'lesson_reminder'
  | 'achievement_unlocked'
  | 'streak_achieved'
  | 'project_graded'
  | 'system_alert'
  | 'promotional'
  | 'welcome';

// Notification priority
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Notification status
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

// Notification interface
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority: NotificationPriority;
  status: NotificationStatus;
  userId: string;
  scheduledAt?: string;
  sentAt?: string;
  readAt?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

// Notification preferences interface
export interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  types: Record<NotificationType, boolean>;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
    timezone: string;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  channels: {
    push: boolean;
    email: boolean;
    inApp: boolean;
  };
  updatedAt: string;
}

// Notification service configuration
export interface NotificationConfig {
  enabled: boolean;
  vapidKey: string;
  defaultIcon: string;
  defaultBadge: string;
  defaultColor: string;
  defaultTag: string;
  requireInteraction: boolean;
  silent: boolean;
  renotify: boolean;
}

// Notification service class
export class NotificationService {
  private static instance: NotificationService;
  private app: any;
  private messaging: Messaging | null = null;
  private config: NotificationConfig;
  private isInitialized: boolean = false;
  private tokenRefreshInterval?: NodeJS.Timeout;
  private notificationQueue: Notification[] = [];
  private messageHandlers: Map<string, (payload: MessagePayload) => void> = new Map();

  constructor() {
    this.config = {
      enabled: ENV.ENABLE_NOTIFICATIONS,
      vapidKey: ENV.FIREBASE_CONFIG.vapidKey || '',
      defaultIcon: '/icons/notification-icon.png',
      defaultBadge: '/icons/badge-icon.png',
      defaultColor: '#3B82F6',
      defaultTag: 'ai-skills-notification',
      requireInteraction: false,
      silent: false,
      renotify: true,
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize Firebase and notification service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized || !this.config.enabled) {
      return;
    }

    try {
      // Initialize Firebase if not already initialized
      if (getApps().length === 0) {
        this.app = initializeApp({
          apiKey: ENV.FIREBASE_CONFIG.apiKey,
          authDomain: ENV.FIREBASE_CONFIG.authDomain,
          projectId: ENV.FIREBASE_CONFIG.projectId,
          storageBucket: ENV.FIREBASE_CONFIG.storageBucket,
          messagingSenderId: ENV.FIREBASE_CONFIG.messagingSenderId,
          appId: ENV.FIREBASE_CONFIG.appId,
        });
      } else {
        this.app = getApp();
      }

      // Check if messaging is supported
      const messagingSupported = await isSupported();
      if (!messagingSupported) {
        console.warn('Firebase messaging is not supported in this environment');
        return;
      }

      // Initialize messaging
      this.messaging = getMessaging(this.app);

      // Set up message handler
      this.setupMessageHandler();

      // Request notification permission
      await this.requestPermission();

      // Get FCM token
      await this.getFCMToken();

      // Set up token refresh
      this.setupTokenRefresh();

      this.isInitialized = true;

      console.log('Notification service initialized successfully');
    } catch (error) {
      handleError(error, { action: 'initialize-notifications' });
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Request notification permission
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        analytics().track('notification_permission_granted');
      } else {
        analytics().track('notification_permission_denied');
      }

      return permission;
    } catch (error) {
      handleError(error, { action: 'request-notification-permission' });
      return 'denied';
    }
  }

  /**
   * Get FCM token
   */
  public async getFCMToken(): Promise<string | null> {
    if (!this.messaging || !this.config.enabled) {
      return null;
    }

    try {
      const token = await getToken(this.messaging, {
        vapidKey: this.config.vapidKey,
      });

      if (token) {
        // Store token for later use
        localStorage.setItem('fcm_token', token);
        analytics().track('fcm_token_generated');
        return token;
      }

      return null;
    } catch (error) {
      handleError(error, { action: 'get-fcm-token' });
      return null;
    }
  }

  /**
   * Send notification
   */
  public async sendNotification(notification: Omit<Notification, 'id' | 'status' | 'sentAt'>): Promise<Notification> {
    const fullNotification: Notification = {
      ...notification,
      id: this.generateId(),
      status: 'pending',
      sentAt: new Date().toISOString(),
    };

    try {
      // Check if we should send based on preferences
      const preferences = await this.getNotificationPreferences(notification.userId);
      if (!preferences.enabled || !preferences.types[notification.type]) {
        fullNotification.status = 'failed';
        return fullNotification;
      }

      // Check quiet hours
      if (this.isInQuietHours(preferences.quietHours)) {
        this.notificationQueue.push(fullNotification);
        return fullNotification;
      }

      // Send notification based on channel
      if (preferences.channels.push) {
        await this.sendPushNotification(fullNotification);
      }

      if (preferences.channels.inApp) {
        await this.sendInAppNotification(fullNotification);
      }

      if (preferences.channels.email) {
        await this.sendEmailNotification(fullNotification);
      }

      fullNotification.status = 'sent';
      analytics().track('notification_sent', {
        type: notification.type,
        channel: preferences.channels,
      });

      return fullNotification;
    } catch (error) {
      handleError(error, { action: 'send-notification' });
      fullNotification.status = 'failed';
      return fullNotification;
    }
  }

  /**
   * Schedule notification
   */
  public async scheduleNotification(
    notification: Omit<Notification, 'id' | 'status' | 'sentAt'>,
    scheduledAt: string
  ): Promise<Notification> {
    const scheduledNotification: Notification = {
      ...notification,
      id: this.generateId(),
      status: 'pending',
      scheduledAt,
    };

    // Store scheduled notification
    this.notificationQueue.push(scheduledNotification);

    // Set up timer to send at scheduled time
    const scheduledTime = new Date(scheduledAt).getTime();
    const now = Date.now();
    const delay = Math.max(0, scheduledTime - now);

    setTimeout(() => {
      this.sendNotification(scheduledNotification);
    }, delay);

    return scheduledNotification;
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(notification: Notification): Promise<void> {
    if (!this.messaging || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      // This would typically be sent from your backend
      // For now, we'll show a local notification
      if (Notification.permission === 'granted') {
        const notificationOptions: NotificationOptions = {
          body: notification.body,
          icon: this.config.defaultIcon,
          badge: this.config.defaultBadge,
          color: this.config.defaultColor,
          tag: this.config.defaultTag,
          requireInteraction: this.config.requireInteraction,
          silent: this.config.silent,
          renotify: this.config.renotify,
          data: notification.data,
          actions: [
            {
              action: 'view',
              title: 'View',
            },
            {
              action: 'dismiss',
              title: 'Dismiss',
            },
          ],
        };

        const browserNotification = new Notification(notification.title, notificationOptions);

        // Handle notification click
        browserNotification.onclick = (event) => {
          event.preventDefault();
          this.handleNotificationClick(notification, event);
        };

        // Handle notification action clicks
        browserNotification.onactionclick = (event) => {
          this.handleNotificationAction(notification, event);
        };
      }
    } catch (error) {
      handleError(error, { action: 'send-push-notification' });
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(notification: Notification): Promise<void> {
    // Emit custom event for in-app notification
    const event = new CustomEvent('inAppNotification', {
      detail: notification,
    });
    window.dispatchEvent(event);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: Notification): Promise<void> {
    try {
      // Get user email from user data (this would come from user context)
      const userEmail = localStorage.getItem('user_email');
      if (!userEmail) {
        console.warn('No user email found for email notification');
        return;
      }

      // Map notification type to email type
      const emailType = this.mapNotificationTypeToEmailType(notification.type);
      
      // Send email based on type
      switch (emailType) {
        case 'lesson_reminder':
          await emailService.sendLessonReminderEmail(
            userEmail,
            notification.userId,
            notification.data?.lessonTitle || 'Daily Lesson',
            notification.data?.streakCount || 0
          );
          break;
        case 'achievement_unlocked':
          await emailService.sendAchievementEmail(
            userEmail,
            notification.userId,
            notification.data?.achievementName || 'Achievement',
            notification.data?.achievementDescription || 'You earned an achievement!'
          );
          break;
        case 'welcome':
          await emailService.sendWelcomeEmail(
            userEmail,
            notification.userId,
            notification.data?.userName || 'User'
          );
          break;
        default:
          // Send generic email
          await emailService.sendEmail({
            type: emailType,
            to: userEmail,
            subject: notification.title,
            htmlBody: `<p>${notification.body}</p>`,
            textBody: notification.body,
            priority: notification.priority,
            userId: notification.userId,
            metadata: notification.data,
          });
      }
    } catch (error) {
      handleError(error, { action: 'send-email-notification' });
    }
  }

  /**
   * Map notification type to email type
   */
  private mapNotificationTypeToEmailType(notificationType: NotificationType): import('./emailService').EmailType {
    switch (notificationType) {
      case 'lesson_reminder':
        return 'lesson_reminder';
      case 'achievement_unlocked':
        return 'achievement_unlocked';
      case 'streak_achieved':
        return 'streak_achieved';
      case 'project_graded':
        return 'project_graded';
      case 'welcome':
        return 'welcome';
      default:
        return 'system_alert';
    }
  }

  /**
   * Set up message handler for background notifications
   */
  private setupMessageHandler(): void {
    if (!this.messaging) {
      return;
    }

    onMessage(this.messaging, (payload) => {
      console.log('Message received:', payload);
      
      // Handle foreground messages
      this.handleForegroundMessage(payload);
      
      // Notify all registered handlers
      this.messageHandlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          handleError(error, { action: 'handle-message' });
        }
      });
    });
  }

  /**
   * Handle foreground message
   */
  private handleForegroundMessage(payload: MessagePayload): void {
    const { notification, data } = payload;

    if (notification) {
      const notificationOptions: NotificationOptions = {
        body: notification.body,
        icon: notification.icon || this.config.defaultIcon,
        badge: this.config.defaultBadge,
        color: this.config.defaultColor,
        tag: this.config.defaultTag,
        requireInteraction: this.config.requireInteraction,
        silent: this.config.silent,
        renotify: this.config.renotify,
        data: data,
      };

      const browserNotification = new Notification(notification.title || 'New Notification', notificationOptions);

      browserNotification.onclick = (event) => {
        event.preventDefault();
        this.handleNotificationClick({ id: 'fcm', type: 'system_alert', title: notification.title || '', body: notification.body || '', priority: 'normal', status: 'delivered', userId: 'system' }, event);
      };
    }
  }

  /**
   * Handle notification click
   */
  private handleNotificationClick(notification: Notification, event: Event): void {
    // Handle notification click based on type
    switch (notification.type) {
      case 'lesson_reminder':
        window.location.href = '/lessons';
        break;
      case 'achievement_unlocked':
        window.location.href = '/achievements';
        break;
      case 'project_graded':
        window.location.href = '/projects';
        break;
      default:
        // Default behavior
        window.focus();
    }

    // Mark as read
    this.markAsRead(notification.id);

    // Track analytics
    analytics().track('notification_clicked', {
      type: notification.type,
      notification_id: notification.id,
    });
  }

  /**
   * Handle notification action
   */
  private handleNotificationAction(notification: Notification, event: any): void {
    const action = event.action;

    switch (action) {
      case 'view':
        this.handleNotificationClick(notification, event);
        break;
      case 'dismiss':
        this.dismissNotification(notification.id);
        break;
    }

    analytics().track('notification_action', {
      type: notification.type,
      action,
      notification_id: notification.id,
    });
  }

  /**
   * Mark notification as read
   */
  public markAsRead(notificationId: string): void {
    // Update notification status
    const notification = this.notificationQueue.find(n => n.id === notificationId);
    if (notification) {
      notification.status = 'read';
      notification.readAt = new Date().toISOString();
    }

    // Store in localStorage for persistence
    const readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
    readNotifications.push(notificationId);
    localStorage.setItem('read_notifications', JSON.stringify(readNotifications.slice(-100)));
  }

  /**
   * Dismiss notification
   */
  public dismissNotification(notificationId: string): void {
    // Remove from queue
    this.notificationQueue = this.notificationQueue.filter(n => n.id !== notificationId);
  }

  /**
   * Get notification preferences
   */
  public async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const stored = localStorage.getItem(`notification_preferences_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }

      // Return default preferences
      return {
        userId,
        enabled: true,
        types: {
          lesson_reminder: true,
          achievement_unlocked: true,
          streak_achieved: true,
          project_graded: true,
          system_alert: true,
          promotional: false,
          welcome: true,
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        frequency: 'immediate',
        channels: {
          push: true,
          email: false,
          inApp: true,
        },
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      handleError(error, { action: 'get-notification-preferences' });
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  public async updateNotificationPreferences(
    userId: string, 
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const current = await this.getNotificationPreferences(userId);
      const updated = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(`notification_preferences_${userId}`, JSON.stringify(updated));

      analytics().track('notification_preferences_updated', {
        updates: Object.keys(updates),
      });

      return updated;
    } catch (error) {
      handleError(error, { action: 'update-notification-preferences' });
      throw error;
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(quietHours: NotificationPreferences['quietHours']): boolean {
    if (!quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight quiet hours
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Set up token refresh
   */
  private setupTokenRefresh(): void {
    // Refresh token every 12 hours
    this.tokenRefreshInterval = setInterval(async () => {
      await this.getFCMToken();
    }, 12 * 60 * 60 * 1000);
  }

  /**
   * Register message handler
   */
  public registerMessageHandler(id: string, handler: (payload: MessagePayload) => void): void {
    this.messageHandlers.set(id, handler);
  }

  /**
   * Unregister message handler
   */
  public unregisterMessageHandler(id: string): void {
    this.messageHandlers.delete(id);
  }

  /**
   * Get service status
   */
  public getStatus(): {
    isInitialized: boolean;
    isEnabled: boolean;
    permission: NotificationPermission;
    queueLength: number;
  } {
    return {
      isInitialized: this.isInitialized,
      isEnabled: this.config.enabled,
      permission: Notification.permission,
      queueLength: this.notificationQueue.length,
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up service
   */
  public cleanup(): void {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
    this.messageHandlers.clear();
    this.notificationQueue = [];
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance(); 