; İngilizce Müfredat Sistemi — NSIS eki (electron-builder nsis.include).
; Eski taşınabilir kabuk (v2–v3) kendini aynı klasöre (%LOCALAPPDATA%\Programs\Ing Mufredat Sistemi) "resources\app" klasörü
; olarak kopyalıyordu. Electron "resources\app"i "resources\app.asar"dan ÖNCE yüklediği için o klasör kalırsa eski kabuk açılır.
; Kurulumdan sonra silinir. Kayıtlar orada DEĞİL, %APPDATA%\IngMufredatSistemi içindedir; ona dokunulmaz.
!macro customInstall
  RMDir /r "$INSTDIR\resources\app"
  Delete "$INSTDIR\resources\app.asar.bak"
!macroend
