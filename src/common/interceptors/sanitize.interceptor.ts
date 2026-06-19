import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as sanitizeHtml from 'sanitize-html';

/**
 * Global interceptor that sanitizes string values in response data
 * to prevent XSS attacks. This interceptor recursively processes
 * all string values in response objects and arrays.
 */
@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (typeof data === 'object' && data !== null) {
          return this.sanitizeObject(data);
        }
        if (typeof data === 'string') {
          return this.sanitizeString(data);
        }
        return data;
      }),
    );
  }

  /**
   * Recursively sanitizes all string values in an object or array
   */
  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    return obj;
  }

  /**
   * Sanitizes a single string value by removing HTML tags and scripts
   */
  private sanitizeString(value: string): string {
    return sanitizeHtml(value, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {},
      allowedIframeHostnames: [],
      disallowedTagsMode: 'discard',
      nonTextTags: ['style', 'script', 'textarea', 'iframe', 'noembed', 'noframes'],
      parser: {
        lowerCaseTags: true,
        lowerCaseAttributeNames: true,
      },
    });
  }
}
