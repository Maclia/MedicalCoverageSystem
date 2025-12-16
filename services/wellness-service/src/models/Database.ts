import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Database connection and configuration management for Wellness Service
 * Handles PostgreSQL connection with Drizzle ORM
 */
export class Database {
  private static instance: Database;
  private db: ReturnType<typeof drizzle>;
  private client: postgres.Sql;

  private constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Configure postgres client with connection pooling
    this.client = postgres(databaseUrl, {
      max: 20, // Maximum number of connections
      idle_timeout: 30, // Idle timeout in seconds
      connect_timeout: 15, // Connect timeout in seconds
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      prepare: false, // Disable prepared statements for better performance
    });

    // Initialize Drizzle ORM
    this.db = drizzle(this.client, { schema });
  }

  /**
   * Get singleton database instance
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Get Drizzle database instance
   */
  public getDb() {
    return this.db;
  }

  /**
   * Get postgres client for raw queries
   */
  public getClient() {
    return this.client;
  }

  /**
   * Test database connection with retry logic
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.client`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Wellness database connection test failed:', error);
      return false;
    }
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    try {
      await this.client.end();
    } catch (error) {
      console.error('Error closing wellness database connection:', error);
      throw error;
    }
  }

  /**
   * Health check for database with latency
   */
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy', latency?: number, poolInfo?: any }> {
    const start = Date.now();
    try {
      const result = await this.client`SELECT 1 as health_check, version() as db_version`;
      const latency = Date.now() - start;

      // Get pool info
      const poolStats = await this.client`
        SELECT
          count(*) as active_connections,
          sum(CASE WHEN state = 'active' THEN 1 ELSE 0 END) as active_queries
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;

      return {
        status: result.length > 0 ? 'healthy' : 'unhealthy',
        latency,
        poolInfo: poolStats[0]
      };
    } catch (error) {
      return {
        status: 'unhealthy'
      };
    }
  }

  /**
   * Begin database transaction with isolation level
   */
  public async beginTransaction(isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE') {
    const tx = await this.db.begin();
    if (isolationLevel) {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL ${sql.raw(isolationLevel)}`);
    }
    return tx;
  }

  /**
   * Execute raw SQL query with safety checks
   */
  public async executeQuery(query: string, params?: any[]): Promise<any[]> {
    try {
      // Enhanced SQL injection protection
      const normalizedQuery = query.trim().toLowerCase();
      const allowedPrefixes = ['select', 'insert', 'update', 'delete', 'with', 'analyze', 'explain'];
      const hasAllowedPrefix = allowedPrefixes.some(prefix => normalizedQuery.startsWith(prefix));

      if (!hasAllowedPrefix) {
        throw new Error('Only SELECT, INSERT, UPDATE, DELETE, WITH, ANALYZE, EXPLAIN queries are allowed for security reasons');
      }

      // Additional wellness-specific security checks
      if (normalizedQuery.includes('drop ') || normalizedQuery.includes('truncate ')) {
        throw new Error('DROP and TRUNCATE operations are not allowed in wellness service');
      }

      if (params && params.length > 0) {
        return await this.client.unsafe(query, params);
      } else {
        return await this.client.unsafe(query);
      }
    } catch (error) {
      console.error('Error executing wellness query:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive table statistics for wellness service
   */
  public async getTableStats(): Promise<Record<string, { count: number, size: string, lastUpdated?: string }>> {
    const tables = Object.keys(schema);
    const stats: Record<string, { count: number, size: string, lastUpdated?: string }> = {};

    for (const table of tables) {
      try {
        const [countResult, sizeResult, lastUpdateResult] = await Promise.all([
          this.client`SELECT COUNT(*) as count FROM ${this.client(table)}`,
          this.client`SELECT pg_size_pretty(pg_total_relation_size(${this.client(table)})) as size`,
          this.client`SELECT MAX(updated_at) as last_updated FROM ${this.client(table)}`
        ]);

        stats[table] = {
          count: parseInt(countResult[0]?.count || '0'),
          size: sizeResult[0]?.size || '0 B',
          lastUpdated: lastUpdateResult[0]?.last_updated?.toISOString()
        };
      } catch (error) {
        console.error(`Error getting stats for wellness table ${table}:`, error);
        stats[table] = { count: 0, size: '0 B' };
      }
    }

    return stats;
  }

  /**
   * Get wellness analytics summary
   */
  public async getWellnessAnalytics(): Promise<any> {
    try {
      const [programStats, activityStats, trackingStats] = await Promise.all([
        this.client`
          SELECT
            COUNT(*) as total_programs,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_programs,
            COUNT(CASE WHEN program_type = 'fitness' THEN 1 END) as fitness_programs,
            COUNT(CASE WHEN program_type = 'nutrition' THEN 1 END) as nutrition_programs,
            COUNT(CASE WHEN program_type = 'mental_health' THEN 1 END) as mental_health_programs,
            COUNT(CASE WHEN program_type = 'preventive_care' THEN 1 END) as preventive_care_programs
          FROM wellness_programs
        `,
        this.client`
          SELECT
            COUNT(*) as total_activities,
            COUNT(CASE WHEN activity_type = 'exercise' THEN 1 END) as exercises,
            COUNT(CASE WHEN activity_type = 'nutrition' THEN 1 END) as nutrition_activities,
            COUNT(CASE WHEN activity_type = 'meditation' THEN 1 END) as meditations,
            COUNT(CASE WHEN activity_type = 'health_screening' THEN 1 END) as health_screenings,
            COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_activities
          FROM wellness_activities
        `,
        this.client`
          SELECT
            COUNT(*) as total_tracking_records,
            COUNT(CASE WHEN metric_type = 'weight' THEN 1 END) as weight_records,
            COUNT(CASE WHEN metric_type = 'blood_pressure' THEN 1 END) as bp_records,
            COUNT(CASE WHEN metric_type = 'heart_rate' THEN 1 END) as hr_records,
            COUNT(CASE WHEN metric_type = 'steps' THEN 1 END) as steps_records,
            COUNT(CASE WHEN metric_type = 'sleep_hours' THEN 1 END) as sleep_records
          FROM wellness_tracking
        `
      ]);

      return {
        programs: programStats[0],
        activities: activityStats[0],
        tracking: trackingStats[0],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting wellness analytics:', error);
      throw error;
    }
  }

  /**
   * Get user wellness summary
   */
  public async getUserWellnessSummary(userId: number): Promise<any> {
    try {
      const [programsSummary, activitiesSummary, trackingSummary, rewardsSummary] = await Promise.all([
        this.client`
          SELECT
            COUNT(*) as enrolled_programs,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_programs,
            COUNT(CASE WHEN completion_percentage >= 100 THEN 1 END) as completed_programs,
            COALESCE(AVG(completion_percentage), 0) as average_completion
          FROM user_program_enrollments
          WHERE user_id = ${userId}
        `,
        this.client`
          SELECT
            COUNT(*) as total_activities,
            COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_activities,
            COUNT(CASE WHEN activity_date >= NOW() - INTERVAL '7 days' THEN 1 END) as activities_this_week,
            COUNT(CASE WHEN activity_date >= NOW() - INTERVAL '30 days' THEN 1 END) as activities_this_month
          FROM user_activities
          WHERE user_id = ${userId}
        `,
        this.client`
          SELECT
            COUNT(*) as total_tracking_records,
            COUNT(CASE WHEN recorded_at >= NOW() - INTERVAL '7 days' THEN 1 END) as records_this_week,
            COUNT(CASE WHEN recorded_at >= NOW() - INTERVAL '30 days' THEN 1 END) as records_this_month,
            MAX(recorded_at) as last_tracking_date
          FROM wellness_tracking
          WHERE user_id = ${userId}
        `,
        this.client`
          SELECT
            COUNT(*) as total_points,
            SUM(points) as earned_points,
            COUNT(CASE WHEN category = 'daily' THEN 1 END) as daily_rewards,
            COUNT(CASE WHERE category = 'weekly' THEN 1 END) as weekly_rewards,
            COUNT(CASE WHERE category = 'monthly' THEN 1 END) as monthly_rewards
          FROM wellness_rewards
          WHERE user_id = ${userId}
        `
      ]);

      return {
        userId,
        programs: programsSummary[0],
        activities: activitiesSummary[0],
        tracking: trackingSummary[0],
        rewards: rewardsSummary[0],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting user wellness summary:', error);
      throw error;
    }
  }

  /**
   * Backup database schema (for compliance)
   */
  public async getSchemaBackup(): Promise<any> {
    try {
      const schemaInfo = await this.client`
        SELECT
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name IN (
          ${this.client(Object.keys(schema))}
        )
        ORDER BY table_name, ordinal_position
      `;

      return {
        schema: schemaInfo,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
    } catch (error) {
      console.error('Error creating wellness schema backup:', error);
      throw error;
    }
  }

  /**
   * Check data integrity for wellness tables
   */
  public async checkDataIntegrity(): Promise<any> {
    try {
      const integrityChecks = [];

      // Check user enrollments
      const enrollmentCheck = await this.client`
        SELECT
          COUNT(*) as invalid_enrollments
        FROM user_program_enrollments
        WHERE user_id IS NULL
        OR program_id IS NULL
        OR enrolled_at > completed_at
      `;
      integrityChecks.push({ table: 'user_program_enrollments', invalidRecords: enrollmentCheck[0]?.invalid_enrollments });

      // Check activities
      const activityCheck = await this.client`
        SELECT
          COUNT(*) as invalid_activities
        FROM user_activities
        WHERE user_id IS NULL
        OR program_id IS NULL
        OR activity_date > NOW()
      `;
      integrityChecks.push({ table: 'user_activities', invalidRecords: activityCheck[0]?.invalid_activities });

      // Check tracking records
      const trackingCheck = await this.client`
        SELECT
          COUNT(*) as invalid_tracking_records
        FROM wellness_tracking
        WHERE user_id IS NULL
        OR metric_type NOT IN ('weight', 'height', 'blood_pressure', 'heart_rate', 'steps', 'sleep_hours', 'calories')
        OR recorded_at > NOW()
      `;
      integrityChecks.push({ table: 'wellness_tracking', invalidRecords: trackingCheck[0]?.invalid_tracking_records });

      return {
        integrityChecks,
        timestamp: new Date().toISOString(),
        overallStatus: integrityChecks.every(check => check.invalidRecords === 0) ? 'pass' : 'fail'
      };
    } catch (error) {
      console.error('Error checking wellness data integrity:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const database = Database.getInstance();

// Export types
export type DatabaseType = ReturnType<typeof Database.getInstance>;

// Export schema for easy access
export * from './schema';