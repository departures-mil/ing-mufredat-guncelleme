/* v2.0: Dil bütünlüğü — seçili dilde başka dilden tek kelime kalmasın (İngilizce teknik terimler hariç).
   1) Görüntü: kullanıcının yazdığı tek dilli metinler (belge/link adları, şablon adları, kaynak adları) seçili dile çevrilerek gösterilir;
      çeviriler bu cihazda önbelleğe alınır, internet yoksa çevrimdışı sözlük kullanılır ve internet gelince iyileştirilir.
   2) Veri onarımı: müfredattaki üç dilli metinlerde yanlış dilde kalmış alanlar (ör. Arapça yerine Türkçe) çevrilerek düzeltilir. */
(function () {
  const LANGS = ['tr', 'en', 'ar'];
  const AR = /[؀-ۿ]/;
  const TRCH = /[çğıöşüÇĞİÖŞÜ]/;
  const words = (s) => String(s || '').match(/[A-Za-zÇĞİÖŞÜçğıöşüâîûÂÎÛ]+/g) || [];
  const low = (w) => w.toLocaleLowerCase('tr');
  let TRW = null;
  /* Türkçeye özgü kelimeler: Türkçe metinlerde geçip İngilizce metinlerde hiç geçmeyenler */
  function trWords() {
    if (TRW) return TRW;
    const tr = new Set(), en = new Set();
    const add = (s, set) => words(s).forEach((w) => set.add(low(w)));
    const tri = (o) => { if (o && typeof o === 'object') { add(o.tr, tr); add(o.en, en); } };
    const cur = (c) => { if (!c) return; tri(c.title); (c.levels || []).forEach((l) => { tri(l.title); tri(l.goal); tri(l.prereq); (l.modules || []).forEach((m) => { tri(m.title); (m.items || []).forEach((i) => tri(i.text)); }); }); (c.flight || []).forEach((f) => { tri(f.content); tri(f.cond); }); };
    try { cur(window.DEFAULT_DATA.curriculum); Object.values(window.DEFAULT_PROGRAMS || {}).forEach(cur); } catch (e) {}
    try { for (const k of Object.keys(I18N.tr)) { add(I18N.tr[k], tr); add(I18N.en[k], en); } } catch (e) {}
    (window.GLOSSARY || []).forEach(([a, b]) => { add(a, tr); add(b, en); });
    Object.values(window.SOURCE_I18N || {}).forEach(tri);
    TRW = new Set([...tr].filter((w) => w.length > 1 && !en.has(w)));
    return TRW;
  }
  const ALLOW = new Set(['fiber', 'servo', 'motor', 'pixhawk']);
  // Büyük harfli kısaltmalar (EN, SA, PID…) ve İngilizce teknik terimler serbest
  const hasTr = (s) => words(s).some((w) => !/^[A-ZÇĞİÖŞÜ]{2,8}$/.test(w) && (TRCH.test(w) || (!/^[A-Z]{1,6}$/.test(w) && !ALLOW.has(low(w)) && trWords().has(low(w))))); // kısaltmalar (YÖKDİL, IELTS) serbest
  /* Metin istenen dilde mi? (İngilizce teknik terimler her dilde serbest) */
  function wrong(s, l) {
    s = window.plainText ? plainText(String(s || '')) : String(s || '');
    if (!s.trim()) return false;
    if (l === 'ar') return hasTr(s);
    if (l === 'en') return AR.test(s) || hasTr(s);
    return AR.test(s); // tr
  }
  const srcLang = (s) => (AR.test(s) ? 'ar' : hasTr(s) ? 'tr' : 'en');
  const cur = () => (window.UI && UI.lang ? UI.lang() : 'tr');

  /* ---------- 1) görüntü çevirisi (önbellekli) ---------- */
  const cache = () => { const L = Store.local; L.trc = L.trc || { tr: {}, en: {}, ar: {} }; return L.trc; };
  const queue = new Map(); let qBusy = false, rT = 0;
  function str(s, l) {
    l = l || cur(); if (s == null) return ''; s = String(s);
    if (!s.trim() || !wrong(s, l)) return s;
    const c = cache()[l] = cache()[l] || {};
    const hit = c[s];
    if (hit && hit.t) { if (hit.d && navigator.onLine !== false) enqueue(s, l); return hit.t; }
    const from = srcLang(s);
    // dosya uzantısı korunur
    const m = s.match(/^(.*?)(\.[A-Za-z0-9]{1,5})$/); const base = m && !/\s/.test(m[2]) ? m[1] : s; const ext = base === s ? '' : m[2];
    let r = s;
    try { r = window.OfflineTR ? OfflineTR.translate(base.replace(/[_]+/g, ' '), from, l).text + ext : s; } catch (e) {}
    c[s] = { t: r, d: 1 }; saveSoon();
    if (navigator.onLine !== false) enqueue(s, l);
    return r;
  }
  function enqueue(s, l) { const k = l + '\u0001' + s; if (!queue.has(k)) queue.set(k, [s, l]); if (!qBusy) setTimeout(runQueue, 400); }
  async function runQueue() {
    if (qBusy || !window.OfflineTR || !OfflineTR.online) return; qBusy = true; let changed = false;
    try {
      for (const [k, [s, l]] of [...queue]) {
        queue.delete(k);
        const m = s.match(/^(.*?)(\.[A-Za-z0-9]{1,5})$/); const base = m && !/\s/.test(m[2]) ? m[1] : s; const ext = base === s ? '' : m[2];
        try { const r = await OfflineTR.online(base.replace(/[_]+/g, ' '), srcLang(s), l); if (r && String(r).trim()) { cache()[l][s] = { t: String(r).trim() + ext }; changed = true; } } catch (e) { break; }
      }
    } finally { qBusy = false; }
    if (changed) { saveSoon(); clearTimeout(rT); rT = setTimeout(() => { if (!document.querySelector('.modal-wrap') && !document.activeElement.matches('input,textarea,select')) UI.keepPos(() => UI.render()); }, 300); }
  }
  let sT = 0; const saveSoon = () => { clearTimeout(sT); sT = setTimeout(() => Store.saveLocal(), 800); };

  /* ---------- 2) veri onarımı: üç dilli metinler ---------- */
  const skip = new Set();
  async function repair() {
    if (!window.OfflineTR || !Store.db || !OfflineTR.parts) return 0;
    let n = 0; const online = navigator.onLine !== false;
    for (const [part, c] of OfflineTR.parts()) {
      let ch = false;
      for (const o of OfflineTR.triObjs(c)) {
        for (const l of LANGS) {
          const bad = !o[l] || wrong(o[l], l);
          if (!bad) continue;
          const key = l + '\u0001' + (o[l] || '') + '\u0001' + (o.tr || o.en || o.ar || '');
          if (skip.has(key)) continue;
          const src = LANGS.find((x) => x !== l && o[x] && !wrong(o[x], x) && !(o._mt || []).includes(x));
          if (!src) { skip.add(key); continue; }
          let r = null, draft = false;
          if (online) { try { r = await OfflineTR.online(o[src], src, l); } catch (e) { r = null; } }
          if (!r || !String(r).trim()) { r = OfflineTR.translate(o[src], src, l).text; draft = true; }
          if (r && r !== o[l] && !(wrong(r, l) && o[l])) {
            o[l] = String(r).trim(); ch = true; n++;
            o._mt = (o._mt || []).filter((x) => x !== l); if (draft) o._mt.push(l); if (!o._mt.length) delete o._mt;
          } else skip.add(key);
        }
      }
      if (ch) OfflineTR.touchPart(part, { silent: true });
    }
    if (n) { OfflineTR.rebuild(); if (window.UI && UI.render) UI.keepPos(() => UI.render()); }
    return n;
  }
  let busy = false;
  const run = async () => { if (busy) return; busy = true; try { await repair(); } finally { busy = false; } };
  setTimeout(run, 4000);
  window.addEventListener('online', () => { setTimeout(run, 2500); setTimeout(runQueue, 3000); });
  setInterval(run, 10 * 60 * 1000);
  if (window.Store && Store.on) { let t0 = 0; Store.on((w) => { if (w && String(w).startsWith('curriculum')) { clearTimeout(t0); t0 = setTimeout(run, 3000); } }); }

  /* Düz metni seçili dil(ler)de göster: kaynak adları sözlükten, diğerleri önbellekli çeviriyle */
  function obj(s) { const o = (window.SOURCE_I18N || {})[s]; if (o) return o; return { tr: str(s, 'tr'), en: str(s, 'en'), ar: str(s, 'ar') }; }
  function ptx(s) { if (s == null || s === '') return ''; const o = (window.SOURCE_I18N || {})[s]; if (o) return UI.tx(o); const l1 = cur(), l2 = UI.lang2 ? UI.lang2() : ''; const x = {}; x[l1] = str(s, l1); if (l2) x[l2] = str(s, l2); return UI.tx(x); }
  function pl(s, l) { if (s == null || s === '') return ''; const o = (window.SOURCE_I18N || {})[s]; return o ? o[l] || s : str(s, l); }
  window.LangGuard = { wrong, str, ptx, pl, obj, repair: run, words: trWords, srcLang };
})();
