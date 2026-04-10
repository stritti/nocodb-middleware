import './tracing/tracing';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NocoDBExceptionFilter } from './nocodb/filters/nocodb-exception.filter';
import { ValidationPipe, Logger as NestLogger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino as the application-wide logger
  try {
    app.useLogger(app.get(Logger));
  } catch (e) {
    // Fallback if Logger is not available
    NestLogger.warn('Pino Logger not found in context, falling back to default logger');
  }

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS Configuration
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id'],
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

  // Swagger setup
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

  // Enable graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  const logger = new NestLogger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}/api`);
  logger.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}
void bootstrap();
