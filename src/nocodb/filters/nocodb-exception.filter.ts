import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { NocoDBException } from '../exceptions/nocodb.exception';

@Catch(HttpException)
export class NocoDBExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(NocoDBExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: (exceptionResponse as any).message || exception.message,
      error: (exceptionResponse as any).error || 'Internal Server Error',
    };

    // Skip logging for 404 errors on static assets
    const isStaticAsset404 =
      status === 404 &&
      (request.url.includes('/favicon.ico') ||
        request.url.includes('.ico') ||
        request.url.includes('.png') ||
        request.url.includes('.jpg') ||
        request.url.includes('.svg'));

    if (!isStaticAsset404) {
      if (exception instanceof NocoDBException) {
        this.logger.warn(`NocoDB Exception: ${JSON.stringify(errorResponse)}`);
      } else {
        this.logger.error(
          `Http Exception: ${JSON.stringify(errorResponse)}`,
          exception.stack,
        );
      }
    }

    response.status(status).json(errorResponse);
  }
}
