import { parseTrustProxy } from './app.setup';

describe('parseTrustProxy', () => {
  it.each([
    [undefined, undefined],
    ['', undefined],
    ['  ', undefined],
    ['true', true],
    ['false', false],
    ['1', 1],
    ['2', 2],
    ['loopback, 10.0.0.0/8', 'loopback, 10.0.0.0/8'],
  ])('parses %p as %p', (value, expected) => {
    expect(parseTrustProxy(value)).toBe(expected);
  });
});
