import { EventEmitter } from 'events';
export interface DomainEvent {
    id: string;
    type: string;
    aggregateId: string;
    aggregateType: string;
    data: any;
    metadata: {
        userId?: string;
        correlationId?: string;
        causationId?: string;
        timestamp: number;
        version: number;
    };
}
export interface EventHandler {
    eventType: string;
    handler: (event: DomainEvent) => Promise<void>;
    options?: {
        batchSize?: number;
        processingTimeout?: number;
        retryAttempts?: number;
    };
}
declare class EventBus extends EventEmitter {
    private readonly handlers;
    private readonly eventStore;
    private readonly maxStoreSize;
    constructor();
    publish(event: DomainEvent): Promise<void>;
    publishBatch(events: DomainEvent[]): Promise<void>;
    subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>, options?: {
        batchSize?: number;
        processingTimeout?: number;
        retryAttempts?: number;
    }): Promise<void>;
    unsubscribe(eventType: string, handler?: (event: DomainEvent) => Promise<void>): void;
    getEventsByAggregate(aggregateId: string, limit?: number): DomainEvent[];
    getEventsByType(eventType: string, limit?: number): DomainEvent[];
    getEventsByCorrelation(correlationId: string): DomainEvent[];
    replayEvents(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]>;
    migrateEventSchema(eventType: string, migrator: (event: DomainEvent) => DomainEvent): Promise<void>;
    private storeEvent;
    private setupEventPersistence;
    private cleanupOldEvents;
    getEventStats(): {
        totalEvents: number;
        eventsByType: Record<string, number>;
        eventsByAggregate: Record<string, number>;
        activeHandlers: number;
    };
}
export declare class EventFactory {
    static createEvent(params: {
        type: string;
        aggregateId: string;
        aggregateType: string;
        data: any;
        userId?: string;
        correlationId?: string;
        causationId?: string;
        metadata?: Record<string, any>;
    }): DomainEvent;
    static createPatientEvent(type: string, patientId: string, data: any, userId?: string, correlationId?: string): DomainEvent;
    static createAppointmentEvent(type: string, appointmentId: string, data: any, userId?: string, correlationId?: string): DomainEvent;
    static createInvoiceEvent(type: string, invoiceId: string, data: any, userId?: string, correlationId?: string): DomainEvent;
    static createPaymentEvent(type: string, paymentId: string, data: any, userId?: string, correlationId?: string): DomainEvent;
    static createCommissionEvent(type: string, commissionId: string, data: any, userId?: string, correlationId?: string): DomainEvent;
}
export declare const eventBus: EventBus;
export default eventBus;
