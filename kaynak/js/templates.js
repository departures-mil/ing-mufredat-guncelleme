/* Antetli kâğıt şablonları: PDF / DOCX / görsel → A4 arka plan görseli (IndexedDB'de saklanır)
   v1.7: Orijinal görüntü asla esnetilmez ya da kesilmez — gerçek sayfa oranı korunur, A4'e ortalanır.
   Antetin üst/alt dolu bölgeleri taranır ve yazı alanı (üst/alt boşluk) otomatik önerilir.
   Her şablonda ince ayar (dx, dy mm; sc ölçek) saklanır; orijinal dosya da yeniden işlemek için tutulur. */
(function () {
  const DBN = 'ingmufredat_templates', ST = 'tpl';
  const W = 1240, H = 1754; // A4 @150 dpi
  const PX_MM = W / 210;
  const open = () => new Promise((res, rej) => { const r = indexedDB.open(DBN, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction(ST, mode); const st = t.objectStore(ST); const out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); }); };

  const canvasToData = (c) => c.toDataURL('image/jpeg', 0.92);
  const landscapeOf = (w, h) => w > h;

  /* Kaynağı A4 tuvale oranını bozmadan yerleştirir. A4 oranındaysa (±%2) tam sayfa; değilse ortalanır. */
  function placeOnA4(src, sw, sh) {
    const land = landscapeOf(sw, sh);
    const c = document.createElement('canvas'); c.width = land ? H : W; c.height = land ? W : H;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const r = Math.min(c.width / sw, c.height / sh);
    const same = Math.abs(sw / sh - c.width / c.height) < 0.02;
    const dw = same ? c.width : Math.round(sw * r), dh = same ? c.height : Math.round(sh * r);
    g.drawImage(src, Math.round((c.width - dw) / 2), Math.round((c.height - dh) / 2), dw, dh);
    return { canvas: c, landscape: land };
  }

  /* Antetin dolu bölgelerini bul: üstte son koyu satır (çizgi/amblem/başlık), altta ilk koyu satır.
     Açık renkli filigran desenleri (çok açık gri) sayılmaz. Sonuç mm cinsinden önerilen boşluklardır. */
  function analyse(canvas) {
    const g = canvas.getContext('2d'); const w = canvas.width, h = canvas.height;
    const d = g.getImageData(0, 0, w, h).data; const pxmm = w / (w > h ? 297 : 210);
    const rowInk = (y) => { let n = 0; for (let x = 0; x < w; x += 2) { const i = (y * w + x) * 4; const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; if (l < 205) n++; } return n / (w / 2); };
    let top = 0; for (let y = 0; y < Math.round(h * 0.4); y++) if (rowInk(y) > 0.004) top = y;
    let bot = h; for (let y = h - 1; y > Math.round(h * 0.75); y--) if (rowInk(y) > 0.004) bot = y;
    const mt = top ? Math.round(top / pxmm + 7) : 12;
    const mb = bot < h ? Math.round((h - bot) / pxmm + 7) : 12;
    return { mt: Math.min(Math.max(mt, 10), 120), mb: Math.min(Math.max(mb, 10), 80) };
  }

  async function fromImage(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      return placeOnA4(img, img.naturalWidth, img.naturalHeight);
    } finally { URL.revokeObjectURL(url); }
  }
  async function fromPdf(file) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const page = await pdf.getPage(1);
    const vp0 = page.getViewport({ scale: 1 });
    const land = landscapeOf(vp0.width, vp0.height);
    const scale = ((land ? H : W) / vp0.width) * 1.5; // yüksek çözünürlükte çiz, sonra yerleştir
    const vp = page.getViewport({ scale });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: g, viewport: vp }).promise;
    return placeOnA4(c, c.width, c.height);
  }
  async function fromDocx(file, removeBody) {
    // Görünür alanın arkasında, kırpılmadan ve gerçek sayfa boyutunda çizilir (eski sürümde ekran dışı çizim sağ tarafı kesiyordu)
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:auto;background:#fff;z-index:-9999;pointer-events:none;opacity:1';
    document.body.appendChild(host);
    try {
      await docxPreview.renderAsync(await file.arrayBuffer(), host, host, { inWrapper: false, ignoreWidth: false, ignoreHeight: false, renderHeaders: true, renderFooters: true, breakPages: true, experimental: true, useBase64URL: true, ignoreLastRenderedPageBreak: true });
      await new Promise((r) => setTimeout(r, 400));
      const sec = host.querySelector('section.docx') || host.querySelector('section');
      if (!sec) throw new Error('DOCX okunamadı');
      host.querySelectorAll('section').forEach((s) => { if (s !== sec) s.remove(); });
      if (removeBody) { const art = sec.querySelector('article'); if (art) art.querySelectorAll(':scope > *').forEach((el) => { if (!el.querySelector('img,svg,.docx-wrapper-image')) el.style.visibility = 'hidden'; }); }
      const imgs = [...sec.querySelectorAll('img')]; await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
      sec.style.margin = '0'; sec.style.overflow = 'hidden';
      const w = sec.offsetWidth, h = sec.offsetHeight;
      const land = landscapeOf(w, h);
      const canvas = await html2canvas(sec, { scale: ((land ? H : W) / w) * 1.25, backgroundColor: '#ffffff', useCORS: true, logging: false, x: 0, y: 0, scrollX: 0, scrollY: 0, width: w, height: h, windowWidth: Math.max(w, window.innerWidth), windowHeight: Math.max(h, window.innerHeight) });
      return placeOnA4(canvas, canvas.width, canvas.height);
    } finally { host.remove(); }
  }

  /* v1.7: DOCX antet çizici — üst bilgideki yüzen nesneleri (metin kutusu, resim, şekil, filigran) Word'deki
     gerçek konum ve ölçüleriyle A4 tuvale yerleştirir. docx-preview yüzen nesneleri doğru konumlayamadığı için. */
  async function fromDocxLayout(file) {
    if (!window.JSZip) return null;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const rd = async (p) => { const f = zip.file(p); return f ? f.async('string') : null; };
    const doc = await rd('word/document.xml'); if (!doc) return null;
    const P = new DOMParser();
    const dx = P.parseFromString(doc, 'application/xml');
    const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const sect = [...dx.getElementsByTagNameNS(W_NS, 'sectPr')].pop(); if (!sect) return null;
    const num = (el, at) => (el ? +el.getAttributeNS(W_NS, at) || 0 : 0);
    const pgSz = sect.getElementsByTagNameNS(W_NS, 'pgSz')[0], pgMar = sect.getElementsByTagNameNS(W_NS, 'pgMar')[0];
    const twMM = (v) => v / 56.6929;
    const pageW = twMM(num(pgSz, 'w') || 11906), pageH = twMM(num(pgSz, 'h') || 16838);
    const mL = twMM(num(pgMar, 'left')), mT = twMM(num(pgMar, 'top')), hdr = twMM(num(pgMar, 'header') || 720);
    const titlePg = sect.getElementsByTagNameNS(W_NS, 'titlePg').length > 0;
    const refs = [...sect.getElementsByTagNameNS(W_NS, 'headerReference')];
    const ref = (titlePg && refs.find((r) => r.getAttributeNS(W_NS, 'type') === 'first')) || refs.find((r) => r.getAttributeNS(W_NS, 'type') === 'default') || refs[0];
    if (!ref) return null;
    const rels = P.parseFromString((await rd('word/_rels/document.xml.rels')) || '<r/>', 'application/xml');
    const relT = (xml, id) => { const r = [...xml.getElementsByTagName('Relationship')].find((x) => x.getAttribute('Id') === id); return r ? r.getAttribute('Target') : null; };
    const hPath = 'word/' + relT(rels, ref.getAttributeNS(R_NS, 'id'));
    const hXml = await rd(hPath); if (!hXml) return null;
    if (!/<wp:anchor|<v:shape/.test(hXml)) return null; // yüzen nesne yoksa normal çizici yeterli
    const hRels = P.parseFromString((await rd(hPath.replace(/word\/(.*)$/, 'word/_rels/$1.rels'))) || '<r/>', 'application/xml');
    const hx = P.parseFromString(hXml, 'application/xml');
    // tema yazı tipleri
    const theme = (await rd('word/theme/theme1.xml')) || '';
    const thMaj = (theme.match(/<a:majorFont>[\s\S]*?<a:latin typeface="([^"]+)"/) || [])[1] || 'Times New Roman';
    const thMin = (theme.match(/<a:minorFont>[\s\S]*?<a:latin typeface="([^"]+)"/) || [])[1] || 'Calibri';
    const thMajAr = (theme.match(/<a:majorFont>[\s\S]*?script="Arab" typeface="([^"]+)"/) || [])[1] || 'Times New Roman';
    const fontOf = (rf) => { if (!rf) return thMin; const g = (a) => rf.getAttributeNS(W_NS, a); const th = g('cstheme') || g('asciiTheme'); if (th) return /major/i.test(th) ? (/Bidi/.test(th) ? thMajAr : thMaj) : thMin; return g('ascii') || g('cs') || thMin; };
    const c = document.createElement('canvas'); const land = pageW > pageH; c.width = land ? H : W; c.height = Math.round(c.width * pageH / pageW);
    const k = c.width / pageW; // px / mm
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    const emu = (v) => (+v || 0) / 36000; // mm
    const loadImg = async (rid) => { const tg = relT(hRels, rid); if (!tg) return null; const f = zip.file('word/' + tg.replace(/^\.\//, '')); if (!f) return null; const url = URL.createObjectURL(await f.async('blob')); const im = new Image(); await new Promise((r) => { im.onload = im.onerror = r; im.src = url; }); return im.naturalWidth ? im : null; };
    const frameX = (rel) => (rel === 'page' ? 0 : mL);
    const frameW = (rel) => (rel === 'page' ? pageW : pageW - mL - twMM(num(pgMar, 'right')));
    let effTopRef = mT; const frameY = (rel, node) => (rel === 'page' || rel === 'topMargin' ? 0 : rel === 'margin' ? effTopRef : anchorParaY(node));
    // Paragraf biçimleri: doğrudan ayar → paragraf stili zinciri → varsayılan paragraf stili → belge varsayılanı
    const sx = P.parseFromString((await rd('word/styles.xml')) || '<w:styles xmlns:w="' + W_NS + '"/>', 'application/xml');
    const styles = {}; let defStyle = null;
    for (const se of sx.getElementsByTagNameNS(W_NS, 'style')) { const id = se.getAttributeNS(W_NS, 'styleId'); styles[id] = se; if (se.getAttributeNS(W_NS, 'type') === 'paragraph' && se.getAttributeNS(W_NS, 'default') === '1') defStyle = id; }
    const dd = sx.getElementsByTagNameNS(W_NS, 'docDefaults')[0];
    const firstAttr = (el, tag, at) => { if (!el) return null; const e = el.getElementsByTagNameNS(W_NS, tag)[0]; return e && e.getAttributeNS(W_NS, at) !== '' && e.hasAttributeNS(W_NS, at) ? e.getAttributeNS(W_NS, at) : null; };
    const styleVal = (id, tag, at, depth) => { let cur = id; for (let i = 0; cur && i < 10; i++) { const se = styles[cur]; if (!se) break; const v = firstAttr(se, tag, at); if (v != null) return v; const b = se.getElementsByTagNameNS(W_NS, 'basedOn')[0]; cur = b ? b.getAttributeNS(W_NS, 'val') : null; } return null; };
    const pv = (pPr, tag, at, dflt) => { const d = firstAttr(pPr, tag, at); if (d != null) return d; const ps = pPr && pPr.getElementsByTagNameNS(W_NS, 'pStyle')[0]; const sid = ps ? ps.getAttributeNS(W_NS, 'val') : defStyle; const v = styleVal(sid, tag, at); if (v != null) return v; const v2 = sid !== defStyle ? styleVal(defStyle, tag, at) : null; if (v2 != null) return v2; const v3 = firstAttr(dd, tag, at); return v3 != null ? v3 : dflt; };
    const paraBox = (pp) => {
      const pPr = pp.getElementsByTagNameNS(W_NS, 'pPr')[0];
      const runs = [...pp.getElementsByTagNameNS(W_NS, 'r')];
      const rPr = (runs.length ? runs[0].getElementsByTagNameNS(W_NS, 'rPr')[0] : null) || (pPr && pPr.getElementsByTagNameNS(W_NS, 'rPr')[0]);
      const szD = firstAttr(rPr, 'sz', 'val'); const sz = +(szD != null ? szD : pv(null, 'sz', 'val', 22));
      const line = +pv(pPr, 'spacing', 'line', 240), rule = pv(pPr, 'spacing', 'lineRule', 'auto');
      const after = +pv(pPr, 'spacing', 'after', 0), before = +pv(pPr, 'spacing', 'before', 0);
      const fsMM = (sz / 2) * 25.4 / 72;
      const lhMM = rule === 'auto' ? fsMM * 1.15 * (line / 240) : Math.max(twMM(line), rule === 'atLeast' ? fsMM * 1.15 : 0);
      return { pPr, runs, rPr, sz, fsMM, lhMM, afterMM: twMM(after), beforeMM: twMM(before) };
    };
    // Üst bilgi gövdesinin gerçek yüksekliği: Word'de gövde (ve "kenar boşluğu"na göre konumlanan nesneler) buna göre aşağı iner
    const hdrRoot = hx.documentElement; const topParas = [...hdrRoot.childNodes].filter((n) => n.localName === 'p');
    const paraTop = new Map(); let accY = hdr;
    for (const tp of topParas) { const b = paraBox(tp); paraTop.set(tp, accY + b.beforeMM); accY += b.beforeMM + b.lhMM + b.afterMM; }
    const effTop = Math.max(mT, accY);
    const anchorParaY = (node) => { let p = node; while (p && p.parentNode !== hdrRoot) p = p.parentNode; return p && paraTop.has(p) ? paraTop.get(p) : hdr; };
    const items = [];
    // 1) VML filigran / resimler (mc:Fallback dışındakiler)
    for (const sh of hx.getElementsByTagName('v:shape')) {
      if (sh.closest && sh.closest('mc\\:Fallback, Fallback')) continue;
      let p = sh.parentNode, inFb = false; while (p) { if (p.localName === 'Fallback') { inFb = true; break; } p = p.parentNode; } if (inFb) continue;
      const im = sh.getElementsByTagName('v:imagedata')[0]; if (!im) continue;
      const st = {}; (sh.getAttribute('style') || '').split(';').forEach((kv) => { const [a, b] = kv.split(':'); if (a && b) st[a.trim()] = b.trim(); });
      const pt = (v) => (v ? (parseFloat(v) * 25.4) / 72 : 0);
      const hr = st['mso-position-horizontal-relative'] || 'text', vr = st['mso-position-vertical-relative'] || 'text';
      const wmm = pt(st.width), hmm = pt(st.height);
      let x = frameX(hr === 'page' ? 'page' : 'margin') + pt(st['margin-left']) + pt(st.left);
      let y = (vr === 'page' ? 0 : vr === 'margin' ? effTop : anchorParaY(sh)) + pt(st['margin-top']) + pt(st.top);
      if (st['mso-position-horizontal'] === 'center') x = frameX(hr === 'page' ? 'page' : 'margin') + (frameW(hr === 'page' ? 'page' : 'margin') - wmm) / 2;
      if (st['mso-position-vertical'] === 'center') y = (vr === 'page' ? 0 : effTop) + ((vr === 'page' ? pageH : pageH - effTop) - hmm) / 2;
      items.push({ z: +(st['z-index'] || 0) - 1e10, kind: 'img', rid: im.getAttribute('r:id'), x, y, w: wmm, h: hmm });
    }
    // 2) DrawingML yüzen nesneler
    for (const an of hx.getElementsByTagName('wp:anchor')) {
      let p = an.parentNode, inFb = false; while (p) { if (p.localName === 'Fallback') { inFb = true; break; } p = p.parentNode; } if (inFb) continue;
      const ext = an.getElementsByTagName('wp:extent')[0]; const wmm = emu(ext.getAttribute('cx')), hmm = emu(ext.getAttribute('cy'));
      const ph = an.getElementsByTagName('wp:positionH')[0], pv = an.getElementsByTagName('wp:positionV')[0];
      const hr = ph.getAttribute('relativeFrom'), vr = pv.getAttribute('relativeFrom');
      const ho = ph.getElementsByTagName('wp:posOffset')[0], vo = pv.getElementsByTagName('wp:posOffset')[0];
      const ha = ph.getElementsByTagName('wp:align')[0], va = pv.getElementsByTagName('wp:align')[0];
      effTopRef = effTop;
      let x = frameX(hr) + (ho ? emu(ho.textContent) : 0), y = frameY(vr, an) + (vo ? emu(vo.textContent) : 0);
      if (ha) { const a = ha.textContent, fw = frameW(hr); x = frameX(hr) + (a === 'center' ? (fw - wmm) / 2 : a === 'right' ? fw - wmm : 0); }
      if (va) { const a = va.textContent, fh = vr === 'page' ? pageH : pageH - effTop; y = frameY(vr, an) + (a === 'center' ? (fh - hmm) / 2 : a === 'bottom' ? fh - hmm : 0); }
      const z = (an.getAttribute('behindDoc') === '1' ? -1e9 : 0) + (+an.getAttribute('relativeHeight') || 0);
      const blip = an.getElementsByTagName('a:blip')[0];
      const tb = an.getElementsByTagName('w:txbxContent')[0];
      const fill = an.getElementsByTagName('a:solidFill')[0];
      if (blip) items.push({ z, kind: 'img', rid: blip.getAttribute('r:embed'), x, y, w: wmm, h: hmm });
      else if (tb) { const bp = an.getElementsByTagName('wps:bodyPr')[0]; items.push({ z, kind: 'text', tb, bp, x, y, w: wmm, h: hmm }); }
      else if (fill) { const clr = fill.getElementsByTagName('a:srgbClr')[0]; items.push({ z, kind: 'rect', color: '#' + (clr ? clr.getAttribute('val') : '000000'), x, y, w: wmm, h: Math.max(hmm, 0.3) }); }
    }
    items.sort((a, b) => a.z - b.z);

    for (const it of items) {
      const X = it.x * k, Y = it.y * k, Wd = it.w * k, Ht = it.h * k;
      if (it.kind === 'img') { const im = await loadImg(it.rid); if (im) g.drawImage(im, X, Y, Wd, Ht); }
      else if (it.kind === 'rect') { g.fillStyle = it.color; g.fillRect(X, Y, Wd, Ht); }
      else if (it.kind === 'text') {
        const ins = (a, d) => emu(it.bp && it.bp.getAttribute(a) != null ? it.bp.getAttribute(a) : d) * k;
        const l = ins('lIns', 91440), r = ins('rIns', 91440), tI = ins('tIns', 45720), bI = ins('bIns', 45720);
        const paras = [...it.tb.getElementsByTagNameNS(W_NS, 'p')].map((pp) => {
          const B = paraBox(pp); const pPr = B.pPr, rPr = B.rPr;
          const text = B.runs.map((rn) => [...rn.getElementsByTagNameNS(W_NS, 't')].map((t) => t.textContent).join('')).join('');
          const font = fontOf(rPr && rPr.getElementsByTagNameNS(W_NS, 'rFonts')[0]);
          const bEl = rPr && rPr.getElementsByTagNameNS(W_NS, 'b')[0]; const bold = !!(bEl && bEl.getAttributeNS(W_NS, 'val') !== '0' && bEl.getAttributeNS(W_NS, 'val') !== 'false');
          const colEl = rPr && rPr.getElementsByTagNameNS(W_NS, 'color')[0]; const color = colEl && colEl.getAttributeNS(W_NS, 'val') && colEl.getAttributeNS(W_NS, 'val') !== 'auto' ? '#' + colEl.getAttributeNS(W_NS, 'val') : '#000';
          const jc = pv(pPr, 'jc', 'val', 'left');
          return { text, fs: B.fsMM * k, font, bold, color, jc, lh: B.lhMM * k, after: B.afterMM * k, before: B.beforeMM * k, rtl: /[\u0600-\u06FF]/.test(text) };
        });
        const total = paras.reduce((a, q) => a + q.before + q.lh + q.after, 0);
        const anchor = it.bp ? it.bp.getAttribute('anchor') : 't';
        const free = Ht - tI - bI - total; // içerik kutudan taşarsa Word üstten başlatır
        let cy = Y + tI + (free > 0 ? (anchor === 'ctr' ? free / 2 : anchor === 'b' ? free : 0) : 0);
        g.save(); g.beginPath(); g.rect(X, Y, Wd, Ht); g.clip();
        for (const q of paras) {
          if (q.text.trim()) {
            g.font = `${q.bold ? 'bold ' : ''}${q.fs}px "${q.font}", ${q.rtl ? '"Arial", "Times New Roman", "Tahoma"' : '"Times New Roman", "Liberation Serif"'}, serif`;
            g.fillStyle = q.color; g.direction = q.rtl ? 'rtl' : 'ltr'; g.textBaseline = 'alphabetic';
            const a = q.jc === 'center' ? 'center' : q.jc === 'right' || (q.rtl && (q.jc === 'left' || q.jc === 'start' || q.jc === 'both')) ? 'right' : 'left';
            g.textAlign = a;
            const tx = a === 'center' ? X + l + (Wd - l - r) / 2 : a === 'right' ? X + Wd - r : X + l;
            g.fillText(q.text, tx, cy + q.before + q.fs * 0.9); // Word: ek satır aralığı metnin altına eklenir
          }
          cy += q.before + q.lh + q.after;
        }
        g.restore();
      }
    }
    return { canvas: c, landscape: land };
  }

  /* Hazır şablonlar (uygulamayla gelir, silinemez) */
  const builtins = () => (window.BUILTIN_TEMPLATES || []).map((b) => Object.assign({ builtin: true, dx: 0, dy: 0, sc: 1 }, b));

  window.Templates = {
    async list() {
      let own = [];
      try { own = (await tx('readonly', (st) => st.getAll())) || []; } catch (e) { console.error(e); }
      return builtins().concat(own.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)));
    },
    async get(id) {
      if (!id) return null;
      const b = builtins().find((x) => x.id === id); if (b) { const ov = (Store.local.tplAdj || {})[id]; return ov ? Object.assign({}, b, ov) : b; }
      try { return await tx('readonly', (st) => st.get(id)); } catch (e) { return null; }
    },
    async remove(id) { if (builtins().some((x) => x.id === id)) return; return tx('readwrite', (st) => st.delete(id)); },
    /* İnce ayar ve boşluk kaydı (hazır şablonlarda cihazda saklanır) */
    async adjust(id, patch) {
      if (builtins().some((x) => x.id === id)) { Store.local.tplAdj = Store.local.tplAdj || {}; Store.local.tplAdj[id] = Object.assign({}, Store.local.tplAdj[id], patch); Store.saveLocal(); return; }
      const t = await this.get(id); if (!t) return; Object.assign(t, patch); await tx('readwrite', (st) => st.put(t));
    },
    async add(file, name, removeBody) {
      const n = (file.name || '').toLowerCase();
      let r;
      if (n.endsWith('.pdf') || file.type === 'application/pdf') r = await fromPdf(file);
      else if (n.endsWith('.docx')) { try { r = await fromDocxLayout(file); } catch (e) { console.warn('docx layout', e); r = null; } if (!r) r = await fromDocx(file, removeBody); }
      else if (/^image\//.test(file.type) || /\.(png|jpe?g|webp|bmp|gif)$/.test(n)) r = await fromImage(file);
      else throw new Error('PDF, DOCX, PNG ya da JPG seçin');
      const a = analyse(r.canvas);
      const tpl = { id: 'tpl' + Date.now().toString(36), name: name || file.name.replace(/\.[^.]+$/, ''), data: canvasToData(r.canvas), landscape: r.landscape, createdAt: Date.now(), mt: a.mt, mb: a.mb, dx: 0, dy: 0, sc: 1, kind: n.split('.').pop(), src: file };
      await tx('readwrite', (st) => st.put(tpl));
      return tpl;
    },
    analyse, PX_MM,
  };
})();
