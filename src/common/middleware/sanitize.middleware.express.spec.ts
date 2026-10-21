import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { SanitizeMiddleware } from './sanitize.middleware';

/**
 * Runs the middleware inside a real Express application. Express 5 exposes
 * `req.query` as a getter that re-parses the URL on every access, which mock
 * request objects do not reproduce.
 */
function createApp() {
  const app = express();
  const middleware = new SanitizeMiddleware();

  app.use(express.json());
  app.use((req, res, next) => middleware.use(req, res, next));
  app.all('/echo', (req: Request, res: Response) => {
    res.json({ query: req.query, body: req.body as unknown });
  });
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: err.message });
  });

  return app;
}

describe('SanitizeMiddleware in Express 5', () => {
  it('passes requests without query parameters', () => {
    return request(createApp())
      .get('/echo')
      .expect(200)
      .expect(({ body }) => {
        expect(body.query).toEqual({});
      });
  });

  it('strips HTML from query parameters', () => {
    return request(createApp())
      .get('/echo')
      .query({ name: '<b>Alice</b>', q: '<img src=x onerror=alert(1)>hi' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.query).toEqual({ name: 'Alice', q: 'hi' });
      });
  });

  it('keeps the sanitized query for every later read of req.query', async () => {
    const app = express();
    const middleware = new SanitizeMiddleware();
    app.use((req, res, next) => middleware.use(req, res, next));
    app.get('/twice', (req: Request, res: Response) => {
      const first = req.query.q;
      const second = req.query.q;
      res.json({ first, second });
    });

    await request(app)
      .get('/twice')
      .query({ q: '<script>x</script>ok' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ first: 'ok', second: 'ok' });
      });
  });

  it('strips HTML from the JSON body', () => {
    return request(createApp())
      .post('/echo')
      .send({ title: '<script>alert(1)</script>Hello' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.body).toEqual({ title: 'Hello' });
      });
  });
});
