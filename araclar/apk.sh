#!/usr/bin/env bash
# İngilizce Müfredat Android APK (Gradle'sız: aapt2 + javac + d8 + zipalign + apksigner).
#   bash araclar/apk.sh            → cikti/IngMufredat-<sürüm>.apk (sürüm ve versionCode araclar/surum.js'ten)
# Android SDK: $ANDROID_TOOLS (bt/<sürüm>/, pf/android-35/) ya da $ANDROID_HOME / $ANDROID_SDK_ROOT (build-tools/, platforms/).
# İmza: ANDROID_KEYSTORE (dosya) + ANDROID_KEYSTORE_PASS [+ ANDROID_KEY_ALIAS (yoksa keystore'daki ilk takma ad) + ANDROID_KEY_PASS].
# Anahtar yoksa APK_IMZASIZ=1 ile yalnız derleme denenir. TÜM sürümler AYNI anahtarla imzalanmalı
# (C:\Claude Programlarım\_Anahtarlar\IngMufredat\ingmufredat.jks); başka anahtarla kurulu uygulama güncellenmez.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SURUM="$(node -p "require('$ROOT/araclar/surum.js').version()")"
KOD="$(node -p "const s=require('$ROOT/araclar/surum.js');s.versionCode(s.version())")"
node "$ROOT/araclar/derle.js" --yalniz-www >/dev/null

if [ -n "${ANDROID_TOOLS:-}" ]; then
  BT="$(ls -d "$ANDROID_TOOLS"/bt/*/ | sort -V | tail -1)"; PF="$ANDROID_TOOLS/pf"
else
  SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"; [ -n "$SDK" ] || { echo "Android SDK yok (ANDROID_TOOLS / ANDROID_HOME)"; exit 2; }
  BT="$(ls -d "$SDK"/build-tools/*/ | sort -V | tail -1)"; PF="$SDK/platforms"
fi
JAR="$PF/android-35/android.jar"; [ -f "$JAR" ] || JAR="$(ls "$PF"/android-*/android.jar | sort -V | tail -1)"
echo "build-tools: $BT  platform: $JAR"

B="$ROOT/.derleme/android"; OUT="$ROOT/cikti"
rm -rf "$B"; mkdir -p "$B/assets" "$B/gen" "$B/classes" "$OUT"
cp -r "$ROOT/.derleme/www" "$B/assets/www"
sed -e "s/@VERSION_CODE@/$KOD/" -e "s/@VERSION_NAME@/$SURUM/" "$ROOT/android/AndroidManifest.xml" > "$B/AndroidManifest.xml"
"$BT/aapt2" compile --dir "$ROOT/android/res" -o "$B/res.zip"
"$BT/aapt2" link -o "$B/base.apk" -I "$JAR" --manifest "$B/AndroidManifest.xml" -R "$B/res.zip" \
  --java "$B/gen" -A "$B/assets" --min-sdk-version 24 --target-sdk-version 30 --auto-add-overlay -0 gz -0 wasm -0 woff2
javac -nowarn --release 8 -encoding UTF-8 -classpath "$JAR" -d "$B/classes" $(find "$ROOT/android/src" "$B/gen" -name '*.java') 2>&1 | grep -v '^warning\|^Note:\|^Picked up\|warning$' || true
ls "$B/classes/com/departures/ingmufredat/MainActivity.class" "$B/classes/com/departures/ingmufredat/LanSunucu.class" "$B/classes/com/departuresmil/ortak/ApkPatchInstaller.class" >/dev/null
"$BT/d8" --release --min-api 24 --lib "$JAR" --output "$B" $(find "$B/classes" -name '*.class')
(cd "$B" && cp base.apk unsigned.apk && zip -q -j -X unsigned.apk classes.dex)
"$BT/zipalign" -f -p 4 "$B/unsigned.apk" "$B/aligned.apk"

KS="${ANDROID_KEYSTORE:-}"; PW="${ANDROID_KEYSTORE_PASS:-}"; AL="${ANDROID_KEY_ALIAS:-}"
if [ -z "$KS" ]; then
  [ -n "${APK_IMZASIZ:-}" ] || { echo "İmza anahtarı yok (ANDROID_KEYSTORE)"; exit 3; }
  cp "$B/aligned.apk" "$OUT/IngMufredat-$SURUM-imzasiz.apk"; echo "İMZASIZ: $OUT/IngMufredat-$SURUM-imzasiz.apk"; exit 0
fi
if [ -z "$AL" ]; then
  AL="$(keytool -list -keystore "$KS" -storepass "$PW" 2>/dev/null | grep -iE 'PrivateKeyEntry|anahtar' | head -1 | cut -d, -f1 | tr -d '\r')"
  [ -n "$AL" ] || AL="$(keytool -list -v -keystore "$KS" -storepass "$PW" 2>/dev/null | grep -m1 -E '^(Alias name|Takma ad)' | sed 's/^[^:]*: *//' | tr -d '\r')"
  [ -n "$AL" ] || { echo "Keystore'da takma ad bulunamadı"; exit 4; }
  echo "Takma ad: $AL"
fi
"$BT/apksigner" sign --ks "$KS" --ks-key-alias "$AL" --ks-pass "pass:$PW" --key-pass "pass:${ANDROID_KEY_PASS:-$PW}" \
  --out "$OUT/IngMufredat-$SURUM.apk" "$B/aligned.apk"
"$BT/apksigner" verify "$OUT/IngMufredat-$SURUM.apk"
echo "Tamam: $OUT/IngMufredat-$SURUM.apk (versionName $SURUM, versionCode $KOD)"
