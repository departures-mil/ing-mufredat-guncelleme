#!/usr/bin/env node
// ESKİ KANAL KÖPRÜSÜ (kabuk 2–3: taşınabilir masaüstü exe'si ve 3.0.0 APK'sı).
// Bu kabuklar depo kökündeki latest.json'u (raw, main) okur, paketler/ing_<kimlik>.b64 dosyasını (gzip + base64, sha256 denetimi;
// imza listesi boş olduğundan imza gerekmez) indirip arayüz klasörüne açar ve yeniden başlar. Kabuğun kendisini değiştiremez.
// Bu betik yeni arayüzü (.derleme/www, OCR dosyaları hariç) o biçimde paketler. Yeni arayüz eski kabukta açılınca
// (Platform.legacy) "Yeni kurulum gerekli" penceresiyle kurulum dosyasına (win-setup) / yeni APK'ya yönlendirir; açılış onayını
// (bootOk) verir ki eski kabuk bir sonraki açılışta önceki arayüze dönmesin.
//   node araclar/derle.js && node araclar/eski-kanal.js        → latest.json + paketler/ing_<kimlik>.b64
// Release yayınlandıktan SONRA çalıştırılıp main'e gönderilir (pencere sürüm sayfasındaki kurulum dosyasını gösterir).
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const surum = require('./surum.js');

function dosyalar(kok) {
  const out = {};
  const gez = (d, onek) => {
    for (const n of fs.readdirSync(d).sort()) {
      const p = path.join(d, n), r = onek ? onek + '/' + n : n;
      if (r === 'vendor/ocr') continue;   // çevrimdışı OCR (≈11 MB) köprüde yok; yeni kurulumda var
      if (fs.statSync(p).isDirectory()) gez(p, r); else out[r] = fs.readFileSync(p).toString('base64');
    }
  };
  gez(kok, '');
  return out;
}

function paketle(o) {
  o = o || {};
  const www = o.www || path.join(ROOT, '.derleme', 'www');
  if (!fs.existsSync(path.join(www, 'index.html'))) throw new Error('.derleme/www yok: önce node araclar/derle.js');
  const sv = surum.version(), ver = surum.compat(sv), notlar = JSON.parse(fs.readFileSync(path.join(ROOT, 'release-notes.json'), 'utf8'));
  const raw = Buffer.from(JSON.stringify({ format: 'ihu-bundle', version: ver, semver: sv, files: dosyalar(www) }), 'utf8');
  const gz = zlib.gzipSync(raw, { level: 9 });
  const g64 = gz.toString('base64');
  const sha = crypto.createHash('sha256').update(gz).digest('hex');
  const ad = 'paketler/ing_' + ver.replace('.', '_') + '.b64';
  const latest = { version: ver, semver: sv, file: ad, sha256: sha, size: raw.length, gzlen: g64.length, date: o.date || new Date().toISOString().replace(/\.\d+Z$/, 'Z'), minShell: 2,
    notes_tr: notlar.tr, notes_en: notlar.en, notes_ar: notlar.ar };
  return { ad, g64, latest };
}

module.exports = { paketle };
if (require.main === module) {
  const kanal = process.argv[2] || ROOT;
  const r = paketle();
  fs.mkdirSync(path.join(kanal, 'paketler'), { recursive: true });
  for (const f of fs.readdirSync(path.join(kanal, 'paketler'))) if (f.endsWith('.b64')) fs.unlinkSync(path.join(kanal, 'paketler', f));
  fs.writeFileSync(path.join(kanal, r.ad), r.g64);
  fs.writeFileSync(path.join(kanal, 'latest.json'), JSON.stringify(r.latest, null, 1) + '\n');
  console.log('Eski kanal köprüsü: v' + r.latest.semver + ' (kimlik ' + r.latest.version + '), ' + (r.g64.length / 1048576).toFixed(1) + ' MB → ' + r.ad + ' + latest.json');
}
