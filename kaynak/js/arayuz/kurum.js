/* Kurum alanı: üyeler (yalnız listedeki e-postalar kurumun kayıtlarına erişir — firebase/kurum.rules ile), güvenlik kuralları,
   çakışma geçmişi (iki cihazda aynı kayıt farklı değiştiğinde kullanılmayan değer burada saklanır) ve program tanıtımı. */
(function () {
  const { $, $$, esc, icon, toast, modal, confirmDlg, R } = UI;
  const RULES = () => window.KURUM_RULES || '';

  function uyeKart() {
    if (!window.Sync || Sync.state === 'off' || !Sync.user) return `<div class="card" id="kurumUye"><h3>${icon('lock')} ${t('krMembers')}</h3><p class="muted">${t('krMembersOff')}</p><button class="btn sm ghost" data-kr="rules">${icon('lock')} ${t('krRules')}</button></div>`;
    const U = Sync.uye || {};
    const denied = Sync.msg === 'permission-denied' || (U.hata && /permission/.test(U.hata));
    let body = '';
    if (denied) body = `<p class="err">⚠ ${esc(t('krNoAccess'))}</p>`;
    else if (U.sahip) {
      body = `<p class="muted sm">${t('krMembersHelp')}</p><p>${t('krOwner')}: <b dir="ltr">${esc(U.sahip)}</b></p>`;
      if (Sync.benSahip()) body += `<textarea id="kurumUyeListe" rows="4" dir="ltr" class="full">${esc((U.uyeler || []).filter((x) => x !== U.sahip).join('\n'))}</textarea><div class="row"><button class="btn pri sm" data-kr="memSave">${icon('check')} ${t('krSaveMembers')}</button></div>`;
      else body += `<ul class="uye-liste">${(U.uyeler || []).map((e) => `<li dir="ltr">${esc(e)}</li>`).join('')}</ul><p class="muted sm">${esc(t('krNotOwner', { e: U.sahip }))}</p>`;
    } else body = `<p class="muted">${t('syncBusy')}</p>`;
    return `<div class="card" id="kurumUye"><h3>${icon('lock')} ${t('krMembers')}</h3>${body}<div class="row"><button class="btn sm ghost" data-kr="rules">${icon('lock')} ${t('krRules')}</button></div></div>`;
  }
  function cakismaKart() { return `<div class="card" id="cakisma"><h3>${icon('move')} ${t('krConflicts')}</h3><p class="muted sm">${t('krConflictsHelp')}</p><div id="cakismaListe" class="muted">…</div></div>`; }
  async function cakismaDoldur(root) {
    const box = $('#cakismaListe', root); if (!box || !window.Birlestir) return;
    const list = await Birlestir.conflicts();
    if (!list.length) { box.innerHTML = `<p class="ok">${icon('check')} ${t('krNoConflicts')}</p>`; return; }
    const show = (v) => { try { const o = JSON.parse(v); return typeof o === 'string' ? o : JSON.stringify(o, null, 1); } catch (e) { return v; } };
    box.innerHTML = `<div class="cakisma-liste">${list.slice(0, 60).map((c, i) => `<details class="cakisma"><summary><span class="muted sm">${UI.fmtDate(c.t)}</span> <b>${esc(c.label || c.key)}</b> · <span dir="ltr">${esc(c.path || '')}</span>${c.kind === 'keptEdited' ? ` <span class="pill">${t('krConfKept')}</span>` : ''}${c.src ? ` <span class="pill">${esc(c.src === 'ag' ? 'Wi‑Fi' : c.src)}</span>` : ''}</summary>
      <div class="grid2"><div><div class="muted sm">${t('krKept')}</div><pre dir="auto">${esc(show(c.kept)).slice(0, 2000)}</pre></div>${c.kind === 'conflict' ? `<div><div class="muted sm">${t('krLost')}</div><pre dir="auto">${esc(show(c.lost)).slice(0, 2000)}</pre><button class="btn sm" data-ccopy="${i}">${icon('copy')} ${t('krCopy')}</button></div>` : ''}</div></details>`).join('')}</div>
      <div class="row"><button class="btn sm ghost danger" data-kr="confClear">${icon('trash')} ${t('krClearConf')}</button></div>`;
    $$('[data-ccopy]', box).forEach((b) => (b.onclick = async () => { try { await navigator.clipboard.writeText(show(list[+b.dataset.ccopy].lost)); toast(t('krCopied')); } catch (e) {} }));
    const cc = $('[data-kr=confClear]', box); if (cc) cc.onclick = async () => { if (await confirmDlg(t('krClearConf') + '?')) { await Birlestir.clearConflicts(); cakismaDoldur(root); } };
  }
  function kurallar() {
    const mm = modal(icon('lock') + ' ' + t('krRulesTitle'), `<p class="muted sm">${t('krRulesHelp')}</p><textarea rows="16" dir="ltr" class="full code" readonly>${esc(RULES())}</textarea>`,
      { wide: true, foot: `<button class="btn pri" id="kurKopya">${icon('copy')} ${t('krCopy')}</button>` });
    $('#kurKopya', mm.el).onclick = async () => { try { await navigator.clipboard.writeText(RULES()); toast(t('krCopied')); } catch (e) { $('textarea', mm.el).select(); } };
  }
  function bagla(m) {
    $$('[data-kr]', m).forEach((b) => (b.onclick = async (e) => {
      const a = b.dataset.kr; e.preventDefault();
      if (a === 'rules') kurallar();
      if (a === 'memSave') { b.disabled = true; try { const n = await Sync.uyeKaydet($('#kurumUyeListe', m).value.split(/[\s,;]+/)); toast(t('krMembersSaved', { n: n.length })); } catch (er) { toast(t('error') + ': ' + (er.code || er.message), 'err'); } b.disabled = false; }
    }));
    cakismaDoldur(m);
  }
  function uyeYenile() { const el = document.getElementById('kurumUye'); if (!el) return; const d = document.createElement('div'); d.innerHTML = uyeKart(); const n = d.firstElementChild; el.replaceWith(n); bagla(n.parentNode || document); }
  if (window.Sync) Sync.onState(() => { if (R.page === 'settings') uyeYenile(); });
  if (window.Birlestir) Birlestir.onConflict(() => { if (R.page === 'settings') cakismaDoldur(document); });

  /* ---------- program tanıtımı (Yardım ve Ayarlar'dan açılır; ilk açılışta ortak çekirdeğin kurulum rehberi gösterilir) ---------- */
  function tanitim() {
    const steps = [['krTourT1', 'krTourB1', 'plane'], ['krTourT2', 'krTourB2', 'users'], ['krTourT3', 'krTourB3', 'print'], ['krTourT4', 'krTourB4', 'cloud']];
    let i = 0;
    const mm = modal('', '', { cls: 'tanitim', foot: `<button class="btn ghost" id="tnGec">${t('krSkip')}</button><span class="sp"></span><button class="btn" id="tnGeri">${t('krPrev')}</button><button class="btn pri" id="tnIleri">${t('krNext')}</button>` });
    const draw = () => {
      const [tt, bb, ic] = steps[i];
      $('.mt', mm.el).innerHTML = icon(ic) + ' ' + t(tt);
      $('.mb', mm.el).innerHTML = `<div class="tn-adim"><div class="tn-ic">${icon(ic, 'big')}</div><p>${t(bb)}</p><div class="tn-nokta">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div></div>`;
      $('#tnGeri', mm.el).disabled = i === 0;
      $('#tnIleri', mm.el).textContent = i === steps.length - 1 ? t('krDone') : t('krNext');
    };
    $('#tnGec', mm.el).onclick = () => mm.close();
    $('#tnGeri', mm.el).onclick = () => { if (i > 0) { i--; draw(); } };
    $('#tnIleri', mm.el).onclick = () => { if (i < steps.length - 1) { i++; draw(); } else mm.close(); };
    draw();
  }
  UI.tanitim = tanitim;
  window.Kurum = { uyeKart, cakismaKart, bagla, kurallar, uyeYenile };
})();
