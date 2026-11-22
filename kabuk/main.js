/* İngilizce Müfredat Sistemi — masaüstü ana süreç (Electron)
   - Her açılışta tam ekran başlar; F11 ya da üst çubuktaki düğme ile pencere görünümüne geçilir.
   - Veriler %APPDATA%\IngMufredatSistemi klasöründe tutulur; yamalar yalnız program dosyalarını değiştirir, bu klasöre dokunmaz.
   - Her gün otomatik yedek alınır (son 30 gün). */
const { app, BrowserWindow, protocol, ipcMain, dialog, shell, net, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');

const VERSION = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'version.json'), 'utf8')).version; } catch (e) { return '1.0'; } })();
const TITLE_BASE = 'İngilizce Müfredat Sistemi';
app.setName('Ing Mufredat Sistemi');
app.setPath('userData', path.join(app.getPath('appData'), 'IngMufredatSistemi'));
const DATA_DIR = app.getPath('userData');
const DB_FILE = path.join(DATA_DIR, 'veri', 'db.json');
const BK_DIR = path.join(DATA_DIR, 'yedekler');
const UI_DIR = path.join(__dirname, 'ui');
const SHELL_VERSION = 3; // uygulama içi güncelleme (OTA) arayüzü — v3: Küçült, Wi‑Fi eşitleme, kabuk güncellemesi
const SHELL_BUILD = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'kabuk.json'), 'utf8')).surum; } catch (e) { return '3.0.0'; } })();

/* ---------- Uygulama içi güncelleme (OTA) ----------
   Yeni arayüz paketleri %APPDATA%\IngMufredatSistemi\ota\<sürüm>\ klasörüne yazılır.
   Yeni sürüm ilk açılışta "açıldı" onayı vermezse bir sonraki açılışta önceki sürüme dönülür. */
