/* Sabit ayarlar. Program ortak bir Firebase projesiyle gelmez: her kurum kendi ücretsiz Firebase hesabını kullanır
   (Ayarlar → Eşitleme; rehber FB_REHBER). FB_YAYIN yalnız 2.2 öncesinin ortak projesini tanımak içindir: o projeye bağlı
   kalmış cihazların eşitlemesi kapatılır ve kendi projelerini bağlamaları istenir (kayıtlar cihazda kalır). */
window.FB_CONFIG = {};
window.FB_REHBER = 'https://github.com/departures-mil/duyurular/blob/main/firebase-kurulum.md';
window.FB_YAYIN = { projectId: 'mufredat-bc0ad' };
window.FB_ADMIN_EMAIL = 'qa757939@gmail.com';
