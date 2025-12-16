import { SpanExporter, ReadableSpan, ExportResult, ExportResultCode } from '@opentelemetry/sdk-trace-base';
import { SpanKind } from '@opentelemetry/api';
import { Logger } from 'winston';

interface WinstonSpanExporterOptions {
  logger?: Logger;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  includeSpanDetails?: boolean;
  includeResourceAttributes?: boolean;
}

export class WinstonExporter implements SpanExporter {
  private readonly logger: Logger;
  private readonly logLevel: string;
  private readonly includeSpanDetails: boolean;
  private readonly includeResourceAttributes: boolean;

  constructor(options: WinstonSpanExporterOptions = {}) {
    this.logger = options.logger || console;
    this.logLevel = options.logLevel || 'info';
    this.includeSpanDetails = options.includeSpanDetails !== false;
    this.includeResourceAttributes = options.includeResourceAttributes !== false;
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    try {
      for (const span of spans) {
        this.logSpan(span);
      }

      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (error) {
      this.logger.error('Failed to export spans to Winston', error);
      resultCallback({ code: ExportResultCode.FAILED, error: error as Error });
    }
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  private logSpan(span: ReadableSpan): void {
    const spanData = this.formatSpan(span);
    const logMessage = `Trace: ${span.name} (${span.spanContext.traceId})`;

    switch (this.logLevel) {
      case 'debug':
        this.logger.debug(logMessage, spanData);
        break;
      case 'info':
        this.logger.info(logMessage, spanData);
        break;
      case 'warn':
        this.logger.warn(logMessage, spanData);
        break;
      case 'error':
        this.logger.error(logMessage, spanData);
        break;
      default:
        this.logger.info(logMessage, spanData);
    }
  }

  private formatSpan(span: ReadableSpan): any {
    const baseData: any = {
      traceId: span.spanContext.traceId,
      spanId: span.spanContext.spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      kind: this.getSpanKindName(span.kind),
      status: span.status?.code,
      statusMessage: span.status?.message,
      startTime: new Date(span.startTime).toISOString(),
      endTime: span.endTime ? new Date(span.endTime).toISOString() : undefined,
      duration: span.endTime ? span.endTime - span.startTime : undefined,
    };

    // Add resource attributes
    if (this.includeResourceAttributes && span.resource) {
      baseData.resource = span.resource.attributes;
    }

    // Add span attributes
    if (this.includeSpanDetails && span.attributes) {
      baseData.attributes = this.formatAttributes(span.attributes);
    }

    // Add events
    if (this.includeSpanDetails && span.events && span.events.length > 0) {
      baseData.events = span.events.map(event => ({
        name: event.name,
        timestamp: new Date(event.time).toISOString(),
        attributes: this.formatAttributes(event.attributes || {})
      }));
    }

    // Add links
    if (this.includeSpanDetails && span.links && span.links.length > 0) {
      baseData.links = span.links.map(link => ({
        traceId: link.context.traceId,
        spanId: link.context.spanId,
        attributes: this.formatAttributes(link.attributes || {})
      }));
    }

    // Add status details
    if (span.status) {
      baseData.statusCode = this.getStatusCodeName(span.status.code);
      if (span.status.message) {
        baseData.statusMessage = span.status.message;
      }
    }

    // Add service information from resource attributes
    const serviceAttributes = span.resource?.attributes;
    if (serviceAttributes) {
      baseData.serviceName = serviceAttributes['service.name'];
      baseData.serviceVersion = serviceAttributes['service.version'];
      baseData.environment = serviceAttributes['deployment.environment'];
    }

    // Add HTTP information if available
    const httpAttributes = span.attributes;
    if (httpAttributes) {
      if (httpAttributes['http.method']) {
        baseData.httpMethod = httpAttributes['http.method'];
      }
      if (httpAttributes['http.url']) {
        baseData.httpUrl = httpAttributes['http.url'];
      }
      if (httpAttributes['http.status_code']) {
        baseData.httpStatusCode = httpAttributes['http.status_code'];
      }
      if (httpAttributes['http.user_agent']) {
        baseData.httpUserAgent = httpAttributes['http.user_agent'];
      }
    }

    // Add database information if available
    if (httpAttributes['db.system']) {
      baseData.dbSystem = httpAttributes['db.system'];
    }
    if (httpAttributes['db.name']) {
      baseData.dbName = httpAttributes['db.name'];
    }
    if (httpAttributes['db.operation']) {
      baseData.dbOperation = httpAttributes['db.operation'];
    }
    if (httpAttributes['db.statement']) {
      baseData.dbStatement = httpAttributes['db.statement'];
    }

    // Add messaging information if available
    if (httpAttributes['messaging.operation']) {
      baseData.messagingOperation = httpAttributes['messaging.operation'];
    }
    if (httpAttributes['messaging.destination.name']) {
      baseData.messagingDestination = httpAttributes['messaging.destination.name'];
    }
    if (httpAttributes['messaging.message_payload_size_bytes']) {
      baseData.messagingMessageSize = httpAttributes['messaging.message_payload_size_bytes'];
    }

    // Add error information
    if (span.status?.code === 2 && span.events) { // ERROR status code
      const errorEvents = span.events.filter(event =>
        event.name === 'exception' || event.attributes?.['exception.type']
      );

      if (errorEvents.length > 0) {
        const errorEvent = errorEvents[errorEvents.length - 1]; // Get the last error
        baseData.error = {
          type: errorEvent.attributes?.['exception.type'],
          message: errorEvent.attributes?.['exception.message'],
          stack: errorEvent.attributes?.['exception.stacktrace']
        };
      }
    }

    return baseData;
  }

  private formatAttributes(attributes: Record<string, any>): Record<string, any> {
    const formatted: Record<string, any> = {};

    for (const [key, value] of Object.entries(attributes)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        formatted[key] = value;
      } else if (Array.isArray(value)) {
        formatted[key] = value;
      } else if (value && typeof value === 'object') {
        formatted[key] = JSON.stringify(value);
      } else {
        formatted[key] = String(value);
      }
    }

    return formatted;
  }

  private getSpanKindName(kind: SpanKind): string {
    switch (kind) {
      case SpanKind.SERVER:
        return 'SERVER';
      case SpanKind.CLIENT:
        return 'CLIENT';
      case SpanKind.PRODUCER:
        return 'PRODUCER';
      case SpanKind.CONSUMER:
        return 'CONSUMER';
      case SpanKind.INTERNAL:
        return 'INTERNAL';
      default:
        return 'UNKNOWN';
    }
  }

  private getStatusCodeName(code: number): string {
    switch (code) {
      case 0:
        return 'UNSET';
      case 1:
        return 'OK';
      case 2:
        return 'ERROR';
      default:
        return 'UNKNOWN';
    }
  }
}