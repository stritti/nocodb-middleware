import './tracing/tracing';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NocoDBExceptionFilter } from './nocodb/filters/nocodb-exception.filter';
import { ValidationPipe, Logger as NestLogger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import {
  parseAndValidateCorsOrigins,
  logCorsWarnings,
} from './config/cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino as the application-wide logger
  try {
    app.useLogger(app.get(Logger));
  } catch {
    // Fallback if Logger is not available
    NestLogger.warn(
      'Pino Logger not found in context, falling back to default logger',
    );
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
      permissionsPolicy: {
        directives: {
          camera: [],
          geolocation: [],
          microphone: [],
          payment: [],
          usb: [],
        },
      },
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

  // Global filters
  app.useGlobalFilters(new NocoDBExceptionFilter());

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

  const swaggerEnabled = process.env.NODE_ENV !== 'production';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('NocoDB Middleware API')
      .setDescription(
        'REST API for the NocoDB Middleware – provides JWT-secured access to NocoDB ' +
          'with role-based permissions, caching, rate limiting, and distributed tracing.',
      )
      .setVersion(process.env.npm_package_version ?? '1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .addTag('Authentication')
      .addTag('Permissions')
      .addTag('Roles')
      .addTag('Users')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Enable graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const logger = new NestLogger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}/api`);
  if (swaggerEnabled) {
    logger.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
  }
}
void bootstrap();
