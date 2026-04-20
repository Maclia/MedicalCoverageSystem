import { eq, and, gte, lt } from 'drizzle-orm';
import type { ReturnType as DrizzleReturnType } from 'drizzle-orm';
import type { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { events, insertEventSchema } from '../schema';

interface EventPayload {
  eventType: string;
  correlationId?: string;
  sagaId?: string;
  claimId?: string;
  memberId?: string;
  providerId?: string;
  companyId?: string;
  status?: string;
  statusCode?: number;
  duration?: number;
  metadata?: Record<string, any>;
  errorMessage?: string;
  errorStack?: any;
  source: string;
}

export class MetricsCollector {
  private db: any;
  private logger: Logger;
  private eventBuffer: EventPayload[] = [];
  private flushInterval: NodeJS.Timer | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor(db: any, logger: Logger) {
    this.db = db;
    this.logger = logger;
    this.startBuffering();
  }

  /**
   * Record a new event
   */
  async recordEvent(event: EventPayload): Promise<void> {
    try {
      // Validate event
      const validated = insertEventSchema.parse({
        eventType: event.eventType,
        correlationId: event.correlationId || uuidv4(),
        sagaId: event.sagaId,
        claimId: event.claimId,
        memberId: event.memberId,
        providerId: event.providerId,
        companyId: event.companyId,
        status: event.status,
        statusCode: event.statusCode,
        duration: event.duration,
        metadata: event.metadata,
        errorMessage: event.errorMessage,
        errorStack: event.errorStack,
        source: event.source,
      });

      // Add to buffer
      this.eventBuffer.push(validated);

      // Flush if buffer is full
      if (this.eventBuffer.length >= this.BUFFER_SIZE) {
        await this.flushBuffer();
      }
    } catch (error) {
      this.logger.error('Error recording event:', error);
    }
  }

  /**
   * Batch record multiple events
   */
  async recordEvents(eventList: EventPayload[]): Promise<void> {
    for (const event of eventList) {
      await this.recordEvent(event);
    }
  }

  /**
   * Get events for time range
   */
  async getEvents(startTime: Date, endTime: Date, eventType?: string) {
    try {
      let query = this.db
        .select()
        .from(events)
        .where(
          and(
            gte(events.timestamp, startTime),
            lt(events.timestamp, endTime)
          )
        );

      if (eventType) {
        query = query.where(eq(events.eventType, eventType));
      }

      return await query;
    } catch (error) {
      this.logger.error('Error fetching events:', error);
      return [];
    }
  }

  /**
   * Get event count for metric type
   */
  async getEventCount(startTime: Date, endTime: Date, eventType: string) {
    try {
      const result = await this.db
        .select()
        .from(events)
        .where(
          and(
            eq(events.eventType, eventType),
            gte(events.timestamp, startTime),
            lt(events.timestamp, endTime)
          )
        );

      return result.length;
    } catch (error) {
      this.logger.error('Error counting events:', error);
      return 0;
    }
  }

  /**
   * Get event success rate
   */
  async getSuccessRate(startTime: Date, endTime: Date, eventType: string) {
    try {
      const allEvents = await this.getEvents(startTime, endTime, eventType);
      if (allEvents.length === 0) return 0;

      const successCount = allEvents.filter((e: any) => e.status === 'SUCCESS').length;
      return (successCount / allEvents.length) * 100;
    } catch (error) {
      this.logger.error('Error calculating success rate:', error);
      return 0;
    }
  }

  /**
   * Get average duration for event type
   */
  async getAverageDuration(startTime: Date, endTime: Date, eventType: string) {
    try {
      const allEvents = await this.getEvents(startTime, endTime, eventType);
      if (allEvents.length === 0) return 0;

      const totalDuration = allEvents.reduce((sum: number, e: any) => sum + (e.duration || 0), 0);
      return totalDuration / allEvents.length;
    } catch (error) {
      this.logger.error('Error calculating average duration:', error);
      return 0;
    }
  }

  /**
   * Get duration percentiles
   */
  async getDurationPercentiles(startTime: Date, endTime: Date, eventType: string) {
    try {
      const allEvents = await this.getEvents(startTime, endTime, eventType);
      if (allEvents.length === 0) return { p50: 0, p95: 0, p99: 0 };

      const durations = allEvents
        .map((e: any) => e.duration || 0)
        .sort((a: number, b: number) => a - b);

      const getPercentile = (arr: number[], p: number) => {
        const index = Math.ceil((p / 100) * arr.length) - 1;
        return arr[Math.max(0, index)];
      };

      return {
        p50: getPercentile(durations, 50),
        p95: getPercentile(durations, 95),
        p99: getPercentile(durations, 99),
      };
    } catch (error) {
      this.logger.error('Error calculating percentiles:', error);
      return { p50: 0, p95: 0, p99: 0 };
    }
  }

  /**
   * Get events by correlation ID (for saga tracing)
   */
  async getEventsByCorrelationId(correlationId: string) {
    try {
      return await this.db
        .select()
        .from(events)
        .where(eq(events.correlationId, correlationId))
        .orderBy(events.timestamp);
    } catch (error) {
      this.logger.error('Error fetching events by correlation ID:', error);
      return [];
    }
  }

  /**
   * Flush event buffer to database
   */
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    try {
      const toInsert = [...this.eventBuffer];
      this.eventBuffer = [];

      await this.db.insert(events).values(toInsert);

      this.logger.debug(`Flushed ${toInsert.length} events to database`);
    } catch (error) {
      this.logger.error('Error flushing event buffer:', error);
      // Restore buffer if insertion failed
      this.eventBuffer = [...this.eventBuffer];
    }
  }

  /**
   * Start periodic buffer flushing
   */
  private startBuffering(): void {
    this.flushInterval = setInterval(async () => {
      await this.flushBuffer();
    }, this.FLUSH_INTERVAL);

    this.logger.info(`Event buffering started (flush interval: ${this.FLUSH_INTERVAL}ms, buffer size: ${this.BUFFER_SIZE})`);
  }

  /**
   * Stop periodic buffer flushing
   */
  stopBuffering(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
      this.logger.info('Event buffering stopped');
    }
  }

  /**
   * Force flush before shutdown
   */
  async gracefulShutdown(): Promise<void> {
    this.stopBuffering();
    await this.flushBuffer();
  }
}
