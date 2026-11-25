/* Sabit ayarlar. Program ortak bir Firebase projesiyle gelmez: her kurum kendi ücretsiz Firebase hesabını kullanır
   (Ayarlar → Eşitleme; rehber FB_REHBER). FB_YAYIN yalnız 2.2 öncesinin ortak projesini tanımak içindir: o projeye bağlı
   kalmış cihazların eşitlemesi kapatılır ve kendi projelerini bağlamaları istenir (kayıtlar cihazda kalır). */
window.FB_CONFIG = {};
window.FB_REHBER = 'https://github.com/departures-mil/duyurular/blob/main/firebase-kurulum.md';
window.FB_YAYIN = { projectId: 'mufredat-bc0ad' };
// Yönetici hesabı programda açık yazılmaz: yalnız küçük harfli e-postanın SHA-256 özeti tutulur.
window.FB_ADMIN_HASH = 'b1acd212aa26e8d1a66302ca74cf125228fea1e0cf805377ddcaabb5278722c1';
