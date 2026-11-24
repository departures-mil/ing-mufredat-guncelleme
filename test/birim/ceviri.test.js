// Çeviri: çevrimdışı çeviri belleği (müfredat terimleri) ve çevrimiçi sıra (önce kullanıcının yapay zeka anahtarı, sonra genel hizmet).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { baglam, yukle } = require('../yardimci/yukle.js');

function kur(o) {
  const c = baglam();
  c.navigator.onLine = !!(o && o.online);
  c.Platform = { httpGet: async (u) => { c.gtx = (c.gtx || 0) + 1; if (o && o.gtx) return JSON.stringify([[[o.gtx]]]); throw new Error('ağ yok'); } };
  c.t = (k) => k; c.UI = { toast() {} };
  yukle(c, ['i18n/tr.js', 'i18n/en.js', 'i18n/ar.js', 'js/veri/dict-data.js', 'js/veri/vocab-data.js', 'js/veri/glossary.js', 'js/veri/ceviri-bellegi.js', 'js/temel/ceviri.js']);
  if (o && o.ai !== undefined) c.Danisman = { cevir: async () => { c.ai = (c.ai || 0) + 1; return o.ai; } };
  return c;
}

test('çeviri belleği: her girişte üç dil dolu', () => {
  const c = kur();
  assert.ok(c.CEVIRI_BELLEGI.length >= 250);
  for (const e of c.CEVIRI_BELLEGI) { assert.strictEqual(e.length, 3); e.forEach((x) => assert.ok(String(x).trim(), JSON.stringify(e))); }
});

test('çevrimdışı: müfredat terimleri birebir ve her yönde çevrilir', async () => {
  const c = kur({ online: false });
  assert.strictEqual(await c.translateText('Okuduğunu anlama', 'tr', 'en'), 'Reading comprehension');
  assert.strictEqual(await c.translateText('Reading comprehension', 'en', 'ar'), 'فهم المقروء');
  assert.strictEqual(await c.translateText('الماضي البسيط', 'ar', 'tr'), "Di'li geçmiş zaman");
  assert.strictEqual(await c.translateText('Present perfect', 'auto', 'tr'), 'Yakın geçmiş zaman');
});

test('çevrimdışı: bilinmeyen cümle terim terim (taslak) çevrilir', async () => {
  const c = kur({ online: false });
  const r = c.OfflineTR.translate('Dinleme ve konuşma', 'tr', 'en');
  assert.ok(/listening/i.test(r.text) && /speaking/i.test(r.text), r.text);
  assert.strictEqual(r.draft, true);
});

test('çevrimiçi: önce kullanıcının yapay zeka anahtarı, sonra genel hizmet', async () => {
  const c1 = kur({ online: true, ai: 'AI çevirisi', gtx: 'GTX' });
  assert.strictEqual(await c1.translateText('Bu cümle bellekte yok', 'tr', 'en'), 'AI çevirisi');
  assert.strictEqual(c1.gtx || 0, 0);
  const c2 = kur({ online: true, ai: null, gtx: 'GTX' });
  assert.strictEqual(await c2.translateText('Bu cümle bellekte yok', 'tr', 'en'), 'GTX');
  // bellekte birebir karşılığı olan terim internete hiç gitmez
  const c3 = kur({ online: true, ai: 'X', gtx: 'Y' });
  assert.strictEqual(await c3.translateText('Kelime bilgisi', 'tr', 'en'), 'Vocabulary');
  assert.strictEqual(c3.ai || 0, 0);
});
