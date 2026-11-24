// Arayüz testleri (Playwright Chromium, derlenmiş .derleme/www): açılış, eski verinin taşınması, ayarlar düzeni, üst çubuk,
// Arapça (RTL), eski kabuk köprüsü (masaüstü + Android), Wi‑Fi penceresi, güncelleme bildirimi, çevrimdışı OCR.
// PLAYWRIGHT_CORE=/opt/npm-tools/node_modules/playwright-core PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { baslat, playwright } = require('./yardimci/sunucu.js');
const WWW = path.join(__dirname, '..', '.derleme', 'www');
const pw = playwright();
const atla = !pw || !fs.existsSync(path.join(WWW, 'index.html'));
if (atla && process.env.ING_ARAYUZ_ZORUNLU) throw new Error('Playwright ya da .derleme/www yok (CI\'da arayüz testleri atlanamaz)');

let sunucu, tarayici;
test.before(async () => { if (atla) return; sunucu = await baslat(WWW); tarayici = await pw.chromium.launch(); });
test.after(async () => { if (tarayici) await tarayici.close(); if (sunucu) sunucu.s.close(); });

async function sayfa(o) {
  o = o || {};
  const ctx = await tarayici.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.hatalar = [];
  p.on('pageerror', (e) => p.hatalar.push(e.message));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => {
    const u = r.request().url();
    if (o.latest && /\/releases\/latest\/download\/latest\.json/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o.latest), headers: { 'access-control-allow-origin': '*' } });
    return r.fulfill({ status: 404, body: '', headers: { 'access-control-allow-origin': '*' } });
  });
  if (o.init) await p.addInitScript(o.init, o.initArg);
  await p.goto(sunucu.url);
  await p.waitForFunction(() => window.FC && window.Store && Store.db && document.querySelector('#topbar .topbar-actions'), null, { timeout: 20000 });
  return p;
}

test('ilk açılış: rehber açılır, Falcon şeması, hata yok', { skip: atla }, async () => {
  const p = await sayfa();
  await p.waitForSelector('.modal-backdrop .modal', { timeout: 5000 });
  const r = await p.evaluate(() => ({ scheme: document.documentElement.dataset.scheme, legacy: Platform.legacy, nav: document.querySelectorAll('#nav .nav-item').length, v: APP_RELEASE.version, ns: Store.local.sync.ns || null }));
  assert.strictEqual(r.scheme, 'falcon');
  assert.strictEqual(r.legacy, false);
  assert.ok(r.nav >= 12);
  assert.deepStrictEqual(p.hatalar, []);
  await p.context().close();
});

test('eski kullanıcı: kayıtlar, dil ve tema korunur; klasik görünümle açılır; rehber yerine "neler yeni"', { skip: atla }, async () => {
  const db = { schema: 1, students: { s1: { id: 's1', name: 'Ayşe Yılmaz', program: 'genel', marks: {}, updatedAt: 5 } }, config: { institution: { name: 'Deneme Okulu' } } };
  const p = await sayfa({ init: (a) => { if (!localStorage.getItem('ingmufredat_db_v1')) { localStorage.setItem('ingmufredat_db_v1', a.db); localStorage.setItem('ingmufredat_local_v1', JSON.stringify({ lang: 'en', deviceId: 'd1', lastRunVer: '2.5.1', ui: { theme: 'light', errRep: false } })); } }, initArg: { db: JSON.stringify(db) } });
  await p.waitForSelector('.modal-backdrop .modal', { timeout: 5000 });
  const r = await p.evaluate(() => ({ ad: Store.db.students.s1.name, kurum: Store.db.config.institution.name, lang: document.documentElement.lang, scheme: document.documentElement.dataset.scheme,
    light: document.documentElement.classList.contains('theme-light'), crash: FC.storage.get('crash.enabled', true), modal: document.querySelector('.modal-backdrop .modal h2').textContent }));
  assert.strictEqual(r.ad, 'Ayşe Yılmaz');
  assert.strictEqual(r.kurum, 'Deneme Okulu');
  assert.strictEqual(r.lang, 'en');
  assert.strictEqual(r.scheme, 'klasik');
  assert.strictEqual(r.light, true);
  assert.strictEqual(r.crash, false);
  assert.match(r.modal, /new|3\.1/i);
  assert.deepStrictEqual(p.hatalar, []);
  await p.context().close();
});

