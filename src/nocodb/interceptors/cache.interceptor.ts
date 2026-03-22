import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { NocoDBCacheService } from '../cache/nocodb-cache.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(private readonly cacheService: NocoDBCacheService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const key = `route:${request.url}`;
    const cachedResponse = await this.cacheService.get(key);

    if (cachedResponse) {
      this.logger.log(`Cache hit for ${key}`);
      return of(cachedResponse);
    }

    return next.handle().pipe(
      mergeMap(async (response) => {
        this.logger.log(`Cache miss for ${key}, caching response`);
        await this.cacheService.set(key, response, 60 * 1000); // Default TTL 60s
        return response;
      }),
    );
  }
}
