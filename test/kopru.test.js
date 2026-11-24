// ESKİ KANAL KÖPRÜSÜ uçtan uca: 2.5.1'in GERÇEK kabuğu (kabuk 3, git ad9475f) + 2.5.1 arayüzü, kendi güncelleyicisiyle
// eski kanaldaki paketi (araclar/eski-kanal.js) kurar, yeniden başlar; yeni arayüz eski kabukta açılır, açılış onayını verir
// (bir sonraki açılışta eski arayüze dönülmez), "Yeni kurulum gerekli" penceresini gösterir, kayıtlar yerinde kalır.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { playwright } = require('./yardimci/sunucu.js');
const KOK = path.join(__dirname, '..');
const ESKI = 'ad9475f';   // v2.5.1 (kabuk 3.0.0)

function eskiKabuk(dir) {
  for (const f of ['main.js', 'preload.js', 'lan.js', 'enjekte.js', 'kabuk.json']) fs.writeFileSync(path.join(dir, f), execFileSync('git', ['show', ESKI + ':kabuk/' + f], { cwd: KOK }));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'ingmufredat-sistemi', productName: 'Ing Mufredat Sistemi', version: '3.0.0', main: 'main.js' }));
  fs.writeFileSync(path.join(dir, 'version.json'), JSON.stringify({ version: '2.501' }));
  const ui = path.join(dir, 'ui'); fs.mkdirSync(ui);
  execFileSync('bash', ['-c', `git archive ${ESKI} kaynak | tar -x -C "${dir}" && cp -r "${dir}/kaynak/." "${ui}/" && rm -rf "${dir}/kaynak"`], { cwd: KOK });
}
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
async function baglan(pw, port) {
  process.env.NO_PROXY = process.env.no_proxy = '127.0.0.1,localhost' + (process.env.NO_PROXY ? ',' + process.env.NO_PROXY : '');
  for (let i = 0; i < 60; i++) { try { return await pw.chromium.connectOverCDP('http://127.0.0.1:' + port); } catch (e) { await bekle(500); } }
  throw new Error('CDP bağlanamadı');
}
async function sayfa(b) {
  for (let i = 0; i < 60; i++) { for (const c of b.contexts()) for (const p of c.pages()) if (/^app:\/\/ingmufredat/.test(p.url())) return p; await bekle(500); }
  throw new Error('sayfa yok');
}

