import { Global, Module } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';

/**
 * Global NestJS module that wires up OpenTelemetry tracing support.
 *
 * The module is marked `@Global()` so that {@link TelemetryService} can be
 * injected anywhere in the application without needing to import this module
 * in every feature module.
 */
@Global()
@Module({
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
