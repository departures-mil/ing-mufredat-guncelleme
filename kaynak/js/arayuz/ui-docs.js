/* v1.1: Konu kaynakları — resim galerisi, PDF / DOCX / resim önizleme, antetli yazdırma ve PDF, indirme;
   öğrenciye "verildi" / "birlikte çalışıldı" işaretleri (st.docs[kaynakId] = { g: tarih, w: tarih }). */
(function () {
  const { $, $$, esc, icon, tx, modal, confirmDlg, PAGES, go } = UI;
  const isImg = (r) => /^image\//.test(r.mime || '') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(r.name || '');
  const isPdf = (r) => /pdf/.test(r.mime || '') || /\.pdf$/i.test(r.name || '');
  const isDocx = (r) => /wordprocessingml/.test(r.mime || '') || /\.docx$/i.test(r.name || '');
  const canPrev = (r) => r.kind === 'file' && (isImg(r) || isPdf(r) || isDocx(r));
  const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  const today = () => new Date().toISOString().slice(0, 10);
  const urlCache = new Map();
  async function blobUrl(r) { if (urlCache.has(r.id)) return urlCache.get(r.id); const f = await Files.get(r.id); if (!f) return ''; const u = URL.createObjectURL(f.blob); urlCache.set(r.id, u); return u; }

  /* ---------- öğrenci belge işaretleri ---------- */
  const mark = (st, rid) => (st && st.docs && st.docs[rid]) || {};
  function toggleMark(st, rid, k) {
    st.docs = st.docs || {}; const m = Object.assign({}, st.docs[rid]);
    if (m[k]) delete m[k]; else m[k] = today();
    if (!m.g && !m.w) delete st.docs[rid]; else st.docs[rid] = m;
    Store.touch('student:' + st.id, { silent: true });
  }
  const tickBtns = (st, r) => { const m = mark(st, r.id); return `<span class="dticks"><button class="dtick g ${m.g ? 'on' : ''}" data-tk="g" title="${t('docGiven')}${m.g ? ' · ' + UI.fmtDate(m.g) : ''}">${icon('check')}<span>${t('docGivenS')}</span></button><button class="dtick w ${m.w ? 'on' : ''}" data-tk="w" title="${t('docStudied')}${m.w ? ' · ' + UI.fmtDate(m.w) : ''}">${icon('users')}<span>${t('docStudiedS')}</span></button></span>`; };

  /* ---------- kaynak penceresi (müfredat + öğrenci) ---------- */
  UI.resourcesModal = function (node, editable, st) {
    const title = tx(node.title || node.text);
    const body = () => {
      const R = node.res || [];
      const links = R.filter((r) => r.kind === 'link'), imgs = R.filter((r) => r.kind === 'file' && isImg(r)), files = R.filter((r) => r.kind === 'file' && !isImg(r));
      const row = (r, inner) => `<div class="ritem" data-rid="${r.id}">${inner}${st ? tickBtns(st, r) : ''}</div>`;
      return `<div class="resnode">${esc(title)}</div>${st ? `<p class="muted sm">${icon('check')} ${t('docTickHelp', { s: st.name })}</p>` : ''}
      <h4>${icon('img')} ${t('images')}</h4>
      ${imgs.length ? `<div class="rgal">${imgs.map((r) => `<div class="rthumb" data-rid="${r.id}"><button class="rimg" data-ra="prev"><img data-src="${r.id}" alt=""></button><div class="rcap">${esc(LangGuard.ptx(r.name))}</div><div class="racts"><button class="ib" data-ra="prev" title="${t('preview')}">${icon('search')}</button><button class="ib" data-ra="save" title="${t('download')}">${icon('dl')}</button><button class="ib" data-ra="print" title="${t('print')}">${icon('print')}</button>${editable ? `<button class="ib" data-ra="move" title="${esc(t('resMove'))}">${icon('move')}</button><button class="ib danger" data-ra="del">${icon('trash')}</button>` : ''}</div>${st ? tickBtns(st, r) : ''}</div>`).join('')}</div>` : `<p class="muted sm">${t('noImages')}</p>`}
      ${editable ? `<label class="btn sm">${icon('img')} ${t('addImages')}<input type="file" id="riIn" accept="image/*" multiple hidden></label>` : ''}
      <h4>${icon('play')} ${t('videoLinks')}</h4>
      ${links.length ? `<div class="rlist">${links.map((r) => { const th = Files.videoThumb(r.url); return row(r, `${th ? `<img class="thumb" src="${th}" onerror="this.remove()">` : `<span class="rico">${icon(Files.isVideo(r.url) ? 'play' : 'link')}</span>`}<div class="rinfo"><b>${esc(LangGuard.ptx(r.name))}</b><small dir="ltr">${esc(r.url)}</small></div><div class="racts"><button class="btn sm pri" data-ra="open">${icon('play')} ${t('openLink')}</button><button class="ib" data-ra="copy" title="${t('copy')}">${icon('copy')}</button>${editable ? `<button class="ib" data-ra="move" title="${esc(t('resMove'))}">${icon('move')}</button><button class="ib danger" data-ra="del">${icon('trash')}</button>` : ''}</div>`); }).join('')}</div>` : `<p class="muted sm">${t('noLinks')}</p>`}
      ${editable ? `<div class="addlink"><input id="lkT" placeholder="${t('linkTitle')}"><input id="lkU" dir="ltr" placeholder="https://youtube.com/…"><button class="btn sm" id="lkAdd">${icon('plus')} ${t('addLink')}</button></div>` : ''}
      <h4>${icon('file')} ${t('documents')}</h4>
      ${files.length ? `<div class="rlist">${files.map((r) => row(r, `<span class="rico">${icon('file')}</span><div class="rinfo"><b>${esc(LangGuard.ptx(r.name))}</b><small>${fmtSize(r.size || 0)} · ${UI.fmtDate(r.addedAt)}</small></div><div class="racts">${canPrev(r) ? `<button class="btn sm pri" data-ra="prev">${icon('search')} ${t('preview')}</button>` : ''}<button class="btn sm" data-ra="openf">${t('openFile')}</button><button class="ib" data-ra="save" title="${t('download')}">${icon('dl')}</button>${editable ? `<button class="ib" data-ra="move" title="${esc(t('resMove'))}">${icon('move')}</button><button class="ib danger" data-ra="del">${icon('trash')}</button>` : ''}</div>`)).join('')}</div>` : `<p class="muted sm">${t('noDocs')}</p>`}
      ${editable ? `<label class="btn sm">${icon('ul')} ${t('addFiles')}<input type="file" id="rfIn" accept=".pdf,.docx,.doc,.pptx,.xlsx,.txt,image/*" multiple hidden></label><p class="muted sm">${t('filesSyncInfo')}</p>` : ''}`;
    };
    const mm = modal(icon('clip') + ' ' + t('resources'), body(), { wide: true });
    const wireR = () => {
      const w = mm.el;
      $$('img[data-src]', w).forEach(async (im) => { const r = (node.res || []).find((x) => x.id === im.dataset.src); const u = r && (await blobUrl(r)); if (u) im.src = u; else im.closest('.rimg').classList.add('missing'); });
      $$('[data-rid]', w).forEach((rowEl) => { const r = (node.res || []).find((x) => x.id === rowEl.dataset.rid); if (!r) return; $$('[data-ra]', rowEl).forEach((b) => (b.onclick = async () => {
        const a = b.dataset.ra;
        if (a === 'open') Files.openLink(r.url);
        if (a === 'copy') { try { await navigator.clipboard.writeText(r.url); UI.toast(t('copied')); } catch (e) { modal(t('copy'), `<textarea class="full" rows="3" dir="ltr" readonly>${esc(r.url)}</textarea>`); } }
        if (a === 'openf') { b.disabled = true; await Files.openFile(r); b.disabled = false; }
        if (a === 'save') Files.saveFileAs(r);
        if (a === 'prev') UI.previewRes(r, node, st);
        if (a === 'print') { const pg = await renderPages(r); if (pg) await Platform.printHtml(pagesHtml(pg, await defTpl(), r.name), {}); }
        if (a === 'del' && (await confirmDlg(t('confirmDelete')))) { Files.remove(node, r.id); refresh(); }
        if (a === 'move') UI.moveRes(node, r, refresh); // v1.5: eki başka konuya taşı
      })); $$('[data-tk]', rowEl).forEach((b) => (b.onclick = () => { toggleMark(st, r.id, b.dataset.tk); refresh(); })); });
      const la = $('#lkAdd', w); if (la) la.onclick = () => { const u = $('#lkU', w).value.trim(); if (!u) { UI.toast(t('required'), 'err'); return; } Files.addLink(node, $('#lkT', w).value.trim(), u); refresh(); };
      ['#rfIn', '#riIn'].forEach((sel) => { const fi = $(sel, w); if (fi) fi.onchange = async (e) => { const fs = [...e.target.files]; if (!fs.length) return; UI.toast(t('processing')); await Files.addFiles(node, fs); refresh(); }; });
    };
    const refresh = () => { $('.mb', mm.el).innerHTML = body(); wireR(); };
    UI.suspendRender = false; wireR();
    return mm;
  };

  /* ---------- sayfa üretimi: PDF (pdf.js), DOCX (docx-preview + html2canvas), resim ---------- */
  async function renderPages(r, onProgress) {
    const f = await Files.get(r.id); if (!f) { UI.toast(t('fileMissing'), 'err'); return null; }
    const out = [];
    if (isImg(r)) { out.push({ src: URL.createObjectURL(f.blob), img: true }); return out; }
    if (isPdf(r)) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await f.blob.arrayBuffer()) }).promise;
      const n = Math.min(pdf.numPages, 60);
      for (let i = 1; i <= n; i++) {
        const page = await pdf.getPage(i); const vp0 = page.getViewport({ scale: 1 }); const vp = page.getViewport({ scale: 1600 / Math.max(vp0.width, vp0.height) });
        const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: g, viewport: vp }).promise;
        out.push({ src: c.toDataURL('image/jpeg', 0.9), land: c.width > c.height }); if (onProgress) onProgress(i, n);
      }
      return out;
    }
    if (isDocx(r)) {
      const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;background:#fff;z-index:-9999;pointer-events:none';
      document.body.appendChild(host);
      try {
        await docxPreview.renderAsync(await f.blob.arrayBuffer(), host, host, { inWrapper: false, ignoreWidth: false, ignoreHeight: false, renderHeaders: true, renderFooters: true, breakPages: true, experimental: true, useBase64URL: true });
        await new Promise((res) => setTimeout(res, 300));
        const secs = [...host.querySelectorAll('section')].slice(0, 60);
        for (let i = 0; i < secs.length; i++) {
          const s = secs[i]; s.style.margin = '0';
          const cv = await html2canvas(s, { scale: 1.6, backgroundColor: '#ffffff', logging: false, useCORS: true });
          out.push({ src: cv.toDataURL('image/jpeg', 0.9), land: cv.width > cv.height }); if (onProgress) onProgress(i + 1, secs.length);
        }
      } finally { host.remove(); }
      return out;
    }
    return null;
  }
  /* Antetli sayfa HTML'i: antet tam sayfa arka plan, belge sayfası antetin yazı alanına sığdırılır */
  function pagesHtml(pages, tpl, title) {
    const mt = tpl ? +tpl.mt || 30 : 0, mb = tpl ? +tpl.mb || 22 : 0, ms = tpl ? 10 : 0;
    const tf = tpl && (tpl.dx || tpl.dy || (tpl.sc && tpl.sc !== 1)) ? `transform:translate(${+tpl.dx || 0}mm,${+tpl.dy || 0}mm) scale(${+tpl.sc || 1});` : '';
    const css = `@page{size:A4;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{margin:0;padding:0;background:#fff}
      .pg{width:210mm;height:297mm;position:relative;overflow:hidden;page-break-after:always;break-after:page;background:#fff}.pg:last-child{page-break-after:auto;break-after:auto}
      .bg{position:absolute;inset:0;width:210mm;height:297mm;object-fit:fill;${tf}}
      .ct{position:absolute;top:${mt}mm;bottom:${mb}mm;left:${ms}mm;right:${ms}mm;display:flex;align-items:${tpl ? 'flex-start' : 'center'};justify-content:center}
      .ct img{max-width:100%;max-height:100%;object-fit:contain}
      @media screen{body{background:#5b6b7f}.pg{margin:12px auto;box-shadow:0 4px 18px rgba(0,0,0,.35)}}`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title || '')}</title><style>${css}</style></head><body>${pages.map((p) => `<div class="pg">${tpl ? `<img class="bg" src="${tpl.data}">` : ''}<div class="ct"><img src="${p.src}"></div></div>`).join('')}</body></html>`;
  }
  async function defTpl() { const id = Store.db.config.defaultTpl; return id ? Templates.get(id) : null; }
  UI.defaultTemplateId = () => Store.db.config.defaultTpl || '';

  /* ---------- önizleme penceresi ---------- */
  UI.previewRes = async function (r, node, st) {
    const tpls = await Templates.list();
    let tplId = Store.local.ui.resTpl === undefined ? UI.defaultTemplateId() : Store.local.ui.resTpl;
    if (tplId && !tpls.some((x) => x.id === tplId)) tplId = '';
    const head = () => `<div class="pvbar"><label class="fl in"><span>${t('letterhead')}</span><select id="pvT"><option value="">${t('noTemplate')}</option>${tpls.map((x) => `<option value="${x.id}" ${x.id === tplId ? 'selected' : ''}>${esc(LangGuard.ptx(x.name))}${x.id === UI.defaultTemplateId() ? ' ★' : ''}</option>`).join('')}</select></label>
      <button class="btn sm" id="pvDef" ${tplId && tplId !== UI.defaultTemplateId() ? '' : 'disabled'}>★ ${t('makeDefault')}</button>${st ? tickBtns(st, r) : ''}</div>`;
    const mm = modal(icon('search') + ' ' + esc(LangGuard.ptx(r.name)), `${head()}<div class="pvwrap"><p class="muted" id="pvSt">${t('processing')}</p><iframe class="pframe" hidden></iframe></div>`, { wide: true, cls: 'pv',
      foot: `<button class="btn" id="pvDl">${icon('dl')} ${t('download')}</button><button class="btn" id="pvPdf">${icon('file')} ${t('savePdf')}</button><button class="btn pri" id="pvPr">${icon('print')} ${t('print')}</button>` });
    const w = mm.el; let pages = null; let html = '';
    const draw = async () => { const tpl = tplId ? await Templates.get(tplId) : null; html = pagesHtml(pages, tpl, r.name); const f = $('.pframe', w); f.hidden = false; f.srcdoc = html; $('#pvSt', w).hidden = true; };
    const wireHead = () => {
      $('#pvT', w).onchange = async (e) => { tplId = e.target.value; Store.local.ui.resTpl = tplId; Store.saveLocal(); $('.pvbar', w).outerHTML = head(); wireHead(); if (pages) draw(); };
      $('#pvDef', w).onclick = () => { Store.db.config.defaultTpl = tplId; Store.touch('config', { silent: true }); UI.toast(t('defaultSet')); $('.pvbar', w).outerHTML = head(); wireHead(); };
      $$('.pvbar [data-tk]', w).forEach((b) => (b.onclick = () => { toggleMark(st, r.id, b.dataset.tk); $('.pvbar', w).outerHTML = head(); wireHead(); }));
    };
    wireHead();
    $('#pvDl', w).onclick = () => Files.saveFileAs(r);
    $('#pvPr', w).onclick = () => html && Platform.printHtml(html, { title: r.name });
    $('#pvPdf', w).onclick = async () => { if (!html) return; const res = await Platform.savePdf(html, String(r.name).replace(/\.[^.]+$/, '') + '.pdf', {}); if (res && res !== 'web-print' && res !== 'android-print') UI.toast(t('pdfSaved')); };
    try { pages = await renderPages(r, (i, n) => { const s = $('#pvSt', w); if (s) s.textContent = t('processing') + ' ' + i + '/' + n; }); if (!pages || !pages.length) throw new Error(t('fileMissing')); await draw(); }
    catch (e) { console.error(e); const s = $('#pvSt', w); if (s) s.textContent = t('previewFail') + ' — ' + (e.message || e); }
  };

  /* ---------- öğrenci sayfası: belgeler sekmesi ---------- */
  let dfilter = 'all';
  UI.studentDocsTab = function (el, s) {
    const prog = Store.progOf(s);
    const groups = [];
    Store.inProg(prog, () => Store.levels().forEach((l, i) => {
      if (l.off || Store.stOff(s, l)) return;
      const add = (node, code, label) => { const R = (node.res || []); if (R.length) groups.push({ node, code, label, R }); };
      add(l, String(i), l.title);
      l.modules.forEach((md, j) => { if (md.off || Store.stOff(s, md)) return; add(md, i + '.' + (j + 1), md.title); md.items.forEach((it) => { if (!it.off) add(it, i + '.' + (j + 1), it.text); }); });
    }));
    const all = groups.reduce((a, g) => a + g.R.length, 0);
    const given = groups.reduce((a, g) => a + g.R.filter((r) => mark(s, r.id).g).length, 0);
    const studied = groups.reduce((a, g) => a + g.R.filter((r) => mark(s, r.id).w).length, 0);
    const show = (r) => dfilter === 'all' || (dfilter === 'marked' ? mark(s, r.id).g || mark(s, r.id).w : !mark(s, r.id).g && !mark(s, r.id).w);
    el.innerHTML = `<div class="atools"><div class="seg">${[['all', 'filterAll'], ['marked', 'docMarked'], ['unmarked', 'docUnmarked']].map(([k, l]) => `<button class="${dfilter === k ? 'on' : ''}" data-df="${k}">${t(l)}</button>`).join('')}</div>
      <span class="legend">${icon('check')} ${t('docGiven')}: <b>${given}</b> · ${icon('users')} ${t('docStudied')}: <b>${studied}</b> · ${t('total')}: <b>${all}</b></span></div>
      ${all ? groups.map((g) => { const R = g.R.filter(show); if (!R.length) return ''; return `<div class="card dgroup"><div class="dgh"><span class="code">${esc(g.code)}</span> <b>${esc(tx(g.label))}</b></div>${R.map((r) => `<div class="ritem" data-gid="${g.code}" data-rid="${r.id}"><span class="rico">${icon(r.kind === 'link' ? (Files.isVideo(r.url) ? 'play' : 'link') : isImg(r) ? 'img' : 'file')}</span><div class="rinfo"><b>${esc(LangGuard.ptx(r.name))}</b><small>${mark(s, r.id).g ? t('docGiven') + ': ' + UI.fmtDate(mark(s, r.id).g) : ''}${mark(s, r.id).g && mark(s, r.id).w ? ' · ' : ''}${mark(s, r.id).w ? t('docStudied') + ': ' + UI.fmtDate(mark(s, r.id).w) : ''}</small></div><div class="racts">${r.kind === 'link' ? `<button class="btn sm" data-dv="open">${icon('play')} ${t('openLink')}</button>` : canPrev(r) ? `<button class="btn sm" data-dv="prev">${icon('search')} ${t('preview')}</button>` : `<button class="btn sm" data-dv="openf">${t('openFile')}</button>`}</div>${tickBtns(s, r)}</div>`).join('')}</div>`; }).join('') : `<div class="card empty"><p>${t('noStDocs')}</p></div>`}`;
    $$('[data-df]', el).forEach((b) => (b.onclick = () => { dfilter = b.dataset.df; UI.studentDocsTab(el, s); }));
    const find = (rid) => { for (const g of groups) { const r = g.R.find((x) => x.id === rid); if (r) return { r, node: g.node }; } return null; };
    $$('.ritem[data-rid]', el).forEach((row) => {
      const f = find(row.dataset.rid); if (!f) return;
      $$('[data-tk]', row).forEach((b) => (b.onclick = () => { toggleMark(s, f.r.id, b.dataset.tk); UI.keepPos(() => UI.studentDocsTab(el, s)); }));
      $$('[data-dv]', row).forEach((b) => (b.onclick = () => { const a = b.dataset.dv; if (a === 'open') Files.openLink(f.r.url); if (a === 'openf') Files.openFile(f.r); if (a === 'prev') UI.previewRes(f.r, f.node, s); }));
    });
  };
})();
