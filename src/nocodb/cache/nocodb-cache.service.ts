import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

type CacheValue = unknown;

@Injectable()
export class NocoDBCacheService {
  private readonly logger = new Logger(NocoDBCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T = CacheValue>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async set<T = CacheValue>(
    key: string,
    value: T,
    ttl?: number,
  ): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  generateKey(prefix: string, params: unknown): string {
    const serialized = JSON.stringify(params ?? {});
    return `${prefix}:${serialized}`;
  }
}
