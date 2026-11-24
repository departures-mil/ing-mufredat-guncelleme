// Asistan Agent (ortak-cekirdek/web/dist/fc-agent.js): bütün uygulamalardaki çalışmayı izler (yalnız sayılar), öneri verir.
// Bildirim + sağ altta ✦ panel; Ayarlar'da "Admin ile iletişim" kartının önünde kendi kartı. fc-agent.js'yi çekirdekten yeniden kopyalayarak güncellenir.
(function () {
  if (!window.FCAgent) return;
  FCAgent.mount({
    app: "ing-mufredat",
    version: (function () { try { return window.APP_SEMVER||window.APP_VERSION; } catch (e) { return ''; } })(),
    lang: function () { try { return (document.documentElement.lang) || document.documentElement.lang || 'tr'; } catch (e) { return document.documentElement.lang || 'tr'; } },
    theme: 'auto',
    sync: true,
    settingsBefore: ["Yönetici İletişimi", "Contact the Administrator", "التواصل مع المسؤول"],
    ai: function () { try { return (function(){var k=Object.keys(localStorage).filter(function(x){return /danisman.*ayar/.test(x)})[0]; var c=k?JSON.parse(localStorage.getItem(k)||'{}'):{}; var p=c.saglayici||c.provider||'gemini'; var key=c.anahtar||c.key; return key&&/^(gemini|openai|anthropic|groq)$/.test(p)?{provider:p,key:key,model:c.model||undefined}:null;})(); } catch (e) { return null; } }
  });
})();
