const fs = require('fs');
const path = require('path');

// Load .env (no external dependencies needed)
function loadEnv() {
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.env')
  ];
  for (const envPath of envPaths) {
    try {
      if (fs.existsSync(envPath)) {
        for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
          const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
          if (m && !process.env[m[1]]) {
            process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
          }
        }
        break;
      }
    } catch { /* no .env or permission issue */ }
  }
}

loadEnv();

function getProviders() {
  return [
    {
      name: 'Gemini',
      key: process.env.GEMINI_API_KEY,
      style: 'openai',
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      quick: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'],
      default: ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']
    },
    {
      name: 'OpenAI',
      key: process.env.OPENAI_API_KEY,
      style: 'openai',
      url: (process.env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/$/, '') + '/v1/chat/completions',
      quick: ['gpt-4.1-mini'],
      default: ['gpt-4.1']
    },
    {
      name: 'Claude',
      key: process.env.ANTHROPIC_API_KEY,
      style: 'anthropic',
      url: (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '') + '/v1/messages',
      quick: ['claude-haiku-5-5'],
      default: ['claude-sonnet-5-5']
    }
  ];
}

const list = v => v && v.split(',').map(s => s.trim()).filter(Boolean);

function getInfo() {
  const providers = getProviders();
  const p = providers.find(pr => pr.key) || providers[0];
  const geminiKey = process.env.GEMINI_API_KEY;
  const liveModel = process.env.LIVE_MODEL || 'gemini-3.8-live';
  return {
    key: p.key,
    provider: p.name,
    style: p.style,
    url: p.url,
    models: {
      quick: list(process.env.CUSTOMER_MODEL) || p.quick,
      default: list(process.env.REVIEW_MODEL) || p.default
    },
    geminiKey,
    liveModel
  };
}

// One request to one model. Returns { ok, status, text, msg }.
async function callModel(model, tier, prompt) {
  const info = getInfo();
  const messages = [{ role: 'user', content: prompt }];
  const maxTokens = tier === 'quick' ? 400 : 3000;
  const r = info.style === 'openai'
    ? await fetch(info.url, {
        method: 'POST',
        headers: { authorization: 'Bearer ' + info.key, 'content-type': 'application/json' },
        // Gemini's thinking tokens count against the limit, so give it room and keep the customer's thinking light.
        body: JSON.stringify(info.provider === 'Gemini'
          ? { model, messages, max_tokens: tier === 'quick' ? 2000 : 12000, ...(tier === 'quick' ? { reasoning_effort: 'low' } : {}) }
          : { model, messages, max_completion_tokens: maxTokens }),
        signal: AbortSignal.timeout(tier === 'quick' ? 15000 : 90000)
      })
    : await fetch(info.url, {
        method: 'POST',
        headers: { 'x-api-key': info.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
        signal: AbortSignal.timeout(tier === 'quick' ? 15000 : 90000)
      });
  let data = await r.json().catch(() => ({}));
  if (Array.isArray(data)) data = data[0] || {};   // Gemini wraps errors in an array
  if (!r.ok) return { ok: false, status: r.status, msg: data?.error?.message || (info.provider + ' API error ' + r.status) };
  const text = info.style === 'openai'
    ? (data.choices?.[0]?.message?.content || '')
    : (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return { ok: true, text };
}

function send(res, status, obj) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(obj);
  }
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}

async function parseBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch { return null; }
    }
  }
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 400000) throw new Error('Request too large');
  }
  try { return JSON.parse(body); } catch { return null; }
}

module.exports = {
  getInfo,
  callModel,
  send,
  parseBody
};
