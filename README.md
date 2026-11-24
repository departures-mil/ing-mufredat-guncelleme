# İngilizce Müfredat Sistemi

CEFR seviyelerine (Pre-A1 – C2) göre İngilizce müfredatı, öğrenci takibi, ölçme-değerlendirme, ders programları, sınav kâğıtları,
dil bilgisi, sözlük, kelime testi ve kurum antetli çıktılar. Windows (kurulum programı) ve Android. Ücretsizdir.

- **İndir:** [Sürümler](https://github.com/departures-mil/ing-mufredat-guncelleme/releases/latest) — `IngMufredat-Setup-X.Y.Z.exe` (Windows),
  `IngMufredat-X.Y.Z-android.apk` (Android). Program sonraki güncellemeleri kendisi bulur ve tek tuşla kurar (yalnızca değişen kısımlar iner).
- **Eşitleme:** kurumun KENDİ ücretsiz Firebase hesabıyla (Ayarlar → Eşitleme; kurallar `firebase/kurum.rules`) ya da internetsiz,
  aynı Wi‑Fi'deki cihazlar arasında. Kayıtlar yalnız cihazlarda ve kurumun kendi hesabında durur; hiçbir kayıt silinmez ya da ezilmez.
- **Yapay zeka:** kendi anahtarınızla (Gemini, OpenAI, Anthropic, Groq, Ollama/LM Studio) ya da çevrimdışı yerleşik danışman.

## Geliştirme
```
npm ci
npm test                    # birim + arayüz (Playwright) + Electron açılış testi
npm start                   # derle ve Electron'da aç
node araclar/ekran.js ekran # ekran görüntüleri
```
Ayrıntılar ve kurallar: [CLAUDE.md](CLAUDE.md). Depo kökündeki `latest.json` ve `paketler/` yalnız eski (≤3.0) kurulumların köprüsüdür.
