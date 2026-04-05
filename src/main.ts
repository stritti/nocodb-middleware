import './tracing/tracing';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NocoDBExceptionFilter } from './nocodb/filters/nocodb-exception.filter';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // CORS – allow only explicitly listed origins (comma-separated env var)
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: allowedOrigins, credentials: true });

  // Global filters
  app.useGlobalFilters(new NocoDBExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('NocoDB Middleware API')
    .setDescription(
      'REST API for the NocoDB Middleware – provides JWT-secured access to NocoDB ' +
        'with role-based permissions, caching, rate limiting, and distributed tracing.',
    )
    .setVersion(process.env.npm_package_version ?? '1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Enable graceful shutdown
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
