import { ENV } from '@/lib/constants';
import { handleError } from '@/utils/errorHandling';
import { getAnalyticsService } from './analyticsService';

// Email types
export type EmailType = 
  | 'welcome'
  | 'lesson_reminder'
  | 'achievement_unlocked'
  | 'streak_achieved'
  | 'project_graded'
  | 'weekly_summary'
  | 'monthly_report'
  | 'password_reset'
  | 'email_verification'
  | 'system_alert';

// Email priority
export type EmailPriority = 'low' | 'normal' | 'high' | 'urgent';

// Email status
export type EmailStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

// Email template interface
export interface EmailTemplate {
  id: string;
  type: EmailType;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
  isActive: boolean;
}

// Email interface
export interface Email {
  id: string;
  type: EmailType;
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  priority: EmailPriority;
  status: EmailStatus;
  userId: string;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

// Email service configuration
export interface EmailConfig {
  enabled: boolean;
  provider: 'sendgrid' | 'mailgun' | 'aws-ses' | 'resend' | 'mock';
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  rateLimit: number; // emails per minute
}

// Email service class
export class EmailService {
  private static instance: EmailService;
  private config: EmailConfig;
  private isInitialized: boolean = false;
  private emailQueue: Email[] = [];
  private processingQueue: boolean = false;
  private rateLimitCounter: number = 0;
  private lastRateLimitReset: number = Date.now();

  constructor() {
    this.config = {
      enabled: ENV.ENABLE_EMAIL_NOTIFICATIONS || false,
      provider: (ENV.EMAIL_PROVIDER as EmailConfig['provider']) || 'mock',
      apiKey: ENV.EMAIL_API_KEY || '',
      fromEmail: ENV.EMAIL_FROM || 'noreply@aiskills.com',
      fromName: ENV.EMAIL_FROM_NAME || 'AI Skills',
      replyToEmail: ENV.EMAIL_REPLY_TO,
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      batchSize: 10,
      rateLimit: 60, // 60 emails per minute
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Initialize email service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized || !this.config.enabled) {
      return;
    }

    try {
      // Validate configuration
      this.validateConfig();

      // Test connection
      await this.testConnection();

      this.isInitialized = true;

      console.log('Email service initialized successfully');
    } catch (error) {
      handleError(error, { action: 'initialize-email-service' });
      console.error('Failed to initialize email service:', error);
    }
  }

  /**
   * Send email
   */
  public async sendEmail(email: Omit<Email, 'id' | 'status' | 'sentAt'>): Promise<Email> {
    const fullEmail: Email = {
      ...email,
      id: this.generateId(),
      status: 'pending',
      sentAt: new Date().toISOString(),
    };

    try {
      // Check rate limit
      if (!this.checkRateLimit()) {
        this.emailQueue.push(fullEmail);
        return fullEmail;
      }

      // Send email
      await this.sendEmailToProvider(fullEmail);

      fullEmail.status = 'sent';
      getAnalyticsService().track('email_sent', {
        type: email.type,
        provider: this.config.provider,
      });

      return fullEmail;
    } catch (error) {
      handleError(error, { action: 'send-email' });
      fullEmail.status = 'failed';
      fullEmail.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return fullEmail;
    }
  }

  /**
   * Schedule email
   */
  public async scheduleEmail(
    email: Omit<Email, 'id' | 'status' | 'sentAt'>,
    scheduledAt: string
  ): Promise<Email> {
    const scheduledEmail: Email = {
      ...email,
      id: this.generateId(),
      status: 'pending',
      scheduledAt,
    };

    // Add to queue
    this.emailQueue.push(scheduledEmail);

    // Set up timer to send at scheduled time
    const scheduledTime = new Date(scheduledAt).getTime();
    const now = Date.now();
    const delay = Math.max(0, scheduledTime - now);

    setTimeout(() => {
      this.sendEmail(scheduledEmail);
    }, delay);

    return scheduledEmail;
  }

  /**
   * Send welcome email
   */
  public async sendWelcomeEmail(
    to: string,
    userId: string,
    userName: string
  ): Promise<Email> {
    const template = this.getWelcomeTemplate(userName);
    
    return await this.sendEmail({
      type: 'welcome',
      to,
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody,
      priority: 'normal',
      userId,
      metadata: { userName },
    });
  }

  /**
   * Send lesson reminder email
   */
  public async sendLessonReminderEmail(
    to: string,
    userId: string,
    lessonTitle: string,
    streakCount: number
  ): Promise<Email> {
    const template = this.getLessonReminderTemplate(lessonTitle, streakCount);
    
    return await this.sendEmail({
      type: 'lesson_reminder',
      to,
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody,
      priority: 'normal',
      userId,
      metadata: { lessonTitle, streakCount },
    });
  }

  /**
   * Send achievement email
   */
  public async sendAchievementEmail(
    to: string,
    userId: string,
    achievementName: string,
    achievementDescription: string
  ): Promise<Email> {
    const template = this.getAchievementTemplate(achievementName, achievementDescription);
    
    return await this.sendEmail({
      type: 'achievement_unlocked',
      to,
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody,
      priority: 'high',
      userId,
      metadata: { achievementName, achievementDescription },
    });
  }

