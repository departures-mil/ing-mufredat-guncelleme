/* Panel (ana sayfa): özet sayılar, CEFR seviyelerine göre sınıf ilerlemesi, en iyi öğrenciler, unvan dağılımı, son işlemler. */
(function () {
  const { $, $$, esc, icon, tx, go, PAGES, fmtDate, studentRow, setProgram } = UI;
  const L = () => UI.lang();

  /* CEFR seviyelerine göre ilerleme: bu programdaki aktif öğrencilerin seviye başına ortalama tamamlama oranı */
  function cefrKart() {
    const st = Store.students(false, Store.prog);
    const lv = Store.levels().filter((l) => !l.off);
    if (!lv.length) return '';
    const rows = lv.map((l) => {
      let sum = 0, ach = 0;
      st.forEach((s) => { const ls = Store.levelStats(s, l); sum += ls.pct; if (Store.levelAchieved(s, l)) ach++; });
      const pct = st.length ? Math.round(sum / st.length) : 0;
      return `<div class="cefr-lv"><span class="cefr-ad">${esc(tx(l.title))}</span><div class="bar"><i style="width:${pct}%"></i></div><b dir="ltr">${L() === 'tr' ? '%' + pct : pct + '%'}</b><span class="muted sm">${st.length ? esc(t('krAchieved', { n: ach })) : ''}</span></div>`;
    }).join('');
    return `<div class="card" id="cefrKart"><h3>${icon('flag')} ${t('krCefr')}</h3><p class="muted sm">${t('krCefrHelp')}</p>${st.length ? rows : `<p class="muted">${t('krNoSt')}</p>`}</div>`;
  }

  /* v2.0: etkinlik kayıtlarındaki unvan adı kaydedildiği dilde kalmasın — her zaman seçili dilde göster */
  function actParams(a) {
    const p = Object.assign({}, a.params || {});
    if (p.r) { p.r = String(p.r).replace(/\uE000([^\uE001]*)\uE001[^\uE002]*\uE002/g, '$1'); let f = null; for (const pg of Store.PROGS) { f = (Store.ranks(pg) || []).find((x) => x.name && ['tr', 'en', 'ar'].some((l) => x.name[l] === p.r)); if (f) break; } p.r = f ? tx(f.name) : window.LangGuard ? LangGuard.ptx(p.r) : p.r; }
    return p;
  }
  PAGES.dashboard = (m) => {
    const st = Store.students(false, Store.prog); const c = Store.counts();
    const avg = st.length ? Math.round(st.reduce((a, s) => a + Store.overall(s), 0) / st.length) : 0;
    const ranks = Store.ranks(); const dist = ranks.map(() => 0); st.forEach((s) => dist[Store.rankOf(s).index]++);
    const maxd = Math.max(1, ...dist);
    m.innerHTML = `
      <section class="hero"><div><h1>${t('dashWelcome')}</h1><p>${t('dashSub')}</p><div class="progseg">${Store.PROGS.map((p) => `<button class="p-${p} ${p === Store.prog ? 'on' : ''}" data-prog="${p}">${t('prog_' + p)}</button>`).join('')}</div><p class="muted sm">${esc(tx(Store.cur().title))}</p></div><div class="hero-plane">${icon('plane')}</div></section>
      ${!st.length ? `<div class="card tip">${icon('bolt')} ${t('welcomeHelp')}</div>` : ''}
      <div class="stats">
        ${[[t('statStudents'), st.length, 'users'], [t('statLevels'), c.levels, 'flag'], [t('statModules'), c.modules, 'book'], [t('statItems'), c.items, 'check'], [t('statAvg'), '%' + avg, 'plane']].map(([l, v, i]) => `<div class="stat">${icon(i)}<div class="sv">${v}</div><div class="sl">${l}</div></div>`).join('')}
      </div>
      <div class="cols">
        <div class="card"><h3>${t('topStudents')}</h3>${st.length ? `<div class="slist">${st.slice(0, 12).map((s) => studentRow(s)).join('')}</div>` : `<p class="muted">${t('noStudents')}</p>`}</div>
        <div class="card"><h3>${t('rankDist')}</h3><div class="rdist">${ranks.map((r, i) => `<div class="rd"><span class="rbadge" style="--rc:${r.color}">${esc(tx(r.name))}</span><div class="bar"><i style="width:${(dist[i] / maxd) * 100}%;background:${r.color}"></i></div><b>${dist[i]}</b></div>`).join('')}</div>
          <h3 style="margin-top:18px">${t('quickActions')}</h3><div class="qa">
          <button class="btn pri" data-q="addStudent">${icon('plus')} ${t('addStudent')}</button>
          <button class="btn" data-q="assess">${icon('assess')} ${t('nav_assess')}</button>
          <button class="btn" data-q="print">${icon('print')} ${t('printBlank')}</button>
          <button class="btn" data-q="curriculum">${icon('book')} ${t('nav_curriculum')}</button></div></div>
      </div>
      <div class="card"><h3>${t('recent')}</h3>${Store.db.activity.length ? `<ul class="act">${Store.db.activity.slice(0, 12).map((a) => `<li><span class="muted">${fmtDate(a.t)}</span> ${esc(t(a.key, actParams(a)))}</li>`).join('')}</ul>` : `<p class="muted">${t('noActivity')}</p>`}</div>`;
    const cf = cefrKart(); if (cf) $('.stats', m).insertAdjacentHTML('afterend', cf);
    $$('[data-sid]', m).forEach((e) => (e.onclick = () => go('student', { sid: e.dataset.sid, tab: 'summary' })));
    $$('[data-prog]', m).forEach((b) => (b.onclick = () => setProgram(b.dataset.prog)));
    $$('[data-q]', m).forEach((b) => (b.onclick = () => { const q = b.dataset.q; if (q === 'addStudent') UI.editStudent(); else if (q === 'print') go('print', { ptype: 'blank' }); else go(q); }));
  };

  UI.actParams = actParams;
})();
