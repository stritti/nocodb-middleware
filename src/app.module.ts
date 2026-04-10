import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NocoDBModule } from './nocodb/nocodb.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PermissionsModule } from './permissions/permissions.module';
import { TelemetryModule } from './tracing/telemetry.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Structured JSON logging via Pino; pretty-print in dev, JSON in production
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        autoLogging: {
          ignore: (req) => req.url === '/health',
        },
      },
    }),
    TelemetryModule,
    NocoDBModule,
    AuthModule,
    HealthModule,
    PermissionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
