/* v1.3: Toplu materyal yükleme — PDF, DOCX, PPTX, TXT ve resimler birlikte seçilir; her dosyanın yazısı internetsiz okunur
   (PDF/DOCX/PPTX metni doğrudan, resim ve taranmış PDF yazı tanımayla), müfredattaki maddelerle karşılaştırılır ve
   en uygun konu önerilir. Öneriler değiştirilebilir; "Yerleştir" ile her dosya kendi maddesinin eklerine girer. */
(function () {
  const { $, $$, esc, icon, tx, modal } = UI;
  const STOP = new Set('a an the and or of to in on at for with by from as is are be was were it its this that these those i you he she we they me my your his her our their not no do does did can could will would should may might must have has had am been being so if than then there here what which who whom whose when where why how all any some each every one two very more most much many few lot lots also just only into out up down over about after before again new old use using used etc e g eg vs about yes'.split(' '));
  const norm = (s) => ' ' + String(s || '').toLowerCase().replace(/[’`´]/g, "'").replace(/[…]/g, ' ').replace(/[^a-z0-9'À-ɏ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const toks = (s) => norm(s).trim().split(' ').filter((w) => w.length > 1 && !STOP.has(w));
  const kindW = { c: 0.45 }; // "Can …" denetim maddeleri ders konusu değildir; daha az ağırlık

  /* ---------- dizin: maddelerin İngilizce metni + modül başlığı ---------- */
  function buildIndex() {
    const docs = [];
    Store.levels().forEach((l) => l.modules.forEach((m) => m.items.forEach((it) => {
      const en = (it.text && (it.text.en || it.text.tr)) || '';
      const mt = (m.title && (m.title.en || m.title.tr)) || '';
      // ifadeler: "/", ";", ",", parantez ve tırnaklarla ayrılan kalıplar ("how many", "there is", "present perfect")
      const phrases = new Set();
      [en, (mt.match(/"([^"]+)"/) || [])[1] || ''].forEach((s) => String(s).replace(/[…?!.]/g, ' ').split(/[\/;,:()"+=–—]/).flatMap((x) => [x].concat(x.split(/\band\b|\bvs\b|\bor\b/i))).forEach((p) => { const n = norm(p).trim(); const w = n.split(' ').filter(Boolean); if (w.length >= 1 && w.length <= 5 && n.length >= 3 && !(w.length === 1 && STOP.has(w[0]))) phrases.add(n); }));
      docs.push({ level: l, module: m, item: it, phrases: [...phrases], tk: toks(en + ' ' + en + ' ' + mt) });
    })));
    const N = docs.length, df = new Map(), pdf = new Map();
    docs.forEach((d) => { new Set(d.tk).forEach((w) => df.set(w, (df.get(w) || 0) + 1)); d.phrases.forEach((p) => pdf.set(p, (pdf.get(p) || 0) + 1)); });
    const idf = (w) => Math.log((N + 1) / ((df.get(w) || 0) + 1)) + 0.2;
    docs.forEach((d) => { const v = new Map(); d.tk.forEach((w) => v.set(w, (v.get(w) || 0) + 1)); let n = 0; v.forEach((c, w) => { const x = c * idf(w); v.set(w, x); n += x * x; }); d.vec = v; d.norm = Math.sqrt(n) || 1;
      d.pw = d.phrases.map((p) => [p, Math.pow(p.split(' ').length, 1.6) * (Math.log((N + 1) / ((pdf.get(p) || 0) + 1)) + 0.5)]); });
    return { docs, idf };
  }

  /* text: dosyanın okunan yazısı; name: dosya adı (adındaki sözcükler de ipucudur) */
  function match(IX, text, name) {
    const nm = norm(String(name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_\-.\/]+/g, ' '));
    const body = norm(text) + nm.repeat(2);
    const v = new Map(); let n = 0;
    toks(body).forEach((w) => v.set(w, (v.get(w) || 0) + 1));
    v.forEach((c, w) => { const x = (1 + Math.log(c)) * IX.idf(w); v.set(w, x); n += x * x; }); n = Math.sqrt(n) || 1;
    const lvHint = (body.match(/ (pre a1|a1|a2|b1|b2|c1|c2) /) || [])[1];
    const res = IX.docs.map((d) => {
      let ph = 0; const hits = [];
      for (const [p, w] of d.pw) { const k = body.split(' ' + p + ' ').length - 1; if (k) { ph += w * (1 + Math.log(k)); hits.push(p); } if (nm.includes(' ' + p + ' ')) ph += w * 1.5; } // v1.6: dosya / klasör adındaki ifade daha güçlü ipucu
      let dot = 0; d.vec.forEach((x, w) => { const y = v.get(w); if (y) dot += x * y; });
      let s = ph + 6 * (dot / (d.norm * n));
      s *= kindW[d.item.kind] || 1;
      if (lvHint && (d.level.title.en || '').toLowerCase().includes(lvHint.replace('pre ', 'pre-'))) s *= 1.25;
      return { d, s, hits };
    }).filter((r) => r.s > 0.05).sort((a, b) => b.s - a.s);
    const top = res[0] ? res[0].s : 0;
    return res.slice(0, 5).map((r) => ({ id: r.d.item.id, score: r.s, conf: Math.round((100 * r.s) / (r.s + 4)), rel: top ? r.s / top : 0, hits: r.hits.slice(0, 4) }));
  }
  UI.bulkMatch = (text, name) => match(buildIndex(), text, name); // test ve yeniden kullanım için

  /* ---------- dosyadan yazı ---------- */
  const ext = (f) => (f.name.match(/\.([a-z0-9]+)$/i) || [])[1] || '';
  const xmlText = (x) => x.replace(/<\/w:p>|<\/a:p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  async function extract(f, onP) {
    const e = ext(f).toLowerCase();
    if (/^image\//.test(f.type) || /^(png|jpe?g|webp|bmp|gif)$/.test(e)) { if (!window.OCR || !OCR.available()) return ''; return OCR.text(f, onP); }
    if (e === 'pdf' || f.type === 'application/pdf') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
      let s = '';
      for (let i = 1; i <= Math.min(pdf.numPages, 8); i++) { const c = await (await pdf.getPage(i)).getTextContent(); s += c.items.map((x) => x.str).join(' ') + '\n'; }
      if (s.replace(/\s/g, '').length < 40 && window.OCR && OCR.available()) { // taranmış PDF: ilk sayfa resim olarak okunur
        const pg = await pdf.getPage(1); const vp = pg.getViewport({ scale: 2 }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
        await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; s += await OCR.text(c, onP);
      }
      return s;
    }
    if (e === 'docx' || e === 'pptx') {
      const zip = await JSZip.loadAsync(await f.arrayBuffer());
      const names = Object.keys(zip.files).filter((n) => (e === 'docx' ? /^word\/(document|header\d*|footer\d*)\.xml$/ : /^ppt\/slides\/slide\d+\.xml$/).test(n));
      let s = ''; for (const n of names) s += xmlText(await zip.file(n).async('string')) + '\n';
      return s;
    }
    if (/^(txt|md|csv|html?)$/.test(e) || /^text\//.test(f.type)) return (await f.text()).replace(/<[^>]+>/g, ' ');
    return ''; // eski .doc, ses, video vb.: yalnız dosya adına bakılır
  }

  /* ---------- pencere ---------- */
  const where = (id) => { const f = Store.findItem(id); if (f) return `${tx(f.level.title)} › ${tx(f.module.title)} › ${tx(f.item.text)}`; const g = Store.findModule(id); return g ? `${tx(g.level.title)} › ${tx(g.module.title)}` : ''; };
  const nodeOf = (id) => { const f = Store.findItem(id); if (f) return f.item; const g = Store.findModule(id); return g ? g.module : null; };
  const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

  /* v1.6: dosyayı büyük görüntüleme (resim, PDF'in ilk sayfaları, diğerlerinde okunan yazı) */
  async function viewFile(r) {
    const e = ext(r.f).toLowerCase(); let html = '', url = '';
    const mm = modal(icon('search') + ' ' + esc(r.f.name), `<div class="bkview" id="bkV"><p class="muted">${t('processing')}</p></div>`, { wide: true, cls: 'bkviewm' });
    const box = $('#bkV', mm.el);
    try {
      if (/^image\//.test(r.f.type) || /^(png|jpe?g|webp|bmp|gif)$/.test(e)) { url = URL.createObjectURL(r.f); html = `<img src="${url}" alt="">`; }
      else if (e === 'pdf') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await r.f.arrayBuffer()) }).promise; box.innerHTML = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 4); i++) { const pg = await pdf.getPage(i); const vp = pg.getViewport({ scale: 1.6 }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; box.appendChild(c); }
        if (pdf.numPages > 4) box.insertAdjacentHTML('beforeend', `<p class="muted sm">${t('bulkMorePages', { n: pdf.numPages - 4 })}</p>`);
        return;
      } else html = `<pre class="bktext" dir="ltr">${esc((r.text || '').trim() || t('bulkNoText'))}</pre>`;
      box.innerHTML = html;
    } catch (er) { box.innerHTML = `<p class="err">${esc(er.message || String(er))}</p>`; }
    if (url) setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
  }

  UI.bulkUpload = (preset) => {
    const rows = []; let IX = null; let busy = false;
    const rowHtml = (r, i) => `<div class="bkrow ${r.state}" data-i="${i}">
      <button class="bkthumb" data-view="${i}" title="${esc(t('bulkView'))}">${r.thumb ? `<img src="${r.thumb}" alt="">` : `<span>${esc(ext(r.f).toUpperCase() || '?')}</span>`}<i>${icon('search')}</i></button>
      <div class="bkinfo"><b>${esc(r.f.name)}</b> <small class="muted">${fmtSize(r.f.size)}${(r.f.webkitRelativePath || r.f._path || '').includes('/') ? ' · ' + esc((r.f.webkitRelativePath || r.f._path).split('/').slice(0, -1).join(' / ')) : ''}</small>
        ${r.state === 'wait' ? `<p class="muted sm">${t('bulkWait')}</p>` : r.state === 'read' ? `<p class="sm">${t('bulkReading', { p: r.p || 0 })}</p>` : r.state === 'err' ? `<p class="err sm">${esc(r.err)}</p>` : `
        <div class="bksel"><select data-sel="${i}">${r.target && !r.m.some((x) => x.id === r.target) ? `<option value="${r.target}" selected>✔ ${esc(where(r.target).slice(0, 140))}</option>` : ''}<optgroup label="${esc(t('bulkSuggest'))}">${r.m.map((x) => `<option value="${x.id}" ${r.target === x.id ? 'selected' : ''}>${x.conf}% · ${esc(where(x.id).slice(0, 140))}</option>`).join('') || `<option value="">${t('bulkNoMatch')}</option>`}</optgroup></select>
        <button class="btn sm" data-pick="${i}" title="${esc(t('bulkPickTip'))}">${icon('move')} ${t('bulkPick')}</button></div>
        <p class="muted sm">${r.m[0] && r.target === r.m[0].id && r.m[0].hits.length ? t('bulkWhy', { w: r.m[0].hits.map((h) => '"' + h + '"').join(', ') }) : r.target ? '' : t('bulkPickHint')}</p>`}</div>
      <label class="chk bkon"><input type="checkbox" data-on="${i}" ${r.on ? 'checked' : ''} ${r.state !== 'ok' ? 'disabled' : ''}> ${t('bulkInclude')}</label>
      <button class="ib danger" data-rm="${i}" title="${esc(t('del'))}">${icon('trash')}</button></div>`;
    const body = () => `<div class="bkdrop" id="bkDrop"><p>${t('bulkDrop')}</p><label class="btn pri">${icon('ul')} ${t('bulkChoose')}<input type="file" id="bkIn" multiple accept=".pdf,.docx,.pptx,.txt,.doc,image/*" hidden></label> <label class="btn">${icon('folder')} ${t('bulkFolder')}<input type="file" id="bkDir" webkitdirectory directory multiple hidden></label> <button class="btn ghost" id="bkDedup" title="${esc(t('dedupTip'))}">${icon('trash')} ${t('dedupBtn')}</button></div>
      <div id="bkList">${rows.map(rowHtml).join('')}</div>`;
    const mm = modal(icon('ul') + ' ' + t('bulkBtn'), body(), { wide: true, sticky: true, okText: t('bulkPlace'), onOk: place });
    const okBtn = $('.mok', mm.el);
    const paint = () => {
      const L = $('#bkList', mm.el); if (!L) return;
      const keep = L.scrollTop; L.innerHTML = rows.map(rowHtml).join(''); L.scrollTop = keep;
      $$('[data-sel]', L).forEach((s) => { if (!s.value && rows[+s.dataset.sel].target) s.value = rows[+s.dataset.sel].target; s.onchange = () => { const r = rows[+s.dataset.sel]; r.target = s.value; r.on = !!s.value; paint(); }; });
      $$('[data-on]', L).forEach((c) => (c.onchange = () => { rows[+c.dataset.on].on = c.checked; paint(); }));
      $$('[data-pick]', L).forEach((b) => (b.onclick = () => { const r = rows[+b.dataset.pick]; UI.pickTopic({ name: r.f.name, cur: nodeOf(r.target), curLabel: t('bulkCurrent'), sug: r.m.map((x) => x.id), onPick: (x) => { r.target = x.n.id; r.on = true; paint(); } }); }));
      $$('[data-view]', L).forEach((b) => (b.onclick = () => viewFile(rows[+b.dataset.view])));
      $$('[data-rm]', L).forEach((b) => (b.onclick = () => { rows.splice(+b.dataset.rm, 1); paint(); }));
      const n = rows.filter((r) => r.on && r.target && r.state === 'ok').length;
      okBtn.textContent = t('bulkPlace') + (n ? ' (' + n + ')' : ''); okBtn.disabled = busy || !n;
    };
    // v1.4: klasör seçilince desteklenen dosyalar ayıklanır; gizli / geçici dosyalar ve tekrarlar atlanır
    const OKF = /\.(pdf|docx|pptx|txt|png|jpe?g|webp|bmp|gif)$/i;
    const seen = new Set();
    async function addFiles(list, fromFolder) {
      // v1.7: içerik özetiyle tekrar denetimi — aynı seçimdeki ve müfredatta zaten olan dosyalar listeye alınmaz
      let skip = 0, n = 0, dupB = 0, dupC = 0;
      await Files.ensureHashes(); const idx = Files.dupIndex();
      for (const f of list) {
        const key = (f.webkitRelativePath || f._path || f.name) + '|' + f.size + '|' + f.lastModified;
        if (/^(\.|~\$)/.test(f.name) || !OKF.test(f.name) || seen.has(key)) { skip++; continue; }
        seen.add(key);
        if (f.size > Files.MAX) { toast(f.name + ': > 25 MB', 'err'); continue; }
        let sha = ''; try { sha = await Files.hash(f); f._sha = sha; } catch (e) {}
        if (sha && seen.has(sha)) { dupB++; continue; }
        if (sha && idx.has(sha)) { dupC++; continue; }
        if (sha) seen.add(sha);
        n++;
        const r = { f, state: 'wait', m: [], on: false, target: '' };
        if (/^image\//.test(f.type)) r.thumb = await UI.resizeImage(f, 160).catch(() => '');
        rows.push(r);
      }
      if (fromFolder || skip || dupB || dupC) toast(t('bulkAddRes', { n, m: skip, b: dupB, c: dupC }));
      paint(); run();
    }
    async function run() {
      if (busy) return; busy = true;
      if (!IX) IX = buildIndex();
      for (const r of rows) {
        if (r.state !== 'wait') continue;
        r.state = 'read'; paint();
        try {
          const text = await extract(r.f, (p) => { r.p = p; const el = $(`.bkrow[data-i="${rows.indexOf(r)}"] .bkinfo p`, mm.el); if (el) el.textContent = t('bulkReading', { p }); });
          r.text = text; r.m = match(IX, text, r.f.webkitRelativePath || r.f._path || r.f.name); // klasör adları da ipucu
          const best = r.m[0];
          r.target = best ? best.id : ''; r.on = !!(best && best.score >= 2.5); // zayıf eşleşmede kutu boş kalır, kullanıcı seçer
          r.state = 'ok';
        } catch (e) { console.error(e); r.state = 'ok'; r.m = match(IX, '', r.f.webkitRelativePath || r.f._path || r.f.name); r.target = r.m[0] ? r.m[0].id : ''; r.on = false; r.err = ''; }
        paint();
      }
      busy = false; paint();
    }
    async function place() {
      const todo = rows.filter((r) => r.on && r.target && r.state === 'ok');
      if (!todo.length) return false;
      const by = new Map(); todo.forEach((r) => { const nd = nodeOf(r.target); if (nd) { if (!by.has(nd)) by.set(nd, []); by.get(nd).push(r.f); } });
      for (const [node, files] of by) await Files.addFiles(node, files, { quiet: true });
      toast(t('bulkPlaced', { n: todo.length, k: by.size }));
      UI.render();
    }
    $('#bkIn', mm.el).onchange = (e) => { const fl = [...e.target.files]; e.target.value = ''; addFiles(fl); };
    $('#bkDedup', mm.el).onclick = async (e) => { e.target.disabled = true; const n = await Files.removeDuplicates(); e.target.disabled = false; toast(n ? t('dedupDone', { n }) : t('dedupNone')); };
    $('#bkDir', mm.el).onchange = (e) => { const fl = [...e.target.files]; e.target.value = ''; addFiles(fl, true); };
    const dz = $('#bkDrop', mm.el);
    ['dragover', 'dragenter'].forEach((k) => mm.el.addEventListener(k, (e) => { e.preventDefault(); dz.classList.add('on'); }));
    ['dragleave', 'drop'].forEach((k) => mm.el.addEventListener(k, (e) => { e.preventDefault(); if (k === 'drop' || e.target === dz) dz.classList.remove('on'); }));
    // sürüklenen klasörler alt klasörleriyle birlikte taranır
    const walk = async (en, path, out) => {
      if (en.isFile) { const f = await new Promise((ok, no) => en.file(ok, no)); try { f._path = path + f.name; } catch (x) {} out.push(f); return; }
      if (!en.isDirectory) return;
      const rd = en.createReader(); let batch;
      do { batch = await new Promise((ok, no) => rd.readEntries(ok, no)); for (const c of batch) await walk(c, path + en.name + '/', out); } while (batch.length);
    };
    mm.el.addEventListener('drop', async (e) => {
      const dt = e.dataTransfer || {}; const ents = [...(dt.items || [])].map((i) => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
      if (ents.some((x) => x.isDirectory)) { const out = []; for (const en of ents) await walk(en, '', out); addFiles(out, true); return; }
      const fl = [...(dt.files || [])]; if (fl.length) addFiles(fl);
    });
    paint();
    if (preset && preset.length) addFiles(preset); else setTimeout(() => $('#bkIn', mm.el).click(), 50);
    return { rows, mm };
  };

  /* ---------- v1.5/v1.6: konu seçme penceresi (eki taşıma ve toplu yüklemede doğru yeri seçme) ---------- */
  UI.pickTopic = (o) => {
    const nodes = []; // seviye > modül > madde; ekler modüle ya da maddeye konabilir
    Store.levels().forEach((l) => l.modules.forEach((m) => { nodes.push({ n: m, lv: l, path: tx(l.title), label: tx(m.title), mod: true }); m.items.forEach((it) => nodes.push({ n: it, lv: l, path: tx(l.title) + ' › ' + tx(m.title), label: tx(it.text) })); }));
    const sug = (o.sug || []).slice(0, 4).map((id) => nodes.find((y) => y.n.id === id)).filter(Boolean);
    let q = '', lv = '';
    const txt = (x) => (x.path + ' ' + x.label + ' ' + [x.n.text, x.n.title].filter(Boolean).map((z) => [z.tr, z.en, z.ar].join(' ')).join(' ')).toLocaleLowerCase('tr');
    const rowH = (x) => `<button class="mvrow ${x.n === o.cur ? 'cur' : ''} ${x.mod ? 'mod' : ''}" data-id="${x.n.id}" ${x.n === o.cur && o.disableCur ? 'disabled' : ''}><small>${esc(x.path)}</small><b>${esc(x.label)}</b>${x.n === o.cur ? `<i>${esc(o.curLabel || t('resHere'))}</i>` : ''}</button>`;
    const list = () => { const ql = q.trim().toLocaleLowerCase('tr'); const L = nodes.filter((x) => (!lv || x.lv.id === lv) && (!ql || txt(x).includes(ql))); return (L.slice(0, 200).map(rowH).join('') || `<p class="muted">${t('noResults')}</p>`) + (L.length > 200 ? `<p class="muted sm">${t('resMoveMore', { n: L.length - 200 })}</p>` : ''); };
    const mm = modal(icon('move') + ' ' + (o.title || t('bulkPick')), `<p class="sm"><b>${esc(LangGuard.ptx(o.name || ''))}</b></p>
      ${sug.length ? `<p class="muted sm">${t('bulkSuggest')}</p><div class="mvlist">${sug.map(rowH).join('')}</div>` : ''}
      <div class="row" style="gap:8px;margin:10px 0"><select id="mvLv" style="flex:0 0 200px;width:200px"><option value="">${t('filterAll')}</option>${Store.levels().map((l) => `<option value="${l.id}">${esc(tx(l.title))}</option>`).join('')}</select><div class="search" style="flex:1">${icon('search')}<input id="mvQ" placeholder="${esc(t('resMoveSearch'))}"></div></div>
      <div class="mvlist" id="mvList">${list()}</div>`, { wide: true });
    const wire = () => $$('.mvrow[data-id]', mm.el).forEach((b) => (b.onclick = () => {
      const x = nodes.find((y) => y.n.id === b.dataset.id); if (!x || (x.n === o.cur && o.disableCur)) return;
      mm.close(); o.onPick(x);
    }));
    $('#mvQ', mm.el).oninput = (e) => { q = e.target.value; $('#mvList', mm.el).innerHTML = list(); wire(); };
    $('#mvLv', mm.el).onchange = (e) => { lv = e.target.value; $('#mvList', mm.el).innerHTML = list(); wire(); };
    wire();
  };
  UI.moveRes = (from, r, done) => UI.pickTopic({ title: t('resMove'), name: r.name, cur: from, disableCur: true, sug: (UI.bulkMatch ? UI.bulkMatch('', r.name) : []).filter((x) => x.score >= 1).map((x) => x.id), onPick: (x) => {
    from.res = (from.res || []).filter((y) => y.id !== r.id); // dosyanın kendisi silinmez, yalnız yeri değişir; öğrenci işaretleri korunur
    x.n.res = x.n.res || []; x.n.res.push(r);
    Store.touch('curriculum');
    toast(t('resMoved', { w: x.path + ' › ' + x.label }));
    done && done();
  } });
})();
