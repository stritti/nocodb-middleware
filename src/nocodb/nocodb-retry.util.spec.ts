import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { shouldRetryNocoDBRequest } from './nocodb-retry.util';

function httpError(method: string, status: number): AxiosError {
  const config = { method, headers: new AxiosHeaders() };
  const response = {
    status,
    statusText: '',
    data: {},
    headers: {},
    config,
  } as AxiosResponse;
  return new AxiosError(
    `Request failed with status code ${status}`,
    AxiosError.ERR_BAD_RESPONSE,
    config,
    {},
    response,
  );
}

function networkError(method: string, code: string): AxiosError {
  const config = { method, headers: new AxiosHeaders() };
  return new AxiosError('socket hang up', code, config, {});
}

describe('shouldRetryNocoDBRequest', () => {
  describe('read requests', () => {
    it.each(['get', 'head', 'options'])(
      'retries %s on 5xx responses',
      (method) => {
        expect(shouldRetryNocoDBRequest(httpError(method, 503))).toBe(true);
      },
    );

    it.each(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNABORTED'])(
      'retries GET on transient network error %s',
      (code) => {
        expect(shouldRetryNocoDBRequest(networkError('get', code))).toBe(true);
      },
    );

    it('does not retry GET on 4xx client errors', () => {
      expect(shouldRetryNocoDBRequest(httpError('get', 404))).toBe(false);
      expect(shouldRetryNocoDBRequest(httpError('get', 400))).toBe(false);
    });

    it('does not retry a cancelled GET', () => {
      expect(
        shouldRetryNocoDBRequest(networkError('get', AxiosError.ERR_CANCELED)),
      ).toBe(false);
    });
  });

  describe('write requests', () => {
    it.each(['post', 'put', 'patch', 'delete'])(
      'does not retry %s on 5xx responses',
      (method) => {
        expect(shouldRetryNocoDBRequest(httpError(method, 503))).toBe(false);
      },
    );

    it.each(['post', 'put', 'patch', 'delete'])(
      'does not retry %s on network errors',
      (method) => {
        expect(
          shouldRetryNocoDBRequest(networkError(method, 'ECONNRESET')),
        ).toBe(false);
      },
    );
  });

  it.each(['get', 'post', 'patch', 'delete'])(
    'retries %s on 429, because the server did not process the request',
    (method) => {
      expect(shouldRetryNocoDBRequest(httpError(method, 429))).toBe(true);
    },
  );

  it('does not retry when the request method is unknown', () => {
    const error = new AxiosError('boom', 'ECONNRESET');
    expect(shouldRetryNocoDBRequest(error)).toBe(false);
  });
});
