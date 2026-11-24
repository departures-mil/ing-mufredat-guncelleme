// Test için basit statik sunucu (.derleme/www). Dış adreslere gidilmez; testler page.route ile karşılar.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.gz': 'application/gzip', '.wasm': 'application/wasm', '.txt': 'text/plain' };
function baslat(kok, port) {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const f = path.normalize(path.join(kok, p));
      if (!f.startsWith(kok) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('yok'); }
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    s.listen(port || 0, '127.0.0.1', () => ok({ s, url: 'http://127.0.0.1:' + s.address().port + '/' }));
  });
}
function playwright() {
  const yol = process.env.PLAYWRIGHT_CORE || '/opt/npm-tools/node_modules/playwright-core';
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
  try { return require(yol); } catch (e) { try { return require('playwright-core'); } catch (e2) { return null; } }
}
module.exports = { baslat, playwright };
