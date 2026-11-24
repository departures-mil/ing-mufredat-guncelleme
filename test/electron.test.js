// Gerçek Electron açılış testi (xvfb): ortak çekirdek, üst çubuk, pencere düğmeleri, tam ekran, Ayarlar sırası,
// ve ESKİ VERİ: kabuk 2–3'ün kayıt dosyası (veri/db.json) aynı veri klasöründen okunur.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const KOK = path.join(__dirname, '..');

test('Electron: açılış, çekirdek, eski kayıt dosyası', (t) => {
  let electron; try { electron = require('electron'); } catch (e) { t.skip('electron yok'); return; }
  const app = path.join(KOK, '.derleme', 'app');
  if (!fs.existsSync(path.join(app, 'main.js'))) { t.skip('.derleme/app yok (node araclar/derle.js)'); return; }
  const veri = fs.mkdtempSync(path.join(os.tmpdir(), 'ing-veri-'));
  fs.mkdirSync(path.join(veri, 'veri'));
  fs.writeFileSync(path.join(veri, 'veri', 'db.json'), JSON.stringify({ schema: 1, students: { s1: { id: 's1', name: 'Eski Kayıt', marks: {} } } }));
  const xvfb = process.platform === 'linux' && !process.env.DISPLAY;
  const cmd = xvfb ? 'xvfb-run' : electron, args = (xvfb ? ['-a', '-s', '-screen 0 1600x1000x24', electron] : []).concat([app, '--no-sandbox']);
  const r = spawnSync(cmd, args, { env: Object.assign({}, process.env, { ING_SMOKE: '1', ING_VERI: veri, ELECTRON_ENABLE_LOGGING: '0' }), encoding: 'utf8', timeout: 150000 });
  const line = String(r.stdout || '').split('\n').find((l) => l.startsWith('ING_SMOKE '));
  assert.ok(line, 'duman çıktısı yok:\n' + r.stdout + '\n' + r.stderr);
  const o = JSON.parse(line.slice('ING_SMOKE '.length));
  assert.ok(o.ok, JSON.stringify(o));
  assert.strictEqual(o.host, 'electron');
  assert.strictEqual(o.legacy, false);
  assert.strictEqual(o.version, require('../package.json').version);
  assert.ok(o.winBtns >= 4, 'Küçült · Orta · Tam ekran · Kapat');
  assert.ok(o.lan, 'Wi‑Fi eşitleme kabukta var');
  assert.ok(o.ogrenciler.includes('Eski Kayıt'), 'eski kayıt dosyası okundu');
  assert.strictEqual(o.ayarSirasi[0], 'look');
  assert.strictEqual(o.ayarSirasi[o.ayarSirasi.length - 1], 'contact');
  assert.strictEqual(o.userData, veri);
  fs.rmSync(veri, { recursive: true, force: true });
});
