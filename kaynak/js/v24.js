/* v2.4.0 — profesyonel sürüm eklentileri
   - Ayarlar: kurum alanı üyeleri ve güvenlik kuralları, çakışma geçmişi, görünüm (koyu/açık tema), klavye kısayolları,
     otomatik hata raporu, Hakkında / gizlilik / lisans. Admin ile iletişim kartı Ayarlar'ın en sonundadır.
   - Panel: CEFR seviyelerine göre sınıf ilerlemesi.
   - İlk açılış tanıtımı.
   - Hata olunca kısa, kişisel veri içermeyen rapor yöneticiye kendiliğinden gider (kullanıcının Firebase kotası kullanılmaz). */
(function () {
  const X = {
    tr: {
      v24Members: 'Kurum alanı üyeleri', v24MembersHelp: 'Bu kurum alanındaki kayıtlara yalnız aşağıdaki e-posta adresleriyle giriş yapanlar erişebilir (güvenlik kuralları yapıştırıldıktan sonra). Her satıra bir e-posta yazın.',
      v24Owner: 'Sahip', v24NotOwner: 'Üye listesini yalnız kurum alanının sahibi ({e}) değiştirebilir.', v24SaveMembers: 'Üyeleri kaydet', v24MembersSaved: '{n} üye kaydedildi.',
      v24Rules: 'Güvenlik kurallarını göster', v24RulesTitle: 'Firebase güvenlik kuralları', v24RulesHelp: 'Önce bütün cihazları bu sürüme güncelleyin ve üyeleri ekleyin. Sonra Firebase konsolunda Firestore Database → Kurallar (Rules) sekmesini açın, oradaki metnin yerine aşağıdakini yapıştırıp Yayınla (Publish) düğmesine basın. Böylece her kurum yalnız kendi verisine erişir.',
      v24Copy: 'Kopyala', v24Copied: 'Kopyalandı', v24NoAccess: 'Bu kurum alanına erişim izniniz yok. Kurum sahibinden e-posta adresinizi üye listesine eklemesini isteyin.', v24MembersOff: 'Üye yönetimi için önce eşitlemeye giriş yapın.',
      v24Conflicts: 'Çakışma geçmişi', v24ConflictsHelp: 'İki cihazda aynı kayıt farklı değiştirildiğinde ikisi birleştirilir. Aynı alan iki yerde farklıysa daha yeni olan kalır; diğeri burada saklanır ve kopyalanabilir.',
      v24NoConflicts: 'Çakışma yok. Bütün değişiklikler sorunsuz birleştirildi.', v24Kept: 'Kalan', v24Lost: 'Saklanan (kullanılmayan) değer', v24Field: 'Alan', v24ClearConf: 'Geçmişi temizle', v24ConfKept: 'Bir tarafta silinen ama diğer tarafta düzenlenen öğe korundu',
      v24Appearance: 'Görünüm', v24Theme: 'Tema', v24Dark: 'Koyu', v24Light: 'Açık', v24Auto: 'Sistem',
      v24Keys: 'Klavye kısayolları', v24Tour: 'Tanıtımı yeniden göster',
      v24ErrRep: 'Otomatik hata raporu', v24ErrRepHelp: 'Program bir hata verirse yalnız hata metni, sürüm ve cihaz türü yöneticiye gönderilir. Öğrenci, kurum ya da kişisel bilgi gönderilmez. Sizin Firebase kotanız kullanılmaz.', v24ErrRepOn: 'Hata olunca yöneticiye kendiliğinden bildir', v24ErrSent: 'Bu cihazdan gönderilen hata raporu: {n}',
      v24About: 'Hakkında', v24License: 'Lisans', v24LicenseTxt: 'Bu program hayır amaçlı ve ücretsiz dağıtılır. Satılamaz. Kurumlar kendi eğitimleri için serbestçe kullanabilir ve çoğaltabilir.',
      v24Privacy: 'Gizlilik', v24PrivacyTxt: 'Kayıtlarınız yalnız bu cihazda ve (eşitleme açıksa) kurumunuzun kendi Firebase hesabında tutulur. Yönetici kayıtlarınızı göremez. Güncellemeler GitHub üzerinden imzalı paketlerle gelir ve kayıtlarınıza dokunmaz. İletişim formuna yazdıklarınız ve hata raporları yalnız yöneticiye gider.',
      v24Releases: 'Sürüm geçmişi', v24Shell: 'Kabuk', v24Signed: 'Paket imza denetimi', v24SignOn: 'açık', v24SignOff: 'hazırlanıyor (yalnız sha256 denetimi)',
      v24Cefr: 'CEFR seviyelerine göre ilerleme', v24CefrHelp: 'Bu programdaki aktif öğrencilerin her seviyedeki ortalama tamamlama oranı ve seviyeyi kazanan öğrenci sayısı.', v24Achieved: '{n} öğrenci kazandı', v24NoSt: 'Öğrenci eklendikçe burada görünür.',
      v24TourT1: 'Hoş geldiniz', v24TourB1: 'İngilizce Müfredat Sistemi; CEFR seviyelerine (Pre-A1 – C2) göre müfredatı, öğrencileri, değerlendirmeleri ve çıktıları tek yerde yönetir.',
      v24TourT2: 'Müfredat ve öğrenciler', v24TourB2: 'Müfredat sayfasında seviye, modül ve maddeleri düzenleyin. Öğrenciler sayfasında öğrenci ekleyin ve maddeleri “Biliyor” ya da “Çalıştık” diye işaretleyin.',
      v24TourT3: 'Çıktılar', v24TourB3: 'Çıktılar sayfasından kurum antetli kontrol listesi, öğrenci raporu, sertifika, ders planı ve sınav kâğıdını PDF ya da Word olarak alın. Logo ve kurum adı Ayarlar’dan gelir.',
      v24TourT4: 'Eşitleme ve güncelleme', v24TourB4: 'Kendi ücretsiz Firebase hesabınızla masaüstü ve telefonu eşitleyin. Yeni sürüm çıkınca sağ üstteki düğmeye bir kez basmanız yeter; kayıtlarınız korunur.',
      v24Next: 'İleri', v24Prev: 'Geri', v24Done: 'Başla', v24Skip: 'Geç',
      v24KeyNav: 'Menüdeki sayfalar', v24KeySearch: 'Genel arama', v24KeyHelp: 'Yardım', v24KeySet: 'Ayarlar', v24KeyNew: 'Yeni öğrenci', v24KeyPrint: 'Çıktı merkezi', v24KeySync: 'Şimdi eşitle', v24KeyList: 'Kısayol listesi',
    },
    en: {
      v24Members: 'Workspace members', v24MembersHelp: 'Only people who sign in with the e-mail addresses below can reach this workspace’s records (once the security rules are pasted). One e-mail per line.',
      v24Owner: 'Owner', v24NotOwner: 'Only the workspace owner ({e}) can change the member list.', v24SaveMembers: 'Save members', v24MembersSaved: '{n} members saved.',
      v24Rules: 'Show security rules', v24RulesTitle: 'Firebase security rules', v24RulesHelp: 'First update every device to this version and add the members. Then in the Firebase console open Firestore Database → Rules, replace the text there with the rules below and press Publish. Each institution can then reach only its own data.',
      v24Copy: 'Copy', v24Copied: 'Copied', v24NoAccess: 'You have no access to this workspace. Ask the workspace owner to add your e-mail address to the member list.', v24MembersOff: 'Sign in to sync first to manage members.',
      v24Conflicts: 'Conflict history', v24ConflictsHelp: 'When the same record is changed differently on two devices, the changes are merged. If the same field differs, the newer value stays; the other one is kept here and can be copied.',
      v24NoConflicts: 'No conflicts. All changes were merged cleanly.', v24Kept: 'Kept', v24Lost: 'Stored (unused) value', v24Field: 'Field', v24ClearConf: 'Clear history', v24ConfKept: 'An item deleted on one side but edited on the other was kept',
      v24Appearance: 'Appearance', v24Theme: 'Theme', v24Dark: 'Dark', v24Light: 'Light', v24Auto: 'System',
      v24Keys: 'Keyboard shortcuts', v24Tour: 'Show the introduction again',
      v24ErrRep: 'Automatic error reports', v24ErrRepHelp: 'If the program hits an error, only the error text, the version and the device type are sent to the administrator. No student, institution or personal data is sent. Your Firebase quota is not used.', v24ErrRepOn: 'Notify the administrator automatically when an error happens', v24ErrSent: 'Error reports sent from this device: {n}',
      v24About: 'About', v24License: 'Licence', v24LicenseTxt: 'This program is distributed free of charge for charitable purposes. It may not be sold. Institutions may use and copy it freely for their own training.',
      v24Privacy: 'Privacy', v24PrivacyTxt: 'Your records are kept only on this device and (if sync is on) in your institution’s own Firebase account. The administrator cannot see your records. Updates come from GitHub as signed packages and never touch your records. Messages from the contact form and error reports go only to the administrator.',
      v24Releases: 'Release history', v24Shell: 'Shell', v24Signed: 'Package signature check', v24SignOn: 'on', v24SignOff: 'being prepared (sha256 check only)',
      v24Cefr: 'Progress by CEFR level', v24CefrHelp: 'Average completion of the active students of this program at each level, and how many students achieved the level.', v24Achieved: '{n} students achieved', v24NoSt: 'Appears here as students are added.',
      v24TourT1: 'Welcome', v24TourB1: 'English Curriculum System manages the curriculum by CEFR level (Pre-A1 – C2), the students, the assessments and the printouts in one place.',
      v24TourT2: 'Curriculum and students', v24TourB2: 'Edit levels, modules and items on the Curriculum page. Add students on the Students page and mark items as “Known” or “Studied”.',
      v24TourT3: 'Printouts', v24TourB3: 'From the Print centre get the checklist, student report, certificate, lesson plan and exam paper on your letterhead as PDF or Word. The logo and institution name come from Settings.',
      v24TourT4: 'Sync and updates', v24TourB4: 'Sync the desktop and the phone with your own free Firebase account. When a new version comes out, press the button at the top right once; your records are kept.',
      v24Next: 'Next', v24Prev: 'Back', v24Done: 'Start', v24Skip: 'Skip',
      v24KeyNav: 'Menu pages', v24KeySearch: 'Global search', v24KeyHelp: 'Help', v24KeySet: 'Settings', v24KeyNew: 'New student', v24KeyPrint: 'Print centre', v24KeySync: 'Sync now', v24KeyList: 'Shortcut list',
    },
    ar: {
      v24Members: 'أعضاء مساحة المؤسسة', v24MembersHelp: 'لا يصل إلى سجلات هذه المساحة إلا من يسجّل الدخول بعناوين البريد أدناه (بعد لصق قواعد الأمان). اكتب بريداً واحداً في كل سطر.',
      v24Owner: 'المالك', v24NotOwner: 'لا يغيّر قائمة الأعضاء إلا مالك المساحة ({e}).', v24SaveMembers: 'حفظ الأعضاء', v24MembersSaved: 'تم حفظ {n} عضواً.',
      v24Rules: 'عرض قواعد الأمان', v24RulesTitle: 'قواعد أمان Firebase', v24RulesHelp: 'حدّث كل الأجهزة إلى هذا الإصدار أولاً وأضف الأعضاء. ثم افتح في وحدة تحكم Firebase: Firestore Database ← Rules، وضع القواعد أدناه مكان النص الموجود واضغط Publish. عندها تصل كل مؤسسة إلى بياناتها فقط.',
      v24Copy: 'نسخ', v24Copied: 'تم النسخ', v24NoAccess: 'ليس لديك إذن للوصول إلى هذه المساحة. اطلب من مالكها إضافة بريدك إلى قائمة الأعضاء.', v24MembersOff: 'سجّل الدخول إلى المزامنة أولاً لإدارة الأعضاء.',
      v24Conflicts: 'سجل التعارضات', v24ConflictsHelp: 'إذا تغيّر السجل نفسه بشكل مختلف على جهازين يُدمج التغييران. وإذا اختلف الحقل نفسه يبقى الأحدث، ويُحفظ الآخر هنا ويمكن نسخه.',
      v24NoConflicts: 'لا توجد تعارضات. دُمجت كل التغييرات بلا مشاكل.', v24Kept: 'المُبقى', v24Lost: 'القيمة المحفوظة (غير المستخدمة)', v24Field: 'الحقل', v24ClearConf: 'مسح السجل', v24ConfKept: 'عنصر حُذف في جهة وعُدّل في الأخرى فأُبقي عليه',
      v24Appearance: 'المظهر', v24Theme: 'السمة', v24Dark: 'داكن', v24Light: 'فاتح', v24Auto: 'النظام',
      v24Keys: 'اختصارات لوحة المفاتيح', v24Tour: 'عرض التعريف مرة أخرى',
      v24ErrRep: 'تقارير الأخطاء التلقائية', v24ErrRepHelp: 'إذا حدث خطأ في البرنامج يُرسل إلى المسؤول نص الخطأ والإصدار ونوع الجهاز فقط. لا تُرسل بيانات الطلاب أو المؤسسة أو أي بيانات شخصية. لا تُستهلك حصتك في Firebase.', v24ErrRepOn: 'إبلاغ المسؤول تلقائياً عند حدوث خطأ', v24ErrSent: 'تقارير الأخطاء المرسلة من هذا الجهاز: {n}',
      v24About: 'حول البرنامج', v24License: 'الترخيص', v24LicenseTxt: 'يُوزَّع هذا البرنامج مجاناً لأغراض خيرية ولا يجوز بيعه. يمكن للمؤسسات استخدامه ونسخه بحرية لتدريبها الخاص.',
      v24Privacy: 'الخصوصية', v24PrivacyTxt: 'تُحفظ سجلاتك على هذا الجهاز فقط و(إذا كانت المزامنة مفعّلة) في حساب Firebase الخاص بمؤسستك. لا يستطيع المسؤول رؤية سجلاتك. تأتي التحديثات من GitHub في حزم موقّعة ولا تمسّ سجلاتك. رسائل نموذج التواصل وتقارير الأخطاء تصل إلى المسؤول فقط.',
      v24Releases: 'سجل الإصدارات', v24Shell: 'الغلاف', v24Signed: 'التحقق من توقيع الحزمة', v24SignOn: 'مفعّل', v24SignOff: 'قيد التجهيز (تحقق sha256 فقط)',
      v24Cefr: 'التقدم حسب مستويات CEFR', v24CefrHelp: 'متوسط نسبة الإنجاز للطلاب النشطين في هذا البرنامج في كل مستوى، وعدد الطلاب الذين اجتازوا المستوى.', v24Achieved: 'اجتازه {n} طالباً', v24NoSt: 'يظهر هنا عند إضافة الطلاب.',
      v24TourT1: 'مرحباً', v24TourB1: 'يدير نظام منهج اللغة الإنجليزية المنهجَ حسب مستويات CEFR (من Pre-A1 إلى C2) والطلابَ والتقييمات والمطبوعات في مكان واحد.',
      v24TourT2: 'المنهج والطلاب', v24TourB2: 'عدّل المستويات والوحدات والبنود في صفحة المنهج. أضف الطلاب في صفحة الطلاب وعلّم البنود بـ«يعرف» أو «درسنا».',
      v24TourT3: 'المطبوعات', v24TourB3: 'من مركز الطباعة احصل على قائمة التحقق وتقرير الطالب والشهادة وخطة الدرس وورقة الامتحان على ورق مؤسستك بصيغة PDF أو Word. الشعار واسم المؤسسة يأتيان من الإعدادات.',
      v24TourT4: 'المزامنة والتحديث', v24TourB4: 'زامن الحاسوب والهاتف بحساب Firebase المجاني الخاص بك. عند صدور إصدار جديد اضغط الزر أعلى اليمين مرة واحدة؛ تبقى سجلاتك محفوظة.',
      v24Next: 'التالي', v24Prev: 'السابق', v24Done: 'ابدأ', v24Skip: 'تخطٍّ',
      v24KeyNav: 'صفحات القائمة', v24KeySearch: 'البحث العام', v24KeyHelp: 'المساعدة', v24KeySet: 'الإعدادات', v24KeyNew: 'طالب جديد', v24KeyPrint: 'مركز الطباعة', v24KeySync: 'زامن الآن', v24KeyList: 'قائمة الاختصارات',
    },
  };
  for (const l of Object.keys(X)) Object.assign(I18N[l], X[l]);

  const { $, $$, esc, icon, tx, toast, modal, confirmDlg, go, PAGES, R, afterRender } = UI;
  const T = (k, p) => window.t(k, p);
  const L = () => UI.lang();
  const ui = () => { if (!Store.local) { try { return JSON.parse(localStorage.getItem('ingmufredat_local_v1') || '{}').ui || {}; } catch (e) { return {}; } } return (Store.local.ui = Store.local.ui || {}); };
  const RELEASES = 'https://github.com/departures-mil/ing-mufredat-guncelleme/releases';
  const RULES = window.KURUM_RULES || '';
  const openUrl = (u) => { try { Platform.openUrl ? Platform.openUrl(u) : window.open(u, '_blank'); } catch (e) { window.open(u, '_blank'); } };

  /* ---------- tema ---------- */
  function applyTheme() {
    const th = ui().theme || 'dark';
    const light = th === 'light' || (th === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches);
    document.documentElement.classList.toggle('light', !!light);
    const mt = document.querySelector('meta[name=theme-color]'); if (mt) mt.content = light ? '#eef3f9' : '#061327';
  }
  try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme); } catch (e) {}

  /* ---------- klavye kısayolları ---------- */
  const NAVK = ['dashboard', 'curriculum', 'students', 'assess', 'plans', 'exams', 'grammar', 'dict', 'vocab'];
  const KEYS = () => [['Ctrl + 1…9', T('v24KeyNav')], ['Ctrl + F', T('v24KeySearch')], ['Ctrl + N', T('v24KeyNew')], ['Ctrl + P', T('v24KeyPrint')], ['Ctrl + ,', T('v24KeySet')], ['Ctrl + S', T('v24KeySync')], ['F1', T('v24KeyHelp')], ['Ctrl + /', T('v24KeyList')]];
  function keysHtml() { return `<table class="v24keys">${KEYS().map(([k, d]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(d)}</td></tr>`).join('')}</table>`; }
  document.addEventListener('keydown', (e) => {
    if (UI.modals.length) return;
    const ctl = e.ctrlKey || e.metaKey;
    if (e.key === 'F1') { e.preventDefault(); go('help'); return; }
    if (!ctl || e.altKey) return;
    const k = e.key.toLowerCase();
    if (/^[1-9]$/.test(k)) { const p = NAVK[+k - 1]; if (p && PAGES[p]) { e.preventDefault(); go(p); } return; }
    if (k === 'k') { const i = $('#gsWrap input'); if (i) { e.preventDefault(); i.focus(); i.select && i.select(); } return; }
    if (k === 'n' && !e.shiftKey) { e.preventDefault(); UI.editStudent && UI.editStudent(); return; }
    if (k === 'p') { e.preventDefault(); go('print'); return; }
    if (k === ',') { e.preventDefault(); go('settings'); return; }
    if (k === 's') { e.preventDefault(); if (window.Sync && Sync.state !== 'off') { Sync.syncNow(); toast(T('syncBusy')); } else { Store.persistNow(); toast(T('saved')); } return; }
    if (k === '/') { e.preventDefault(); modal(icon('bolt') + ' ' + T('v24Keys'), keysHtml(), {}); }
  });

  /* ---------- otomatik hata raporu (Web3Forms; kullanıcının Firebase kotası kullanılmaz) ---------- */
  const W3K = '2e98f8cd-f547-4c79-8ad3-894c44ba4599';
  const ERRK = 'ingmufredat_err_v1';
  const errState = () => { try { return JSON.parse(localStorage.getItem(ERRK) || '{}'); } catch (e) { return {}; } };
  const errSave = (o) => { try { localStorage.setItem(ERRK, JSON.stringify(o)); } catch (e) {} };
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  let errQueue = [];
  function reportError(msg, stack, src) {
    try {
      if (ui().errRep === false) return;
      msg = String(msg || '').slice(0, 300); if (!msg || /ResizeObserver|Script error\.?$|NetworkError|Failed to fetch|Load failed/i.test(msg)) return;
      const st = errState(); const day = new Date().toISOString().slice(0, 10);
      if (st.day !== day) { st.day = day; st.n = 0; st.seen = st.seen || {}; }
      const h = hash(msg + '|' + String(stack || '').split('\n')[1]);
      st.seen = st.seen || {}; if (st.seen[h] || st.n >= 5) return;
      st.seen[h] = day; st.n++; st.total = (st.total || 0) + 1;
      const keys = Object.keys(st.seen); if (keys.length > 200) keys.slice(0, keys.length - 200).forEach((k) => delete st.seen[k]);
      errSave(st);
      errQueue.push({ msg, stack: String(stack || '').replace(/file:\/\/[^\s)]+\/(?=[^/\s)]+\))/g, '').slice(0, 1500), src: String(src || '').slice(0, 200), page: R.page });
      setTimeout(flushErrors, 2000);
    } catch (e) {}
  }
  async function flushErrors() {
    if (!errQueue.length || navigator.onLine === false) return;
    const q = errQueue.splice(0, errQueue.length);
    for (const it of q) {
      try {
        await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ access_key: W3K, subject: 'İngilizce Müfredat Sistemi — HATA RAPORU v' + Platform.semver, from_name: 'İngilizce Müfredat Sistemi (otomatik)',
            'Hata': it.msg, 'Yığın': it.stack, 'Kaynak': it.src, 'Sayfa': it.page, 'Sürüm': 'v' + Platform.semver, 'Cihaz': Platform.kind + ' / kabuk ' + ((window.Updater && Updater.shell()) || '-'), 'Dil': L(), 'Tarih': new Date().toISOString() }) });
      } catch (e) {}
    }
  }
  window.addEventListener('error', (e) => reportError(e.message, e.error && e.error.stack, (e.filename || '') + ':' + (e.lineno || '')));
  window.addEventListener('unhandledrejection', (e) => { const r = e.reason || {}; if (r && r.code && /^(permission-denied|unavailable|resource-exhausted|auth\/)/.test(String(r.code))) return; reportError(r.message || String(r), r.stack, 'promise'); });
  window.addEventListener('online', () => setTimeout(flushErrors, 3000));

  /* ---------- ayarlar kartları ---------- */
  function membersCardHtml() {
    if (!window.Sync || Sync.state === 'off' || !Sync.user) return `<div class="card" id="v24mem"><h3>${icon('lock')} ${T('v24Members')}</h3><p class="muted">${T('v24MembersOff')}</p><button class="btn sm ghost" data-v24="rules">${icon('lock')} ${T('v24Rules')}</button></div>`;
    const U = Sync.uye || {};
    const denied = Sync.msg === 'permission-denied' || (U.hata && /permission/.test(U.hata));
    let body = '';
    if (denied) body = `<p class="err">⚠ ${esc(T('v24NoAccess'))}</p>`;
    else if (U.sahip) {
      body = `<p class="muted sm">${T('v24MembersHelp')}</p><p>${T('v24Owner')}: <b dir="ltr">${esc(U.sahip)}</b></p>`;
      if (Sync.benSahip()) body += `<textarea id="v24memList" rows="4" dir="ltr" class="full">${esc((U.uyeler || []).filter((x) => x !== U.sahip).join('\n'))}</textarea><div class="row"><button class="btn pri sm" data-v24="memSave">${icon('check')} ${T('v24SaveMembers')}</button></div>`;
      else body += `<ul class="v24mem">${(U.uyeler || []).map((e) => `<li dir="ltr">${esc(e)}</li>`).join('')}</ul><p class="muted sm">${esc(T('v24NotOwner', { e: U.sahip }))}</p>`;
    } else body = `<p class="muted">${T('syncBusy')}</p>`;
    return `<div class="card" id="v24mem"><h3>${icon('lock')} ${T('v24Members')}</h3>${body}<div class="row"><button class="btn sm ghost" data-v24="rules">${icon('lock')} ${T('v24Rules')}</button></div></div>`;
  }
  function confCardHtml() { return `<div class="card" id="v24conf"><h3>${icon('move')} ${T('v24Conflicts')}</h3><p class="muted sm">${T('v24ConflictsHelp')}</p><div id="v24confList" class="muted">…</div></div>`; }
  function viewCardHtml() {
    const th = ui().theme || 'dark';
    return `<div class="card" id="v24view"><h3>${icon('img')} ${T('v24Appearance')}</h3>
      <div class="row"><span>${T('v24Theme')}:</span><div class="seg">${[['dark', 'v24Dark'], ['light', 'v24Light'], ['auto', 'v24Auto']].map(([k, n]) => `<button class="${th === k ? 'on' : ''}" data-theme="${k}">${T(n)}</button>`).join('')}</div></div>
      <h4>${T('v24Keys')}</h4>${keysHtml()}
      <div class="row"><button class="btn sm ghost" data-v24="tour">${icon('help')} ${T('v24Tour')}</button></div></div>`;
  }
  function errCardHtml() {
    const on = ui().errRep !== false; const st = errState();
    return `<div class="card" id="v24err"><h3>${icon('bolt')} ${T('v24ErrRep')}</h3><p class="muted sm">${T('v24ErrRepHelp')}</p>
      <label class="chk"><input type="checkbox" id="v24errOn" ${on ? 'checked' : ''}> ${T('v24ErrRepOn')}</label>${st.total ? `<p class="muted sm">${T('v24ErrSent', { n: st.total })}</p>` : ''}</div>`;
  }
  function aboutCardHtml() {
    const signed = (window.UPD_KEYS || []).length > 0;
    const sh = window.Updater ? Updater.shell() : 0;
    return `<div class="card" id="v24about"><h3>${icon('help')} ${T('v24About')}</h3>
      <div class="v24about"><div class="logo">${document.querySelector('.brand .logo') ? document.querySelector('.brand .logo').innerHTML : ''}</div>
      <div><p><b>${T('appName')}</b><br>${T('version')} <b>v${esc(Platform.semver)}</b> · ${esc(Platform.kind)}${sh ? ` · ${T('v24Shell')} ${sh}` : ''}</p>
      <p class="muted sm">${T('v24Signed')}: ${signed ? `<span class="ok">${T('v24SignOn')}</span>` : T('v24SignOff')}</p>
      <p><a href="#" data-v24="rel">${icon('link')} ${T('v24Releases')}</a></p></div></div>
      <details class="adv"><summary>${T('v24License')}</summary><p>${T('v24LicenseTxt')}</p></details>
      <details class="adv"><summary>${T('v24Privacy')}</summary><p>${T('v24PrivacyTxt')}</p></details>
      <p class="muted sm">${T('dataSafe')}</p></div>`;
  }
  async function fillConflicts(root) {
    const box = $('#v24confList', root); if (!box || !window.Birlestir) return;
    const list = await Birlestir.conflicts();
    if (!list.length) { box.innerHTML = `<p class="ok">${icon('check')} ${T('v24NoConflicts')}</p>`; return; }
    const show = (v) => { try { const o = JSON.parse(v); return typeof o === 'string' ? o : JSON.stringify(o, null, 1); } catch (e) { return v; } };
    box.innerHTML = `<div class="v24clist">${list.slice(0, 60).map((c, i) => `<details class="v24c"><summary><span class="muted sm">${UI.fmtDate ? UI.fmtDate(c.t) : new Date(c.t).toLocaleString()}</span> <b>${esc(c.label || c.key)}</b> · <span dir="ltr">${esc(c.path || '')}</span>${c.kind === 'keptEdited' ? ` <span class="pill">${T('v24ConfKept')}</span>` : ''}</summary>
      <div class="grid2"><div><div class="muted sm">${T('v24Kept')}</div><pre dir="auto">${esc(show(c.kept)).slice(0, 2000)}</pre></div>${c.kind === 'conflict' ? `<div><div class="muted sm">${T('v24Lost')}</div><pre dir="auto">${esc(show(c.lost)).slice(0, 2000)}</pre><button class="btn sm" data-ccopy="${i}">${icon('copy')} ${T('v24Copy')}</button></div>` : ''}</div></details>`).join('')}</div>
      <div class="row"><button class="btn sm ghost danger" data-v24="confClear">${icon('trash')} ${T('v24ClearConf')}</button></div>`;
    $$('[data-ccopy]', box).forEach((b) => (b.onclick = async () => { try { await navigator.clipboard.writeText(show(list[+b.dataset.ccopy].lost)); toast(T('v24Copied')); } catch (e) {} }));
    const cc = $('[data-v24=confClear]', box); if (cc) cc.onclick = async () => { if (await confirmDlg(T('v24ClearConf') + '?')) { await Birlestir.clearConflicts(); fillConflicts(root); } };
  }
  function rulesModal() {
    const mm = modal(icon('lock') + ' ' + T('v24RulesTitle'), `<p class="muted sm">${T('v24RulesHelp')}</p><textarea rows="16" dir="ltr" class="full code" readonly>${esc(RULES)}</textarea>`,
      { wide: true, foot: `<button class="btn pri" id="v24rc">${icon('copy')} ${T('v24Copy')}</button>` });
    $('#v24rc', mm.el).onclick = async () => { try { await navigator.clipboard.writeText(RULES); toast(T('v24Copied')); } catch (e) { $('textarea', mm.el).select(); } };
  }
  function wireSettings(m) {
    $$('[data-theme]', m).forEach((b) => (b.onclick = () => { ui().theme = b.dataset.theme; Store.saveLocal(); applyTheme(); $$('[data-theme]', m).forEach((x) => x.classList.toggle('on', x === b)); }));
    const eo = $('#v24errOn', m); if (eo) eo.onchange = () => { ui().errRep = eo.checked; Store.saveLocal(); toast(T('saved')); };
    $$('[data-v24]', m).forEach((b) => (b.onclick = async (e) => {
      const a = b.dataset.v24; e.preventDefault();
      if (a === 'rules') rulesModal();
      if (a === 'tour') tour(true);
      if (a === 'rel') openUrl(RELEASES);
      if (a === 'memSave') { b.disabled = true; try { const n = await Sync.uyeKaydet($('#v24memList', m).value.split(/[\s,;]+/)); toast(T('v24MembersSaved', { n: n.length })); } catch (er) { toast(T('error') + ': ' + (er.code || er.message), 'err'); } b.disabled = false; }
    }));
    fillConflicts(m);
  }
  window.V24 = {
    settingsTop() { return membersCardHtml() + confCardHtml(); },
    settingsBottom() { return viewCardHtml() + errCardHtml() + aboutCardHtml(); },
    wireSettings,
    refreshMembers() { const el = document.getElementById('v24mem'); if (!el) return; const d = document.createElement('div'); d.innerHTML = membersCardHtml(); const n = d.firstElementChild; el.replaceWith(n); wireSettings(n); },
    reportError, applyTheme, tour, rulesModal,
  };
  if (window.Sync) Sync.onState(() => { if (R.page === 'settings') V24.refreshMembers(); });
  if (window.Birlestir) Birlestir.onConflict(() => { if (R.page === 'settings') fillConflicts(document); });

  /* ---------- panel: CEFR ilerlemesi ---------- */
  function cefrCard() {
    const st = Store.students(false, Store.prog);
    const lv = Store.levels().filter((l) => !l.off);
    if (!lv.length) return '';
    const rows = lv.map((l) => {
      let sum = 0, ach = 0;
      st.forEach((s) => { const ls = Store.levelStats(s, l); sum += ls.pct; if (Store.levelAchieved(s, l)) ach++; });
      const pct = st.length ? Math.round(sum / st.length) : 0;
      return `<div class="v24lv"><span class="v24lvn">${esc(tx(l.title))}</span><div class="bar"><i style="width:${pct}%"></i></div><b dir="ltr">${L() === 'tr' ? '%' + pct : pct + '%'}</b><span class="muted sm">${st.length ? esc(T('v24Achieved', { n: ach })) : ''}</span></div>`;
    }).join('');
    return `<div class="card" id="v24cefr"><h3>${icon('flag')} ${T('v24Cefr')}</h3><p class="muted sm">${T('v24CefrHelp')}</p>${st.length ? rows : `<p class="muted">${T('v24NoSt')}</p>`}</div>`;
  }
  afterRender.push(() => {
    if (R.page !== 'dashboard') return;
    const m = $('#main'); if (!m || $('#v24cefr', m)) return;
    const stats = $('.stats', m); if (!stats) return;
    stats.insertAdjacentHTML('afterend', cefrCard());
  });

  /* ---------- ilk açılış tanıtımı ---------- */
  function tour(force) {
    if (!force && (ui().tourDone || UI.modals.length || Object.keys(Store.db.students || {}).length)) return;
    const steps = [['v24TourT1', 'v24TourB1', 'plane'], ['v24TourT2', 'v24TourB2', 'users'], ['v24TourT3', 'v24TourB3', 'print'], ['v24TourT4', 'v24TourB4', 'cloud']];
    let i = 0;
    const mm = modal('', '', { cls: 'v24tour', foot: `<button class="btn ghost" id="v24skip">${T('v24Skip')}</button><span class="sp"></span><button class="btn" id="v24prev">${T('v24Prev')}</button><button class="btn pri" id="v24next">${T('v24Next')}</button>`, onClose: () => { ui().tourDone = true; Store.saveLocal(); } });
    const draw = () => {
      const [tt, bb, ic] = steps[i];
      $('.mt', mm.el).innerHTML = icon(ic) + ' ' + T(tt);
      $('.mb', mm.el).innerHTML = `<div class="v24step"><div class="v24ic">${icon(ic, 'big')}</div><p>${T(bb)}</p><div class="v24dots">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div></div>`;
      $('#v24prev', mm.el).disabled = i === 0;
      $('#v24next', mm.el).textContent = i === steps.length - 1 ? T('v24Done') : T('v24Next');
    };
    $('#v24skip', mm.el).onclick = () => mm.close();
    $('#v24prev', mm.el).onclick = () => { if (i > 0) { i--; draw(); } };
    $('#v24next', mm.el).onclick = () => { if (i < steps.length - 1) { i++; draw(); } else mm.close(); };
    draw();
  }

  applyTheme();
  setTimeout(() => { try { tour(false); } catch (e) {} }, 1500);
})();
