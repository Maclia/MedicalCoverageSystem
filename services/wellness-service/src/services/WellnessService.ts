import { Database } from '../models/Database';
import { WinstonLogger } from '../utils/WinstonLogger';
import {
  wellnessPrograms,
  userProgramEnrollments,
  wellnessActivities,
  userActivities,
  wellnessTracking,
  healthMetrics,
  wellnessGoals,
  wellnessRewards,
  wellnessChallenges,
  userChallengeParticipation
} from '../models/schema';
import {
  WellnessProgram,
  UserProgramEnrollment,
  WellnessActivity,
  UserActivity,
  WellnessTracking,
  HealthMetric,
  WellnessGoal,
  WellnessReward,
  WellnessChallenge,
  UserChallengeParticipation,
  NewWellnessProgram,
  NewUserProgramEnrollment,
  NewWellnessActivity,
  NewUserActivity,
  NewWellnessTracking,
  NewHealthMetric,
  NewWellnessGoal,
  NewWellnessReward,
  NewWellnessChallenge,
  NewUserChallengeParticipation
} from '../models/schema';
import {
  ValidationError,
  NotFoundError,
  BusinessRuleError,
  ProgramStatusError,
  ActivitySafetyError,
  HealthMetricValidationError,
  GoalStatusError,
  ChallengeStatusError
} from '../utils/CustomErrors';
import {
  eq,
  sql,
  and,
  or,
  desc,
  asc,
  inArray,
  like,
  gte,
  lte,
  ilike,
  count,
  sum,
  avg
} from 'drizzle-orm';

export class WellnessService {
  private readonly db: Database;
  private readonly logger: WinstonLogger;

  constructor() {
    this.db = Database.getInstance();
    this.logger = new WinstonLogger('wellness-service');
  }

  // Wellness Program Management Methods

