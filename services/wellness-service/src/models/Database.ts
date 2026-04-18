// ✅ CORRECT IMPORTS
import { drizzle } from 'drizzle-orm/postgres-js';
import {
  sql,
  eq,
  and,
  or,
  gt,
  gte,
  lt,
  lte,
  isNull,
  isNotNull,
  count,
  sum,
  avg,
  desc,
  type SQL,
  getTableName,
} from 'drizzle-orm';
import postgres from 'postgres'; // ✅ Correct package name: 'postgres'
import * as schema from './schema';

type DrizzleDB = ReturnType<typeof drizzle>;
// ✅ Bypass Drizzle's complex HKT constraints by inferring type from API
type DbTransaction = Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];

export class Database {
  private static instance: Database;
  private db: DrizzleDB;
  private client: postgres.Sql;

  private constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.client = postgres(databaseUrl, {
      max: 20,
      idle_timeout: 30,
      connect_timeout: 15,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true, ca: process.env.DB_SSL_CA_CERT }
        : false,
      prepare: false,
    });

    this.db = drizzle(this.client, { schema });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getDb(): DrizzleDB {
    return this.db;
  }

  public getClient(): postgres.Sql {
    return this.client;
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.client`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Wellness database connection test failed:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    try {
      await this.client.end();
    } catch (error) {
      console.error('Error closing wellness database connection:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency?: number;
    poolInfo?: { active_connections: string; active_queries: string };
  }> {
    const start = Date.now();
    try {
      const result = await this.client`SELECT 1 as health_check`;
      const latency = Date.now() - start;

      const poolStats = await this.client`
        SELECT count(*) as active_connections,
               sum(CASE WHEN state = 'active' THEN 1 ELSE 0 END) as active_queries
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;

      const poolInfo = poolStats[0] ? {
        active_connections: String(poolStats[0].active_connections ?? 0),
        active_queries: String(poolStats[0].active_queries ?? 0),
      } : undefined;

      return {
        status: result.length > 0 ? 'healthy' : 'unhealthy',
        latency,
        poolInfo,
      };
    } catch (error) {
      console.error('Wellness database health check failed:', error);
      return { status: 'unhealthy' };
    }
  }

  /**
   * Type-safe transaction wrapper
   */
  public async withTransaction<T>(
    callback: (tx: DbTransaction) => Promise<T>,
    isolationLevel: 'read committed' | 'repeatable read' | 'serializable' = 'read committed'
  ): Promise<T> {
    return this.db.transaction(callback, { isolationLevel });
  }

  /**
   * Execute raw PostgreSQL queries safely
   */
  public async executeRaw<T = Record<string, unknown>>(query: SQL<unknown>): Promise<T[]> {
    try {
      const result = await this.db.execute(query);
      return (result as any).rows as T[];
    } catch (error) {
      console.error('Error executing raw wellness query:', error);
      throw error;
    }
  }

  // ==================== WELLNESS PROGRAMS ====================

  public async getWellnessPrograms(filters?: {
    programType?: string;
    category?: string;
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
    isPremium?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<typeof schema.wellnessPrograms.$inferSelect[]> {
    const conditions = [eq(schema.wellnessPrograms.isActive, true)];

    if (filters?.programType) conditions.push(eq(schema.wellnessPrograms.programType, filters.programType));
    if (filters?.category) conditions.push(eq(schema.wellnessPrograms.category, filters.category));
    if (filters?.difficultyLevel) conditions.push(eq(schema.wellnessPrograms.difficultyLevel, filters.difficultyLevel));
    if (filters?.isPremium !== undefined) conditions.push(eq(schema.wellnessPrograms.isPremium, filters.isPremium));

    return this.db
      .select()
      .from(schema.wellnessPrograms)
      .where(and(...conditions))
      .orderBy(desc(schema.wellnessPrograms.createdAt))
      .limit(filters?.limit ?? 20)
      .offset(filters?.offset ?? 0);
  }

  public async getWellnessProgramById(id: number): Promise<typeof schema.wellnessPrograms.$inferSelect | undefined> {
    const [result] = await this.db
      .select()
      .from(schema.wellnessPrograms)
      .where(eq(schema.wellnessPrograms.id, id))
      .limit(1);
    return result;
  }

  // ==================== USER ENROLLMENTS ====================

  public async getUserEnrollments(userId: number): Promise<typeof schema.userProgramEnrollments.$inferSelect[]> {
    return this.db
      .select()
      .from(schema.userProgramEnrollments)
      .where(
        and(
          eq(schema.userProgramEnrollments.userId, userId),
          eq(schema.userProgramEnrollments.status, 'active')
        )
      )
      .orderBy(desc(schema.userProgramEnrollments.enrollmentDate));
  }

  public async enrollUserInProgram(
    userId: number,
    programId: number,
    customGoals?: Record<string, unknown>
  ): Promise<typeof schema.userProgramEnrollments.$inferSelect> {
    const [result] = await this.db
      .insert(schema.userProgramEnrollments)
      .values({
        userId,
        programId,
        enrollmentDate: new Date(),
        startDate: new Date(),
        status: 'active',
        completionPercentage: 0,
        customGoals: customGoals || null,
      })
      .returning();
    return result;
  }

  // ==================== WELLNESS ACTIVITIES ====================

  public async getProgramActivities(programId: number): Promise<typeof schema.wellnessActivities.$inferSelect[]> {
    return this.db
      .select()
      .from(schema.wellnessActivities)
      .where(eq(schema.wellnessActivities.programId, programId))
      .orderBy(schema.wellnessActivities.orderNumber);
  }

  public async logUserActivity(data: {
    userId: number;
    activityId: number;
    programId?: number;
    duration?: number;
    rating?: number;
    mood?: string;
    energyLevel?: number;
    notes?: string;
  }): Promise<typeof schema.userActivities.$inferSelect> {
    const [result] = await this.db
      .insert(schema.userActivities)
      .values({
        userId: data.userId,
        activityId: data.activityId,
        programId: data.programId,
        activityDate: new Date(),
        completedAt: new Date(),
        isCompleted: true,
        duration: data.duration,
        rating: data.rating,
        mood: data.mood,
        energyLevel: data.energyLevel,
        notes: data.notes,
        pointsEarned: 0,
      })
      .returning();
    return result;
  }

  // ==================== WELLNESS TRACKING ====================

  public async recordHealthMetric(data: {
    userId: number;
    metricType: string;
    value: string | number;
    unit?: string;
    source?: string;
    notes?: string;
  }): Promise<typeof schema.wellnessTracking.$inferSelect> {
    const [result] = await this.db
      .insert(schema.wellnessTracking)
      .values({
        userId: data.userId,
        metricType: data.metricType,
        value: data.value.toString(),
        unit: data.unit,
        recordedAt: new Date(),
        source: data.source || 'manual',
        notes: data.notes,
        isVerified: false,
      })
      .returning();
    return result;
  }

  public async getUserTrackingHistory(
    userId: number,
    metricType: string,
    options?: { startDate?: Date; endDate?: Date; limit?: number }
  ): Promise<typeof schema.wellnessTracking.$inferSelect[]> {
    const conditions = [
      eq(schema.wellnessTracking.userId, userId),
      eq(schema.wellnessTracking.metricType, metricType)
    ];

    if (options?.startDate) conditions.push(gte(schema.wellnessTracking.recordedAt, options.startDate));
    if (options?.endDate) conditions.push(lte(schema.wellnessTracking.recordedAt, options.endDate));

    return this.db
      .select()
      .from(schema.wellnessTracking)
      .where(and(...conditions))
      .orderBy(desc(schema.wellnessTracking.recordedAt))
      .limit(options?.limit ?? 100);
  }

  // ==================== ANALYTICS & REPORTING ====================

  public async getWellnessAnalytics(): Promise<{
    programs: Record<string, number | null>;
    activities: Record<string, number | null>;
    tracking: Record<string, number | null>;
    timestamp: string;
  }> {
    const [programs, activities, tracking] = await Promise.all([
      this.db
        .select({
          total_programs: count(),
          active_programs: count(sql`CASE WHEN ${schema.wellnessPrograms.isActive} = true THEN 1 END`),
        })
        .from(schema.wellnessPrograms)
        .then((r: any[]) => r[0]),

      this.db
        .select({
          total_activities: count(),
        })
        .from(schema.wellnessActivities)
        .then((r: any[]) => r[0]),

      this.db
        .select({
          total_tracking_records: count(),
        })
        .from(schema.wellnessTracking)
        .then((r: any[]) => r[0]),
    ]);

    return {
      programs: programs || {},
      activities: activities || {},
      tracking: tracking || {},
      timestamp: new Date().toISOString(),
    };
  }

  public async getUserWellnessSummary(userId: number): Promise<{
    userId: number;
    programs: Record<string, number | string | null>;
    activities: Record<string, number | null>;
    tracking: Record<string, number | string | null | Date>;
    rewards: Record<string, number | string | null>;
    timestamp: string;
  }> {
    const [programs, activities, tracking, rewards] = await Promise.all([
      this.db
        .select({
          enrolled_programs: count(),
          active_programs: count(sql`CASE WHEN ${schema.userProgramEnrollments.status} = 'active' THEN 1 END`),
          average_completion: avg(schema.userProgramEnrollments.completionPercentage),
        })
        .from(schema.userProgramEnrollments)
        .where(eq(schema.userProgramEnrollments.userId, userId))
        .then((r: any[]) => r[0]),

      this.db
        .select({
          total_activities: count(),
          completed_activities: count(sql`CASE WHEN ${schema.userActivities.isCompleted} = true THEN 1 END`),
        })
        .from(schema.userActivities)
        .where(eq(schema.userActivities.userId, userId))
        .then((r: any[]) => r[0]),

      this.db
        .select({
          total_tracking_records: count(),
          last_tracking_date: sql<Date>`MAX(${schema.wellnessTracking.recordedAt})`,
        })
        .from(schema.wellnessTracking)
        .where(eq(schema.wellnessTracking.userId, userId))
        .then((r: any[]) => r[0]),

      this.db
        .select({
          total_rewards: count(),
          earned_points: sum(schema.wellnessRewards.points),
        })
        .from(schema.wellnessRewards)
        .where(eq(schema.wellnessRewards.userId, userId))
        .then((r: any[]) => r[0]),
    ]);

    return {
      userId,
      programs: programs || {},
      activities: activities || {},
      tracking: tracking || {},
      rewards: rewards || {},
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== DATA INTEGRITY ====================

  public async checkDataIntegrity(): Promise<{
    integrityChecks: Array<{ table: string; invalidRecords: number }>;
    timestamp: string;
    overallStatus: 'pass' | 'fail';
  }> {
    const checks = await Promise.all([
      this.db
        .select({ count: count() })
        .from(schema.userProgramEnrollments)
        .where(
          or(
            isNull(schema.userProgramEnrollments.userId),
            isNull(schema.userProgramEnrollments.programId),
            and(
              isNotNull(schema.userProgramEnrollments.enrollmentDate),
              isNotNull(schema.userProgramEnrollments.completionDate),
              gt(schema.userProgramEnrollments.enrollmentDate, schema.userProgramEnrollments.completionDate)
            )
          )
        )
        .then((r: any[]) => r[0]?.count ?? 0),

      this.db
        .select({ count: count() })
        .from(schema.userActivities)
        .where(
          or(
            isNull(schema.userActivities.userId),
            isNull(schema.userActivities.activityId),
            gt(schema.userActivities.activityDate, sql`NOW()`)
          )
        )
        .then((r: any[]) => r[0]?.count ?? 0),

      this.db
        .select({ count: count() })
        .from(schema.wellnessTracking)
        .where(
          or(
            isNull(schema.wellnessTracking.userId),
            sql`${schema.wellnessTracking.metricType} NOT IN ('weight', 'height', 'blood_pressure', 'heart_rate', 'steps', 'sleep_hours', 'calories')`,
            gt(schema.wellnessTracking.recordedAt, sql`NOW()`)
          )
        )
        .then((r: any[]) => r[0]?.count ?? 0),
    ]);

    const integrityChecks = [
      { table: 'user_program_enrollments', invalidRecords: checks[0] },
      { table: 'user_activities', invalidRecords: checks[1] },
      { table: 'wellness_tracking', invalidRecords: checks[2] },
    ];

    return {
      integrityChecks,
      timestamp: new Date().toISOString(),
      overallStatus: integrityChecks.every((c) => c.invalidRecords === 0) ? 'pass' : 'fail',
    };
  }

  // ==================== TABLE STATS ====================

  public async getTableStats(): Promise<
    Record<string, { count: number; size: string; lastUpdated?: string }>
  > {
    // ✅ Use getTableName() helper to get actual DB table names
    const tables = [
      { name: 'wellnessPrograms', tableName: getTableName(schema.wellnessPrograms) },
      { name: 'userProgramEnrollments', tableName: getTableName(schema.userProgramEnrollments) },
      { name: 'wellnessActivities', tableName: getTableName(schema.wellnessActivities) },
      { name: 'userActivities', tableName: getTableName(schema.userActivities) },
      { name: 'wellnessTracking', tableName: getTableName(schema.wellnessTracking) },
      { name: 'wellnessRewards', tableName: getTableName(schema.wellnessRewards) },
    ];

    const stats: Record<string, { count: number; size: string; lastUpdated?: string }> = {};

    for (const { name, tableName } of tables) {
      try {
        const result = await this.client`
          SELECT 
            COUNT(*) as count,
            pg_size_pretty(pg_total_relation_size(${tableName})) as size,
            MAX(updated_at) as last_updated
          FROM ${tableName}
        `;

        const row = result[0];
        stats[name] = {
          count: parseInt(row.count || '0', 10),
          size: row.size || '0 B',
          lastUpdated: row.last_updated ? new Date(row.last_updated).toISOString() : undefined,
        };
      } catch (error) {
        console.error(`Error getting stats for ${name}:`, error);
        stats[name] = { count: 0, size: '0 B' };
      }
    }

    return stats;
  }

  // ==================== SCHEMA BACKUP ====================

  public async getSchemaBackup(): Promise<{
    schema: any[];
    timestamp: string;
    version: string;
  }> {
    // ✅ Use getTableName() for consistency
    const tableNames = Object.entries(schema)
      .filter(([_, val]) => val && typeof val === 'object' && 'tableName' in val)
      .map(([_, val]) => getTableName(val as any));

    const schemaInfo = await this.executeRaw(sql`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY(${tableNames})
      ORDER BY table_name, ordinal_position
    `);

    return {
      schema: schemaInfo,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
  }
}

export const database = Database.getInstance();
export type DatabaseType = Database;
export * from './schema';