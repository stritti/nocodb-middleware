import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import sanitizeHtml from 'sanitize-html';

/**
 * Default sanitize-html options that strip ALL HTML tags.
 * Only plain text is allowed to prevent XSS attacks.
 * Text content within tags is preserved.
 */
const STRIP_ALL: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  // Also strip all content from script/style tags
  nonTextTags: [
    'script',
    'style',
    'textarea',
    'iframe',
    'noembed',
    'noframes',
    'noscript',
  ],
};

/**
 * Sanitization options for different contexts.
 * - strict: Strip all HTML (default for user input)
 * - basic: Allow basic formatting (bold, italic, links)
 * - none: No sanitization (for trusted internal data)
 */
export interface SanitizeOptions {
  body?: sanitizeHtml.IOptions | boolean;
  query?: sanitizeHtml.IOptions | boolean;
  params?: sanitizeHtml.IOptions | boolean;
  headers?: sanitizeHtml.IOptions | boolean;
}

const DEFAULT_OPTIONS: Required<SanitizeOptions> = {
  body: STRIP_ALL,
  query: STRIP_ALL,
  params: STRIP_ALL,
  headers: false, // Don't sanitize headers by default
};

/**
 * Global sanitization middleware that cleans all incoming request data
 * to prevent XSS and injection attacks.
 *
 * Features:
 * - Sanitizes request body, query parameters, and URL parameters
 * - Configurable sanitization options per data type
 * - Skips sanitization for trusted routes (e.g., internal APIs)
 * - Logs sanitization events in debug mode
 */
@Injectable()
export class SanitizeMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SanitizeMiddleware.name);

  constructor(private readonly options: SanitizeOptions = {}) {}

  /**
   * Sanitize a single value or object recursively
   */
  private sanitizeValue(
    value: unknown,
    sanitizeOptions: sanitizeHtml.IOptions | boolean,
    path: string = 'root',
  ): unknown {
    if (sanitizeOptions === false) {
      return value;
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      const result = sanitizeHtml(
        value,
        sanitizeOptions as sanitizeHtml.IOptions,
      );
      if (process.env.NODE_ENV === 'development' && result !== value) {
        this.logger.debug(
          `Sanitized string at ${path}: "${value}" -> "${result}"`,
        );
      }
      return result;
    }

    if (Array.isArray(value)) {
      return value.map((item, index) =>
        this.sanitizeValue(item, sanitizeOptions, `${path}[${index}]`),
      );
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.sanitizeValue(
          val,
          sanitizeOptions,
          `${path}.${key}`,
        );
      }
      return result;
    }

    return value;
  }

  /**
   * Sanitize request body
   */
  private sanitizeBody(req: Request): void {
    const options =
      this.options.body !== undefined
        ? this.options.body
        : DEFAULT_OPTIONS.body;

    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitizeValue(req.body, options, 'body') as Record<
        string,
        unknown
      >;
    }
  }

  /**
   * Sanitize query parameters
   */
  private sanitizeQuery(req: Request): void {
    const options =
      this.options.query !== undefined
        ? this.options.query
        : DEFAULT_OPTIONS.query;

    if (req.query && typeof req.query === 'object') {
      req.query = this.sanitizeValue(req.query, options, 'query') as ParsedQs;
    }
  }

  /**
   * Sanitize URL parameters
   */
  private sanitizeParams(req: Request): void {
    const options =
      this.options.params !== undefined
        ? this.options.params
        : DEFAULT_OPTIONS.params;

    if (req.params && typeof req.params === 'object') {
      req.params = this.sanitizeValue(
        req.params,
        options,
        'params',
      ) as ParamsDictionary;
    }
  }

  /**
   * Sanitize request headers
   */
  private sanitizeHeaders(req: Request): void {
    const options =
      this.options.headers !== undefined
        ? this.options.headers
        : DEFAULT_OPTIONS.headers;

    if (options && req.headers && typeof req.headers === 'object') {
      const sanitizedHeaders: Record<string, string | string[] | undefined> =
        {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') {
          sanitizedHeaders[key] = this.sanitizeValue(
            value,
            options,
            `headers.${key}`,
          ) as string;
        } else if (Array.isArray(value)) {
          sanitizedHeaders[key] = value.map(
            (v) => this.sanitizeValue(v, options, `headers.${key}`) as string,
          );
        } else {
          sanitizedHeaders[key] = value;
        }
      }
      req.headers = sanitizedHeaders;
    }
  }

  use(req: Request, res: Response, next: NextFunction): void {
    try {
      // Skip sanitization for internal/trusted routes
      if (this.shouldSkipSanitization(req)) {
        return next();
      }

      this.sanitizeBody(req);
      this.sanitizeQuery(req);
      this.sanitizeParams(req);

      // Headers are sanitized only if explicitly enabled
      if (
        this.options.headers !== undefined &&
        this.options.headers !== false
      ) {
        this.sanitizeHeaders(req);
      }

      next();
    } catch (error) {
      this.logger.error('Sanitization error:', error);
      next(error);
    }
  }

  /**
   * Determine if sanitization should be skipped for this request
   */
  private shouldSkipSanitization(req: Request): boolean {
    // Skip sanitization for health checks and internal APIs
    const skipPaths = ['/health', '/api/health', '/metrics', '/api/metrics'];

    return skipPaths.some((path) => req.path.startsWith(path));
  }
}

/**
 * Factory function to create sanitization middleware with custom options
 */
export function createSanitizeMiddleware(
  options: SanitizeOptions = {},
): SanitizeMiddleware {
  return new SanitizeMiddleware(options);
}
