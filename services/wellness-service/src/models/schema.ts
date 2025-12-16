import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  decimal,
  jsonb,
  index,
  real
} from 'drizzle-orm/pg-core';

// Wellness Program Management Tables
export const wellnessPrograms = pgTable('wellness_programs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  programType: varchar('program_type', { length: 50 }).notNull(), // fitness, nutrition, mental_health, preventive_care
  category: varchar('category', { length: 100 }),
  duration: integer('duration'), // Duration in days
  difficultyLevel: varchar('difficulty_level', { length: 20 }).default('beginner'), // beginner, intermediate, advanced
  isActive: boolean('is_active').default(true),
  isPremium: boolean('is_premium').default(false),
  targetAudience: jsonb('target_audience'), // {ageRange: [], gender: [], conditions: []}
  goals: jsonb('goals'), // Array of wellness goals
  requirements: jsonb('requirements'), // Prerequisites and requirements
  curriculum: jsonb('curriculum'), // Program structure and content
  schedule: jsonb('schedule'), // Weekly/daily schedule
  resources: jsonb('resources'), // Required resources and materials
  tags: jsonb('tags'), // Array of tags
  points: integer('points').default(0), // Points awarded for completion
  badges: jsonb('badges'), // Badges awarded
  healthBenefits: jsonb('health_benefits'), // Expected health benefits
  estimatedCaloriesBurn: integer('estimated_calories_burn'),
  estimatedTimeCommitment: integer('estimated_time_commitment'), // Minutes per session
  maxParticipants: integer('max_participants'),
  instructorId: integer('instructor_id'),
  imageUrl: varchar('image_url', { length: 500 }),
  videoUrl: varchar('video_url', { length: 500 }),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('wellness_programs_name_idx').on(table.name),
  programTypeIdx: index('wellness_programs_program_type_idx').on(table.programType),
  categoryIdx: index('wellness_programs_category_idx').on(table.category),
  isActiveIdx: index('wellness_programs_is_active_idx').on(table.isActive),
  difficultyLevelIdx: index('wellness_programs_difficulty_level_idx').on(table.difficultyLevel),
}));

// User Program Enrollment Tables
export const userProgramEnrollments = pgTable('user_program_enrollments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  programId: integer('program_id').notNull(),
  enrollmentDate: timestamp('enrollment_date').notNull(),
  completionDate: timestamp('completion_date'),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, completed, paused, cancelled
  completionPercentage: integer('completion_percentage').default(0),
  progressData: jsonb('progress_data'), // Detailed progress information
  customGoals: jsonb('custom_goals'), // User-specific goals
  preferences: jsonb('preferences'), // User preferences for the program
  startDate: timestamp('start_date').notNull(),
  targetEndDate: timestamp('target_end_date'),
  actualEndDate: timestamp('actual_end_date'),
  dropReason: varchar('drop_reason', { length: 255 }),
  rating: integer('rating'), // 1-5 star rating
  feedback: text('feedback'),
  instructorNotes: text('instructor_notes'),
  healthMetrics: jsonb('health_metrics'), // Health metrics before and after
  achievements: jsonb('achievements'), // Achievements and milestones
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_program_enrollments_user_id_idx').on(table.userId),
  programIdIdx: index('user_program_enrollments_program_id_idx').on(table.programId),
  statusIdx: index('user_program_enrollments_status_idx').on(table.status),
  enrollmentDateIdx: index('user_program_enrollments_enrollment_date_idx').on(table.enrollmentDate),
}));

