// Tek sözlük (kaynak/i18n/{tr,en,ar}.js): aynı anahtarlar, boş metin yok, {değişken}ler aynı; koddaki t('…') anahtarları sözlükte.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { baglam, yukle, K } = require('../yardimci/yukle.js');

const c = yukle(baglam(), ['i18n/tr.js', 'i18n/en.js', 'i18n/ar.js']);
const I = c.I18N;

test('üç dilde aynı anahtarlar, boş metin yok', () => {
  const tr = Object.keys(I.tr).sort();
  assert.ok(tr.length > 900);
  for (const l of ['en', 'ar']) {
    assert.deepStrictEqual(Object.keys(I[l]).sort(), tr, l + ' anahtarları tr ile aynı olmalı');
    for (const k of tr) assert.ok(String(I[l][k]).trim() !== '' || String(I.tr[k]).trim() === '', l + '.' + k + ' boş');
  }
});

test('{değişken} adları üç dilde aynı', () => {
  const v = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(',');
  for (const k of Object.keys(I.tr)) for (const l of ['en', 'ar']) assert.strictEqual(v(I[l][k]), v(I.tr[k]), l + '.' + k);
});

test('kodda kullanılan t(\'anahtar\') metinleri sözlükte var', () => {
  const eksik = new Set();
  const tara = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) { if (n !== 'veri') tara(p); } else if (n.endsWith('.js')) { const s = fs.readFileSync(p, 'utf8'); for (const m of s.matchAll(/[^\w.]t\('([A-Za-z_][\w]*)'\s*[,)]/g)) if (!(m[1] in I.tr)) eksik.add(n + ':' + m[1]); } } };
  tara(path.join(K, 'js'));
  assert.deepStrictEqual([...eksik], []);
});

test('eski yama katmanları kaldırıldı (tek sözlük)', () => {
  for (const f of ['i18n.js', 'i18n-extra.js', 'i18n-v11.js', 'i18n-v12.js', 'i18n-v13.js', 'v24.js']) assert.ok(!fs.existsSync(path.join(K, 'js', f)), f);
  const kod = fs.readdirSync(path.join(K, 'js', 'arayuz')).map((n) => fs.readFileSync(path.join(K, 'js', 'arayuz', n), 'utf8')).join('\n');
  assert.ok(!/Object\.assign\(I18N\[/.test(kod), 'modüller sözlüğe yama yapmamalı');
});
