import { INestApplication, Logger as NestLogger } from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './nocodb/filters/nocodb-exception.filter';
import { RateLimitMiddleware } from './nocodb/middleware/rate-limit.middleware';
import { SanitizeMiddleware } from './common/middleware/sanitize.middleware';
import { createGlobalValidationPipe } from './common/validation/global-validation-pipe.factory';
import {
  parseAndValidateCorsOrigins,
  logCorsWarnings,
} from './config/cors.config';

/**
 * Applies the HTTP pipeline shared by the server and the e2e tests:
 * security headers, CORS, sanitization, rate limiting, error filter,
 * validation and the global `/api` prefix.
 */
export function configureApp(app: INestApplication): void {
  // Reverse proxy support: without this, req.ip is the proxy address and all
  // clients share one rate-limit bucket.
  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  if (trustProxy !== undefined) {
    const instance: unknown = app.getHttpAdapter().getInstance();
    if (instance && typeof (instance as { set?: unknown }).set === 'function') {
      (instance as { set(key: string, value: unknown): void }).set(
        'trust proxy',
        trustProxy,
      );
    }
  }

  // Security headers with strict CSP
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // CORS Configuration with validation
  const isProduction = process.env.NODE_ENV === 'production';
  const corsValidation = parseAndValidateCorsOrigins(
    process.env.CORS_ORIGINS,
    isProduction,
  );
  logCorsWarnings(corsValidation, new NestLogger('Bootstrap'));

  app.enableCors({
    origin: corsValidation.origins.length > 0 ? corsValidation.origins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-request-id',
    ],
  });

  // Global input sanitization middleware (after CORS, before rate limiting)
  // Sanitizes all request data (body, query, params) to prevent XSS
  const sanitizeMiddleware = new SanitizeMiddleware();
  app.use(sanitizeMiddleware.use.bind(sanitizeMiddleware));

  // Pre-auth rate limiting per client network (counts failed requests only).
  // Per-user limits are enforced after authentication by UserRateLimitGuard.
  const rateLimitMiddleware = new RateLimitMiddleware();
  app.use(rateLimitMiddleware.use.bind(rateLimitMiddleware));

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(createGlobalValidationPipe());

  // Global Prefix
  app.setGlobalPrefix('api');
}

/**
 * Parses `TRUST_PROXY` into a value for Express' `trust proxy` setting:
 * `true`/`false`, a number of proxy hops (e.g. `1`), or a comma-separated
 * list of addresses/subnets (e.g. `loopback, 10.0.0.0/8`). Unset or empty
 * leaves the Express default (no proxy trusted).
 */
export function parseTrustProxy(
  value: string | undefined,
): boolean | number | string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed === 'true') {
    return true;
  }
  if (trimmed === 'false') {
    return false;
  }
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}
