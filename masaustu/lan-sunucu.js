/* Wi‑Fi (aynı ağ) eşitleme — masaüstü taşıması (sunucu + istemci). Birleştirme arayüzdedir (kaynak/js/temel/lan.js).
   Protokol v2 (Android: android/src/.../LanSunucu.java aynısını uygular; test/birim/lan-protokol.test.js):
     anahtar = SHA-256("ingmufredat-lan-v2|" + 6 haneli kod)          — kod ağda HİÇ gönderilmez
     1) GET  /ing2/ping   → {app:"ingmufredat", v:2, ad, meydan}      — meydan: tek kullanımlık rastgele sayı (2 dk)
     2) POST /ing2/esitle   başlıklar: X-Ing-Meydan, X-Ing-Nonce (istemcinin rastgele sayısı), X-Ing-Imza
          imza  = hex(HMAC-SHA256(anahtar, "ESITLE\n" + meydan + "\n" + nonce + "\n" + hex(SHA-256(gövde))))
        yanıt başlığı X-Ing-Imza = hex(HMAC-SHA256(anahtar, "YANIT\n" + meydan + "\n" + nonce + "\n" + hex(SHA-256(yanıt))))
   Kurallar: meydan bir kez kullanılır (tekrar oynatma yok, saat farkı önemsiz); 5 yanlış imzada kod değişir ve bekleme kapanır;
   CORS başlığı verilmez, Origin başlıklı (tarayıcıdan gelen) istek reddedilir; gövde en çok 64 MB; aynı anda tek eşitleme.
   Eski (kabuk 3) istemci /ing-esitle'ye gelirse 426 "eski-surum" alır. */
'use strict';
const http = require('http');
const os = require('os');
const crypto = require('crypto');

const PORT = 47851;
const ONEK = 'ingmufredat-lan-v2|';
const AZAMI = 64 * 1024 * 1024;
const MEYDAN_OMUR = 2 * 60 * 1000;
const YANLIS_SINIR = 5;

const sha = (b) => crypto.createHash('sha256').update(b).digest();
const anahtar = (pin) => sha(Buffer.from(ONEK + String(pin), 'utf8'));
const hmacHex = (k, s) => crypto.createHmac('sha256', k).update(s, 'utf8').digest('hex');
const imzaIstek = (k, meydan, nonce, govde) => hmacHex(k, 'ESITLE\n' + meydan + '\n' + nonce + '\n' + sha(govde).toString('hex'));
const imzaYanit = (k, meydan, nonce, govde) => hmacHex(k, 'YANIT\n' + meydan + '\n' + nonce + '\n' + sha(govde).toString('hex'));
const esit = (a, b) => { const x = Buffer.from(String(a), 'utf8'), y = Buffer.from(String(b), 'utf8'); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const yeniPin = () => String(crypto.randomInt(100000, 1000000));

let sunucu = null, pin = null, gelen = null, ad = os.hostname(), yanlis = 0, kilit = false, mesgul = false;
const meydanlar = new Map();   // meydan → bitiş zamanı

function yerelIpler() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) {
    if (a.family === 'IPv4' && !a.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)) out.push(a.address);
  }
  return out;
}
function json(res, kod, o, baslik) {
  const b = Buffer.from(JSON.stringify(o), 'utf8');
  res.writeHead(kod, Object.assign({ 'content-type': 'application/json; charset=utf-8', 'content-length': b.length, 'cache-control': 'no-store' }, baslik || {}));
  res.end(b);
}
function meydanVer() {
  const now = Date.now();
  for (const [m, t] of meydanlar) if (t < now) meydanlar.delete(m);
  while (meydanlar.size >= 64) meydanlar.delete(meydanlar.keys().next().value);
  const m = crypto.randomBytes(16).toString('hex');
  meydanlar.set(m, now + MEYDAN_OMUR);
  return m;
}
function meydanAl(m) { const t = meydanlar.get(m); meydanlar.delete(m); return !!(t && t >= Date.now()); }

function istekIsle(req, res) {
  if (req.headers.origin) return json(res, 403, { hata: 'origin' });       // tarayıcıdan erişim yok
  const url = String(req.url || '').split('?')[0];
  if (req.method === 'GET' && url === '/ing2/ping') return json(res, 200, { app: 'ingmufredat', v: 2, ad, meydan: meydanVer() });
  if (url === '/ing-ping') return json(res, 200, { app: 'ingmufredat', v: 2, ad });        // eski istemci bulsun, sonra 426 alsın
  if (url === '/ing-esitle') return json(res, 426, { hata: 'eski-surum' });
  if (req.method !== 'POST' || url !== '/ing2/esitle') return json(res, 404, { hata: 'yok' });
  if (kilit || !pin) return json(res, 423, { hata: 'kilitli' });
  if (mesgul) return json(res, 409, { hata: 'mesgul' });
  const meydan = String(req.headers['x-ing-meydan'] || ''), nonce = String(req.headers['x-ing-nonce'] || ''), imza = String(req.headers['x-ing-imza'] || '');
  if (!/^[0-9a-f]{32}$/.test(meydan) || !/^[0-9a-f]{16,64}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(imza)) return json(res, 400, { hata: 'baslik' });
  const parcalar = []; let boy = 0, asti = false;
  req.on('data', (c) => { boy += c.length; if (boy > AZAMI) { asti = true; req.destroy(); } else parcalar.push(c); });
  req.on('end', async () => {
    if (asti) return;
    const govde = Buffer.concat(parcalar);
    const k = anahtar(pin);
    const meydanGecerli = meydanAl(meydan);
    if (!meydanGecerli || !esit(imza, imzaIstek(k, meydan, nonce, govde))) {
      yanlis++;
      if (yanlis >= YANLIS_SINIR) { kilit = true; pin = yeniPin(); json(res, 423, { hata: 'kilitli' }); setTimeout(durdur, 50); return; }
      return json(res, 401, { hata: meydanGecerli ? 'imza' : 'meydan' });
    }
    yanlis = 0; mesgul = true;
    try {
      const yanit = Buffer.from(await gelen(govde.toString('utf8')), 'utf8');
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-length': yanit.length, 'x-ing-imza': imzaYanit(k, meydan, nonce, yanit), 'cache-control': 'no-store' });
      res.end(yanit);
    } catch (e) { json(res, 500, { hata: String((e && e.message) || e).slice(0, 200) }); }
    finally { mesgul = false; }
  });
}