test('Ayarlar: Görünüm ilk, Admin ile iletişim EN SON; Wi‑Fi, arşiv, yapay zeka kartları var', { skip: atla }, async () => {
  const p = await sayfa({ init: () => localStorage.setItem('fc.onboarding.done', 'true') });
  await p.evaluate(() => UI.go('settings'));
  await p.waitForSelector('.settings-grid [data-fc-card="contact"]');
  const s = await p.evaluate(() => [...document.querySelectorAll('.settings-grid > *')].map((c) => c.getAttribute('data-fc-card') || c.id || c.className));
  assert.strictEqual(s[0], 'look');
  assert.strictEqual(s[s.length - 1], 'contact');
  for (const k of ['lan', 'arsiv', 'ai', 'sync', 'kurumUye', 'cakisma', 'kisayol', 'agent', 'usage', 'crash', 'about']) assert.ok(s.includes(k), k + ' yok: ' + s.join(','));
  assert.ok(s.indexOf('about') < s.indexOf('contact'));
  // üst çubuk sırası: Eşitle · Wi‑Fi · Güncelle · tema · dil
  const tb = await p.evaluate(() => [...document.querySelectorAll('#topbar .topbar-actions > *')].map((b) => ((b.matches('.top-act-wrap') && b.querySelector('button') ? b.querySelector('button').className : b.className) || '').split(' ').filter((c) => /sync-act|lan-act|update-act|theme|lang-switch|win-controls|agent/.test(c)).join('.')).filter(Boolean));
  const i = (re) => tb.findIndex((x) => re.test(x));
  assert.ok(i(/sync-act/) >= 0 && i(/sync-act/) < i(/lan-act/) && i(/lan-act/) < i(/update-act/) && i(/update-act/) < i(/theme/) && i(/theme/) < i(/lang-switch/), tb.join(' | '));
  assert.deepStrictEqual(p.hatalar, []);
  await p.context().close();
});

test('arşiv: silinen öğrenci kaybolmaz, Ayarlar → Arşiv’den geri alınır', { skip: atla }, async () => {
  const p = await sayfa({ init: () => localStorage.setItem('fc.onboarding.done', 'true') });
  await p.evaluate(() => { const s = Store.addStudent({ name: 'Silinecek Öğrenci' }); Store.deleteStudent(s.id); window.__sid = s.id; UI.go('settings'); });
  await p.waitForSelector('#arsiv [data-arsiv]');
  await p.click('#arsiv [data-arsiv]');
  const r = await p.evaluate(() => ({ silindi: Store.db.students[window.__sid].deleted, gorunur: Store.students().some((s) => s.id === window.__sid) }));
  assert.strictEqual(r.silindi, false);
  assert.strictEqual(r.gorunur, true);
  await p.context().close();
});

test('Arapça: sağdan sola, Arapça yazı tipi', { skip: atla }, async () => {
  const p = await sayfa({ init: () => { localStorage.setItem('fc.onboarding.done', 'true'); localStorage.setItem('ingmufredat_local_v1', JSON.stringify({ lang: 'ar', deviceId: 'd', ui: {} })); } });
  const r = await p.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang, fc: FC.i18n.lang(), font: getComputedStyle(document.body).fontFamily }));
  assert.strictEqual(r.dir, 'rtl'); assert.strictEqual(r.lang, 'ar'); assert.strictEqual(r.fc, 'ar');
  assert.match(r.font, /Noto Sans Arabic/);
  await p.context().close();
});

test('eski masaüstü kabuğu (kabuk 3): açılış onayı verilir, "Yeni kurulum gerekli" penceresi', { skip: atla }, async () => {
  const p = await sayfa({ init: () => {
    localStorage.setItem('fc.onboarding.done', 'true');
    window.__bootOk = 0; window.__acilan = [];
    window.desktop = { saveDb: async () => true, loadDb: async () => null, saveFile: async () => null, openFile: async () => true, openUrl: async (u) => { window.__acilan.push(u); }, print: async () => true, savePdf: async () => null,
      toggleFullscreen: async () => true, isFullscreen: async () => true, onFullscreen() {}, httpGet: async () => { throw new Error('yok'); }, openBackupFolder: async () => true, quit() {}, minimize() {},
      lan: { start() {}, stop() {}, state: async () => ({}), discover: async () => [], sync() {} },
      ota: { info: async () => ({ shell: 3 }), bootOk: async () => { window.__bootOk++; return true; }, begin() {}, write() {}, commit() {}, restart() {} } };
  } });
  await p.waitForFunction(() => document.querySelector('.modal-backdrop .modal h2') && /kurulum/i.test(document.querySelector('.modal-backdrop .modal h2').textContent), null, { timeout: 8000 });
  const r = await p.evaluate(() => ({ legacy: Platform.legacy, bootOk: window.__bootOk, ek: window.__kabukEk, lan: Lan.var() }));
  assert.strictEqual(r.legacy, true);
  assert.strictEqual(r.bootOk, 1, 'eski kabuk bir sonraki açılışta eski arayüze dönmesin');
  assert.strictEqual(r.ek, true, 'eski enjekte.js düğme eklemesin');
  assert.strictEqual(r.lan, false, 'eski Wi‑Fi protokolü kapalı');
  await p.click('.modal-backdrop .modal-footer .btn.primary');
  await p.waitForFunction(() => window.__acilan.length > 0);
  assert.match(await p.evaluate(() => window.__acilan[0]), /github\.com\/departures-mil\/ing-mufredat-guncelleme\/releases/);
  await p.context().close();
});

