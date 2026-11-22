/* Çıktı merkezi: belge türü, dil/çeviri, antetli şablon, önizleme, yazdır / PDF / DOCX */
(function () {
  const { $, $$, esc, icon, tx, modal, confirmDlg, PAGES } = UI;
  const TYPES = [
    ['blank', 'printBlank', 'printBlankD', 'book', false],
    ['report', 'printReport', 'printReportD', 'assess', true],
    ['evalForm', 'printEvalForm', 'printEvalFormD', 'flag', false],
    ['cert', 'printCert', 'printCertD', 'plane', true],
    ['classSummary', 'printClass', 'printClassD', 'users', false],
    ['flight', 'printFlight', 'printFlightD', 'plane', false],
    ['plan', 'printPlan', 'printPlanD', 'cal', false],
    ['exam', 'printExam', 'printExamD', 'exam', false], // v1.1: sınav kâğıdı ve cevap anahtarı
    ['grammar', 'printGrammar', 'printGrammarD', 'clock', false], // v1.1: dil bilgisi kartı / zaman çizelgesi
    ['dict', 'printDict', 'printDictD', 'dict', false], // v1.1: sözlük listesi (seviyeye göre)
    ['vocab', 'printVocab', 'printVocabD', 'vocab', false], // v1.2: Kelime Testi (öğrenci kâğıdı / cevap anahtarı)
  ];
  const opts = () => {
    const u = (Store.local.ui.print = Object.assign({ type: 'blank', lang: UI.lang(), lang2: UI.lang2(), from: 0, to: 99, showSource: true, noteCol: true, showLinks: false, withMarks: true, includeDetails: true, template: '', templateFirst: false, marginTop: 30, marginBottom: 22, marginSide: 14, landscape: false, translateNotes: false, studentId: '' }, Store.local.ui.print || {}));
    return u;
  };
  let tplCache = [];

  PAGES.print = async (m, R) => {
    const o = opts();
    if (R.ptype) { o.type = R.ptype; R.ptype = null; }
    if (R.psid) { o.studentId = R.psid; R.psid = null; }
    if (R.ppaper) { o.paperId = R.ppaper; R.ppaper = null; }
    if (R.pcard) { o.cardId = R.pcard; R.pcard = null; }
    if (R.pkey !== undefined && R.pkey !== null) { o.keyMode = R.pkey; R.pkey = null; }
    tplCache = await Templates.list();
    // v1.1: varsayılan antet (Ayarlar / şablon yöneticisi / önizleme penceresinden seçilir) — kullanıcı bu cihazda başka antet seçmediyse uygulanır
    if (!o.tplPicked && Store.db.config.defaultTpl && tplCache.some((x) => x.id === Store.db.config.defaultTpl)) o.template = Store.db.config.defaultTpl;
    // v1.7: ilk açılışta hazır orijinal şablon seçilir (eski bozuk DOCX dönüşümü yerine)
    if (!Store.local.tpl17) {
      Store.local.tpl17 = true; o.autoMargin = true;
      const cur = tplCache.find((x) => x.id === o.template); const b = tplCache.find((x) => x.builtin);
      if (o.template && b && (!cur || (!cur.builtin && !cur.kind))) o.template = b.id; // eski sürümde hatalı dönüştürülmüş şablon yerine orijinali
      Store.saveLocal();
    }
    const curTpl = tplCache.find((x) => x.id === o.template);
    const adj = curTpl && curTpl.builtin ? Object.assign({}, curTpl, (Store.local.tplAdj || {})[curTpl.id]) : curTpl;
    if (adj && o.autoMargin !== false) { o.marginTop = adj.mt || o.marginTop; o.marginBottom = adj.mb || o.marginBottom; }
    const L = Store.levels(); const S = Store.students(false, Store.prog);
    if (o.studentId && !S.some((x) => x.id === o.studentId)) o.studentId = '';
    const T = TYPES.find((x) => x[0] === o.type) || TYPES[0];
    const needStudent = T[4]; const optStudent = ['blank', 'evalForm', 'flight'].includes(o.type);
    if (needStudent && !Store.db.students[o.studentId] && S[0]) o.studentId = S[0].id;
    const langOpts = (v, withNone) => (withNone ? `<option value="">${t('none')}</option>` : '') + ['tr', 'en', 'ar'].map((l) => `<option value="${l}" ${v === l ? 'selected' : ''}>${t('langName_' + l)}</option>`).join('');
    m.innerHTML = `<h2 class="ph">${icon('print')} ${t('printTitle')} <span class="pill p-${Store.prog}">${t('prog_' + Store.prog)}</span></h2>
      <div class="ptypes">${TYPES.map(([k, l, d, ic]) => `<button class="ptype ${o.type === k ? 'on' : ''}" data-pt="${k}">${icon(ic)}<b>${t(l)}</b><small>${t(d)}</small></button>`).join('')}</div>
      <div class="card popts"><h3>${t('printOptions')}</h3><div class="grid3">
        ${needStudent || optStudent ? `<label class="fl"><span>${t('student')}</span><select data-o="studentId">${optStudent ? `<option value="">${t('blankStudent')}</option>` : ''}${S.map((s) => `<option value="${s.id}" ${o.studentId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>` : ''}
        ${o.type === 'exam' ? `<label class="fl"><span>${t('examPaper')}</span><select data-o="paperId">${((Store.db.exams || {}).papers || { list: [] }).list.map((p) => `<option value="${p.id}" ${o.paperId === p.id ? 'selected' : ''}>${esc(tx(p.title))}</option>`).join('') || `<option value="">${t('noPapers')}</option>`}</select></label>
          <label class="fl"><span>${t('answerKey')}</span><select data-o="keyMode"><option value="">${t('keyNone')}</option><option value="with" ${o.keyMode === 'with' ? 'selected' : ''}>${t('keyWith')}</option><option value="only" ${o.keyMode === 'only' ? 'selected' : ''}>${t('keyOnly')}</option></select></label>` : ''}
        ${o.type === 'vocab' ? `<label class="fl"><span>${t('answerKey')}</span><select data-o="keyMode"><option value="">${t('vtSheetOnly')}</option><option value="with" ${o.keyMode === 'with' ? 'selected' : ''}>${t('vtSheetKey')}</option><option value="only" ${o.keyMode === 'only' ? 'selected' : ''}>${t('keyOnly')}</option></select></label><p class="muted sm">${t('vtPrintHint')}</p>` : ''}
        ${o.type === 'grammar' ? `<label class="fl"><span>${t('grammarCard')}</span><select data-o="cardId">${(window.GRAMMAR ? GRAMMAR.order : []).map((k) => `<option value="${k}" ${o.cardId === k ? 'selected' : ''}>${esc(tx(GRAMMAR.cards[k].title))}</option>`).join('')}</select></label>` : ''}
        ${o.type === 'dict' ? `<label class="fl"><span>CEFR</span><select data-o="dictLvl"><option value="">${t('filterAll')}</option>${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => `<option ${o.dictLvl === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
        ${o.type === 'plan' ? `<label class="fl"><span>${t('nav_plans')}</span><select data-o="planId">${Store.plans().map((p) => `<option value="${p.id}" ${o.planId === p.id ? 'selected' : ''}>${esc(plainText(UI.planName(p)))}</option>`).join('') || `<option value="">${t('planNoPlans')}</option>`}</select></label>` : ''}
        <label class="fl"><span>${icon('globe')} ${t('outLang')}</span><select data-o="lang">${langOpts(o.lang)}</select></label>
        <label class="fl"><span>${icon('translate')} ${t('secondLang')}</span><select data-o="lang2">${langOpts(o.lang2, true)}</select></label>
        ${['blank', 'report', 'evalForm'].includes(o.type) ? `<label class="fl"><span>${t('levelRange')} — ${t('fromLevel')}</span><select data-o="from" data-num>${L.map((l, i) => `<option value="${i}" ${+o.from === i ? 'selected' : ''}>${i} — ${esc(tx(l.title))}${l.off ? ' (' + t('offLabel') + ')' : ''}</option>`).join('')}</select></label>
        <label class="fl"><span>${t('levelRange')} — ${t('toLevel')}</span><select data-o="to" data-num>${L.map((l, i) => `<option value="${i}" ${Math.min(+o.to, L.length - 1) === i ? 'selected' : ''}>${i} — ${esc(tx(l.title))}${l.off ? ' (' + t('offLabel') + ')' : ''}</option>`).join('')}</select></label>` : ''}
        <label class="fl"><span>${t('template')}</span><div class="row nowrap"><select data-o="template"><option value="">${t('noTemplate')}</option>${tplCache.map((x) => `<option value="${x.id}" ${o.template === x.id ? 'selected' : ''}>${esc(LangGuard.ptx(x.name))}</option>`).join('')}</select><button class="btn sm" id="tplMan">${t('manageTemplates')}</button></div></label>
        ${o.template ? `<label class="fl"><span>&nbsp;</span><select data-o="templateFirst" data-bool><option value="0" ${!o.templateFirst ? 'selected' : ''}>${t('templateAll')}</option><option value="1" ${o.templateFirst ? 'selected' : ''}>${t('templateFirst')}</option></select></label>` : ''}
        ${o.template ? `<label class="chk"><input type="checkbox" data-o="autoMargin" ${o.autoMargin !== false ? 'checked' : ''}> ${t('tplAutoMargin')}</label>` : ''}
        <label class="fl sm"><span>${t('marginTop')}</span><input type="number" data-o="marginTop" data-num value="${o.marginTop}" ${o.template && o.autoMargin !== false ? 'disabled' : ''}></label>
        <label class="fl sm"><span>${t('marginBottom')}</span><input type="number" data-o="marginBottom" data-num value="${o.marginBottom}" ${o.template && o.autoMargin !== false ? 'disabled' : ''}></label>
        <label class="fl sm"><span>${t('marginSide')}</span><input type="number" data-o="marginSide" data-num value="${o.marginSide}"></label>
        ${o.type !== 'cert' ? `<label class="fl"><span>${t('orientation')}</span><select data-o="landscape" data-bool><option value="0">${t('portrait')}</option><option value="1" ${o.landscape ? 'selected' : ''}>${t('landscape')}</option></select></label>` : ''}
      </div><div class="checks">
        ${['blank', 'report'].includes(o.type) ? `<label class="chk"><input type="checkbox" data-o="showSource" ${o.showSource ? 'checked' : ''}> ${t('showSource')}</label><label class="chk"><input type="checkbox" data-o="showLinks" ${o.showLinks ? 'checked' : ''}> ${t('showLinks')}</label>` : ''}
        ${o.type === 'blank' ? `<label class="chk"><input type="checkbox" data-o="noteCol" ${o.noteCol ? 'checked' : ''}> ${t('showNoteCol')}</label><label class="chk"><input type="checkbox" data-o="withMarks" ${o.withMarks ? 'checked' : ''}> ${t('withMarks')}</label>` : ''}
        ${o.type === 'report' ? `<label class="chk"><input type="checkbox" data-o="includeDetails" ${o.includeDetails ? 'checked' : ''}> ${t('includeDetails')}</label>` : ''}
        ${['report', 'blank', 'flight'].includes(o.type) ? `<label class="chk"><input type="checkbox" data-o="translateNotes" ${o.translateNotes ? 'checked' : ''}> ${t('translateNotes')}</label>` : ''}
      </div>
      <div class="row pbtns"><button class="btn" id="pPrev">${icon('search')} ${t('preview')}</button><button class="btn pri" id="pPrint">${icon('print')} ${t('print')}</button><button class="btn" id="pPdf">${icon('file')} ${t('savePdf')}</button><button class="btn" id="pDocx">${icon('dl')} ${t('saveDocx')}</button></div>
      ${Platform.kind === 'android' ? `<p class="muted sm">${t('androidPdfHint')}</p>` : ''}</div>`;
    $$('[data-pt]', m).forEach((b) => (b.onclick = () => { o.type = b.dataset.pt; Store.saveLocal(); UI.keepPos(() => PAGES.print(m, R)); }));
    $$('[data-o]', m).forEach((inp) => (inp.onchange = () => { const k = inp.dataset.o; o[k] = inp.type === 'checkbox' ? inp.checked : inp.hasAttribute('data-bool') ? inp.value === '1' : inp.hasAttribute('data-num') ? +inp.value : inp.value; if (k === 'from' && o.to < o.from) o.to = o.from; if (k === 'template') o.tplPicked = true; Store.saveLocal(); if (['template', 'studentId', 'from', 'autoMargin'].includes(k)) UI.keepPos(() => PAGES.print(m, R)); }));
    $('#tplMan', m).onclick = (e) => { e.preventDefault(); templatesModal(() => UI.keepPos(() => PAGES.print(m, R))); };
    const run = async (btn, fn) => { btn.disabled = true; const old = btn.innerHTML; btn.innerHTML = t('processing'); try { await fn(); } catch (e) { console.error(e); UI.toast(t('error') + ': ' + (e.message || e), 'err'); } btn.disabled = false; btn.innerHTML = old; };
    $('#pPrev', m).onclick = (e) => run(e.currentTarget, async () => { const { html } = await build(); preview(html); });
    $('#pPrint', m).onclick = (e) => run(e.currentTarget, async () => { const { html, model } = await build(); await Platform.printHtml(html, { title: model.title, landscape: isLand(model) }); });
    $('#pPdf', m).onclick = (e) => run(e.currentTarget, async () => { const { html, model } = await build(); const r = await Platform.savePdf(html, fname(model) + '.pdf', { landscape: isLand(model) }); if (r && r !== 'web-print' && r !== 'android-print') UI.toast(t('pdfSaved')); });
    $('#pDocx', m).onclick = (e) => run(e.currentTarget, async () => { const { model, tpl } = await build(true); const blob = await RenderDOCX(model, Object.assign({}, o, { template: tpl, landscape: isLand(model) })); const r = await Platform.saveFile(fname(model) + '.docx', blob, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'); if (r) UI.toast(t('docxSaved')); });
  };
  const isLand = (model) => (model.type === 'cert' ? true : !!(opts().landscape || model.landscape));
  const fname = (model) => (model.title || 'cikti').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').slice(0, 80) + '_v' + Platform.semver;
  async function build(noHtml) {
    const o = opts();
    if (['report', 'cert'].includes(o.type) && !Store.db.students[o.studentId]) throw new Error(t('selectStudent'));
    const model = await DocModel.build(o.type, Object.assign({}, o, { withKey: o.keyMode === 'with', keyOnly: o.keyMode === 'only' }));
    if (!model) throw new Error(t('selectStudent'));
    model.type = o.type;
    const tpl = o.template ? await Templates.get(o.template) : null;
    if (tpl && o.autoMargin !== false) { if (tpl.mt) o.marginTop = tpl.mt; if (tpl.mb) o.marginBottom = tpl.mb; }
    const po = Object.assign({}, o, { template: tpl, landscape: o.type === 'cert' ? true : o.landscape || model.landscape });
    return { model, tpl, html: noHtml ? '' : RenderHTML(model, po) };
  }
  function preview(html) {
    const mm = modal(icon('search') + ' ' + t('preview'), `<iframe class="pframe"></iframe>`, { wide: true, cls: 'pv', foot: `<button class="btn pri" id="pvPrint">${icon('print')} ${t('print')}</button>` });
    const f = $('.pframe', mm.el); f.srcdoc = html;
    $('#pvPrint', mm.el).onclick = () => Platform.printHtml(html, {});
  }

  /* ---------- şablon yöneticisi ---------- */
  async function templatesModal(after) {
    const body = async () => { const list = await Templates.list(); return `<p class="muted">${t('templateHelp')}</p>
      <div class="tpls">${list.length ? list.map((x) => `<div class="tpl" data-id="${x.id}"><img src="${x.data}"><b>${esc(LangGuard.ptx(x.name))}</b>${x.builtin ? `<span class="pill">${t('tplBuiltin')}</span>` : ''}<div class="row"><button class="btn sm ${Store.db.config.defaultTpl === x.id ? 'pri' : ''}" data-def title="${t('makeDefault')}">★${Store.db.config.defaultTpl === x.id ? ' ' + t('defaultTpl') : ''}</button><button class="btn sm" data-adj>${icon('edit')} ${t('tplAdjust')}</button>${x.builtin ? '' : `<button class="ib danger" data-del>${icon('trash')}</button>`}</div></div>`).join('') : `<p class="muted">${t('noTemplates')}</p>`}</div>
      <div class="tpladd"><label class="fl"><span>${t('templateName')}</span><input id="tn"></label><label class="chk"><input type="checkbox" id="trb"> ${t('removeBody')}</label><label class="btn pri">${icon('ul')} ${t('addTemplate')}<input type="file" id="tf" accept=".pdf,.docx,image/*" hidden></label><span id="tst" class="muted"></span></div>
      <p class="muted sm">${t('tplPdfTip')}</p>`; };
    const mm = modal(t('templates'), await body(), { wide: true, onClose: after });
    const wire = () => {
      $$('.tpl [data-def]', mm.el).forEach((b) => (b.onclick = async () => { const id = b.closest('.tpl').dataset.id; Store.db.config.defaultTpl = Store.db.config.defaultTpl === id ? '' : id; Store.touch('config', { silent: true }); const o = opts(); o.template = Store.db.config.defaultTpl; o.tplPicked = false; Store.saveLocal(); UI.toast(t('defaultSet')); refresh(); }));
      $$('.tpl [data-del]', mm.el).forEach((b) => (b.onclick = async () => { if (await confirmDlg(t('confirmDelete'))) { await Templates.remove(b.closest('.tpl').dataset.id); refresh(); } }));
      $$('.tpl [data-adj]', mm.el).forEach((b) => (b.onclick = () => adjustModal(b.closest('.tpl').dataset.id, refresh)));
      $('#tf', mm.el).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; $('#tst', mm.el).textContent = t('processing'); try { const tp = await Templates.add(f, $('#tn', mm.el).value.trim(), $('#trb', mm.el).checked); const o = opts(); o.template = tp.id; o.autoMargin = true; Store.saveLocal(); UI.toast(t('templateSaved')); await refresh(); adjustModal(tp.id, refresh); } catch (er) { console.error(er); $('#tst', mm.el).textContent = er.message || String(er); } };
    };
    const refresh = async () => { $('.mb', mm.el).innerHTML = await body(); wire(); };
    wire();
  }
  /* v1.7: şablon önizleme ve ince ayar — örnek sayfa üzerinde antetin konumu ve yazı alanı */
  async function adjustModal(id, after) {
    const tp = await Templates.get(id); if (!tp) return;
    const v = { mt: tp.mt || 30, mb: tp.mb || 22, dx: +tp.dx || 0, dy: +tp.dy || 0, sc: Math.round((+tp.sc || 1) * 1000) / 10 };
    const sample = { title: tp.name, lang: UI.lang(), blocks: [
      { t: 'title', text: t('reportTitle'), sub: tx(Store.cur().title), inst: Store.db.config.institution.name || '', logo: '' },
      { t: 'kv', rows: [[t('fullName'), '—'], [t('startDate'), '—'], [t('instructor'), '—'], [t('path'), '—']] },
      { t: 'h2', text: t('progress') },
      { t: 'p', text: t('tplSampleText') } ] };
    const f = (k, lab, step, min, max) => `<label class="fl sm"><span>${lab}</span><input type="number" step="${step}" min="${min}" max="${max}" data-k="${k}" value="${v[k]}"></label>`;
    const mm = modal(icon('edit') + ' ' + t('tplAdjust') + ' — ' + esc(LangGuard.ptx(tp.name)), `<p class="muted">${t('tplAdjustHelp')}</p>
      <div class="grid3">${f('mt', t('marginTop'), 1, 0, 150)}${f('mb', t('marginBottom'), 1, 0, 120)}${f('sc', t('tplScale') + ' (%)', 0.1, 90, 110)}${f('dx', t('tplShiftX') + ' (mm)', 0.5, -20, 20)}${f('dy', t('tplShiftY') + ' (mm)', 0.5, -20, 20)}
      <div class="fl sm"><span>&nbsp;</span><button class="btn sm ghost" id="tplAuto">${icon('bolt')} ${t('tplAutoDetect')}</button></div></div>
      <iframe class="pframe tplpv"></iframe>`, { wide: true, okText: t('save'), onOk: async () => { await Templates.adjust(id, { mt: v.mt, mb: v.mb, dx: v.dx, dy: v.dy, sc: v.sc / 100 }); const o = opts(); if (o.template === id && o.autoMargin !== false) { o.marginTop = v.mt; o.marginBottom = v.mb; } Store.saveLocal(); UI.toast(t('saved')); after && after(); } });
    const draw = () => { const t2 = Object.assign({}, tp, { dx: v.dx, dy: v.dy, sc: v.sc / 100 }); const html = RenderHTML(sample, { template: t2, marginTop: v.mt, marginBottom: v.mb, marginSide: opts().marginSide, landscape: !!tp.landscape }); $('.tplpv', mm.el).srcdoc = html.replace('</style>', '.frame>tbody>tr>td{outline:1.5px dashed rgba(229,57,53,.85);outline-offset:-1px}</style>'); };
    $$('[data-k]', mm.el).forEach((inp) => (inp.oninput = () => { v[inp.dataset.k] = +inp.value || 0; draw(); }));
    $('#tplAuto', mm.el).onclick = async () => { const img = new Image(); img.src = tp.data; await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); const a = Templates.analyse(c); v.mt = a.mt; v.mb = a.mb; $('[data-k=mt]', mm.el).value = a.mt; $('[data-k=mb]', mm.el).value = a.mb; draw(); };
    draw();
  }
})();
