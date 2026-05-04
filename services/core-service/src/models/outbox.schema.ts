import { pgTable, uuid, text, integer, jsonb, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const outboxStatusEnum = pgEnum('outbox_status', [
  'PENDING',
  'PUBLISHED',
  'FAILED',
  'CANCELLED'
]);

export const outboxEvents = pgTable('outbox_events', {
  id: uuid('id').primaryKey().notNull(),
  aggregateId: uuid('aggregate_id').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  eventType: text('event_type').notNull(),
  eventVersion: integer('event_version').notNull().default(1),
  schemaVersion: text('schema_version'),
  payload: jsonb('payload').notNull(),
  status: outboxStatusEnum('status').default('PENDING'),
  retries: integer('retries').default(0),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),
  lastAttemptAt: timestamp('last_attempt_at')
});

// Indexes for efficient querying
export const outboxStatusIdx = pgTable('idx_outbox_status', {
  status: outboxStatusEnum('status')
});

export const outboxCreatedAtIndex = pgTable('idx_outbox_created_at', {
  createdAt: timestamp('created_at')
});

export type OutboxEvent = typeof outboxEvents.$inferSelect;
export type NewOutboxEvent = typeof outboxEvents.$inferInsert;