// Wi‑Fi eşitleme protokolü v2 (masaustu/lan-sunucu.js): imza, tek kullanımlık meydan, yanlış kod sınırı, Origin reddi,
// yanıt imzası; Android (LanSunucu.java) ile aynı imzayı ürettiği javac + android.jar varsa denetlenir.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const LAN = require('../../masaustu/lan-sunucu.js');

const PORT = 47000 + Math.floor(Math.random() * 900);
const istek = (yol, o) => new Promise((ok, fail) => {
  o = o || {};
  const rq = http.request({ host: '127.0.0.1', port: PORT, path: yol, method: o.method || 'GET', headers: o.headers || {} }, (rs) => { const p = []; rs.on('data', (c) => p.push(c)); rs.on('end', () => ok({ status: rs.statusCode, headers: rs.headers, govde: Buffer.concat(p).toString('utf8') })); });
  rq.on('error', fail); if (o.govde) rq.write(o.govde); rq.end();
});

test('istemci ↔ sunucu: doğru kodla eşitlenir, yanıt imzası doğrulanır', async () => {
  let gelen = null;
  const st = await LAN.baslat(async (m) => { gelen = JSON.parse(m); return JSON.stringify({ app: 'ingmufredat', db: { b: 2 } }); }, { port: PORT, ad: 'test' });
  try {
    assert.ok(/^\d{6}$/.test(st.pin));
    const r = await LAN.esitle('127.0.0.1', st.pin, JSON.stringify({ app: 'ingmufredat', db: { a: 1 } }), { port: PORT });
    assert.deepStrictEqual(JSON.parse(r).db, { b: 2 });
    assert.deepStrictEqual(gelen.db, { a: 1 });
  } finally { LAN.durdur(); }
});

test('yanlış kod: "pin"; 5 yanlış denemede kilit, kod değişir ve bekleme kapanır', async () => {
  const st = await LAN.baslat(async () => '{}', { port: PORT });
  try {
    const yanlis = st.pin === '111111' ? '222222' : '111111';
    for (let i = 0; i < 4; i++) await assert.rejects(LAN.esitle('127.0.0.1', yanlis, '{}', { port: PORT }), { message: 'pin' });
    await assert.rejects(LAN.esitle('127.0.0.1', yanlis, '{}', { port: PORT }), { message: 'kilitli' });
    await new Promise((r) => setTimeout(r, 120));
    const d = LAN.durum();
    assert.strictEqual(d.hosting, false); assert.strictEqual(d.kilit, true);
  } finally { LAN.durdur(); }
});

test('Origin başlıklı (tarayıcı) istek reddedilir, CORS başlığı yok; meydan tek kullanımlık', async () => {
  const st = await LAN.baslat(async () => '{"ok":1}', { port: PORT });
  try {
    const p = await istek('/ing2/ping');
    assert.strictEqual(p.status, 200);
    assert.strictEqual(p.headers['access-control-allow-origin'], undefined);
    const o = await istek('/ing2/ping', { headers: { Origin: 'http://kotu.site' } });
    assert.strictEqual(o.status, 403);
    // aynı meydanla iki istek: ikincisi reddedilir (tekrar oynatma)
    const { meydan } = JSON.parse(p.govde);
    const k = LAN._ic.anahtar(st.pin), nonce = 'a'.repeat(32), govde = Buffer.from('{"app":"ingmufredat","db":{}}');
    const h = { 'x-ing-meydan': meydan, 'x-ing-nonce': nonce, 'x-ing-imza': LAN._ic.imzaIstek(k, meydan, nonce, govde), 'content-length': govde.length };
    const r1 = await istek('/ing2/esitle', { method: 'POST', headers: h, govde });
    assert.strictEqual(r1.status, 200);
    assert.strictEqual(r1.headers['x-ing-imza'], LAN._ic.imzaYanit(k, meydan, nonce, Buffer.from(r1.govde)));
    const r2 = await istek('/ing2/esitle', { method: 'POST', headers: h, govde });
    assert.strictEqual(r2.status, 401);
    // kabuk 3 istemcisi: 426 eski-surum
    const r3 = await istek('/ing-esitle', { method: 'POST', headers: { 'x-pin': st.pin }, govde: '{}' });
    assert.strictEqual(r3.status, 426);
  } finally { LAN.durdur(); }
});

