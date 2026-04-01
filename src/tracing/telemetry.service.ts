import { Injectable } from '@nestjs/common';
import {
  trace,
  context,
  SpanStatusCode,
  SpanKind,
  Tracer,
  Attributes,
} from '@opentelemetry/api';

/**
 * Injectable helper that provides a thin, NestJS-friendly wrapper around the
 * OpenTelemetry tracing API.
 *
 * Inject this service wherever you want to create custom spans.  If OTel is
 * not initialised (OTEL_ENABLED != 'true'), the underlying API falls back to
 * the no-op tracer so the wrapper is always safe to call without side-effects.
 *
 * @example
 * ```ts
 * constructor(private readonly telemetry: TelemetryService) {}
 *
 * async getUser(id: string) {
 *   return this.telemetry.withSpan('user.get', () => this.repo.findById(id), {
 *     'user.id': id,
 *   });
 * }
 * ```
 */
@Injectable()
export class TelemetryService {
  private readonly tracer: Tracer;

  constructor() {
    this.tracer = trace.getTracer('nocodb-middleware');
  }

  /**
   * Execute `fn` inside a new child span named `name`.
   *
   * The span is automatically ended when `fn` resolves or rejects.  On
   * rejection the span status is set to ERROR and the exception is recorded
   * before the error is re-thrown.
   */
  async withSpan<T>(
    name: string,
    fn: () => Promise<T>,
    attributes?: Attributes,
  ): Promise<T> {
    const span = this.tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      attributes,
    });

    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        span.recordException(error);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /** Returns the underlying OTel {@link Tracer} for advanced use-cases. */
  getTracer(): Tracer {
    return this.tracer;
  }
}
