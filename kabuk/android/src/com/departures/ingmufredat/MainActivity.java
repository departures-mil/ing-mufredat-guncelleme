package com.departures.ingmufredat;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Base64;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * İngilizce Müfredat — Android kabuğu (v3). Arayüz https://ing.local/ adresinden sunulur:
 * önce uygulama içi güncelleme klasörü (files/ota/<sürüm>), eksik dosya için APK içindeki assets/ui.
 * Köprü (window.AndroidBridge) masaüstündeki window.desktop ile aynı işleri yapar.
 */
public class MainActivity extends Activity {
    static final int SHELL = 3;
    static final String HOST = "https://ing.local/";
    WebView web;
    final Handler ui = new Handler(Looper.getMainLooper());
    File otaDir, dbFile;
    String activeVer, bundled;

    // ------------------------------------------------------------------ OTA durumu
    static int vnum(String v) {
        try { String[] p = String.valueOf(v).split("\\."); return Integer.parseInt(p[0]) * 1000 + (p.length > 1 ? Integer.parseInt(p[1]) : 0); } catch (Exception e) { return 0; }
    }
    JSONObject state() { try { return new JSONObject(read(new File(otaDir, "state.json"))); } catch (Exception e) { return new JSONObject(); } }
    void saveState(JSONObject o) { try { otaDir.mkdirs(); write(new File(otaDir, "state.json"), o.toString().getBytes("UTF-8")); } catch (Exception ignored) {} }
    boolean otaOk(String v) { return v != null && !v.isEmpty() && new File(new File(otaDir, v), "index.html").exists(); }

