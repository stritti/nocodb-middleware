import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import * as promClient from 'prom-client';
import { MetricsService } from './metrics.service';

const register = promClient.register;

/**
 * Controller for exposing Prometheus metrics endpoint.
 * This endpoint returns metrics in Prometheus text format.
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Get all Prometheus metrics
   * 
   * @returns Plain text metrics in Prometheus format
   */
  @Get()
  async getMetrics(@Res() res: Response): Promise<void> {
    try {
      const metrics = await this.metricsService.getMetrics();
      res.set('Content-Type', register.contentType);
      res.send(metrics);
    } catch (error: any) {
      res.status(500).json({
        statusCode: 500,
        message: 'Failed to collect metrics',
        error: error.message,
      });
    }
  }
}
