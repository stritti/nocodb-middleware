module.exports = async function globalTeardown() {
  const { NOCODB_IT_URL: url, NOCODB_IT_TOKEN: token } = process.env;
  const baseId = process.env.NOCODB_IT_BASE_ID;

  if (url && token && baseId && !process.env.NOCODB_IT_KEEP_BASE) {
    await fetch(`${url}/api/v2/meta/bases/${baseId}`, {
      method: 'DELETE',
      headers: { 'xc-token': token },
    });
  }
};