test('eski Android kabuğu (3.0.0): "Yeni uygulama sürümü gerekli"', { skip: atla }, async () => {
  const p = await sayfa({ init: () => {
    localStorage.setItem('fc.onboarding.done', 'true');
    window.__bootOk = 0;
    window.AndroidBridge = { saveDb() {}, loadDb: () => null, saveFile: () => 'x', openFile: () => 'OK', printHtml() {}, httpGet: () => null, openUrl() {}, exitApp() {}, minimize() {},
      otaInfo: () => '{"shell":3}', otaBootOk: () => { window.__bootOk++; }, otaBegin() {}, otaWrite() {}, otaCommit() {}, otaRestart() {} };
  } });
  await p.waitForFunction(() => document.querySelector('.modal-backdrop .modal h2') && /APK|uygulama/i.test(document.querySelector('.modal-backdrop .modal').textContent), null, { timeout: 8000 });
  assert.strictEqual(await p.evaluate(() => window.__bootOk), 1);
  await p.context().close();
});

test('Wi‑Fi penceresi: bekleyen cihazın adresi ve kodu görünür; yanlış kod anlaşılır hata verir', { skip: atla }, async () => {
  const p = await sayfa({ init: () => {
    localStorage.setItem('fc.onboarding.done', 'true');
    let acik = false;
    window.fcHost = { kind: 'electron', platform: 'win32', version: '3.1.0', window: {}, update: { channel: 'win-app' }, net: null };
    window.desktop = { saveDb: async () => true, loadDb: async () => null, openUrl: async () => {}, quit() {}, onFullscreen() {}, isFullscreen: async () => true,
      lan: { v: 2, start: async () => { acik = true; return {}; }, stop: async () => { acik = false; }, state: async () => (acik ? { hosting: true, pin: '482915', ips: ['192.168.1.20'] } : { hosting: false, ips: ['192.168.1.20'] }),
        discover: async () => [{ host: '192.168.1.30', ad: 'Öğretmen PC' }], sync: async () => ({ ok: false, error: 'pin' }) } };
  } });
  await p.click('#topbar .lan-act');
  await p.waitForSelector('#lanStart');
  await p.click('#lanStart');
  await p.waitForFunction(() => /482915/.test(document.querySelector('#lanHostBox').textContent));
  await p.click('#lanFind');
  await p.waitForFunction(() => document.querySelector('#lanIp').value === '192.168.1.30');
  await p.fill('#lanPin', '111111');
  await p.click('#lanGo');
  await p.waitForFunction(() => /yanlış|wrong/i.test(document.querySelector('#lanOut').textContent));
  await p.context().close();
});

test('güncelleme: latest.json yeni sürüm gösterirse üst çubuk bildirir (tarayıcıda indirme sayfası)', { skip: atla }, async () => {
  const latest = { schema: 1, app: 'ing-mufredat', version: '9.9.9', notes: { tr: 'yeni', en: 'new', ar: 'جديد' }, minVersion: '3.0.0', assets: { 'win-app': { file: 'a.asar', size: 10, sha256: '0'.repeat(64) }, web: { file: 'a.zip', size: 10, sha256: '0'.repeat(64) } } };
  const p = await sayfa({ latest, init: () => localStorage.setItem('fc.onboarding.done', 'true') });
  await p.evaluate(() => FC.updater.check());
  const st = await p.evaluate(() => FC.updater.state());
  assert.strictEqual(st.status, 'available');
  assert.strictEqual(st.plan.version, '9.9.9');
  await p.context().close();
});

test('çevrimdışı yazı tanıma (Tesseract) pakette ve çalışıyor', { skip: atla, timeout: 120000 }, async () => {
  const p = await sayfa({ init: () => localStorage.setItem('fc.onboarding.done', 'true') });
  const metin = await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 900; c.height = 160; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000'; g.font = '64px serif'; g.fillText('Curriculum test', 30, 105);
    if (!OCR.available()) return 'YOK';
    return OCR.text(c, () => {});
  });
  assert.match(String(metin), /curriculum/i);
  await p.context().close();
});
