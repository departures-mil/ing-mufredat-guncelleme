/* Çıktı belgelerinin dil bağımsız modeli — HTML (yazdır/PDF) ve DOCX bu modelden üretilir */
(function () {
  const L = (key, lang) => (I18N[lang] && I18N[lang][key]) || I18N.tr[key] || key;
  const tx = (o, lang) => (o == null ? '' : typeof o === 'string' ? o : o[lang] || o.tr || o.en || o.ar || '');
  const fmtDate = (d, lang) => { if (!d) return ''; try { return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SY' : lang === 'en' ? 'en-GB' : 'tr-TR'); } catch (e) { return d; } };
  const fill = (s, p) => String(s).replace(/\{(\w+)\}/g, (_, k) => (p && p[k] != null ? p[k] : ''));

  function ctx(o) {
    const lang = o.lang || 'tr';
    const lang2 = o.lang2 && o.lang2 !== lang ? o.lang2 : '';
    return {
      lang, lang2,
      L: (k) => L(k, lang), L2: (k) => (lang2 ? L(k, lang2) : ''),
      T: (obj) => tx(obj, lang), T2: (obj) => (lang2 ? tx(obj, lang2) : ''),
      date: (d) => fmtDate(d, lang),
      notes: o.noteMap || {}, // çevrilmiş notlar: orijinal -> çeviri
    };
  }
  const inst = () => Store.db.config.institution || {};
  const levelsInRange = (o, st) => Store.levels().map((l, i) => ({ l, i })).filter(({ l, i }) => !Store.lvOff(st, l) && i >= (o.from ?? 0) && i <= (o.to ?? 999));

  function header(c, title, sub) {
    const I = inst();
    return { t: 'title', text: title, text2: c.L2 ? '' : '', sub: sub || '', inst: I.name || '', logo: I.logo || '' };
  }
  function levelInfo(c, l) {
    return { t: 'info', cells: [
      { label: c.L('prereq'), value: c.T(l.prereq), value2: c.T2(l.prereq) },
      { label: c.L('duration'), value: '≈ ' + (l.hours || 0) + ' ' + c.L('hours') },
      { label: c.L('goal'), value: c.T(l.goal), value2: c.T2(l.goal) },
    ] };
  }
  function checklistTable(c, l, o, st, gst) {
    if (gst === undefined) gst = st; // gst: öğrenciye özel hayaletler bu öğrenciye göre ayıklanır
    const cols = [{ label: c.L('topic'), w: o.noteCol ? 56 : 70 }, { label: c.L('known'), w: 11, align: 'c' }, { label: c.L('studied'), w: 11, align: 'c' }];
    if (o.noteCol) cols.push({ label: c.L('note'), w: 22 });
    const rows = [];
    const no = Store.levelNo(l);
    l.modules.forEach((m, mi) => {
      if (m.off || Store.stOff(gst, m)) return;
      let mk = 0, ms = 0;
      if (st) { const s = Store.moduleStats(st, m); mk = s.total && s.k === s.total ? 2 : 1; ms = s.total && s.done === s.total && s.k !== s.total ? 2 : 1; }
      const cells = [
        { text: no + '.' + (mi + 1) + '  ' + c.T(m.title), text2: c.T2(m.title), bold: true, tag: m.added ? c.L('added') : '', sub: o.showSource && m.source ? c.L('source') + ': ' + LangGuard.pl(m.source, c.lang) : '' },
        { box: st ? mk : 1 }, { box: st ? ms : 1 },
      ];
      if (o.noteCol) cells.push({ text: '' });
      rows.push({ type: 'module', cells });
      if (o.showLinks) resRows(c, m, cols.length).forEach((r) => rows.push(r));
      Store.actItems(m, gst).forEach((it) => {
        const mark = st ? st.marks[it.id] || {} : {};
        const note = mark.n ? (c.notes[mark.n] || mark.n) : '';
        const r = [{ text: c.T(it.text), text2: c.T2(it.text), indent: 1 }, { box: mark.k ? 2 : 1 }, { box: mark.s ? 2 : 1 }];
        if (o.noteCol) r.push({ text: [mark.d && (mark.k || mark.s) ? c.date(mark.d) : '', note].filter(Boolean).join(' · '), small: true });
        rows.push({ type: 'item', cells: r });
        if (o.showLinks) resRows(c, it, cols.length).forEach((x) => rows.push(x));
      });
    });
    return { t: 'table', cols, rows };
  }
  /* Konu kaynakları (video linkleri QR kodlu, belgeler adıyla) */
  function qrData(url) { try { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createDataURL(3, 2); } catch (e) { return ''; } }
  function resRows(c, node, ncol) {
    return (node.res || []).map((r) => {
      const cells = [{ text: (r.kind === 'link' ? (Files.isVideo(r.url) ? '▶ ' : '🔗 ') : '📄 ') + LangGuard.pl(r.name, c.lang), sub: r.kind === 'link' ? r.url : '', qr: r.kind === 'link' ? qrData(r.url) : '', indent: 2, small: true, span: ncol }];
      return { type: 'res', cells };
    });
  }
  function evalBox(c, l, st) {
    const ev = st ? st.evals[l.id] || {} : {};
    const b = (on) => (on ? '☑' : '☐');
    return { t: 'evalbox', title: c.L('levelEval') + ' — ' + c.L('level') + ' ' + Store.levelNo(l), sub: c.T(l.goal), sub2: c.T2(l.goal), lines: [
      `${b(ev.result === 'pass')} ${c.L('passed')}      ${b(ev.result === 'fail')} ${c.L('failed')}      ${c.L('examScore')}: ${ev.score != null && ev.score !== '' ? ev.score : '______'} / 100`,
      `${c.L('date')}: ${ev.date ? c.date(ev.date) : '____ / ____ / ______'}      ${c.L('evaluator')}: ${ev.by || '______________________'}      ${c.L('signature')}: ____________`,
    ].concat(ev.note ? [c.L('note') + ': ' + (c.notes[ev.note] || ev.note)] : []) };
  }

  const B = {};
  /* 1) Boş müfredat kontrol listesi (öğrenciye verilecek) — öğrenci seçiliyse işaretli hâli */
  B.blank = function (o) {
    const c = ctx(o); const st = o.studentId ? Store.db.students[o.studentId] : null; const marks = st && o.withMarks;
    const cnt = Store.counts();
    const blocks = [header(c, c.T(Store.cur().title), c.L('handoutTitle') + ' · ' + cnt.levels + ' ' + c.L('levels').toLowerCase() + ' · ' + cnt.modules + ' ' + c.L('modules').toLowerCase())];
    blocks.push({ t: 'kv', rows: [[c.L('fullName'), st ? st.name : ''], [c.L('startDate'), st ? c.date(st.start) : ''], [c.L('instructor'), st ? st.instructor || '' : inst().instructor || ''], [c.L('path'), st && st.path ? (Store.paths().find((p) => p.id === st.path) ? st.path + ' — ' + c.T(Store.paths().find((p) => p.id === st.path).name) : '') : '']] });
    blocks.push({ t: 'h2', text: c.L('howToUse'), text2: c.L2('howToUse') });
    blocks.push({ t: 'list', items: ['howTo1', 'howTo2', 'howTo3', 'howTo4'].map((k) => ({ text: c.L(k), text2: c.L2(k) })) });
    // Genel tablo
    blocks.push({ t: 'h2', text: c.L('overviewTable') });
    blocks.push({ t: 'table', cols: [{ label: c.L('lvlAbbr'), w: 7, align: 'c' }, { label: c.L('levels'), w: 43 }, { label: c.L('duration'), w: 10, align: 'c' }, { label: c.L('started'), w: 14 }, { label: c.L('ended'), w: 14 }, { label: c.L('passed'), w: 12, align: 'c' }],
      rows: levelsInRange(o, st).map(({ l, i }) => ({ type: 'row', cells: [{ text: String(i), bold: true }, { text: c.T(l.title), text2: c.T2(l.title) }, { text: l.hours + ' ' + c.L('hoursShort') }, { text: '' }, { text: '' }, { box: marks && Store.levelAchieved(st, l) ? 2 : 1 }] })) });
    // Uçuş hattı
    blocks.push({ t: 'h2', text: c.L('flightTrack'), text2: c.L2('flightTrack') });
    blocks.push(flightStages(c, marks ? st : null, st));
    for (const { l, i } of levelsInRange(o, st)) {
      blocks.push({ t: 'h1', text: c.L('level') + ' ' + i + ' — ' + c.T(l.title), text2: c.T2(l.title), pageBreak: true });
      blocks.push(levelInfo(c, l));
      if (o.showLinks && (l.res || []).length) blocks.push({ t: 'table', cols: [{ label: c.L('resources'), w: 100 }], rows: resRows(c, l, 1) });
      blocks.push(checklistTable(c, l, o, marks ? st : null, st || null));
      if (!(st && Store.evOff(st, l))) blocks.push(evalBox(c, l, marks ? st : null));
    }
    return { title: c.L('handoutTitle'), lang: c.lang, blocks };
  };

  function flightStages(c, st, gst) {
    return { t: 'table', cols: [{ label: c.L('flightStage'), w: 9, align: 'c' }, { label: c.L('level'), w: 9, align: 'c' }, { label: c.L('content'), w: 34 }, { label: c.L('passCond'), w: 28 }, { label: c.L('passed'), w: 8, align: 'c' }, { label: c.L('date'), w: 12 }],
      rows: Store.flightAct(gst || st || null, Store.prog).map((f) => { const r = st ? st.flight[f.id] || {} : {}; return { type: 'row', cells: [{ text: f.code, bold: true }, { text: f.level }, { text: c.T(f.content), text2: c.T2(f.content) }, { text: c.T(f.cond), text2: c.T2(f.cond) }, { box: r.passed ? 2 : 1 }, { text: r.date ? c.date(r.date) : '', small: true }] }; }) };
  }

  /* 2) Öğrenci durum raporu */
  B.report = function (o) {
    const c = ctx(o); const st = Store.db.students[o.studentId]; if (!st) return null;
    const R = Store.rankOf(st);
    const blocks = [header(c, c.L('reportTitle'), c.T(Store.cur().title))];
    const path = Store.paths().find((p) => p.id === st.path);
    blocks.push({ t: 'kv', rows: [[c.L('fullName'), st.name], [c.L('studentNo'), st.no || ''], [c.L('startDate'), c.date(st.start)], [c.L('instructor'), st.instructor || ''], [c.L('path'), path ? st.path + ' — ' + c.T(path.name) : c.L('noPath')], [c.L('printedOn'), c.date(new Date())]] });
    blocks.push({ t: 'rank', rank: c.T(R.rank.name), rank2: c.T2(R.rank.name), color: R.rank.color, score: R.score, scoreLabel: c.L('overall'), rankLabel: c.L('currentRank'),
      next: R.next ? c.L('nextRank') + ': ' + c.T(R.next.rank.name) + (R.next.missing.length ? ' — ' + c.L('missingLevels') + ': ' + R.next.missing.join(', ') : '') + (!R.next.scoreOk ? ' — ' + c.L('scoreNeeded') + ': ' + R.next.scoreNeeded : '') : c.L('maxRank'),
      flight: c.L('totalFlight') + ': ' + Store.flightMinutes(st) + ' ' + c.L('minShort') });
    blocks.push({ t: 'h2', text: c.L('progress'), text2: c.L2('progress') });
    blocks.push({ t: 'bars', rows: Store.levels().map((l, i) => ({ l, i })).filter((x) => !Store.lvOff(st, x.l)).map(({ l, i }) => { const s = Store.levelStats(st, l); const status = Store.levelStatus(st, l); return { label: i + ' — ' + c.T(l.title), pct: s.pct, color: status === 'achieved' ? '#2e7d32' : s.pct ? '#1565c0' : '#b0bec5', right: s.done + '/' + s.total + (status === 'achieved' ? ' ✓' : '') }; }) });
    blocks.push({ t: 'h2', text: c.L('levelEval') });
    blocks.push({ t: 'table', cols: [{ label: c.L('lvlAbbr'), w: 7, align: 'c' }, { label: c.L('levels'), w: 35 }, { label: c.L('progress'), w: 12, align: 'c' }, { label: c.L('result'), w: 16, align: 'c' }, { label: c.L('examScore'), w: 12, align: 'c' }, { label: c.L('date'), w: 18 }],
      rows: Store.levels().map((l, i) => ({ l, i })).filter((x) => !Store.lvOff(st, x.l)).map(({ l, i }) => { const ev = st.evals[l.id] || {}; const s = Store.levelStats(st, l); return { type: 'row', cells: [{ text: String(i), bold: true }, { text: c.T(l.title) }, { text: '%' + s.pct }, { text: Store.evOff(st, l) ? '—' : ev.result === 'pass' ? c.L('passed') : ev.result === 'fail' ? c.L('failed') : Store.levelAchieved(st, l) ? c.L('achieved') : '—', bold: ev.result === 'pass' }, { text: ev.score != null && ev.score !== '' ? String(ev.score) : '' }, { text: ev.date ? c.date(ev.date) : '', small: true }] }; }) });
    blocks.push({ t: 'h2', text: c.L('flightTrack') });
    blocks.push(flightStages(c, st));
    if ((st.flightLog || []).length) {
      blocks.push({ t: 'h2', text: c.L('flightLog') });
      blocks.push({ t: 'table', cols: [{ label: c.L('date'), w: 16 }, { label: c.L('flightStage'), w: 10, align: 'c' }, { label: c.L('minutes'), w: 12, align: 'c' }, { label: c.L('platform'), w: 30 }, { label: c.L('note'), w: 32 }], rows: st.flightLog.map((f) => ({ type: 'row', cells: [{ text: c.date(f.date) }, { text: f.stage || '' }, { text: String(f.minutes || '') }, { text: f.platform || '' }, { text: c.notes[f.note] || f.note || '', small: true }] })) });
    }
    if (o.includeDetails) {
      for (const { l, i } of levelsInRange(o, st)) {
        blocks.push({ t: 'h1', text: c.L('level') + ' ' + i + ' — ' + c.T(l.title), text2: c.T2(l.title), pageBreak: true });
        blocks.push(checklistTable(c, l, Object.assign({}, o, { noteCol: true }), st));
        blocks.push(evalBox(c, l, st));
      }
    }
    blocks.push({ t: 'sign', labels: [c.L('instructorSign'), c.L('studentSign')] });
    return { title: c.L('reportTitle') + ' — ' + st.name, lang: c.lang, blocks };
  };

  /* 3) Seviye değerlendirme formu */
  B.evalForm = function (o) {
    const c = ctx(o); const st = o.studentId ? Store.db.students[o.studentId] : null;
    const blocks = [];
    levelsInRange(o, st).forEach(({ l, i }, k) => {
      blocks.push(Object.assign(header(c, c.L('evalFormTitle'), c.L('level') + ' ' + i + ' — ' + c.T(l.title)), { pageBreak: k > 0 }));
      blocks.push({ t: 'kv', rows: [[c.L('fullName'), st ? st.name : ''], [c.L('date'), ''], [c.L('evaluator'), ''], [c.L('examScore'), '______ / 100']] });
      blocks.push(levelInfo(c, l));
      const cols = [{ label: c.L('topic'), w: 52 }, { label: c.L('known'), w: 10, align: 'c' }, { label: c.L('studied'), w: 10, align: 'c' }, { label: '1  2  3  4', w: 14, align: 'c' }, { label: c.L('note'), w: 14 }];
      const rows = [];
      l.modules.forEach((m, mi) => {
        if (m.off || Store.stOff(st, m)) return;
        rows.push({ type: 'module', cells: [{ text: i + '.' + (mi + 1) + '  ' + c.T(m.title), text2: c.T2(m.title), bold: true }, { text: '' }, { text: '' }, { text: '☐ ☐ ☐ ☐' }, { text: '' }] });
        Store.actItems(m, st).forEach((it) => { const mk = st ? st.marks[it.id] || {} : {}; rows.push({ type: 'item', cells: [{ text: c.T(it.text), text2: c.T2(it.text), indent: 1 }, { box: mk.k ? 2 : 1 }, { box: mk.s ? 2 : 1 }, { text: '' }, { text: '' }] }); });
      });
      blocks.push({ t: 'table', cols, rows });
      blocks.push(evalBox(c, l, null));
      blocks.push({ t: 'p', text: c.L('questions') + ':', style: 'bold' });
      blocks.push({ t: 'lines', n: 4 });
      blocks.push({ t: 'sign', labels: [c.L('instructorSign'), c.L('studentSign')] });
    });
    return { title: c.L('evalFormTitle'), lang: c.lang, blocks };
  };

  /* 4) Unvan belgesi */
  B.cert = function (o) {
    const c = ctx(o); const st = Store.db.students[o.studentId]; if (!st) return null;
    const R = Store.rankOf(st); const I = inst();
    const lv = [...R.achieved].sort((a, b) => a - b);
    return { title: c.L('certTitle'), lang: c.lang, landscape: true, blocks: [{ t: 'cert', title: c.L('certTitle'), title2: c.L2('certTitle'), name: st.name, text: fill(c.L('certText'), { inst: I.name || '—' }), text2: c.lang2 ? fill(c.L2('certText'), { inst: I.name || '—' }) : '', rank: c.T(R.rank.name), rank2: c.T2(R.rank.name), color: R.rank.color, levels: c.L('certLevels') + ': ' + (lv.length ? lv.join(', ') : '—') + '   ·   ' + c.L('overall') + ': ' + R.score, date: c.L('printedOn') + ': ' + c.date(new Date()), inst: I.name || '', logo: I.logo || '', signs: [c.L('instructorSign'), c.L('signature')] }] };
  };

  /* 5) Sınıf özeti */
  B.classSummary = function (o) {
    const c = ctx(o);
    const rows = Store.students(false, Store.prog).map((st, k) => { const R = Store.rankOf(st); return { type: 'row', cells: [{ text: String(k + 1) }, { text: st.name, bold: true }, { text: st.no || '' }, { text: c.T(R.rank.name), color: R.rank.color, bold: true }, { text: String(R.score) }, { text: String(Store.highestLevel(st) >= 0 ? Store.highestLevel(st) : '—') }, { text: st.path || '—' }, { text: String(Store.flightMinutes(st)) }] }; });
    return { title: c.L('classSummary'), lang: c.lang, landscape: !!o.landscape, blocks: [header(c, c.L('classSummary'), c.T(Store.cur().title) + ' · ' + c.date(new Date())),
      { t: 'table', cols: [{ label: '#', w: 5, align: 'c' }, { label: c.L('fullName'), w: 27 }, { label: c.L('studentNo'), w: 10 }, { label: c.L('rank'), w: 18 }, { label: c.L('overall'), w: 10, align: 'c' }, { label: c.L('level'), w: 10, align: 'c' }, { label: c.L('path'), w: 8, align: 'c' }, { label: c.L('minutes'), w: 12, align: 'c' }], rows }] };
  };

  /* 6) Uçuş kayıt formu */
  B.flight = function (o) {
    const c = ctx(o); const st = o.studentId ? Store.db.students[o.studentId] : null;
    const log = st ? st.flightLog || [] : [];
    const rows = log.map((f) => ({ type: 'row', cells: [{ text: c.date(f.date) }, { text: f.stage || '' }, { text: String(f.minutes || '') }, { text: f.platform || '' }, { text: c.notes[f.note] || f.note || '', small: true }] }));
    const target = Math.max(14, rows.length + 4); while (rows.length < target) rows.push({ type: 'blank', cells: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' }] });
    return { title: c.L('flightFormTitle'), lang: c.lang, blocks: [header(c, c.L('flightFormTitle'), st ? st.name : ''), flightStages(c, st), { t: 'h2', text: c.L('flightLog') }, { t: 'table', cols: [{ label: c.L('date'), w: 16 }, { label: c.L('flightStage'), w: 10, align: 'c' }, { label: c.L('minutes'), w: 12, align: 'c' }, { label: c.L('platform'), w: 30 }, { label: c.L('note'), w: 32 }], rows }] };
  };

  /* 7) v2.1: Ortak ders programı — eksik ortak konular ve ders planı */
  B.plan = function (o) {
    const c = ctx(o); const p = Store.plan(o.planId) || Store.plans()[0]; if (!p) return { title: c.L('printPlan'), lang: c.lang, blocks: [header(c, c.L('printPlan'), ''), { t: 'p', text: c.L('planNoPlans') }] };
    const S = Store.planStudents(p); const mode = p.mode || 'all';
    const rows = Store.planMissing(p, mode);
    const where = {}; p.lessons.forEach((l, i) => l.items.forEach((id) => (where[id] = i + 1)));
    const TT = (id) => { const tp = Store.planTopic(p, id); return tp ? tp.text : ''; };
    const pname = p.name ? LangGuard.pl(p.name, c.lang) : c.L('planNameDef') + ' — ' + c.date(p.createdAt);
    const mins = p.lessons.reduce((a, l) => a + (+l.minutes || 0), 0);
    const blocks = [header(c, c.L('printPlan'), pname)];
    blocks.push({ t: 'kv', rows: [[c.L('program'), c.L('prog_' + p.prog)], [c.L('printedOn'), c.date(new Date())], [c.L('planStudents'), S.map((s) => s.name).join(', ')], [c.L('planLessons'), p.lessons.length + ' · ' + mins + ' ' + c.L('minShort')]] });
    blocks.push({ t: 'h2', text: c.L('planMissing') + ' — ' + c.L(mode === 'all' ? 'planModeAll' : 'planModeAny'), text2: c.L2('planMissing') });
    const trs = []; let lastM = null;
    Store.inProg(p.prog, () => rows.forEach((r) => {
      if (r.m !== lastM) { lastM = r.m; trs.push({ type: 'module', cells: [{ text: r.code + '  ' + c.T(r.m.title), text2: c.T2(r.m.title), bold: true }, { text: '' }, { text: '' }, { text: '' }] }); }
      trs.push({ type: 'item', cells: [{ text: c.T(r.it.text), text2: c.T2(r.it.text), indent: 1 }, { text: r.miss.length + '/' + r.rel.length }, { text: r.miss.length === r.rel.length ? c.L('planEveryone') : r.miss.map((s) => s.name).join(', '), small: true }, { text: where[r.id] ? c.L('planLesson') + ' ' + where[r.id] : (p.excluded || []).includes(r.id) ? '—' : '', small: true }] });
    }));
    if (!trs.length) trs.push({ type: 'row', cells: [{ text: c.L('planNoMissing') }, { text: '' }, { text: '' }, { text: '' }] });
    blocks.push({ t: 'table', cols: [{ label: c.L('planTopics'), w: 52 }, { label: c.L('planMissShort'), w: 10, align: 'c' }, { label: c.L('planMissIn'), w: 24 }, { label: c.L('planLesson'), w: 14, align: 'c' }], rows: trs });
    p.lessons.forEach((l, i) => {
      const title = c.L('planLesson') + ' ' + (i + 1) + (UI.planLessonTitle(p, l, c.lang) ? ' — ' + (l.title ? LangGuard.pl(l.title, c.lang) : UI.planLessonTitle(p, l, c.lang)) : '');
      blocks.push({ t: 'h2', text: title });
      blocks.push({ t: 'kv', rows: [[c.L('date'), (l.date ? c.date(l.date) : '') + (l.time ? ' ' + l.time : '')], [c.L('planMinutes'), l.minutes ? l.minutes + ' ' + c.L('minShort') : ''], [c.L('instructor'), l.instructor || ''], [c.L('planStatus'), l.done ? c.L('planDoneTag') + ' (' + (l.attended || []).length + '/' + S.length + ')' : c.L('planPending')]] });
      blocks.push({ t: 'table', cols: [{ label: '#', w: 6, align: 'c' }, { label: c.L('planTopics'), w: 76 }, { label: c.L('planCode'), w: 18, align: 'c' }],
        rows: l.items.length ? l.items.map((id, k) => { const tp = Store.planTopic(p, id); return { type: 'row', cells: [{ text: String(k + 1) }, { text: c.T(TT(id)), text2: c.T2(TT(id)) }, { text: tp && tp.code ? tp.code : '★' }] }; }) : [{ type: 'row', cells: [{ text: '' }, { text: c.L('planEmptyLesson') }, { text: '' }] }] });
      if (l.note) blocks.push({ t: 'p', text: c.L('note') + ': ' + LangGuard.pl(l.note, c.lang) });
    });
    return { title: c.L('printPlan'), lang: c.lang, landscape: !!o.landscape, blocks };
  };

  /* Notları çıktı diline çevir (isteğe bağlı) */
  async function noteMap(o) {
    if (!o.translateNotes) return {};
    const st = o.studentId ? Store.db.students[o.studentId] : null; if (!st) return {};
    const texts = new Set();
    Object.values(st.marks).forEach((m) => m.n && texts.add(m.n));
    Object.values(st.evals).forEach((e) => e.note && texts.add(e.note));
    (st.flightLog || []).forEach((f) => f.note && texts.add(f.note));
    const out = {};
    for (const s of texts) { try { out[s] = await translateText(s, 'auto', o.lang); } catch (e) { out[s] = s; } }
    return out;
  }

  window.DocModel = { L, tx, B, ctx, header, build: async (type, o) => { o.noteMap = await noteMap(o); return B[type](o); } }; // v1.1: B dışa açık — sınav kâğıdı ve dil bilgisi kartı çıktıları eklenir
})();
