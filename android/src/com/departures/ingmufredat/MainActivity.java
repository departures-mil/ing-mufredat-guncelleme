package com.departures.ingmufredat;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

/**
 * İngilizce Müfredat — Android kabuğu (3.1). Arayüz https://ing.local/ adresinden sunulur (APK içindeki assets/www).
 * Kayıtlar bu kökenin localStorage/IndexedDB'sinde ve files/veri/db.json'da — köken ve paket adı DEĞİŞMEZ (3.0.0 ile aynı).
 * 3.1: güncelleme ortak çekirdekle (GitHub Releases latest.json → kurulu APK + FCD1 yama → yeni APK, olmazsa tam APK).
 * Eski kabuğun uygulama içi arayüz güncellemeleri (files/ota) artık kullanılmaz; ilk açılışta silinir (yalnız arayüz dosyaları).
 * github.com/departures-mil/ing-mufredat-guncelleme/releases/… istekleri (latest.json) yerelde çekilip CORS başlığıyla verilir.
 */
public class MainActivity extends Activity {
    static final String HOST = "ing.local";
    static final String ORIGIN = "https://ing.local/";
    static final int REQ_FILE = 10;
    WebView web;
    Kopru kopru;
    LanSunucu lan;
    final Handler ui = new Handler(Looper.getMainLooper());
    ValueCallback<Uri[]> dosyaGeri;

    void js(String code) { ui.post(() -> { if (web != null) web.evaluateJavascript(code, null); }); }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        new Thread(() -> rm(new File(getFilesDir(), "ota"))).start();
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);   // Wi‑Fi eşitleme Java tarafında; sayfa http'ye gitmez
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(false);
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (dosyaGeri != null) dosyaGeri.onReceiveValue(null);
                dosyaGeri = cb;
                try {
                    Intent i = p.createIntent();
                    if (p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(i, REQ_FILE);
                    return true;
                } catch (Exception e) { dosyaGeri = null; return false; }
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (!HOST.equals(u.getHost())) return githubVekil(r);
                String p = u.getPath();
                if (p == null || p.equals("/") || p.isEmpty()) p = "/index.html";
                if (p.contains("..")) return yok();
                try {
                    InputStream in = getAssets().open("www" + Uri.decode(p));
                    String m = mime(p);
                    WebResourceResponse res = new WebResourceResponse(m, m.startsWith("text") || m.endsWith("javascript") || m.endsWith("json") ? "utf-8" : null, in);
                    Map<String, String> h = new HashMap<>(); h.put("Cache-Control", "no-cache"); res.setResponseHeaders(h);
                    return res;
                } catch (Exception e) { return yok(); }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                if (HOST.equals(r.getUrl().getHost())) return false;
                disAc(r.getUrl().toString());
                return true;
            }
        });
        kopru = new Kopru(this);
        lan = new LanSunucu(this);
        web.addJavascriptInterface(kopru, "AndroidBridge");
        kopru.guncellendiyseTemizle();
        setContentView(web);
        web.loadUrl(ORIGIN + "index.html");
    }

    @Override
    protected void onResume() { super.onResume(); if (kopru != null) kopru.bekleyenKurulum(); }

    @Override
    protected void onDestroy() { if (lan != null) lan.durdur(); super.onDestroy(); }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != REQ_FILE || dosyaGeri == null) return;
        dosyaGeri.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
        dosyaGeri = null;
    }

    @Override
    public boolean onKeyDown(int code, KeyEvent e) {
        if (code == KeyEvent.KEYCODE_BACK) {
            web.evaluateJavascript("(function(){try{var x=document.querySelector('.modal-backdrop .modal-header button');if(x){x.click();return '1'}if(window.__onBack&&window.__onBack())return '1'}catch(e){}return '0'})()",
                    v -> { if (!"\"1\"".equals(v)) moveTaskToBack(true); });
            return true;
        }
        return super.onKeyDown(code, e);
    }

    void disAc(String url) {
        if (url == null || !(url.startsWith("https://") || url.startsWith("http://") || url.startsWith("mailto:") || url.startsWith("tel:"))) return;
        ui.post(() -> { try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) { } });
    }

    /** Güncelleme bildirimi (latest.json) yalnız bu deponun sürüm sayfasından; CORS başlığıyla verilir. */
    private WebResourceResponse githubVekil(WebResourceRequest req) {
        Uri u = req.getUrl();
        String p = u.getPath();
        if (!"GET".equalsIgnoreCase(req.getMethod()) || !"https".equals(u.getScheme()) || !"github.com".equals(u.getHost())
                || p == null || !p.startsWith("/departures-mil/ing-mufredat-guncelleme/releases/")) return null;
        Map<String, String> h = new HashMap<>();
        h.put("Access-Control-Allow-Origin", ORIGIN.substring(0, ORIGIN.length() - 1));
        h.put("Cache-Control", "no-store");
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(u.toString()).openConnection();
            c.setInstanceFollowRedirects(true);
            c.setConnectTimeout(15000); c.setReadTimeout(30000); c.setUseCaches(false);
            c.setRequestProperty("User-Agent", "IngMufredat-Android");
            int code = c.getResponseCode();
            InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
            if (in == null) in = new java.io.ByteArrayInputStream(new byte[0]);
            String msg = c.getResponseMessage();
            return new WebResourceResponse(p.endsWith(".json") ? "application/json" : "application/octet-stream", "utf-8", code,
                    msg == null || msg.isEmpty() ? (code < 400 ? "OK" : "Error") : msg, h, in);
        } catch (Exception e) {
            return new WebResourceResponse("text/plain", "utf-8", 502, "Bad Gateway", h, new java.io.ByteArrayInputStream(new byte[0]));
        }
    }

    static WebResourceResponse yok() { return new WebResourceResponse("text/plain", "utf-8", 404, "Not found", null, null); }

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
        if (p.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    static byte[] readAll(InputStream in) throws Exception {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        byte[] b = new byte[65536]; int r;
        while ((r = in.read(b)) > 0) o.write(b, 0, r);
        in.close();
        return o.toByteArray();
    }
    static String read(File f) throws Exception { return new String(readAll(new FileInputStream(f)), "UTF-8"); }
    /** Atomik yazma: .tmp → yeniden adlandırma; önceki dosya .bak olarak kalır. */
    static void write(File f, byte[] b) throws Exception {
        f.getParentFile().mkdirs();
        File t = new File(f.getPath() + ".tmp");
        FileOutputStream o = new FileOutputStream(t);
        o.write(b); o.getFD().sync(); o.close();
        if (f.exists()) { File bak = new File(f.getPath() + ".bak"); bak.delete(); f.renameTo(bak); }
        if (!t.renameTo(f)) throw new java.io.IOException("rename");
    }
    static void rm(File f) { if (f == null || !f.exists()) return; if (f.isDirectory()) { File[] l = f.listFiles(); if (l != null) for (File c : l) rm(c); } f.delete(); }
}