test('gövde değiştirilirse imza tutmaz', async () => {
  const st = await LAN.baslat(async () => '{}', { port: PORT });
  try {
    const { meydan } = JSON.parse((await istek('/ing2/ping')).govde);
    const k = LAN._ic.anahtar(st.pin), nonce = 'b'.repeat(32);
    const imza = LAN._ic.imzaIstek(k, meydan, nonce, Buffer.from('{"a":1}'));
    const r = await istek('/ing2/esitle', { method: 'POST', headers: { 'x-ing-meydan': meydan, 'x-ing-nonce': nonce, 'x-ing-imza': imza }, govde: '{"a":2}' });
    assert.strictEqual(r.status, 401);
  } finally { LAN.durdur(); }
});

test('Android (LanSunucu.java) aynı anahtarı ve imzaları üretir', (t) => {
  const jar = process.env.ANDROID_JAR || ['/tmp/sdk/pf/android-35/android.jar', path.join(process.env.ANDROID_HOME || '/nonexistent', 'platforms/android-35/android.jar')].find((p) => fs.existsSync(p));
  let javac = true; try { execFileSync('javac', ['-version'], { stdio: 'ignore' }); } catch (e) { javac = false; }
  if (!jar || !javac) { t.skip('javac ya da android.jar yok'); return; }
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'lanjava-'));
  const kok = path.join(__dirname, '..', '..', 'android', 'src');
  fs.writeFileSync(path.join(d, 'Deneme.java'), `package com.departures.ingmufredat;
public class Deneme { public static void main(String[] a) throws Exception {
  byte[] k = LanSunucu.anahtar("123456");
  System.out.println(LanSunucu.hex(k));
  System.out.println(LanSunucu.imzaIstek(k, "00112233445566778899aabbccddeeff", "abcdef0123456789", "{\\"a\\":\\"ç\\"}".getBytes("UTF-8")));
  System.out.println(LanSunucu.imzaYanit(k, "00112233445566778899aabbccddeeff", "abcdef0123456789", "{}".getBytes("UTF-8")));
} }`);
  const sinif = path.join(d, 'cls'); fs.mkdirSync(sinif);
  execFileSync('javac', ['-nowarn', '-encoding', 'UTF-8', '-cp', jar, '-d', sinif, path.join(d, 'Deneme.java'), path.join(kok, 'com/departures/ingmufredat/LanSunucu.java'), path.join(kok, 'com/departures/ingmufredat/MainActivity.java'),
    path.join(kok, 'com/departures/ingmufredat/Kopru.java'), path.join(kok, 'com/departures/ingmufredat/Files.java'), path.join(kok, 'com/departures/ingmufredat/UpdateFileProvider.java'),
    path.join(kok, 'com/departuresmil/ortak/ApkPatchInstaller.java'), path.join(kok, 'com/departuresmil/ortak/FcDelta.java'), path.join(d, 'R.java')].filter((f) => !f.endsWith('R.java')).concat(rJava(d)), { stdio: 'pipe' });
  const out = execFileSync('java', ['-cp', sinif + path.delimiter + jar, 'com.departures.ingmufredat.Deneme'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n');
  const k = LAN._ic.anahtar('123456');
  assert.strictEqual(out[0], k.toString('hex'));
  assert.strictEqual(out[1], LAN._ic.imzaIstek(k, '00112233445566778899aabbccddeeff', 'abcdef0123456789', Buffer.from('{"a":"ç"}', 'utf8')));
  assert.strictEqual(out[2], LAN._ic.imzaYanit(k, '00112233445566778899aabbccddeeff', 'abcdef0123456789', Buffer.from('{}')));
});
function rJava(d) {   // aapt2'nin üreteceği R sınıfının en küçük hâli (yalnız derleme için)
  const f = path.join(d, 'R.java');
  fs.writeFileSync(f, 'package com.departures.ingmufredat; public final class R { public static final class drawable { public static final int ic = 0x7f010000; } }');
  return [f];
}
