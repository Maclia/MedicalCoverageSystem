import { eq, and, gte, lt, sql } from 'drizzle-orm';
import type { Logger } from 'pino';
import { startOfHour, startOfDay, subHours, subDays, format, parse } from 'date-fns';
import { events, hourlyAggregates, dailyAggregates, insertHourlyAggregateSchema, insertDailyAggregateSchema } from '../schema';

export class AnalyticsAggregator {
  private db: any;
  private logger: Logger;
  private aggregationInterval: NodeJS.Timer | null = null;
  private isAggregating = false;

  constructor(db: any, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Compute hourly aggregate for a specific hour
   */
  async aggregateHour(hour: Date, metricType: string): Promise<void> {
    try {
      const hourStart = startOfHour(hour);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      // Get all events for this hour
      const eventList = await this.db
        .select()
        .from(events)
        .where(
          and(
            gte(events.timestamp, hourStart),
            lt(events.timestamp, hourEnd)
          )
        );

      // Filter by metric type
      const metricEvents = eventList.filter((e: any) => {
        if (metricType === 'claims') return ['claim_created', 'claim_approved', 'claim_rejected'].includes(e.eventType);
        if (metricType === 'payments') return ['payment_processed', 'payment_failed'].includes(e.eventType);
        if (metricType === 'sagas') return ['saga_started', 'saga_completed', 'saga_failed'].includes(e.eventType);
        if (metricType === 'recovery') return ['recovery_initiated', 'recovery_success', 'recovery_failed'].includes(e.eventType);
        return false;
      });

      if (metricEvents.length === 0) {
        this.logger.debug(`No ${metricType} events for hour ${hourStart.toISOString()}`);
        return;
      }

      // Calculate metrics
      const successCount = metricEvents.filter((e: any) => e.status === 'SUCCESS').length;
      const failureCount = metricEvents.filter((e: any) => e.status === 'FAILURE').length;
      const durations = metricEvents.map((e: any) => e.duration || 0).filter((d: number) => d > 0);
      
      const aggregate = {
        hour: hourStart,
        metricType,
        totalCount: metricEvents.length,
        successCount,
        failureCount,
        averageDuration: durations.length > 0 ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length : null,
        minDuration: durations.length > 0 ? Math.min(...durations) : null,
        maxDuration: durations.length > 0 ? Math.max(...durations) : null,
        totalValue: this.calculateTotalValue(metricEvents),
        metadata: {
          eventCount: metricEvents.length,
          hourStart: hourStart.toISOString(),
          hourEnd: hourEnd.toISOString(),
        },
      };

      // Insert or update
      await this.db
        .insert(hourlyAggregates)
        .values(aggregate)
        .onConflictDoUpdate({
          target: [hourlyAggregates.hour, hourlyAggregates.metricType],
          set: aggregate,
        });

      this.logger.debug(`Aggregated ${metricType} for hour ${hourStart.toISOString()}`);
    } catch (error) {
      this.logger.error(`Error aggregating hour for ${metricType}:`, error);
    }
  }

  /**
   * Compute daily aggregate for a specific date
   */
  async aggregateDay(date: Date, metricType: string): Promise<void> {
    try {
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dateStr = format(dayStart, 'yyyy-MM-dd');

      // Get all events for this day
      const eventList = await this.db
        .select()
        .from(events)
        .where(
          and(
            gte(events.timestamp, dayStart),
            lt(events.timestamp, dayEnd)
          )
        );

      // Filter by metric type
      const metricEvents = eventList.filter((e: any) => {
        if (metricType === 'claims') return ['claim_created', 'claim_approved', 'claim_rejected'].includes(e.eventType);
        if (metricType === 'payments') return ['payment_processed', 'payment_failed'].includes(e.eventType);
        if (metricType === 'sagas') return ['saga_started', 'saga_completed', 'saga_failed'].includes(e.eventType);
        if (metricType === 'recovery') return ['recovery_initiated', 'recovery_success', 'recovery_failed'].includes(e.eventType);
        return false;
      });

      if (metricEvents.length === 0) {
        this.logger.debug(`No ${metricType} events for date ${dateStr}`);
        return;
      }

      // Calculate metrics
      const successCount = metricEvents.filter((e: any) => e.status === 'SUCCESS').length;
      const failureCount = metricEvents.filter((e: any) => e.status === 'FAILURE').length;
      const durations = metricEvents.map((e: any) => e.duration || 0).filter((d: number) => d > 0);
      
      const successRate = metricEvents.length > 0 ? (successCount / metricEvents.length) * 100 : 0;
      
      // Calculate percentiles
      const sorted = durations.sort((a: number, b: number) => a - b);
      const getPercentile = (arr: number[], p: number) => {
        const index = Math.ceil((p / 100) * arr.length) - 1;
        return arr[Math.max(0, index)];
      };

      // Find peak hour
      const hourBuckets = new Map<number, number>();
      metricEvents.forEach((e: any) => {
        const hour = new Date(e.timestamp).getHours();
        hourBuckets.set(hour, (hourBuckets.get(hour) || 0) + 1);
      });
      const peakHour = hourBuckets.size > 0 
        ? Array.from(hourBuckets.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0]
        : undefined;

      const aggregate = {
        date: dateStr,
        metricType,
        totalCount: metricEvents.length,
        successCount,
        failureCount,
        averageDuration: durations.length > 0 ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length : null,
        minDuration: durations.length > 0 ? Math.min(...durations) : null,
        maxDuration: durations.length > 0 ? Math.max(...durations) : null,
        totalValue: this.calculateTotalValue(metricEvents),
        peakHour,
        successRate,
        p50Duration: sorted.length > 0 ? getPercentile(sorted, 50) : null,
        p95Duration: sorted.length > 0 ? getPercentile(sorted, 95) : null,
        p99Duration: sorted.length > 0 ? getPercentile(sorted, 99) : null,
        metadata: {
          eventCount: metricEvents.length,
          dateStr,
        },
      };

      // Insert or update
      await this.db
        .insert(dailyAggregates)
        .values(aggregate)
        .onConflictDoUpdate({
          target: [dailyAggregates.date, dailyAggregates.metricType],
          set: aggregate,
        });

      this.logger.debug(`Aggregated ${metricType} for date ${dateStr}`);
    } catch (error) {
      this.logger.error(`Error aggregating day for ${metricType}:`, error);
    }
  }

  /**
   * Run aggregation for current and past hours
   */
  async aggregateRecentHours(hoursBack: number = 2): Promise<void> {
    if (this.isAggregating) {
      this.logger.debug('Aggregation already in progress, skipping');
      return;
    }

    try {
      this.isAggregating = true;

      const metricTypes = ['claims', 'payments', 'sagas', 'recovery'];
      
      for (let i = 0; i < hoursBack; i++) {
        const hour = new Date(Date.now() - i * 60 * 60 * 1000);
        for (const metricType of metricTypes) {
          await this.aggregateHour(hour, metricType);
        }
      }

      this.logger.debug(`Completed hourly aggregation for last ${hoursBack} hours`);
    } catch (error) {
      this.logger.error('Error in hourly aggregation:', error);
    } finally {
      this.isAggregating = false;
    }
  }

  /**
   * Run aggregation for current and past days
   */
  async aggregateRecentDays(daysBack: number = 7): Promise<void> {
    if (this.isAggregating) {
      this.logger.debug('Aggregation already in progress, skipping');
      return;
    }

    try {
      this.isAggregating = true;

      const metricTypes = ['claims', 'payments', 'sagas', 'recovery'];
      
      for (let i = 0; i < daysBack; i++) {
        const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        for (const metricType of metricTypes) {
          await this.aggregateDay(day, metricType);
        }
      }

      this.logger.debug(`Completed daily aggregation for last ${daysBack} days`);
    } catch (error) {
      this.logger.error('Error in daily aggregation:', error);
    } finally {
      this.isAggregating = false;
    }
  }

  /**
   * Start periodic aggregation schedule
   */
  startAggregationSchedule(intervalMs: number): void {
    this.aggregationInterval = setInterval(async () => {
      await this.aggregateRecentHours(1);
      await this.aggregateRecentDays(1);
    }, intervalMs);

    this.logger.info(`Aggregation schedule started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop aggregation schedule
   */
  stopAggregationSchedule(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
      this.logger.info('Aggregation schedule stopped');
    }
  }

  /**
   * Calculate total value from events metadata
   */
  private calculateTotalValue(eventList: any[]): number {
    return eventList.reduce((sum, event) => {
      const value = event.metadata?.amount || event.metadata?.totalValue || 0;
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  }
}
