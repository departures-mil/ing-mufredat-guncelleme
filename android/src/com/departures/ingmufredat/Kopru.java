package com.departures.ingmufredat;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.departuresmil.ortak.ApkPatchInstaller;
import com.departuresmil.ortak.FcDelta;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Pattern;

/**
 * window.AndroidBridge — tek köprü:
 *  - program (yöntem adları kabuk 3 ile aynı): saveDb / loadDb (files/veri/db.json, atomik), saveFile / openFile (paylaş / aç),
 *    printHtml, httpGet (YALNIZ izinli adresler), openUrl, exitApp, minimize;
 *  - ortak çekirdek (web/js/host.js): appVersion, moveTaskToBack, openExternal, notify (Asistan Agent),
 *    updateBegin / updateChunk / updateFinish (JS'ten gelen yama ya da tam APK) ve apkUpdate(planJson) (YEREL EK: indirme + yama +
 *    kurulum yerelde, ortak ApkPatchInstaller; olaylar window.__fcApk({type:…}) ile);
 *  - Wi‑Fi eşitleme (LanSunucu): lanStart / lanStop / lanState / lanDiscover / lanSync — sonuç window.__ingLanSonuc(id, json).
 * Tüm sürümler aynı anahtarla imzalanır (CI: ANDROID_KEYSTORE_* secret'ları; sertifika 3.0.0 APK'sıyla karşılaştırılır).
 */
final class Kopru {
    static final String AUTHORITY_SUFFIX = ".guncelleme";   // UpdateFileProvider (AndroidManifest.xml)
    /** Kabuk üzerinden GET yalnız bu adreslere (arayüz platform.js ve masaüstü main.js ile aynı liste). */
    static final Pattern HTTP_IZIN = Pattern.compile("^https://(translate\\.googleapis\\.com/translate_a/single\\?|raw\\.githubusercontent\\.com/departures-mil/|api\\.github\\.com/repos/departures-mil/|github\\.com/departures-mil/ing-mufredat-guncelleme/releases/).*");
    private final MainActivity a;
    private final File dbFile;
    private File gelen = null;
    private FileOutputStream gelenOut = null;
    private String gelenTur = "";
    private JSONObject gelenMeta = null;
    private static volatile boolean mesgul = false;

    Kopru(MainActivity a) { this.a = a; this.dbFile = new File(new File(a.getFilesDir(), "veri"), "db.json"); }

    private ApkPatchInstaller kurucu() { return new ApkPatchInstaller(a, a.getPackageName() + AUTHORITY_SUFFIX); }
    private SharedPreferences prefs() { return a.getSharedPreferences("fc_guncelleme", Context.MODE_PRIVATE); }

    // ------------------------------------------------------------------ kayıtlar
    @JavascriptInterface public void saveDb(String json) { try { if (json != null && json.length() > 2) MainActivity.write(dbFile, json.getBytes("UTF-8")); } catch (Exception ignored) { } }
    @JavascriptInterface public String loadDb() {
        for (File f : new File[]{dbFile, new File(dbFile.getPath() + ".bak")}) {
            try { if (f.exists()) { String s = MainActivity.read(f); new JSONObject(s); return s; } } catch (Exception ignored) { }
        }
        return null;
    }

