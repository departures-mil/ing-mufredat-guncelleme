/* v1.1: Sınav sistemi — seviye ölçme sistemleri (bileşen, ağırlık, geçme ölçütü) ve sınav kâğıtları.
   Her şey eklenebilir, çıkarılabilir, sırası değiştirilebilir. Öğrenci puanları st.exams[seviyeId].comps[bileşenId] içinde tutulur;
   ağırlıklı toplam tamamlanınca seviye değerlendirmesine (st.evals) otomatik aktarılır (onaylanmış seviyeye dokunulmaz). */
(function () {
  const { $, $$, esc, icon, tx, modal, confirmDlg, triFields, readTriAuto, wireTri, triBlockFoot, PAGES, go } = UI;
  const EX = () => Store.db.exams;
  const save = (silent) => Store.touch('exams', silent ? { silent: true } : undefined);
  const papers = () => EX().papers.list;
  const paperOf = (id) => papers().find((p) => p.id === id);
  const lvlName = (id) => { const l = Store.inProg('genel', () => Store.findLevel(id)); return l ? Store.inProg('genel', () => Store.levelNo(l)) + ' — ' + tx(l.title) : id; };
  const genLevels = () => Store.inProg('genel', () => Store.levels());
  const today = () => new Date().toISOString().slice(0, 10);
  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return false; arr.splice(j, 0, arr.splice(i, 1)[0]); return true; };
  const qCount = (p) => p.parts.reduce((a, pt) => a + pt.blocks.reduce((b, bl) => b + bl.qs.length, 0), 0);
  const pTotal = (p) => p.parts.reduce((a, pt) => a + pt.blocks.reduce((b, bl) => b + bl.qs.reduce((c, q) => c + (+q.pts || 0), 0), 0), 0);
  const paperLevelId = (p) => 'l' + (p.lvl ?? 0);

  /* ---------- hesaplama ---------- */
  function calc(st, lid) {
    const sc = EX().schemes[lid]; if (!sc) return null;
    const comps = sc.comps.filter((c) => !c.off);
    const W = comps.reduce((a, c) => a + (+c.weight || 0), 0) || 1;
    const rec = ((st.exams || {})[lid] || {}).comps || {};
    let sum = 0, wDone = 0; const fin = comps.find((c) => c.final);
    for (const c of comps) { const r = rec[c.id]; if (r && r.score !== '' && r.score != null) { sum += (+c.weight || 0) * +r.score; wDone += +c.weight || 0; } }
    const finalScore = fin && rec[fin.id] && rec[fin.id].score !== '' ? +rec[fin.id].score : null;
    const complete = comps.length > 0 && wDone >= W;
    const total = Math.round(sum / W);
    const pass = complete && total >= sc.passTotal && (!fin || (finalScore != null && finalScore >= sc.passFinal));
    return { sc, comps, total, soFar: wDone ? Math.round(sum / wDone) : null, complete, pass, finalScore, fin, W };
  }
  /* Tamamlanan ölçmeyi seviye değerlendirmesine aktar (onaylı/kilitli seviyeye dokunmaz) */
  function applyToEval(st, lid) {
    const r = calc(st, lid); if (!r || !r.complete) return false;
    const ev = (st.evals[lid] = st.evals[lid] || {}); if (ev.locked) return false;
    ev.score = r.total; ev.result = r.pass ? 'pass' : 'fail'; ev.date = ev.date || today(); ev.fromExams = true;
    return true;
  }
  function setScore(st, lid, cid, data) {
    st.exams = st.exams || {}; const E = (st.exams[lid] = st.exams[lid] || { comps: {} }); E.comps = E.comps || {};
    if (data == null) delete E.comps[cid]; else E.comps[cid] = Object.assign(E.comps[cid] || {}, data);
    applyToEval(st, lid);
  }
  UI.examCalc = calc;

  /* ---------- sayfa ---------- */
  let tab = 'schemes';
  PAGES.exams = (m, R) => {
    if (!EX()) { m.innerHTML = `<div class="card empty">${t('examsMissing')}</div>`; return; }
    if (R.xedit) return paperEditor(m, R);
    if (R.xrun) return paperRunner(m, R);
    m.innerHTML = `<div class="ph-row"><h2 class="ph">${icon('exam')} ${t('nav_exams')}</h2>
      <div class="seg">${[['schemes', 'examSchemes'], ['papers', 'examPapers']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${t(l)}</button>`).join('')}</div></div>
      <p class="muted sm">${t(tab === 'schemes' ? 'examSchemesHelp' : 'examPapersHelp')}</p><div id="xbody"></div>`;
    $$('[data-tab]', m).forEach((b) => (b.onclick = () => { tab = b.dataset.tab; UI.keepPos(() => PAGES.exams(m, R)); }));
    (tab === 'schemes' ? schemesView : papersView)($('#xbody', m), m, R);
  };

  /* ---------- ölçme sistemleri ---------- */
  function schemesView(el, m, R) {
    const L = genLevels();
    let lid = Store.local.ui.xlid; if (!L.some((l) => l.id === lid)) lid = (L[0] || {}).id;
    const sc = EX().schemes[lid];
    const W = sc ? sc.comps.filter((c) => !c.off).reduce((a, c) => a + (+c.weight || 0), 0) : 0;
    el.innerHTML = `<div class="tools"><label class="fl in"><span>${t('level')}</span><select id="xl" class="big">${L.map((l, i) => `<option value="${l.id}" ${l.id === lid ? 'selected' : ''}>${i} — ${esc(tx(l.title))}</option>`).join('')}</select></label></div>
      ${sc ? `<div class="card xsc">
        <div class="grid3"><label class="fl sm"><span>${t('passTotal')} (%)</span><input type="number" min="0" max="100" id="xpt" value="${sc.passTotal}"></label>
        <label class="fl sm"><span>${t('passFinal')} (%)</span><input type="number" min="0" max="100" id="xpf" value="${sc.passFinal}"></label>
        <div class="fl"><span>${t('totalWeight')}</span><b class="wsum ${W === 100 ? 'ok' : 'warn'}">%${W}${W !== 100 ? ' — ' + t('weightWarn') : ''}</b></div></div>
        <div class="remed">${icon('note')} <b>${t('remedial')}:</b> ${esc(tx(sc.remedial))} <button class="ib" id="xrem" title="${t('edit')}">${icon('edit')}</button></div>
        <div class="tbl"><table class="t xcomp"><thead><tr><th></th><th>${t('component')}</th><th>${t('weight')}</th><th>${t('frequency')}</th><th>${t('purpose')}</th><th>${t('examPaper')}</th><th></th></tr></thead>
        <tbody>${sc.comps.map((c, i) => `<tr data-ci="${i}" draggable="true" class="${c.off ? 'off' : ''}"><td><span class="grip">${icon('grip')}</span></td>
          <td><b>${esc(tx(c.name))}</b>${c.final ? ` <span class="tag fin">${t('finalExam')}</span>` : ''}</td>
          <td><input type="number" class="wIn" min="0" max="100" value="${c.weight}" data-w="${i}"></td><td>${esc(tx(c.freq))}</td><td class="sm">${esc(tx(c.purpose))}</td>
          <td>${c.paperId && paperOf(c.paperId) ? `<button class="btn sm ghost" data-open="${c.paperId}">${icon('file')} ${esc(tx(paperOf(c.paperId).title))}</button>` : '—'}</td>
          <td class="nowrap"><button class="sw sm ${c.off ? '' : 'on'}" data-ca="off" title="${c.off ? t('offHint') : t('onHint')}"><i></i></button><button class="ib" data-ca="up">${icon('up')}</button><button class="ib" data-ca="down">${icon('down')}</button><button class="ib" data-ca="edit">${icon('edit')}</button><button class="ib danger" data-ca="del">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>
        <div class="row"><button class="btn sm pri" id="xadd">${icon('plus')} ${t('addComponent')}</button><button class="btn sm" id="xcopy">${icon('copy')} ${t('copyScheme')}</button>${DEF(lid) ? `<button class="btn sm ghost" id="xrst">${t('resetScheme')}</button>` : ''}<button class="btn sm ghost danger" id="xdel">${icon('trash')} ${t('deleteScheme')}</button></div></div>`
      : `<div class="card empty"><p>${t('noScheme')}</p><div class="row"><button class="btn pri" id="xnew">${icon('plus')} ${t('newScheme')}</button>${DEF(lid) ? `<button class="btn" id="xrst">${t('resetScheme')}</button>` : ''}<button class="btn" id="xcopy">${icon('copy')} ${t('copyScheme')}</button></div></div>`}`;
    $('#xl', el).onchange = (e) => { Store.local.ui.xlid = e.target.value; Store.saveLocal(); UI.keepPos(() => PAGES.exams(m, R)); };
    const rst = $('#xrst', el); if (rst) rst.onclick = async () => { if (sc && !(await confirmDlg(t('resetScheme') + '?'))) return; EX().schemes[lid] = Store.clone(DEF(lid)); save(); };
    const nw = $('#xnew', el); if (nw) nw.onclick = () => { EX().schemes[lid] = { passTotal: 60, passFinal: 60, remedial: { tr: '', en: '', ar: '' }, comps: [] }; save(); };
    $('#xcopy', el).onclick = () => copyScheme(lid);
    if (!sc) return;
    $('#xpt', el).onchange = (e) => { sc.passTotal = +e.target.value || 0; save(); };
    $('#xpf', el).onchange = (e) => { sc.passFinal = +e.target.value || 0; save(); };
    $('#xrem', el).onclick = () => { const mm = modal(t('remedial'), triFields('rem', sc.remedial, { area: true }), { wide: true, foot: triBlockFoot(), onOk: async () => { sc.remedial = await readTriAuto(mm, 'rem'); save(); } }); wireTri(mm); };
    $('#xadd', el).onclick = () => editComp(sc, null);
    $('#xdel', el).onclick = async () => { if (await confirmDlg(t('deleteScheme') + '?')) { delete EX().schemes[lid]; save(); } };
    $$('[data-w]', el).forEach((inp) => (inp.onchange = () => { sc.comps[+inp.dataset.w].weight = Math.max(0, +inp.value || 0); save(); }));
    $$('[data-open]', el).forEach((b) => (b.onclick = () => go('exams', { xrun: b.dataset.open, xview: true })));
    $$('tr[data-ci]', el).forEach((tr) => { const i = +tr.dataset.ci; $$('[data-ca]', tr).forEach((b) => (b.onclick = async () => {
      const a = b.dataset.ca; const c = sc.comps[i];
      if (a === 'off') { c.off = !c.off; save(); }
      if (a === 'up' && move(sc.comps, i, -1)) save();
      if (a === 'down' && move(sc.comps, i, 1)) save();
      if (a === 'edit') editComp(sc, c);
      if (a === 'del' && (await confirmDlg(t('confirmDelete')))) { sc.comps.splice(i, 1); save(); }
    })); });
    dragRows(el, 'tr[data-ci]', 'ci', (from, to) => { sc.comps.splice(to, 0, sc.comps.splice(from, 1)[0]); save(); });
  }
  const DEF = (lid) => ((window.DEFAULT_EXAMS || {}).schemes || {})[lid];
  function dragRows(root, sel, key, done) {
    let from = null;
    $$(sel, root).forEach((row) => {
      row.addEventListener('dragstart', (e) => { from = +row.dataset[key]; row.classList.add('dragging'); try { e.dataTransfer.setData('text/plain', String(from)); } catch (er) {} });
      row.addEventListener('dragend', () => { row.classList.remove('dragging'); from = null; });
      row.addEventListener('dragover', (e) => { if (from == null) return; e.preventDefault(); });
      row.addEventListener('drop', (e) => { if (from == null) return; e.preventDefault(); const to = +row.dataset[key]; if (to !== from) done(from, to); });
    });
  }
  function editComp(sc, c) {
    const isNew = !c; c = c || { name: {}, freq: {}, purpose: {}, weight: 10 };
    const mm = modal(isNew ? t('addComponent') : t('edit'), `<h4>${t('component')}</h4>${triFields('name', c.name)}<h4>${t('frequency')}</h4>${triFields('freq', c.freq)}<h4>${t('purpose')}</h4>${triFields('purpose', c.purpose, { area: true })}
      <div class="grid3"><label class="fl sm"><span>${t('weight')} (%)</span><input type="number" id="cw" value="${c.weight}" min="0" max="100"></label>
      <label class="fl"><span>${t('examPaper')}</span><select id="cp"><option value="">${t('none')}</option>${papers().map((p) => `<option value="${p.id}" ${c.paperId === p.id ? 'selected' : ''}>${esc(tx(p.title))}</option>`).join('')}</select></label>
      <label class="chk"><input type="checkbox" id="cf" ${c.final ? 'checked' : ''}> ${t('finalExam')}</label></div>`, { wide: true, foot: triBlockFoot(), onOk: async (w) => {
      const name = await readTriAuto(mm, 'name'); if (!Object.values(name).some(Boolean)) { UI.toast(t('required'), 'err'); return false; }
      Object.assign(c, { name, freq: await readTriAuto(mm, 'freq'), purpose: await readTriAuto(mm, 'purpose'), weight: +$('#cw', w).value || 0, paperId: $('#cp', w).value || undefined, final: $('#cf', w).checked || undefined });
      if (c.final) sc.comps.forEach((x) => { if (x !== c) delete x.final; }); // tek bitirme sınavı
      if (isNew) { c.id = Store.uid('c'); sc.comps.push(c); }
      save();
    } });
    wireTri(mm);
  }
  function copyScheme(lid) {
    const L = genLevels().filter((l) => l.id !== lid && EX().schemes[l.id]);
    if (!L.length) { UI.toast(t('noScheme'), 'err'); return; }
    modal(t('copyScheme'), `<label class="fl"><span>${t('copyFrom')}</span><select id="cs">${L.map((l) => `<option value="${l.id}">${esc(lvlName(l.id))}</option>`).join('')}</select></label><p class="muted sm">${t('copySchemeHint')}</p>`, { onOk: (w) => {
      const src = Store.clone(EX().schemes[$('#cs', w).value]); src.comps.forEach((c) => { c.id = Store.uid('c'); delete c.paperId; }); EX().schemes[lid] = src; save();
    } });
  }

  /* ---------- sınav kâğıtları ---------- */
  function papersView(el, m, R) {
    const P = papers();
    el.innerHTML = `<div class="row"><button class="btn pri" id="pnew">${icon('plus')} ${t('newPaper')}</button>${(window.DEFAULT_EXAMS || {}).papers ? `<button class="btn ghost" id="prestore">${t('restorePapers')}</button>` : ''}</div>
      <div class="xpapers">${P.map((p, i) => `<div class="card xpaper" data-pi="${i}" draggable="true"><span class="grip">${icon('grip')}</span><div class="xpt"><b>${esc(tx(p.title))}</b><small>${esc(lvlName(paperLevelId(p)))} · ${p.time || 0} ${t('minShort')} · ${t('questionsN', { n: qCount(p) })} · ${pTotal(p)} ${t('pointsShort')}</small></div>
        <div class="acts2"><button class="btn sm" data-pa="view">${icon('search')} ${t('preview')}</button><button class="btn sm pri" data-pa="run">${icon('check')} ${t('applyExam')}</button><button class="btn sm" data-pa="print">${icon('print')} ${t('print')}</button>
        <button class="ib" data-pa="edit" title="${t('edit')}">${icon('edit')}</button><button class="ib" data-pa="dup" title="${t('duplicate')}">${icon('copy')}</button><button class="ib" data-pa="up">${icon('up')}</button><button class="ib" data-pa="down">${icon('down')}</button><button class="ib danger" data-pa="del">${icon('trash')}</button></div></div>`).join('') || `<div class="card empty">${t('noPapers')}</div>`}</div>`;
    $('#pnew', el).onclick = () => { const p = { id: Store.uid('p'), lvl: 1, title: { tr: t('newPaper'), en: t('newPaper'), ar: t('newPaper') }, time: 60, total: 100, parts: [{ id: 'p1', title: { tr: '', en: '', ar: '' }, pts: 0, blocks: [{ id: 'b1', instr: { tr: '', en: '', ar: '' }, qs: [] }] }] }; papers().push(p); save(true); go('exams', { xedit: p.id }); };
    const rs = $('#prestore', el); if (rs) rs.onclick = async () => { if (!(await confirmDlg(t('restorePapersQ')))) return; const have = new Set(papers().map((p) => p.id)); window.DEFAULT_EXAMS.papers.list.forEach((p) => { if (!have.has(p.id)) papers().push(Store.clone(p)); }); save(); };
    $$('.xpaper', el).forEach((row) => { const i = +row.dataset.pi; const p = P[i]; $$('[data-pa]', row).forEach((b) => (b.onclick = async () => {
      const a = b.dataset.pa;
      if (a === 'view') go('exams', { xrun: p.id, xview: true });
      if (a === 'run') go('exams', { xrun: p.id, xview: false });
      if (a === 'print') go('print', { ptype: 'exam', ppaper: p.id });
      if (a === 'edit') go('exams', { xedit: p.id });
      if (a === 'dup') { const c = Store.clone(p); c.id = Store.uid('p'); for (const l of ['tr', 'en', 'ar']) c.title[l] = (c.title[l] || '') + ' (2)'; P.splice(i + 1, 0, c); save(); }
      if (a === 'up' && move(P, i, -1)) save();
      if (a === 'down' && move(P, i, 1)) save();
      if (a === 'del' && (await confirmDlg(t('confirmDelete')))) { P.splice(i, 1); save(); }
    })); });
    dragRows(el, '.xpaper', 'pi', (from, to) => { P.splice(to, 0, P.splice(from, 1)[0]); save(); });
  }

  /* ---------- kâğıt görünümü (önizleme + uygulama + otomatik puanlama) ---------- */
  const norm = (s) => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[.,!?;:"“”()]/g, ' ').replace(/\s+/g, ' ').trim();
  function accepted(ans) {
    const out = new Set();
    String(ans || '').split(/\s+\/\s+|\s*;\s*/).forEach((a) => { out.add(norm(a.replace(/\([^)]*\)/g, ''))); out.add(norm(a)); });
    return out;
  }
  const AUTO = { mc: 1, match: 1, tf: 1, gap: 1, order: 1, rewrite: 1 };
  function autoScore(q, v) {
    if (v == null || v === '') return 0;
    if (q.type === 'mc' || q.type === 'match' || q.type === 'tf') return String(v).trim().toLowerCase() === String(q.ans || '').trim().toLowerCase() ? +q.pts || 0 : 0;
    if (AUTO[q.type] || q.type === 'open') { const A = accepted(q.ans); const n = norm(v); return A.has(n) || [...A].some((a) => a && n.includes(a) && a.split(' ').length >= 2) ? +q.pts || 0 : 0; }
    return 0;
  }
  function gapHtml(text, qs, ans, key) {
    const byN = {}; qs.forEach((q) => (byN[q.n] = q));
    return esc(text).replace(/\((\d+)\)\s*_+(\s*\(([A-Z]+)\))?/g, (all, n, h, hint) => { const q = byN[+n]; if (!q) return all; return `<span class="gap"><sup>${n}</sup>${key ? `<b class="kans">${esc(q.ans || '')}</b>` : `<input data-q="${q.id}" value="${esc(ans[q.id] || '')}" autocomplete="off">`}${hint ? ` <small>(${hint})</small>` : ''}</span>`; });
  }
  function paperHtml(p, ans, key, view) {
    const I = (o) => `<div class="xinstr"><b dir="ltr">${esc(o.en || '')}</b>${UI.lang() !== 'en' && o[UI.lang()] ? `<small>${esc(o[UI.lang()])}</small>` : ''}</div>`;
    return p.parts.map((pt, pi) => `<section class="xpart"><h3>${t('examPart', { n: pi + 1 })} — ${esc(tx(pt.title))} <small>(${pt.blocks.reduce((a, b) => a + b.qs.reduce((c, q) => c + (+q.pts || 0), 0), 0)} ${t('pointsShort')})</small></h3>
      ${pt.blocks.map((b) => `<div class="xblock" lang="en">${b.instr && (b.instr.en || b.instr.tr) ? I(b.instr) : ''}
        ${b.passage ? `<div class="xpass" dir="ltr">${esc(b.passage).replace(/\n/g, '<br>')}</div>` : ''}
        ${b.wordbox ? `<div class="xbox" dir="ltr">${b.wordbox.map(esc).join(' • ')}</div>` : ''}
        ${b.choices ? `<div class="xchoices" dir="ltr">${b.choices.map((c) => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
        ${b.tasks ? `<ol class="xtasks" dir="ltr">${b.tasks.map((x) => `<li>${esc(x.replace(/^\d+\.\s*/, ''))}</li>`).join('')}</ol>` : ''}
        ${b.text ? `<div class="xgap" dir="ltr">${b.text.map((tx2) => `<p>${gapHtml(tx2, b.qs, ans, key)}</p>`).join('')}</div>` : ''}
        <div class="xqs" dir="ltr">${b.qs.filter((q) => q.type !== 'gap').map((q) => qHtml(q, ans, key, view)).join('')}</div></div>`).join('')}</section>`).join('');
  }
  function qHtml(q, ans, key, view) {
    const v = ans[q.id] || '';
    const num = q.n ? `<b class="qn">${q.n}.</b> ` : '';
    const k = key ? `<div class="kans">${icon('check')} ${esc(q.type === 'write' ? tx(q.model) : q.ans || '')}</div>` : '';
    if (q.type === 'mc') return `<div class="xq">${num}${esc(q.q)}<div class="xopts">${q.opts.map((o, i) => { const L = 'ABCD'[i]; return `<label class="xopt ${key && q.ans === L ? 'right' : ''}"><input type="radio" name="${q.id}" value="${L}" data-q="${q.id}" ${v === L ? 'checked' : ''} ${view ? 'disabled' : ''}> ${L}) ${esc(o)}</label>`; }).join('')}</div></div>`;
    if (q.type === 'match') return `<div class="xq">${num}${esc(q.q)} <select data-q="${q.id}" ${view ? 'disabled' : ''}><option value=""></option>${q.opts.map((o) => `<option ${v === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${k}</div>`;
    if (q.type === 'tf') return `<div class="xq">${num}${esc(q.q)} <span class="tfseg">${['T', 'F'].map((x) => `<label><input type="radio" name="${q.id}" value="${x}" data-q="${q.id}" ${v === x ? 'checked' : ''} ${view ? 'disabled' : ''}> ${x}</label>`).join('')}</span>${k}</div>`;
    if (q.type === 'write') return `<div class="xq">${view ? '<div class="wlines"></div>' : `<textarea rows="8" data-q="${q.id}" class="full">${esc(v)}</textarea>`}${k}</div>`;
    return `<div class="xq">${num}${esc(q.q)}${q.tpl ? `<div class="tpl">${esc(q.tpl)}</div>` : ''}${view ? '' : `<input class="full" data-q="${q.id}" value="${esc(v)}" autocomplete="off">`}${k}</div>`;
  }
  function paperRunner(m, R) {
    const p = paperOf(R.xrun); if (!p) { R.xrun = null; return PAGES.exams(m, R); }
    const view = !!R.xview; const st = Store.db.students[R.xsid];
    const lid = paperLevelId(p); const sc = EX().schemes[lid];
    const comps = sc ? sc.comps.filter((c) => !c.off) : [];
    let cid = R.xcid && comps.some((c) => c.id === R.xcid) ? R.xcid : ((comps.find((c) => c.paperId === p.id) || comps.find((c) => c.final) || comps[0] || {}).id);
    const prev = st && cid ? (((st.exams || {})[lid] || {}).comps || {})[cid] : null;
    const ans = (R.xans = R.xans && R.xans.__p === p.id ? R.xans : Object.assign({ __p: p.id }, prev && prev.paperId === p.id ? prev.ans || {} : {}));
    const manual = (R.xman = R.xman && R.xman.__p === p.id ? R.xman : Object.assign({ __p: p.id }, prev && prev.paperId === p.id ? prev.man || {} : {}));
    const S = Store.students(false, 'all');
    m.innerHTML = `<div class="ph-row"><button class="ib" id="xbk">${icon('up', 'rot-l')}</button><h2 class="ph">${icon('exam')} ${esc(tx(p.title))}</h2>
      <div class="tools"><div class="seg"><button class="${view ? 'on' : ''}" data-v="1">${t('preview')}</button><button class="${!view ? 'on' : ''}" data-v="0">${t('applyExam')}</button></div>
      <button class="btn sm" id="xpr">${icon('print')} ${t('print')}</button><button class="btn sm" id="xkey">${icon('check')} ${t(R.xkey ? 'hideKey' : 'showKey')}</button><button class="btn sm" id="xed">${icon('edit')} ${t('edit')}</button></div></div>
      <p class="muted sm">${esc(lvlName(lid))} · ${p.time || 0} ${t('minShort')} · ${pTotal(p)} ${t('pointsShort')}</p>
      ${!view ? `<div class="card xrunbar"><div class="grid3"><label class="fl"><span>${t('student')}</span><select id="xs"><option value="">${t('selectStudent')}</option>${S.map((s) => `<option value="${s.id}" ${s.id === R.xsid ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
        <label class="fl"><span>${t('component')}</span><select id="xc">${comps.map((c) => `<option value="${c.id}" ${c.id === cid ? 'selected' : ''}>${esc(tx(c.name))}</option>`).join('') || `<option value="">${t('noScheme')}</option>`}</select></label>
        <label class="fl"><span>${t('date')}</span><input type="date" id="xd" value="${(prev && prev.date) || today()}"></label></div>
        <div class="xscore" id="xscore"></div><div class="row"><button class="btn pri" id="xsave" ${st && cid ? '' : 'disabled'}>${icon('check')} ${t('saveResult')}</button><button class="btn ghost" id="xclr">${t('clearAnswers')}</button></div></div>` : ''}
      <div class="card xpaperv ${view ? 'view' : ''}">${paperHtml(p, ans, !!R.xkey, view)}</div>
      ${!view ? `<div class="card"><h3>${t('manualPoints')}</h3><p class="muted sm">${t('manualHelp')}</p><div class="xman" id="xman"></div></div>` : ''}`;
    $('#xbk', m).onclick = () => { R.xrun = null; R.xans = null; R.xman = null; UI.keepPos(() => PAGES.exams(m, R)); };
    $$('[data-v]', m).forEach((b) => (b.onclick = () => { R.xview = b.dataset.v === '1'; UI.keepPos(() => PAGES.exams(m, R)); }));
    $('#xpr', m).onclick = () => go('print', { ptype: 'exam', ppaper: p.id });
    $('#xkey', m).onclick = () => { R.xkey = !R.xkey; UI.keepPos(() => PAGES.exams(m, R)); };
    $('#xed', m).onclick = () => go('exams', { xedit: p.id, xrun: null });
    if (view) return;
    const allQ = []; p.parts.forEach((pt) => pt.blocks.forEach((b) => b.qs.forEach((q) => allQ.push(q))));
    const total = pTotal(p) || 1;
    const scoreOf = (q) => (manual[q.id] != null && manual[q.id] !== '' ? +manual[q.id] : autoScore(q, ans[q.id]));
    const refresh = () => {
      const got = allQ.reduce((a, q) => a + scoreOf(q), 0); const pct = Math.round((got / total) * 100);
      $('#xscore', m).innerHTML = `<b>${got} / ${total}</b> ${t('pointsShort')} · <b class="big">%${pct}</b>`;
      $('#xman', m).innerHTML = allQ.map((q) => `<label class="xmq ${q.type === 'write' || q.type === 'open' ? 'need' : ''}"><span>${q.n || '✎'}</span><input type="number" min="0" max="${q.pts}" step="0.5" data-man="${q.id}" value="${scoreOf(q)}"><small>/ ${q.pts}</small></label>`).join('');
      $$('[data-man]', m).forEach((inp) => (inp.onchange = () => { manual[inp.dataset.man] = inp.value === '' ? '' : Math.min(+inp.value, +(allQ.find((q) => q.id === inp.dataset.man) || {}).pts || 0); refresh(); }));
      return pct;
    };
    $$('[data-q]', m).forEach((inp) => { const ev = inp.tagName === 'SELECT' || inp.type === 'radio' ? 'change' : 'input'; inp.addEventListener(ev, () => { ans[inp.dataset.q] = inp.value; delete manual[inp.dataset.q]; refresh(); }); });
    refresh();
    $('#xs', m).onchange = (e) => { R.xsid = e.target.value; R.xans = null; R.xman = null; UI.keepPos(() => PAGES.exams(m, R)); };
    $('#xc', m).onchange = (e) => { R.xcid = e.target.value; UI.keepPos(() => PAGES.exams(m, R)); };
    $('#xclr', m).onclick = () => { R.xans = { __p: p.id }; R.xman = { __p: p.id }; UI.keepPos(() => PAGES.exams(m, R)); };
    $('#xsave', m).onclick = () => {
      const s = Store.db.students[R.xsid]; const c = $('#xc', m).value; if (!s || !c) { UI.toast(t('selectStudent'), 'err'); return; }
      const pct = refresh(); const A = Object.assign({}, ans); delete A.__p; const M = Object.assign({}, manual); delete M.__p;
      setScore(s, lid, c, { score: pct, date: $('#xd', m).value || today(), paperId: p.id, ans: A, man: M });
      Store.log('activity_exam', { s: s.name, n: pct });
      Store.touch('student:' + s.id); UI.toast(t('resultSaved', { n: pct }));
    };
  }

  /* ---------- kâğıt düzenleyici ---------- */
  const QTYPES = ['mc', 'match', 'tf', 'gap', 'rewrite', 'order', 'open', 'write'];
  function paperEditor(m, R) {
    const p = paperOf(R.xedit); if (!p) { R.xedit = null; return PAGES.exams(m, R); }
    const L = genLevels();
    const ch = (silent) => save(silent);
    const rer = () => UI.keepPos(() => paperEditor(m, R));
    m.innerHTML = `<div class="ph-row"><button class="ib" id="xbk">${icon('up', 'rot-l')}</button><h2 class="ph">${icon('edit')} ${t('editPaper')}</h2><div class="tools"><button class="btn sm" id="xpv">${icon('search')} ${t('preview')}</button><button class="btn sm pri" id="xdone">${icon('check')} ${t('ghostDone')}</button></div></div>
      <div class="card"><div class="row"><b>${esc(tx(p.title))}</b><button class="ib" id="xtitle">${icon('edit')}</button></div>
      <div class="grid3"><label class="fl"><span>${t('level')}</span><select id="xlv">${L.map((l, i) => `<option value="${i}" ${+p.lvl === i ? 'selected' : ''}>${i} — ${esc(tx(l.title))}</option>`).join('')}</select></label>
      <label class="fl sm"><span>${t('duration')} (${t('minShort')})</span><input type="number" id="xtime" value="${p.time || 0}"></label><div class="fl"><span>${t('totalPoints')}</span><b>${pTotal(p)}</b></div></div></div>
      ${p.parts.map((pt, pi) => `<div class="card xepart" data-pi="${pi}"><div class="ph-row"><h3>${t('examPart', { n: pi + 1 })} — ${esc(tx(pt.title))}</h3><div class="acts"><button class="ib" data-pa="ptitle">${icon('edit')}</button><button class="ib" data-pa="pup">${icon('up')}</button><button class="ib" data-pa="pdown">${icon('down')}</button><button class="ib danger" data-pa="pdel">${icon('trash')}</button></div></div>
        ${pt.blocks.map((b, bi) => `<div class="xeblock" data-bi="${bi}"><div class="row"><span class="muted">${t('examSection')} ${bi + 1}</span><span class="sp"></span><button class="btn sm ghost" data-ba="instr">${icon('translate')} ${t('instructions')}</button><button class="ib" data-ba="bup">${icon('up')}</button><button class="ib" data-ba="bdown">${icon('down')}</button><button class="ib danger" data-ba="bdel">${icon('trash')}</button></div>
          <p class="sm" dir="ltr">${esc((b.instr || {}).en || '')}</p>
          <details ${b.passage || b.wordbox || b.text || b.choices || b.tasks ? 'open' : ''}><summary>${t('readingText')}</summary>
            <label class="fl"><span>${t('readingText')}</span><textarea rows="4" dir="ltr" data-bf="passage">${esc(b.passage || '')}</textarea></label>
            <label class="fl"><span>${t('wordBox')} (•)</span><input dir="ltr" data-bf="wordbox" value="${esc((b.wordbox || []).join(' • '))}"></label>
            <label class="fl"><span>${t('gapText')}</span><textarea rows="4" dir="ltr" data-bf="text" placeholder="(26) ____">${esc((b.text || []).join('\n'))}</textarea></label>
            <label class="fl"><span>${t('matchChoices')}</span><textarea rows="3" dir="ltr" data-bf="choices">${esc((b.choices || []).join('\n'))}</textarea></label>
            <label class="fl"><span>${t('writingTasks')}</span><textarea rows="3" dir="ltr" data-bf="tasks">${esc((b.tasks || []).join('\n'))}</textarea></label></details>
          <table class="t xeq"><thead><tr><th>#</th><th>${t('qType')}</th><th>${t('question')}</th><th>${t('options')}</th><th>${t('answer')}</th><th>${t('pointsShort')}</th><th></th></tr></thead><tbody>
          ${b.qs.map((q, qi) => `<tr data-qi="${qi}"><td><input class="n" type="number" data-qf="n" value="${q.n}"></td><td><select data-qf="type">${QTYPES.map((x) => `<option value="${x}" ${q.type === x ? 'selected' : ''}>${t('qt_' + x)}</option>`).join('')}</select></td>
            <td><input dir="ltr" data-qf="q" value="${esc(q.q || '')}"></td><td><input dir="ltr" data-qf="opts" value="${esc((q.opts || []).join(' | '))}" ${['mc', 'match'].includes(q.type) ? '' : 'disabled'}></td>
            <td><input dir="ltr" data-qf="ans" value="${esc(q.type === 'write' ? '' : q.ans || '')}" ${q.type === 'write' ? 'disabled' : ''}></td><td><input class="n" type="number" step="0.5" data-qf="pts" value="${q.pts || 0}"></td>
            <td class="nowrap"><button class="ib" data-qa="up">${icon('up')}</button><button class="ib" data-qa="down">${icon('down')}</button><button class="ib danger" data-qa="del">${icon('trash')}</button></td></tr>`).join('')}</tbody></table>
          <button class="btn sm" data-ba="addq">${icon('plus')} ${t('addQuestion')}</button></div>`).join('')}
        <button class="btn sm ghost" data-pa="addb">${icon('plus')} ${t('addSection')}</button></div>`).join('')}
      <button class="btn" id="xaddp">${icon('plus')} ${t('addPart')}</button>`;
    const back = () => { R.xedit = null; UI.keepPos(() => PAGES.exams(m, R)); };
    $('#xbk', m).onclick = back; $('#xdone', m).onclick = () => { save(); back(); };
    $('#xpv', m).onclick = () => { save(true); go('exams', { xedit: null, xrun: p.id, xview: true }); };
    $('#xlv', m).onchange = (e) => { p.lvl = +e.target.value; ch(true); };
    $('#xtime', m).onchange = (e) => { p.time = +e.target.value || 0; ch(true); };
    $('#xtitle', m).onclick = () => editTriModal(t('examTitle'), p.title, (v) => { p.title = v; ch(); rer(); });
    $('#xaddp', m).onclick = () => { p.parts.push({ id: Store.uid('pt'), title: { tr: '', en: '', ar: '' }, blocks: [{ id: Store.uid('b'), instr: { tr: '', en: '', ar: '' }, qs: [] }] }); ch(true); rer(); };
    const nextN = () => Math.max(0, ...p.parts.flatMap((x) => x.blocks.flatMap((b) => b.qs.map((q) => +q.n || 0)))) + 1;
    $$('.xepart', m).forEach((pe) => {
      const pi = +pe.dataset.pi; const pt = p.parts[pi];
      $$(':scope > .ph-row [data-pa], :scope > [data-pa]', pe).forEach((b) => (b.onclick = async () => {
        const a = b.dataset.pa;
        if (a === 'ptitle') editTriModal(t('examPart', { n: pi + 1 }), pt.title, (v) => { pt.title = v; ch(); rer(); });
        if (a === 'pup' && move(p.parts, pi, -1)) { ch(true); rer(); }
        if (a === 'pdown' && move(p.parts, pi, 1)) { ch(true); rer(); }
        if (a === 'pdel' && (await confirmDlg(t('confirmDelete')))) { p.parts.splice(pi, 1); ch(true); rer(); }
        if (a === 'addb') { pt.blocks.push({ id: Store.uid('b'), instr: { tr: '', en: '', ar: '' }, qs: [] }); ch(true); rer(); }
      }));
      $$('.xeblock', pe).forEach((be) => {
        const bi = +be.dataset.bi; const b = pt.blocks[bi];
        $$('[data-bf]', be).forEach((inp) => (inp.onchange = () => {
          const k = inp.dataset.bf; const v = inp.value.trim();
          if (k === 'passage') b.passage = v || undefined;
          if (k === 'wordbox') b.wordbox = v ? v.split('•').map((x) => x.trim()).filter(Boolean) : undefined;
          if (k === 'text' || k === 'choices' || k === 'tasks') b[k] = v ? v.split('\n').map((x) => x.trim()).filter(Boolean) : undefined;
          ch(true);
        }));
        $$(':scope > .row [data-ba], :scope > [data-ba]', be).forEach((btn) => (btn.onclick = async () => {
          const a = btn.dataset.ba;
          if (a === 'instr') editTriModal(t('instructions'), b.instr || {}, (v) => { b.instr = v; ch(); rer(); }, true);
          if (a === 'bup' && move(pt.blocks, bi, -1)) { ch(true); rer(); }
          if (a === 'bdown' && move(pt.blocks, bi, 1)) { ch(true); rer(); }
          if (a === 'bdel' && (await confirmDlg(t('confirmDelete')))) { pt.blocks.splice(bi, 1); ch(true); rer(); }
          if (a === 'addq') { const last = b.qs[b.qs.length - 1]; const n = nextN(); b.qs.push({ id: 'q' + Store.uid(''), n, type: last ? last.type : 'mc', q: '', opts: last && last.opts ? last.opts.map(() => '') : ['', '', '', ''], ans: '', pts: last ? last.pts : 2 }); ch(true); rer(); }
        }));
        $$('tr[data-qi]', be).forEach((tr) => {
          const qi = +tr.dataset.qi; const q = b.qs[qi];
          $$('[data-qf]', tr).forEach((inp) => (inp.onchange = () => {
            const k = inp.dataset.qf; const v = inp.value;
            if (k === 'opts') q.opts = v.split('|').map((x) => x.trim());
            else if (k === 'n' || k === 'pts') q[k] = +v || 0;
            else q[k] = v.trim();
            if (k === 'type') { if (q.type === 'match' && (!q.opts || !q.opts.length)) q.opts = ['a', 'b', 'c', 'd', 'e']; if (q.type === 'write') { q.n = 0; q.model = q.model || { tr: '', en: '', ar: '' }; } ch(true); rer(); return; }
            ch(true);
          }));
          $$('[data-qa]', tr).forEach((btn) => (btn.onclick = async () => {
            const a = btn.dataset.qa;
            if (a === 'up' && move(b.qs, qi, -1)) { ch(true); rer(); }
            if (a === 'down' && move(b.qs, qi, 1)) { ch(true); rer(); }
            if (a === 'del' && (await confirmDlg(t('confirmDelete')))) { b.qs.splice(qi, 1); ch(true); rer(); }
          }));
        });
      });
    });
  }
  function editTriModal(title, val, done, area) {
    const mm = modal(title, triFields('v', val, { area }), { wide: true, foot: triBlockFoot(), onOk: async () => { done(await readTriAuto(mm, 'v')); } });
    wireTri(mm);
  }

  /* ---------- öğrenci sayfası: sınavlar sekmesi ---------- */
  UI.studentExamsTab = function (el, s) {
    if (!EX()) { el.innerHTML = ''; return; }
    const L = genLevels(); const pl = new Set(Store.inProg('genel', () => Store.pathLevels(s)));
    el.innerHTML = `<p class="muted sm">${t('stExamsHelp')}</p>` + L.map((l, i) => {
      if (l.off || !pl.has(i)) return '';
      const r = calc(s, l.id); if (!r) return '';
      const rec = ((s.exams || {})[l.id] || {}).comps || {}; const ev = s.evals[l.id] || {};
      const st = r.complete ? (r.pass ? 'achieved' : 'fail') : r.soFar != null ? 'inProgress' : 'notStarted';
      return `<div class="card xst" data-lid="${l.id}"><div class="ph-row"><h3><span class="lv-no sm">${i}</span> ${esc(tx(l.title))}</h3>
        <div class="xsum st-${st}"><b>%${r.complete ? r.total : r.soFar ?? 0}</b><small>${r.complete ? t(r.pass ? 'passed' : 'failed') : t('examSoFar')}</small></div></div>
        <div class="tbl"><table class="t"><thead><tr><th>${t('component')}</th><th>${t('weight')}</th><th>${t('examScore')}</th><th>${t('date')}</th><th>${t('note')}</th><th></th></tr></thead><tbody>
        ${r.comps.map((c) => { const x = rec[c.id] || {}; return `<tr data-cid="${c.id}"><td><b>${esc(tx(c.name))}</b>${c.final ? ` <span class="tag fin">${t('finalExam')}</span>` : ''}<small class="muted blk">${esc(tx(c.freq))}</small></td><td>%${c.weight}</td>
          <td><input type="number" min="0" max="100" data-sf="score" value="${x.score ?? ''}" ${ev.locked ? 'disabled' : ''}></td><td><input type="date" data-sf="date" value="${x.date || ''}" ${ev.locked ? 'disabled' : ''}></td><td><input data-sf="note" value="${esc(x.note || '')}" ${ev.locked ? 'disabled' : ''}></td>
          <td class="nowrap">${c.paperId && paperOf(c.paperId) ? `<button class="btn sm" data-run="${c.paperId}">${icon('check')} ${t('applyExam')}</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>
        <p class="sm">${t('passRule', { a: r.sc.passTotal, b: r.sc.passFinal })}${ev.locked ? ` · ${icon('lock')} ${t('locked')}` : ev.fromExams ? ` · ${t('appliedToEval')}` : ''}</p>
        ${r.complete && !r.pass ? `<p class="warn sm">${icon('note')} ${esc(tx(r.sc.remedial))}</p>` : ''}</div>`;
    }).join('');
    $$('.xst', el).forEach((card) => {
      const lid = card.dataset.lid;
      $$('tr[data-cid]', card).forEach((tr) => { const cid = tr.dataset.cid; $$('[data-sf]', tr).forEach((inp) => (inp.onchange = () => {
        const k = inp.dataset.sf; const v = inp.value.trim();
        const cur = (((s.exams || {})[lid] || {}).comps || {})[cid] || {};
        const d = Object.assign({}, cur, { [k]: k === 'score' ? (v === '' ? '' : Math.max(0, Math.min(100, +v))) : v });
        if (k === 'score' && v !== '' && !d.date) d.date = today();
        const empty = (d.score === '' || d.score == null) && !d.note && !d.date;
        setScore(s, lid, cid, empty ? null : d);
        Store.touch('student:' + s.id);
      })); });
      $$('[data-run]', card).forEach((b) => (b.onclick = () => go('exams', { xrun: b.dataset.run, xview: false, xsid: s.id, xcid: b.closest('tr').dataset.cid, xans: null, xman: null })));
    });
  };

  /* ---------- çıktı: sınav kâğıdı + cevap anahtarı ---------- */
  DocModel.B.exam = function (o) {
    const c = DocModel.ctx(o); const p = paperOf(o.paperId) || papers()[0];
    if (!p) return { title: c.L('examPapers'), lang: c.lang, blocks: [{ t: 'p', text: c.L('noPapers') }] };
    const sec = (o2) => (c.lang !== 'en' ? o2[c.lang] || '' : '');
    const blocks = [DocModel.header(c, DocModel.tx(p.title, c.lang), lvlNameL(p, c) + ' · ' + (p.time || 0) + ' ' + c.L('minShort') + ' · ' + pTotal(p) + ' ' + c.L('pointsShort'))];
    blocks.push({ t: 'kv', rows: [[c.L('fullName'), ''], [c.L('className'), ''], [c.L('date'), ''], [c.L('examScore'), '______ / ' + pTotal(p)]] });
    if (!o.keyOnly) p.parts.forEach((pt, pi) => {
      blocks.push({ t: 'h2', text: c.L('examPart').replace('{n}', pi + 1) + ' — ' + DocModel.tx(pt.title, c.lang) + ' (' + pt.blocks.reduce((a, b) => a + b.qs.reduce((x, q) => x + (+q.pts || 0), 0), 0) + ' ' + c.L('pointsShort') + ')' });
      pt.blocks.forEach((b) => {
        if (b.instr && b.instr.en) blocks.push({ t: 'p', text: b.instr.en, text2: sec(b.instr), style: 'bold' });
        if (b.passage) b.passage.split(/\n\s*\n/).forEach((para) => blocks.push({ t: 'p', text: para.replace(/\n/g, ' ') }));
        if (b.wordbox) blocks.push({ t: 'table', cols: [{ label: c.L('wordBox'), w: 100 }], rows: [{ type: 'row', cells: [{ text: b.wordbox.join('  •  '), bold: true }] }] });
        if (b.choices) blocks.push({ t: 'list', items: b.choices.map((x) => ({ text: x })) });
        if (b.tasks) blocks.push({ t: 'list', items: b.tasks.map((x) => ({ text: x })) });
        if (b.text) b.text.forEach((x) => blocks.push({ t: 'p', text: x }));
        b.qs.forEach((q) => {
          if (q.type === 'gap') return;
          if (q.type === 'write') { blocks.push({ t: 'lines', n: 10 }); return; }
          if (q.type === 'mc') { blocks.push({ t: 'p', text: q.n + '. ' + q.q }); blocks.push({ t: 'p', text: q.opts.map((x, i) => 'ABCD'[i] + ') ' + x).join('     '), style: 'muted' }); return; }
          if (q.type === 'match' || q.type === 'tf') { blocks.push({ t: 'p', text: q.n + '. ' + q.q + '   ( ____ )' }); return; }
          blocks.push({ t: 'p', text: q.n + '. ' + q.q });
          if (q.tpl) blocks.push({ t: 'p', text: q.tpl, style: 'muted' });
          else blocks.push({ t: 'lines', n: q.type === 'open' ? 2 : 1 });
        });
      });
    });
    if (o.withKey || o.keyOnly) {
      blocks.push({ t: 'h1', text: c.L('answerKey') + ' — ' + DocModel.tx(p.title, c.lang), pageBreak: !o.keyOnly });
      p.parts.forEach((pt, pi) => {
        const rows = []; pt.blocks.forEach((b) => b.qs.forEach((q) => rows.push({ type: 'row', cells: [{ text: q.n ? String(q.n) : '✎', bold: true }, { text: q.type === 'write' ? DocModel.tx(q.model, c.lang) : q.ans || '' }, { text: String(q.pts || 0) }] })));
        blocks.push({ t: 'h2', text: c.L('examPart').replace('{n}', pi + 1) + ' — ' + DocModel.tx(pt.title, c.lang) });
        blocks.push({ t: 'table', cols: [{ label: '#', w: 8, align: 'c' }, { label: c.L('answer'), w: 80 }, { label: c.L('pointsShort'), w: 12, align: 'c' }], rows });
      });
    }
    return { title: DocModel.tx(p.title, c.lang) + (o.keyOnly ? ' — ' + c.L('answerKey') : ''), lang: c.lang, blocks };
  };
  function lvlNameL(p, c) { const l = genLevels()[p.lvl]; return l ? c.L('level') + ' ' + p.lvl + ' — ' + DocModel.tx(l.title, c.lang) : ''; }
})();
