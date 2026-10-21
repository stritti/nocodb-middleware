#!/usr/bin/env node
/**
 * Prepares a fresh NocoDB instance for the integration tests: waits until it
 * is healthy, creates (or signs in) a super admin and prints an API token as
 * `NOCODB_IT_TOKEN=<token>`.
 *
 *   NOCODB_IT_URL=http://localhost:8080 node scripts/nocodb-it-setup.mjs
 *
 * In GitHub Actions append the output to $GITHUB_ENV.
 * Only use this against throwaway test instances.
 */
const url = process.env.NOCODB_IT_URL ?? 'http://localhost:8080';
const email = process.env.NOCODB_IT_ADMIN_EMAIL ?? 'it-admin@example.com';
const password =
  process.env.NOCODB_IT_ADMIN_PASSWORD ?? 'It-Admin-Password-2026!';

async function waitForHealth(timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/v1/health`);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`NocoDB at ${url} did not become healthy`);
}

async function post(path, body, headers = {}) {
  const response = await fetch(`${url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    body: text ? JSON.parse(text) : {},
  };
}

await waitForHealth();

let auth = await post('/api/v1/auth/user/signup', { email, password });
if (!auth.ok) {
  auth = await post('/api/v1/auth/user/signin', { email, password });
}
if (!auth.ok || !auth.body.token) {
  throw new Error(
    `Could not sign in to NocoDB: ${auth.status} ${JSON.stringify(auth.body)}`,
  );
}

const token = await post(
  '/api/v1/tokens',
  { description: 'middleware integration tests' },
  { 'xc-auth': auth.body.token },
);
if (!token.ok || !token.body.token) {
  throw new Error(
    `Could not create API token: ${token.status} ${JSON.stringify(token.body)}`,
  );
}

console.log(`NOCODB_IT_TOKEN=${token.body.token}`);