const OTA_DIR = path.join(DATA_DIR, 'ota');
const OTA_STATE = path.join(OTA_DIR, 'state.json');
const vnum = (v) => { const [a, b] = String(v || '0').split('.').map((x) => parseInt(x, 10) || 0); return a * 1000 + b; };
const readState = () => { try { return JSON.parse(fs.readFileSync(OTA_STATE, 'utf8')); } catch (e) { return {}; } };
const writeState = (st) => { ensureDir(OTA_DIR); fs.writeFileSync(OTA_STATE, JSON.stringify(st, null, 1)); };
const otaOk = (v) => v && fs.existsSync(path.join(OTA_DIR, v, 'index.html'));
function resolveUi() {
  const st = readState();
  for (let guard = 0; guard < 3; guard++) {
    if (!(otaOk(st.current) && vnum(st.current) > vnum(VERSION))) return { dir: UI_DIR, version: VERSION };
    if (st.pending) {
      if ((st.tries || 0) >= 1) { st.bad = st.current; st.current = st.previous && st.previous !== st.bad ? st.previous : null; st.previous = null; st.pending = false; st.tries = 0; writeState(st); continue; }
      st.tries = (st.tries || 0) + 1; writeState(st);
    }
    return { dir: path.join(OTA_DIR, st.current), version: st.current };
  }
  return { dir: UI_DIR, version: VERSION };
}
let ACTIVE = { dir: UI_DIR, version: VERSION };
/* Kısayol adlarını ve "Programlar" listesindeki adı etkin sürüme göre günceller (yalnız Windows) */
function syncVersionNames(ver) {
  if (process.platform !== 'win32') return;
  const base = 'İngilizce Müfredat Sistemi';
  const dirs = [app.getPath('desktop'), path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', base)];
  for (const d of dirs) {
    try {
      for (const f of fs.readdirSync(d)) {
        if (f.startsWith(base + ' v') && f.endsWith('.lnk') && f !== base + ' v' + ver + '.lnk') { try { fs.renameSync(path.join(d, f), path.join(d, base + ' v' + ver + '.lnk')); } catch (e) {} }
      }
    } catch (e) {}
  }
  try {
    const { execFile } = require('child_process');
    const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\IngMufredatSistemi';
    execFile('reg', ['add', key, '/v', 'DisplayName', '/d', base + ' v' + ver, '/f'], () => {});
    execFile('reg', ['add', key, '/v', 'DisplayVersion', '/d', ver, '/f'], () => {});
    execFile('reg', ['add', 'HKCU\\Software\\IngMufredatSistemi', '/v', 'Version', '/d', ver, '/f'], () => {});
  } catch (e) {}
}

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

if (!app.requestSingleInstanceLock()) { app.quit(); }
let win = null;
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function writeSafe(file, text) { ensureDir(path.dirname(file)); const tmp = file + '.tmp'; fs.writeFileSync(tmp, text, 'utf8'); if (fs.existsSync(file)) { try { fs.copyFileSync(file, file + '.bak'); } catch (e) {} } fs.renameSync(tmp, file); }
function dailyBackup(json) {
  try {
    ensureDir(BK_DIR);
    const day = new Date().toISOString().slice(0, 10);
    const f = path.join(BK_DIR, 'yedek_' + day + '.json');
    if (!fs.existsSync(f)) {
      fs.writeFileSync(f, json, 'utf8');
      const all = fs.readdirSync(BK_DIR).filter((x) => /^yedek_.*\.json$/.test(x)).sort();
      while (all.length > 30) fs.unlinkSync(path.join(BK_DIR, all.shift()));
    }
  } catch (e) { console.error(e); }
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function createWindow() {
  const wa = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: Math.min(1400, wa.width), height: Math.min(900, wa.height), minWidth: 900, minHeight: 600,
    fullscreen: true, show: false, backgroundColor: '#061327', title: TITLE_BASE + ' v' + ACTIVE.version,
    icon: path.join(__dirname, 'icon.ico'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, spellcheck: false },
  });
  Menu.setApplicationMenu(null);
  win.on('page-title-updated', (e) => { e.preventDefault(); });
  win.once('ready-to-show', () => { win.setFullScreen(true); win.show(); });
  win.loadURL('app://ingmufredat/index.html');
  const sendFs = () => { if (win && !win.isDestroyed()) win.webContents.send('fs-changed', win.isFullScreen()); };
  let sizing = false;
  win.on('enter-full-screen', sendFs);
  win.on('leave-full-screen', () => {
    sendFs();
    if (sizing) return; sizing = true;
    setTimeout(() => { try { const d = screen.getDisplayMatching(win.getBounds()).workArea; const w = Math.min(1400, d.width - 40), h = Math.min(900, d.height - 40); win.setBounds({ x: d.x + Math.round((d.width - w) / 2), y: d.y + Math.round((d.height - h) / 2), width: w, height: h }); } catch (e) {} sizing = false; }, 150);
  });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.type === 'keyDown' && input.key === 'F12' && input.control && input.shift) win.webContents.toggleDevTools();
  });
  win.webContents.on('did-finish-load', () => {
    try { win.webContents.executeJavaScript(fs.readFileSync(path.join(__dirname, 'enjekte.js'), 'utf8')).catch(() => {}); } catch (e) {}
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); } });
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === '/' || !p) p = '/index.html';
    const root = ACTIVE.dir;
    let file = path.normalize(path.join(root, p));
    if (file.startsWith(root) && !fs.existsSync(file) && root !== UI_DIR) file = path.normalize(path.join(UI_DIR, p)); // eksik dosya: kurulu pakete düş
    if (!(file.startsWith(root) || file.startsWith(UI_DIR)) || !fs.existsSync(file)) return new Response('Not found', { status: 404 });
    return new Response(fs.readFileSync(file), { headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
  });

  ipcMain.handle('db:save', (e, json) => { writeSafe(DB_FILE, json); dailyBackup(json); return true; });
  ipcMain.handle('db:load', () => { for (const f of [DB_FILE, DB_FILE + '.bak']) { try { if (fs.existsSync(f)) { const s = fs.readFileSync(f, 'utf8'); JSON.parse(s); return s; } } catch (e) {} } return null; });
  ipcMain.handle('win:toggleFs', () => { const v = !win.isFullScreen(); win.setFullScreen(v); return v; });
  ipcMain.handle('win:isFs', () => win.isFullScreen());
  ipcMain.handle('file:save', async (e, name, b64) => {
    const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), name) });
    if (r.canceled || !r.filePath) return null;
    fs.writeFileSync(r.filePath, Buffer.from(b64, 'base64'));
    shell.showItemInFolder(r.filePath);
    return r.filePath;
  });
  ipcMain.handle('file:open', async (e, name, b64) => {
    const dir = path.join(os.tmpdir(), 'IngMufredat'); ensureDir(dir);
    const f = path.join(dir, name.replace(/[\\/:*?"<>|]+/g, '_'));
    fs.writeFileSync(f, Buffer.from(b64, 'base64'));
    const err = await shell.openPath(f); return err || true;
  });
  ipcMain.handle('url:open', (e, url) => { if (/^https?:/i.test(url)) shell.openExternal(url); return true; });
  ipcMain.handle('http:get', async (e, url) => { const r = await net.fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
  ipcMain.handle('backup:open', () => { ensureDir(BK_DIR); shell.openPath(BK_DIR); return true; });
  ipcMain.handle('app:quit', () => app.quit());
  ipcMain.handle('win:minimize', () => { win.minimize(); return true; });
  // ---- İnternetsiz eşitleme (aynı Wi‑Fi): birleştirmeyi arayüz yapar (enjekte.js → __kabukLanIn)
  const LAN = require('./lan');
  ipcMain.handle('lan:start', () => LAN.start(async (theirs) => {
    const s = await win.webContents.executeJavaScript('window.__kabukLanIn ? window.__kabukLanIn(' + JSON.stringify(theirs) + ') : null');
    if (!s) throw new Error('arayüz hazır değil');
    return JSON.parse(s);
  }));
  ipcMain.handle('lan:stop', () => { LAN.stop(); return true; });
  ipcMain.handle('lan:state', () => ({ hosting: LAN.hosting, pin: LAN.pin, ips: LAN.localIps() }));
  ipcMain.handle('lan:discover', () => LAN.discover());
  ipcMain.handle('lan:sync', async (e, host, pin, json) => {
    try { return { ok: true, data: await LAN.sync(host, pin, JSON.parse(json)) }; } catch (err) { return { ok: false, error: String(err.message || err) }; }
  });
  // ---- OTA ----
  ipcMain.handle('ota:info', () => ({ shell: SHELL_VERSION, shellBuild: SHELL_BUILD, bundled: VERSION, active: ACTIVE.version, state: readState() }));
  ipcMain.handle('ota:write', (e, ver, rel, b64) => {
    if (!/^\d+\.\d+$/.test(ver)) throw new Error('surum');
    const dir = path.join(OTA_DIR, ver + '.tmp');
    const f = path.normalize(path.join(dir, rel));
    if (!f.startsWith(dir) || rel.includes('..')) throw new Error('yol');
    ensureDir(path.dirname(f)); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return true;
  });
  ipcMain.handle('ota:begin', (e, ver) => { const dir = path.join(OTA_DIR, ver + '.tmp'); fs.rmSync(dir, { recursive: true, force: true }); ensureDir(dir); return true; });
  ipcMain.handle('ota:commit', (e, ver) => {
    const tmp = path.join(OTA_DIR, ver + '.tmp'), dir = path.join(OTA_DIR, ver);
    if (!fs.existsSync(path.join(tmp, 'index.html'))) throw new Error('paket eksik');
    fs.rmSync(dir, { recursive: true, force: true }); fs.renameSync(tmp, dir);
    const st = readState(); st.previous = ACTIVE.version !== VERSION ? ACTIVE.version : null; st.current = ver; st.pending = true; st.tries = 0; st.bad = null; writeState(st);
    return true;
  });
  ipcMain.handle('ota:bootOk', () => {
    const st = readState();
    if (st.pending && st.current === ACTIVE.version) { st.pending = false; st.tries = 0; writeState(st); }
    // eski paketleri temizle (etkin ve bir önceki kalır)
    try { for (const d of fs.readdirSync(OTA_DIR)) { if (d === 'state.json') continue; if (d !== st.current && d !== st.previous) fs.rmSync(path.join(OTA_DIR, d), { recursive: true, force: true }); } } catch (e) {}
    syncVersionNames(ACTIVE.version);
    return true;
  });
  ipcMain.handle('ota:restart', () => { app.relaunch(); app.exit(0); });

  const renderHidden = async (html, landscape) => {
    const tmp = path.join(os.tmpdir(), 'iha_print_' + Date.now() + '.html');
    fs.writeFileSync(tmp, html, 'utf8');
    const w = new BrowserWindow({ show: false, webPreferences: { offscreen: false } });
    await w.loadURL(pathToFileURL(tmp).href);
    await new Promise((r) => setTimeout(r, 400));
    return { w, tmp };
  };
  ipcMain.handle('print:html', async (e, html, o) => {
    const { w, tmp } = await renderHidden(html, o && o.landscape);
    return new Promise((res) => {
      w.webContents.print({ printBackground: true, landscape: !!(o && o.landscape) }, (ok, reason) => { try { w.destroy(); fs.unlinkSync(tmp); } catch (er) {} res(ok ? true : reason); });
    });
  });
  ipcMain.handle('print:pdf', async (e, html, name, o) => {
    const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), name), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (r.canceled || !r.filePath) return null;
    const { w, tmp } = await renderHidden(html);
    const data = await w.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, landscape: !!(o && o.landscape), pageSize: 'A4' });
    fs.writeFileSync(r.filePath, data);
    try { w.destroy(); fs.unlinkSync(tmp); } catch (er) {}
    shell.openPath(r.filePath);
    return r.filePath;
  });

  ACTIVE = resolveUi();
  createWindow();
  setTimeout(selfInstall, 3000);
  setTimeout(shellUpdate, 15000);
});
app.on('window-all-closed', () => app.quit());

