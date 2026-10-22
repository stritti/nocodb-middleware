import { AxiosAdapter, AxiosError, AxiosResponse } from 'axios';
import { createHttpClient } from '../src/http-client';
import { InMemoryTokenStorage } from '../src/token-storage';
import { MiddlewareError } from '../src/types';

/**
 * Fake server: answers 200 for the accepted token, 401 for anything else, and
 * records the Authorization header of every request.
 */
function fakeServer(acceptedToken: () => string) {
  const seen: (string | undefined)[] = [];
  const adapter: AxiosAdapter = async (config) => {
    const auth = config.headers?.Authorization as string | undefined;
    seen.push(auth);
    const response = {
      data:
        auth === `Bearer ${acceptedToken()}`
          ? { ok: true }
          : { message: 'Unauthorized' },
      status: auth === `Bearer ${acceptedToken()}` ? 200 : 401,
      statusText: '',
      headers: {},
      config,
    } as AxiosResponse;
    if (response.status === 401) {
      throw new AxiosError(
        'Unauthorized',
        AxiosError.ERR_BAD_REQUEST,
        config,
        {},
        response,
      );
    }
    return response;
  };
  return { adapter, seen };
}

function setup(onRefresh?: () => Promise<string>, accepted = 'fresh') {
  const storage = new InMemoryTokenStorage();
  storage.set({ accessToken: 'stale' });
  const http = createHttpClient('http://middleware', storage, 1000, onRefresh);
  const server = fakeServer(() => accepted);
  http.defaults.adapter = server.adapter;
  return { http, storage, seen: server.seen };
}

describe('createHttpClient', () => {
  it('sends the stored access token as bearer token', async () => {
    const { http, seen } = setup(undefined, 'stale');

    await http.get('/meta/tables');

    expect(seen).toEqual(['Bearer stale']);
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    const onRefresh = jest.fn().mockResolvedValue('fresh');
    const { http, seen } = setup(onRefresh);

    const response = await http.get('/meta/tables');

    expect(response.data).toEqual({ ok: true });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(seen).toEqual(['Bearer stale', 'Bearer fresh']);
  });

  it('stores the refreshed token, so later requests do not refresh again', async () => {
    const onRefresh = jest.fn().mockResolvedValue('fresh');
    const { http, storage } = setup(onRefresh);

    await http.get('/meta/tables');
    await http.get('/meta/tables');

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(storage.get()?.accessToken).toBe('fresh');
  });

  it('does not loop when the retried request is rejected again', async () => {
    const onRefresh = jest.fn().mockResolvedValue('also-rejected');
    const { http, seen } = setup(onRefresh, 'never-issued');

    const error = await http.get('/meta/tables').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MiddlewareError);
    expect((error as MiddlewareError).statusCode).toBe(401);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(seen).toHaveLength(2);
  });

  it('clears the tokens and rejects with 401 when the refresh fails', async () => {
    const onRefresh = jest.fn().mockRejectedValue(new Error('IdP down'));
    const { http, storage } = setup(onRefresh);

    const error = await http.get('/meta/tables').catch((e: unknown) => e);

    expect((error as MiddlewareError).statusCode).toBe(401);
    expect(storage.get()).toBeNull();
  });

  it('propagates a 401 without retry when no onRefresh is configured', async () => {
    const { http, seen } = setup(undefined);

    const error = await http.get('/meta/tables').catch((e: unknown) => e);

    expect((error as MiddlewareError).statusCode).toBe(401);
    expect(seen).toHaveLength(1);
  });

  it('allows a new refresh after a failed one', async () => {
    const onRefresh = jest
      .fn()
      .mockRejectedValueOnce(new Error('IdP down'))
      .mockResolvedValueOnce('fresh');
    const { http, storage } = setup(onRefresh);

    await http.get('/meta/tables').catch(() => undefined);
    storage.set({ accessToken: 'stale' });
    const response = await http.get('/meta/tables');

    expect(response.status).toBe(200);
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });
});
