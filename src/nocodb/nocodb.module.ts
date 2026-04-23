import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NocoDBService } from './nocodb.service';
import { DatabaseInitializationService } from './database-initialization.service';
import nocodbConfig from '../config/nocodb.config';
import { NocoDbContextMiddleware } from './middleware/nocodb-context.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { LoggingMiddleware } from './middleware/logging.middleware';

import { ExampleRepository } from './repositories/example.repository';
import { CacheModule } from '@nestjs/cache-manager';
import { NocoDBCacheService } from './cache/nocodb-cache.service';
import { TableCatalogService } from './table-catalog.service';
import { TableCatalogController } from './table-catalog.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Global()
@Module({
  imports: [ConfigModule.forFeature(nocodbConfig), CacheModule.register()],
  providers: [
    NocoDBService,
    DatabaseInitializationService,
    ExampleRepository,
    NocoDBCacheService,
    TableCatalogService,
    JwtAuthGuard,
    RolesGuard,
  ],
  controllers: [TableCatalogController],
  exports: [
    NocoDBService,
    ExampleRepository,
    NocoDBCacheService,
    TableCatalogService,
  ],
})
export class NocoDBModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
    consumer.apply(RateLimitMiddleware).forRoutes('*');
    consumer.apply(NocoDbContextMiddleware).forRoutes('*');
  }
}
