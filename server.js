// Sales Practice Room: local server.
// Serves the app and forwards AI requests to Gemini, OpenAI or Claude.
// Run: node server.js   then open http://localhost:3000 in Google Chrome.
const http = require('http');
const fs = require('fs');
const path = require('path');

const healthHandler = require('./api/health');
const liveTokenHandler = require('./api/live-token');
const askHandler = require('./api/ask');
const { getInfo } = require('./api/_shared');

const PORT = Number(process.env.PORT) || 3000;
const PAGE = path.join(__dirname, 'public', 'index.html');

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return fs.createReadStream(PAGE).pipe(res);
  }

  if (req.method === 'GET' && url === '/api/health') {
    return healthHandler(req, res);
  }

  if (req.method === 'POST' && url === '/api/live-token') {
    return liveTokenHandler(req, res);
  }

  if (req.method === 'POST' && url === '/api/ask') {
    return askHandler(req, res);
  }

  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Not found');
});

if (require.main === module) {
  server.listen(PORT, () => {
    const info = getInfo();
    console.log(`\nSales Practice Room is running: open http://localhost:${PORT} in Google Chrome`);
    if (info.geminiKey) console.log(`Live voice calls: ${info.liveModel}`);
    if (info.key) console.log(`Using ${info.provider}: customer = ${info.models.quick.join(' > ')}, review = ${info.models.default.join(' > ')}\n`);
    else console.log('Warning: no API key set. Copy .env.example to .env and add GEMINI_API_KEY, OPENAI_API_KEY or ANTHROPIC_API_KEY.\n');
  });
}

module.exports = server;
