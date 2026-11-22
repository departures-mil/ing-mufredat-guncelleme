/* v1.2: Fotoğraftan kelime bilgisi — internetsiz yazı tanıma (Tesseract, vendor/ocr) ve sözlük sayfası ayrıştırma.
   Oxford Learner's Dictionary (OALD) ekran görüntüsünden: kelime, tür, BrE / NAmE fonetik yazım, CEFR seviyesi, ilk anlamın tanımı ve örnek cümle.
   Seviye ve Oxford 3000 / 5000 bilgisi resimde okunamazsa oxford-words.js listesinden tamamlanır. */
(function () {
  const POS = ['modal verb', 'phrasal verb', 'auxiliary verb', 'noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'determiner', 'conjunction', 'exclamation', 'number', 'article', 'linking verb'];
  const POS_RE = new RegExp('^([A-Za-z][A-Za-z\'’\\- ]{0,40}?)[\\s.,]+(' + POS.join('|') + ')\\b', 'i');
  const IPA_RE = /\/([^/\n]{1,48})\//g;
  const BULLET = /^[+•·*●◦»«>¢©-]\s+|^[eo]\s+(?=[A-Z])/;
  const SKIP = /^(verb forms|word forms|idioms|phrasal verbs|word family|collocations|synonyms|extra examples|topics?|see also|opal [sw]|oxford collocations)\b/i;

  // Tesseract'ın fonetik işaretleri okurken yaptığı yaygın hatalar: uzunluk işareti ':' ya da 'z', vurgu işareti "'"
  function fixIpa(s) {
    return s.replace(/:/g, 'ː').replace(/([iuɑɔɜaoe])z(?=[^aeiouəɪʊʌæɒɔɑɜː]|$)/g, '$1ː').replace(/'/g, 'ˈ').replace(/^,/, 'ˌ').replace(/\s+/g, '').trim();
  }
  const cleanSentence = (s) => {
    s = s.replace(/\s+/g, ' ').replace(/^[+•·*●◦»«>¢©\-eo]\s+/, '').trim();
    const m = s.match(/^.*[.!?](?=[^.!?]*$)/); if (m) s = m[0];
    return s.replace(/\s+([.,!?])/g, '$1').trim();
  };

  function parse(text) {
    const lines = String(text || '').split('\n').map((l) => l.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const r = { w: '', pos: '', ipa: '', ipaUS: '', lvl: '', ox: '', def: '', ex: '', raw: text };
    const ipaIdx = lines.findIndex((l) => /\/[^/]{1,48}\//.test(l));
    let hi = -1;
    lines.forEach((l, i) => { if ((ipaIdx < 0 || i < ipaIdx) && POS_RE.test(l) && (hi < 0 || ipaIdx >= 0)) hi = i; });
    if (hi < 0) { const i = lines.findIndex((l) => POS_RE.test(l)); hi = i; }
    if (hi >= 0) { const m = lines[hi].match(POS_RE); r.w = m[1].trim().toLowerCase(); r.pos = m[2].toLowerCase(); }
    const ipas = [];
    for (const l of lines.slice(Math.max(hi, 0))) { let m; IPA_RE.lastIndex = 0; while ((m = IPA_RE.exec(l)) && ipas.length < 2) ipas.push(fixIpa(m[1])); if (ipas.length >= 2) break; }
    r.ipa = ipas[0] || ''; r.ipaUS = ipas[1] && ipas[1] !== ipas[0] ? ipas[1] : '';
    // anlam 1: "1" ile başlayan satır ya da fonetikten sonraki ilk uzun satır
    const start = Math.max(hi, ipaIdx, 0) + 1;
    let si = lines.findIndex((l, i) => i >= start && /^1\s/.test(l));
    if (si < 0) si = lines.findIndex((l, i) => i >= start && !SKIP.test(l) && !BULLET.test(l) && l.length > 30 && !/\/[^/]+\//.test(l));
    const head = lines.slice(Math.max(hi, 0), si < 0 ? lines.length : si + 1).join(' ');
    const lv = head.match(/\b([ABC][12])\b/); if (lv) r.lvl = lv[1].toUpperCase();
    if (si >= 0) {
      const d = [];
      for (let i = si; i < lines.length; i++) { const l = lines[i]; if (i > si && (BULLET.test(l) || /^\d+\s/.test(l) || SKIP.test(l))) break; d.push(l); }
      r.def = d.join(' ').replace(/^1\s+/, '').replace(/\b[ABC][12]\b/g, '').replace(/\[[^\]]*\]/g, '').replace(/^[^A-Za-z(]+/, '').replace(/\s+/g, ' ').trim();
      // örnek: anlamdan sonraki ilk madde imli cümle ("read something / …" gibi kalıplar atlanır)
      const ex = [];
      for (let i = si + d.length; i < lines.length; i++) {
        const l = lines[i];
        if (BULLET.test(l)) { if (ex.length) break; ex.push(l); } else if (ex.length && !/^\d+\s/.test(l)) ex.push(l); else if (/^\d+\s/.test(l)) break;
        if (ex.length && / \/ /.test(ex.join(' '))) ex.length = 0;
      }
      if (ex.length) r.ex = cleanSentence(ex.join(' '));
    }
    if (r.w && window.oxfordLevel) { const o = window.oxfordLevel(r.w); if (o) { r.ox = String(o.list); if (!r.lvl) r.lvl = o.lvl; } }
    return r;
  }

  // Resim: gri tonlama, küçükse büyütme (yazı tanıma doğruluğu için)
  async function prep(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
      const k = img.naturalWidth < 600 ? 2 : 1; // telefon ekran görüntüleri büyütülmeden daha iyi okunuyor
      const c = document.createElement('canvas'); c.width = img.naturalWidth * k; c.height = img.naturalHeight * k;
      const g = c.getContext('2d'); g.filter = 'grayscale(1)'; g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
      return c;
    } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }

  let worker = null, progressFn = null;
  async function getWorker() {
    if (worker) return worker;
    const abs = (p) => new URL(p, location.href).href;
    worker = await Tesseract.createWorker('eng', 1, { workerPath: abs('vendor/ocr/worker.min.js'), corePath: abs('vendor/ocr/'), langPath: abs('vendor/ocr'), gzip: true, cacheMethod: 'none', workerBlobURL: false,
      logger: (m) => { if (progressFn && m.status === 'recognizing text') progressFn(Math.round((m.progress || 0) * 100)); } });
    return worker;
  }

  window.OCR = {
    parse,
    available: () => !!window.Tesseract,
    async read(file, onProgress) {
      progressFn = onProgress || null;
      const [w, c] = await Promise.all([getWorker(), prep(file)]);
      const r = await w.recognize(c);
      return parse(r.data.text);
    },
    // v1.3: düz yazı (toplu materyal yükleme). src: resim dosyası ya da hazır canvas
    async text(src, onProgress) {
      progressFn = onProgress || null;
      const [w, c] = await Promise.all([getWorker(), src instanceof HTMLCanvasElement ? src : prep(src)]);
      return (await w.recognize(c)).data.text || '';
    },
  };
})();
