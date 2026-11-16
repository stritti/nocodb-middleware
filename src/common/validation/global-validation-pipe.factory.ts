import { ValidationPipe } from '@nestjs/common';

/**
 * The global validation pipe used by both the application bootstrap
 * (`app.setup.ts`) and controller specs, so tests exercise the exact
 * production validation behavior.
 */
export function createGlobalValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  });
}
