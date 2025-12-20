import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, Span, SpanKind, SpanStatusCode, propagation, Context } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { WinstonExporter } from './WinstonExporter';
import { createLogger } from '../config/logger';

const logger = createLogger();

export interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  jaegerEndpoint?: string;
  zipkinEndpoint?: string;
  otlpEndpoint?: string;
  headers?: Record<string, string>;
  samplingProbability?: number;
  enableConsoleExporter?: boolean;
  enableWinstonExporter?: boolean;
}

export interface SpanOptions {
  name: string;
  kind?: SpanKind;
  attributes?: Record<string, string | number | boolean>;
  parentSpan?: Span;
  startTime?: number;
}

export interface TracingContext {
  traceId: string;
  spanId: string;
  baggage?: Record<string, string>;
}

class TracingService {
  private sdk: NodeSDK | null = null;
  private tracer: any;
  private config: TracingConfig;
  private isInitialized = false;

  constructor(config: TracingConfig) {
    this.config = {
      samplingProbability: 1.0,
      enableConsoleExporter: false,
      enableWinstonExporter: true,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Tracing service already initialized');
      return;
    }

    try {
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
      });

      const exporters = [];

      // Add console exporter for development
      if (this.config.enableConsoleExporter) {
        const { ConsoleSpanExporter } = await import('@opentelemetry/sdk-trace-node');
        exporters.push(new ConsoleSpanExporter());
      }

      // Add Winston exporter for structured logging
      if (this.config.enableWinstonExporter) {
        exporters.push(new WinstonExporter(logger));
      }

      // Add Jaeger exporter if configured
      if (this.config.jaegerEndpoint) {
        const { JaegerExporter } = await import('@opentelemetry/exporter-jaeger');
        exporters.push(new JaegerExporter({
          endpoint: this.config.jaegerEndpoint,
          headers: this.config.headers,
        }));
      }

      // Add Zipkin exporter if configured
      if (this.config.zipkinEndpoint) {
        const { ZipkinExporter } = await import('@opentelemetry/exporter-zipkin');
        exporters.push(new ZipkinExporter({
          url: this.config.zipkinEndpoint,
          headers: this.config.headers,
        }));
      }

      // Add OTLP exporter if configured
      if (this.config.otlpEndpoint) {
        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-otlp-http');
        exporters.push(new OTLPTraceExporter({
          url: this.config.otlpEndpoint,
          headers: this.config.headers,
        }));
      }

      // Add batch span processor
      const { BatchSpanProcessor } = await import('@opentelemetry/sdk-trace-node');
      const spanProcessors = exporters.map(exporter =>
        new BatchSpanProcessor(exporter, {
          maxQueueSize: 2048,
          maxExportBatchSize: 512,
          scheduledDelayMillis: 5000,
        })
      );

      this.sdk = new NodeSDK({
        resource,
        traceExporter: exporters.length === 1 ? exporters[0] : undefined,
        spanProcessors: spanProcessors.length > 0 ? spanProcessors : undefined,
        instrumentations: [getNodeAutoInstrumentations()],
        sampler: {
          type: 'traceidratio',
          arg: this.config.samplingProbability,
        },
      });

      this.sdk.start();

