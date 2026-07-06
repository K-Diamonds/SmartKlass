import { Injectable } from '@nestjs/common';

export type SpanStatus = 'ok' | 'error';

export type Span = {
  name: string;
  traceId: string;
  spanId: string;
  end: (status?: SpanStatus, attributes?: Record<string, string | number>) => void;
};

@Injectable()
export class TracingService {
  startSpan(
    name: string,
    attributes?: Record<string, string | number>,
  ): Span {
    const traceId = this.randomId();
    const spanId = this.randomId();
    const startedAt = Date.now();

    return {
      name,
      traceId,
      spanId,
      end: (status = 'ok', endAttributes) => {
        const durationMs = Date.now() - startedAt;
        // OpenTelemetry exporter hook — wire @opentelemetry/sdk-node here in production.
        if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
          void durationMs;
          void status;
          void attributes;
          void endAttributes;
        }
      },
    };
  }

  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Record<string, string | number>,
  ): Promise<T> {
    const span = this.startSpan(name, attributes);
    try {
      const result = await fn(span);
      span.end('ok');
      return result;
    } catch (error) {
      span.end('error', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      throw error;
    }
  }

  private randomId(): string {
    return Math.random().toString(16).slice(2, 18);
  }
}
