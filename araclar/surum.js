#!/usr/bin/env node
// Sürüm tek kaynaktan: package.json "version" + release-notes.json → kaynak/js/surum.js (window.APP_RELEASE).
//   node araclar/surum.js 3.1.1   → package.json'u yükseltir ve surum.js'i yazar
//   node araclar/surum.js         → yalnız surum.js'i yeniden yazar
//   node araclar/surum.js --check → güncel değilse hata (CI / npm test)
// Eski kanal kimliği (compat): kabuk 2–3'ün OTA karşılaştırması "ana.ikincilYAMA" bekler: 3.1.0 → "3.100", 3.1.12 → "3.112".
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PKG = path.join(ROOT, 'package.json');
const OUT = path.join(ROOT, 'kaynak', 'js', 'surum.js');

const version = () => JSON.parse(fs.readFileSync(PKG, 'utf8')).version;
function compat(v) { const [a, b, c] = v.split('.').map(Number); return a + '.' + String(b * 100 + c).padStart(3, '0'); }
/** Android versionCode: 3.1.0 → 30100 (eski APK 3.0.0 = 300 ve altı; her zaman büyük kalır). */
function versionCode(v) { const [a, b, c] = v.split('.').map(Number); return a * 10000 + b * 100 + c; }
function notes() { return JSON.parse(fs.readFileSync(path.join(ROOT, 'release-notes.json'), 'utf8')); }
function render(v) {
  v = v || version();
  const o = { version: v, compat: compat(v), notes: notes() };
  return '/* Otomatik: araclar/surum.js (package.json + release-notes.json). Elle düzenlemeyin. */\nwindow.APP_RELEASE = ' + JSON.stringify(o, null, 1) + ';\n';
}
module.exports = { version, compat, versionCode, render, OUT };

if (require.main === module) {
  const a = process.argv[2];
  if (a === '--check') {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== render()) { console.error('kaynak/js/surum.js güncel değil: node araclar/surum.js'); process.exit(1); }
    console.log('surum.js güncel (' + version() + ')');
  } else {
    if (a) {
      if (!/^\d+\.\d+\.\d+$/.test(a)) { console.error('Sürüm X.Y.Z olmalı'); process.exit(2); }
      const p = JSON.parse(fs.readFileSync(PKG, 'utf8')); p.version = a;
      fs.writeFileSync(PKG, JSON.stringify(p, null, 2) + '\n');
    }
    fs.writeFileSync(OUT, render());
    console.log('Sürüm ' + version() + ' (eski kanal kimliği ' + compat(version()) + ', Android versionCode ' + versionCode(version()) + ')');
  }
}