    // ------------------------------------------------------------------ dosyalar
    private File paylasDosyasi(String name, String b64) throws Exception {
        File f = new File(new File(a.getCacheDir(), "paylas"), String.valueOf(name).replaceAll("[\\\\/:*?\"<>|]+", "_"));
        MainActivity.write(f, Base64.decode(b64, Base64.DEFAULT));
        return f;
    }
    private void paylas(File f, String mimeType, boolean view) {
        Uri u = Files.uri(f);
        Intent i = new Intent(view ? Intent.ACTION_VIEW : Intent.ACTION_SEND);
        if (view) i.setDataAndType(u, mimeType); else { i.setType(mimeType); i.putExtra(Intent.EXTRA_STREAM, u); }
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        a.startActivity(view ? i : Intent.createChooser(i, f.getName()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }
    @JavascriptInterface public String saveFile(String name, String b64, String mimeType) {
        try { File f = paylasDosyasi(name, b64); a.ui.post(() -> { try { paylas(f, mimeType, false); } catch (Exception ignored) { } }); return f.getName(); }
        catch (Exception e) { return "ERR " + e.getMessage(); }
    }
    @JavascriptInterface public String openFile(String name, String b64, String mimeType) {
        try {
            File f = paylasDosyasi(name, b64);
            String m = mimeType == null || mimeType.isEmpty() ? "*/*" : mimeType;
            a.ui.post(() -> { try { paylas(f, m, true); } catch (Exception e) { try { paylas(f, m, false); } catch (Exception ignored) { } } });
            return "OK";
        } catch (Exception e) { return "ERR " + e.getMessage(); }
    }
    @JavascriptInterface public void printHtml(final String html, final String title) {
        a.ui.post(() -> {
            final WebView w = new WebView(a);
            w.getSettings().setJavaScriptEnabled(false);
            w.setWebViewClient(new WebViewClient() {
                @Override public void onPageFinished(WebView v, String url) {
                    PrintManager pm = (PrintManager) a.getSystemService(Context.PRINT_SERVICE);
                    PrintDocumentAdapter ad = v.createPrintDocumentAdapter(title);
                    pm.print(title, ad, new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
                }
            });
            w.loadDataWithBaseURL(MainActivity.ORIGIN, html, "text/html", "utf-8", null);
        });
    }
    /** Yalnız izinli adresler (çeviri hizmeti, bu kuruluşun GitHub depoları); diğerleri null. */
    @JavascriptInterface public String httpGet(String url) {
        if (url == null || !HTTP_IZIN.matcher(url).matches()) return null;
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(url).openConnection();
            c.setConnectTimeout(15000); c.setReadTimeout(30000);
            c.setRequestProperty("User-Agent", "IngMufredat-Android");
            if (c.getResponseCode() != 200) return null;
            return new String(MainActivity.readAll(c.getInputStream()), "UTF-8");
        } catch (Exception e) { return null; } finally { if (c != null) c.disconnect(); }
    }
    @JavascriptInterface public void openUrl(String url) { a.disAc(url); }
    @JavascriptInterface public void exitApp() { a.ui.post(a::finishAndRemoveTask); }
    @JavascriptInterface public void minimize() { a.ui.post(() -> a.moveTaskToBack(true)); }

    // ------------------------------------------------------------------ ortak çekirdek
    @JavascriptInterface public String appVersion() {
        try { return a.getPackageManager().getPackageInfo(a.getPackageName(), 0).versionName; } catch (Exception e) { return ""; }
    }
    @JavascriptInterface public void moveTaskToBack() { a.ui.post(() -> a.moveTaskToBack(true)); }
    @JavascriptInterface public void openExternal(String url) { if (url != null && url.startsWith("https://")) a.disAc(url); }
    @JavascriptInterface public void notify(String title, String body) {
        try {
            NotificationManager nm = (NotificationManager) a.getSystemService(Context.NOTIFICATION_SERVICE);
            Notification.Builder b;
            if (Build.VERSION.SDK_INT >= 26) {
                nm.createNotificationChannel(new NotificationChannel("asistan", "Asistan Agent", NotificationManager.IMPORTANCE_DEFAULT));
                b = new Notification.Builder(a, "asistan");
            } else b = new Notification.Builder(a);
            Intent i = new Intent(a, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            android.app.PendingIntent pi = android.app.PendingIntent.getActivity(a, 0, i, Build.VERSION.SDK_INT >= 23 ? android.app.PendingIntent.FLAG_IMMUTABLE : 0);
            nm.notify(999997, b.setSmallIcon(R.drawable.ic).setContentTitle(title).setContentText(body)
                    .setStyle(new Notification.BigTextStyle().bigText(body)).setContentIntent(pi).setAutoCancel(true).build());
        } catch (Exception ignored) { }
    }

    @JavascriptInterface public synchronized boolean updateBegin(String kind, String metaJson) {
        try {
            kapat();
            gelenTur = "patch".equals(kind) ? "patch" : "full";
            gelenMeta = new JSONObject(metaJson == null ? "{}" : metaJson);
            gelen = new File(kurucu().updatesDir(), "patch".equals(gelenTur) ? "update.patch" : "incoming.apk");
            gelenOut = new FileOutputStream(gelen);
            return true;
        } catch (Exception e) { return false; }
    }
    @JavascriptInterface public synchronized boolean updateChunk(String b64) {
        try { gelenOut.write(Base64.decode(b64, Base64.DEFAULT)); return true; } catch (Exception e) { return false; }
    }
    @JavascriptInterface public synchronized String updateFinish() {
        try {
            gelenOut.close(); gelenOut = null;
            String want = gelenMeta.optString("targetSha256", "");
            File out = new File(kurucu().updatesDir(), "update.apk");
            if ("patch".equals(gelenTur)) {
                FcDelta.Header h = FcDelta.apply(new File(a.getApplicationInfo().sourceDir), gelen, out, null);
                if (!want.isEmpty() && !want.equalsIgnoreCase(h.dstSha256Hex())) throw new IOException("BAD_HASH");
            } else {
                if (!want.isEmpty() && !want.equalsIgnoreCase(FcDelta.hex(FcDelta.sha256(gelen)))) throw new IOException("BAD_HASH");
                if (out.exists()) out.delete();
                if (!gelen.renameTo(out)) throw new IOException("MOVE_FAILED");
            }
            kur(out);
            return "{\"ok\":true}";
        } catch (Exception e) {
            return "{\"ok\":false,\"error\":" + JSONObject.quote(String.valueOf(e.getMessage())) + "}";
        } finally {
            if (gelen != null && gelen.getName().equals("update.patch")) gelen.delete();
            kapat();
        }
    }
    private void kapat() { if (gelenOut != null) try { gelenOut.close(); } catch (IOException ignored) { } gelenOut = null; }

    /** YEREL EK: indirme + yama + kurulum yerelde (CORS yok, büyük dosya JS'e taşınmaz). */
    @JavascriptInterface public void apkUpdate(String planJson) {
        if (mesgul) { olay("{\"type\":\"error\",\"error\":\"BUSY\"}"); return; }
        mesgul = true;
        new Thread(() -> {
            try {
                JSONObject p = new JSONObject(planJson);
                JSONObject full = p.getJSONObject("full");
                JSONObject patch = p.optJSONObject("patch");
                File apk = kurucu().obtainApk(full.getString("url"), full.getString("sha256"), full.optLong("size", 0),
                        patch != null ? patch.optString("url", null) : null, patch != null ? patch.optString("sha256", null) : null,
                        patch != null ? patch.optLong("size", 0) : 0,
                        new ApkPatchInstaller.Listener() {
                            @Override public void onProgress(boolean patchMode, long done, long total, double bps) {
                                olay("{\"type\":\"progress\",\"patch\":" + patchMode + ",\"done\":" + done + ",\"total\":" + total + "}");
                            }
                            @Override public void onPatchFailed(Exception e) {
                                olay("{\"type\":\"patchFailed\",\"error\":" + JSONObject.quote(String.valueOf(e.getMessage())) + "}");
                            }
                        });
                olay("{\"type\":\"installing\"}");
                kur(apk);
                olay("{\"type\":\"done\",\"result\":\"done\"}");
            } catch (Exception e) {
                olay("{\"type\":\"error\",\"error\":" + JSONObject.quote(String.valueOf(e.getMessage())) + "}");
            } finally { mesgul = false; }
        }).start();
    }
    private void kur(File apk) {
        a.ui.post(() -> { boolean ok = kurucu().install(apk); prefs().edit().putBoolean("installPending", !ok).apply(); });
    }
    /** onResume: "bilinmeyen kaynaklar" izni verildiyse bekleyen kurulumu sürdür. */
    void bekleyenKurulum() {
        if (!prefs().getBoolean("installPending", false)) return;
        File apk = new File(kurucu().updatesDir(), "update.apk");
        if (!apk.exists()) { prefs().edit().putBoolean("installPending", false).apply(); return; }
        if (Build.VERSION.SDK_INT >= 26 && !a.getPackageManager().canRequestPackageInstalls()) return;
        kur(apk);
    }
    /** Açılışta: yeni sürüm açıldıysa önceki güncelleme dosyalarını sil. */
    void guncellendiyseTemizle() {
        String v = appVersion();
        if (!v.equals(prefs().getString("lastVersion", ""))) {
            if (!mesgul) kurucu().cleanup();
            prefs().edit().putString("lastVersion", v).putBoolean("installPending", false).apply();
        }
    }
    private void olay(String json) { a.js("window.__fcApk && window.__fcApk(" + json + ")"); }

    // ------------------------------------------------------------------ Wi‑Fi eşitleme
    private void sonuc(int id, String json) { a.js("window.__ingLanSonuc && window.__ingLanSonuc(" + id + "," + JSONObject.quote(json) + ")"); }
    private void arkada(int id, java.util.concurrent.Callable<String> is) {
        new Thread(() -> { String r; try { r = is.call(); } catch (Exception e) { r = hata(e); } sonuc(id, r); }).start();
    }
    static String hata(Exception e) { try { return new JSONObject().put("ok", false).put("error", String.valueOf(e.getMessage())).toString(); } catch (Exception x) { return "{\"ok\":false}"; } }
    @JavascriptInterface public void lanStart(int id) { arkada(id, () -> { a.lan.baslat(); return a.lan.durum().put("ok", true).toString(); }); }
    @JavascriptInterface public void lanStop(int id) { arkada(id, () -> { a.lan.durdur(); return a.lan.durum().put("ok", true).toString(); }); }
    @JavascriptInterface public void lanState(int id) { arkada(id, () -> a.lan.durum().toString()); }
    @JavascriptInterface public void lanDiscover(int id) { arkada(id, () -> new JSONObject().put("ok", true).put("found", a.lan.bul()).toString()); }
    @JavascriptInterface public void lanSync(int id, String host, String pin, String json) {
        arkada(id, () -> new JSONObject().put("ok", true).put("data", a.lan.esitle(host, pin, json)).toString());
    }
}
