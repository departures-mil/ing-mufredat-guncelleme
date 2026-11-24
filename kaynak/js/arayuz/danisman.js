/* v2.5.0 — Danışman (yapay zeka)
   - Menüde "Danışman" sayfası ve üst çubukta ✦ düğmesi: İngilizce öğretimi, CEFR, ölçme-değerlendirme, ders planı,
     öğrenci durumu ve programın kullanımı hakkında soruları danışman gibi, programdaki gerçek verilere bakarak yanıtlar.
   - Çevrimiçi: kullanıcının KENDİ anahtarıyla Google Gemini (ücretsiz katman), OpenAI, Anthropic ya da OpenAI uyumlu
     herhangi bir sunucu (Groq, OpenRouter, bilgisayardaki Ollama / LM Studio). Anahtar yalnız bu cihazda durur, eşitlenmez.
   - Çevrimdışı: internet ya da anahtar yoksa önce bilgisayardaki yerel sunucu (Ollama/LM Studio), o da yoksa programın
     içindeki yerleşik danışman (müfredat, dil bilgisi kartları, sınav şemaları, sözlük ve öğrenci kayıtlarından üretir).
   - Sayım: Kullanim modülü AI isteklerini ve token'ları Ayarlar → Kullanım Limitleri kartında gösterir. */