// Wellness Activity Tables
export const wellnessActivities = pgTable('wellness_activities', {
  id: serial('id').primaryKey(),
  programId: integer('program_id'),
  activityType: varchar('activity_type', { length: 50 }).notNull(), // exercise, nutrition, meditation, health_screening
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  instructions: text('instructions'),
  duration: integer('duration'), // Duration in minutes
  difficultyLevel: varchar('difficulty_level', { length: 20 }).default('beginner'),
  equipment: jsonb('equipment'), // Required equipment
  multimedia: jsonb('multimedia'), // Images, videos, audio files
  caloriesBurnEstimate: integer('calories_burn_estimate'),
  healthBenefits: jsonb('health_benefits'),
  targetMuscles: jsonb('target_muscles'), // For exercises
  recipe: jsonb('recipe'), // For nutrition activities
  meditationType: varchar('meditation_type', { length: 50 }), // For meditation activities
  screeningType: varchar('screening_type', { length: 100 }), // For health screenings
  points: integer('points').default(0),
  badges: jsonb('badges'),
  prerequisites: jsonb('prerequisites'),
  safetyNotes: text('safety_notes'),
  contraindications: jsonb('contraindications'),
  orderNumber: integer('order_number'), // Order within program
  isRequired: boolean('is_required').default(false),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  programIdIdx: index('wellness_activities_program_id_idx').on(table.programId),
  activityTypeIdx: index('wellness_activities_activity_type_idx').on(table.activityType),
  difficultyLevelIdx: index('wellness_activities_difficulty_level_idx').on(table.difficultyLevel),
}));

// User Activity Completion Tables
export const userActivities = pgTable('user_activities', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  activityId: integer('activity_id').notNull(),
  programId: integer('program_id'),
  activityDate: timestamp('activity_date').notNull(),
  completedAt: timestamp('completed_at').defaultNow(),
  isCompleted: boolean('is_completed').default(true),
  duration: integer('duration'), // Actual duration in minutes
  notes: text('notes'),
  rating: integer('rating'), // User rating of activity
  difficulty: varchar('difficulty', { length: 20 }), // User perceived difficulty
  mood: varchar('mood', { length: 20 }), // User mood after activity
  energyLevel: integer('energy_level'), // 1-10 scale
  stressLevel: integer('stress_level'), // 1-10 scale
  satisfactionLevel: integer('satisfaction_level'), // 1-10 scale
  customData: jsonb('custom_data'), // Activity-specific data
  metrics: jsonb('metrics'), // Performance metrics
  feedback: text('feedback'),
  photos: jsonb('photos'), // Activity photos
  location: varchar('location', { length: 255 }),
  weatherConditions: jsonb('weather_conditions'),
  pointsEarned: integer('points_earned'),
  badgesEarned: jsonb('badges_earned'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_activities_user_id_idx').on(table.userId),
  activityIdIdx: index('user_activities_activity_id_idx').on(table.activityId),
  programIdIdx: index('user_activities_program_id_idx').on(table.programId),
  activityDateIdx: index('user_activities_activity_date_idx').on(table.activityDate),
  isCompletedIdx: index('user_activities_is_completed_idx').on(table.isCompleted),
}));

// Wellness Tracking Tables
export const wellnessTracking = pgTable('wellness_tracking', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  metricType: varchar('metric_type', { length: 50 }).notNull(), // weight, height, blood_pressure, heart_rate, steps, sleep_hours, calories
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 20 }), // kg, cm, mmHg, bpm, steps, hours, kcal
  recordedAt: timestamp('recorded_at').notNull(),
  source: varchar('source', { length: 100 }), // manual, device, app
  deviceId: varchar('device_id', { length: 100 }),
  notes: text('notes'),
  tags: jsonb('tags'),
  contextualData: jsonb('contextual_data'), // Activity, weather, time of day, etc.
  isVerified: boolean('is_verified').default(false),
  verificationMethod: varchar('verification_method', { length: 50 }),
  geoLocation: jsonb('geo_location'),
  dataQuality: varchar('data_quality', { length: 20 }).default('good'), // excellent, good, fair, poor
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('wellness_tracking_user_id_idx').on(table.userId),
  metricTypeIdx: index('wellness_tracking_metric_type_idx').on(table.metricType),
  recordedAtIdx: index('wellness_tracking_recorded_at_idx').on(table.recordedAt),
  sourceIdx: index('wellness_tracking_source_idx').on(table.source),
}));

