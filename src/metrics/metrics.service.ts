import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as client from 'prom-client';

/**
 * Service for collecting and exposing Prometheus metrics.
 * Provides default HTTP metrics and allows custom metric registration.
 */
@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);

  // Default HTTP metrics
  private httpRequestCounter: client.Counter<string>;
  private httpRequestDuration: client.Histogram<string>;
  private httpRequestSize: client.Histogram<string>;
  private httpResponseSize: client.Histogram<string>;
  private activeConnections: client.Gauge<string>;

  // NocoDB API metrics
  private nocodbRequestCounter: client.Counter<string>;
  private nocodbRequestDuration: client.Histogram<string>;
  private nocodbErrors: client.Counter<string>;

  // Cache metrics
  private cacheHits: client.Counter<string>;
  private cacheMisses: client.Counter<string>;
  private cacheDuration: client.Histogram<string>;

  constructor() {
    this.initializeMetrics();
  }

  async onModuleInit() {
    this.logger.log('Prometheus metrics initialized');
  }

  async onModuleDestroy() {
    // Clean up metrics on shutdown
    this.logger.log('Cleaning up Prometheus metrics');
  }

  private initializeMetrics(): void {
    // HTTP Request Counter
    this.httpRequestCounter = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'service'],
      registers: [client.register],
    });

    // HTTP Request Duration
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'service'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 10],
      registers: [client.register],
    });

    // HTTP Request Size
    this.httpRequestSize = new client.Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [client.register],
    });

    // HTTP Response Size
    this.httpResponseSize = new client.Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [client.register],
    });

    // Active Connections
    this.activeConnections = new client.Gauge({
      name: 'http_active_connections',
      help: 'Number of active HTTP connections',
      labelNames: ['service'],
      registers: [client.register],
    });

    // NocoDB API metrics
    this.nocodbRequestCounter = new client.Counter({
      name: 'nocodb_api_requests_total',
      help: 'Total number of NocoDB API requests',
      labelNames: ['method', 'endpoint', 'status_code'],
      registers: [client.register],
    });

    this.nocodbRequestDuration = new client.Histogram({
      name: 'nocodb_api_request_duration_seconds',
      help: 'Duration of NocoDB API requests in seconds',
      labelNames: ['method', 'endpoint'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [client.register],
    });

    this.nocodbErrors = new client.Counter({
      name: 'nocodb_api_errors_total',
      help: 'Total number of NocoDB API errors',
      labelNames: ['method', 'endpoint', 'error_type'],
      registers: [client.register],
    });

    // Cache metrics
    this.cacheHits = new client.Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_key'],
      registers: [client.register],
    });

    this.cacheMisses = new client.Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_key'],
      registers: [client.register],
    });

    this.cacheDuration = new client.Histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Duration of cache operations in seconds',
      labelNames: ['operation', 'cache_key'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
      registers: [client.register],
    });
  }

  /**
   * Increment HTTP request counter
   */
  incrementHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    service: string = 'nocodb-middleware',
  ): void {
    this.httpRequestCounter.labels(method, route, statusCode.toString(), service).inc();
  }

  /**
   * Record HTTP request duration
   */
  observeHttpRequestDuration(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    service: string = 'nocodb-middleware',
  ): void {
    this.httpRequestDuration
      .labels(method, route, statusCode.toString(), service)
      .observe(duration);
  }

  /**
   * Record HTTP request size
   */
  observeHttpRequestSize(method: string, route: string, size: number): void {
    this.httpRequestSize.labels(method, route).observe(size);
  }

  /**
   * Record HTTP response size
   */
  observeHttpResponseSize(
    method: string,
    route: string,
    statusCode: number,
    size: number,
  ): void {
    this.httpResponseSize.labels(method, route, statusCode.toString()).observe(size);
  }

  /**
   * Set active connections gauge
   */
  setActiveConnections(count: number, service: string = 'nocodb-middleware'): void {
    this.activeConnections.labels(service).set(count);
  }

  /**
   * Increment NocoDB API request counter
   */
  incrementNocodbRequest(
    method: string,
    endpoint: string,
    statusCode: number,
  ): void {
    this.nocodbRequestCounter.labels(method, endpoint, statusCode.toString()).inc();
  }

  /**
   * Record NocoDB API request duration
   */
  observeNocodbRequestDuration(
    method: string,
    endpoint: string,
    duration: number,
  ): void {
    this.nocodbRequestDuration.labels(method, endpoint).observe(duration);
  }

  /**
   * Increment NocoDB API error counter
   */
  incrementNocodbError(
    method: string,
    endpoint: string,
    errorType: string,
  ): void {
    this.nocodbErrors.labels(method, endpoint, errorType).inc();
  }

  /**
   * Increment cache hit counter
   */
  incrementCacheHit(cacheKey: string): void {
    this.cacheHits.labels(cacheKey).inc();
  }

  /**
   * Increment cache miss counter
   */
  incrementCacheMiss(cacheKey: string): void {
    this.cacheMisses.labels(cacheKey).inc();
  }

  /**
   * Record cache operation duration
   */
  observeCacheDuration(
    operation: 'get' | 'set' | 'del' | 'clear',
    cacheKey: string,
    duration: number,
  ): void {
    this.cacheDuration.labels(operation, cacheKey).observe(duration);
  }

  /**
   * Get all metrics as string for the /metrics endpoint
   */
  async getMetrics(): Promise<string> {
    return client.register.metrics();
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    client.register.clear();
    this.logger.log('All Prometheus metrics have been reset');
  }
}