      this.tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);
      this.isInitialized = true;

      logger.info('Tracing service initialized', {
        serviceName: this.config.serviceName,
        exporters: exporters.length,
        samplingProbability: this.config.samplingProbability
      });

    } catch (error) {
      logger.error('Failed to initialize tracing service', error as Error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      this.isInitialized = false;
      logger.info('Tracing service shut down');
    }
  }

  // Span management
  startSpan(options: SpanOptions): Span {
    if (!this.isInitialized) {
      logger.warn('Tracing not initialized, returning no-op span');
      return trace.wrapSpanContext(trace.INVALID_SPAN_CONTEXT) as Span;
    }

    const spanOptions: any = {
      kind: options.kind || SpanKind.INTERNAL,
      attributes: options.attributes,
      startTime: options.startTime ? Date.now() : undefined,
    };

    if (options.parentSpan) {
      spanOptions.parent = options.parentSpan.spanContext();
    }

    return this.tracer.startSpan(options.name, spanOptions);
  }

  startActiveSpan<F extends (span: Span) => ReturnType<F>>(
    name: string,
    fn: F,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
      parentSpan?: Span;
    }
  ): ReturnType<F> {
    if (!this.isInitialized) {
      logger.warn('Tracing not initialized, executing function without span');
      return fn(null as any);
    }

    return this.tracer.startActiveSpan(name, options || {}, fn);
  }

  // Convenience methods for common operations
  traceAsyncOperation<T>(
    name: string,
    operation: () => Promise<T>,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
      parentSpan?: Span;
    }
  ): Promise<T> {
    return this.startActiveSpan(name, async (span) => {
      try {
        const result = await operation();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message
        });
        throw error;
      }
    }, options);
  }

  traceHttpRequest(
    method: string,
    url: string,
    operation: () => Promise<any>,
    options?: {
      headers?: Record<string, string>;
      parentSpan?: Span;
    }
  ): Promise<any> {
    const attributes = {
      'http.method': method,
      'http.url': url,
      'http.scheme': new URL(url).protocol.slice(0, -1),
      'net.peer.name': new URL(url).hostname,
      'net.peer.port': new URL(url).port || (new URL(url).protocol === 'https:' ? 443 : 80),
      ...options?.headers
    };

    return this.traceAsyncOperation(
      `${method} ${new URL(url).pathname}`,
      operation,
      {
        kind: SpanKind.CLIENT,
        attributes,
        parentSpan: options?.parentSpan
      }
    );
  }

  traceDatabaseOperation<T>(
    operation: string,
    query?: string,
    fn: () => Promise<T>,
    options?: {
      database?: string;
      collection?: string;
      parentSpan?: Span;
    }
  ): Promise<T> {
    const attributes: Record<string, string | number | boolean> = {
      'db.operation': operation,
      'db.system': 'postgresql'
    };

    if (query) {
      attributes['db.statement'] = query;
    }

    if (options?.database) {
      attributes['db.name'] = options.database;
    }

    if (options?.collection) {
      attributes['db.sql.table'] = options.collection;
    }

    return this.traceAsyncOperation(
      `db.${operation}`,
      fn,
      {
        kind: SpanKind.CLIENT,
        attributes,
        parentSpan: options?.parentSpan
      }
    );
  }

  traceMessageOperation(
    operation: 'publish' | 'consume',
    queue: string,
    message: any,
    fn: () => Promise<void>,
    options?: {
      parentSpan?: Span;
    }
  ): Promise<void> {
    const attributes = {
      'messaging.operation': operation,
      'messaging.destination.name': queue,
      'messaging.message_payload_size_bytes': JSON.stringify(message).length
    };

    return this.traceAsyncOperation(
      `messaging.${operation}`,
      fn,
      {
        kind: operation === 'publish' ? SpanKind.PRODUCER : SpanKind.CONSUMER,
        attributes,
        parentSpan: options?.parentSpan
      }
    );
  }

  // Context management
  injectContext(context: TracingContext, headers: Record<string, string>): void {
    if (!this.isInitialized) {
      return;
    }

    const carrier: any = {};
    propagation.inject(carrier);

    // Extract relevant headers
    if (carrier.traceparent) {
      headers['traceparent'] = carrier.traceparent;
    }
    if (carrier.tracestate) {
      headers['tracestate'] = carrier.tracestate;
    }
    if (context.baggage) {
      headers['baggage'] = Object.entries(context.baggage)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
    }
  }

  extractContext(headers: Record<string, string>): TracingContext | null {
    if (!this.isInitialized) {
      return null;
    }

    const carrier: any = {};
    if (headers.traceparent) carrier.traceparent = headers.traceparent;
    if (headers.tracestate) carrier.tracestate = headers.tracestate;
    if (headers.baggage) carrier.baggage = headers.baggage;

    const context = propagation.extract(carrier);
    const spanContext = trace.getSpanContext(context);

    if (!spanContext || !trace.isValidSpanContext(spanContext)) {
      return null;
    }

    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      baggage: this.extractBaggage(headers.baggage)
    };
  }

  private extractBaggage(baggageHeader?: string): Record<string, string> {
    if (!baggageHeader) {
      return {};
    }

    const baggage: Record<string, string> = {};
    baggageHeader.split(',').forEach(item => {
      const [key, value] = item.split('=');
      if (key && value) {
        baggage[key.trim()] = decodeURIComponent(value.trim());
      }
    });

    return baggage;
  }

  getCurrentContext(): TracingContext | null {
    if (!this.isInitialized) {
      return null;
    }

    const currentSpan = trace.getActiveSpan();
    if (!currentSpan) {
      return null;
    }

    const spanContext = currentSpan.spanContext();
    if (!trace.isValidSpanContext(spanContext)) {
      return null;
    }

    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId
    };
  }

  // Span enrichment
  addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setAttributes(attributes);
    }
  }

  addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.addEvent(name, attributes);
    }
  }

  setSpanStatus(status: {
    code: SpanStatusCode;
    message?: string;
  }): void {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setStatus(status);
    }
  }

  // Error handling
  recordError(error: Error, attributes?: Record<string, string | number | boolean>): void {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.recordException(error);
      if (attributes) {
        currentSpan.setAttributes(attributes);
      }
    }
  }

  // Metrics and analysis
  getSpanStatistics(): {
    totalSpans: number;
    activeSpans: number;
    samplingRate: number;
  } {
    if (!this.isInitialized) {
      return {
        totalSpans: 0,
        activeSpans: 0,
        samplingRate: 0
      };
    }

    // This would typically interface with the tracing backend
    // For now, return basic information
    return {
      totalSpans: 0, // Would be tracked by the backend
      activeSpans: 1, // Rough estimate
      samplingRate: this.config.samplingProbability || 1.0
    };
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    initialized: boolean;
    exporters?: number;
    error?: string;
  }> {
    try {
      if (!this.isInitialized) {
        return {
          status: 'unhealthy',
          initialized: false,
          error: 'Tracing service not initialized'
        };
      }

      // Check if SDK is still running
      if (!this.sdk) {
        return {
          status: 'unhealthy',
          initialized: false,
          error: 'SDK not available'
        };
      }

      return {
        status: 'healthy',
        initialized: true,
        exporters: this.getExporterCount()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        initialized: this.isInitialized,
        error: (error as Error).message
      };
    }
  }

  private getExporterCount(): number {
    let count = 0;
    if (this.config.enableConsoleExporter) count++;
    if (this.config.enableWinstonExporter) count++;
    if (this.config.jaegerEndpoint) count++;
    if (this.config.zipkinEndpoint) count++;
    if (this.config.otlpEndpoint) count++;
    return count;
  }
}

// Factory function for creating tracing instances
export function createTracingService(config: TracingConfig): TracingService {
  return new TracingService(config);
}

// Default tracing instance
export let tracingService: TracingService;

export function initializeTracing(config: TracingConfig): Promise<void> {
  tracingService = new TracingService(config);
  return tracingService.initialize();
}

export default tracingService;