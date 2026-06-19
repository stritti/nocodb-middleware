import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NocoDBService } from './nocodb.service';
import { DatabaseInitializationService } from './database-initialization.service';
import nocodbConfig from '../config/nocodb.config';
import redisConfig from '../config/redis.config';
import { NocoDbContextMiddleware } from './middleware/nocodb-context.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { LoggingMiddleware } from './middleware/logging.middleware';

import { ExampleRepository } from './repositories/example.repository';
import { CacheModule } from '@nestjs/cache-manager';
import { NocoDBCacheService } from './cache/nocodb-cache.service';
import { TableCatalogService } from './table-catalog.service';
import { TableCatalogController } from './table-catalog.controller';
import * as redisStore from 'cache-manager-redis-store';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(nocodbConfig),
    ConfigModule.forFeature(redisConfig),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisEnabled = configService.get<boolean>('redis.enabled', false);
        
        if (redisEnabled) {
          const redisUrl = configService.get<string>('redis.url', 'redis://localhost:6379');
          const redisPassword = configService.get<string>('redis.password', '');
          const redisDb = configService.get<number>('redis.db', 0);
          const cacheTtl = configService.get<number>('redis.cacheTtl', 60);
          
          return {
            store: redisStore,
            url: redisUrl,
            password: redisPassword,
            db: redisDb,
            ttl: cacheTtl,
          };
        }
        
        // Fallback to in-memory cache
        return {
          ttl: configService.get<number>('redis.cacheTtl', 60),
        };
      },
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
    consumer.apply(RateLimitMiddleware).forRoutes('*');
    consumer.apply(NocoDbContextMiddleware).forRoutes('*');
  }
}
