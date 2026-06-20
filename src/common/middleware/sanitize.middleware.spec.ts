import { SanitizeMiddleware } from './sanitize.middleware';
import { Request, Response, NextFunction } from 'express';
import sanitizeHtml from 'sanitize-html';

// STRIP_ALL constant for testing - must match the one in sanitize.middleware.ts
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

describe('SanitizeMiddleware', () => {
  let middleware: SanitizeMiddleware;

  beforeEach(() => {
    // Create middleware directly (avoids NestJS dependency injection issues in tests)
    middleware = new SanitizeMiddleware();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        path: '/api/test',
        body: {},
        query: {},
        params: {},
        headers: {},
      };
      mockRes = {};
      mockNext = jest.fn();
    });

    it('should call next() without error', () => {
      middleware.use(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize XSS in request body', () => {
      mockReq.body = {
        name: '<script>alert("XSS")</script>',
        description: '<img src=x onerror=alert(1)>',
      };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // With STRIP_ALL options (allowedTags: []), script tags have all content stripped
      // img tags also have all content stripped (self-closing tags with no text content)
      expect((mockReq as Request).body.name).toBe('');
      expect((mockReq as Request).body.description).toBe('');
    });

    it('should sanitize XSS in query parameters', () => {
      mockReq.query = {
        search: '<script>malicious()</script>',
      };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // With STRIP_ALL options (allowedTags: []), script tags have all content stripped
      expect((mockReq as Request).query.search).toBe('');
    });

    it('should sanitize XSS in URL parameters', () => {
      mockReq.params = {
        id: '<script>test</script>',
      };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // With STRIP_ALL options (allowedTags: []), script tags have all content stripped
      expect((mockReq as Request).params.id).toBe('');
    });

    it('should handle nested objects', () => {
      mockReq.body = {
        user: {
          name: '<b>John</b>',
          bio: '<script>alert(1)</script>',
        },
        tags: ['<script>tag1</script>', '<script>tag2</script>'],
      };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const body = (mockReq as Request).body as Record<string, unknown>;
      // With STRIP_ALL options (allowedTags: []), b tags preserve text, script tags strip all content
      expect((body.user as Record<string, string>).name).toBe('John');
      expect((body.user as Record<string, string>).bio).toBe('');
      expect((body.tags as string[])[0]).toBe('');
      expect((body.tags as string[])[1]).toBe('');
    });

    it('should skip sanitization for health check routes', () => {
      mockReq.path = '/api/health';
      mockReq.body = { test: '<script>alert(1)</script>' };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      // Should not be sanitized for health check
      expect((mockReq as Request).body.test).toBe('<script>alert(1)</script>');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip sanitization for metrics routes', () => {
      mockReq.path = '/api/metrics';
      mockReq.body = { test: '<script>alert(1)</script>' };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as Request).body.test).toBe('<script>alert(1)</script>');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle null and undefined values', () => {
      mockReq.body = {
        name: null,
        description: undefined,
        valid: 'test',
      };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const body = (mockReq as Request).body as Record<string, unknown>;
      expect(body.name).toBeNull();
      expect(body.description).toBeUndefined();
      expect(body.valid).toBe('test');
    });

    it('should handle non-string values', () => {
      mockReq.body = {
        count: 123,
        active: true,
        data: { nested: '<div>test</div>' },
      };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const body = (mockReq as Request).body as Record<string, unknown>;
      expect(body.count).toBe(123);
      expect(body.active).toBe(true);
      // With STRIP_ALL options (allowedTags: []), div tags preserve text content
      expect((body.data as Record<string, string>).nested).toBe('test');
    });
  });

  describe('custom options', () => {
    it('should allow custom sanitization options', () => {
      const customMiddleware = new SanitizeMiddleware({
        body: {
          allowedTags: ['b', 'i', 'em', 'strong'],
          allowedAttributes: {},
        },
      });

      const mockReq: Partial<Request> = {
        path: '/api/test',
        body: { text: '<b>Bold</b> and <script>XSS</script>' },
        query: {},
        params: {},
        headers: {},
      };
      const mockRes: Partial<Response> = {};
      const mockNext: NextFunction = jest.fn();

      customMiddleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // With custom options allowing <b> tag, it should be preserved
      expect((mockReq as Request).body.text).toContain('<b>Bold</b>');
      // But <script> should still be removed
      expect((mockReq as Request).body.text).not.toContain('<script>');
      // The text content should be preserved
      expect((mockReq as Request).body.text).toContain('and');
    });

    it('should disable sanitization for specific data types', () => {
      const customMiddleware = new SanitizeMiddleware({
        body: false, // Disable body sanitization
        query: STRIP_ALL,
      });

      const mockReq: Partial<Request> = {
        path: '/api/test',
        body: { text: '<script>XSS</script>' },
        query: { search: '<script>XSS</script>' },
        params: {},
        headers: {},
      };
      const mockRes: Partial<Response> = {};
      const mockNext: NextFunction = jest.fn();

      customMiddleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // Body should NOT be sanitized
      expect((mockReq as Request).body.text).toBe('<script>XSS</script>');
      // Query should be sanitized (with STRIP_ALL, script tags have all content stripped)
      expect((mockReq as Request).query.search).toBe('');
    });
  });
});