// Health Metrics Detail Tables
export const healthMetrics = pgTable('health_metrics', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  metricType: varchar('metric_type', { length: 50 }).notNull(),
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 20 }),
  systolic: integer('systolic'), // For blood pressure
  diastolic: integer('diastolic'), // For blood pressure
  heartRate: integer('heart_rate'), // For heart rate readings
  restingHeartRate: integer('resting_heart_rate'),
  bloodSugar: decimal('blood_sugar', { precision: 6, scale: 2 }),
  temperature: decimal('temperature', { precision: 5, scale: 2 }),
  oxygenSaturation: decimal('oxygen_saturation', { precision: 5, scale: 2 }),
  recordedAt: timestamp('recorded_at').notNull(),
  measurementConditions: jsonb('measurement_conditions'), // Fasting, post-exercise, etc.
  deviceInfo: jsonb('device_info'),
  location: varchar('location', { length: 255 }),
  healthStatus: varchar('health_status', { length: 20 }), // normal, warning, critical
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('health_metrics_user_id_idx').on(table.userId),
  metricTypeIdx: index('health_metrics_metric_type_idx').on(table.metricType),
  recordedAtIdx: index('health_metrics_recorded_at_idx').on(table.recordedAt),
  healthStatusIdx: index('health_metrics_health_status_idx').on(table.healthStatus),
}));

// Wellness Goals Tables
export const wellnessGoals = pgTable('wellness_goals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  goalType: varchar('goal_type', { length: 50 }).notNull(), // weight_loss, fitness, nutrition, mental_health, sleep
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  targetValue: decimal('target_value', { precision: 10, scale: 2 }),
  currentValue: decimal('current_value', { precision: 10, scale: 2 }).default(0),
  unit: varchar('unit', { length: 20 }),
  startDate: timestamp('start_date').notNull(),
  targetDate: timestamp('target_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, completed, paused, cancelled
  priority: varchar('priority', { length: 20 }).default('medium'), // low, medium, high
  category: varchar('category', { length: 50 }),
  milestones: jsonb('milestones'), // Progress milestones
  rewards: jsonb('rewards'), // Rewards for achieving goals
  progressPercentage: integer('progress_percentage').default(0),
  lastUpdated: timestamp('last_updated').defaultNow(),
  completionDate: timestamp('completion_date'),
  notes: text('notes'),
  isPublic: boolean('is_public').default(false), // Share with wellness community
  supports: jsonb('supports'), // Social supports
  challenges: jsonb('challenges'), // Obstacles and challenges
  strategies: jsonb('strategies'), // Strategies to achieve goal
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('wellness_goals_user_id_idx').on(table.userId),
  goalTypeIdx: index('wellness_goals_goal_type_idx').on(table.goalType),
  statusIdx: index('wellness_goals_status_idx').on(table.status),
  priorityIdx: index('wellness_goals_priority_idx').on(table.priority),
  targetDateIdx: index('wellness_goals_target_date_idx').on(table.targetDate),
}));

// Wellness Rewards Tables
export const wellnessRewards = pgTable('wellness_rewards', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  rewardType: varchar('reward_type', { length: 50 }).notNull(), // points, badge, achievement, milestone
  category: varchar('category', { length: 50 }).notNull(), // daily, weekly, monthly, special
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  points: integer('points'),
  badgeId: varchar('badge_id', { length: 100 }),
  level: integer('level'), // Achievement level
  icon: varchar('icon', { length: 100 }),
  color: varchar('color', { length: 20 }),
  earnedAt: timestamp('earned_at').notNull(),
  sourceId: integer('source_id'), // Related activity, program, or goal ID
  sourceType: varchar('source_type', { length: 50 }), // activity, program, goal, milestone
  isShared: boolean('is_shared').default(false),
  sharedAt: timestamp('shared_at'),
  celebrationMessage: text('celebration_message'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('wellness_rewards_user_id_idx').on(table.userId),
  rewardTypeIdx: index('wellness_rewards_reward_type_idx').on(table.rewardType),
  categoryIdx: index('wellness_rewards_category_idx').on(table.category),
  earnedAtIdx: index('wellness_rewards_earned_at_idx').on(table.earnedAt),
}));

