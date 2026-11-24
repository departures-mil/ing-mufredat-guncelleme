// Kabuk üzerinden GET yalnız izinli adreslere (arayüz, masaüstü ve Android aynı liste); eşitleme ad alanı geri uyumlu.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { baglam, yukle, bellek } = require('../yardimci/yukle.js');
const KOK = path.join(__dirname, '..', '..');

test('izin listesi: arayüz = masaüstü = Android', () => {
  const js = fs.readFileSync(path.join(KOK, 'kaynak/js/temel/platform.js'), 'utf8').match(/const HTTP_IZIN = \/(.+)\/;/)[1];
  const mainJs = fs.readFileSync(path.join(KOK, 'masaustu/main.js'), 'utf8').match(/const HTTP_IZIN = \/(.+)\/;/)[1];
  const java = fs.readFileSync(path.join(KOK, 'android/src/com/departures/ingmufredat/Kopru.java'), 'utf8').match(/Pattern\.compile\("\^(.+)\.\*"\)/)[1].replace(/\\\\/g, '\\');
  const norm = (r) => r.replace(/\\\//g, '/').replace(/^\^/, '');
  assert.strictEqual(norm(mainJs), norm(js));
  assert.strictEqual(norm(java), norm(js));
});

test('Platform.httpGet izinsiz adresi reddeder', async () => {
  const c = baglam(); c.APP_RELEASE = { version: '3.1.0', compat: '3.100' };
  let cagri = 0; c.AndroidBridge = { httpGet: () => { cagri++; return 'x'; }, apkUpdate() {} }; c.fetch = async () => { throw new Error('ağ'); };
  yukle(c, ['js/temel/platform.js']);
  await assert.rejects(c.Platform.httpGet('https://kotu.example/veri'), /izin/);
  await assert.rejects(c.Platform.httpGet('http://192.168.1.5:47851/'), /izin/);
  assert.strictEqual(cagri, 0);
  assert.strictEqual(await c.Platform.httpGet('https://translate.googleapis.com/translate_a/single?client=gtx&q=a'), 'x');
  assert.strictEqual(c.Platform.legacy, false);
  assert.strictEqual(c.Platform.semver, '3.1.0');
});

test('eski kabuk tanınır (fcHost yok / apkUpdate yok)', () => {
  const c1 = baglam(); c1.desktop = { ota: {} }; yukle(c1, ['js/temel/platform.js']); assert.strictEqual(c1.Platform.legacy, true);
  const c2 = baglam(); c2.desktop = {}; c2.fcHost = {}; yukle(c2, ['js/temel/platform.js']); assert.strictEqual(c2.Platform.legacy, false);
  const c3 = baglam(); c3.AndroidBridge = { otaInfo() {} }; yukle(c3, ['js/temel/platform.js']); assert.strictEqual(c3.Platform.legacy, true);
});

test('eşitleme ad alanı: eşitlemesi kurulu cihaz "iha-mufredat"ta kalır, yeni cihaz "ing-mufredat"', () => {
  const kur = (sync) => { const c = baglam({ localStorage: bellek() }); c.Store = { local: { sync, deviceId: 'd' }, saveLocal() {} }; yukle(c, ['js/temel/sync.js']); return c; };
  const eski = kur({ config: { projectId: 'p' }, workspace: 'okul', enabled: true });
  assert.strictEqual(eski.Sync.ns(), 'iha-mufredat');
  assert.strictEqual(eski.Store.local.sync.ns, 'iha-mufredat');
  const yeni = kur({ config: null, workspace: '', enabled: false });
  assert.strictEqual(yeni.Sync.ns(), 'ing-mufredat');
  const kayitli = kur({ ns: 'iha-mufredat' });
  assert.strictEqual(kayitli.Sync.ns(), 'iha-mufredat');
  // paylaşım bağlantısı eski cihazlarla uyumlu kalır
  assert.ok(eski.Sync.makeLink().startsWith('IHAMS1:'));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(eski.Sync.readLink(eski.Sync.makeLink()))), { c: { projectId: 'p' }, w: 'okul' });
});
