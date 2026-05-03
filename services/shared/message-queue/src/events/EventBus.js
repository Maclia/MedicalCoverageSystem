import { messageQueue } from '../queue/MessageQueue.js';
import { createLogger } from '../config/logger.js';
import { EventEmitter } from 'events';
const logger = createLogger();
class EventBus extends EventEmitter {
    constructor() {
        super();
        this.handlers = new Map();
        this.eventStore = new Map();
        this.maxStoreSize = 1000;
        this.setupEventPersistence();
    }
    // Event publishing
    async publish(event) {
        try {
            // Store event in memory store
            this.storeEvent(event);
            // Publish to message queue for distributed processing
            await messageQueue.publish('domain_events', event, {
                maxRetries: 3,
                metadata: {
                    eventType: event.type,
                    aggregateId: event.aggregateId,
                    aggregateType: event.aggregateType
                }
            });
            // Emit locally for synchronous handlers
            this.emit(event.type, event);
            logger.info('Event published', {
                eventType: event.type,
                eventId: event.id,
                aggregateId: event.aggregateId,
                correlationId: event.metadata.correlationId
            });
        }
        catch (error) {
            logger.error('Failed to publish event', error, {
                eventType: event.type,
                eventId: event.id
            });
            throw error;
        }
    }
    async publishBatch(events) {
        try {
            // Store events
            for (const event of events) {
                this.storeEvent(event);
            }
            // Publish batch to message queue
            await messageQueue.publishBatch('domain_events', events, {
                maxRetries: 3
            });
            // Emit locally
            for (const event of events) {
                this.emit(event.type, event);
            }
            logger.info('Batch events published', {
                count: events.length,
                eventTypes: events.map(e => e.type),
                correlationId: events[0]?.metadata.correlationId
            });
        }
        catch (error) {
            logger.error('Failed to publish batch events', error, {
                count: events.length
            });
            throw error;
        }
    }
    // Event subscription
    async subscribe(eventType, handler, options = {}) {
        const eventHandler = {
            eventType,
            handler,
            options
        };
        // Add to local handlers registry
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType).push(eventHandler);
        // Subscribe to message queue for distributed processing
        await messageQueue.consume('domain_events', async (message) => {
            const event = message.data;
            if (event.type === eventType) {
                try {
                    await handler(event);
                    logger.debug('Event handled successfully', {
                        eventType,
                        eventId: event.id
                    });
                }
                catch (error) {
                    logger.error('Event handler failed', error, {
                        eventType,
                        eventId: event.id
                    });
                    throw error; // Let message queue handle retries
                }
            }
        }, {
            groupName: `event_handlers_${eventType}`,
            consumerName: `handler_${Date.now()}`,
            batchSize: options.batchSize || 10,
            processingTimeout: options.processingTimeout || 30000
        });
        logger.info('Event handler subscribed', {
            eventType,
            handlerName: handler.name || 'anonymous',
            options
        });
    }
    // Unsubscribe from events
    unsubscribe(eventType, handler) {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
            const filteredHandlers = handler
                ? handlers.filter(h => h.handler !== handler)
                : [];
            this.handlers.set(eventType, filteredHandlers);
            logger.info('Event handler unsubscribed', {
                eventType,
                handlerName: handler?.name || 'all',
                remainingHandlers: filteredHandlers.length
            });
        }
    }
    // Query events
    getEventsByAggregate(aggregateId, limit) {
        const allEvents = Array.from(this.eventStore.values())
            .flat()
            .filter(event => event.aggregateId === aggregateId)
            .sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);
        return limit ? allEvents.slice(-limit) : allEvents;
    }
    getEventsByType(eventType, limit) {
        const allEvents = Array.from(this.eventStore.values())
            .flat()
            .filter(event => event.type === eventType)
            .sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);
        return limit ? allEvents.slice(0, limit) : allEvents;
    }
    getEventsByCorrelation(correlationId) {
        return Array.from(this.eventStore.values())
            .flat()
            .filter(event => event.metadata.correlationId === correlationId)
            .sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);
    }
    // Replay events
    async replayEvents(aggregateId, fromVersion = 0) {
        const events = this.getEventsByAggregate(aggregateId)
            .filter(event => event.metadata.version > fromVersion);
        logger.info('Replaying events', {
            aggregateId,
            fromVersion,
            eventCount: events.length
        });
        for (const event of events) {
            this.emit(event.type, event);
        }
        return events;
    }
    // Event versioning
    async migrateEventSchema(eventType, migrator) {
        const events = this.getEventsByType(eventType);
        let migratedCount = 0;
        for (const event of events) {
            try {
                const migratedEvent = migrator(event);
                // Update event in store
                // This would typically update persistent storage
                migratedCount++;
            }
            catch (error) {
                logger.error('Event migration failed', error, {
                    eventType,
                    eventId: event.id
                });
            }
        }
        logger.info('Event migration completed', {
            eventType,
            totalEvents: events.length,
            migratedCount
        });
    }
    storeEvent(event) {
        // Store in memory (in production, this would be persistent storage)
        if (!this.eventStore.has(event.aggregateId)) {
            this.eventStore.set(event.aggregateId, []);
        }
        const events = this.eventStore.get(event.aggregateId);
        events.push(event);
        // Maintain store size limit
        if (events.length > this.maxStoreSize) {
            events.splice(0, events.length - this.maxStoreSize);
        }
    }
    setupEventPersistence() {
        // Set up periodic cleanup or persistence tasks
        setInterval(() => {
            this.cleanupOldEvents();
        }, 60000); // Clean up every minute
    }
    cleanupOldEvents() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        for (const [aggregateId, events] of this.eventStore) {
            const filteredEvents = events.filter(event => now - event.metadata.timestamp < maxAge);
            if (filteredEvents.length !== events.length) {
                this.eventStore.set(aggregateId, filteredEvents);
            }
        }
    }
    // Event statistics
    getEventStats() {
        const allEvents = Array.from(this.eventStore.values()).flat();
        const eventsByType = {};
        const eventsByAggregate = {};
        for (const event of allEvents) {
            eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
            eventsByAggregate[event.aggregateType] = (eventsByAggregate[event.aggregateType] || 0) + 1;
        }
        const activeHandlers = Array.from(this.handlers.values())
            .reduce((total, handlers) => total + handlers.length, 0);
        return {
            totalEvents: allEvents.length,
            eventsByType,
            eventsByAggregate,
            activeHandlers
        };
    }
}
// Domain event factory
export class EventFactory {
    static createEvent(params) {
        return {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: params.type,
            aggregateId: params.aggregateId,
            aggregateType: params.aggregateType,
            data: params.data,
            metadata: {
                userId: params.userId,
                correlationId: params.correlationId,
                causationId: params.causationId,
                timestamp: Date.now(),
                version: 1,
                ...params.metadata
            }
        };
    }
    static createPatientEvent(type, patientId, data, userId, correlationId) {
        return this.createEvent({
            type: `patient.${type}`,
            aggregateId: patientId,
            aggregateType: 'Patient',
            data,
            userId,
            correlationId
        });
    }
    static createAppointmentEvent(type, appointmentId, data, userId, correlationId) {
        return this.createEvent({
            type: `appointment.${type}`,
            aggregateId: appointmentId,
            aggregateType: 'Appointment',
            data,
            userId,
            correlationId
        });
    }
    static createInvoiceEvent(type, invoiceId, data, userId, correlationId) {
        return this.createEvent({
            type: `invoice.${type}`,
            aggregateId: invoiceId,
            aggregateType: 'Invoice',
            data,
            userId,
            correlationId
        });
    }
    static createPaymentEvent(type, paymentId, data, userId, correlationId) {
        return this.createEvent({
            type: `payment.${type}`,
            aggregateId: paymentId,
            aggregateType: 'Payment',
            data,
            userId,
            correlationId
        });
    }
    static createCommissionEvent(type, commissionId, data, userId, correlationId) {
        return this.createEvent({
            type: `commission.${type}`,
            aggregateId: commissionId,
            aggregateType: 'Commission',
            data,
            userId,
            correlationId
        });
    }
}
export const eventBus = new EventBus();
export default eventBus;
