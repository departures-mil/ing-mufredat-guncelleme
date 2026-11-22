/* Veri deposu, kalıcılık ve hesaplamalar */
(function () {
  const DB_KEY = 'ingmufredat_db_v1';
  const LOCAL_KEY = 'ingmufredat_local_v1';
  const SCHEMA = 1;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = (p) => (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => Date.now();

  function defaultDb() {
    const D = clone(window.DEFAULT_DATA);
    const t = now();
    return {
      schema: SCHEMA,
      curriculum: Object.assign(D.curriculum, { updatedAt: 0 }),
      config: {
        ranks: D.ranks, paths: D.paths,
        institution: { name: '', logo: '', instructor: '' },
        scoring: { passPct: 80, requireExam: false, passScore: 70 },
        updatedAt: 0,
      },
      students: {},
      activity: [],
      createdAt: t,
    };
  }
  function defaultLocal() {
    return { lang: 'tr', deviceId: uid('d'), sync: { config: null, workspace: '', email: '', enabled: false }, lastSync: 0, ui: {} };
  }

  /* Eski sürümlerden gelen veriyi güncel şemaya taşır — kayıtlar asla silinmez */
  function migrate(db) {
    const d = defaultDb();
    db.schema = db.schema || 1;
    db.curriculum = db.curriculum || d.curriculum;
    db.curriculum.flight = db.curriculum.flight || d.curriculum.flight;
    db.config = db.config || d.config;
    for (const k of ['ranks', 'paths', 'institution', 'scoring']) if (!db.config[k]) db.config[k] = d.config[k];
    db.config.scoring = Object.assign({}, d.config.scoring, db.config.scoring);
    db.students = db.students || {};
    db.activity = db.activity || [];
    db.plans = db.plans || { list: {}, updatedAt: 0 }; db.plans.list = db.plans.list || {}; // v2.1: ortak ders programları
    // v1.5: Kanatlı ve FPV programları — eksikse varsayılanlarla eklenir, mevcutlar korunur
    db.curricula = db.curricula || {};
    const DP = window.DEFAULT_PROGRAMS || {};
    for (const p of Object.keys(DP)) {
      if (!db.curricula[p]) db.curricula[p] = Object.assign(clone(DP[p]), { updatedAt: 0 });
      const c = db.curricula[p];
      for (const k of ['title', 'levels', 'flight', 'ranks', 'paths']) if (!c[k]) c[k] = clone(DP[p][k]);
      // v1.7: uzmanlık yolları boşsa hazır yollar eklenir (kullanıcının eklediklerine dokunulmaz)
      if (!c.paths.length && !c.pathsSeeded && (DP[p].paths || []).length) { c.paths = clone(DP[p].paths); c.pathsSeeded = true; c.updatedAt = Date.now(); }
    }
    for (const s of Object.values(db.students)) {
      if (!s.program || (s.program !== 'genel' && !db.curricula[s.program])) s.program = 'genel';
      s.marks = s.marks || {}; s.off = s.off || {}; s.evals = s.evals || {}; s.flight = s.flight || {}; s.flightLog = s.flightLog || []; s.journal = s.journal || [];
    }
    // v1.1: ölçme sistemleri + sınav kâğıtları ve sözlük (ayrı eşitlenen parçalar). Eksikse varsayılanlarla eklenir, mevcutlar korunur.
    const DE = window.DEFAULT_EXAMS;
    if (!db.exams && DE) db.exams = Object.assign(clone(DE), { updatedAt: 0 });
    if (db.exams) { db.exams.schemes = db.exams.schemes || {}; db.exams.papers = db.exams.papers || { list: [] }; db.exams.papers.list = db.exams.papers.list || []; }
    if (db.exams && DE && (db.exams.rev || 0) < DE.rev && !db.exams.updatedAt) db.exams = Object.assign(clone(DE), { updatedAt: 0 });
    const DD = window.DEFAULT_DICT;
    if (!db.dict && DD) db.dict = { rev: DD.rev, list: clone(DD.list), updatedAt: 0 };
    if (db.dict && DD && (db.dict.rev || 0) < DD.rev) { // yeni kelimeler eklenir; kullanıcının düzenlediği/sildiği kelimelere dokunulmaz
      const have = new Set(db.dict.list.map((e) => e.id));
      for (const e of DD.list) if (!have.has(e.id) && !(db.dict.removed || []).includes(e.id)) db.dict.list.push(clone(e));
      db.dict.rev = DD.rev; if (db.dict.updatedAt) db.dict.updatedAt = now();
    }
    // v1.2: Kelime Testi (ayrı eşitlenen parça). Eksikse hazır 419 kelimeyle eklenir; yeni hazır kelimeler yalnız eksikse eklenir.
    const DV = window.DEFAULT_VOCAB;
    if (!db.vocab && DV) db.vocab = Object.assign(clone(DV), { updatedAt: 0 });
    if (db.vocab) { db.vocab.items = db.vocab.items || []; db.vocab.cols = db.vocab.cols || { tr: true, ar: true }; if (db.vocab.pointsEach == null) db.vocab.pointsEach = 1; }
    if (db.vocab && DV && (db.vocab.rev || 0) < DV.rev) {
      const have = new Set(db.vocab.items.map((e) => e.term.toLowerCase()));
      for (const e of DV.items) if (!have.has(e.term.toLowerCase()) && !(db.vocab.removed || []).includes(e.id)) db.vocab.items.push(clone(e));
      db.vocab.rev = DV.rev; if (db.vocab.updatedAt) db.vocab.updatedAt = now();
    }
    // v1.1: yeni 7 seviyeli müfredat (dataRev 2). Hiç düzenlenmemişse doğrudan gelir; düzenlenmişse kullanıcıya sorulur (eskisi yedeklenir).
    const DR = (window.DEFAULT_DATA || {}).dataRev || 1;
    if ((db.curriculum.dataRev || 1) < DR) {
      if (!db.curriculum.updatedAt) { const keepRes = collectRes(db.curriculum); db.curriculum = d.curriculum; restoreRes(db.curriculum, keepRes); }
      else db.curriculum.newRev = DR;
    }
    for (const s of Object.values(db.students)) { s.exams = s.exams || {}; s.docs = s.docs || {}; }
    db.schema = SCHEMA;
    return db;
  }

  /* Eski müfredattaki konu kaynakları (belge/link) yeni müfredata aynı başlıklı seviyeye taşınır, eşleşmeyenler ilk seviyede kalır */
  function collectRes(cur) { const out = []; (cur.levels || []).forEach((l) => { const walk = (n, where) => { if (n.res && n.res.length) out.push({ where, title: (n.title || n.text || {}).tr, res: n.res }); }; walk(l, 'l'); l.modules.forEach((m) => { walk(m, 'm'); m.items.forEach((i) => walk(i, 'i')); }); }); return out; }
  function restoreRes(cur, list) { if (!list.length) return; const L = cur.levels; for (const r of list) { let tgt = null; for (const l of L) { if (r.where === 'l' && l.title.tr === r.title) tgt = l; for (const m of l.modules) { if (r.where === 'm' && m.title.tr === r.title) tgt = m; } } tgt = tgt || L[0]; tgt.res = (tgt.res || []).concat(r.res); } }

  const listeners = new Set();
  const S = {
    db: null, local: null, uid, clone, now,
    async init() {
      let raw = null;
      try { raw = localStorage.getItem(DB_KEY); } catch (e) {}
      if (!raw) { try { raw = await Platform.restore(); } catch (e) {} }
      try { this.db = raw ? migrate(JSON.parse(raw)) : migrate(defaultDb()); } catch (e) { console.error(e); this.db = migrate(defaultDb()); }
      try { this.local = Object.assign(defaultLocal(), JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}')); } catch (e) { this.local = defaultLocal(); }
      this.persistNow();
    },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit(what) { listeners.forEach((f) => { try { f(what); } catch (e) { console.error(e); } }); },
    /* part: 'curriculum' | 'config' | 'student:<id>' */
    touch(part, opts) {
      const t = now();
      if (part === 'curriculum') part = this.partOf(this.prog);
      if (part.startsWith('curriculum_')) { const c = this.db.curricula[part.slice(11)]; if (c) c.updatedAt = t; }
      if (part === 'curriculum') this.db.curriculum.updatedAt = t;
      else if (part === 'config') this.db.config.updatedAt = t;
      else if (part === 'plans') this.db.plans.updatedAt = t;
      else if (part === 'exams') this.db.exams.updatedAt = t;
      else if (part === 'dict') this.db.dict.updatedAt = t;
      else if (part === 'vocab') this.db.vocab.updatedAt = t;
      else if (part.startsWith('student:')) { const s = this.db.students[part.slice(8)]; if (s) s.updatedAt = t; }
      this.persist();
      if (!(opts && opts.silent)) this.emit(part);
      if (window.Sync) Sync.markDirty(part);
    },
    _pt: null,
    persist() { clearTimeout(this._pt); this._pt = setTimeout(() => this.persistNow(), 250); },
    persistNow() {
      const json = JSON.stringify(this.db);
      try { localStorage.setItem(DB_KEY, json); } catch (e) { console.warn('localStorage', e); }
      try { Platform.persist(json); } catch (e) {}
    },
    saveLocal() { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(this.local)); } catch (e) {} },
    replaceDb(newDb) { this.db = migrate(newDb); const t = now(); this.db.curriculum.updatedAt = t; this.db.config.updatedAt = t; Object.values(this.db.curricula).forEach((c) => (c.updatedAt = t)); Object.values(this.db.students).forEach((s) => (s.updatedAt = t)); if (this.db.exams) this.db.exams.updatedAt = t; if (this.db.dict) this.db.dict.updatedAt = t; if (this.db.vocab) this.db.vocab.updatedAt = t; this.persistNow(); this.emit('all'); if (window.Sync) Sync.markDirty('all'); },
    /* v1.1: yeni müfredatı yükle — mevcut müfredat yedeklenir (db.curriculumBackups), öğrenci kayıtları silinmez */
    adoptNewCurriculum() {
      const c = this.db.curriculum; this.db.curriculumBackups = this.db.curriculumBackups || [];
      const old = clone(c); delete old.newRev; this.db.curriculumBackups.unshift({ t: now(), cur: old }); this.db.curriculumBackups = this.db.curriculumBackups.slice(0, 3);
      const keep = collectRes(c); this.db.curriculum = defaultDb().curriculum; restoreRes(this.db.curriculum, keep);
      this.inProg('genel', () => this.touch('curriculum'));
    },
    keepOldCurriculum() { this.db.curriculum.dataRev = this.db.curriculum.newRev; delete this.db.curriculum.newRev; this.inProg('genel', () => this.touch('curriculum')); },
    resetCurriculum() {
      if (this.prog === 'genel') { const d = defaultDb(); this.db.curriculum = d.curriculum; }
      else { const D = window.DEFAULT_PROGRAMS[this.prog]; const c = this.db.curricula[this.prog]; c.title = clone(D.title); c.levels = clone(D.levels); c.flight = clone(D.flight); }
      this.touch('curriculum');
    },

    /* ---------- v1.5: eğitim programları (Genel / Kanatlı / FPV) ----------
       Her programın kendi müfredatı, uçuş hattı, unvanları ve uzmanlık yolları vardır.
       "prog" o an çalışılan programdır; öğrenci hesapları her zaman öğrencinin kendi programıyla yapılır. */
    PROGS: ['genel', 'kanatli', 'fpv'],
    _prog: null,
    get prog() { const p = this._prog || (this.local && this.local.ui && this.local.ui.prog) || 'genel'; return p === 'genel' || (this.db && this.db.curricula && this.db.curricula[p]) ? p : 'genel'; },
    setProg(p) { if (!this.PROGS.includes(p)) p = 'genel'; this.local.ui.prog = p; this.saveLocal(); },
    progOf(st) { return (st && st.program) || 'genel'; },
    partOf(p) { return p === 'genel' ? 'curriculum' : 'curriculum_' + p; },
    cur(p) { p = p || this.prog; return p === 'genel' || !this.db.curricula[p] ? this.db.curriculum : this.db.curricula[p]; },
    ranks(p) { p = p || this.prog; return p === 'genel' ? this.db.config.ranks : this.cur(p).ranks; },
    paths(p) { p = p || this.prog; return p === 'genel' ? this.db.config.paths : this.cur(p).paths || []; },
    ranksPart(p) { p = p || this.prog; return p === 'genel' ? 'config' : this.partOf(p); },
    /* Geçici olarak başka programın bağlamında çalıştırır */
    inProg(p, fn) { const old = this._prog; this._prog = p || 'genel'; try { return fn(); } finally { this._prog = old; } },
    log(key, params) {
      if (params && window.plainText) for (const k of Object.keys(params)) if (typeof params[k] === 'string') params[k] = plainText(params[k]);
      this.db.activity.unshift({ t: now(), key, params });
      this.db.activity = this.db.activity.slice(0, 80);
      this.persist();
    },

    /* ---------- müfredat yardımcıları ---------- */
    levels() { return this.cur().levels; },
    findLevel(id) { return this.levels().find((l) => l.id === id); },
    findModule(id) { for (const l of this.levels()) { const m = l.modules.find((x) => x.id === id); if (m) return { level: l, module: m }; } return null; },
    findItem(id) { for (const l of this.levels()) for (const m of l.modules) { const i = m.items.find((x) => x.id === id); if (i) return { level: l, module: m, item: i }; } return null; },
    levelNo(l) { return this.levels().indexOf(l); },
    moduleCode(l, m) { return this.levelNo(l) + '.' + (l.modules.indexOf(m) + 1); },
    /* Etkisizleştirme: off=true olan seviye/modül/madde silinmez, yalnız hesaplara ve çıktılara girmez */
    /* v1.5: öğrenciye özel müfredat — st.off[id] = true olan seviye/modül/madde o öğrencide "hayalet"tir:
       silinmez, yalnız o öğrencinin puanına, unvanına ve çıktılarına girmez */
    stOff(st, node) { return !!(st && st.off && node && st.off[node.id]); },
    actMods(l, st) { return l.modules.filter((m) => !m.off && !this.stOff(st, m)); },
    actItems(m, st) { return m.items.filter((i) => !i.off && !this.stOff(st, i)); },
    lvOff(st, l) { return !!(l.off || this.stOff(st, l)); },
    /* v1.9: uçuş aşamaları ve seviye sonu değerlendirmesi de hayalet olabilir */
    flightAct(st, prog) { return (this.cur(prog || (st ? this.progOf(st) : undefined)).flight || []).filter((f) => !f.off && !this.stOff(st, f)); },
    evOff(st, l) { return !!(st && st.off && l && st.off['ev_' + l.id]); },
    ghostCount(st) { return st && st.off ? Object.keys(st.off).filter((k) => st.off[k]).length : 0; },
    isOffItem(id) { const f = this.findItem(id); return !f || f.level.off || f.module.off || f.item.off; },
    counts() { let lv = 0, m = 0, i = 0; for (const l of this.levels()) { if (l.off) continue; lv++; for (const x of this.actMods(l)) { m++; i += this.actItems(x).length; } } return { levels: lv, modules: m, items: i }; },

    /* ---------- öğrenci ---------- */
    students(includeArchived, prog) { return Object.values(this.db.students).filter((s) => !s.deleted && (includeArchived || !s.archived) && (prog === undefined || prog === 'all' || this.progOf(s) === prog)).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr')); },
    setStOff(st, node, off) { st.off = st.off || {}; if (off) st.off[node.id] = true; else delete st.off[node.id]; },
    addStudent(data) {
      const id = uid('s');
      const s = Object.assign({ id, program: this.prog, name: '', no: '', phone: '', contact: {}, start: new Date().toISOString().slice(0, 10), instructor: this.db.config.institution.instructor || '', path: '', background: '', archived: false, marks: {}, evals: {}, flight: {}, flightLog: [], journal: [], createdAt: now() }, data);
      this.db.students[id] = s;
      this.log('activity_add', { s: s.name });
      this.touch('student:' + id);
      return s;
    },
    deleteStudent(id) { const s = this.db.students[id]; if (!s) return; s.deleted = true; this.touch('student:' + id); },

    /* ---------- hesaplamalar ---------- */
    isDone(st, itemId) { const m = st.marks[itemId]; return !!(m && (m.k || m.s)); },
    levelStats(st, l) {
      let total = 0, done = 0, k = 0, s = 0;
      for (const m of this.actMods(l, st)) for (const it of this.actItems(m, st)) { total++; const mk = st.marks[it.id]; if (mk && (mk.k || mk.s)) { done++; if (mk.k) k++; else s++; } }
      return { total, done, known: k, studied: s, pct: total ? Math.round((done / total) * 100) : 0 };
    },
    moduleStats(st, m) { const A = this.actItems(m, st); let done = 0, k = 0, s = 0; for (const it of A) { const mk = st.marks[it.id]; if (mk && (mk.k || mk.s)) { done++; if (mk.k) k++; if (mk.s) s++; } } return { total: A.length, done, k, s }; },
    levelAchieved(st, l) {
      const sc = this.db.config.scoring; const ls = this.levelStats(st, l); const ev = st.evals[l.id] || {};
      if (this.evOff(st, l)) return ls.total === 0 || ls.pct >= sc.passPct; // değerlendirme bu öğrencide hayalet: yalnız ilerleme
      if (ev.result === 'pass' && ev.locked) return true;
      if (ls.total === 0) return ev.result === 'pass';
      if (ls.pct < sc.passPct) return false;
      if (sc.requireExam && ev.result !== 'pass') return false;
      if (ev.result === 'fail') return false;
      return true;
    },
    levelStatus(st, l) {
      if (this.levelAchieved(st, l)) return 'achieved';
      const ls = this.levelStats(st, l);
      if (ls.pct === 100) return 'completed';
      return ls.done > 0 ? 'inProgress' : 'notStarted';
    },
    parseLevels(str) { // "0-8, 10" -> [0..8,10]
      const out = new Set();
      for (const tok of String(str || '').split(',')) { const t = tok.trim(); if (!t) continue; const m = t.match(/^(\d+)\s*[-–]\s*(\d+)$/); if (m) { for (let i = +m[1]; i <= +m[2]; i++) out.add(i); } else if (/^\d+$/.test(t)) out.add(+t); }
      return [...out].sort((a, b) => a - b);
    },
    pathLevels(st) { return this.inProg(this.progOf(st), () => this._pathLevels(st)); },
    _pathLevels(st) {
      const p = this.paths().find((x) => x.id === st.path);
      const n = this.levels().length;
      const arr = p ? this.parseLevels(p.levels).filter((i) => i < n) : [...Array(n).keys()];
      return arr.length ? arr : [...Array(n).keys()];
    },
    overall(st) { return this.inProg(this.progOf(st), () => this._overall(st)); },
    _overall(st) {
      const L = this.levels(); let w = 0, sum = 0;
      for (const i of this.pathLevels(st)) { const l = L[i]; if (!l || this.lvOff(st, l)) continue; const h = +l.hours || 1; w += h; sum += h * this.levelStats(st, l).pct; }
      return w ? Math.round(sum / w) : 0;
    },
    achievedSet(st) { return this.inProg(this.progOf(st), () => this._achievedSet(st)); },
    _achievedSet(st) { const set = new Set(); this.levels().forEach((l, i) => { if (this.lvOff(st, l) || this.levelAchieved(st, l)) set.add(i); }); return set; }, // kapalı seviye şart olarak aranmaz
    /* Gereksinim ifadesini değerlendirir: "0-8, 9|10|11, 12" */
    reqCheck(req, set) {
      const missing = [];
      for (const tok of String(req || '').split(',')) {
        const t = tok.trim(); if (!t) continue;
        const alts = t.split('|').map((a) => a.trim()).filter(Boolean);
        let ok = false; let bestMiss = null;
        for (const a of alts) {
          const lv = this.parseLevels(a); const miss = lv.filter((i) => !set.has(i));
          if (!miss.length) { ok = true; break; }
          if (!bestMiss || miss.length < bestMiss.length) bestMiss = alts.length > 1 ? [alts.join(' / ')] : miss;
        }
        if (!ok && bestMiss) missing.push(...bestMiss);
      }
      return { ok: missing.length === 0, missing };
    },
    rankOf(st) { return this.inProg(this.progOf(st), () => this._rankOf(st)); },
    _rankOf(st) {
      const set = this.achievedSet(st); const score = this.overall(st); const R = this.ranks();
      let idx = 0;
      for (let i = 0; i < R.length; i++) { const r = R[i]; if (this.reqCheck(r.req, set).ok && score >= (+r.minScore || 0)) idx = i; }
      const next = R[idx + 1] || null;
      let nextInfo = null;
      if (next) { const c = this.reqCheck(next.req, set); nextInfo = { rank: next, missing: c.missing, scoreNeeded: Math.max(0, (+next.minScore || 0)) , scoreOk: score >= (+next.minScore || 0) }; }
      return { rank: R[idx], index: idx, score, next: nextInfo, achieved: set };
    },
    highestLevel(st) { return this.inProg(this.progOf(st), () => this._highestLevel(st)); },
    _highestLevel(st) { const set = this.achievedSet(st); let h = -1; for (let i = 0; i < this.levels().length; i++) { if (set.has(i)) h = i; else break; } return h; },
    /* ---------- v2.1: ortak ders programı ---------- */
    plans() { return Object.values((this.db.plans || {}).list || {}).filter((p) => !p.deleted).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); },
    plan(id) { const p = ((this.db.plans || {}).list || {})[id]; return p && !p.deleted ? p : null; },
    addPlan(d) { const id = uid('p'); const p = Object.assign({ id, name: '', prog: this.prog, students: [], mode: 'all', lessons: [], excluded: [], custom: {}, createdAt: now(), updatedAt: now() }, d); this.db.plans.list[id] = p; this.touchPlan(p); return p; },
    touchPlan(p, opts) { if (p) p.updatedAt = now(); this.touch('plans', opts); },
    planStudents(p) { return (p.students || []).map((id) => this.db.students[id]).filter((s) => s && !s.deleted); },
    /* Seçilen öğrencilerdeki eksik konular: her madde için ilgili (yolunda olan, hayalet olmayan) ve eksik olan öğrenciler */
    planRows(p) {
      const S = this.planStudents(p);
      return this.inProg(p.prog, () => {
        const pl = new Map(S.map((s) => [s.id, new Set(this.pathLevels(s))]));
        const rows = [];
        this.levels().forEach((l, li) => {
          if (l.off) return;
          l.modules.forEach((m, mi) => {
            if (m.off) return;
            m.items.forEach((it) => {
              if (it.off) return;
              const rel = S.filter((s) => pl.get(s.id).has(li) && !this.stOff(s, l) && !this.stOff(s, m) && !this.stOff(s, it));
              const miss = rel.filter((s) => !this.isDone(s, it.id));
              rows.push({ id: it.id, it, l, m, li, mi, code: li + '.' + (mi + 1), rel, miss });
            });
          });
        });
        return rows;
      });
    },
    planMissing(p, mode) { mode = mode || p.mode || 'all'; return this.planRows(p).filter((r) => r.miss.length && (mode === 'any' || r.miss.length === r.rel.length)); },
    planTopic(p, id) { if (p.custom && p.custom[id]) return { text: p.custom[id], custom: true }; const f = this.inProg(p.prog, () => this.findItem(id)); return f ? { text: f.item.text, code: this.inProg(p.prog, () => this.moduleCode(f.level, f.module)), f } : null; },
    flightMinutes(st) { return (st.flightLog || []).reduce((a, f) => a + (+f.minutes || 0), 0); },
  };
  window.Store = S;
})();
