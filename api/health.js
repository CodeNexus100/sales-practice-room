const { send, getInfo } = require('./_shared');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { error: 'Method not allowed' });
  }
  const info = getInfo();
  return send(res, 200, { ok: Boolean(info.key), live: Boolean(info.geminiKey) });
};
