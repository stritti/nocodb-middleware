/**
 * Creates a fresh, isolated NocoDB base for one integration test run.
 *
 * Requires a running NocoDB and an API token:
 *   NOCODB_IT_URL    e.g. http://localhost:8080
 *   NOCODB_IT_TOKEN  API token (xc-token) of a NocoDB user
 */
module.exports = async function globalSetup() {
  const url = process.env.NOCODB_IT_URL;
  const token = process.env.NOCODB_IT_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Integration tests need NOCODB_IT_URL and NOCODB_IT_TOKEN (see docs/testing.md).',
    );
  }

  const response = await fetch(`${url}/api/v2/meta/bases`, {
    method: 'POST',
    headers: { 'xc-token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: `it-${Date.now()}` }),
  });

  if (!response.ok) {
    throw new Error(
      `Could not create test base: ${response.status} ${await response.text()}`,
    );
  }

  const base = await response.json();
  process.env.NOCODB_IT_BASE_ID = base.id;
};
