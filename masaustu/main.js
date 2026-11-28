/* İngilizce Müfredat Sistemi — masaüstü ana süreç (Electron, kabuk 3.1).
   Ortak çekirdek (cekirdek/fc-electron-main.js): çerçevesiz pencere, her açılışta tam ekran, pencere düğmeleri
   (Küçült · Orta · Tam ekran · Kapat), GitHub Releases güncellemesi (app.asar yaması, olmazsa tam dosya; minVersion altı → win-setup),
   ana süreç hata raporu. Burada uygulamaya özgü işler kalır: kayıt dosyası + günlük yedek, dosya kaydet/aç, yazdır/PDF,
   izinli adreslere GET, Wi‑Fi eşitleme sunucusu (lan-sunucu.js).

   KAYITLAR ASLA KAYBOLMAZ:
   - Veri klasörü %APPDATA%\IngMufredatSistemi (kabuk 1–3 ile aynı). Arayüzün localStorage/IndexedDB'si bu klasörde,
     app://ingmufredat kökeninde durur — klasör adı, uygulama adı ve köken DEĞİŞMEZ.
   - Kayıtlar ayrıca veri\db.json'a atomik yazılır (.tmp → yeniden adlandırma, önceki .bak), her gün yedekler\yedek_GG.json (son 30).
   - Eski kabuğun uygulama içi güncelleme klasörü (ota\) yalnız arayüz paketleri içerir; ilk açılışta temizlenir. */
'use strict';
const { app, BrowserWindow, protocol, ipcMain, dialog, shell, net, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');
const fc = require('./cekirdek/fc-electron-main');

const VERSION = require('./package.json').version;
const TITLE = 'İngilizce Müfredat Sistemi';
const SMOKE = !!process.env.ING_SMOKE;
app.setName('Ing Mufredat Sistemi');
app.setPath('userData', process.env.ING_VERI || path.join(app.getPath('appData'), 'IngMufredatSistemi'));
if (process.platform === 'win32') app.setAppUserModelId('com.departures.ingmufredat');
const DATA_DIR = app.getPath('userData');
const DB_FILE = path.join(DATA_DIR, 'veri', 'db.json');
const BK_DIR = path.join(DATA_DIR, 'yedekler');
const UI_DIR = path.join(__dirname, 'www');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
const gotLock = SMOKE || app.requestSingleInstanceLock();
if (!gotLock) app.quit();
let win = null;
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });

const ensureDir = (d) => fs.mkdirSync(d, { recursive: true });
function writeSafe(file, text) {
  ensureDir(path.dirname(file));
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, text, 'utf8');
  if (fs.existsSync(file)) { try { fs.copyFileSync(file, file + '.bak'); } catch (e) { /* önemli değil */ } }
  fs.renameSync(tmp, file);
}
function dailyBackup(json) {
  try {
    ensureDir(BK_DIR);
    const f = path.join(BK_DIR, 'yedek_' + new Date().toISOString().slice(0, 10) + '.json');
    if (fs.existsSync(f)) return;
    fs.writeFileSync(f, json, 'utf8');
    const all = fs.readdirSync(BK_DIR).filter((x) => /^yedek_.*\.json$/.test(x)).sort();
    while (all.length > 30) fs.unlinkSync(path.join(BK_DIR, all.shift()));
  } catch (e) { console.error('yedek', e); }
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.gz': 'application/gzip', '.txt': 'text/plain; charset=utf-8' };
/* Kabuk üzerinden GET yalnız bu adreslere (arayüz platform.js ile aynı liste) */
const HTTP_IZIN = /^https:\/\/(translate\.googleapis\.com\/translate_a\/single\?|raw\.githubusercontent\.com\/departures-mil\/|api\.github\.com\/repos\/departures-mil\/|github\.com\/departures-mil\/ing-mufredat-guncelleme\/releases\/)/;

function createWindow() {
  win = new BrowserWindow(fc.windowOptions({
    minWidth: 900, minHeight: 600, title: TITLE + ' v' + VERSION, backgroundColor: '#0b1120',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false },
  }));
  Menu.setApplicationMenu(null);
  fc.install(win, { channel: 'win-app', setupChannel: 'win-setup' });
  win.on('page-title-updated', (e) => e.preventDefault());
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.type === 'keyDown' && input.key === 'F12' && input.control && input.shift) win.webContents.toggleDevTools();
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://ingmufredat/')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); } });
  const sendFs = () => { if (win && !win.isDestroyed()) win.webContents.send('fs-changed', win.isFullScreen()); };
  win.on('enter-full-screen', sendFs); win.on('leave-full-screen', sendFs);
  win.loadURL('app://ingmufredat/index.html');
  if (SMOKE) smoke();
}

