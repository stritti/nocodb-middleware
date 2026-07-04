import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NocoDBService } from './nocodb.service';
import { DatabaseInitializationService } from './database-initialization.service';
import nocodbConfig from '../config/nocodb.config';
import { NocoDbContextMiddleware } from './middleware/nocodb-context.middleware';
import { LoggingMiddleware } from './middleware/logging.middleware';

import { ExampleRepository } from './repositories/example.repository';
import { CacheModule } from '@nestjs/cache-manager';
import { NocoDBCacheService } from './cache/nocodb-cache.service';
import { TableCatalogService } from './table-catalog.service';
import { TableCatalogController } from './table-catalog.controller';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(nocodbConfig),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get<number>('CACHE_TTL', 300),
        max: configService.get<number>('CACHE_MAX_ITEMS', 1000),
        isGlobal: true,
        // For Redis in production:
        // store: redisStore,
        // url: configService.get<string>('REDIS_URL'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    NocoDBService,
    DatabaseInitializationService,
    ExampleRepository,
    NocoDBCacheService,
    TableCatalogService,
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
    consumer.apply(NocoDbContextMiddleware).forRoutes('*');
  }
}
