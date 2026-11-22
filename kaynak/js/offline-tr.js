/* v1.5: Çevrimdışı çeviri — internet yoksa çeviri hemen buradan yapılır.
   1) Çeviri hafızası: uygulamadaki tüm hazır üç dilli metinler (arayüz + üç programın müfredatı + kullanıcının çevrilmiş metinleri).
   2) Terim sözlüğü (glossary.js) + hafızadaki kısa ifadeler: terim terim çeviri, Türkçe ek ayıklama ile.
   3) Çevrimdışı üretilen çeviriler "taslak" olarak işaretlenir (_mt); internet gelince otomatik olarak internetten yeniden çevrilir. */
(function () {
  const LANGS = ['tr', 'en', 'ar'];
  const low = (s, l) => String(s || '').toLocaleLowerCase(l === 'tr' ? 'tr' : l === 'en' ? 'en' : undefined);
  const norm = (s, l) => low(s, l).replace(/[“”"«»]/g, '').replace(/\s+/g, ' ').trim();
  const detect = (s) => (/[؀-ۿ]/.test(s) ? 'ar' : /[çğıöşüÇĞİÖŞÜ]/.test(s) || /\b(ve|ile|için|bir|bu|olan)\b/i.test(s) ? 'tr' : 'en');

  /* ---------- çeviri hafızası ---------- */
  let TM = null; // { tr: Map(normMetin -> {tr,en,ar}), en: Map, ar: Map }
  let PH = null; // ifade sözlüğü: { tr: Map(norm -> entry), ... } + en uzun ifade uzunluğu
  let maxN = 1;
  function addTri(o) {
    if (!o || typeof o !== 'object' || !o.tr || !o.en || !o.ar || o._mt) return;
    if (o.en === o.tr && o.ar === o.tr) return;
    for (const l of LANGS) { const k = norm(o[l], l); if (k && !TM[l].has(k)) TM[l].set(k, o); }
  }
  function walkCur(c) {
    if (!c) return;
    addTri(c.title);
    (c.levels || []).forEach((lv) => { addTri(lv.title); addTri(lv.prereq); addTri(lv.goal); (lv.modules || []).forEach((m) => { addTri(m.title); (m.items || []).forEach((it) => addTri(it.text)); }); });
    (c.flight || []).forEach((f) => { addTri(f.content); addTri(f.cond); });
    (c.ranks || []).forEach((r) => addTri(r.name)); (c.paths || []).forEach((p) => addTri(p.name));
  }
  function build() {
    TM = { tr: new Map(), en: new Map(), ar: new Map() }; PH = { tr: new Map(), en: new Map(), ar: new Map() }; maxN = 1;
    // kullanıcının kendi müfredatı önce (en güncel), sonra varsayılanlar
    try { const db = Store.db; walkCur(db.curriculum); Object.values(db.curricula || {}).forEach(walkCur); (db.config.ranks || []).forEach((r) => addTri(r.name)); (db.config.paths || []).forEach((p) => addTri(p.name)); } catch (e) {}
    try { walkCur(window.DEFAULT_DATA && DEFAULT_DATA.curriculum); Object.values(window.DEFAULT_PROGRAMS || {}).forEach(walkCur); } catch (e) {}
    try { if (window.I18N && I18N.tr) for (const k of Object.keys(I18N.tr)) { const v = I18N.tr[k]; if (typeof v === 'string' && !/[<{]/.test(v)) addTri({ tr: v, en: I18N.en[k], ar: I18N.ar[k] }); } } catch (e) {}
    // ifade sözlüğü: terimler + hafızadaki 1-5 sözcüklük kısa metinler
    const addPh = (o, strong) => {
      for (const l of LANGS) {
        const k = norm(o[l], l).replace(/[.,;:!?]+$/, ''); if (!k) continue;
        const n = k.split(' ').length; if (n > 5) continue;
        if (strong || !PH[l].has(k)) PH[l].set(k, o); if (n > maxN) maxN = n;
      }
    };
    for (const l of LANGS) TM[l].forEach((o) => addPh(o, false));
    (window.GLOSSARY || []).forEach(([tr, en, ar]) => addPh({ tr, en, ar }, true));
  }
  const ensure = () => { if (!TM) build(); };

  /* ---------- kök bulma (Türkçe ekleri ayıklama) ---------- */
  const TR_SUF = ['lerinin', 'larının', 'lerinde', 'larında', 'lerden', 'lardan', 'lerini', 'larını', 'leriyle', 'larıyla', 'lerine', 'larına', 'nden', 'ndan', 'ları', 'leri', 'ların', 'lerin', 'lar', 'ler', 'sının', 'sinin', 'ının', 'inin', 'unun', 'ünün', 'nın', 'nin', 'nun', 'nün', 'yla', 'yle', 'dan', 'den', 'tan', 'ten', 'nda', 'nde', 'sına', 'sine', 'ına', 'ine', 'una', 'üne', 'ya', 'ye', 'da', 'de', 'ta', 'te', 'la', 'le', 'sı', 'si', 'su', 'sü', 'ın', 'in', 'un', 'ün', 'yı', 'yi', 'yu', 'yü', 'ı', 'i', 'u', 'ü', 'a', 'e', 'dır', 'dir', 'dur', 'dür', 'tır', 'tir', 'lık', 'lik', 'luk', 'lük', 'ki'];
  const soften = (w) => w.replace(/ğ$/, 'k').replace(/b$/, 'p').replace(/c$/, 'ç').replace(/d$/, 't');
  function stems(w, l) {
    const out = [w];
    if (l === 'tr') {
      let cur = [w];
      for (let pass = 0; pass < 3; pass++) {
        const nx = [];
        for (const c of cur) for (const s of TR_SUF) if (c.length - s.length >= 2 && c.endsWith(s)) { const b = c.slice(0, -s.length); nx.push(b, soften(b)); }
        nx.forEach((x) => out.includes(x) || out.push(x)); cur = nx; if (!nx.length) break;
      }
    } else if (l === 'en') {
      if (w.endsWith('ies')) out.push(w.slice(0, -3) + 'y');
      if (w.endsWith('es')) out.push(w.slice(0, -2));
      if (w.endsWith('s')) out.push(w.slice(0, -1));
      if (w.endsWith('ing')) out.push(w.slice(0, -3), w.slice(0, -3) + 'e');
      if (w.endsWith('ed')) out.push(w.slice(0, -2), w.slice(0, -1));
    } else if (l === 'ar') {
      if (w.startsWith('ال')) out.push(w.slice(2));
      if (w.startsWith('و')) out.push(w.slice(1));
    }
    return out;
  }
  function lookupWord(w, from) { for (const s of stems(w, from)) { const e = PH[from].get(s); if (e) { lookupWord.stem = s; return e; } } return null; }
  const FN = new Set(['ve', 'veya', 'ile', 'için', 'gibi', 'ya da', 'de', 'da', 'ama', 'fakat', 'and', 'or', 'with', 'for', 'of', 'the', 'a', 'an']);

  /* ---------- benzerlik (bulanık hafıza) ---------- */
  const toks = (s, l) => norm(s, l).split(/[^\p{L}\p{N}]+/u).filter((x) => x.length > 1);
  function fuzzy(text, from) {
    const A = new Set(toks(text, from)); if (A.size < 3) return null;
    let best = null, bs = 0;
    TM[from].forEach((o, k) => {
      const B = toks(k, from); if (Math.abs(B.length - A.size) > 3) return;
      let inter = 0; B.forEach((x) => A.has(x) && inter++);
      const d = (2 * inter) / (A.size + B.length); if (d > bs) { bs = d; best = o; }
    });
    return bs >= 0.86 ? best : null;
  }

  /* ---------- terim terim çeviri ---------- */
  function phraseTranslate(seg, from, to) {
    const words = seg.trim().split(/\s+/).filter(Boolean); const out = []; const meta = [];
    for (let i = 0; i < words.length;) {
      let hit = null, used = 1;
      for (let n = Math.min(maxN, words.length - i); n >= 1; n--) {
        const raw = words.slice(i, i + n).join(' ');
        const k = norm(raw, from).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
        if (!k) break;
        let e = PH[from].get(k); let poss = false;
        if (!e && n === 1) { lookupWord.stem = ''; e = lookupWord(k, from); if (e && from === 'tr' && lookupWord.stem && lookupWord.stem !== k && /(?:s?[ıiuü]|l[ae]r[ıi])$/.test(k)) poss = true; }
        if (e) meta.push({ poss, fn: FN.has(k) });
        if (!e && n > 1) { const parts = k.split(' '); const last = parts.pop(); for (const s of stems(last, from).slice(1)) { e = PH[from].get(parts.concat(s).join(' ')); if (e) break; } }
        if (e) { hit = e; used = n; break; }
      }
      const w = words.slice(i, i + used).join(' ');
      const lead = (w.match(/^[^\p{L}\p{N}]+/u) || [''])[0]; const trail = (w.match(/[^\p{L}\p{N}]+$/u) || [''])[0];
      if (hit) { const v = hit[to]; out.push(v ? lead + v + trail : ''); }
      else { out.push(w); meta.push({ poss: false, fn: false }); } // bilinmeyen sözcük (çoğu zaman teknik/özel ad) olduğu gibi kalır
      i += used;
    }
    // Türkçe tamlama (pervane balansı) → Arapça izafet sırası (موازنة المروحة): tamlanan öne alınır
    if (from === 'tr' && to === 'ar') for (let i = 1; i < out.length; i++) if (meta[i] && meta[i].poss && meta[i - 1] && !meta[i - 1].fn && out[i - 1] && out[i]) { const x = out[i - 1]; out[i - 1] = out[i]; out[i] = x; meta[i].poss = false; }
    let s = out.filter(Boolean).join(' ').replace(/\s+([,.;:!?])/g, '$1');
    if (to === 'ar') s = s.replace(/(^|\s)و\s+/g, '$1و').replace(/,/g, '،').replace(/;/g, '؛').replace(/\?/g, '؟');
    return s;
  }

  function translate(text, from, to) {
    ensure();
    if (!text || !String(text).trim()) return { text, draft: false };
    if (!from || from === 'auto') from = detect(text);
    if (from === to) return { text, draft: false };
    const exact = TM[from].get(norm(text, from)); if (exact && exact[to]) return { text: exact[to], draft: false };
    const fz = fuzzy(text, from); if (fz && fz[to]) return { text: fz[to], draft: true };
    // parçalara ayır: ayraçlar korunur, her parça önce hafızada aranır
    const segs = String(text).split(/(\s*[:;()–—/]\s*|\s*,\s*|\.\s+)/);
    const res = segs.map((sg, i) => {
      if (i % 2 === 1) return to === 'ar' ? sg.replace(/,/g, '،').replace(/;/g, '؛') : sg;
      if (!sg.trim()) return sg;
      const ex = TM[from].get(norm(sg, from)); if (ex && ex[to]) return ex[to];
      return phraseTranslate(sg, from, to);
    }).join('');
    const fin = to === 'en' ? res.replace(/^\s*\p{Ll}/u, (c) => c.toUpperCase()) : res;
    return { text: fin, draft: true };
  }

  /* ---------- internet / çevrimdışı birleşik çeviri ---------- */
  const online = window.translateText;
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  const drafts = new Set();
  let toastT = 0;
  window.translateText = async function (text, from, to) {
    if (!text || !String(text).trim() || from === to) return text;
    text = window.plainText ? plainText(text) : text;
    if (navigator.onLine !== false) {
      try { const r = await withTimeout(online(text, from, to), 7000); if (r && String(r).trim()) return r; } catch (e) { /* çevrimdışı yola geç */ }
    }
    const r = translate(text, from, to);
    if (r.draft) { drafts.add(r.text); scheduleMark(); if (Date.now() - toastT > 15000 && window.UI) { toastT = Date.now(); UI.toast(t('mtOffline')); } }
    return r.text;
  };

  /* Çevrimdışı üretilen metinleri "taslak" (_mt) olarak işaretle */
  function triObjs(c) {
    const out = []; const add = (o) => o && typeof o === 'object' && out.push(o);
    if (!c) return out;
    add(c.title);
    (c.levels || []).forEach((lv) => { add(lv.title); add(lv.prereq); add(lv.goal); (lv.modules || []).forEach((m) => { add(m.title); (m.items || []).forEach((it) => add(it.text)); }); });
    (c.flight || []).forEach((f) => { add(f.content); add(f.cond); });
    (c.ranks || []).forEach((r) => add(r.name)); (c.paths || []).forEach((p) => add(p.name));
    return out;
  }
  function parts() {
    const db = Store.db; const P = [['curriculum', db.curriculum]];
    Object.keys(db.curricula || {}).forEach((k) => P.push(['curriculum_' + k, db.curricula[k]]));
    P.push(['config', { ranks: db.config.ranks, paths: db.config.paths }]);
    return P;
  }
  const touchPart = (part, o) => (part === 'curriculum' ? Store.inProg('genel', () => Store.touch(part, o)) : Store.touch(part, o));
  let mt = null;
  function scheduleMark() { clearTimeout(mt); mt = setTimeout(markDrafts, 2500); }
  function markDrafts() {
    if (!drafts.size) return;
    for (const [part, c] of parts()) {
      let ch = false;
      for (const o of triObjs(c)) for (const l of LANGS) if (o[l] && drafts.has(o[l])) { o._mt = Array.from(new Set([...(o._mt || []), l])); ch = true; }
      if (ch) touchPart(part, { silent: true });
    }
    drafts.clear(); TM = null;
  }
  /* İnternet gelince taslakları internetten yeniden çevir */
  let busy = false;
  async function upgrade() {
    if (busy || navigator.onLine === false || !Store.db) return; busy = true;
    try {
      for (const [part, c] of parts()) {
        let ch = false;
        for (const o of triObjs(c)) {
          if (!o._mt || !o._mt.length) continue;
          const src = LANGS.find((l) => o[l] && !o._mt.includes(l)); if (!src) { delete o._mt; ch = true; continue; }
          const left = [];
          for (const l of o._mt) { try { const r = await withTimeout(online(o[src], src, l), 7000); if (r && String(r).trim()) { o[l] = r; ch = true; } else left.push(l); } catch (e) { left.push(l); } }
          if (left.length) o._mt = left; else { delete o._mt; ch = true; }
          if (left.length && left.length === o._mt.length && !ch) break; // internet yine yok
        }
        if (ch) touchPart(part);
      }
    } finally { busy = false; TM = null; }
  }
  window.addEventListener('online', () => setTimeout(upgrade, 2000));
  setTimeout(upgrade, 15000); setInterval(upgrade, 5 * 60 * 1000);
  if (window.Store && Store.on) Store.on((w) => { if (w && String(w).startsWith('curriculum')) TM = null; });

  window.OfflineTR = { translate, detect, online: (s, f, to) => withTimeout(online(s, f, to), 7000), parts, triObjs, touchPart, rebuild: () => (TM = null), upgrade, stats: () => { ensure(); return { memory: TM.tr.size, phrases: PH.tr.size, glossary: (window.GLOSSARY || []).length }; } };
})();