/* ---------- Tek dosyalık programla gelen kurulum ----------
   Taşınabilir exe açıldığında: bilgisayarda kurulu program varsa kabuk dosyalarını yeniler (kayıtlara dokunmaz);
   yoksa programı %LOCALAPPDATA%\Programs\Ing Mufredat Sistemi klasörüne kurar, masaüstü ve Başlat kısayolunu açar. */
const KABUK_DOSYALARI = ['main.js', 'preload.js', 'lan.js', 'enjekte.js', 'kabuk.json'];
function copyDir(src, dst) {
  ensureDir(dst);
  for (const n of fs.readdirSync(src)) { const a = path.join(src, n), b = path.join(dst, n); if (fs.statSync(a).isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b); }
}
function selfInstall() {
  try {
    if (process.platform !== 'win32' || !process.env.PORTABLE_EXECUTABLE_FILE || !process.env.LOCALAPPDATA) return;
    const target = path.join(process.env.LOCALAPPDATA, 'Programs', 'Ing Mufredat Sistemi');
    const exe = path.join(target, 'Ing Mufredat Sistemi.exe');
    const tApp = path.join(target, 'resources', 'app');
    if (path.resolve(__dirname).toLowerCase() === path.resolve(tApp).toLowerCase()) return;
    if (fs.existsSync(exe) && fs.existsSync(tApp)) {
      for (const f of KABUK_DOSYALARI) { try { fs.copyFileSync(path.join(__dirname, f), path.join(tApp, f)); } catch (e) {} }
    } else {
      copyDir(path.dirname(process.execPath), target);
    }
    const lnk = { target: exe, cwd: target, icon: path.join(tApp, 'icon.ico'), iconIndex: 0, description: TITLE_BASE };
    const base = 'İngilizce Müfredat Sistemi';
    const desk = path.join(app.getPath('desktop'), base + ' v' + ACTIVE.version + '.lnk');
    const hasDesk = fs.readdirSync(app.getPath('desktop')).some((f) => f.startsWith(base) && f.endsWith('.lnk'));
    if (!hasDesk) shell.writeShortcutLink(desk, 'create', lnk);
    const sm = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', base);
    ensureDir(sm);
    if (!fs.readdirSync(sm).some((f) => f.endsWith('.lnk'))) shell.writeShortcutLink(path.join(sm, base + ' v' + ACTIVE.version + '.lnk'), 'create', lnk);
  } catch (e) { console.error('kurulum', e); }
}