function baslat(gelenFn, o) {
  durdur();
  gelen = gelenFn; ad = (o && o.ad) || os.hostname(); pin = yeniPin(); yanlis = 0; kilit = false; meydanlar.clear();
  sunucu = http.createServer(istekIsle);
  sunucu.requestTimeout = 120000;
  return new Promise((ok, fail) => {
    sunucu.once('error', (e) => { sunucu = null; pin = null; fail(e); });
    sunucu.listen((o && o.port) || PORT, '0.0.0.0', () => ok(durum()));
  });
}
function durdur() { if (sunucu) { try { sunucu.close(); } catch (e) { /* yoksay */ } } sunucu = null; if (!kilit) pin = null; meydanlar.clear(); }
function durum() { return { hosting: !!sunucu, pin: sunucu ? pin : null, ips: yerelIpler(), port: PORT, kilit }; }

function istek(host, yol, o) {
  o = o || {};
  return new Promise((ok, fail) => {
    const rq = http.request({ host, port: o.port || PORT, path: yol, method: o.method || 'GET', timeout: o.timeout || 1200, headers: Object.assign({ 'content-type': 'application/json' }, o.headers || {}, o.govde ? { 'content-length': o.govde.length } : {}) }, (rs) => {
      const p = []; rs.on('data', (c) => p.push(c)); rs.on('end', () => ok({ status: rs.statusCode, headers: rs.headers, govde: Buffer.concat(p) }));
    });
    rq.on('timeout', () => rq.destroy(Object.assign(new Error('timeout'), { code: 'unreachable' })));
    rq.on('error', fail);
    if (o.govde) rq.write(o.govde);
    rq.end();
  });
}

async function bul() {
  const found = [];
  for (const ip of yerelIpler()) {
    const base = ip.slice(0, ip.lastIndexOf('.') + 1);
    const hepsi = []; for (let i = 1; i < 255; i++) if (base + i !== ip) hepsi.push(base + i);
    for (let i = 0; i < hepsi.length; i += 48) {
      await Promise.all(hepsi.slice(i, i + 48).map(async (h) => {
        try { const r = await istek(h, '/ing2/ping', { timeout: 700 }); const j = JSON.parse(r.govde.toString('utf8')); if (r.status === 200 && j.app === 'ingmufredat' && j.v >= 2) found.push({ host: h, ad: j.ad || '' }); } catch (e) { /* yok */ }
      }));
    }
  }
  return found;
}

/** İstemci: kendi verimizi (metin) yollar, karşının birleştirmeden önceki verisini (metin) döndürür. */
async function esitle(host, p, metin, o) {
  host = String(host).trim(); p = String(p).trim();
  const port = (o && o.port) || PORT;
  let ping;
  try { ping = await istek(host, '/ing2/ping', { timeout: 3000, port }); } catch (e) { throw Object.assign(new Error('unreachable'), { code: 'unreachable' }); }
  let pj = {}; try { pj = JSON.parse(ping.govde.toString('utf8')); } catch (e) { /* yoksay */ }
  if (ping.status !== 200 || pj.app !== 'ingmufredat') throw Object.assign(new Error('unreachable'), { code: 'unreachable' });
  if (!pj.v || pj.v < 2 || !pj.meydan) throw Object.assign(new Error('eski-surum'), { code: 'eski-surum' });
  const k = anahtar(p), nonce = crypto.randomBytes(16).toString('hex'), govde = Buffer.from(String(metin), 'utf8');
  const r = await istek(host, '/ing2/esitle', { method: 'POST', timeout: 180000, port, govde,
    headers: { 'x-ing-meydan': pj.meydan, 'x-ing-nonce': nonce, 'x-ing-imza': imzaIstek(k, pj.meydan, nonce, govde) } })
    .catch(() => { throw Object.assign(new Error('unreachable'), { code: 'unreachable' }); });
  if (r.status === 401) throw Object.assign(new Error('pin'), { code: 'pin' });
  if (r.status === 423) throw Object.assign(new Error('kilitli'), { code: 'kilitli' });
  if (r.status === 426) throw Object.assign(new Error('eski-surum'), { code: 'eski-surum' });
  if (r.status !== 200) { let h = ''; try { h = JSON.parse(r.govde.toString('utf8')).hata; } catch (e) { /* yoksay */ } throw Object.assign(new Error(h || 'http ' + r.status), { code: h || 'http' }); }
  if (!esit(String(r.headers['x-ing-imza'] || ''), imzaYanit(k, pj.meydan, nonce, r.govde))) throw Object.assign(new Error('imza'), { code: 'imza' });
  return r.govde.toString('utf8');
}

module.exports = { baslat, durdur, durum, bul, esitle, yerelIpler, PORT, _ic: { anahtar, imzaIstek, imzaYanit, ONEK } };
