const { send, getInfo } = require('./_shared');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Method not allowed' });
  }

  const { geminiKey, liveModel } = getInfo();
  if (!geminiKey) {
    return send(res, 400, { error: 'Live voice needs GEMINI_API_KEY in environment variables' });
  }

  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1alpha/auth_tokens', {
      method: 'POST',
      headers: { 'x-goog-api-key': geminiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        uses: 1,
        expireTime: new Date(Date.now() + 40 * 60e3).toISOString(),        // a call can last up to 40 min
        newSessionExpireTime: new Date(Date.now() + 2 * 60e3).toISOString() // must connect within 2 min
      }),
      signal: AbortSignal.timeout(15000)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.name) {
      const msg = data?.error?.message || 'Could not create a live session token (' + r.status + ')';
      console.error('[live] ' + msg);
      return send(res, 502, { error: msg });
    }
    console.log('[live] session token issued for ' + liveModel);
    return send(res, 200, { token: data.name, model: liveModel });
  } catch (e) {
    return send(res, 502, { error: 'Could not reach Gemini: ' + e.message });
  }
};