  /**
   * Create a new wellness program
   */
  async createWellnessProgram(programData: NewWellnessProgram, context: any): Promise<WellnessProgram> {
    const db = this.db.getDb();

    try {
      this.logger.info('Creating new wellness program', {
        name: programData.name,
        programType: programData.programType,
        difficultyLevel: programData.difficultyLevel
      });

      // Validate business rules
      await this.validateProgramRules(programData);

      const program = await db.insert(wellnessPrograms).values({
        ...programData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      this.logger.info('Wellness program created successfully', {
        programId: program[0].id,
        programType: program[0].programType
      });

      return program[0];

    } catch (error) {
      this.logger.error('Failed to create wellness program', { error, programData });
      throw error;
    }
  }

  /**
   * Get wellness program by ID
   */
  async getWellnessProgramById(programId: number): Promise<WellnessProgram> {
    const db = this.db.getDb();

    try {
      const program = await db
        .select()
        .from(wellnessPrograms)
        .where(eq(wellnessPrograms.id, programId))
        .limit(1);

      if (program.length === 0) {
        throw new NotFoundError('Wellness program');
      }

      return program[0];

    } catch (error) {
      this.logger.error('Failed to get wellness program', { error, programId });
      throw error;
    }
  }

  /**
   * Search wellness programs
   */
  async searchWellnessPrograms(searchParams: any): Promise<any> {
    const db = this.db.getDb();

    try {
      let query = db.select().from(wellnessPrograms);

      // Apply filters
      if (searchParams.filters) {
        const { filters } = searchParams;

        if (filters.programType) {
          query = query.where(eq(wellnessPrograms.programType, filters.programType));
        }

        if (filters.difficultyLevel) {
          query = query.where(eq(wellnessPrograms.difficultyLevel, filters.difficultyLevel));
        }

        if (filters.category) {
          query = query.where(ilike(wellnessPrograms.category, `%${filters.category}%`));
        }

        if (filters.isActive !== undefined) {
          query = query.where(eq(wellnessPrograms.isActive, filters.isActive));
        }

        if (filters.isPremium !== undefined) {
          query = query.where(eq(wellnessPrograms.isPremium, filters.isPremium));
        }

        if (filters.minDuration) {
          query = query.where(gte(wellnessPrograms.duration, filters.minDuration));
        }

        if (filters.maxDuration) {
          query = query.where(lte(wellnessPrograms.duration, filters.maxDuration));
        }
      }

      // Apply text search
      if (searchParams.query) {
        query = query.where(
          or(
            ilike(wellnessPrograms.name, `%${searchParams.query}%`),
            ilike(wellnessPrograms.description, `%${searchParams.query}%`),
            ilike(wellnessPrograms.category, `%${searchParams.query}%`)
          )
        );
      }

      // Apply sorting
      if (searchParams.sortBy) {
        const sortField = wellnessPrograms[searchParams.sortBy as keyof typeof wellnessPrograms];
        const sortOrder = searchParams.sortOrder === 'desc' ? desc(sortField) : asc(sortField);
        query = query.orderBy(sortOrder);
      } else {
        query = query.orderBy(desc(wellnessPrograms.createdAt));
      }

      // Apply pagination
      const { page = 1, limit = 20 } = searchParams.pagination || {};
      const offset = (page - 1) * limit;

      const programResults = await query
        .limit(limit)
        .offset(offset);

      // Get total count
      const totalQuery = db.select({ count: count() }).from(wellnessPrograms);
      const countResult = await totalQuery;

      return {
        programs: programResults,
        pagination: {
          page,
          limit,
          total: countResult[0]?.count || 0,
          totalPages: Math.ceil((countResult[0]?.count || 0) / limit)
        }
      };

    } catch (error) {
      this.logger.error('Failed to search wellness programs', { error, searchParams });
      throw error;
    }
  }

  // User Program Enrollment Methods

  /**
   * Enroll user in wellness program
   */
  async enrollUserInProgram(userId: number, programId: number, enrollmentData: any, context: any): Promise<UserProgramEnrollment> {
    const db = this.db.getDb();
    const transaction = await db.beginTransaction();

    try {
      this.logger.logProgramEnrollment(userId, programId, 'enrollment', context);

      // Check if program exists and is active
      const program = await this.getWellnessProgramById(programId);
      if (!program.isActive) {
        throw new ProgramStatusError(program.status, 'active', 'enroll');
      }

      // Check if user is already enrolled
      const existingEnrollment = await db
        .select()
        .from(userProgramEnrollments)
        .where(
          and(
            eq(userProgramEnrollments.userId, userId),
            eq(userProgramEnrollments.programId, programId),
            inArray(userProgramEnrollments.status, ['active', 'paused'])
          )
        )
        .limit(1);

      if (existingEnrollment.length > 0) {
        throw new ValidationError('User is already enrolled in this program');
      }

      // Validate enrollment rules
      await this.validateEnrollmentRules(userId, program, enrollmentData);

      const enrollmentRecord = {
        userId,
        programId,
        enrollmentDate: new Date(),
        status: 'active',
        startDate: enrollmentData.startDate || new Date(),
        targetEndDate: enrollmentData.targetEndDate,
        customGoals: enrollmentData.customGoals || {},
        preferences: enrollmentData.preferences || {},
        progressData: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const enrollment = await transaction.insert(userProgramEnrollments).values(enrollmentRecord).returning();

      await transaction.commit();

      this.logger.info('User successfully enrolled in wellness program', {
        userId,
        programId,
        enrollmentId: enrollment[0].id
      });

      return enrollment[0];

    } catch (error) {
      await transaction.rollback();
      this.logger.error('Failed to enroll user in wellness program', { error, userId, programId });
      throw error;
    }
  }

  /**
   * Get user program enrollment
   */
  async getUserProgramEnrollment(userId: number, programId: number): Promise<UserProgramEnrollment> {
    const db = this.db.getDb();

    try {
      const enrollment = await db
        .select()
        .from(userProgramEnrollments)
        .where(
          and(
            eq(userProgramEnrollments.userId, userId),
            eq(userProgramEnrollments.programId, programId)
          )
        )
        .limit(1);

      if (enrollment.length === 0) {
        throw new NotFoundError('User program enrollment');
      }

      return enrollment[0];

    } catch (error) {
      this.logger.error('Failed to get user program enrollment', { error, userId, programId });
      throw error;
    }
  }

  /**
   * Update user program progress
   */
  async updateProgramProgress(enrollmentId: number, progressData: any, context: any): Promise<UserProgramEnrollment> {
    const db = this.db.getDb();

    try {
      const existingEnrollment = await db
        .select()
        .from(userProgramEnrollments)
        .where(eq(userProgramEnrollments.id, enrollmentId))
        .limit(1);

      if (existingEnrollment.length === 0) {
        throw new NotFoundError('Program enrollment');
      }

      // Calculate completion percentage
      const completionPercentage = calculateCompletionPercentage(progressData);

      const updatedEnrollment = await db
        .update(userProgramEnrollments)
        .set({
          progressData,
          completionPercentage,
          lastUpdated: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userProgramEnrollments.id, enrollmentId))
        .returning();

      // Check if program is completed
      if (completionPercentage >= 100 && existingEnrollment[0].status !== 'completed') {
        await this.completeProgram(enrollmentId, context);
      }

      this.logger.info('Program progress updated', {
        enrollmentId,
        completionPercentage,
        updatedBy: context.userId
      });

      return updatedEnrollment[0];

    } catch (error) {
      this.logger.error('Failed to update program progress', { error, enrollmentId });
      throw error;
    }
  }

  /**
   * Complete user program
   */
  async completeProgram(enrollmentId: number, context: any): Promise<UserProgramEnrollment> {
    const db = this.db.getDb();

    try {
      const updatedEnrollment = await db
        .update(userProgramEnrollments)
        .set({
          status: 'completed',
          completionDate: new Date(),
          completionPercentage: 100,
          updatedAt: new Date()
        })
        .where(eq(userProgramEnrollments.id, enrollmentId))
        .returning();

      this.logger.logProgramCompletion(
        updatedEnrollment[0].userId,
        updatedEnrollment[0].programId,
        calculateCompletionDuration(updatedEnrollment[0].enrollmentDate, new Date())
      );

      return updatedEnrollment[0];

    } catch (error) {
      this.logger.error('Failed to complete program', { error, enrollmentId });
      throw error;
    }
  }

  // Wellness Activity Methods

  /**
   * Create a wellness activity
   */
  async createWellnessActivity(activityData: NewWellnessActivity, context: any): Promise<WellnessActivity> {
    const db = this.db.getDb();

    try {
      this.logger.info('Creating new wellness activity', {
        title: activityData.title,
        activityType: activityData.activityType,
        difficultyLevel: activityData.difficultyLevel
      });

      // Validate activity rules
      await this.validateActivityRules(activityData);

      const activity = await db.insert(wellnessActivities).values({
        ...activityData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      this.logger.info('Wellness activity created successfully', {
        activityId: activity[0].id,
        activityType: activity[0].activityType
      });

      return activity[0];

    } catch (error) {
      this.logger.error('Failed to create wellness activity', { error, activityData });
      throw error;
    }
  }

  /**
   * Get wellness activity by ID
   */
  async getWellnessActivityById(activityId: number): Promise<WellnessActivity> {
    const db = this.db.getDb();

    try {
      const activity = await db
        .select()
        .from(wellnessActivities)
        .where(eq(wellnessActivities.id, activityId))
        .limit(1);

      if (activity.length === 0) {
        throw new NotFoundError('Wellness activity');
      }

      return activity[0];

    } catch (error) {
      this.logger.error('Failed to get wellness activity', { error, activityId });
      throw error;
    }
  }

  /**
   * Log user activity completion
   */
  async logUserActivity(userId: number, activityId: number, activityData: any, context: any): Promise<UserActivity> {
    const db = this.db.getDb();

    try {
      this.logger.logActivityCompleted(userId, activityId, activityData.activityType || 'unknown', activityData.duration || 0);

      const activityLog = {
        userId,
        activityId,
        activityDate: activityData.activityDate || new Date(),
        completedAt: new Date(),
        isCompleted: activityData.isCompleted !== false,
        duration: activityData.duration,
        notes: activityData.notes,
        rating: activityData.rating,
        mood: activityData.mood,
        energyLevel: activityData.energyLevel,
        stressLevel: activityData.stressLevel,
        satisfactionLevel: activityData.satisfactionLevel,
        customData: activityData.customData || {},
        metrics: activityData.metrics || {},
        pointsEarned: activityData.pointsEarned || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const userActivity = await db.insert(userActivities).values(activityLog).returning();

      // Update user program progress if activity is part of a program
      if (activityData.programId) {
        await this.updateProgramProgressFromActivity(userId, activityData.programId, activityLog[0]);
      }

      return userActivity[0];

    } catch (error) {
      this.logger.error('Failed to log user activity', { error, userId, activityId });
      throw error;
    }
  }

  // Health Tracking Methods

  /**
   * Record health metric
   */
  async recordHealthMetric(userId: number, metricData: NewWellnessTracking, context: any): Promise<WellnessTracking> {
    const db = this.db.getDb();

    try {
      this.logger.logHealthMetricRecorded(userId, metricData.metricType, parseFloat(metricData.value.toString()), metricData.unit || '');

      // Validate health metric
      await this.validateHealthMetric(metricData);

      const metric = await db.insert(wellnessTracking).values({
        ...metricData,
        userId,
        recordedAt: metricData.recordedAt || new Date(),
        createdAt: new Date()
      }).returning();

      // Check for health alerts
      await this.checkHealthAlerts(userId, metricData);

      return metric[0];

    } catch (error) {
      this.logger.error('Failed to record health metric', { error, userId, metricData });
      throw error;
    }
  }

  /**
   * Get user health metrics history
   */
  async getUserHealthMetrics(userId: number, metricType: string, dateRange?: { startDate: Date, endDate: Date }): Promise<WellnessTracking[]> {
    const db = this.db.getDb();

    try {
      let query = db
        .select()
        .from(wellnessTracking)
        .where(
          and(
            eq(wellnessTracking.userId, userId),
            eq(wellnessTracking.metricType, metricType)
          )
        );

      // Apply date range filter
      if (dateRange) {
        query = query.where(
          and(
            gte(wellnessTracking.recordedAt, dateRange.startDate),
            lte(wellnessTracking.recordedAt, dateRange.endDate)
          )
        );
      }

      const metrics = await query.orderBy(desc(wellnessTracking.recordedAt));

      return metrics;

    } catch (error) {
      this.logger.error('Failed to get user health metrics', { error, userId, metricType });
      throw error;
    }
  }

  // Wellness Goals Methods

  /**
   * Create wellness goal
   */
  async createWellnessGoal(goalData: NewWellnessGoal, context: any): Promise<WellnessGoal> {
    const db = this.db.getDb();

    try {
      this.logger.logGoalCreated(context.userId, goalData.goalType, parseFloat(goalData.targetValue.toString()));

      // Validate goal
      await this.validateWellnessGoal(goalData);

      const goal = await db.insert(wellnessGoals).values({
        ...goalData,
        userId: context.userId,
        startDate: goalData.startDate || new Date(),
        status: 'active',
        progressPercentage: 0,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return goal[0];

    } catch (error) {
      this.logger.error('Failed to create wellness goal', { error, goalData });
      throw error;
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(goalId: number, progressData: any, context: any): Promise<WellnessGoal> {
    const db = this.db.getDb();

    try {
      const goal = await db
        .select()
        .from(wellnessGoals)
        .where(eq(wellnessGoals.id, goalId))
        .limit(1);

      if (goal.length === 0) {
        throw new NotFoundError('Wellness goal');
      }

      // Calculate new progress percentage
      const targetValue = parseFloat(goal[0].targetValue.toString());
      const currentValue = progressData.currentValue || parseFloat(goal[0].currentValue.toString());
      const progressPercentage = Math.min(100, Math.round((currentValue / targetValue) * 100));

      const updatedGoal = await db
        .update(wellnessGoals)
        .set({
          currentValue,
          progressPercentage,
          lastUpdated: new Date(),
          updatedAt: new Date(),
          completionDate: progressPercentage >= 100 ? new Date() : goal[0].completionDate,
          status: progressPercentage >= 100 ? 'completed' : goal[0].status
        })
        .where(eq(wellnessGoals.id, goalId))
        .returning();

      // Log achievement if goal is completed
      if (progressPercentage >= 100 && goal[0].status !== 'completed') {
        this.logger.logGoalAchieved(
          goal[0].userId,
          goalId,
          goal[0].goalType,
          calculateGoalCompletionDuration(goal[0].startDate, new Date())
        );
      }

      return updatedGoal[0];

    } catch (error) {
      this.logger.error('Failed to update goal progress', { error, goalId });
      throw error;
    }
  }

  // Private helper methods

  private async validateProgramRules(programData: NewWellnessProgram): Promise<void> {
    // Validate program type
    const validTypes = ['fitness', 'nutrition', 'mental_health', 'preventive_care'];
    if (!validTypes.includes(programData.programType)) {
      throw new ValidationError('Invalid program type');
    }

    // Validate difficulty level
    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    if (programData.difficultyLevel && !validDifficulties.includes(programData.difficultyLevel)) {
      throw new ValidationError('Invalid difficulty level');
    }

    // Validate duration
    if (programData.duration && programData.duration <= 0) {
      throw new ValidationError('Duration must be greater than 0');
    }
  }

  private async validateActivityRules(activityData: NewWellnessActivity): Promise<void> {
    // Validate activity type
    const validTypes = ['exercise', 'nutrition', 'meditation', 'health_screening'];
    if (!validTypes.includes(activityData.activityType)) {
      throw new ValidationError('Invalid activity type');
    }

    // Validate difficulty level
    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    if (activityData.difficultyLevel && !validDifficulties.includes(activityData.difficultyLevel)) {
      throw new ValidationError('Invalid difficulty level');
    }

    // Validate duration
    if (activityData.duration && activityData.duration <= 0) {
      throw new ValidationError('Duration must be greater than 0');
    }

    // Validate calories burn estimate
    if (activityData.caloriesBurnEstimate && activityData.caloriesBurnEstimate < 0) {
      throw new ValidationError('Calories burn estimate cannot be negative');
    }
  }

  private async validateEnrollmentRules(userId: number, program: WellnessProgram, enrollmentData: any): Promise<void> {
    // Check age restrictions if any
    if (program.targetAudience?.ageRange) {
      // This would typically involve checking user profile data
      // For now, we'll log the requirement
      this.logger.info('Program has age restrictions', {
        programId: program.id,
        ageRange: program.targetAudience.ageRange
      });
    }

    // Check if program requires medical clearance
    if (program.requirements?.medicalClearance) {
      this.logger.info('Program requires medical clearance', {
        programId: program.id,
        requirements: program.requirements
      });
    }
  }

  private async validateHealthMetric(metricData: NewWellnessTracking): Promise<void> {
    // Validate metric type
    const validTypes = ['weight', 'height', 'blood_pressure', 'heart_rate', 'steps', 'sleep_hours', 'calories'];
    if (!validTypes.includes(metricData.metricType)) {
      throw new HealthMetricValidationError('Invalid metric type', metricData.metricType);
    }

    // Validate value is not negative for most metrics
    if (parseFloat(metricData.value.toString()) < 0 && metricData.metricType !== 'steps' && metricData.metricType !== 'calories') {
      throw new HealthMetricValidationError('Value cannot be negative for this metric type', metricData.metricType);
    }
  }

  private async checkHealthAlerts(userId: number, metricData: NewWellnessTracking): Promise<void> {
    const value = parseFloat(metricData.value.toString());

    // Check critical health metrics
    switch (metricData.metricType) {
      case 'blood_pressure':
        // This would typically involve checking systolic/diastolic separately
        if (metricData.unit === 'mmHg' && value > 180) {
          this.logger.logHealthAlert(userId, 'critical', 'high', 'High blood pressure detected', value);
        }
        break;

      case 'heart_rate':
        if (value > 200 || value < 40) {
          this.logger.logHealthAlert(userId, 'critical', 'high', 'Abnormal heart rate detected', value);
        }
        break;

      case 'blood_sugar':
        if (value > 400) {
          this.logger.logHealthAlert(userId, 'critical', 'high', 'High blood sugar detected', value);
        }
        break;

      case 'oxygen_saturation':
        if (value < 90) {
          this.logger.logHealthAlert(userId, 'high', 'medium', 'Low oxygen saturation detected', value);
        }
        break;
    }
  }

  private async validateWellnessGoal(goalData: NewWellnessGoal): Promise<void> {
    // Validate goal type
    const validTypes = ['weight_loss', 'fitness', 'nutrition', 'mental_health', 'sleep'];
    if (!validTypes.includes(goalData.goalType)) {
      throw new ValidationError('Invalid goal type');
    }

    // Validate target value
    if (parseFloat(goalData.targetValue.toString()) <= 0) {
      throw new ValidationError('Target value must be greater than 0');
    }

    // Validate dates
    if (goalData.startDate && goalData.targetDate && new Date(goalData.targetDate) <= new Date(goalData.startDate)) {
      throw new ValidationError('Target date must be after start date');
    }
  }

  private calculateCompletionPercentage(progressData: any): number {
    // This is a simplified calculation
    // In a real implementation, this would be more sophisticated
    const completedActivities = progressData.completedActivities || 0;
    const totalActivities = progressData.totalActivities || 1;
    return Math.round((completedActivities / totalActivities) * 100);
  }

  private calculateCompletionDuration(startDate: Date, endDate: Date): number {
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateGoalCompletionDuration(startDate: Date, endDate: Date): number {
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  private async updateProgramProgressFromActivity(userId: number, programId: number, activity: UserActivity): Promise<void> {
    // Get user's program enrollment
    const db = this.db.getDb();

    try {
      const enrollment = await db
        .select()
        .from(userProgramEnrollments)
        .where(
          and(
            eq(userProgramEnrollments.userId, userId),
            eq(userProgramEnrollments.programId, programId),
            eq(userProgramEnrollments.status, 'active')
          )
        )
        .limit(1);

      if (enrollment.length > 0) {
        // This is a simplified update
        // In a real implementation, this would involve complex progress calculation
        const updatedProgress = await db
          .update(userProgramEnrollments)
          .set({
            lastUpdated: new Date()
          })
          .where(eq(userProgramEnrollments.id, enrollment[0].id));

        this.logger.info('Program progress updated from activity', {
          enrollmentId: enrollment[0].id,
          userId,
          programId
        });
      }
    } catch (error) {
      this.logger.error('Failed to update program progress from activity', { error, userId, programId });
    }
  }
}

export default WellnessService;