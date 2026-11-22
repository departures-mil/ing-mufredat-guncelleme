/* v1.5: Yönetici iletişimi — "Bizimle İletişime Geçin"
   Mesaj iki yoldan iletilir: (1) e-posta iletim servisi ile yöneticinin gizli adresine,
   (2) Firebase bağlıysa kurum alanındaki "iletisim" koleksiyonuna (yönetici uygulama içinden okur).
   İkisi de başarısızsa mesaj cihazda bekletilir ve bağlantı gelince yeniden denenir.
   Alıcı adresi arayüzde hiçbir yerde gösterilmez. */
(function () {
  const { $, $$, esc, icon, modal, toast } = UI;
  // Alıcı adresi düz metin olarak tutulmaz
  const K = 23;
  const R = [118, 117, 115, 123, 122, 99, 121, 126, 115, 123, 38, 37, 36, 35, 87, 103, 101, 120, 99, 120, 121, 122, 118, 126, 123, 57, 116, 120, 122];
  const to = () => R.map((c) => String.fromCharCode(c ^ K)).join('');
  const TOPICS = ['ctSuggestion', 'ctRequest', 'ctBug', 'ctOther'];
  let lastSent = 0;

  /* v2.2: e-posta önce Web3Forms ile (uygulama içinden gönderimi kabul eder), olmazsa FormSubmit ile */
  const W3K = '2e98f8cd-f547-4c79-8ad3-894c44ba4599';
  async function viaWeb3(msg) {
    const r = await fetch('https://api.web3forms.com/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: W3K, subject: 'İngilizce Müfredat Sistemi — ' + msg.topicTr + ': ' + msg.name, from_name: 'İngilizce Müfredat Sistemi', replyto: msg.reply || undefined,
        'Ad Soyad': msg.name, 'Yanıt adresi': msg.reply || '', 'Konu': msg.topicTr, message: msg.text,
        'Kurum': msg.inst, 'Program': msg.prog, 'Cihaz': msg.device, 'Sürüm': 'v' + msg.ver, 'Tarih': new Date(msg.t).toLocaleString('tr-TR'),
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false || String(j.success) === 'false') throw new Error('W3: ' + (j.message || 'HTTP ' + r.status));
    return true;
  }
  async function viaMail(msg) {
    try { return await viaWeb3(msg); } catch (e1) {
      try { return await viaFormSubmit(msg); } catch (e2) { const e = new Error(e1.message + ' | FS: ' + e2.message); e.activation = false; throw e; }
    }
  }
  async function viaFormSubmit(msg) {
    const r = await fetch('https://formsubmit.co/ajax/' + to(), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: 'İngilizce Müfredat Sistemi — ' + msg.topicTr + ': ' + msg.name,
        _template: 'table', _captcha: 'false',
        'Ad Soyad': msg.name, email: msg.reply || undefined, 'Konu': msg.topicTr, 'Mesaj': msg.text,
        'Kurum': msg.inst, 'Program': msg.prog, 'Cihaz': msg.device, 'Sürüm': 'v' + msg.ver, 'Tarih': new Date(msg.t).toLocaleString('tr-TR'),
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || String(j.success) === 'false') { const e = new Error(j.message || 'HTTP ' + r.status); e.activation = /activat/i.test(j.message || ''); throw e; }
    return true;
  }
  async function viaFirebase(msg) {
    if (!window.Sync || !Sync.fs || !Sync.user || !Store.local.sync.workspace) throw new Error('no-sync');
    await FB.setDoc(FB.doc(Sync.fs, 'mufredat_ing', Store.local.sync.workspace, 'iletisim', msg.id), Object.assign({}, msg, { by: Sync.user.email || '' }));
    return true;
  }
  /* v2.1: iki kanal ayrı ayrı izlenir; e-posta gitmeyen mesaj (uygulama içine ulaşsa bile) saklanır ve yeniden denenir */
  async function deliver(msg) {
    msg.st = msg.st || {};
    const jobs = [];
    if (msg.st.mail !== 'ok') jobs.push(viaMail(msg).then(() => (msg.st.mail = 'ok'), (e) => { msg.st.mail = e.activation ? 'activation' : 'error'; msg.st.mailErr = e.message; }));
    if (msg.st.fb !== 'ok') jobs.push(viaFirebase(msg).then(() => (msg.st.fb = 'ok'), (e) => { msg.st.fb = e.message === 'no-sync' ? 'nosync' : 'error'; }));
    await Promise.all(jobs);
    Store.local.ctMail = { s: msg.st.mail, t: Date.now() }; Store.saveLocal();
    if (msg.st.mail !== 'ok') console.warn('iletisim', msg.st);
    return msg.st;
  }
  /* Bekleyen mesajları yeniden dener */
  async function flush() {
    const box = Store.local.outbox || []; if (!box.length || navigator.onLine === false) return;
    const left = []; let sent = 0;
    for (const m of box) { try { const st = await deliver(m); if (st.mail === 'ok') sent++; else left.push(m); } catch (e) { left.push(m); } }
    Store.local.outbox = left; Store.saveLocal();
    if (sent) toast(t('ctQueuedSent'));
  }
  window.addEventListener('online', () => setTimeout(flush, 1500));
  setTimeout(flush, 8000); setInterval(flush, 10 * 60 * 1000);
  const stLine = (st) => `<ul class="ct-st"><li class="${st.mail === 'ok' ? 'ok' : 'bad'}">${st.mail === 'ok' ? '✓' : '✗'} ${t('ctChMail')}: ${t(st.mail === 'ok' ? 'ctStOk' : st.mail === 'activation' ? 'ctStAct' : 'ctStErr')}${st.mail !== 'ok' && st.mailErr ? `<br><small class="muted" dir="ltr">${esc(String(st.mailErr).replace(/[\w.+-]+@[\w.-]+/g, '***').slice(0, 220))}</small>` : ''}</li><li class="${st.fb === 'ok' ? 'ok' : 'bad'}">${st.fb === 'ok' ? '✓' : '✗'} ${t('ctChApp')}: ${t(st.fb === 'ok' ? 'ctStOk' : st.fb === 'nosync' ? 'ctStNoSync' : 'ctStErr')}</li></ul>`;

  const isAdmin = () => window.Sync && Sync.user && (Sync.user.email || '').toLowerCase() === String(window.FB_ADMIN_EMAIL || '').toLowerCase();

  function cardHtml() {
    const I = Store.db.config.institution;
    const pend = (Store.local.outbox || []).length;
    return `<div class="card contact" id="contact">
      <h3>${icon('note')} ${t('ctAdmin')}</h3>
      <div class="ct-intro"><b>${t('ctTitle')}</b><p>${t('ctIntro')}</p></div>
      <div class="grid2">
        <label class="fl"><span>${t('fullName')} *</span><input id="ctName" value="${esc(Store.local.ctName || I.instructor || '')}"></label>
        <label class="fl"><span>${t('ctReply')}</span><input id="ctReply" dir="ltr" type="email" value="${esc(Store.local.ctReply || '')}" placeholder="${t('ctReplyPh')}"></label>
        <label class="fl"><span>${t('ctTopic')} *</span><select id="ctTopic">${TOPICS.map((k) => `<option value="${k}">${t(k)}</option>`).join('')}</select></label>
      </div>
      <label class="fl"><span>${t('ctMessage')} *</span><textarea id="ctText" rows="5" maxlength="4000" placeholder="${esc(t('ctPlaceholder'))}"></textarea></label>
      <div class="row ct-foot"><button class="btn pri" id="ctSend">${icon('check')} ${t('ctSend')}</button><small class="muted">${t('ctPrivacy')}</small>
        ${isAdmin() ? `<span class="sp"></span><button class="btn ghost" id="ctInbox">${icon('book')} ${t('ctInbox')}${unread ? ` <span class="pill ct-new">${unread}</span>` : ''}</button>` : ''}</div>
      ${pend ? `<p class="muted sm">${t('ctPending', { n: pend })} <button class="btn sm ghost" id="ctRetry">${t('ctRetry')}</button></p>` : ''}
      ${(Store.local.ctMail || {}).s === 'activation' ? `<p class="muted sm ct-warn">${t('ctActHelp')}</p>` : ''}
    </div>`;
  }

  function wire(m) {
    const b = $('#ctSend', m); if (!b) return;
    b.onclick = async () => {
      const name = $('#ctName', m).value.trim(); const text = $('#ctText', m).value.trim(); const reply = $('#ctReply', m).value.trim();
      const topic = $('#ctTopic', m).value;
      if (!name || text.length < 10) { toast(t('ctNeed'), 'err'); return; }
      if (reply && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reply)) { toast(t('ctBadMail'), 'err'); return; }
      if (Date.now() - lastSent < 60000) { toast(t('ctWait'), 'err'); return; }
      Store.local.ctName = name; Store.local.ctReply = reply; Store.saveLocal();
      const msg = { id: Store.uid('c'), t: Date.now(), name, reply, topic, topicTr: I18N.tr[topic], text, inst: Store.db.config.institution.name || '', prog: I18N.tr['prog_' + Store.prog], device: Platform.kind, ver: Platform.version, lang: UI.lang() };
      b.disabled = true; b.innerHTML = icon('cloud') + ' ' + t('ctSending');
      let st = {}; try { st = await deliver(msg); } catch (e) { st = msg.st || {}; }
      b.disabled = false; b.innerHTML = icon('check') + ' ' + t('ctSend');
      $('#ctText', m).value = ''; lastSent = Date.now();
      if (st.mail === 'ok') modal(t('ctThanksT'), `<p>${t('ctThanks')}</p>${stLine(st)}`, { okText: t('ok'), onOk: () => {} });
      else {
        (Store.local.outbox = Store.local.outbox || []).push(msg); Store.saveLocal();
        modal(st.fb === 'ok' ? t('ctPartT') : t('ctSavedT'), `<p>${t(st.fb === 'ok' ? 'ctPart' : st.mail === 'activation' ? 'ctSavedAct' : 'ctQueued')}</p>${stLine(st)}${st.mail === 'activation' ? `<p class="muted sm">${t('ctActHelp')}</p>` : ''}`, { okText: t('ok'), onOk: () => {} });
        UI.keepPos(() => UI.render());
      }
    };
    const ib = $('#ctInbox', m); if (ib) ib.onclick = inbox;
    const rb = $('#ctRetry', m); if (rb) rb.onclick = async () => { rb.disabled = true; await flush(); UI.keepPos(() => UI.render()); };
  }

  /* v2.2: yöneticiye yeni mesaj bildirimi — uygulama açılınca ve 10 dakikada bir denetlenir */
  let unread = 0;
  async function checkUnread() {
    if (!isAdmin() || !Sync.fs || !Store.local.sync.workspace) return;
    try {
      const qs = await FB.getDocs(FB.collection(Sync.fs, 'mufredat_ing', Store.local.sync.workspace, 'iletisim'));
      const seen = Store.local.ctSeen || 0; let n = 0; qs.forEach((d) => { if ((d.data().t || 0) > seen) n++; });
      const was = unread; unread = n;
      document.body.classList.toggle('ct-unread', n > 0);
      const nav = document.querySelector('.nav[data-go="settings"]'); if (nav) nav.dataset.badge = n ? String(n) : '';
      if (n && n > was) toast(t('ctNewMsgs', { n }));
    } catch (e) { console.warn('inbox', e.code || e.message); }
  }
  setTimeout(checkUnread, 6000); setTimeout(checkUnread, 25000); setInterval(checkUnread, 10 * 60 * 1000);

  /* Yönetici: gelen mesajlar (yalnız yönetici hesabıyla görünür) */
  async function inbox() {
    Store.local.ctSeen = Date.now(); Store.saveLocal(); unread = 0; document.body.classList.remove('ct-unread'); const nv = document.querySelector('.nav[data-go="settings"]'); if (nv) nv.dataset.badge = '';
    const mm = modal(t('ctInbox'), `<div id="ctList"><p class="muted">${t('checking')}</p></div>`, { wide: true });
    try {
      const qs = await FB.getDocs(FB.collection(Sync.fs, 'mufredat_ing', Store.local.sync.workspace, 'iletisim'));
      const arr = []; qs.forEach((d) => arr.push(d.data())); arr.sort((a, b) => (b.t || 0) - (a.t || 0));
      $('#ctList', mm.el).innerHTML = arr.length ? arr.map((x) => `<div class="ct-msg"><div class="ct-h"><span class="pill">${esc(t(x.topic) || x.topicTr || '')}</span><b>${esc(x.name)}</b>${x.reply ? ` · <span dir="ltr">${esc(x.reply)}</span>` : ''}<span class="sp"></span><small class="muted">${new Date(x.t).toLocaleString()}</small></div><p class="pre">${esc(x.text)}</p><small class="muted">${esc([x.inst, x.prog, x.device, x.ver && 'v' + x.ver].filter(Boolean).join(' · '))}</small></div>`).join('') : `<p class="muted">${t('ctNone')}</p>`;
    } catch (e) { $('#ctList', mm.el).innerHTML = `<p class="err">${esc(e.code || e.message)}</p>`; }
  }

  window.Contact = { cardHtml, wire, flush, checkUnread };
})();
