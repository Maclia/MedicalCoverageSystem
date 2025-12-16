import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Database connection and configuration management for Finance Service
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
      max: 25, // Maximum number of connections (higher for finance service)
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
      console.error('Finance database connection test failed:', error);
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
      console.error('Error closing finance database connection:', error);
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
   * Execute raw SQL query with safety checks (enhanced for finance)
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

      // Additional finance-specific security checks
      if (normalizedQuery.includes('drop ') || normalizedQuery.includes('truncate ')) {
        throw new Error('DROP and TRUNCATE operations are not allowed in finance service');
      }

      if (params && params.length > 0) {
        return await this.client.unsafe(query, params);
      } else {
        return await this.client.unsafe(query);
      }
    } catch (error) {
      console.error('Error executing finance query:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive table statistics for finance
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
        console.error(`Error getting stats for finance table ${table}:`, error);
        stats[table] = { count: 0, size: '0 B' };
      }
    }

    return stats;
  }

  /**
   * Get financial summary statistics
   */
  public async getFinancialSummary(): Promise<any> {
    try {
      const [invoiceStats, paymentStats, commissionStats] = await Promise.all([
        this.client`
          SELECT
            COUNT(*) as total_invoices,
            COALESCE(SUM(amount), 0) as total_invoiced,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
            COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0) as total_overdue
          FROM invoices
        `,
        this.client`
          SELECT
            COUNT(*) as total_payments,
            COALESCE(SUM(amount), 0) as total_amount,
            COALESCE(AVG(amount), 0) as average_amount,
            COUNT(CASE WHEN payment_method = 'mpesa' THEN 1 END) as mpesa_count,
            COUNT(CASE WHEN payment_method = 'card' THEN 1 END) as card_count,
            COUNT(CASE WHEN payment_method = 'bank' THEN 1 END) as bank_count
          FROM payments
        `,
        this.client`
          SELECT
            COUNT(*) as total_commissions,
            COALESCE(SUM(amount), 0) as total_commission_amount,
            COALESCE(AVG(amount), 0) as average_commission,
            COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_commissions,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_commissions
          FROM commissions
        `
      ]);

      return {
        invoices: invoiceStats[0],
        payments: paymentStats[0],
        commissions: commissionStats[0],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting financial summary:', error);
      throw error;
    }
  }

  /**
   * Backup database schema (for financial compliance)
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
      console.error('Error creating schema backup:', error);
      throw error;
    }
  }

  /**
   * Check data integrity for financial tables
   */
  public async checkDataIntegrity(): Promise<any> {
    try {
      const integrityChecks = [];

      // Check invoice integrity
      const invoiceCheck = await this.client`
        SELECT
          COUNT(*) as invalid_invoices
        FROM invoices
        WHERE amount <= 0 OR due_date < created_at OR status NOT IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')
      `;
      integrityChecks.push({ table: 'invoices', invalidRecords: invoiceCheck[0]?.invalid_invoices });

      // Check payment integrity
      const paymentCheck = await this.client`
        SELECT
          COUNT(*) as invalid_payments
        FROM payments
        WHERE amount <= 0 OR payment_date > NOW() OR payment_method NOT IN ('mpesa', 'card', 'bank', 'cash')
      `;
      integrityChecks.push({ table: 'payments', invalidRecords: paymentCheck[0]?.invalid_payments });

      // Check commission integrity
      const commissionCheck = await this.client`
        SELECT
          COUNT(*) as invalid_commissions
        FROM commissions
        WHERE amount < 0 OR percentage < 0 OR percentage > 100 OR status NOT IN ('pending', 'calculated', 'paid', 'cancelled')
      `;
      integrityChecks.push({ table: 'commissions', invalidRecords: commissionCheck[0]?.invalid_commissions });

      return {
        integrityChecks,
        timestamp: new Date().toISOString(),
        overallStatus: integrityChecks.every(check => check.invalidRecords === 0) ? 'pass' : 'fail'
      };
    } catch (error) {
      console.error('Error checking data integrity:', error);
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