import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Enhanced Winston Logger for Wellness Service
 * Provides structured logging with health and wellness focused features
 */
export class WinstonLogger {
  private logger: winston.Logger;

  constructor(service: string) {
    this.logger = this.createLogger(service);
  }

  /**
   * Create Winston logger with wellness service configuration
   */
  private createLogger(service: string): winston.Logger {
    const logDir = process.env.LOG_DIR || 'logs';
    const logLevel = process.env.LOG_LEVEL || 'info';
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Define log format for wellness service
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf((info) => {
        const { timestamp, level, message, service: logService, correlationId, userId, wellnessEvent, healthMetric, ...meta } = info;

        const logEntry = {
          timestamp,
          level,
          service: logService || service,
          correlationId,
          userId,
          wellnessEvent,
          healthMetric,
          message,
          ...meta
        };

        return JSON.stringify(logEntry);
      })
    );

    // Define console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.printf((info) => {
        const { timestamp, level, message, service: logService, correlationId, userId, wellnessEvent, healthMetric, ...meta } = info;
        const correlationStr = correlationId ? ` [${correlationId}]` : '';
        const userStr = userId ? ` [User:${userId}]` : '';
        const wellnessStr = wellnessEvent ? ` [${wellnessEvent}]` : '';
        const metricStr = healthMetric ? ` [Metric:${healthMetric}]` : '';
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${logService || service}]${correlationStr}${userStr}${wellnessStr}${metricStr} ${level}: ${message}${metaStr}`;
      })
    );

    // Transports configuration
    const transports: winston.transport[] = [];

    // Console transport for development
    if (nodeEnv !== 'production') {
      transports.push(
        new winston.transports.Console({
          level: logLevel,
          format: consoleFormat
        })
      );
    }

    // File transports for production and health tracking
    if (nodeEnv === 'production' || process.env.ENABLE_FILE_LOGS === 'true') {
      // Combined logs with daily rotation
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/${service}-combined-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '30m',
          maxFiles: '60d', // 60 days retention
          format: logFormat,
          level: logLevel
        })
      );

      // Health and wellness metrics logs
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/${service}-health-metrics-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m', // Larger for health data
          maxFiles: '365d', // 1 year retention for health metrics
          format: logFormat,
          level: 'info'
        })
      );

      // Wellness events logs
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/${service}-wellness-events-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '40m',
          maxFiles: '180d', // 6 months retention for wellness events
          format: logFormat,
          level: 'info'
        })
      );

      // Error logs with daily rotation
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/${service}-error-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '90d', // 3 months retention for error logs
          format: logFormat,
          level: 'error'
        })
      );

      // User activity logs (for compliance and analytics)
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/${service}-user-activity-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '30m',
          maxFiles: '365d', // 1 year retention for user activity
          format: logFormat,
          level: 'http'
        })
      );
    }

    return winston.createLogger({
      level: logLevel,
      format: logFormat,
      defaultMeta: {
        service,
        pid: process.pid,
        hostname: require('os').hostname(),
        environment: nodeEnv,
        domain: 'wellness',
        healthData: true
      },
      transports,
      exitOnError: false,
      // Add exception handling for wellness service
      exceptionHandlers: [
        new winston.transports.File({
          filename: `${logDir}/${service}-exceptions.log`
        })
      ],
      rejectionHandlers: [
        new winston.transports.File({
          filename: `${logDir}/${service}-rejections.log`
        })
      ]
    });
  }

  /**
   * Log error message
   */
  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log info message
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log verbose message
   */
  verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }

  /**
   * Log HTTP request (for user activity tracking)
   */
  http(message: string, meta?: any): void {
    this.logger.http(message, meta);
  }

  /**
   * Log with correlation ID
   */
  logWithCorrelation(level: string, message: string, correlationId: string, meta?: any): void {
    this.logger.log(level, message, {
      correlationId,
      ...meta
    });
  }

  /**
   * Log with user ID (for user-specific wellness tracking)
   */
  logWithUser(level: string, message: string, userId: number, meta?: any): void {
    this.logger.log(level, message, {
      userId,
      ...meta
    });
  }

  /**
   * Create child logger with additional context
   */
  child(defaultMeta: any): WinstonLogger {
    const childLogger = new WinstonLogger('wellness-service');
    childLogger.logger = this.logger.child(defaultMeta);
    return childLogger;
  }

  // Wellness-specific logging methods

  /**
   * Log program enrollment
   */
  logProgramEnrollment(userId: number, programId: number, programType: string, meta?: any): void {
    this.info('User enrolled in wellness program', {
      event: 'program_enrollment',
      userId,
      programId,
      programType,
      ...meta
    });
  }

  /**
   * Log program completion
   */
  logProgramCompletion(userId: number, programId: number, completionTime: number, meta?: any): void {
    this.info('User completed wellness program', {
      event: 'program_completion',
      userId,
      programId,
      completionTime,
      ...meta
    });
  }

  /**
   * Log activity completion
   */
  logActivityCompleted(userId: number, activityId: number, activityType: string, duration: number, meta?: any): void {
    this.logWithUser('info', 'Activity completed', userId, {
      event: 'activity_completion',
      activityId,
      activityType,
      duration,
      wellnessEvent: 'exercise' || activityType,
      ...meta
    });
  }

  /**
   * Log health metric recorded
   */
  logHealthMetricRecorded(userId: number, metricType: string, value: number, unit: string, meta?: any): void {
    this.logWithUser('info', 'Health metric recorded', userId, {
      event: 'health_metric_recorded',
      metricType,
      value,
      unit,
      healthMetric: metricType,
      ...meta
    });
  }

  /**
   * Log goal creation
   */
  logGoalCreated(userId: number, goalType: string, targetValue: number, meta?: any): void {
    this.logWithUser('info', 'Wellness goal created', userId, {
      event: 'goal_created',
      goalType,
      targetValue,
      wellnessEvent: 'goal_setting',
      ...meta
    });
  }

  /**
   * Log goal achievement
   */
  logGoalAchieved(userId: number, goalId: number, goalType: string, timeToCompletion: number, meta?: any): void {
    this.logWithUser('info', 'Wellness goal achieved', userId, {
      event: 'goal_achieved',
      goalId,
      goalType,
      timeToCompletion,
      wellnessEvent: 'achievement',
      ...meta
    });
  }

  /**
   * Log reward earned
   */
  logRewardEarned(userId: number, rewardType: string, points: number, badgeId?: string, meta?: any): void {
    this.logWithUser('info', 'Reward earned', userId, {
      event: 'reward_earned',
      rewardType,
      points,
      badgeId,
      wellnessEvent: 'reward',
      ...meta
    });
  }

  /**
   * Log challenge participation
   */
  logChallengeParticipation(userId: number, challengeId: number, challengeType: string, meta?: any): void {
    this.logWithUser('info', 'Challenge participation started', userId, {
      event: 'challenge_participation',
      challengeId,
      challengeType,
      wellnessEvent: 'challenge',
      ...meta
    });
  }

  /**
   * Log health alert
   */
  logHealthAlert(userId: number, alertType: string, severity: string, message: string, metricValue?: any, meta?: any): void {
    const level = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
    this.logWithUser(level, `Health alert: ${message}`, userId, {
      event: 'health_alert',
      alertType,
      severity,
      metricValue,
      wellnessEvent: 'health_monitoring',
      ...meta
    });
  }

  /**
   * Log wellness streak
   */
  logWellnessStreak(userId: number, streakType: string, streakDays: number, meta?: any): void {
    this.logWithUser('info', `Wellness streak: ${streakDays} days`, userId, {
      event: 'wellness_streak',
      streakType,
      streakDays,
      wellnessEvent: 'streak',
      ...meta
    });
  }

  /**
   * Log personal best achievement
   */
  logPersonalBest(userId: number, activityType: string, newValue: number, previousBest: number, meta?: any): void {
    this.logWithUser('info', `Personal best achieved in ${activityType}`, userId, {
      event: 'personal_best',
      activityType,
      newValue,
      previousBest,
      wellnessEvent: 'achievement',
      ...meta
    });
  }

  /**
   * Log milestone reached
   */
  logMilestoneReached(userId: number, milestoneType: string, value: number, context: string, meta?: any): void {
    this.logWithUser('info', `Milestone reached: ${context}`, userId, {
      event: 'milestone_reached',
      milestoneType,
      value,
      context,
      wellnessEvent: 'milestone',
      ...meta
    });
  }

  /**
   * Log workout session
   */
  logWorkoutSession(userId: number, workoutType: string, duration: number, calories: number, exercises: number, meta?: any): void {
    this.logWithUser('info', 'Workout session completed', userId, {
      event: 'workout_session',
      workoutType,
      duration,
      calories,
      exercises,
      wellnessEvent: 'exercise',
      ...meta
    });
  }

  /**
   * Log meditation session
   */
  logMeditationSession(userId: number, meditationType: string, duration: number, mood: string, stressLevel: number, meta?: any): void {
    this.logWithUser('info', 'Meditation session completed', userId, {
      event: 'meditation_session',
      meditationType,
      duration,
      mood,
      stressLevel,
      wellnessEvent: 'meditation',
      ...meta
    });
  }

  /**
   * Log nutrition logging
   */
  logNutritionLogged(userId: number, mealType: string, calories: number, nutrition: any, meta?: any): void {
    this.logWithUser('info', 'Nutrition logged', userId, {
      event: 'nutrition_logged',
      mealType,
      calories,
      nutrition,
      wellnessEvent: 'nutrition',
      ...meta
    });
  }

  /**
   * Log sleep tracking
   */
  logSleepTracked(userId: number, sleepHours: number, quality: string, deepSleep: number, meta?: any): void {
    this.logWithUser('info', 'Sleep tracked', userId, {
      event: 'sleep_tracked',
      sleepHours,
      quality,
      deepSleep,
      wellnessEvent: 'sleep',
      ...meta
    });
  }

  /**
   * Log social engagement
   */
  logSocialEngagement(userId: number, engagementType: string, context: string, participants?: number, meta?: any): void {
    this.logWithUser('info', `Social engagement: ${engagementType}`, userId, {
      event: 'social_engagement',
      engagementType,
      context,
      participants,
      wellnessEvent: 'social',
      ...meta
    });
  }

  /**
   * Log wellness analytics
   */
  logWellnessAnalytics(analyticsType: string, userId?: number, data: any, timeRange?: string, meta?: any): void {
    const logData = {
      event: 'wellness_analytics',
      analyticsType,
      data,
      timeRange,
      wellnessEvent: 'analytics',
      ...meta
    };

    if (userId) {
      this.logWithUser('info', `Wellness analytics: ${analyticsType}`, userId, logData);
    } else {
      this.info(`Wellness analytics: ${analyticsType}`, logData);
    }
  }

  /**
   * Log compliance event
   */
  logComplianceEvent(complianceType: string, userId: number, status: string, details: any, meta?: any): void {
    this.logWithUser('info', `Compliance event: ${complianceType}`, userId, {
      event: 'compliance_event',
      complianceType, // privacy, data_retention, medical_data, etc.
      status,
      details,
      wellnessEvent: 'compliance',
      ...meta
    });
  }

  /**
   * Log device synchronization
   */
  logDeviceSync(userId: number, deviceType: string, deviceData: any, syncStatus: string, meta?: any): void {
    this.logWithUser('info', `Device sync: ${deviceType}`, userId, {
      event: 'device_sync',
      deviceType,
      deviceData,
      syncStatus,
      wellnessEvent: 'device_integration',
      ...meta
    });
  }

  /**
   * Log wellness recommendations
   */
  logWellnessRecommendations(userId: number, recommendationType: string, recommendations: any, algorithm?: string, meta?: any): void {
    this.logWithUser('info', `Wellness recommendations: ${recommendationType}`, userId, {
      event: 'wellness_recommendations',
      recommendationType,
      recommendations,
      algorithm,
      wellnessEvent: 'recommendations',
      ...meta
    });
  }

  /**
   * Log gamification event
   */
  logGamificationEvent(userId: number, gameType: string, outcome: string, score: number, level?: number, meta?: any): void {
    this.logWithUser('info', `Gamification event: ${gameType}`, userId, {
      event: 'gamification_event',
      gameType,
      outcome,
      score,
      level,
      wellnessEvent: 'gamification',
      ...meta
    });
  }

  /**
   * Get logger instance for external use
   */
  getLogger(): winston.Logger {
    return this.logger;
  }

  /**
   * Update log level at runtime
   */
  setLevel(level: string): void {
    this.logger.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): string {
    return this.logger.level;
  }
}

export default WinstonLogger;