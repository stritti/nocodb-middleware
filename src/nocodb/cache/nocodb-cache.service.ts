import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class NocoDBCacheService {
  private readonly logger = new Logger(NocoDBCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async clear(): Promise<void> {
    await this.cacheManager.clear();
  }

  generateKey(prefix: string, params: any): string {
    return `${prefix}:${JSON.stringify(params || {})}`;
  }
}
