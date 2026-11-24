// Derleme ve yayın tutarlılığı: sürüm tek kaynak, kararlı derleme, dosya listesi, kaldırılan katmanlar, eski kanal köprüsü.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const KOK = path.join(__dirname, '..', '..');
const surum = require('../../araclar/surum.js');
const derle = require('../../araclar/derle.js');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

test('sürüm: semver, surum.js güncel, notlar üç dilde, Android versionCode 3.0.0 APK’sından büyük', () => {
  const v = surum.version();
  assert.match(v, /^\d+\.\d+\.\d+$/);
  assert.strictEqual(oku('kaynak/js/surum.js'), surum.render());
  const n = JSON.parse(oku('release-notes.json'));
  for (const l of ['tr', 'en', 'ar']) assert.ok(n[l] && n[l].length > 20, l);
  assert.ok(surum.versionCode(v) > 30000);
  assert.strictEqual(surum.compat('3.1.0'), '3.100');
  assert.strictEqual(surum.compat('3.1.12'), '3.112');
});

test('dosyalar.json: kaynak/js altındaki her betik listede (docx-adlari hariç), liste sırası temel → arayüz → kabuk', () => {
  const liste = derle.sirali();
  const hepsi = [];
  const gez = (d, r) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n), rr = r + '/' + n; if (fs.statSync(p).isDirectory()) gez(p, rr); else if (n.endsWith('.js')) hepsi.push(rr.slice(1)); } };
  gez(path.join(KOK, 'kaynak'), '');
  const disarida = hepsi.filter((f) => !liste.includes(f) && !f.startsWith('cekirdek/') && !f.startsWith('vendor/') && f !== 'js/temel/docx-adlari.js');
  assert.deepStrictEqual(disarida, []);
  liste.forEach((f) => assert.ok(fs.existsSync(path.join(KOK, 'kaynak', f)), f));
  assert.strictEqual(liste[liste.length - 1], 'js/uygulama/kabuk.js');
  assert.ok(liste.indexOf('js/temel/platform.js') < liste.indexOf('js/temel/store.js'));
});