  /**
   * Send weekly summary email
   */
  public async sendWeeklySummaryEmail(
    to: string,
    userId: string,
    summary: {
      lessonsCompleted: number;
      streakDays: number;
      achievementsEarned: number;
      totalTimeSpent: number;
    }
  ): Promise<Email> {
    const template = this.getWeeklySummaryTemplate(summary);
    
    return await this.sendEmail({
      type: 'weekly_summary',
      to,
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody,
      priority: 'low',
      userId,
      metadata: summary,
    });
  }

  /**
   * Process email queue
   */
  public async processQueue(): Promise<void> {
    if (this.processingQueue || this.emailQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      const batch = this.emailQueue.splice(0, this.config.batchSize);
      
      for (const email of batch) {
        if (email.status === 'pending') {
          await this.sendEmail(email);
        }
      }
    } catch (error) {
      handleError(error, { action: 'process-email-queue' });
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Get email templates
   */
  public getEmailTemplates(): EmailTemplate[] {
    return [
      {
        id: 'welcome',
        type: 'welcome',
        subject: 'Welcome to AI Skills! 🚀',
        htmlBody: this.getWelcomeTemplate('{{userName}}').htmlBody,
        textBody: this.getWelcomeTemplate('{{userName}}').textBody,
        variables: ['userName'],
        isActive: true,
      },
      {
        id: 'lesson_reminder',
        type: 'lesson_reminder',
        subject: 'Time for your daily lesson! 📚',
        htmlBody: this.getLessonReminderTemplate('{{lessonTitle}}', '{{streakCount}}').htmlBody,
        textBody: this.getLessonReminderTemplate('{{lessonTitle}}', '{{streakCount}}').textBody,
        variables: ['lessonTitle', 'streakCount'],
        isActive: true,
      },
      {
        id: 'achievement',
        type: 'achievement_unlocked',
        subject: '🎉 Achievement Unlocked!',
        htmlBody: this.getAchievementTemplate('{{achievementName}}', '{{achievementDescription}}').htmlBody,
        textBody: this.getAchievementTemplate('{{achievementName}}', '{{achievementDescription}}').textBody,
        variables: ['achievementName', 'achievementDescription'],
        isActive: true,
      },
      {
        id: 'weekly_summary',
        type: 'weekly_summary',
        subject: 'Your Weekly Learning Summary 📊',
        htmlBody: this.getWeeklySummaryTemplate({
          lessonsCompleted: 0,
          streakDays: 0,
          achievementsEarned: 0,
          totalTimeSpent: 0,
        }).htmlBody,
        textBody: this.getWeeklySummaryTemplate({
          lessonsCompleted: 0,
          streakDays: 0,
          achievementsEarned: 0,
          totalTimeSpent: 0,
        }).textBody,
        variables: ['lessonsCompleted', 'streakDays', 'achievementsEarned', 'totalTimeSpent'],
        isActive: true,
      },
    ];
  }

  /**
   * Get service status
   */
  public getStatus(): {
    isInitialized: boolean;
    isEnabled: boolean;
    queueLength: number;
    processingQueue: boolean;
    rateLimitRemaining: number;
  } {
    return {
      isInitialized: this.isInitialized,
      isEnabled: this.config.enabled,
      queueLength: this.emailQueue.length,
      processingQueue: this.processingQueue,
      rateLimitRemaining: Math.max(0, this.config.rateLimit - this.rateLimitCounter),
    };
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.apiKey && this.config.provider !== 'mock') {
      throw new Error('Email API key is required');
    }

    if (!this.config.fromEmail) {
      throw new Error('From email is required');
    }
  }

  /**
   * Test connection to email provider
   */
  private async testConnection(): Promise<void> {
    if (this.config.provider === 'mock') {
      return; // Mock provider doesn't need connection test
    }

    // This would test the actual email provider connection
    // For now, we'll just validate the config
    console.log(`Testing connection to ${this.config.provider}...`);
  }

  /**
   * Send email to provider
   */
  private async sendEmailToProvider(email: Email): Promise<void> {
    switch (this.config.provider) {
      case 'mock':
        await this.sendMockEmail(email);
        break;
      case 'sendgrid':
        await this.sendSendGridEmail(email);
        break;
      case 'mailgun':
        await this.sendMailgunEmail(email);
        break;
      case 'aws-ses':
        await this.sendAWSSESEmail(email);
        break;
      case 'resend':
        await this.sendResendEmail(email);
        break;
      default:
        throw new Error(`Unsupported email provider: ${this.config.provider}`);
    }
  }

  /**
   * Send mock email (for development/testing)
   */
  private async sendMockEmail(email: Email): Promise<void> {
    console.log('Mock email sent:', {
      to: email.to,
      subject: email.subject,
      type: email.type,
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send email via SendGrid
   */
  private async sendSendGridEmail(email: Email): Promise<void> {
    // This would use the SendGrid API
    // For now, we'll use mock
    await this.sendMockEmail(email);
  }

  /**
   * Send email via Mailgun
   */
  private async sendMailgunEmail(email: Email): Promise<void> {
    // This would use the Mailgun API
    // For now, we'll use mock
    await this.sendMockEmail(email);
  }

  /**
   * Send email via AWS SES
   */
  private async sendAWSSESEmail(email: Email): Promise<void> {
    // This would use the AWS SES API
    // For now, we'll use mock
    await this.sendMockEmail(email);
  }

  /**
   * Send email via Resend
   */
  private async sendResendEmail(email: Email): Promise<void> {
    // This would use the Resend API
    // For now, we'll use mock
    await this.sendMockEmail(email);
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    
    // Reset counter if a minute has passed
    if (now - this.lastRateLimitReset >= 60000) {
      this.rateLimitCounter = 0;
      this.lastRateLimitReset = now;
    }

    if (this.rateLimitCounter >= this.config.rateLimit) {
      return false;
    }

    this.rateLimitCounter++;
    return true;
  }

  /**
   * Get welcome email template
   */
  private getWelcomeTemplate(userName: string) {
    return {
      subject: `Welcome to AI Skills, ${userName}! 🚀`,
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3B82F6;">Welcome to AI Skills!</h1>
          <p>Hi ${userName},</p>
          <p>Welcome to your AI learning journey! We're excited to help you master the skills of the future.</p>
          <p>Here's what you can do to get started:</p>
          <ul>
            <li>Complete your first lesson</li>
            <li>Set up your learning preferences</li>
            <li>Join our community</li>
          </ul>
          <p>Happy learning!</p>
          <p>The AI Skills Team</p>
        </div>
      `,
      textBody: `
        Welcome to AI Skills, ${userName}!
        
        Welcome to your AI learning journey! We're excited to help you master the skills of the future.
        
        Here's what you can do to get started:
        - Complete your first lesson
        - Set up your learning preferences
        - Join our community
        
        Happy learning!
        
        The AI Skills Team
      `,
    };
  }

  /**
   * Get lesson reminder template
   */
  private getLessonReminderTemplate(lessonTitle: string, streakCount: number) {
    return {
      subject: `Time for your daily lesson! 📚 (${streakCount} day streak)`,
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3B82F6;">Ready for your daily lesson?</h1>
          <p>Don't break your ${streakCount}-day learning streak!</p>
          <p>Today's lesson: <strong>${lessonTitle}</strong></p>
          <p>Click the link below to continue your learning journey:</p>
          <a href="${ENV.APP_URL}/lessons" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Start Learning</a>
          <p>Keep up the great work!</p>
        </div>
      `,
      textBody: `
        Ready for your daily lesson?
        
        Don't break your ${streakCount}-day learning streak!
        
        Today's lesson: ${lessonTitle}
        
        Continue your learning journey: ${ENV.APP_URL}/lessons
        
        Keep up the great work!
      `,
    };
  }

  /**
   * Get achievement template
   */
  private getAchievementTemplate(achievementName: string, achievementDescription: string) {
    return {
      subject: `🎉 Achievement Unlocked: ${achievementName}`,
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10B981;">🎉 Achievement Unlocked!</h1>
          <h2>${achievementName}</h2>
          <p>${achievementDescription}</p>
          <p>Congratulations on this milestone! Your dedication to learning is paying off.</p>
          <a href="${ENV.APP_URL}/achievements" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Achievements</a>
        </div>
      `,
      textBody: `
        🎉 Achievement Unlocked!
        
        ${achievementName}
        ${achievementDescription}
        
        Congratulations on this milestone! Your dedication to learning is paying off.
        
        View your achievements: ${ENV.APP_URL}/achievements
      `,
    };
  }

  /**
   * Get weekly summary template
   */
  private getWeeklySummaryTemplate(summary: {
    lessonsCompleted: number;
    streakDays: number;
    achievementsEarned: number;
    totalTimeSpent: number;
  }) {
    return {
      subject: 'Your Weekly Learning Summary 📊',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3B82F6;">Weekly Learning Summary</h1>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>This Week's Progress:</h3>
            <ul>
              <li>Lessons completed: <strong>${summary.lessonsCompleted}</strong></li>
              <li>Current streak: <strong>${summary.streakDays} days</strong></li>
              <li>Achievements earned: <strong>${summary.achievementsEarned}</strong></li>
              <li>Total time spent: <strong>${Math.round(summary.totalTimeSpent / 60)} minutes</strong></li>
            </ul>
          </div>
          <p>Great job this week! Keep up the momentum.</p>
          <a href="${ENV.APP_URL}/dashboard" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
        </div>
      `,
      textBody: `
        Weekly Learning Summary
        
        This Week's Progress:
        - Lessons completed: ${summary.lessonsCompleted}
        - Current streak: ${summary.streakDays} days
        - Achievements earned: ${summary.achievementsEarned}
        - Total time spent: ${Math.round(summary.totalTimeSpent / 60)} minutes
        
        Great job this week! Keep up the momentum.
        
        View your dashboard: ${ENV.APP_URL}/dashboard
      `,
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance(); 