test('eski kabuk (2.5.1) kendi güncelleyicisiyle köprü arayüzünü kurar; yeni arayüz açılır ve yeni kuruluma yönlendirir', { timeout: 240000 }, async (t) => {
  let electron; try { electron = require('electron'); } catch (e) { t.skip('electron yok'); return; }
  const pw = playwright();
  try { execFileSync('git', ['cat-file', '-e', ESKI + '^{commit}'], { cwd: KOK, stdio: 'ignore' }); } catch (e) { t.skip('git geçmişinde ' + ESKI + ' yok (fetch-depth: 0)'); return; }
  if (!pw || !fs.existsSync(path.join(KOK, '.derleme', 'www', 'index.html'))) { t.skip('Playwright ya da .derleme/www yok'); return; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ing-kopru-'));
  const app = path.join(tmp, 'app'); fs.mkdirSync(app); eskiKabuk(app);
  const home = path.join(tmp, 'home'); fs.mkdirSync(home);
  const { paketle } = require('../araclar/eski-kanal.js');
  const kopru = paketle({ date: '2026-11-24T00:00:00Z' });
  const port = 9300 + Math.floor(Math.random() * 400);
  // xvfb-run kullanılmaz: eski kabuk app.relaunch() ile yeniden açılır, xvfb-run ilk süreç bitince ekranı kapatırdı
  const kapat = [];
  let display = process.env.DISPLAY;
  if (process.platform === 'linux' && !display) {
    display = ':' + (90 + Math.floor(Math.random() * 100));
    const x = spawn('Xvfb', [display, '-screen', '0', '1400x900x24', '-nolisten', 'tcp'], { stdio: 'ignore', detached: true });
    kapat.push(x); await bekle(1200);
  }
  const cmd = electron;
  const args = [app, '--no-sandbox', '--remote-debugging-port=' + port];
  const env = Object.assign({}, process.env, { HOME: home, XDG_CONFIG_HOME: path.join(home, '.config'), APPDATA: path.join(home, 'AppData') }, display ? { DISPLAY: display } : {});
  const calistir = () => { const c = spawn(cmd, args, { env, stdio: process.env.ING_KOPRU_LOG ? 'inherit' : 'ignore', detached: true }); kapat.push(c); return c; };
  try {
    calistir();
    let b = await baglan(pw, port);
    let p = await sayfa(b);
    await p.waitForFunction(() => window.Updater && window.Store && Store.db, null, { timeout: 30000 });
    // eski arayüzde bir kayıt
    await p.evaluate(() => { const s = Store.addStudent({ name: 'Köprü Öğrencisi' }); Store.persistNow(); return s.id; });
    // eski güncelleyici: raw main'deki paketi indirir (burada yerel olarak verilir), sha256 doğrular, OTA klasörüne yazar
    await p.route(/raw\.githubusercontent\.com\/departures-mil\/ing-mufredat-guncelleme\/main\/paketler\//, (r) => r.fulfill({ status: 200, contentType: 'text/plain', body: kopru.g64, headers: { 'access-control-allow-origin': '*' } }));
    const kuruldu = await p.evaluate(async (latest) => {
      Updater.latest = Object.assign({ src: 'gh' }, latest); Updater.state = 'available';
      await Updater.install(); return Updater.state;
    }, kopru.latest);
    assert.strictEqual(kuruldu, 'ready');
    await p.evaluate(() => { setTimeout(() => Updater.restart(), 10); }).catch(() => {});
    await bekle(2500);
    try { await b.close(); } catch (e) { /* kapandı */ }
    // app.relaunch → yeni süreç aynı hata ayıklama kapısıyla açılır
    b = await baglan(pw, port);
    p = await sayfa(b);
    await p.waitForFunction(() => window.APP_RELEASE && window.FC && document.querySelector('#topbar'), null, { timeout: 30000 });
    await p.waitForFunction(() => document.querySelector('.modal-backdrop .modal h2') && /kurulum/i.test(document.querySelector('.modal-backdrop .modal h2').textContent), null, { timeout: 15000 });
    const r = await p.evaluate(() => ({ v: APP_RELEASE.version, legacy: Platform.legacy, ogr: Object.values(Store.db.students).map((s) => s.name), ek: !!document.getElementById('kbLan') }));
    assert.strictEqual(r.v, require('../package.json').version);
    assert.strictEqual(r.legacy, true);
    assert.ok(r.ogr.includes('Köprü Öğrencisi'), 'kayıt korundu');
    assert.strictEqual(r.ek, false, 'eski enjekte.js düğmeleri eklenmedi');
    await bekle(800);
    const st = JSON.parse(fs.readFileSync(path.join(home, '.config', 'IngMufredatSistemi', 'ota', 'state.json'), 'utf8'));
    assert.strictEqual(st.current, kopru.latest.version);
    assert.strictEqual(st.pending, false, 'açılış onayı verildi (eski arayüze geri dönülmez)');
    try { await b.close(); } catch (e) { /* yoksay */ }
  } finally {
    for (const c of kapat) { try { process.kill(-c.pid, 'SIGKILL'); } catch (e) { /* yoksay */ } }
    try { execFileSync('pkill', ['-f', 'remote-debugging-port=' + port], { stdio: 'ignore' }); } catch (e) { /* yoksay */ }
    await bekle(500);
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* süreç kapanırken yazıyor olabilir */ }
  }
});