test('kaldırılan yama katmanları ve İHA kalıntıları kodda yok', () => {
  const kod = derle.birlesik();
  for (const x of ['window.Updater', 'IndirmeIlerleme', 'window.V24', 'Kullanim.baslat', 'Duyuru.baslat', 'Contact.cardHtml', 'UPD_KEYS', 'nacl.']) assert.ok(!kod.includes(x), x);
  const iha = kod.split('\n').filter((l) => /iha-mufredat|iha_open/.test(l) && !/ESKI_NS|VARSAYILAN_KURUM|getItem\('iha_open|Store.local.sync.ns|eski kurulumlar|daha önce kurmuş/.test(l));
  assert.deepStrictEqual(iha, []);
  assert.ok(!fs.existsSync(path.join(KOK, 'kabuk')), 'eski kabuk kaynağı kaldırıldı');
  assert.ok(!fs.existsSync(path.join(KOK, 'kurulum')), 'ikili kurulum dosyaları depoda değil');
});

test('kurum kuralları firebase/kurum.rules ile aynı; çekirdek sürümü yazılı', () => {
  assert.ok(oku('kaynak/js/temel/kurum-rules.js').includes(JSON.stringify(oku('firebase/kurum.rules').replace(/\r\n/g, '\n'))));
  assert.match(oku('kaynak/cekirdek/VERSION'), /^ortak-cekirdek [0-9a-f]{40}/);
  assert.strictEqual(oku('masaustu/cekirdek/VERSION'), oku('kaynak/cekirdek/VERSION'));
  assert.ok(oku('kaynak/cekirdek/fc-core.js').includes('h.update.run'), 'Android yerel güncelleme eki');
});

test('derleme kararlı (aynı kaynak → aynı bayt) ve index tek uygulama dosyası yükler', () => {
  const a = fs.mkdtempSync(path.join(os.tmpdir(), 'ing-a-'));
  const h = () => crypto.createHash('sha256').update(derle.birlesik()).digest('hex');
  assert.strictEqual(h(), h());
  const html = derle.indexHtml();
  assert.ok(html.includes('<script src="js/uygulama.js"></script>'));
  assert.ok(!html.includes('UYGULAMA'));
  assert.ok(html.indexOf('cekirdek/fc-core.js') < html.indexOf('js/uygulama.js'));
  fs.rmSync(a, { recursive: true, force: true });
});

test('electron-builder: kurulum kullanıcı başına, appId/productName/veri klasörü değişmez', () => {
  const p = JSON.parse(oku('package.json'));
  assert.strictEqual(p.build.appId, 'com.departures.ingmufredat');
  assert.strictEqual(p.build.productName, 'Ing Mufredat Sistemi');
  assert.strictEqual(p.build.nsis.perMachine, false);
  assert.strictEqual(p.build.nsis.oneClick, true);
  assert.strictEqual(p.build.nsis.deleteAppDataOnUninstall, false);
  assert.deepStrictEqual(p.build.win.target.map((x) => x.target), ['nsis']);
  const main = oku('masaustu/main.js');
  assert.ok(main.includes("path.join(app.getPath('appData'), 'IngMufredatSistemi')"));
  assert.ok(main.includes("app://ingmufredat/index.html"));
  assert.ok(main.includes("scheme: 'app', privileges: { standard: true, secure: true"));
  assert.ok(oku('masaustu/kurulum/kurulum.nsh').includes('RMDir /r "$INSTDIR\\resources\\app"'));
  const man = oku('android/AndroidManifest.xml');
  assert.ok(man.includes('package="com.departures.ingmufredat"'));
  assert.ok(oku('android/src/com/departures/ingmufredat/MainActivity.java').includes('static final String HOST = "ing.local";'));
});

test('eski kanal köprüsü: kabuk 2–3 güncelleyicisinin göreceği biçim', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ing-www-'));
  fs.writeFileSync(path.join(tmp, 'index.html'), '<!doctype html>'); fs.mkdirSync(path.join(tmp, 'js')); fs.writeFileSync(path.join(tmp, 'js', 'a.js'), '1');
  fs.mkdirSync(path.join(tmp, 'vendor', 'ocr'), { recursive: true }); fs.writeFileSync(path.join(tmp, 'vendor', 'ocr', 'buyuk.js'), 'x');
  const { paketle } = require('../../araclar/eski-kanal.js');
  const r = paketle({ www: tmp, date: '2026-11-24T00:00:00Z' });
  const m = r.latest;
  // eski arayüzün updater.js'i: vnum karşılaştırması ("ana.ikincilYAMA")
  const vnum = (v) => { const p = String(v || '0').replace(/^v/i, '').split('.'); const a = parseInt(p[0], 10) || 0; let mi = 0, pa = 0; if (p.length >= 3) { mi = +p[1]; pa = +p[2]; } else if (p[1] != null) { const b = String(p[1]); if (b.length >= 3) { mi = parseInt(b.slice(0, -2), 10) || 0; pa = parseInt(b.slice(-2), 10) || 0; } else mi = parseInt(b, 10) || 0; } return a * 1e6 + mi * 1e3 + pa; };
  assert.ok(vnum(m.version) > vnum('2.501'));
  // eski masaüstü/Android kabuğu: a*1000+b
  const kabukVnum = (v) => { const [a, b] = String(v).split('.').map((x) => parseInt(x, 10) || 0); return a * 1000 + b; };
  assert.ok(kabukVnum(m.version) > kabukVnum('2.501'));
  assert.match(m.version, /^\d+\.\d+$/);
  assert.ok(m.minShell <= 2);
  assert.strictEqual(m.file, 'paketler/ing_3_100.b64'.replace('3_100', m.version.replace('.', '_')));
  const gz = Buffer.from(r.g64, 'base64');
  assert.strictEqual(crypto.createHash('sha256').update(gz).digest('hex'), m.sha256);
  const b = JSON.parse(zlib.gunzipSync(gz).toString('utf8'));
  assert.strictEqual(b.version, m.version);
  assert.ok(b.files['index.html'] && b.files['js/a.js']);
  assert.ok(!Object.keys(b.files).some((f) => f.startsWith('vendor/ocr/')), 'OCR köprüde yok');
  fs.rmSync(tmp, { recursive: true, force: true });
});