    void resolveUi() {
        activeVer = bundled;
        JSONObject st = state();
        try {
            for (int g = 0; g < 3; g++) {
                String cur = st.optString("current", "");
                if (!(otaOk(cur) && vnum(cur) > vnum(bundled))) return;
                if (st.optBoolean("pending")) {
                    if (st.optInt("tries") >= 1) {
                        st.put("bad", cur);
                        String prev = st.optString("previous", "");
                        st.put("current", !prev.isEmpty() && !prev.equals(cur) ? prev : JSONObject.NULL);
                        st.put("previous", JSONObject.NULL); st.put("pending", false); st.put("tries", 0); saveState(st); continue;
                    }
                    st.put("tries", st.optInt("tries") + 1); saveState(st);
                }
                activeVer = cur;
                return;
            }
        } catch (Exception ignored) {}
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        otaDir = new File(getFilesDir(), "ota");
        dbFile = new File(new File(getFilesDir(), "veri"), "db.json");
        try { bundled = new JSONObject(new String(readAll(getAssets().open("ui/version.json")), "UTF-8")).optString("version", "2.400"); } catch (Exception e) { bundled = "2.400"; }
        resolveUi();
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);   // Wi‑Fi eşitleme: yerel ağdaki bilgisayara http
        s.setTextZoom(100);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (!"ing.local".equals(u.getHost())) return null;
                String p = u.getPath();
                if (p == null || p.equals("/") || p.isEmpty()) p = "/index.html";
                p = p.replace("..", "");
                try {
                    InputStream in = null;
                    if (!activeVer.equals(bundled)) {
                        File f = new File(new File(otaDir, activeVer), p.substring(1));
                        if (f.isFile()) in = new FileInputStream(f);
                    }
                    if (in == null) in = getAssets().open("ui" + p);
                    return new WebResourceResponse(mime(p), mime(p).startsWith("text") || p.endsWith(".js") ? "utf-8" : null, in);
                } catch (Exception e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not found", null, null);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                String u = r.getUrl().toString();
                if (u.startsWith(HOST)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(u))); } catch (Exception ignored) {}
                return true;
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                try { v.evaluateJavascript(new String(readAll(getAssets().open("enjekte.js")), "UTF-8"), null); } catch (Exception ignored) {}
            }
        });
        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        setContentView(web);
        web.loadUrl(HOST + "index.html");
    }

    @Override
    public boolean onKeyDown(int code, KeyEvent e) {
        if (code == KeyEvent.KEYCODE_BACK) {
            web.evaluateJavascript("(function(){var x=document.querySelector('.kb-wrap,.modal-bg,.modal .x,.modal [data-x]');if(x){x.remove?x.remove():x.click();return '1'}if(document.body.classList.contains('nav-open')){document.body.classList.remove('nav-open');return '1'}return '0'})()",
                    v -> { if (!"\"1\"".equals(v)) moveTaskToBack(true); });
            return true;
        }
        return super.onKeyDown(code, e);
    }

    static String mime(String p) {
        p = p.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".wasm")) return "application/wasm";
        if (p.endsWith(".gz")) return "application/gzip";
        if (p.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    static byte[] readAll(InputStream in) throws Exception {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        byte[] b = new byte[16384]; int r;
        while ((r = in.read(b)) > 0) o.write(b, 0, r);
        in.close();
        return o.toByteArray();
    }
    static String read(File f) throws Exception { return new String(readAll(new FileInputStream(f)), "UTF-8"); }
    static void write(File f, byte[] b) throws Exception {
        f.getParentFile().mkdirs();
        File t = new File(f.getPath() + ".tmp");
        FileOutputStream o = new FileOutputStream(t); o.write(b); o.close();
        if (f.exists()) { File bak = new File(f.getPath() + ".bak"); bak.delete(); f.renameTo(bak); }
        t.renameTo(f);
    }
    static void rm(File f) { if (f.isDirectory()) { File[] l = f.listFiles(); if (l != null) for (File c : l) rm(c); } f.delete(); }

    void share(File f, String mimeType, boolean view) {
        Uri u = Files.uri(f);
        Intent i = new Intent(view ? Intent.ACTION_VIEW : Intent.ACTION_SEND);
        if (view) i.setDataAndType(u, mimeType); else { i.setType(mimeType); i.putExtra(Intent.EXTRA_STREAM, u); }
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(view ? i : Intent.createChooser(i, f.getName()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    // ------------------------------------------------------------------ köprü
    class Bridge {
        @JavascriptInterface public void saveDb(String json) { try { write(dbFile, json.getBytes("UTF-8")); } catch (Exception ignored) {} }
        @JavascriptInterface public String loadDb() {
            for (File f : new File[]{dbFile, new File(dbFile.getPath() + ".bak")}) {
                try { if (f.exists()) { String s = read(f); new JSONObject(s); return s; } } catch (Exception ignored) {}
            }
            return null;
        }
        @JavascriptInterface public String saveFile(String name, String b64, String mimeType) {
            try {
                File f = new File(new File(getCacheDir(), "paylas"), name.replaceAll("[\\\\/:*?\"<>|]+", "_"));
                write(f, Base64.decode(b64, Base64.DEFAULT));
                ui.post(() -> { try { share(f, mimeType, false); } catch (Exception ignored) {} });
                return f.getName();
            } catch (Exception e) { return "ERR " + e.getMessage(); }
        }
        @JavascriptInterface public String openFile(String name, String b64, String mimeType) {
            try {
                File f = new File(new File(getCacheDir(), "paylas"), name.replaceAll("[\\\\/:*?\"<>|]+", "_"));
                write(f, Base64.decode(b64, Base64.DEFAULT));
                String m = mimeType == null || mimeType.isEmpty() ? "*/*" : mimeType;
                ui.post(() -> { try { share(f, m, true); } catch (Exception e) { try { share(f, m, false); } catch (Exception ignored) {} } });
                return "OK";
            } catch (Exception e) { return "ERR " + e.getMessage(); }
        }
        @JavascriptInterface public void printHtml(final String html, final String title) {
            ui.post(() -> {
                final WebView w = new WebView(MainActivity.this);
                w.setWebViewClient(new WebViewClient() {
                    @Override public void onPageFinished(WebView v, String url) {
                        PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        PrintDocumentAdapter ad = v.createPrintDocumentAdapter(title);
                        pm.print(title, ad, new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
                    }
                });
                w.loadDataWithBaseURL(HOST, html, "text/html", "utf-8", null);
            });
        }
        @JavascriptInterface public String httpGet(String url) {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(15000); c.setReadTimeout(30000);
                if (c.getResponseCode() != 200) return null;
                return new String(readAll(c.getInputStream()), "UTF-8");
            } catch (Exception e) { return null; }
        }
        @JavascriptInterface public void openUrl(String url) { ui.post(() -> { try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) {} }); }
        @JavascriptInterface public void exitApp() { ui.post(() -> finishAndRemoveTask()); }
        @JavascriptInterface public void minimize() { ui.post(() -> moveTaskToBack(true)); }

        // ---------------- OTA (masaüstüyle aynı)
        @JavascriptInterface public String otaInfo() {
            try { return new JSONObject().put("shell", SHELL).put("bundled", bundled).put("active", activeVer).put("state", state()).toString(); } catch (Exception e) { return "{}"; }
        }
        @JavascriptInterface public String otaBegin(String v) {
            if (!v.matches("\\d+\\.\\d+")) return "ERR surum";
            File d = new File(otaDir, v + ".tmp"); rm(d); d.mkdirs(); return "OK";
        }
        @JavascriptInterface public String otaWrite(String v, String rel, String b64) {
            try {
                if (rel.contains("..")) return "ERR yol";
                write(new File(new File(otaDir, v + ".tmp"), rel), Base64.decode(b64, Base64.DEFAULT));
                return "OK";
            } catch (Exception e) { return "ERR " + e.getMessage(); }
        }
        @JavascriptInterface public String otaCommit(String v) {
            try {
                File t = new File(otaDir, v + ".tmp"), d = new File(otaDir, v);
                if (!new File(t, "index.html").exists()) return "ERR paket eksik";
                rm(d); t.renameTo(d);
                JSONObject st = state();
                st.put("previous", activeVer.equals(bundled) ? JSONObject.NULL : activeVer);
                st.put("current", v); st.put("pending", true); st.put("tries", 0); st.put("bad", JSONObject.NULL);
                saveState(st);
                return "OK";
            } catch (Exception e) { return "ERR " + e.getMessage(); }
        }
        @JavascriptInterface public void otaBootOk() {
            try {
                JSONObject st = state();
                if (st.optBoolean("pending") && activeVer.equals(st.optString("current"))) { st.put("pending", false); st.put("tries", 0); saveState(st); }
                File[] l = otaDir.listFiles();
                if (l != null) for (File f : l) {
                    String n = f.getName();
                    if (n.equals("state.json") || n.equals(st.optString("current")) || n.equals(st.optString("previous"))) continue;
                    rm(f);
                }
            } catch (Exception ignored) {}
        }
        @JavascriptInterface public void otaRestart() { ui.post(() -> recreate()); }
    }
}
