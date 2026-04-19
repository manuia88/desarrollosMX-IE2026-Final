import { randomUUID } from 'node:crypto';
import { type Span, trace } from '@opentelemetry/api';

// Upgrade #4 §5.A FASE 07. Correlation IDs propagados via:
//   1. ingest_runs.id (= correlation_id)
//   2. row.run_id en cada tabla de ingesta
//   3. header X-Correlation-Id en outbound HTTP a APIs externas
//   4. OTel span tags
//   5. Sentry context (cuando SENTRY_ENABLED=true, FASE 24+)

const tracer = trace.getTracer('dmx-ingest', '0.1.0');

export function newCorrelationId(): string {
  return randomUUID();
}

export interface SpanCtx {
  span: Span;
  end: (attrs?: Record<string, string | number | boolean>) => void;
}

export function startIngestSpan(
  name: string,
  attrs: Record<string, string | number | boolean> = {},
): SpanCtx {
  const span = tracer.startSpan(name, { attributes: attrs });
  return {
    span,
    end(extra) {
      if (extra) span.setAttributes(extra);
      span.end();
    },
  };
}

export function correlationHeaders(runId: string, extra: Record<string, string> = {}): HeadersInit {
  return {
    'X-Correlation-Id': runId,
    'X-DMX-Source': 'dmx-ingest',
    ...extra,
  };
}