/* Electron açılış testi (test/electron.test.js, CI windows duman testi): pencere yüklendi mi, çekirdek ve arayüz başladı mı? */
function smoke() {
  const out = (o) => { const l = 'ING_SMOKE ' + JSON.stringify(o) + '\n'; try { process.stdout.write(l); } catch (e) { /* konsolsuz */ } if (process.env.ING_SMOKE_OUT) { try { fs.writeFileSync(process.env.ING_SMOKE_OUT, l); } catch (e) { /* yoksay */ } } };
  const consoleErrors = [];
  win.webContents.on('console-message', (_e, level, message) => { if (level >= 3) consoleErrors.push(String(message).slice(0, 300)); });
  const fail = setTimeout(() => { out({ ok: false, error: 'timeout' }); app.exit(2); }, 90000);
  win.webContents.on('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const r = await win.webContents.executeJavaScript(`({
          fc: !!(window.FC && FC.updater && FC.topbar && FC.settings), host: window.FC && FC.host.kind, fcHost: !!window.fcHost,
          legacy: !!(window.Platform && Platform.legacy), version: window.APP_RELEASE && APP_RELEASE.version,
          topbar: !!document.querySelector('#topbar .topbar-actions'), winBtns: document.querySelectorAll('#topbar .win-controls button').length,
          nav: document.querySelectorAll('#nav .nav-item').length, scheme: document.documentElement.dataset.scheme,
          lan: !!(window.Lan && Lan.var()), store: !!(window.Store && Store.db && Store.db.curriculum),
          ogrenciler: window.Store && Store.db ? Object.values(Store.db.students || {}).map((s) => s.name) : [],
          ayarSirasi: (UI.go('settings'), [...document.querySelectorAll('.settings-grid > [data-fc-card], .settings-grid > .card')].map((c) => c.getAttribute('data-fc-card') || c.id || '')),
          yerelZeka: !!window.fcYerelZeka && !!document.querySelector('#yzKart .fcyz-card'),
          errors: (window.__ingErrors || []).slice(0, 5)
        })`);
        r.fullscreen = win.isFullScreen();
        r.appVersion = VERSION;
        r.userData = DATA_DIR;
        r.errors = r.errors.concat(consoleErrors.filter((m) => !/net::|Failed to load resource|ERR_|firestore|Firebase|github/i.test(m)));
        clearTimeout(fail);
        out(Object.assign({ ok: r.fc && r.host === 'electron' && r.topbar && r.nav > 0 && r.store && !r.legacy && !r.errors.length }, r));
        app.exit(0);
      } catch (e) { out({ ok: false, error: String((e && e.message) || e) }); app.exit(3); }
    }, 4000);
  });
}

/* Eski kurulumdan kalanlar (yalnız program dosyaları ve kısayol adları; kayıtlara dokunulmaz) */
function eskiTemizle() {
  try { fs.rmSync(path.join(DATA_DIR, 'ota'), { recursive: true, force: true }); } catch (e) { /* yoksay */ }
  if (process.platform !== 'win32' || !app.isPackaged) return;
  const base = 'İngilizce Müfredat Sistemi';
  // kabuk 2–3 kısayolları "… vX.Y.lnk" adıyla durur; yeni kurulumun kısayolu varsa sürüm adlı eskiler kaldırılır
  for (const d of [app.getPath('desktop'), path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs'), path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', base)]) {
    try {
      const list = fs.readdirSync(d);
      if (!list.includes(base + '.lnk')) continue;
      for (const f of list) if (f.startsWith(base + ' v') && f.endsWith('.lnk')) { try { fs.unlinkSync(path.join(d, f)); } catch (e) { /* yoksay */ } }
    } catch (e) { /* klasör yok */ }
  }
  // kabuk 3'ün yazdığı, kaldırıcısı olmayan "Programlar" kaydı
  try {
    const { execFile } = require('child_process');
    const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\IngMufredatSistemi';
    execFile('reg', ['query', key, '/v', 'UninstallString'], (err) => { if (err) execFile('reg', ['delete', key, '/f'], () => {}); });
  } catch (e) { /* yoksay */ }
}

app.whenReady().then(() => {
  if (!gotLock) return;
  protocol.handle('app', (req) => {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === '/' || !p) p = '/index.html';
    const file = path.normalize(path.join(UI_DIR, p));
    if (!file.startsWith(UI_DIR + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return new Response('Not found', { status: 404 });
    return new Response(fs.readFileSync(file), { headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' } });
  });

  ipcMain.handle('db:save', (e, json) => { if (typeof json !== 'string') return false; writeSafe(DB_FILE, json); dailyBackup(json); return true; });
  ipcMain.handle('db:load', () => { for (const f of [DB_FILE, DB_FILE + '.bak']) { try { if (fs.existsSync(f)) { const s = fs.readFileSync(f, 'utf8'); JSON.parse(s); return s; } } catch (e) { /* sonraki */ } } return null; });
  ipcMain.handle('win:toggleFs', () => { const v = !win.isFullScreen(); win.setFullScreen(v); return v; });
  ipcMain.handle('win:isFs', () => win.isFullScreen());
  ipcMain.handle('win:minimize', () => { win.minimize(); return true; });
  ipcMain.handle('file:save', async (e, name, b64) => {
    const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), String(name)) });
    if (r.canceled || !r.filePath) return null;
    fs.writeFileSync(r.filePath, Buffer.from(String(b64), 'base64'));
    shell.showItemInFolder(r.filePath);
    return r.filePath;
  });
  ipcMain.handle('file:open', async (e, name, b64) => {
    const dir = path.join(os.tmpdir(), 'IngMufredat'); ensureDir(dir);
    const f = path.join(dir, String(name).replace(/[\\/:*?"<>|]+/g, '_'));
    if (/\.(exe|bat|cmd|com|scr|ps1|vbs|js|msi|lnk|hta)$/i.test(f)) return 'izin yok';   // belge açar, program çalıştırmaz
    fs.writeFileSync(f, Buffer.from(String(b64), 'base64'));
    const err = await shell.openPath(f); return err || true;
  });
  ipcMain.handle('url:open', (e, url) => { if (/^https?:\/\//i.test(String(url))) shell.openExternal(String(url)); return true; });
  ipcMain.handle('http:get', async (e, url) => {
    if (!HTTP_IZIN.test(String(url))) throw new Error('izin yok');
    const r = await net.fetch(String(url), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.text();
  });
  ipcMain.handle('backup:open', () => { ensureDir(BK_DIR); shell.openPath(BK_DIR); return true; });
  ipcMain.handle('app:quit', () => app.quit());

  // ---- Wi‑Fi eşitleme: taşıma burada (HMAC imzalı), birleştirme arayüzde (window.__ingLanIn)
  // Çevrimdışı yapay zekâ (OCR + çeviri): paketler kullanıcı klasörüne bir kez iner (ortak çekirdek web/yerel-zeka)
  try { require('./cekirdek/yerel-zeka/fc-yerel-zeka-main').install({ app, ipcMain }); } catch (e) { console.error('yerel-zeka', e); }
  const LAN = require('./lan-sunucu');
  const gelen = async (metin) => {
    const s = await win.webContents.executeJavaScript('window.__ingLanIn ? window.__ingLanIn(' + JSON.stringify(metin) + ') : null');
    if (!s) throw new Error('arayüz hazır değil');
    return s;
  };
  ipcMain.handle('lan:start', async () => { try { return { ok: true, data: await LAN.baslat(gelen, { ad: os.hostname() }) }; } catch (err) { return { ok: false, error: String(err.code || err.message || err) }; } });
  ipcMain.handle('lan:stop', () => { LAN.durdur(); return true; });
  ipcMain.handle('lan:state', () => LAN.durum());
  ipcMain.handle('lan:discover', () => LAN.bul());
  ipcMain.handle('lan:sync', async (e, host, pin, json) => {
    try { return { ok: true, data: await LAN.esitle(host, pin, String(json)) }; } catch (err) { return { ok: false, error: String(err.code || err.message || err) }; }
  });

  // ---- yazdırma / PDF (gizli pencere, geçici dosya)
  const renderHidden = async (html) => {
    const tmp = path.join(os.tmpdir(), 'ing_yazdir_' + Date.now() + '.html');
    fs.writeFileSync(tmp, String(html), 'utf8');
    const w = new BrowserWindow({ show: false, webPreferences: { offscreen: false, javascript: false } });
    await w.loadURL(pathToFileURL(tmp).href);
    await new Promise((r) => setTimeout(r, 400));
    return { w, tmp };
  };
  ipcMain.handle('print:html', async (e, html, o) => {
    const { w, tmp } = await renderHidden(html);
    return new Promise((res) => {
      w.webContents.print({ printBackground: true, landscape: !!(o && o.landscape) }, (ok, reason) => { try { w.destroy(); fs.unlinkSync(tmp); } catch (er) { /* yoksay */ } res(ok ? true : reason); });
    });
  });
  ipcMain.handle('print:pdf', async (e, html, name, o) => {
    const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), String(name)), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (r.canceled || !r.filePath) return null;
    const { w, tmp } = await renderHidden(html);
    const data = await w.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, landscape: !!(o && o.landscape), pageSize: 'A4' });
    fs.writeFileSync(r.filePath, data);
    try { w.destroy(); fs.unlinkSync(tmp); } catch (er) { /* yoksay */ }
    shell.openPath(r.filePath);
    return r.filePath;
  });

  createWindow();
  if (!SMOKE) setTimeout(eskiTemizle, 5000);
});
app.on('window-all-closed', () => app.quit());