/* ---------- Kabuk güncellemesi (v3+) ----------
   GitHub'daki kabuk/kabuk.json daha yeniyse kabuk dosyaları (main.js, preload.js, lan.js, enjekte.js) Ed25519 imzası
   doğrulanarak program klasörüne yazılır; bir sonraki açılışta etkin olur. Kayıtlara dokunulmaz. */
const KABUK_URL = 'https://raw.githubusercontent.com/departures-mil/ing-mufredat-guncelleme/main/kabuk/kabuk.json';
const KABUK_KEY = '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAPSBrGDJLHDV9C0pVHOyk3l/mcYtoSjX8PXQkOLvwbrQ=\n-----END PUBLIC KEY-----\n';
const semv = (v) => String(v || '0').split('.').map((x) => parseInt(x, 10) || 0).reduce((a, x) => a * 1000 + x, 0);
async function shellUpdate() {
  try {
    const r = await net.fetch(KABUK_URL + '?t=' + Date.now()); if (!r.ok) return;
    const m = await r.json();
    if (!m || !m.surum || semv(m.surum) <= semv(SHELL_BUILD) || !m.dosyalar || !m.imza) return;
    const crypto = require('crypto');
    const govde = Buffer.from(JSON.stringify({ surum: m.surum, dosyalar: m.dosyalar }));
    if (!crypto.verify(null, govde, KABUK_KEY, Buffer.from(m.imza, 'base64'))) return;
    const izin = new Set(['main.js', 'preload.js', 'lan.js', 'enjekte.js']);
    const yaz = [];
    for (const [ad, b64] of Object.entries(m.dosyalar)) { if (!izin.has(ad)) return; yaz.push([path.join(__dirname, ad), Buffer.from(b64, 'base64')]); }
    for (const [f, b] of yaz) fs.writeFileSync(f + '.yeni', b);
    for (const [f] of yaz) { try { fs.copyFileSync(f, f + '.eski'); } catch (e) {} fs.renameSync(f + '.yeni', f); }
    fs.writeFileSync(path.join(__dirname, 'kabuk.json'), JSON.stringify({ surum: m.surum }));
  } catch (e) { console.error('kabuk', e); }
}
