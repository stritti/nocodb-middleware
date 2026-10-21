import './tracing/tracing';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { Logger as NestLogger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino as the application-wide logger
  try {
    app.useLogger(app.get(Logger));
  } catch (error: unknown) {
    // Fallback if Logger is not available (e.g. during testing)
    NestLogger.warn(
      `Pino Logger not found in context, falling back to default logger: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }

  configureApp(app);

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
