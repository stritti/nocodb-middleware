/**
 * OpenTelemetry SDK bootstrap.
 *
 * This module MUST be imported as the very first import in main.ts so that
 * the SDK is registered before any other module is loaded.  The instrumented
 * patches applied by auto-instrumentations (HTTP, Express, Axios …) need to
 * wrap the original modules at require-time; if they are loaded too late the
 * patches miss previously-cached module instances.
 *
 * Enable tracing by setting OTEL_ENABLED=true.  When an OTLP collector
 * endpoint is provided via OTEL_EXPORTER_OTLP_ENDPOINT the SDK forwards spans
 * to that collector; otherwise it falls back to the ConsoleSpanExporter which
 * is useful during local development.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

const isEnabled = process.env.OTEL_ENABLED === 'true';

let sdk: NodeSDK | undefined;

if (isEnabled) {
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const traceExporter = otlpEndpoint
    ? new OTLPTraceExporter({ url: otlpEndpoint })
    : new ConsoleSpanExporter();

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'nocodb-middleware',
      // npm_package_version is set automatically when the process is started
      // via an npm script.  The hard-coded fallback covers bare `node dist/main`
      // invocations where the env var is absent.
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '0.0.1',
    }),
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable fs instrumentation – it generates excessive noise for
        // file-system operations that are not relevant for this service.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  // Ensure spans are flushed on graceful shutdown.
  process.on('SIGTERM', () => {
    sdk
      ?.shutdown()
      .catch((err) => console.error('OTel SDK shutdown error', err));
  });
}

export { sdk };
