#!/usr/bin/env node
// Ekran görüntüleri (Playwright Chromium, derlenmiş .derleme/www, örnek kayıtlarla):
//   node araclar/derle.js && node araclar/ekran.js <klasör>
//   → tr-falcon-dark, ar-falcon-light, tr-klasik (+ sayfa başına: panel, ayarlar, öğrenci, müfredat, Wi‑Fi penceresi)
'use strict';
const path = require('path');
const fs = require('fs');
const { baslat, playwright } = require('../test/yardimci/sunucu.js');
const OUT = path.resolve(process.argv[2] || 'ekran');
const WWW = path.join(__dirname, '..', '.derleme', 'www');

const ORNEK = () => {
  const ad = ['Ayşe Yılmaz', 'Mehmet Demir', 'Zeynep Kaya', 'Ali Çelik', 'Elif Şahin', 'Omar Haddad'];
  const st = {};
  ad.forEach((n, i) => { st['s' + i] = { id: 's' + i, name: n, program: 'genel', no: String(101 + i), marks: {}, evals: {}, flight: {}, flightLog: [], journal: [], off: {}, start: '2026-09-15', updatedAt: 1 }; });
  return st;
};
const DURUMLAR = [
  { ad: 'tr-falcon-dark', lang: 'tr', scheme: 'falcon', theme: 'dark' },
  { ad: 'ar-falcon-light', lang: 'ar', scheme: 'falcon', theme: 'light' },
  { ad: 'tr-klasik', lang: 'tr', scheme: 'klasik', theme: 'dark' },
];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { s, url } = await baslat(WWW);
  const b = await playwright().chromium.launch();
  for (const d of DURUMLAR) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.fulfill({ status: 404, body: '' }));
    await p.addInitScript((o) => {
      if (localStorage.getItem('ekran.kuruldu')) return;
      localStorage.setItem('ekran.kuruldu', '1');
      localStorage.setItem('fc.onboarding.done', 'true');
      localStorage.setItem('fc.whatsnew.seen', '"9.9.9"');
      localStorage.setItem('fc.scheme', JSON.stringify(o.scheme));
      localStorage.setItem('fc.theme', JSON.stringify(o.theme));
      localStorage.setItem('fc.lang', JSON.stringify(o.lang));
      localStorage.setItem('ingmufredat_local_v1', JSON.stringify({ lang: o.lang, deviceId: 'ekran', lastRunVer: '3.1.0', ui: {} }));
      localStorage.setItem('ingmufredat_db_v1', JSON.stringify({ schema: 1, students: o.st, config: { institution: { name: 'Örnek Dil Okulu', instructor: 'M. Öğretmen', logo: '' } } }));
    }, { lang: d.lang, scheme: d.scheme, theme: d.theme, st: ORNEK() });
    await p.goto(url);
    await p.waitForFunction(() => window.FC && window.Store && document.querySelector('#topbar .topbar-actions'));
    await p.evaluate(() => { const st = Object.values(Store.db.students); const its = []; Store.levels().slice(0, 2).forEach((l) => l.modules.forEach((m) => m.items.forEach((i) => its.push(i.id)))); st.forEach((s, k) => { its.slice(0, 20 + k * 25).forEach((id) => { s.marks[id] = 'k'; }); }); Store.persistNow(); UI.render(); });
    await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(OUT, d.ad + '.png') });
    for (const [sayfa, ek] of [['settings', null], ['student', { sid: 's0', tab: 'summary' }], ['curriculum', null]]) {
      await p.evaluate(([x, e]) => UI.go(x, e || undefined), [sayfa, ek]);
      await p.waitForTimeout(700);
      await p.screenshot({ path: path.join(OUT, d.ad + '-' + sayfa + '.png') });
    }
    if (d.ad === 'tr-falcon-dark') { await p.evaluate(() => Lan.pencere()); await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, d.ad + '-wifi.png') }); }
    await ctx.close();
  }
  // telefon boyutu
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.fulfill({ status: 404, body: '' }));
  await p.addInitScript(() => { localStorage.setItem('fc.onboarding.done', 'true'); });
  await p.goto(url); await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, 'tr-falcon-dark-telefon.png') });
  await ctx.close();
  await b.close(); s.close();
  console.log('Ekran görüntüleri: ' + OUT);
})().catch((e) => { console.error(e); process.exit(1); });
