/* Yardım sayfası (veri/help.js; iki dilli kipte yan yana) ve programın açılışı (App.start). */
(function () {
  const { $, icon, PAGES } = UI;
  PAGES.help = (m, r) => {
    const L = UI.lang(), L2 = UI.lang2();
    m.innerHTML = `<h2 class="ph">${icon('help')} ${t('helpTitle')}</h2>
      <div class="row help-araclar"><button class="btn sm" id="hTanitim">${icon('play')} ${t('krTour')}</button><button class="btn sm ghost" id="hKisayol">${icon('bolt')} ${t('krKeys')}</button></div>
      ${L2 && window.HELP && HELP[L2] ? `<div class="helpbi"><div class="card help">${HELP[L] || HELP.tr}</div><div class="card help" dir="rtl" lang="ar">${HELP[L2]}</div></div>` : `<div class="card help">${(window.HELP && (HELP[L] || HELP.tr)) || ''}</div>`}`;
    $('#hTanitim', m).onclick = () => UI.tanitim();
    $('#hKisayol', m).onclick = () => UI.modal(icon('bolt') + ' ' + t('krKeys'), UI.kisayolTablo(), {});
    if (r.anchor) { const a = $('#' + r.anchor, m); if (a) setTimeout(() => a.scrollIntoView(), 50); r.anchor = null; }
  };

  window.App = {
    async start() {
      await Store.init();
      document.body.classList.add('pf-' + Platform.kind);
      UI.shell(); UI.render();
      Sync.start();
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && UI.modals.length) UI.modals[UI.modals.length - 1](); });
    },
  };
})();
