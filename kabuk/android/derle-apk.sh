#!/usr/bin/env bash
# İngilizce Müfredat Android kabuğu (v3) — aapt2 + d8, Gradle'sız.
#   ANAHTAR_KLASORU=<C:\Claude Programlarım\_Anahtarlar\IngMufredat kopyası> UI=<kaynak klasörü> bash derle-apk.sh <sürüm> <kod> <çıktı.apk>
set -euo pipefail
SURUM="$1"; KOD="$2"; OUT="$3"
HERE="$(cd "$(dirname "$0")" && pwd)"; SDK="${ANDROID_TOOLS:-/home/claude/tools}"
BT="$(ls -d "$SDK"/bt/*/ | head -1)"; JAR="$SDK/pf/android-35/android.jar"
K="${ANAHTAR_KLASORU:?}"; UI="${UI:?}"
B="$(mktemp -d)"; trap 'rm -rf "$B"' EXIT
mkdir -p "$B/assets" "$B/gen" "$B/cls"
cp -r "$UI" "$B/assets/ui"; cp "$HERE/../enjekte.js" "$B/assets/"
[ -f "$B/assets/ui/version.json" ] || echo "{\"version\":\"$(grep -o "APP_VERSION='[^']*'" "$UI/js/version.js" | cut -d"'" -f2)\"}" > "$B/assets/ui/version.json"
sed -e "s/@VERSION_CODE@/$KOD/" -e "s/@VERSION_NAME@/$SURUM/" "$HERE/AndroidManifest.xml" > "$B/AndroidManifest.xml"
"$BT/aapt2" compile --dir "$HERE/res" -o "$B/res.zip"
"$BT/aapt2" link -o "$B/base.apk" -I "$JAR" --manifest "$B/AndroidManifest.xml" -R "$B/res.zip" --java "$B/gen" -A "$B/assets" \
  --min-sdk-version 24 --target-sdk-version 30 --auto-add-overlay -0 gz -0 wasm
javac -nowarn --release 8 -encoding UTF-8 -classpath "$JAR" -d "$B/cls" $(find "$HERE/src" "$B/gen" -name '*.java') 2>&1 | grep -v "^Picked up\|^warning\|^Note:\|warning$" || true
"$BT/d8" --release --min-api 24 --lib "$JAR" --output "$B" $(find "$B/cls" -name '*.class')
(cd "$B" && cp base.apk u.apk && zip -q -j u.apk classes.dex)
"$BT/zipalign" -f -p 4 "$B/u.apk" "$B/a.apk"
PW="$(tr -d '\r\n' < "$K/sifre.txt")"
"$BT/apksigner" sign --ks "$K/ingmufredat.jks" --ks-key-alias ingmufredat --ks-pass "pass:$PW" --key-pass "pass:$PW" --out "$OUT" "$B/a.apk"
"$BT/apksigner" verify "$OUT" && ls -la "$OUT"
