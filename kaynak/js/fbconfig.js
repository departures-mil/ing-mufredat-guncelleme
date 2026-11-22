/* 2.2: Programla gelen ortak Firebase projesi KALDIRILDI — her kurum kendi ücretsiz Firebase hesabını kullanır.
   FB_YAYIN yalnızca yöneticinin yedek güncelleme kanalı ve eski ortak projeden geçiş içindir. */
window.FB_CONFIG = {};
window.FB_REHBER = 'https://github.com/departures-mil/duyurular/blob/main/firebase-kurulum.md';
window.FB_YAYIN = {
  apiKey: 'AIzaSyDRLeBB2OC95Wg4LxpMfr4szGSKiLdhpRM',
  authDomain: 'mufredat-bc0ad.firebaseapp.com',
  projectId: 'mufredat-bc0ad',
  storageBucket: 'mufredat-bc0ad.firebasestorage.app',
  messagingSenderId: '190936103930',
  appId: '1:190936103930:web:6ab3bfedb61ecc7aee4243',
};
window.FB_ADMIN_EMAIL = 'qa757939@gmail.com';
/* Kabuk sürümü: masaüstü/Android kabuğunun desteklediği güncelleme arayüzü */
window.MIN_SHELL_FOR_THIS_BUNDLE = 2;
/* v2.0: GitHub güncelleme kanalı (herkese açık depo) */
window.UPD_GH = { owner: 'departures-mil', repo: 'ing-mufredat-guncelleme', branch: 'main' };
/* v2.4.0: güncelleme paketi imza anahtarları (Ed25519, açık anahtar). Liste doluysa yalnız bu anahtarlarla imzalanmış paket kurulur.
   Gizli anahtar yalnız yöneticinin bilgisayarındadır (araclar/anahtar_uret.py). */
window.UPD_KEYS = [];
