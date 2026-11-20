import http from 'http';
import { AddressInfo } from 'net';
import { inspect } from 'util';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import {
  REDACTED,
  installAxiosErrorRedaction,
  redactAxiosError,
} from './axios-redaction.util';

const TOKEN = 'super-secret-nocodb-token';

describe('axios error redaction', () => {
  let server: http.Server;
  let baseURL: string;
  const receivedTokens: Array<string | undefined> = [];

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      receivedTokens.push(req.headers['xc-token'] as string | undefined);
      res.statusCode = 500;
      res.end('{}');
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    receivedTokens.length = 0;
  });

  it('removes the API token from a failed request error', async () => {
    const client = axios.create({ baseURL, headers: { 'xc-token': TOKEN } });
    installAxiosErrorRedaction(client);

    const error: unknown = await client.get('/x').catch((e: unknown) => e);

    expect(axios.isAxiosError(error)).toBe(true);
    expect(inspect(error, { depth: 10 })).not.toContain(TOKEN);
    expect(JSON.stringify(error)).not.toContain(TOKEN);
    expect(
      (error as { config: { headers: Record<string, string> } }).config.headers[
        'xc-token'
      ],
    ).toBe(REDACTED);
    expect((error as { response?: { status: number } }).response?.status).toBe(
      500,
    );
  });

  it('keeps the token for retries when registered after axios-retry', async () => {
    const client = axios.create({ baseURL, headers: { 'xc-token': TOKEN } });
    axiosRetry(client, {
      retries: 2,
      retryDelay: () => 0,
      retryCondition: () => true,
    });
    installAxiosErrorRedaction(client);

    const error: unknown = await client.get('/x').catch((e: unknown) => e);

    expect(receivedTokens).toEqual([TOKEN, TOKEN, TOKEN]);
    expect(inspect(error, { depth: 10 })).not.toContain(TOKEN);
  });

  it('leaves other errors untouched', () => {
    const error = new Error('boom');
    expect(redactAxiosError(error)).toBe(error);
    expect(redactAxiosError('text')).toBe('text');
  });
});
