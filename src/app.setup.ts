import {
  INestApplication,
  Logger as NestLogger,
  ValidationPipe,
} from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './nocodb/filters/nocodb-exception.filter';
import { RateLimitMiddleware } from './nocodb/middleware/rate-limit.middleware';
import { SanitizeMiddleware } from './common/middleware/sanitize.middleware';
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

  // Global rate limiting middleware (must be after CORS and sanitization)
  // This ensures req.user is available from JWT authentication
  const rateLimitMiddleware = new RateLimitMiddleware();
  app.use(rateLimitMiddleware.use.bind(rateLimitMiddleware));

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Prefix
  app.setGlobalPrefix('api');
}
