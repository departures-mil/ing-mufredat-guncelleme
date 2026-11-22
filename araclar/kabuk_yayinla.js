#!/usr/bin/env node
/* Kabuk güncellemesi yayınlar (kabuk v3+ kendini GitHub'dan günceller).
   node araclar/kabuk_yayinla.js 3.0.1 <kabuk-imza.pem>
   kabuk/ içindeki main.js, preload.js, lan.js, enjekte.js → kabuk/kabuk.json (Ed25519 imzalı). Sonra git add/commit/push.
   Gizli anahtar: C:\Claude Programlarım\_Anahtarlar\IngMufredat\kabuk-imza.pem (depoya KONMAZ). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const [surum, anahtar] = process.argv.slice(2);
if (!surum || !anahtar) { console.error('Kullanım: node araclar/kabuk_yayinla.js <sürüm> <kabuk-imza.pem>'); process.exit(1); }
const K = path.join(__dirname, '..', 'kabuk');
const dosyalar = {};
for (const f of ['main.js', 'preload.js', 'lan.js', 'enjekte.js']) dosyalar[f] = fs.readFileSync(path.join(K, f)).toString('base64');
const imza = crypto.sign(null, Buffer.from(JSON.stringify({ surum, dosyalar })), fs.readFileSync(anahtar, 'utf8')).toString('base64');
fs.writeFileSync(path.join(K, 'kabuk.json'), JSON.stringify({ surum, dosyalar, imza }));
console.log('kabuk.json hazır:', surum);
