import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { NocoDBException } from '../exceptions/nocodb.exception';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
  error: string;
}

@Catch(HttpException)
export class NocoDBExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(NocoDBExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const responsePayload = this.normalizeExceptionResponse(
      exceptionResponse,
      exception.message,
    );

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
        this.logger.warn(
          `NocoDB Exception: ${JSON.stringify(responsePayload)}`,
        );
      } else {
        this.logger.error(
          `Http Exception: ${JSON.stringify(responsePayload)}`,
          exception.stack,
        );
      }
    }

    response.status(status).json(responsePayload);
  }

  private normalizeExceptionResponse(
    exceptionResponse: unknown,
    fallbackMessage: string,
  ): ErrorResponse {
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const typedResponse = exceptionResponse as {
        message?: unknown;
        error?: unknown;
      };

      return {
        statusCode:
          Number(
            'statusCode' in typedResponse
              ? typedResponse.statusCode
              : undefined,
          ) || 500,
        timestamp: new Date().toISOString(),
        path:
          'path' in typedResponse && typeof typedResponse.path === 'string'
            ? typedResponse.path
            : '',
        message:
          typeof typedResponse.message === 'string'
            ? typedResponse.message
            : fallbackMessage,
        error:
          typeof typedResponse.error === 'string'
            ? typedResponse.error
            : 'Internal Server Error',
      };
    }

    return {
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path: '',
      message: fallbackMessage,
      error: 'Internal Server Error',
    };
  }
}
