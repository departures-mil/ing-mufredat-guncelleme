#!/usr/bin/env node
// Derleme (kararlı: aynı kaynaktan bayt bayt aynı çıktı → CI'daki FCD1 yamaları kurulu dosyayla eşleşir).
//   .derleme/www/  arayüz: kaynak/ + js/uygulama.js (kaynak/dosyalar.json sırasıyla birleşik) + çevrimdışı OCR (node_modules'tan)
//   .derleme/app/  Electron uygulaması (electron-builder directories.app): masaustu/* + www/ + cekirdek/ + package.json
//   node araclar/derle.js [--yalniz-www]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const K = path.join(ROOT, 'kaynak');
const OUT = path.join(ROOT, '.derleme');

function copyDir(src, dst, skip) {
  fs.mkdirSync(dst, { recursive: true });
  for (const n of fs.readdirSync(src).sort()) {
    if (n.startsWith('.')) continue;
    const s = path.join(src, n), d = path.join(dst, n);
    if (skip && skip(s, n)) continue;
    if (fs.statSync(s).isDirectory()) copyDir(s, d, skip);
    else fs.copyFileSync(s, d);
  }
}
const sirali = () => JSON.parse(fs.readFileSync(path.join(K, 'dosyalar.json'), 'utf8')).dosyalar;

/** kaynak/dosyalar.json sırasıyla tek dosya. Her parça kendi IIFE'sidir; dosya adı yorum olarak kalır (hata ayıklama için). */
function birlesik() {
  return sirali().map((f) => {
    const s = fs.readFileSync(path.join(K, f), 'utf8').replace(/\r\n/g, '\n');
    return '/* ==== ' + f + ' ==== */\n' + s + (s.endsWith('\n') ? '' : '\n') + ';\n';
  }).join('');
}
function indexHtml() {
  const s = fs.readFileSync(path.join(K, 'index.html'), 'utf8');
  const a = s.indexOf('<!-- UYGULAMA:'), b = s.indexOf('<!-- UYGULAMA-SON -->');
  if (a < 0 || b < 0) throw new Error('index.html: UYGULAMA bloğu yok');
  return s.slice(0, a) + '<script src="js/uygulama.js"></script>\n' + s.slice(b + '<!-- UYGULAMA-SON -->'.length + 1);
}
/** Geliştirme/test için: kaynak dosyaları tek tek yükleyen index (derlemesiz). */
function indexHtmlKaynak() {
  const s = fs.readFileSync(path.join(K, 'index.html'), 'utf8');
  const b = s.indexOf('<!-- UYGULAMA-SON -->');
  return s.slice(0, b) + sirali().map((f) => '<script src="' + f + '"></script>').join('\n') + '\n' + s.slice(b);
}
/** Çevrimdışı yazı tanıma (Tesseract 5): npm paketlerinden — depoya ikili dosya girmez. */
function ocr(dst) {
  const nm = path.join(ROOT, 'node_modules');
  const parca = [
    ['tesseract.js/dist/tesseract.min.js', 'tesseract.min.js'],
    ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
    ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
    ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
    ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz'],
  ];
  fs.mkdirSync(dst, { recursive: true });
  for (const [s, d] of parca) {
    const p = path.join(nm, s);
    if (!fs.existsSync(p)) throw new Error('OCR dosyası yok (npm ci?): ' + s);
    fs.copyFileSync(p, path.join(dst, d));
  }
  fs.writeFileSync(path.join(dst, 'LISANS.txt'), 'Tesseract OCR (tesseract.js 5, tesseract.js-core 5, eng 4.0.0_best_int) — Apache License 2.0\nhttps://github.com/naptha/tesseract.js\n');
}

function www(dst) {
  const surum = require('./surum.js');
  if (!fs.existsSync(surum.OUT) || fs.readFileSync(surum.OUT, 'utf8') !== surum.render()) throw new Error('kaynak/js/surum.js güncel değil: node araclar/surum.js');
  const kural = fs.readFileSync(path.join(ROOT, 'firebase', 'kurum.rules'), 'utf8').replace(/\r\n/g, '\n');
  const kuralJs = fs.readFileSync(path.join(K, 'js', 'temel', 'kurum-rules.js'), 'utf8');
  if (!kuralJs.includes(JSON.stringify(kural))) throw new Error('kaynak/js/temel/kurum-rules.js firebase/kurum.rules ile aynı değil: node araclar/kurallar.js');
  fs.rmSync(dst, { recursive: true, force: true });
  const liste = new Set(sirali().map((f) => path.join(K, f)));
  copyDir(K, dst, (s, n) => liste.has(s) || n === 'dosyalar.json' || n === 'index.html' || (n === 'i18n' && fs.statSync(s).isDirectory()));
  fs.writeFileSync(path.join(dst, 'js', 'uygulama.js'), birlesik());
  fs.writeFileSync(path.join(dst, 'index.html'), indexHtml());
  ocr(path.join(dst, 'vendor', 'ocr'));
  // boş kalan kaynak klasörlerini temizle
  for (const d of ['js/veri', 'js/arayuz', 'js/uygulama']) { const p = path.join(dst, d); try { if (!fs.readdirSync(p).length) fs.rmdirSync(p); } catch (e) { /* yok */ } }
  return dst;
}

function app(dst, wwwDir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  fs.rmSync(dst, { recursive: true, force: true });
  copyDir(path.join(ROOT, 'masaustu'), dst, (s, n) => n === 'icon.ico' || n === 'cekirdek');
  copyDir(path.join(ROOT, 'masaustu', 'cekirdek'), path.join(dst, 'cekirdek'));
  copyDir(wwwDir, path.join(dst, 'www'));
  fs.copyFileSync(path.join(ROOT, 'masaustu', 'icon.ico'), path.join(dst, 'icon.ico'));
  const appPkg = { name: pkg.name, productName: pkg.build.productName, version: pkg.version, description: pkg.description, author: pkg.author, main: 'main.js', license: pkg.license };
  fs.writeFileSync(path.join(dst, 'package.json'), JSON.stringify(appPkg, null, 2) + '\n');
  return dst;
}

function build(o) {
  o = o || {};
  const w = www(path.join(OUT, 'www'));
  if (o.yalnizWww) return { www: w };
  return { www: w, app: app(path.join(OUT, 'app'), w) };
}
module.exports = { build, birlesik, indexHtml, indexHtmlKaynak, sirali, copyDir, OUT };
if (require.main === module) {
  const r = build({ yalnizWww: process.argv.includes('--yalniz-www') });
  console.log('Hazır: ' + Object.values(r).map((p) => path.relative(ROOT, p)).join(', '));
}