(function () {
  /* Metinler kaynak/i18n/{tr,en,ar}.js içinde (ai* anahtarları). */

  /* Yardım bölümü (help.js değişmeden, en başa eklenir) */
  const HELP_EK = {
    tr: `<h3 id="ai">Danışman (yapay zeka)</h3>
<p>Menüdeki <b>Danışman</b> sayfası (üst çubuktaki ✦ düğmesi ya da Ctrl + J) İngilizce öğretimi, CEFR, ölçme-değerlendirme, ders planı ve öğrencileriniz hakkındaki sorularınızı uzman bir eğitim danışmanı gibi yanıtlar. Yanıtlar programdaki gerçek verilere (müfredat, sınıf durumu, seçtiğiniz öğrencinin eksik maddeleri ve değerlendirmeleri, sınav şemaları) dayanır; <b>Öğrenci bağlamı</b> alanından bir öğrenci seçerseniz o öğrenciye özel plan ister ve alırsınız.</p>
<ul><li><b>Çevrimiçi:</b> Ayarlar → Yapay zeka bölümüne kendi hesabınızın anahtarını girin. Google Gemini'nin ücretsiz katmanı çoğu kurum için yeterlidir ("Ücretsiz anahtar al" düğmesi). OpenAI, Anthropic ve OpenAI uyumlu sunucular (Groq, OpenRouter) da desteklenir. Anahtar yalnız bu cihazda durur; eşitlenmez ve yöneticiye gitmez. Kullanım, Ayarlar → Kullanım Limitleri kartında görünür.</li>
<li><b>Çevrimdışı:</b> internet ya da anahtar yoksa önce bilgisayarınızdaki yerel sunucu (Ollama / LM Studio; Ayarlar → Yapay zeka → Yerel sunucu) denenir, o da yoksa programın içindeki yerleşik danışman müfredat, dil bilgisi kartları, sınav şemaları, sözlük ve öğrenci kayıtlarından yanıt üretir. Bu yanıtlar daha kısa ve geneldir; başlığında "Yerleşik danışman" yazar.</li>
<li>Sohbetler yalnız bu cihazda saklanır. Yanıtı kopyalamak için üzerine gelip kopyala düğmesine basın; <b>Yeniden sor</b> son soruyu tekrar gönderir. Üslup (kısa / dengeli / ayrıntılı) ayarlardan seçilir.</li></ul>
`,
    en: `<h3 id="ai">Advisor (AI)</h3>
<p>The <b>Advisor</b> page in the menu (the ✦ button at the top or Ctrl + J) answers your questions about English teaching, CEFR, assessment, lesson plans and your students like an expert education consultant. Answers draw on the real data in the program (curriculum, class status, the selected student’s missing items and evaluations, exam schemes); choose a student in <b>Student context</b> to ask for and get a plan tailored to that student.</p>
<ul><li><b>Online:</b> enter your own account’s key in Settings → AI. The Google Gemini free tier is enough for most institutions (“Get a free key” button). OpenAI, Anthropic and OpenAI-compatible servers (Groq, OpenRouter) are supported too. The key stays only on this device; it is never synced or sent to the administrator. Usage appears in Settings → Usage limits.</li>
<li><b>Offline:</b> without internet or a key, the local server on your computer (Ollama / LM Studio; Settings → AI → Local server) is tried first, then the built-in advisor inside the program answers from the curriculum, grammar cards, exam schemes, dictionary and student records. Those answers are shorter and more general and are headed “Built-in advisor”.</li>
<li>Chats are kept only on this device. Hover an answer and press copy to copy it; <b>Ask again</b> resends the last question. The style (short / balanced / detailed) is chosen in Settings.</li></ul>
`,
    ar: `<h3 id="ai">المستشار (الذكاء الاصطناعي)</h3>
<p>تجيب صفحة <b>المستشار</b> في القائمة (زر ✦ في الشريط العلوي أو Ctrl + J) عن أسئلتك حول تدريس الإنجليزية ومستويات CEFR والتقييم وخطط الدروس وطلابك كمستشار تعليمي خبير. تعتمد الإجابات على البيانات الحقيقية في البرنامج (المنهج، حالة الصف، البنود الناقصة للطالب المختار وتقييماته، مخططات الامتحانات)؛ اختر طالباً في <b>سياق الطالب</b> لتطلب خطة خاصة به وتحصل عليها.</p>
<ul><li><b>متصل:</b> أدخل مفتاح حسابك الخاص في الإعدادات ← الذكاء الاصطناعي. الطبقة المجانية من Google Gemini تكفي معظم المؤسسات (زر «احصل على مفتاح مجاني»). تُدعم أيضاً OpenAI وAnthropic والخوادم المتوافقة مع OpenAI ‏(Groq وOpenRouter). يبقى المفتاح على هذا الجهاز فقط ولا يُزامَن ولا يُرسل إلى المسؤول. يظهر الاستخدام في الإعدادات ← حدود الاستخدام.</li>
<li><b>دون اتصال:</b> إن لم يتوفر إنترنت أو مفتاح يُجرَّب أولاً الخادم المحلي على حاسوبك (Ollama / LM Studio؛ الإعدادات ← الذكاء الاصطناعي ← خادم محلي)، ثم يجيب المستشار المدمج في البرنامج من المنهج وبطاقات القواعد ومخططات الامتحانات والقاموس وسجلات الطلاب. تلك الإجابات أقصر وأعمّ ويُكتب في عنوانها «المستشار المدمج».</li>
<li>تُحفظ المحادثات على هذا الجهاز فقط. مرّر فوق الإجابة واضغط «نسخ» لنسخها؛ <b>إعادة السؤال</b> تعيد إرسال آخر سؤال. يُختار الأسلوب (مختصر / متوازن / مفصّل) من الإعدادات.</li></ul>
`,
  };
  if (window.HELP) for (const l of Object.keys(HELP_EK)) if (HELP[l] && HELP[l].indexOf('id="ai"') < 0) HELP[l] = HELP_EK[l] + HELP[l];

  const { $, $$, esc, tx, toast, confirmDlg, go, PAGES, R } = UI;
  const IK = { spark: 'M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 12l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14zM5 14l.9 2.6 2.6.9-2.6.9L5 21l-.9-2.6-2.6-.9 2.6-.9L5 14z', send: 'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z' };
  const icon = (n, cls) => (IK[n] ? `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${IK[n]}"/></svg>` : UI.icon(n, cls));
  const L = () => UI.lang();
  const T = (k, p) => t(k, p);
  const PL = (s) => (window.plainText ? plainText(s) : s);

  /* ---------- ayarlar (yalnız bu cihaz) ---------- */
  const CFG_KEY = 'ingmufredat_ai_ayar_v1';
  const PROV = {
    gemini: { ad: 'Google Gemini', model: 'gemini-2.5-flash', anahtar: 'https://aistudio.google.com/apikey', ucretsiz: true },
    openai: { ad: 'OpenAI', model: 'gpt-4o-mini', anahtar: 'https://platform.openai.com/api-keys' },
    anthropic: { ad: 'Anthropic Claude', model: 'claude-sonnet-4-5', anahtar: 'https://console.anthropic.com/' },
    custom: { ad: '', model: 'llama-3.3-70b-versatile', url: 'https://api.groq.com/openai/v1', anahtar: 'https://console.groq.com/keys' },
    none: { ad: '' },
  };
  function cfgOku() {
    let c = {}; try { c = JSON.parse(localStorage.getItem(CFG_KEY) || '{}') || {}; } catch (e) {}
    return Object.assign({ provider: 'gemini', key: '', model: '', url: '', localUrl: 'http://127.0.0.1:11434/v1', localModel: '', style: 'normal', temp: 0.4 }, c);
  }
  function cfgYaz(c) {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch (e) {}
    // ortak çekirdek (Asistan Agent'ın çevrimiçi önerileri) aynı anahtarı kullanır
    try { if (window.FC && FC.storage) FC.storage.set('ai', c.key && ['gemini', 'openai', 'anthropic'].includes(c.provider) ? { provider: c.provider, key: c.key } : null); } catch (e) {}
  }
  const modelAdi = (c) => (c.model || (PROV[c.provider] || {}).model || '');

  /* ---------- sohbet kaydı (yalnız bu cihaz) ---------- */
  const SOH_KEY = 'ingmufredat_ai_sohbet_v1';
  let S = null;
  function sohbetler() { if (S) return S; try { S = JSON.parse(localStorage.getItem(SOH_KEY) || 'null'); } catch (e) {} if (!S || !Array.isArray(S.list)) S = { list: [], cur: null }; return S; }
  function sohbetYaz() { const s = sohbetler(); s.list = s.list.slice(0, 30); for (const c of s.list) if (c.msgs.length > 80) c.msgs = c.msgs.slice(-80); try { localStorage.setItem(SOH_KEY, JSON.stringify(s)); } catch (e) {} }
  function yeniSohbet() { const s = sohbetler(); const c = { id: 'c' + Date.now().toString(36), title: '', msgs: [], at: Date.now(), sid: null }; s.list.unshift(c); s.cur = c.id; sohbetYaz(); return c; }
  function curSohbet() { const s = sohbetler(); let c = s.list.find((x) => x.id === s.cur); if (!c) c = s.list[0] || yeniSohbet(); s.cur = c.id; return c; }

  /* ---------- bağlam: programdaki gerçek veriler ---------- */
  const kes = (s, n) => { s = PL(String(s == null ? '' : s)).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const LV = (l) => PL(tx(l.title));
  function mufredatOzeti() {
    const out = [];
    for (const l of Store.levels()) {
      if (l.off) continue;
      const mods = Store.actMods(l); let items = 0; for (const m of mods) items += Store.actItems(m).length;
      out.push(`- ${LV(l)} (${l.hours || 0} ${PL(t('hoursShort'))}; ${mods.length} ${PL(t('modules')).toLowerCase()}, ${items} ${PL(t('items')).toLowerCase()})${l.goal ? ': ' + kes(tx(l.goal), 140) : ''}`);
    }
    return out.join('\n');
  }
  function seviyeDetay(l, st) {
    const out = [];
    for (const m of Store.actMods(l, st)) {
      const its = Store.actItems(m, st);
      const eksik = st ? its.filter((it) => !Store.isDone(st, it.id)) : its;
      out.push(`  • ${kes(tx(m.title), 80)} (${its.length - eksik.length}/${its.length})` + (eksik.length ? ': ' + eksik.slice(0, 12).map((it) => kes(tx(it.text), 70)).join('; ') + (eksik.length > 12 ? ` … +${eksik.length - 12}` : '') : ''));
    }
    return out.join('\n');
  }
  function ogrenciSatiri(st) {
    const rk = Store.rankOf(st); const ov = Store.overall(st);
    const lvls = Store.levels().filter((l) => !l.off && !Store.lvOff(st, l));
    const cur = lvls.find((l) => Store.levelStatus(st, l) !== 'achieved');
    return `- ${PL(st.name)}${st.no ? ' (#' + st.no + ')' : ''}: ${PL(t('overall'))} ${ov}%, ${PL(t('rank'))}: ${(rk && PL(tx(rk.name))) || '-'}, ${PL(t('aiBiLevelAt'))}: ${cur ? LV(cur) + ' ' + Store.levelStats(st, cur).pct + '%' : PL(t('completed'))}`;
  }
  function sinifOzeti() {
    const st = Store.students(false, Store.prog);
    if (!st.length) return PL(t('aiBiNoStudents'));
    const avg = Math.round(st.reduce((a, s) => a + Store.overall(s), 0) / st.length);
    const lines = [`${PL(t('aiBiActive'))}: ${st.length}; ${PL(t('aiBiAvg'))}: ${avg}%`];
    const sorted = st.slice().sort((a, b) => Store.overall(b) - Store.overall(a));
    sorted.slice(0, 25).forEach((s) => lines.push(ogrenciSatiri(s)));
    if (sorted.length > 25) lines.push(`… +${sorted.length - 25}`);
    // seviye bazında ortalama
    const lv = Store.levels().filter((l) => !l.off);
    lines.push(PL(t('krCefr')) + ': ' + lv.map((l) => `${LV(l)} ${Math.round(st.reduce((a, s) => a + Store.levelStats(s, l).pct, 0) / st.length)}%`).join(' | '));
    return lines.join('\n');
  }
  function ogrenciDetay(st) {
    const lines = [ogrenciSatiri(st)];
    if (st.start) lines.push(`${PL(t('startDate'))}: ${st.start}`);
    if (st.background) lines.push(`${PL(t('background'))}: ${kes(st.background, 300)}`);
    const lvls = Store.levels().filter((l) => !l.off && !Store.lvOff(st, l));
    for (const l of lvls) {
      const s = Store.levelStats(st, l); const ev = st.evals[l.id] || {}; const stat = Store.levelStatus(st, l);
      lines.push(`${LV(l)}: ${s.done}/${s.total} (${s.pct}%) — ${PL(t(stat))}${ev.result ? `; ${PL(t('levelEval'))}: ${PL(t(ev.result === 'pass' ? 'passed' : 'failed'))}${ev.score != null && ev.score !== '' ? ' ' + ev.score : ''}` : ''}`);
      if (stat !== 'achieved' && s.done < s.total) { lines.push(seviyeDetay(l, st).split('\n').slice(0, 10).join('\n')); break; }
    }
    const j = (st.journal || []).slice(0, 5);
    if (j.length) lines.push(PL(t('journal')) + ':\n' + j.map((e) => `  ${e.date || ''}${e.minutes ? ' (' + e.minutes + ' dk)' : ''}: ${kes(e.text || e.note || '', 160)}`).join('\n'));
    return lines.join('\n');
  }
  function sinavOzeti(st) {
    try {
      const E = (Store.db.exams && Store.db.exams.schemes) || (window.DEFAULT_EXAMS && DEFAULT_EXAMS.schemes); if (!E) return '';
      const lvls = Store.levels().filter((l) => !l.off);
      const cur = st ? lvls.find((l) => Store.levelStatus(st, l) !== 'achieved') : null;
      const ids = cur ? [cur.id] : Object.keys(E).slice(0, 7);
      return ids.filter((id) => E[id]).map((id) => { const s = E[id]; const l = Store.findLevel(id); return `${l ? LV(l) : id}: ${PL(t('passScore'))} ${s.passTotal}% (final ${s.passFinal}%) — ` + (s.comps || []).map((c) => `${kes(tx(c.name), 40)} %${c.weight}`).join(', '); }).join('\n');
    } catch (e) { return ''; }
  }
  function sistemMetni(sid) {
    const c = cfgOku(); const l = L(); const I = Store.db.config.institution; const sc = Store.db.config.scoring;
    const st = sid ? Store.db.students[sid] : null;
    const dilAdi = { tr: 'Türkçe', en: 'English', ar: 'العربية' }[l];
    const uslup = c.style === 'short' ? { tr: 'Kısa ve öz yanıt ver (en fazla 8–10 cümle ya da kısa bir liste).', en: 'Answer briefly (at most 8–10 sentences or a short list).', ar: 'أجب باختصار (10 جمل على الأكثر أو قائمة قصيرة).' }[l]
      : c.style === 'long' ? { tr: 'Ayrıntılı, adım adım ve örnekli yanıt ver; uygun yerde başlık ve tablo kullan.', en: 'Answer in detail, step by step, with examples; use headings and tables where useful.', ar: 'أجب بالتفصيل خطوة بخطوة مع أمثلة؛ استخدم العناوين والجداول عند الحاجة.' }[l]
        : { tr: 'Dengeli uzunlukta, net ve uygulanabilir yanıt ver.', en: 'Give a clear, practical answer of moderate length.', ar: 'أجب إجابة واضحة وعملية بطول معتدل.' }[l];
    const rol = {
      tr: `Sen "İngilizce Müfredat Sistemi" programının içinde çalışan uzman bir eğitim danışmanısın: İngilizce öğretimi (ELT), CEFR (Pre-A1–C2), ölçme-değerlendirme, ders planlama, sınıf yönetimi ve öğrenci takibi konularında deneyimli bir akademik koordinatör gibi davran. Yanıtlarını ${dilAdi} dilinde ver (İngilizce örnek cümleler İngilizce kalır). Aşağıdaki PROGRAM VERİLERİ gerçektir; sorular öğrenci ya da sınıfla ilgiliyse bu verilere dayan, veri yoksa uydurma, eksik bilgiyi açıkça söyle. Somut, uygulanabilir ve gerekçeli öneriler ver; pedagojik ilkeleri kısaca açıkla. Programın kendisi sorulursa KULLANIM BİLGİSİ bölümünü kullan. ${uslup}`,
      en: `You are an expert education consultant working inside the "English Curriculum System" program: act like an experienced academic coordinator in English language teaching (ELT), CEFR (Pre-A1–C2), assessment, lesson planning, classroom management and student tracking. Answer in ${dilAdi} (English example sentences stay in English). The PROGRAM DATA below is real; when a question concerns a student or the class, base the answer on it, never invent data, and say clearly when information is missing. Give concrete, actionable, well-reasoned advice and briefly explain the pedagogical principles. For questions about the program itself use the USAGE NOTES section. ${uslup}`,
      ar: `أنت مستشار تعليمي خبير يعمل داخل برنامج "نظام منهج اللغة الإنجليزية": تصرّف كمنسق أكاديمي متمرس في تدريس الإنجليزية (ELT) ومستويات CEFR (Pre-A1–C2) والتقييم وتخطيط الدروس وإدارة الصف ومتابعة الطلاب. أجب باللغة ${dilAdi} (تبقى الجمل الإنجليزية النموذجية بالإنجليزية). بيانات البرنامج أدناه حقيقية؛ إذا تعلّق السؤال بطالب أو بالصف فاعتمد عليها، ولا تختلق بيانات، وبيّن بوضوح ما ينقص. قدّم نصائح ملموسة وقابلة للتطبيق ومعلّلة واشرح المبادئ التربوية باختصار. عند السؤال عن البرنامج نفسه استخدم قسم ملاحظات الاستخدام. ${uslup}`,
    }[l];
    const bas = { tr: ['PROGRAM VERİLERİ', 'Kurum', 'Eğitim programı', 'Puanlama', 'Müfredat (seviyeler)', 'Sınıf', 'Seçili öğrenci', 'Sınav şemaları', 'KULLANIM BİLGİSİ'], en: ['PROGRAM DATA', 'Institution', 'Programme', 'Scoring', 'Curriculum (levels)', 'Class', 'Selected student', 'Exam schemes', 'USAGE NOTES'], ar: ['بيانات البرنامج', 'المؤسسة', 'البرنامج التدريبي', 'التقدير', 'المنهج (المستويات)', 'الصف', 'الطالب المختار', 'مخططات الامتحانات', 'ملاحظات الاستخدام'] }[l];
    const kullanim = {
      tr: 'Menü: Panel, Müfredat (seviye/modül/madde düzenleme), Öğrenciler, Değerlendirme (madde işaretleme: Biliyor / Çalıştık, yoklama modu, seviye sonu değerlendirmesi), Ortak Ders Programı, Sınavlar (sınav kâğıtları), Dil bilgisi (kartlar), Sözlük, Kelime, Çıktılar (kontrol listesi, öğrenci raporu, sertifika, sınıf özeti; PDF/DOCX, antetli şablon), Ayarlar (dil, kurum, puanlama, unvanlar, eşitleme — kurumun kendi Firebase hesabı, yedekleme, yapay zeka, kullanım limitleri, admin ile iletişim), Yardım. Güncelleme: sağ üstteki düğme, tek tıkla; kayıtlar korunur. Eşitleme: masaüstü ve telefon aynı Firebase projesi + kurum koduyla; internetsiz aynı modem üzerinden eşitleme kabuk v3 ile.',
      en: 'Menu: Dashboard, Curriculum (edit levels/modules/items), Students, Assessment (mark items Known / Studied, quick check mode, end-of-level evaluation), Joint Lesson Plan, Exams (exam papers), Grammar (cards), Dictionary, Vocabulary, Printouts (checklist, student report, certificate, class summary; PDF/DOCX, letterhead templates), Settings (language, institution, scoring, ranks, sync — the institution’s own Firebase account, backup, AI, usage limits, contact the administrator), Help. Updates: the button at the top right, one click; records are kept. Sync: desktop and phone with the same Firebase project + workspace code; offline sync over the same router with shell v3.',
      ar: 'القائمة: اللوحة، المنهج (تحرير المستويات/الوحدات/البنود)، الطلاب، التقييم (تعليم البنود: يعرف / درسنا، وضع التحقق السريع، تقييم نهاية المستوى)، البرنامج الدراسي المشترك، الامتحانات (أوراق الامتحان)، القواعد (بطاقات)، القاموس، المفردات، المطبوعات (قائمة التحقق، تقرير الطالب، الشهادة، ملخص الصف؛ PDF/DOCX، قوالب ورق المؤسسة)، الإعدادات (اللغة، المؤسسة، التقدير، الألقاب، المزامنة بحساب Firebase الخاص بالمؤسسة، النسخ الاحتياطي، الذكاء الاصطناعي، حدود الاستخدام، التواصل مع المسؤول)، المساعدة. التحديث: الزر أعلى اليمين بنقرة واحدة مع الحفاظ على السجلات. المزامنة: الحاسوب والهاتف بمشروع Firebase ورمز مؤسسة واحد؛ مزامنة دون إنترنت عبر الموجّه نفسه مع الغلاف v3.',
    }[l];
    const parts = [rol, '', `=== ${bas[0]} ===`, `${bas[1]}: ${PL(I.name) || '-'}${I.instructor ? ' / ' + PL(t('defaultInstructor')) + ': ' + PL(I.instructor) : ''}`,
      `${bas[2]}: ${PL(tx(Store.cur().title))} (${PL(t('prog_' + Store.prog))})`,
      `${bas[3]}: ${PL(t('passPct'))} ${sc.passPct}%; ${PL(t('passScore'))} ${sc.passScore}; ${PL(t('requireExam'))}: ${sc.requireExam ? PL(t('yes')) : PL(t('no'))}`,
      `${bas[4]}:\n${mufredatOzeti()}`, `${bas[5]}:\n${sinifOzeti()}`];
    if (st) parts.push(`${bas[6]}:\n${ogrenciDetay(st)}`);
    const ex = sinavOzeti(st); if (ex) parts.push(`${bas[7]}:\n${ex}`);
    parts.push(`=== ${bas[8]} ===\n${kullanim}`);
    return parts.join('\n').slice(0, 14000);
  }

  /* ---------- sağlayıcılar ---------- */
  const BILINEN = /generativelanguage\.googleapis\.com|api\.openai\.com|api\.anthropic\.com|api\.groq\.com|openrouter\.ai/;
  function hataMetni(status, txt) {
    let m = ''; try { const j = JSON.parse(txt); m = (j.error && (j.error.message || j.error.type)) || j.message || ''; } catch (e) {}
    return (status ? 'HTTP ' + status + ' ' : '') + (m || kes(txt, 160));
  }
  const kotaMi = (status, txt) => status === 429 || /quota|rate.?limit|insufficient_quota|RESOURCE_EXHAUSTED|credit/i.test(txt || '');
  async function sseOku(res, herParca) {
    const rd = res.body && res.body.getReader ? res.body.getReader() : null;
    if (!rd) throw new Error('nostream');
    const dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { value, done } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1); if (line.startsWith('data:')) { const d = line.slice(5).trim(); if (d && d !== '[DONE]') { try { herParca(JSON.parse(d)); } catch (e) {} } } }
    }
    if (buf.trim().startsWith('data:')) { try { herParca(JSON.parse(buf.trim().slice(5))); } catch (e) {} }
  }
  async function istek(url, headers, body, ctrl, akis, parcaCoz, tamCoz) {
    const res = await fetch(url, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, headers), body: JSON.stringify(body), signal: ctrl.signal });
    if (!res.ok) { const txt = await res.text(); const e = new Error(hataMetni(res.status, txt)); e.kota = kotaMi(res.status, txt); e.status = res.status; throw e; }
    const ct = res.headers.get('content-type') || '';
    let out = '', tok = 0;
    if (/event-stream/.test(ct)) {
      await sseOku(res, (j) => { const r = parcaCoz(j); if (r.text) { out += r.text; akis(out); } if (r.tok) tok = r.tok; });
    } else {
      const j = await res.json(); const r = tamCoz(j); out = r.text || ''; tok = r.tok || 0; akis(out);
    }
    if (tok && window.Kullanim) Kullanim.ekle({ aiToken: tok });
    if (!BILINEN.test(url) && window.Kullanim) Kullanim.say('aiIstek');
    return out;
  }
  function openaiUyumlu(base, key, model, sys, msgs, temp, ctrl, akis) {
    const url = base.replace(/\/+$/, '') + '/chat/completions';
    const h = key ? { Authorization: 'Bearer ' + key } : {};
    const body = { model, messages: [{ role: 'system', content: sys }].concat(msgs.map((m) => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.c }))), temperature: temp, stream: true, stream_options: { include_usage: true } };
    const coz = (j) => { const c = j.choices && j.choices[0]; const u = j.usage; return { text: c ? (c.delta ? c.delta.content : c.message && c.message.content) || '' : '', tok: u ? (+u.total_tokens || 0) : 0 }; };
    return istek(url, h, body, ctrl, akis, coz, coz).catch((e) => {
      if (/stream_options|unknown|unrecognized/i.test(e.message || '') && body.stream_options) { delete body.stream_options; return istek(url, h, body, ctrl, akis, coz, coz); }
      throw e;
    });
  }
  function anthropic(key, model, sys, msgs, temp, ctrl, akis) {
    const h = { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    const body = { model, system: sys, max_tokens: 2048, temperature: temp, stream: true, messages: msgs.map((m) => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.c })) };
    let tok = 0;
    const parca = (j) => { if (j.type === 'content_block_delta' && j.delta && j.delta.text) return { text: j.delta.text }; if (j.type === 'message_start' && j.message && j.message.usage) tok += +j.message.usage.input_tokens || 0; if (j.type === 'message_delta' && j.usage) { tok += +j.usage.output_tokens || 0; return { tok }; } return {}; };
    const tam = (j) => ({ text: (j.content || []).map((x) => x.text || '').join(''), tok: j.usage ? (+j.usage.input_tokens || 0) + (+j.usage.output_tokens || 0) : 0 });
    return istek('https://api.anthropic.com/v1/messages', h, body, ctrl, akis, parca, tam);
  }
  function gemini(key, model, sys, msgs, temp, ctrl, akis) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':streamGenerateContent?alt=sse&key=' + encodeURIComponent(key);
    const body = { systemInstruction: { parts: [{ text: sys }] }, contents: msgs.map((m) => ({ role: m.r === 'u' ? 'user' : 'model', parts: [{ text: m.c }] })), generationConfig: { temperature: temp, maxOutputTokens: 4096 } };
    const coz = (j) => { const c = j.candidates && j.candidates[0]; const text = c && c.content && c.content.parts ? c.content.parts.map((p) => p.text || '').join('') : ''; return { text, tok: j.usageMetadata ? +j.usageMetadata.totalTokenCount || 0 : 0 }; };
    const tam = (j) => { if (Array.isArray(j)) { let text = '', tok = 0; j.forEach((x) => { const r = coz(x); text += r.text; if (r.tok) tok = r.tok; }); return { text, tok }; } return coz(j); };
    return istek(url, {}, body, ctrl, akis, coz, tam);
  }
  function cevrimici(c, sys, msgs, ctrl, akis) {
    const temp = Math.max(0, Math.min(1, +c.temp || 0.4)); const model = modelAdi(c);
    if (c.provider === 'gemini') return gemini(c.key, model, sys, msgs, temp, ctrl, akis);
    if (c.provider === 'anthropic') return anthropic(c.key, model, sys, msgs, temp, ctrl, akis);
    if (c.provider === 'openai') return openaiUyumlu('https://api.openai.com/v1', c.key, model, sys, msgs, temp, ctrl, akis);
    if (c.provider === 'custom') return openaiUyumlu(c.url || PROV.custom.url, c.key, model, sys, msgs, temp, ctrl, akis);
    return Promise.reject(new Error('none'));
  }
  async function yerel(c, sys, msgs, ctrl, akis) {
    if (!c.localUrl || !c.localModel) throw new Error('nolocal');
    const ctrl2 = new AbortController(); const tm = setTimeout(() => ctrl2.abort(), 60000); ctrl.signal.addEventListener('abort', () => ctrl2.abort());
    try { return await openaiUyumlu(c.localUrl, '', c.localModel, sys, msgs, +c.temp || 0.4, ctrl2, akis); } finally { clearTimeout(tm); }
  }

  /* ---------- yerleşik çevrimdışı danışman ---------- */
  const norm = (s) => PL(String(s || '')).toLowerCase().replace(/[İI]/g, 'i').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const STOP = new Set('ve veya ile için bir bu şu o da de mi mı mu mü nasıl ne neden hangi kaç the a an of to in for on and or is are how what which why do does can should with about my this that your için hakkında ما ماذا كيف لماذا في من على عن هل أي هذا هذه'.split(' '));
  const kok = (w) => { w = w.replace(/^(ال|و|ب|ل|ف)(?=.{3})/, ''); return w.length > 5 ? w.slice(0, 5) : w; };   // kaba kök: raporunu → rapor, present → prese
  const kelimeler = (s) => { const out = []; for (const w of norm(s).split(' ')) { if (w.length > 2 && !STOP.has(w)) { const k = kok(w); if (!out.includes(k)) out.push(k); } } return out; };
  function puan(q, metin) { const m = norm(metin); let p = 0; for (const w of q) if (m.includes(w)) p += w.length >= 5 ? 2 : 1; return p; }
  function ayrik(q, metin) { const m = norm(metin); let n = 0; for (const w of q) if (m.includes(w)) n++; return n; }
  function ogrenciBul(soru) {
    const q = norm(soru); let best = null, bp = 0;
    for (const st of Store.students(true, 'all')) {
      const parts = norm(st.name).split(' ').filter((x) => x.length > 2); if (!parts.length) continue;
      const hit = parts.filter((p) => q.includes(p)).length; const p = hit / parts.length;
      if (hit && p > bp) { bp = p; best = st; }
    }
    return bp >= 0.5 ? best : null;
  }
  function seviyeBul(soru) { const m = norm(soru).match(/\b(pre ?a1|a1|a2|b1|b2|c1|c2)\b/); if (!m) return null; const k = m[1].replace(/\s/, '').toUpperCase(); return Store.levels().find((l) => norm(tx(l.title)).toUpperCase().replace(/\s/g, '').includes(k) || (l.cefr && String(l.cefr).toUpperCase() === k)) || null; }
  function yerlesik(soru, sid) {
    const l = L(); const q = kelimeler(soru); const out = []; const H = (k) => '### ' + PL(t(k)) + '\n';
    const st = (sid && Store.db.students[sid]) || ogrenciBul(soru);
    const yardimMi = /nasil|how|كيف|yazdir|print|طباع|esitle|sync|مزامن|guncelle|update|تحديث|yedek|backup|نسخ|sablon|template|قالب|firebase|rapor|report|تقرير|sertifika|certificate|شهادة|program|برنامج|ayar|setting|إعداد|anahtar|key|مفتاح/.test(norm(soru));
    const sinifMi = !yardimMi && /sinif|class|ogrenci|student|طلاب|الصف|durum|status|ilerleme|progress|genel|overall|kim|who|en (iyi|dusuk|zayif)|weak|strong/.test(norm(soru));
    if (st) {
      out.push(H('aiBiStudent') + ogrenciDetay(st).split('\n').map((x) => x.startsWith('  •') ? x : x.startsWith('-') ? x : '- ' + x).join('\n'));
      out.push(H('aiBiPlan') + ['aiBiPlan1', 'aiBiPlan2', 'aiBiPlan3'].map((k, i) => `${i + 1}. ${PL(t(k))}`).join('\n'));
    } else if (sinifMi) {
      const sts = Store.students(false, Store.prog);
      if (sts.length) {
        const sorted = sts.slice().sort((a, b) => Store.overall(b) - Store.overall(a));
        out.push(H('aiBiStudents') + sinifOzeti().split('\n')[0] + '\n' + `- ${PL(t('aiBiStrong'))}: ${sorted.slice(0, 3).map((s) => PL(s.name) + ' ' + Store.overall(s) + '%').join(', ')}\n- ${PL(t('aiBiWeak'))}: ${sorted.slice(-3).reverse().map((s) => PL(s.name) + ' ' + Store.overall(s) + '%').join(', ')}\n` + sinifOzeti().split('\n').slice(-1)[0]);
        out.push(H('aiBiPlan') + ['aiBiPlan1', 'aiBiPlan2', 'aiBiPlan3'].map((k, i) => `${i + 1}. ${PL(t(k))}`).join('\n'));
      } else out.push(H('aiBiStudents') + PL(t('aiBiNoStudents')));
    }
    // dil bilgisi kartları
    if (window.GRAMMAR) {
      const G = GRAMMAR; const hits = [];
      const qn = norm(soru);
      for (const tn of G.tenses || []) { let p = puan(q, tn.name + ' ' + tn.form + ' ' + PL(tx(tn.use)) + ' ' + tn.sig); if (qn.includes(norm(tn.name))) p += 10; if (p >= 3) hits.push([p, `**${tn.name}** (${tn.lvl})\n- ${tn.form}\n- ${PL(tx(tn.use))}\n- ✓ ${tn.pos}  ✗ ${tn.neg}  ? ${tn.q}\n- ${tn.sig}`]); }
      for (const k of G.order || []) { const c = G.cards[k]; if (!c || k === 'tenses' || c.kind) continue; const rules = c.rules || []; const body = PL(tx(c.title)) + ' ' + rules.map((r) => PL(tx(r.rule)) + ' ' + (r.ex || '')).join(' ') + ' ' + (c.intro ? PL(tx(c.intro)) : ''); const p = puan(q, body); if (p >= 3) hits.push([p, `**${PL(tx(c.title))}** (${c.lvl || ''})` + (c.intro ? '\n' + kes(tx(c.intro), 300) : '') + rules.slice(0, 8).map((r) => '\n- ' + PL(tx(r.rule)) + (r.ex ? ' — _' + r.ex + '_' : '')).join('')]); }
      hits.sort((a, b) => b[0] - a[0]);
      if (hits.length) { let take = hits.filter((h) => h[0] >= 10); if (!take.length) take = hits.slice(0, 2); out.push(H('aiBiGrammar') + take.slice(0, 4).map((h) => h[1]).join('\n\n')); }
    }
    // müfredat maddeleri
    { const lvl = seviyeBul(soru); const hits = [];
      if (!st || lvl) for (const lv of Store.levels()) { if (lv.off) continue; if (lvl && lv !== lvl) continue; for (const m of Store.actMods(lv)) for (const it of Store.actItems(m)) { const mt = PL(tx(it.text)) + ' ' + PL(tx(m.title)); const p = puan(q, mt); const n = ayrik(q, mt); if (lvl ? p >= 1 : (n >= 2 || (n === 1 && q.length === 1 && p >= 2))) hits.push([p, `- ${LV(lv)} › ${kes(tx(m.title), 50)} › ${kes(tx(it.text), 110)}`]); } }
      hits.sort((a, b) => b[0] - a[0]);
      if (hits.length) out.push(H('aiBiCurr') + hits.slice(0, 10).map((h) => h[1]).join('\n'));
      else if (lvl) out.push(H('aiBiCurr') + `**${LV(lvl)}**${lvl.goal ? ' — ' + PL(tx(lvl.goal)) : ''}\n` + seviyeDetay(lvl, null).split('\n').slice(0, 10).join('\n'));
    }
    // sınav şeması
    if (/sinav|exam|test|gecme|pass|notu|score|امتحان|اختبار|نجاح|degerlendirme|assessment|تقييم/.test(norm(soru))) { const ex = sinavOzeti(st || null); if (ex) out.push(H('aiBiExam') + ex.split('\n').map((x) => '- ' + x).join('\n')); }
    // sözlük
    if (window.DEFAULT_DICT && q.length <= 3) { const w = norm(soru).split(' ').find((x) => /^[a-z]+$/.test(x) && x.length > 1); const list = (Store.db.dict && Store.db.dict.list) || DEFAULT_DICT.list || []; const d = w && list.find((x) => x.w === w); if (d) out.push(H('aiBiDict') + `**${d.w}** ${d.ipa ? '/' + d.ipa + '/' : ''} (${d.pos}, ${d.lvl})\n- ${d.def || ''}${d.tr ? '\n- TR: ' + d.tr : ''}${d.ar ? '\n- AR: ' + d.ar : ''}${d.ex ? '\n- ' + d.ex : ''}`); }
    // yardım
    if (window.HELP && yardimMi) {
      const bolumler = (html) => html.split(/<h3[^>]*>/).slice(1).map((s) => { const i = s.indexOf('</h3>'); return { title: s.slice(0, i).replace(/<[^>]+>/g, ''), body: s.slice(i + 5).replace(/<li>/g, '\n- ').replace(/<\/p>|<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim() }; });
      let hits = [];
      for (const hl of [l, 'en', 'tr']) { if (!HELP[hl]) continue; hits = bolumler(HELP[hl]).map((s) => [puan(q, s.title) * 3 + ayrik(q, s.title + ' ' + s.body) * 4 + Math.min(6, puan(q, s.body)), s]).filter((x) => x[0] >= 3).sort((a, b) => b[0] - a[0]); if (hits.length) break; }
      if (hits.length) out.push(H('aiBiHelp') + hits.slice(0, 2).map((h) => `**${h[1].title}**\n${kes(h[1].body, 900)}`).join('\n\n'));
    }
    return out.length ? out.join('\n\n') : PL(t('aiBiNoMatch'));
  }

  /* ---------- soru akışı ---------- */
  let aktif = null;
  async function sor(c, soru, sid, ui) {
    const cfg = cfgOku();
    const msgs = c.msgs.filter((m) => !m.err).slice(-16).map((m) => ({ r: m.r, c: m.c }));
    msgs.push({ r: 'u', c: soru });
    c.msgs.push({ r: 'u', c: soru, t: Date.now() });
    const a = { r: 'a', c: '', t: Date.now(), src: 'online', model: modelAdi(cfg) }; c.msgs.push(a);
    if (!c.title) c.title = kes(soru, 48);
    sohbetYaz(); ui.ciz(true);
    const ctrl = new AbortController(); aktif = ctrl;
    const akis = (txt) => { a.c = txt; ui.guncelle(a); };
    const sys = sistemMetni(sid);
    const cevrimiciVar = cfg.provider !== 'none' && (cfg.provider === 'custom' ? !!(cfg.url || PROV.custom.url) : !!cfg.key);
    let not = '';
    try {
      if (navigator.onLine !== false && cevrimiciVar) {
        try { a.c = await cevrimici(cfg, sys, msgs, ctrl, akis); }
        catch (e) {
          if (ctrl.signal.aborted) throw e;
          console.warn('AI online', e);
          if (e.kota) { not = PL(t('aiQuota')); if (window.Kullanim) Kullanim.kotaDoldu('ai'); }
          else if (e.status && e.status !== 0 && !/Failed to fetch|NetworkError|load failed/i.test(e.message)) throw e; // anahtar/model hatası: kullanıcıya göster
          a.c = ''; await yerelYaDaYerlesik(cfg, sys, msgs, ctrl, akis, a, soru, sid);
        }
      } else {
        if (navigator.onLine !== false && !cevrimiciVar) not = PL(t('aiNoKey'));
        await yerelYaDaYerlesik(cfg, sys, msgs, ctrl, akis, a, soru, sid);
      }
    } catch (e) {
      if (ctrl.signal.aborted) { if (!a.c) a.c = '⏹'; }
      else { a.err = true; a.c = PL(t('aiErr', { e: e.message || String(e) })); toast(a.c, 'err'); }
    }
    if (not) a.not = not;
    if (!a.c.trim()) a.c = PL(t('aiBiNoMatch'));
    aktif = null; c.at = Date.now(); sohbetYaz(); ui.ciz(false);
  }
  async function yerelYaDaYerlesik(cfg, sys, msgs, ctrl, akis, a, soru, sid) {
    if (cfg.localUrl && cfg.localModel) { try { a.src = 'local'; a.model = cfg.localModel; a.c = await yerel(cfg, sys, msgs, ctrl, akis); return; } catch (e) { if (ctrl.signal.aborted) throw e; console.warn('AI local', e); a.c = ''; } }
    a.src = 'builtin'; a.model = ''; a.c = yerlesik(soru, sid); akis(a.c);
  }

  /* ---------- markdown (küçük) ---------- */
  function mdHtml(s) {
    const E = (x) => esc(x);
    const inline = (x) => E(x).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const lines = String(s || '').replace(/\r/g, '').split('\n'); const out = []; let i = 0;
    while (i < lines.length) {
      let ln = lines[i];
      if (/^```/.test(ln)) { const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out.push('<pre>' + E(buf.join('\n')) + '</pre>'); continue; }
      if (/^\s*\|.*\|\s*$/.test(ln)) { const rows = []; while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { const r = lines[i].trim().slice(1, -1).split('|').map((x) => x.trim()); if (!r.every((x) => /^:?-{2,}:?$/.test(x))) rows.push(r); i++; } out.push('<table class="tbl mdt">' + rows.map((r, k) => '<tr>' + r.map((c) => (k ? '<td>' : '<th>') + inline(c) + (k ? '</td>' : '</th>')).join('') + '</tr>').join('') + '</table>'); continue; }
      const h = ln.match(/^(#{1,4})\s+(.*)/); if (h) { out.push(`<h${h[1].length + 2}>${inline(h[2])}</h${h[1].length + 2}>`); i++; continue; }
      if (/^\s*([-*•]|\d+[.)])\s+/.test(ln)) { const ord = /^\s*\d+[.)]/.test(ln); const items = []; while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, '')); i++; while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) items[items.length - 1] += ' ' + lines[i++].trim(); } out.push((ord ? '<ol>' : '<ul>') + items.map((x) => '<li>' + inline(x) + '</li>').join('') + (ord ? '</ol>' : '</ul>')); continue; }
      if (!ln.trim()) { i++; continue; }
      const para = []; while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*([-*•]|\d+[.)])\s+|\s*\|)/.test(lines[i])) para.push(lines[i++]);
      out.push('<p>' + inline(para.join('\n')).replace(/\n/g, '<br>') + '</p>');
    }
    return out.join('');
  }

  /* ---------- sayfa ---------- */
  PAGES.ai = (m, r) => {
    const c = curSohbet(); if (r && r.sid && c.msgs.length === 0) c.sid = r.sid;
    const sts = Store.students(false, Store.prog);
    const cfg = cfgOku();
    const kaynakAd = cfg.provider === 'none' || !(cfg.provider === 'custom' ? (cfg.url || PROV.custom.url) : cfg.key) ? (cfg.localModel ? PL(t('aiLocal')) : PL(t('aiBuiltin'))) : (PROV[cfg.provider].ad || cfg.url || 'API') + ' · ' + modelAdi(cfg);
    m.innerHTML = `<div class="ai-wrap">
      <aside class="ai-side card">
        <button class="btn pri full" id="aiNew">${icon('plus')} ${t('aiNew')}</button>
        <h4>${t('aiConvs')}</h4><div class="ai-convs" id="aiConvs"></div>
        <button class="btn ghost sm danger" id="aiClear">${icon('trash')} ${t('aiClear')}</button>
      </aside>
      <section class="ai-main card">
        <div class="ai-head"><div><h2 class="ph">${icon('spark')} ${t('aiTitle')}</h2><p class="muted sm">${t('aiSub')}</p></div><span class="pill ai-src" id="aiSrc" title="${t('aiProvider')}">${esc(kaynakAd)}</span><button class="ib" id="aiSet" title="${t('aiSettings')}">${icon('gear')}</button></div>
        <label class="fl ai-st"><span>${t('aiStudentCtx')}</span><select id="aiSid"><option value="">${t('aiNoStudent')}</option>${sts.map((s) => `<option value="${s.id}" ${c.sid === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
        <div class="ai-msgs" id="aiMsgs"></div>
        <div class="ai-sug" id="aiSug"></div>
        <form class="ai-form" id="aiForm"><textarea id="aiIn" rows="2" placeholder="${esc(t('aiPh'))}"></textarea><button class="btn pri" id="aiSend" type="submit">${icon('send')} ${t('aiSend')}</button><button class="btn danger" id="aiStop" type="button" style="display:none">${icon('x')} ${t('aiStop')}</button></form>
      </section></div>`;
    const box = $('#aiMsgs', m); const inp = $('#aiIn', m);
    const ui = {
      ciz(scroll) {
        const cc = curSohbet();
        $('#aiConvs', m).innerHTML = sohbetler().list.map((x) => `<button class="ai-conv ${x.id === cc.id ? 'on' : ''}" data-cid="${x.id}">${esc(x.title || '…')}<small>${UI.fmtDate(x.at)}</small></button>`).join('');
        $$('.ai-conv', m).forEach((b) => (b.onclick = () => { sohbetler().cur = b.dataset.cid; sohbetYaz(); const sel = $('#aiSid', m); if (sel) sel.value = curSohbet().sid || ''; ui.ciz(true); }));
        box.innerHTML = cc.msgs.length ? cc.msgs.map((x, i) => `<div class="ai-msg ${x.r === 'u' ? 'u' : 'a'} ${x.err ? 'err' : ''}" data-mi="${i}">${x.r === 'a' ? `<div class="ai-meta">${icon('spark')} ${x.src === 'builtin' ? esc(PL(t('aiBuiltinHdr'))) : x.src === 'local' ? esc(PL(t('aiLocal')) + (x.model ? ' · ' + x.model : '')) : esc(x.model || PL(t('aiOnline')))}</div>` : ''}<div class="ai-body">${x.r === 'u' ? esc(x.c).replace(/\n/g, '<br>') : (x.c ? mdHtml(x.c) : `<span class="ai-think">${t('aiThinking')}</span>`)}</div>${x.not ? `<div class="ai-not">⚠ ${esc(x.not)}</div>` : ''}${x.r === 'a' && x.src === 'builtin' && x.c ? `<div class="ai-not muted sm">${esc(PL(t('aiOfflineNote')))}</div>` : ''}${x.r === 'a' && x.c && !aktif ? `<div class="ai-act"><button class="ib" data-copy="${i}" title="${t('aiCopy')}">${icon('copy')}</button>${i === cc.msgs.length - 1 ? `<button class="ib" data-retry="${i}" title="${t('aiRetry')}">${icon('play')}</button>` : ''}</div>` : ''}</div>`).join('') : `<p class="muted ai-empty">${t('aiEmpty')}</p>`;
        $('#aiSug', m).innerHTML = cc.msgs.length ? '' : `<div class="muted sm">${t('aiSuggest')}</div>` + ['aiQ1', 'aiQ2', 'aiQ3', 'aiQ4', 'aiQ5', 'aiQ6'].map((k) => `<button class="chip" data-q="${k}">${t(k)}</button>`).join('');
        $$('[data-q]', m).forEach((b) => (b.onclick = () => { inp.value = PL(t(b.dataset.q)); gonder(); }));
        $$('[data-copy]', m).forEach((b) => (b.onclick = async () => { try { await navigator.clipboard.writeText(cc.msgs[+b.dataset.copy].c); toast(t('aiCopied')); } catch (e) {} }));
        $$('[data-retry]', m).forEach((b) => (b.onclick = () => { const i = +b.dataset.retry; const q = cc.msgs[i - 1] && cc.msgs[i - 1].r === 'u' ? cc.msgs[i - 1].c : ''; if (!q) return; cc.msgs.splice(i - 1, 2); inp.value = q; gonder(); }));
        $('#aiSend', m).style.display = aktif ? 'none' : ''; $('#aiStop', m).style.display = aktif ? '' : 'none';
        UI.biScan(box); if (scroll) box.scrollTop = box.scrollHeight;
      },
      guncelle(a) { const el = $$('.ai-msg', box).pop(); if (!el) return; const b = $('.ai-body', el); const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80; b.innerHTML = mdHtml(a.c) || `<span class="ai-think">${t('aiThinking')}</span>`; if (nearBottom) box.scrollTop = box.scrollHeight; },
    };
    const gonder = () => { const q = inp.value.trim(); if (!q || aktif) return; inp.value = ''; const cc = curSohbet(); cc.sid = $('#aiSid', m).value || null; sor(cc, q, cc.sid, ui); };
    $('#aiForm', m).onsubmit = (e) => { e.preventDefault(); gonder(); };
    inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gonder(); } };
    $('#aiStop', m).onclick = () => { if (aktif) aktif.abort(); };
    $('#aiNew', m).onclick = () => { if (!curSohbet().msgs.length) return; yeniSohbet(); $('#aiSid', m).value = ''; ui.ciz(true); };
    $('#aiClear', m).onclick = async () => { if (await confirmDlg(t('confirmDelete'))) { S = { list: [], cur: null }; sohbetYaz(); ui.ciz(true); } };
    $('#aiSid', m).onchange = (e) => { curSohbet().sid = e.target.value || null; sohbetYaz(); };
    $('#aiSet', m).onclick = () => { ayarKaydir = true; go('settings'); };
    ui.ciz(true);
    setTimeout(() => { try { inp.focus(); } catch (e) {} }, 50);
  };

  /* ---------- ayarlar kartı ---------- */
  function ayarKartHtml() {
    const c = cfgOku(); const P = PROV[c.provider] || PROV.gemini;
    const prov = [['gemini', 'Google Gemini (' + PL(t('aiGetKey')).toLowerCase() + ')'], ['openai', 'OpenAI'], ['anthropic', 'Anthropic Claude'], ['custom', PL(t('aiCustom'))], ['none', PL(t('aiNone'))]];
    return `<div class="card" id="ai"><h3>${icon('spark')} ${t('aiSettings')}</h3><p class="muted">${t('aiSetHelp')}</p>
      <div class="grid2">
        <label class="fl"><span>${t('aiProvider')}</span><select id="aiProv">${prov.map(([k, n]) => `<option value="${k}" ${c.provider === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        <label class="fl" id="aiModelRow" ${c.provider === 'none' ? 'hidden' : ''}><span>${t('aiModel')}</span><input id="aiModel" dir="ltr" value="${esc(c.model)}" placeholder="${esc(P.model || '')}"></label>
        <label class="fl" id="aiKeyRow" ${c.provider === 'none' ? 'hidden' : ''}><span>${t('aiKey')}</span><input id="aiKey" type="password" dir="ltr" autocomplete="off" placeholder="${c.key ? esc(PL(t('aiKeyHidden'))) : 'AIza… / sk-…'}"></label>
        <label class="fl" id="aiUrlRow" ${c.provider === 'custom' ? '' : 'hidden'}><span>${t('aiUrl')}</span><input id="aiUrl" dir="ltr" value="${esc(c.url)}" placeholder="${PROV.custom.url}"></label>
      </div>
      <div class="row"><button class="btn sm" id="aiTest">${icon('bolt')} ${t('aiTest')}</button><button class="btn sm ghost" id="aiGetKey" ${c.provider === 'none' ? 'hidden' : ''}>${icon('link')} ${t('aiGetKey')}</button>${c.key ? `<button class="btn sm ghost danger" id="aiDelKey">${t('aiDelKey')}</button>` : ''}<span id="aiTestOut" class="muted sm"></span></div>
      <div class="row"><span>${t('aiStyle')}:</span><div class="seg sm">${[['short', 'aiStyleShort'], ['normal', 'aiStyleNormal'], ['long', 'aiStyleLong']].map(([k, n]) => `<button class="${c.style === k ? 'on' : ''}" data-style="${k}">${t(n)}</button>`).join('')}</div><label class="fl in sm"><span>${t('aiTemp')}</span><input type="range" id="aiTemp" min="0" max="1" step="0.1" value="${c.temp}"></label></div>
      <details class="adv"><summary>${t('aiLocalUrl')}</summary><p class="muted sm">${t('aiLocalHelp')}</p><div class="grid2"><label class="fl"><span>${t('aiLocalUrl')}</span><input id="aiLocalUrl" dir="ltr" value="${esc(c.localUrl)}"></label><label class="fl"><span>${t('aiLocalModel')}</span><input id="aiLocalModel" dir="ltr" value="${esc(c.localModel)}" placeholder="llama3.2"></label></div></details>
    </div>`;
  }
  function ayarBagla(m) {
    const root = $('#ai', m); if (!root) return;
    const c = cfgOku(); const save = () => { cfgYaz(c); toast(t('aiSaved')); };
    const goster = () => { const n = c.provider === 'none'; $('#aiModelRow', root).hidden = n; $('#aiKeyRow', root).hidden = n; $('#aiGetKey', root).hidden = n; $('#aiUrlRow', root).hidden = c.provider !== 'custom'; $('#aiModel', root).placeholder = (PROV[c.provider] || {}).model || ''; };
    $('#aiProv', root).onchange = (e) => { c.provider = e.target.value; c.model = ''; $('#aiModel', root).value = ''; goster(); save(); };
    $('#aiModel', root).onchange = (e) => { c.model = e.target.value.trim(); save(); };
    $('#aiKey', root).onchange = (e) => { const v = e.target.value.trim(); if (v) { c.key = v; e.target.value = ''; e.target.placeholder = PL(t('aiKeyHidden')); save(); } };
    $('#aiUrl', root).onchange = (e) => { c.url = e.target.value.trim().replace(/\/+$/, ''); save(); };
    $('#aiLocalUrl', root).onchange = (e) => { c.localUrl = e.target.value.trim().replace(/\/+$/, ''); save(); };
    $('#aiLocalModel', root).onchange = (e) => { c.localModel = e.target.value.trim(); save(); };
    $('#aiTemp', root).onchange = (e) => { c.temp = +e.target.value; save(); };
    $$('[data-style]', root).forEach((b) => (b.onclick = () => { c.style = b.dataset.style; $$('[data-style]', root).forEach((x) => x.classList.toggle('on', x === b)); save(); }));
    const dk = $('#aiDelKey', root); if (dk) dk.onclick = () => { c.key = ''; cfgYaz(c); UI.render(); };
    $('#aiGetKey', root).onclick = () => { const u = (PROV[c.provider] || {}).anahtar; if (u) { try { Platform.openUrl ? Platform.openUrl(u) : window.open(u, '_blank'); } catch (e) { window.open(u, '_blank'); } } };
    $('#aiTest', root).onclick = async () => {
      const b = $('#aiTest', root); const o = $('#aiTestOut', root); b.disabled = true; o.textContent = PL(t('aiThinking'));
      try {
        const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 30000);
        const msgs = [{ r: 'u', c: 'Reply with the single word OK.' }];
        let r;
        if (c.provider === 'none') r = await yerel(c, 'test', msgs, ctrl, () => {});
        else r = await cevrimici(c, 'You are a test. Reply briefly.', msgs, ctrl, () => {});
        clearTimeout(tm); o.textContent = PL(t('aiTestOk', { m: c.provider === 'none' ? c.localModel : modelAdi(c) })); o.className = 'ok sm';
      } catch (e) { o.textContent = PL(t('aiTestFail', { e: e.message || e })); o.className = 'err sm'; }
      b.disabled = false;
    };
  }

  /* Çeviri: kullanıcının KENDİ yapay zeka anahtarıyla (ya da bilgisayardaki yerel sunucuyla). Anahtar yoksa null döner;
     temel/ceviri.js o zaman genel çeviri hizmetine, o da olmazsa çevrimdışı çeviri belleğine geçer. */
  const DIL_AD = { tr: 'Turkish', en: 'English', ar: 'Arabic' };
  async function cevir(text, from, to) {
    const c = cfgOku();
    const cevrimiciVar = c.provider !== 'none' && (c.key || c.provider === 'custom') && navigator.onLine !== false;
    const yerelVar = !!(c.localUrl && c.localModel);
    if (!cevrimiciVar && !yerelVar) return null;
    const sys = 'You are a professional translator for an English-language curriculum used in schools (CEFR levels, lessons, assessment). ' +
      'Translate the user text ' + (from && from !== 'auto' ? 'from ' + DIL_AD[from] + ' ' : '') + 'into ' + DIL_AD[to] + '. ' +
      'Keep CEFR codes, numbers, names and English example sentences unchanged. Reply with the translation only, no quotes or notes.';
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 20000);
    try {
      const msgs = [{ r: 'u', c: String(text) }];
      const out = cevrimiciVar ? await cevrimici(Object.assign({}, c, { temp: 0.1 }), sys, msgs, ctrl, () => {}) : await yerel(Object.assign({}, c, { temp: 0.1 }), sys, msgs, ctrl, () => {});
      const s = String(out || '').trim().replace(/^["“«]|["”»]$/g, '');
      return s || null;
    } finally { clearTimeout(tm); }
  }

  window.Danisman = { ayarKartHtml, ayarBagla, cfg: cfgOku, cfgYaz, PROV, cevir, yerlesik, sistemMetni, kaynak() { const c = cfgOku(); return c.provider === 'none' ? (c.localModel ? 'local' : 'builtin') : PROV[c.provider].ad; } };
})();
