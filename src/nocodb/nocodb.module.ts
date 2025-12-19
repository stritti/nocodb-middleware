import { Module, Global, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NocoDBService } from './nocodb.service';
import { NocoDBV3Service } from './nocodb-v3.service';
import { DatabaseInitializationService } from './database-initialization.service';
import nocodbConfig from '../config/nocodb.config';
import { NocoDbContextMiddleware } from './middleware/nocodb-context.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { LoggingMiddleware } from './middleware/logging.middleware';

import { ExampleRepository } from './repositories/example.repository';
import { CacheModule } from '@nestjs/cache-manager';
import { NocoDBCacheService } from './cache/nocodb-cache.service';

@Global()
@Module({
    imports: [
        ConfigModule.forFeature(nocodbConfig),
        CacheModule.register(),
    ],
    providers: [
        NocoDBService,
        NocoDBV3Service,
        DatabaseInitializationService,
        ExampleRepository,
        NocoDBCacheService
    ],
    exports: [NocoDBService, NocoDBV3Service, ExampleRepository, NocoDBCacheService],
})
export class NocoDBModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(LoggingMiddleware)
            .forRoutes('*');

        consumer
            .apply(RateLimitMiddleware)
            .forRoutes('*');

        consumer
            .apply(NocoDbContextMiddleware)
            .forRoutes('*');
    }
}
