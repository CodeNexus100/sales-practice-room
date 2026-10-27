const { send, parseBody, getInfo, callModel } = require('./_shared');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Method not allowed' });
  }

  const info = getInfo();
  if (!info.key) {
    return send(res, 500, { error: 'No API key. Add GEMINI_API_KEY, OPENAI_API_KEY or ANTHROPIC_API_KEY to environment variables.' });
  }

  let input;
  try {
    input = await parseBody(req);
  } catch (e) {
    return send(res, e.message === 'Request too large' ? 413 : 400, { error: e.message });
  }

  if (!input) {
    return send(res, 400, { error: 'Invalid JSON' });
  }

  const tier = input.tier === 'quick' ? 'quick' : 'default';
  const prompt = String(input.prompt || '');
  let last = { status: 502, msg: 'No model answered' };

  for (const model of info.models[tier]) {
    const started = Date.now();
    try {
      const r = await callModel(model, tier, prompt);
      if (r.ok && r.text) {
        console.log(`[${tier}] ${model} answered in ${Date.now() - started} ms`);
        return send(res, 200, { text: r.text });
      }
      last = r.ok ? { status: 502, msg: model + ' returned an empty reply' } : r;
    } catch (e) {
      last = { status: 502, msg: `Could not reach ${info.provider} (${model}): ` + e.message };
    }
    console.error(`[${tier}] ${model} failed (${last.status}): ${last.msg}`);
    if ([400, 401, 403].includes(last.status)) break;   // bad request or bad key: another model won't help
  }
  return send(res, last.status === 429 ? 429 : 502, { error: last.msg });
};