// Wellness Challenges Tables
export const wellnessChallenges = pgTable('wellness_challenges', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  challengeType: varchar('challenge_type', { length: 50 }).notNull(), // individual, team, company
  category: varchar('category', { length: 50 }),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  duration: integer('duration'), // Duration in days
  targetGoals: jsonb('target_goals'), // Challenge objectives
  rules: jsonb('rules'), // Challenge rules and requirements
  rewards: jsonb('rewards'), // Rewards for completion
  maxParticipants: integer('max_participants'),
  currentParticipants: integer('current_participants').default(0),
  isActive: boolean('is_active').default(true),
  isPublic: boolean('is_public').default(false),
  difficultyLevel: varchar('difficulty_level', { length: 20 }).default('beginner'),
  tags: jsonb('tags'),
  imageUrl: varchar('image_url', { length: 500 }),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  challengeTypeIdx: index('wellness_challenges_challenge_type_idx').on(table.challengeType),
  categoryIdx: index('wellness_challenges_category_idx').on(table.category),
  startDateIdx: index('wellness_challenges_start_date_idx').on(table.startDate),
  isActiveIdx: index('wellness_challenges_is_active_idx').on(table.isActive),
}));

// User Challenge Participation Tables
export const userChallengeParticipation = pgTable('user_challenge_participation', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  challengeId: integer('challenge_id').notNull(),
  participationDate: timestamp('participation_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, completed, dropped, disqualified
  progress: jsonb('progress'), // Challenge progress data
  currentRank: integer('current_rank'),
  teamId: integer('team_id'),
  completionDate: timestamp('completion_date'),
  finalScore: integer('final_score'),
  achievements: jsonb('achievements'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_challenge_participation_user_id_idx').on(table.userId),
  challengeIdIdx: index('user_challenge_participation_challenge_id_idx').on(table.challengeId),
  statusIdx: index('user_challenge_participation_status_idx').on(table.status),
  currentRankIdx: index('user_challenge_participation_current_rank_idx').on(table.currentRank),
}));

// Export all tables
export type WellnessProgram = typeof wellnessPrograms.$inferSelect;
export type NewWellnessProgram = typeof wellnessPrograms.$inferInsert;
export type UserProgramEnrollment = typeof userProgramEnrollments.$inferSelect;
export type NewUserProgramEnrollment = typeof userProgramEnrollments.$inferInsert;
export type WellnessActivity = typeof wellnessActivities.$inferSelect;
export type NewWellnessActivity = typeof wellnessActivities.$inferInsert;
export type UserActivity = typeof userActivities.$inferSelect;
export type NewUserActivity = typeof userActivities.$inferInsert;
export type WellnessTracking = typeof wellnessTracking.$inferSelect;
export type NewWellnessTracking = typeof wellnessTracking.$inferInsert;
export type HealthMetric = typeof healthMetrics.$inferSelect;
export type NewHealthMetric = typeof healthMetrics.$inferInsert;
export type WellnessGoal = typeof wellnessGoals.$inferSelect;
export type NewWellnessGoal = typeof wellnessGoals.$inferInsert;
export type WellnessReward = typeof wellnessRewards.$inferSelect;
export type NewWellnessReward = typeof wellnessRewards.$inferInsert;
export type WellnessChallenge = typeof wellnessChallenges.$inferSelect;
export type NewWellnessChallenge = typeof wellnessChallenges.$inferInsert;
export type UserChallengeParticipation = typeof userChallengeParticipation.$inferSelect;
export type NewUserChallengeParticipation = typeof userChallengeParticipation.$inferInsert;