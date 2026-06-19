import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as promClient from 'prom-client';

/**
 * Service for collecting and exposing Prometheus metrics.
 * Provides default HTTP metrics and allows custom metric registration.
 */
@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);

  // Default HTTP metrics
  private httpRequestCounter: promClient.Counter;
  private httpRequestDuration: promClient.Histogram;
  private httpRequestSize: promClient.Histogram;
  private httpResponseSize: promClient.Histogram;
  private activeConnections: promClient.Gauge;

  // NocoDB API metrics
  private nocodbRequestCounter: promClient.Counter;
  private nocodbRequestDuration: promClient.Histogram;
  private nocodbErrors: promClient.Counter;

  // Cache metrics
  private cacheHits: promClient.Counter;
  private cacheMisses: promClient.Counter;
  private cacheDuration: promClient.Histogram;

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
    this.httpRequestCounter = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'service'],
    });

    // HTTP Request Duration
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'service'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 10],
    });

    // HTTP Request Size
    this.httpRequestSize = new promClient.Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
    });

    // HTTP Response Size
    this.httpResponseSize = new promClient.Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000],
    });

    // Active Connections
    this.activeConnections = new promClient.Gauge({
      name: 'http_active_connections',
      help: 'Number of active HTTP connections',
      labelNames: ['service'],
    });

    // NocoDB API metrics
    this.nocodbRequestCounter = new promClient.Counter({
      name: 'nocodb_api_requests_total',
      help: 'Total number of NocoDB API requests',
      labelNames: ['method', 'endpoint', 'status_code'],
    });

    this.nocodbRequestDuration = new promClient.Histogram({
      name: 'nocodb_api_request_duration_seconds',
      help: 'Duration of NocoDB API requests in seconds',
      labelNames: ['method', 'endpoint'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 1, 2.5, 5],
    });

    this.nocodbErrors = new promClient.Counter({
      name: 'nocodb_api_errors_total',
      help: 'Total number of NocoDB API errors',
      labelNames: ['method', 'endpoint', 'error_type'],
    });

    // Cache metrics
    this.cacheHits = new promClient.Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_key'],
    });

    this.cacheMisses = new promClient.Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_key'],
    });

    this.cacheDuration = new promClient.Histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Duration of cache operations in seconds',
      labelNames: ['operation', 'cache_key'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
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
    return promClient.register.metrics();
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    promClient.register.clear();
    this.logger.log('All Prometheus metrics have been reset');
  }
}
