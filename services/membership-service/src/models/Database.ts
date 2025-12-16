import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Database connection and configuration management
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
      idle_timeout: 20, // Idle timeout in seconds
      connect_timeout: 10, // Connect timeout in seconds
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
   * Test database connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.client`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
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
      console.error('Error closing database connection:', error);
      throw error;
    }
  }

  /**
   * Health check for database
   */
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy', latency?: number }> {
    const start = Date.now();
    try {
      const result = await this.client`SELECT 1 as health_check`;
      const latency = Date.now() - start;

      return {
        status: result.length > 0 ? 'healthy' : 'unhealthy',
        latency
      };
    } catch (error) {
      return {
        status: 'unhealthy'
      };
    }
  }

  /**
   * Get database information
   */
  public async getDatabaseInfo(): Promise<{ version: string, size: string }> {
    try {
      const [versionResult, sizeResult] = await Promise.all([
        this.client`SELECT version() as version`,
        this.client`SELECT pg_size_pretty(pg_database_size(current_database())) as size`
      ]);

      return {
        version: versionResult[0]?.version || 'Unknown',
        size: sizeResult[0]?.size || 'Unknown'
      };
    } catch (error) {
      console.error('Error getting database info:', error);
      return {
        version: 'Unknown',
        size: 'Unknown'
      };
    }
  }

  /**
   * Execute raw SQL query with safety checks
   */
  public async executeQuery(query: string, params?: any[]): Promise<any[]> {
    try {
      // Basic SQL injection protection - only allow SELECT queries
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery.startsWith('select') && !normalizedQuery.startsWith('with')) {
        throw new Error('Only SELECT queries are allowed for security reasons');
      }

      if (params && params.length > 0) {
        return await this.client.unsafe(query, params);
      } else {
        return await this.client.unsafe(query);
      }
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  /**
   * Begin database transaction
   */
  public async beginTransaction() {
    return this.db.begin();
  }

  /**
   * Run migrations (placeholder for future implementation)
   */
  public async runMigrations(): Promise<void> {
    // This would typically be handled by drizzle-kit
    console.log('Migrations should be run via drizzle-kit migrate command');
  }

  /**
   * Get table statistics
   */
  public async getTableStats(): Promise<Record<string, { count: number, size: string }>> {
    const tables = Object.keys(schema);
    const stats: Record<string, { count: number, size: string }> = {};

    for (const table of tables) {
      try {
        const [countResult, sizeResult] = await Promise.all([
          this.client`SELECT COUNT(*) as count FROM ${this.client(table)}`,
          this.client`SELECT pg_size_pretty(pg_total_relation_size(${this.client(table)})) as size`
        ]);

        stats[table] = {
          count: parseInt(countResult[0]?.count || '0'),
          size: sizeResult[0]?.size || '0 B'
        };
      } catch (error) {
        console.error(`Error getting stats for table ${table}:`, error);
        stats[table] = { count: 0, size: '0 B' };
      }
    }

    return stats;
  }
}

// Export singleton instance
export const database = Database.getInstance();

// Export types
export type DatabaseType = ReturnType<typeof Database.getInstance>;

// Export schema for easy access
export * from './schema';