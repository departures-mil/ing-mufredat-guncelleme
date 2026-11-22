/* Ek arayüz metinleri (kaynaklar, linkler, çeviri araçları) */
(function () {
  const X = {
    tr: { resources: 'Kaynaklar (belge ve video)', videoLinks: 'Video / web linkleri', noLinks: 'Henüz link eklenmedi.', linkTitle: 'Başlık (örn. “ESC kalibrasyonu videosu”)', addLink: 'Link ekle', openLink: 'Aç', documents: 'Belgeler', noDocs: 'Henüz belge eklenmedi.', openFile: 'Aç', saveAs: 'Farklı kaydet', addFiles: 'Belge ekle', filesSyncInfo: 'Belgeler bu cihazda saklanır; Firebase bağlıysa diğer cihaz da açabilir (dosya başına en çok 25 MB).', fileMissing: 'Belge bu cihazda yok ve indirilemedi (senkronizasyonu kontrol edin).', copied: 'Kopyalandı', showLinks: 'Konu kaynaklarını ekle (video linkleri QR kodlu)', fillMissingTr: 'Eksik çevirileri tamamla', nothingToTranslate: 'Çevrilecek eksik metin yok.', oneLinePerItem: 'her satıra bir madde', pedagogy: 'Müfredat sistemi', onHint: 'Etkin — kapatmak için tıklayın (silinmez, çıktıda ve puanda görünmez)', offHint: 'Etkisiz — açmak için tıklayın', offDone: 'Etkisiz hâle getirildi (silinmedi)', onDone: 'Yeniden etkinleştirildi', hideOff: 'Kapalıları gizle', activeCount: '{n} etkin', offLabel: 'kapalı' },
    en: { resources: 'Resources (documents and videos)', videoLinks: 'Video / web links', noLinks: 'No links added yet.', linkTitle: 'Title (e.g. “ESC calibration video”)', addLink: 'Add link', openLink: 'Open', documents: 'Documents', noDocs: 'No documents added yet.', openFile: 'Open', saveAs: 'Save as', addFiles: 'Add documents', filesSyncInfo: 'Documents are stored on this device; if Firebase is connected the other device can open them too (max. 25 MB per file).', fileMissing: 'The document is not on this device and could not be downloaded (check synchronization).', copied: 'Copied', showLinks: 'Include topic resources (video links with QR codes)', fillMissingTr: 'Complete missing translations', nothingToTranslate: 'No missing text to translate.', oneLinePerItem: 'one item per line', pedagogy: 'Curriculum system', onHint: 'Active — click to disable (not deleted; hidden from printouts and scoring)', offHint: 'Disabled — click to enable', offDone: 'Disabled (not deleted)', onDone: 'Enabled again', hideOff: 'Hide disabled', activeCount: '{n} active', offLabel: 'disabled' },
    ar: { resources: 'المصادر (مستندات وفيديوهات)', videoLinks: 'روابط الفيديو / الويب', noLinks: 'لم تُضف روابط بعد.', linkTitle: 'العنوان (مثلاً «فيديو معايرة ESC»)', addLink: 'إضافة رابط', openLink: 'فتح', documents: 'المستندات', noDocs: 'لم تُضف مستندات بعد.', openFile: 'فتح', saveAs: 'حفظ باسم', addFiles: 'إضافة مستندات', filesSyncInfo: 'تُحفظ المستندات على هذا الجهاز؛ وإن كان Firebase متصلاً يمكن للجهاز الآخر فتحها أيضاً (25 ميغابايت كحد أقصى للملف).', fileMissing: 'المستند غير موجود على هذا الجهاز وتعذّر تنزيله (تحقق من المزامنة).', copied: 'تم النسخ', showLinks: 'تضمين مصادر المواضيع (روابط الفيديو مع رموز QR)', fillMissingTr: 'إكمال الترجمات الناقصة', nothingToTranslate: 'لا يوجد نص ناقص للترجمة.', oneLinePerItem: 'بند واحد في كل سطر', pedagogy: 'نظام المنهج', onHint: 'مفعّل — انقر للتعطيل (لا يُحذف؛ ويُستبعد من المطبوعات والتقييم)', offHint: 'معطّل — انقر للتفعيل', offDone: 'تم التعطيل (دون حذف)', onDone: 'تمت إعادة التفعيل', hideOff: 'إخفاء المعطّل', activeCount: '{n} مفعّل', offLabel: 'معطّل' },
  };
  for (const l of Object.keys(X)) Object.assign(I18N[l], X[l]);
})();
/* v1.2: uygulama içi güncelleme ve senkronizasyon metinleri */
(function () {
  const X = {
    tr: { updates: 'Güncellemeler', currentVersion: 'Kurulu sürüm', checkUpdates: 'Güncellemeleri denetle', checking: 'Denetleniyor…', upToDate: 'Uygulama güncel.', updateAvailable: 'Yeni sürüm hazır: v{v}', updateNow: 'Güncelle', downloading: 'Güncelleniyor… %{p}', restartNow: 'Yeniden başlat', updateReady: 'Güncelleme kuruldu. Yeniden başlatınca v{v} açılacak.', updateErr: 'Güncelleme alınamadı', shellOld: 'v{v} için uygulamanın yeni kurulum dosyası gerekiyor; lütfen yöneticiye başvurun.', noOta: 'Bu ortamda uygulama içi güncelleme kullanılamıyor.', lastCheck: 'Son denetim', whatsNew: 'Yenilikler', updateChip: 'Güncelleme v{v}', publishUpdate: 'Güncellemeyi yayınla (yalnız yönetici)', publishHelp: 'Size verilen .ihu güncelleme dosyasını seçin. Dosya Firebase’e yüklenir; tüm masaüstü ve telefonlarda “Güncelle” düğmesi çıkar. Yönetici şifresi yalnız bu işlem için kullanılır, saklanmaz.', chooseIhu: 'Güncelleme dosyası seç (.ihu) ve yayınla', publishing: 'Yayınlanıyor… %{p}', published: 'v{v} yayınlandı. Tüm cihazlarda güncelleme düğmesi görünecek.', ihuInvalid: 'Geçersiz güncelleme dosyası (.ihu).', advanced: 'Gelişmiş', accountsHint: 'Kendi Firebase projenizin firebaseConfig ayarını aşağıya yapıştırın. Hesaplar Firebase konsolunda (Authentication → Users) eklenir; masaüstünde ve telefonda aynı kurum kodunu kullanın.', archived2: 'Arşiv', loginNeeded: 'Oturum bulunamadı; şifrenizi bir kez girip “Giriş yap ve bağlan”a basın. Sonraki açılışlarda otomatik bağlanır.', updateBad: 'v{v} bu cihazda açılamadı ve önceki sürüme dönüldü; düzeltilmiş sürüm bekleniyor.' },
    en: { updates: 'Updates', currentVersion: 'Installed version', checkUpdates: 'Check for updates', checking: 'Checking…', upToDate: 'The application is up to date.', updateAvailable: 'New version ready: v{v}', updateNow: 'Update', downloading: 'Updating… {p}%', restartNow: 'Restart', updateReady: 'Update installed. v{v} opens after restart.', updateErr: 'Update failed', shellOld: 'v{v} needs a new installer of the application; please contact the administrator.', noOta: 'In-app updates are not available in this environment.', lastCheck: 'Last check', whatsNew: 'What’s new', updateChip: 'Update v{v}', publishUpdate: 'Publish update (administrator only)', publishHelp: 'Choose the .ihu update file you were given. It is uploaded to Firebase and an “Update” button appears on every desktop and phone. The administrator password is used only for this and is not stored.', chooseIhu: 'Choose update file (.ihu) and publish', publishing: 'Publishing… {p}%', published: 'v{v} published. The update button will appear on all devices.', ihuInvalid: 'Invalid update file (.ihu).', advanced: 'Advanced', accountsHint: 'Paste your own Firebase project\'s firebaseConfig below. Accounts are added in the Firebase console (Authentication → Users); use the same institution code on the desktop and the phone.', archived2: 'Archive', loginNeeded: 'No saved session; enter your password once and press “Sign in and connect”. It connects automatically afterwards.', updateBad: 'v{v} could not start on this device and the previous version was restored; waiting for a fixed version.' },
    ar: { updates: 'التحديثات', currentVersion: 'الإصدار المثبت', checkUpdates: 'التحقق من التحديثات', checking: 'جارٍ التحقق…', upToDate: 'التطبيق محدَّث.', updateAvailable: 'إصدار جديد جاهز: v{v}', updateNow: 'تحديث', downloading: 'جارٍ التحديث… %{p}', restartNow: 'إعادة التشغيل', updateReady: 'تم تثبيت التحديث. سيُفتح الإصدار v{v} بعد إعادة التشغيل.', updateErr: 'تعذّر التحديث', shellOld: 'يحتاج الإصدار v{v} إلى ملف تثبيت جديد للتطبيق؛ يرجى مراجعة المسؤول.', noOta: 'التحديث من داخل التطبيق غير متاح في هذه البيئة.', lastCheck: 'آخر تحقق', whatsNew: 'الجديد', updateChip: 'تحديث v{v}', publishUpdate: 'نشر التحديث (للمسؤول فقط)', publishHelp: 'اختر ملف التحديث ‎.ihu‎ المرسل إليك. يُرفع إلى Firebase ويظهر زر «تحديث» على جميع الحواسيب والهواتف. تُستخدم كلمة مرور المسؤول لهذه العملية فقط ولا تُحفظ.', chooseIhu: 'اختيار ملف التحديث (‎.ihu‎) ونشره', publishing: 'جارٍ النشر… %{p}', published: 'تم نشر v{v}. سيظهر زر التحديث على جميع الأجهزة.', ihuInvalid: 'ملف تحديث غير صالح (‎.ihu‎).', advanced: 'متقدم', accountsHint: 'الصق إعدادات firebaseConfig لمشروع Firebase الخاص بك أدناه. تُضاف الحسابات من لوحة Firebase ‏(Authentication ← Users)؛ استخدم رمز المؤسسة نفسه على الحاسوب والهاتف.', archived2: 'أرشفة', loginNeeded: 'لا توجد جلسة محفوظة؛ أدخل كلمة المرور مرة واحدة واضغط «تسجيل الدخول والاتصال». بعدها يتصل تلقائياً.', updateBad: 'تعذّر تشغيل v{v} على هذا الجهاز وأُعيد الإصدار السابق؛ بانتظار إصدار مُصحَّح.' },
  };
  for (const l of Object.keys(X)) Object.assign(I18N[l], X[l]);
})();
/* v1.5: iletişim yolları */
(function () {
  const X = {
    tr: { cwCall: 'Normal arama', cwWa: 'WhatsApp', cwTg: 'Telegram', cwSg: 'Signal', cwOnHint: 'çalışıyor (kapatmak için dokunun)', cwOffHint: 'kapalı (açmak için dokunun)', cwHint: 'Numaranın çalıştığı yollara dokunun; açık olanlar renkli görünür. Numarayı ülke koduyla yazın.', cwNoPhone: 'Telefon numarası yok', cwCopied: 'Numara kopyalandı' },
    en: { cwCall: 'Phone call', cwWa: 'WhatsApp', cwTg: 'Telegram', cwSg: 'Signal', cwOnHint: 'works (tap to turn off)', cwOffHint: 'off (tap to turn on)', cwHint: 'Tap the ways this number can be reached; active ones are shown in colour. Write the number with the country code.', cwNoPhone: 'No phone number', cwCopied: 'Number copied' },
    ar: { cwCall: 'اتصال هاتفي', cwWa: 'واتساب', cwTg: 'تيليغرام', cwSg: 'سيغنال', cwOnHint: 'يعمل (انقر للإيقاف)', cwOffHint: 'متوقف (انقر للتفعيل)', cwHint: 'انقر على وسائل التواصل التي يعمل عليها هذا الرقم؛ تظهر المفعّلة ملوّنة. اكتب الرقم مع رمز الدولة.', cwNoPhone: 'لا يوجد رقم هاتف', cwCopied: 'تم نسخ الرقم' },
  };
  for (const l of Object.keys(X)) Object.assign(I18N[l], X[l]);
})();
/* v1.5: eğitim programları ve yönetici iletişimi */
(function () {
  const X = {
    tr: {
      program: 'Eğitim programı', prog_genel: 'Genel İngilizce', prog_kanatli: 'Konuşma', prog_fpv: 'Sınav hazırlık', progSwitched: 'Program: {p}',
      ctAdmin: 'Yönetici İletişimi', ctTitle: 'Bizimle İletişime Geçin',
      ctIntro: 'Programın daha verimli hâle gelmesine katkı sağlayacağını düşündüğünüz fikir, öneri ve taleplerinizi aşağıdaki form aracılığıyla yöneticimize iletebilirsiniz. İletilen tüm mesajlar özenle değerlendirilmektedir.',
      ctReply: 'Geri dönüş için e-posta (isteğe bağlı)', ctTopic: 'Konu', ctMessage: 'Mesajınız', ctPlaceholder: 'Fikir, öneri veya talebinizi ayrıntılı olarak yazınız…',
      ctSuggestion: 'Öneri', ctRequest: 'Talep', ctBug: 'Hata bildirimi', ctOther: 'Diğer',
      ctSend: 'Mesajı Gönder', ctSending: 'Gönderiliyor…', ctPrivacy: 'Mesajınız yalnızca yöneticiye iletilir.',
      ctThanksT: 'Mesajınız iletildi', ctThanks: 'Mesajınız yöneticiye başarıyla iletilmiştir. Değerli katkınız için teşekkür ederiz.',
      ctNeed: 'Lütfen ad soyad ve en az 10 karakterlik bir mesaj yazınız.', ctBadMail: 'E-posta adresi geçerli değil.', ctWait: 'Yeni bir mesaj için lütfen bir dakika bekleyiniz.',
      ctQueued: 'Şu an bağlantı kurulamadı; mesajınız kaydedildi ve bağlantı sağlandığında otomatik olarak iletilecek.', ctQueuedSent: 'Bekleyen mesajınız yöneticiye iletildi.', ctPending: 'İletilmeyi bekleyen mesaj: {n}',
      ctInbox: 'Gelen mesajlar', ctNone: 'Henüz mesaj yok.',
    },
    en: {
      program: 'Training programme', prog_genel: 'General English', prog_kanatli: 'Speaking', prog_fpv: 'Exam preparation', progSwitched: 'Programme: {p}',
      ctAdmin: 'Contact the Administrator', ctTitle: 'Get in Touch with Us',
      ctIntro: 'You can send the administrator any ideas, suggestions and requests that you believe would make the programme more effective, using the form below. Every message is carefully considered.',
      ctReply: 'E-mail for a reply (optional)', ctTopic: 'Subject', ctMessage: 'Your message', ctPlaceholder: 'Please describe your idea, suggestion or request in detail…',
      ctSuggestion: 'Suggestion', ctRequest: 'Request', ctBug: 'Bug report', ctOther: 'Other',
      ctSend: 'Send Message', ctSending: 'Sending…', ctPrivacy: 'Your message is delivered to the administrator only.',
      ctThanksT: 'Message sent', ctThanks: 'Your message has been delivered to the administrator. Thank you for your valuable contribution.',
      ctNeed: 'Please enter your full name and a message of at least 10 characters.', ctBadMail: 'The e-mail address is not valid.', ctWait: 'Please wait a minute before sending another message.',
      ctQueued: 'No connection right now; your message has been saved and will be sent automatically when a connection is available.', ctQueuedSent: 'Your pending message has been delivered to the administrator.', ctPending: 'Messages waiting to be sent: {n}',
      ctInbox: 'Inbox', ctNone: 'No messages yet.',
    },
    ar: {
      program: 'البرنامج التدريبي', prog_genel: 'الإنجليزية العامة', prog_kanatli: 'المحادثة', prog_fpv: 'التحضير للامتحانات', progSwitched: 'البرنامج: {p}',
      ctAdmin: 'التواصل مع المسؤول', ctTitle: 'تواصلوا معنا',
      ctIntro: 'يمكنكم إرسال أفكاركم ومقترحاتكم وطلباتكم التي ترون أنها تسهم في رفع كفاءة البرنامج إلى المسؤول عبر النموذج أدناه. تُدرس جميع الرسائل بعناية.',
      ctReply: 'البريد الإلكتروني للرد (اختياري)', ctTopic: 'الموضوع', ctMessage: 'رسالتكم', ctPlaceholder: 'يرجى كتابة فكرتكم أو مقترحكم أو طلبكم بالتفصيل…',
      ctSuggestion: 'اقتراح', ctRequest: 'طلب', ctBug: 'الإبلاغ عن خطأ', ctOther: 'أخرى',
      ctSend: 'إرسال الرسالة', ctSending: 'جارٍ الإرسال…', ctPrivacy: 'تصل رسالتكم إلى المسؤول فقط.',
      ctThanksT: 'تم إرسال الرسالة', ctThanks: 'تم إيصال رسالتكم إلى المسؤول بنجاح. نشكركم على مساهمتكم القيّمة.',
      ctNeed: 'يرجى إدخال الاسم الكامل ورسالة لا تقل عن 10 أحرف.', ctBadMail: 'عنوان البريد الإلكتروني غير صالح.', ctWait: 'يرجى الانتظار دقيقة قبل إرسال رسالة جديدة.',
      ctQueued: 'تعذّر الاتصال حالياً؛ حُفظت رسالتكم وستُرسل تلقائياً عند توفر الاتصال.', ctQueuedSent: 'تم إيصال رسالتكم المعلّقة إلى المسؤول.', ctPending: 'رسائل بانتظار الإرسال: {n}',
      ctInbox: 'الرسائل الواردة', ctNone: 'لا توجد رسائل بعد.',
    },
  };
  for (const l of Object.keys(X)) Object.assign(I18N[l], X[l]);
})();
/* v1.5: iki dilli görünüm, öğrenciye özel müfredat, çevrimdışı çeviri */
(function () {
  const X = {
    tr: {
      biHint: 'İki dilli seçeneklerde ekrandaki her metnin altında Arapçası yazılır. Çıktılar da varsayılan olarak aynı dil çiftiyle hazırlanır.',
      ghostEdit: 'Kişiye özel müfredatı düzenle', ghostDone: 'Düzenlemeyi bitir', ghostHide: 'Hayaletleri gizle',
      ghostHelp: 'Bu öğrencinin müfredatını kişiye özel hâle getirin: kapattığınız seviye, modül ve maddeler bu öğrencide hayalet olur — silinmez; bu öğrencinin puanına, unvanına ve çıktılarına girmez. Genel müfredat ve diğer öğrenciler değişmez.',
      ghostOnHint: 'Bu öğrencide etkin — hayalet yapmak için tıklayın', ghostOffHint: 'Bu öğrencide hayalet — yeniden açmak için tıklayın',
      ghostDoneT: 'Bu öğrenci için hayalet yapıldı (silinmedi)', ghostBackT: 'Bu öğrenci için yeniden açıldı',
      ghostCount: 'Kişiye özel müfredat: {n} başlık bu öğrencide kapalı', ghostReset: 'Tümünü genel müfredata döndür',
      mtDraft: 'taslak', mtDraftHint: 'Bu çeviri internet yokken çevrimdışı yapıldı; internet gelince otomatik olarak iyileştirilecek.',
      mtOffline: 'İnternet yok: çeviri çevrimdışı sözlükle yapıldı (taslak). İnternet gelince otomatik iyileştirilecek.',
    },
    en: {
      biHint: 'In the bilingual options the Arabic is written under every text on the screen. Printouts are also prepared in the same language pair by default.',
      ghostEdit: 'Edit personalised curriculum', ghostDone: 'Finish editing', ghostHide: 'Hide ghosts',
      ghostHelp: 'Personalise this student’s curriculum: levels, modules and items you switch off become ghosts for this student only — nothing is deleted; they are left out of this student’s score, rank and printouts. The general curriculum and other students are unchanged.',
      ghostOnHint: 'Active for this student — click to make it a ghost', ghostOffHint: 'Ghost for this student — click to enable again',
      ghostDoneT: 'Made a ghost for this student (not deleted)', ghostBackT: 'Enabled again for this student',
      ghostCount: 'Personalised curriculum: {n} entries switched off for this student', ghostReset: 'Restore everything to the general curriculum',
      mtDraft: 'draft', mtDraftHint: 'This translation was made offline without internet; it will be improved automatically when online.',
      mtOffline: 'No internet: translated with the offline dictionary (draft). It will be improved automatically when online.',
    },
    ar: {
      biHint: 'في الخيارات ثنائية اللغة تُكتب الترجمة العربية تحت كل نص على الشاشة. وتُعدّ المطبوعات افتراضياً بزوج اللغات نفسه.',
      ghostEdit: 'تعديل المنهج المخصص للطالب', ghostDone: 'إنهاء التعديل', ghostHide: 'إخفاء البنود الشبحية',
      ghostHelp: 'خصّص منهج هذا الطالب: المستويات والوحدات والبنود التي توقفها تصبح شبحية لهذا الطالب فقط — لا يُحذف شيء؛ ولا تدخل في درجته ولقبه ومطبوعاته. ولا يتغير المنهج العام ولا الطلاب الآخرون.',
      ghostOnHint: 'مفعّل لهذا الطالب — انقر لجعله شبحياً', ghostOffHint: 'شبحي لهذا الطالب — انقر لإعادة تفعيله',
      ghostDoneT: 'أصبح شبحياً لهذا الطالب (دون حذف)', ghostBackT: 'أعيد تفعيله لهذا الطالب',
      ghostCount: 'منهج مخصص: {n} عنصر موقوف لهذا الطالب', ghostReset: 'إعادة الكل إلى المنهج العام',
      mtDraft: 'مسودة', mtDraftHint: 'تمت هذه الترجمة دون اتصال بالإنترنت؛ وستُحسَّن تلقائياً عند توفر الاتصال.',
      mtOffline: 'لا يوجد اتصال: تمت الترجمة بالقاموس دون اتصال (مسودة). ستُحسَّن تلقائياً عند توفر الاتصال.',
    },
  };
  for (const l of Object.keys(X)) Object.assign(I18N[l], X[l]);
})();
/* v1.7: antetli şablon yerleşimi */
(function () {
  const X = {
    tr: { tplAutoMargin: 'Boşlukları antete göre otomatik ayarla', tplBuiltin: 'Orijinal', tplAdjust: 'Önizle / ayarla', tplPdfTip: 'İpucu: Antet orijinaliyle birebir korunur, esnetilmez ve kesilmez. Karmaşık Word antetlerinde (metin kutuları, filigran) en kesin sonuç için Word’de “PDF olarak kaydet” yapıp PDF’i ekleyebilirsiniz.', tplAdjustHelp: 'Antet sayfaya orijinal oranıyla tam oturur. Kırmızı kesikli çerçeve yazı alanıdır: üst ve alt boşluk antetle çakışmayacak biçimde otomatik önerilir. Gerekirse küçük kaydırma ve ölçek ayarı yapabilirsiniz.', tplScale: 'Ölçek', tplShiftX: 'Sağa/sola kaydır', tplShiftY: 'Yukarı/aşağı kaydır', tplAutoDetect: 'Boşlukları yeniden algıla', tplSampleText: 'Örnek içerik: rapor, kontrol listesi ve belgelerdeki yazılar bu çerçevenin içinde yer alır.' },
    en: { tplAutoMargin: 'Set margins automatically from the letterhead', tplBuiltin: 'Original', tplAdjust: 'Preview / adjust', tplPdfTip: 'Tip: the letterhead is kept exactly as the original — never stretched or cropped. For complex Word letterheads (text boxes, watermarks) the most exact result is to “Save as PDF” in Word and add the PDF.', tplAdjustHelp: 'The letterhead fits the page with its original proportions. The red dashed frame is the text area: top and bottom margins are suggested automatically so nothing overlaps the letterhead. You can make small shift and scale adjustments if needed.', tplScale: 'Scale', tplShiftX: 'Shift left/right', tplShiftY: 'Shift up/down', tplAutoDetect: 'Detect margins again', tplSampleText: 'Sample content: the text of reports, checklists and documents is placed inside this frame.' },
    ar: { tplAutoMargin: 'ضبط الهوامش تلقائياً حسب الترويسة', tplBuiltin: 'الأصلي', tplAdjust: 'معاينة / ضبط', tplPdfTip: 'تلميح: تُحفظ الترويسة مطابقة للأصل تماماً دون تمديد أو قص. وفي ترويسات Word المعقدة (مربعات النص، العلامة المائية) تحصل على أدق نتيجة بحفظ الملف بصيغة PDF من Word ثم إضافته.', tplAdjustHelp: 'تتطابق الترويسة مع الصفحة بنسبها الأصلية. الإطار الأحمر المتقطع هو منطقة النص: تُقترح الهوامش العلوية والسفلية تلقائياً بحيث لا يتداخل شيء مع الترويسة. ويمكنك إجراء إزاحة وتكبير بسيطين عند الحاجة.', tplScale: 'المقياس', tplShiftX: 'إزاحة يميناً/يساراً', tplShiftY: 'إزاحة للأعلى/للأسفل', tplAutoDetect: 'إعادة اكتشاف الهوامش', tplSampleText: 'محتوى تجريبي: توضع نصوص التقارير وقوائم التحقق والوثائق داخل هذا الإطار.' },
  };
  for (const l of Object.keys(X)) Object.assign(I18N[l], X[l]);
})();
/* v1.8: genel arama (Ctrl+F) */
(function () {
  const X = {
    tr: { gSearchPh: 'Ara… (Ctrl+F)', gInPage: 'Bu sayfada', gNoRes: 'Başka sayfada sonuç yok', gPages: 'Sayfalar', gCurr: 'Müfredat', gFlight: 'Uçuş görevleri', gStud: 'Öğrenciler', gHelp: 'Yardım', gSet: 'Ayarlar' },
    en: { gSearchPh: 'Search… (Ctrl+F)', gInPage: 'On this page', gNoRes: 'No results on other pages', gPages: 'Pages', gCurr: 'Curriculum', gFlight: 'Flight tasks', gStud: 'Students', gHelp: 'Help', gSet: 'Settings' },
    ar: { gSearchPh: 'بحث… (Ctrl+F)', gInPage: 'في هذه الصفحة', gNoRes: 'لا نتائج في الصفحات الأخرى', gPages: 'الصفحات', gCurr: 'المنهج', gFlight: 'مهام الطيران', gStud: 'الطلاب', gHelp: 'المساعدة', gSet: 'الإعدادات' },
  };
  for (const l of Object.keys(X)) Object.assign(I18N[l], X[l]);
})();
/* v1.8: uygulamaya özel numaralar */
(function () {
  const X = {
    tr: { cwNumsHint: 'Uygulamanın numarası farklıysa aşağıya yazın; boş bırakılırsa yukarıdaki telefon numarası kullanılır.', cwNumPh: 'Farklı numara (boşsa ana numara)', cwNumPhTg: 'Numara veya @kullanıcıadı (boşsa ana numara)' },
    en: { cwNumsHint: 'If an app uses a different number, enter it below; if left empty, the phone number above is used.', cwNumPh: 'Different number (empty = main number)', cwNumPhTg: 'Number or @username (empty = main number)' },
    ar: { cwNumsHint: 'إذا كان للتطبيق رقم مختلف فاكتبه أدناه؛ وإن تُرك فارغاً يُستخدم رقم الهاتف أعلاه.', cwNumPh: 'رقم مختلف (فارغ = الرقم الرئيسي)', cwNumPhTg: 'رقم أو ‎@اسم المستخدم‎ (فارغ = الرقم الرئيسي)' },
  };
  for (const l of Object.keys(X)) Object.assign(I18N[l], X[l]);
})();
/* v1.9: uçuş hattı ve değerlendirme hayaletleri */
(function () {
  const X = {
    tr: { ghostTag: 'hayalet', ghostHelpF: 'Bu öğrencinin uçuş hattını kişiye özel hâle getirin: kapattığınız aşamalar bu öğrencide hayalet olur — silinmez; bu öğrencinin çıktılarına ve uçuş kaydı seçeneklerine girmez. Genel müfredat ve diğer öğrenciler değişmez.' },
    en: { ghostTag: 'ghost', ghostHelpF: 'Personalise this student’s flight track: stages you switch off become ghosts for this student only — nothing is deleted; they are left out of this student’s printouts and flight-log options. The general curriculum and other students are unchanged.' },
    ar: { ghostTag: 'شبحي', ghostHelpF: 'خصّص مسار الطيران لهذا الطالب: المراحل التي توقفها تصبح شبحية لهذا الطالب فقط — لا يُحذف شيء؛ ولا تدخل في مطبوعاته ولا في خيارات سجل الطيران. ولا يتغير المنهج العام ولا الطلاب الآخرون.' },
  };
  for (const l of Object.keys(X)) Object.assign(I18N[l], X[l]);
  // Seviye sonu değerlendirmesi de kişiye özel kapatılabilir
  I18N.tr.ghostHelp += ' Seviye sonu değerlendirmesini de kapatabilirsiniz: o seviye yalnız ilerleme yüzdesine göre tamamlanmış sayılır.';
  I18N.en.ghostHelp += ' You can also switch off a level-end evaluation: that level then counts as achieved on progress alone.';
  I18N.ar.ghostHelp += ' ويمكنك أيضاً إيقاف تقييم نهاية المستوى: عندها يُحتسب المستوى منجزاً بحسب نسبة التقدم وحدها.';
})();
/* v2.0: dil bütünlüğü */
(function () {
  const X = {
    tr: { minShort: 'dk', ctReplyPh: 'ornek@posta.com', langName_tr: 'Türkçe', langName_en: 'İngilizce', langName_ar: 'Arapça' },
    en: { minShort: 'min', ctReplyPh: 'name@example.com', langName_tr: 'Turkish', langName_en: 'English', langName_ar: 'Arabic' },
    ar: { minShort: 'دقيقة', ctReplyPh: 'name@example.com', langName_tr: 'التركية', langName_en: 'الإنجليزية', langName_ar: 'العربية' },
  };
  for (const l of Object.keys(X)) Object.assign(I18N[l], X[l]);
})();
/* v2.1: ortak ders programı */
(function () {
  const X = {
    tr: {
      nav_plans: 'Ortak Ders Programı', planNew: 'Yeni ortak program', planName: 'Program adı', planNameDef: 'Ortak ders programı',
      planIntro: 'Birlikte derse girecek öğrencileri seçin; seçilenlerde eksik olan ortak konular müfredat sırasıyla çıkarılır. Konuları derslere dağıtın, tarih ve süre verin, belgesini alın. Ders yapılınca katılanların ilerlemesi kendiliğinden işlenir.',
      planNoPlans: 'Henüz ortak program yok. “Yeni ortak program” ile başlayın ya da Öğrenciler sayfasında öğrencileri işaretleyip “Ortak program çıkar”a basın.',
      planPickStudents: 'Ortak program için öğrencileri seçin', planSameProg: 'Bir programa aynı eğitim programındaki öğrenciler alınabilir.', planNoStudents: 'Önce öğrenci seçin.',
      selectAll: 'Tümünü seç', selectNone: 'Hiçbiri',
      planStudents: 'Öğrenciler', planAddStudents: 'Öğrenci ekle / çıkar', planSummary: '{m} eksik ortak konu · {a} konu derslere dağıtıldı · {l} ders · {d} dk',
      planMissing: 'Eksik ortak konular', planModeAll: 'Herkeste eksik', planModeAny: 'En az birinde eksik',
      planModeAllD: 'Seçilen öğrencilerin hepsinde eksik olan konular (bu konuyu alması gereken herkes için).', planModeAnyD: 'Seçilenlerden en az birinde eksik olan konular; sayı kaç kişide eksik olduğunu gösterir.',
      planMissIn: 'Eksik olanlar', planMissShort: 'Eksik', planEveryone: 'Herkes', planNoMissing: 'Seçilen öğrencilerde eksik ortak konu yok.', planAllAssigned: 'Tüm eksik konular derslere dağıtıldı.',
      planExclude: 'Programdan çıkar', planExcluded: 'Programdan çıkarılan konular', planRestore: 'Geri ekle',
      planLessons: 'Dersler', planLesson: 'Ders', planAddLesson: 'Ders ekle', planNoLessons: 'Henüz ders yok. Konuları seçip derse ekleyin ya da “Otomatik derslere böl”ü kullanın.',
      planLessonTitle: 'Ders başlığı', planTime: 'Saat', planMinutes: 'Süre (dk)', planNewLesson: 'Yeni derse', planAddSel: 'Seçilenleri ekle',
      planMoveTo: 'Taşı', planBackToPool: 'Dersten çıkar (eksik konulara geri döner)', planEmptyLesson: 'Bu derse henüz konu eklenmedi.', planCustom: 'Özel konu ekle', planDelLesson: 'Bu ders silinsin mi? Konuları eksik konulara geri döner.',
      planAuto: 'Otomatik derslere böl', planAutoHelp: '{n} konu, ders süresine göre sırayla derslere dağıtılır. Sonra dilediğiniz gibi düzenleyebilirsiniz.', planLessonMin: 'Ders süresi (dk)', planItemMin: 'Konu başına süre (dk)', planStart: 'İlk ders tarihi', planEvery: 'Dersler arası gün', planAutoByModule: 'Aynı modülün konularını mümkünse aynı derste tut', planAutoDone: 'Dersler oluşturuldu',
      planDone: 'Ders yapıldı', planDoneQ: 'Derse katılan öğrencileri işaretleyin. Bu dersin konuları katılanlarda “Çalıştık” olarak işaretlenir ve ders günlüklerine eklenir.', planDoneT: 'Ders işlendi: {n} öğrencinin ilerlemesi güncellendi', planDoneTag: 'yapıldı', planPending: 'planlandı',
      planUndo: '“Yapıldı”yı geri al', planUndoQ: 'Bu dersle yapılan işaretler ve günlük kayıtları geri alınsın mı?',
      planDocs: 'Belge al', planDelete: 'Programı sil', planMake: 'Ortak program çıkar', planMakeHint: 'Kartlardaki kutucuklarla öğrencileri seçin, sonra ortak ders programı çıkarın', planPickOne: 'Ortak ders programı için seç',
      planJournal: 'Ortak ders ({p}): {n} konu', planStatus: 'Durum', planTopics: 'Konu', planCode: 'Kod',
      printPlan: 'Ortak ders programı', printPlanD: 'Seçilen öğrencilerin eksik ortak konuları ve ders planı', activity_plan: 'Ortak ders işlendi: {n} öğrenci, {k} konu',
    },
    en: {
      nav_plans: 'Joint Lesson Plan', planNew: 'New joint plan', planName: 'Plan name', planNameDef: 'Joint lesson plan',
      planIntro: 'Select the students who will attend together; the topics they are missing are listed in curriculum order. Distribute the topics into lessons, set dates and durations and print the document. When a lesson is held, the attendees’ progress is updated automatically.',
      planNoPlans: 'No joint plans yet. Start with “New joint plan”, or tick students on the Students page and press “Create joint plan”.',
      planPickStudents: 'Select students for the joint plan', planSameProg: 'A plan can include students of the same training programme.', planNoStudents: 'Select students first.',
      selectAll: 'Select all', selectNone: 'None',
      planStudents: 'Students', planAddStudents: 'Add / remove students', planSummary: '{m} common missing topics · {a} assigned to lessons · {l} lessons · {d} min',
      planMissing: 'Common missing topics', planModeAll: 'Missing for everyone', planModeAny: 'Missing for at least one',
      planModeAllD: 'Topics missing for all selected students (everyone who needs the topic).', planModeAnyD: 'Topics missing for at least one selected student; the number shows how many are missing it.',
      planMissIn: 'Missing for', planMissShort: 'Missing', planEveryone: 'Everyone', planNoMissing: 'The selected students have no common missing topics.', planAllAssigned: 'All missing topics have been assigned to lessons.',
      planExclude: 'Remove from plan', planExcluded: 'Topics removed from the plan', planRestore: 'Add back',
      planLessons: 'Lessons', planLesson: 'Lesson', planAddLesson: 'Add lesson', planNoLessons: 'No lessons yet. Select topics and add them to a lesson, or use “Split into lessons automatically”.',
      planLessonTitle: 'Lesson title', planTime: 'Time', planMinutes: 'Duration (min)', planNewLesson: 'To a new lesson', planAddSel: 'Add selected',
      planMoveTo: 'Move', planBackToPool: 'Remove from lesson (returns to missing topics)', planEmptyLesson: 'No topics in this lesson yet.', planCustom: 'Add custom topic', planDelLesson: 'Delete this lesson? Its topics return to the missing topics.',
      planAuto: 'Split into lessons automatically', planAutoHelp: '{n} topics are distributed into lessons in order, according to the lesson duration. You can edit them afterwards.', planLessonMin: 'Lesson duration (min)', planItemMin: 'Time per topic (min)', planStart: 'First lesson date', planEvery: 'Days between lessons', planAutoByModule: 'Keep topics of the same module in the same lesson where possible', planAutoDone: 'Lessons created',
      planDone: 'Lesson held', planDoneQ: 'Tick the students who attended. The lesson’s topics are marked “Studied” for them and added to their lesson logs.', planDoneT: 'Lesson recorded: progress of {n} students updated', planDoneTag: 'held', planPending: 'planned',
      planUndo: 'Undo “held”', planUndoQ: 'Undo the marks and log entries made by this lesson?',
      planDocs: 'Get document', planDelete: 'Delete plan', planMake: 'Create joint plan', planMakeHint: 'Tick students with the boxes on the cards, then create a joint lesson plan', planPickOne: 'Select for a joint lesson plan',
      planJournal: 'Joint lesson ({p}): {n} topics', planStatus: 'Status', planTopics: 'Topic', planCode: 'Code',
      printPlan: 'Joint lesson plan', printPlanD: 'Common missing topics of the selected students and the lesson plan', activity_plan: 'Joint lesson held: {n} students, {k} topics',
    },
    ar: {
      nav_plans: 'البرنامج الدراسي المشترك', planNew: 'برنامج مشترك جديد', planName: 'اسم البرنامج', planNameDef: 'برنامج دراسي مشترك',
      planIntro: 'اختر الطلاب الذين سيحضرون الدروس معاً؛ فتُستخرج المواضيع الناقصة لديهم بترتيب المنهج. وزّع المواضيع على الدروس، وحدّد التواريخ والمدد، واطبع الوثيقة. وعند إقامة الدرس يُحدَّث تقدم الحاضرين تلقائياً.',
      planNoPlans: 'لا توجد برامج مشتركة بعد. ابدأ بـ«برنامج مشترك جديد»، أو حدّد الطلاب في صفحة المتدربين واضغط «إنشاء برنامج مشترك».',
      planPickStudents: 'اختر الطلاب للبرنامج المشترك', planSameProg: 'يمكن أن يضم البرنامج طلاباً من البرنامج التدريبي نفسه.', planNoStudents: 'اختر الطلاب أولاً.',
      selectAll: 'تحديد الكل', selectNone: 'لا شيء',
      planStudents: 'الطلاب', planAddStudents: 'إضافة / إزالة طلاب', planSummary: '{m} موضوعاً ناقصاً مشتركاً · {a} موزعة على الدروس · {l} درساً · {d} دقيقة',
      planMissing: 'المواضيع الناقصة المشتركة', planModeAll: 'ناقص لدى الجميع', planModeAny: 'ناقص لدى واحد على الأقل',
      planModeAllD: 'المواضيع الناقصة لدى جميع الطلاب المختارين (كل من يحتاج الموضوع).', planModeAnyD: 'المواضيع الناقصة لدى طالب واحد على الأقل؛ ويبيّن الرقم عدد من ينقصهم.',
      planMissIn: 'ناقص لدى', planMissShort: 'ناقص', planEveryone: 'الجميع', planNoMissing: 'لا توجد مواضيع ناقصة مشتركة لدى الطلاب المختارين.', planAllAssigned: 'وُزّعت جميع المواضيع الناقصة على الدروس.',
      planExclude: 'إزالة من البرنامج', planExcluded: 'المواضيع المزالة من البرنامج', planRestore: 'إعادة الإضافة',
      planLessons: 'الدروس', planLesson: 'الدرس', planAddLesson: 'إضافة درس', planNoLessons: 'لا توجد دروس بعد. حدّد المواضيع وأضفها إلى درس، أو استخدم «التوزيع التلقائي على الدروس».',
      planLessonTitle: 'عنوان الدرس', planTime: 'الساعة', planMinutes: 'المدة (دقيقة)', planNewLesson: 'إلى درس جديد', planAddSel: 'إضافة المحدد',
      planMoveTo: 'نقل', planBackToPool: 'إزالة من الدرس (يعود إلى المواضيع الناقصة)', planEmptyLesson: 'لم تُضف مواضيع إلى هذا الدرس بعد.', planCustom: 'إضافة موضوع خاص', planDelLesson: 'هل يُحذف هذا الدرس؟ تعود مواضيعه إلى المواضيع الناقصة.',
      planAuto: 'التوزيع التلقائي على الدروس', planAutoHelp: 'تُوزَّع {n} مواضيع على الدروس بالترتيب حسب مدة الدرس، ويمكنك تعديلها بعد ذلك.', planLessonMin: 'مدة الدرس (دقيقة)', planItemMin: 'الوقت لكل موضوع (دقيقة)', planStart: 'تاريخ الدرس الأول', planEvery: 'الأيام بين الدروس', planAutoByModule: 'إبقاء مواضيع الوحدة نفسها في الدرس نفسه قدر الإمكان', planAutoDone: 'أُنشئت الدروس',
      planDone: 'أُقيم الدرس', planDoneQ: 'حدّد الطلاب الحاضرين. تُعلَّم مواضيع الدرس لديهم بـ«درسنا» وتُضاف إلى سجل دروسهم.', planDoneT: 'سُجّل الدرس: حُدّث تقدم {n} طالباً', planDoneTag: 'أُقيم', planPending: 'مخطط',
      planUndo: 'التراجع عن «أُقيم»', planUndoQ: 'هل يُتراجع عن العلامات وقيود السجل التي أضافها هذا الدرس؟',
      planDocs: 'استخراج الوثيقة', planDelete: 'حذف البرنامج', planMake: 'إنشاء برنامج مشترك', planMakeHint: 'حدّد الطلاب بمربعات الاختيار على البطاقات، ثم أنشئ برنامجاً دراسياً مشتركاً', planPickOne: 'تحديد لبرنامج دراسي مشترك',
      planJournal: 'درس مشترك ({p}): {n} مواضيع', planStatus: 'الحالة', planTopics: 'الموضوع', planCode: 'الرمز',
      printPlan: 'البرنامج الدراسي المشترك', printPlanD: 'المواضيع الناقصة المشتركة للطلاب المختارين وخطة الدروس', activity_plan: 'أُقيم درس مشترك: {n} طلاب، {k} مواضيع',
    },
  };
  for (const l of Object.keys(X)) Object.assign(I18N[l], X[l]);
})();
/* v2.1: yönetici iletişimi kanal durumu */
(function () {
  const X = {
    tr: { ctChMail: 'E-posta', ctChApp: 'Uygulama içi gelen kutusu', ctStOk: 'iletildi', ctStAct: 'e-posta kanalı henüz etkinleştirilmemiş', ctStErr: 'gönderilemedi', ctStNoSync: 'bu cihazda senkronizasyon kapalı',
      ctPartT: 'Mesaj kısmen iletildi', ctPart: 'Mesajınız yöneticinin uygulama içi gelen kutusuna ulaştı; e-posta kopyası saklandı ve otomatik olarak yeniden gönderilecek.', ctSavedT: 'Mesaj saklandı', ctSavedAct: 'Mesajınız kaydedildi; e-posta kanalı etkinleştirildiğinde otomatik olarak iletilecek.',
      ctActHelp: 'Yönetici: e-posta kutunuza gelen “FormSubmit – Activate Form” iletisindeki “Activate Form” bağlantısına bir kez tıklayın (gereksiz/spam klasörüne de bakın). Ardından bekleyen mesajlar otomatik gönderilir.', ctRetry: 'Şimdi yeniden dene' },
    en: { ctChMail: 'E-mail', ctChApp: 'In-app inbox', ctStOk: 'delivered', ctStAct: 'the e-mail channel has not been activated yet', ctStErr: 'could not be sent', ctStNoSync: 'synchronisation is off on this device',
      ctPartT: 'Message partly delivered', ctPart: 'Your message reached the administrator’s in-app inbox; the e-mail copy has been saved and will be resent automatically.', ctSavedT: 'Message saved', ctSavedAct: 'Your message has been saved and will be sent automatically once the e-mail channel is activated.',
      ctActHelp: 'Administrator: click the “Activate Form” link once in the “FormSubmit – Activate Form” e-mail in your inbox (check the spam folder too). Pending messages are then sent automatically.', ctRetry: 'Retry now' },
    ar: { ctChMail: 'البريد الإلكتروني', ctChApp: 'صندوق الوارد داخل التطبيق', ctStOk: 'وصلت', ctStAct: 'لم تُفعَّل قناة البريد الإلكتروني بعد', ctStErr: 'تعذّر الإرسال', ctStNoSync: 'المزامنة متوقفة على هذا الجهاز',
      ctPartT: 'وصلت الرسالة جزئياً', ctPart: 'وصلت رسالتك إلى صندوق الوارد الخاص بالمسؤول داخل التطبيق؛ وحُفظت نسخة البريد الإلكتروني وستُعاد محاولة إرسالها تلقائياً.', ctSavedT: 'حُفظت الرسالة', ctSavedAct: 'حُفظت رسالتك وستُرسل تلقائياً عند تفعيل قناة البريد الإلكتروني.',
      ctActHelp: 'إلى المسؤول: انقر مرة واحدة على رابط «Activate Form» في رسالة «FormSubmit – Activate Form» الواردة إلى بريدك (وتحقق من مجلد الرسائل غير المرغوب فيها أيضاً). بعدها تُرسل الرسائل المعلّقة تلقائياً.', ctRetry: 'أعد المحاولة الآن' },
  };
  for (const l of Object.keys(X)) Object.assign(I18N[l], X[l]);
})();
/* v2.2 */
(function () {
  const X = { tr: { ctNewMsgs: 'Yöneticiye {n} yeni mesaj var (Ayarlar → Gelen mesajlar)' }, en: { ctNewMsgs: '{n} new messages for the administrator (Settings → Inbox)' }, ar: { ctNewMsgs: 'لدى المسؤول {n} رسائل جديدة (الإعدادات ← الرسائل الواردة)' } };
  for (const l of Object.keys(X)) Object.assign(I18N[l], X[l]);
})();
/* İngilizce müfredat sürümü: İHA'ya özgü metinlerin karşılıkları ("uçuş hattı" → konuşma görevleri, "uçuş saati" → pratik saati) */
(function () {
  const X = {
    tr: { flightTrack: 'Konuşma görevleri', flightLog: 'Pratik saati kaydı', addFlight: 'Pratik ekle', totalFlight: 'Toplam pratik', printFlight: 'Pratik kayıt formu', printFlightD: 'Konuşma görevleri ve pratik saati kaydı.', flightFormTitle: 'Pratik kayıt formu', gFlight: 'Konuşma görevleri', platform: 'Etkinlik / materyal',
      certText: 'adlı öğrenci, {inst} bünyesinde yürütülen İngilizce Eğitim Müfredatı kapsamında gerekli seviyeleri başarıyla tamamlayarak aşağıdaki seviyeyi almaya hak kazanmıştır.',
      howTo4: 'Her seviyenin sonunda seviye sınavı yapılır; sözlü görev de değerlendirilir.',
      ghostHelpF: 'Bu öğrencinin konuşma görevlerini kişiye özel hâle getirin: kapattığınız görevler bu öğrencide hayalet olur — silinmez; bu öğrencinin çıktılarına ve pratik kaydı seçeneklerine girmez. Genel müfredat ve diğer öğrenciler değişmez.' },
    en: { flightTrack: 'Speaking tasks', flightLog: 'Practice time log', addFlight: 'Add practice', totalFlight: 'Total practice', printFlight: 'Practice record form', printFlightD: 'Speaking tasks and practice time log.', flightFormTitle: 'Practice record form', gFlight: 'Speaking tasks', platform: 'Activity / material',
      certText: 'has successfully completed the required levels of the English Language Curriculum delivered at {inst} and is hereby awarded the following level.',
      howTo4: 'A level exam is held at the end of each level; the speaking task is assessed as well.',
      ghostHelpF: 'Personalise this student’s speaking tasks: tasks you switch off become ghosts for this student only — nothing is deleted; they are left out of this student’s printouts and practice-log options. The general curriculum and other students are unchanged.' },
    ar: { flightTrack: 'مهام المحادثة', flightLog: 'سجل ساعات التدريب', addFlight: 'إضافة تدريب', totalFlight: 'إجمالي التدريب', printFlight: 'نموذج سجل التدريب', printFlightD: 'مهام المحادثة وسجل ساعات التدريب.', flightFormTitle: 'نموذج سجل التدريب', gFlight: 'مهام المحادثة', platform: 'النشاط / المادة',
      certText: 'قد أتمّ بنجاح المستويات المطلوبة ضمن منهج تعليم اللغة الإنجليزية المنفَّذ في {inst}، ويستحق بذلك المستوى التالي.',
      howTo4: 'يُعقد امتحان المستوى في نهاية كل مستوى، وتُقيَّم مهمة المحادثة أيضاً.',
      ghostHelpF: 'خصّص مهام المحادثة لهذا الطالب: المهام التي توقفها تصبح شبحية لهذا الطالب فقط — لا يُحذف شيء؛ ولا تدخل في مطبوعاته ولا في خيارات سجل التدريب. ولا يتغير المنهج العام ولا الطلاب الآخرون.' },
  };
  for (const l of Object.keys(X)) Object.assign(I18N[l], X[l]);
})();
