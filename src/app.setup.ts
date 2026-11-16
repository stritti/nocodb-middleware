import { INestApplication, Logger as NestLogger } from '@nestjs/common';
import helmet from 'helmet';
import { NextFunction, Request, Response } from 'express';
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

  app.use(
    '/api/public',
    (_request: Request, response: Response, next: NextFunction) => {
      response.setHeader('Cache-Control', 'no-store');
      next();
    },
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
  const publicSanitizeMiddleware = new SanitizeMiddleware({ query: false });
  app.use((request: Request, response: Response, next: NextFunction) => {
    const middleware = request.path.startsWith('/api/public/')
      ? publicSanitizeMiddleware
      : sanitizeMiddleware;
    middleware.use(request, response, next);
  });

  // Global rate limiting middleware (must be after CORS and sanitization)
  // This ensures req.user is available from JWT authentication
  const rateLimitMiddleware = new RateLimitMiddleware();
  app.use(rateLimitMiddleware.use.bind(rateLimitMiddleware));

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(createGlobalValidationPipe());

  // Global Prefix
  app.setGlobalPrefix('api');
}
