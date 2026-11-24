package com.departures.ingmufredat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Wi‑Fi (aynı ağ) eşitleme — Android taşıması (sunucu + istemci). Birleştirme arayüzdedir (kaynak/js/temel/lan.js, window.__ingLanIn).
 * Protokol v2, masaustu/lan-sunucu.js ile birebir (test/birim/lan-protokol.test.js iki uygulamayı da aynı vektörlerle denetler):
 *   anahtar = SHA-256("ingmufredat-lan-v2|" + kod); GET /ing2/ping → {app, v:2, ad, meydan};
 *   POST /ing2/esitle  X-Ing-Meydan, X-Ing-Nonce, X-Ing-Imza = hex(HMAC-SHA256(anahtar, "ESITLE\n"+meydan+"\n"+nonce+"\n"+hex(SHA-256(gövde))))
 *   yanıt X-Ing-Imza = hex(HMAC-SHA256(anahtar, "YANIT\n"+meydan+"\n"+nonce+"\n"+hex(SHA-256(yanıt)))).
 * Meydan tek kullanımlık (2 dk); 5 yanlış imzada kod değişir, bekleme kapanır; Origin başlıklı istek reddedilir; gövde ≤ 64 MB.
 */
final class LanSunucu {
    static final int PORT = 47851;
    static final String ONEK = "ingmufredat-lan-v2|";
    static final int AZAMI = 64 * 1024 * 1024;
    static final long MEYDAN_OMUR = 2 * 60 * 1000;
    static final int YANLIS_SINIR = 5;
    private final MainActivity a;
    private final SecureRandom rnd = new SecureRandom();
    private ServerSocket sunucu;
    private volatile String pin;
    private volatile boolean kilit = false, mesgul = false;
    private int yanlis = 0;
    private final Map<String, Long> meydanlar = new LinkedHashMap<>();

    LanSunucu(MainActivity a) { this.a = a; }

    // ------------------------------------------------------------------ şifreleme
    static byte[] sha(byte[] b) throws Exception { return MessageDigest.getInstance("SHA-256").digest(b); }
    static String hex(byte[] b) { StringBuilder s = new StringBuilder(); for (byte x : b) s.append(String.format(Locale.ROOT, "%02x", x & 0xff)); return s.toString(); }
    static byte[] anahtar(String pin) throws Exception { return sha((ONEK + pin).getBytes(StandardCharsets.UTF_8)); }
    static String hmac(byte[] k, String s) throws Exception { Mac m = Mac.getInstance("HmacSHA256"); m.init(new SecretKeySpec(k, "HmacSHA256")); return hex(m.doFinal(s.getBytes(StandardCharsets.UTF_8))); }
    static String imzaIstek(byte[] k, String meydan, String nonce, byte[] govde) throws Exception { return hmac(k, "ESITLE\n" + meydan + "\n" + nonce + "\n" + hex(sha(govde))); }
    static String imzaYanit(byte[] k, String meydan, String nonce, byte[] govde) throws Exception { return hmac(k, "YANIT\n" + meydan + "\n" + nonce + "\n" + hex(sha(govde))); }
    static boolean esit(String x, String y) { return MessageDigest.isEqual(x.getBytes(StandardCharsets.UTF_8), y.getBytes(StandardCharsets.UTF_8)); }
    private String rastgeleHex(int n) { byte[] b = new byte[n]; rnd.nextBytes(b); return hex(b); }
    private String yeniPin() { return String.valueOf(100000 + rnd.nextInt(900000)); }

    // ------------------------------------------------------------------ durum
    static List<String> ipler() {
        List<String> out = new ArrayList<>();
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress ad : Collections.list(ni.getInetAddresses())) {
                    String h = ad.getHostAddress();
                    if (ad instanceof Inet4Address && (h.startsWith("192.168.") || h.startsWith("10.") || h.matches("^172\\.(1[6-9]|2\\d|3[01])\\..*"))) out.add(h);
                }
            }
        } catch (Exception ignored) { }
        return out;
    }
    synchronized JSONObject durum() throws Exception {
        JSONArray ips = new JSONArray(); for (String s : ipler()) ips.put(s);
        return new JSONObject().put("hosting", sunucu != null).put("pin", sunucu != null ? pin : JSONObject.NULL).put("ips", ips).put("port", PORT).put("kilit", kilit);
    }
    static String cihazAdi() { String m = android.os.Build.MODEL; return m == null ? "Android" : m; }

    // ------------------------------------------------------------------ sunucu
    synchronized void baslat() throws Exception {
        durdur();
        pin = yeniPin(); yanlis = 0; kilit = false; meydanlar.clear();
        ServerSocket ss = new ServerSocket();
        ss.setReuseAddress(true);
        ss.bind(new InetSocketAddress(PORT));
        sunucu = ss;
        Thread t = new Thread(() -> {
            while (!ss.isClosed()) {
                try { Socket s = ss.accept(); new Thread(() -> isle(s)).start(); } catch (Exception e) { break; }
            }
        }, "ing-lan");
        t.setDaemon(true); t.start();
    }
    synchronized void durdur() { if (sunucu != null) try { sunucu.close(); } catch (Exception ignored) { } sunucu = null; meydanlar.clear(); }

    private synchronized String meydanVer() {
        long now = System.currentTimeMillis();
        for (Iterator<Map.Entry<String, Long>> it = meydanlar.entrySet().iterator(); it.hasNext(); ) if (it.next().getValue() < now) it.remove();
        while (meydanlar.size() >= 64) { Iterator<String> it = meydanlar.keySet().iterator(); it.next(); it.remove(); }
        String m = rastgeleHex(16); meydanlar.put(m, now + MEYDAN_OMUR); return m;
    }
    private synchronized boolean meydanAl(String m) { Long t = meydanlar.remove(m); return t != null && t >= System.currentTimeMillis(); }

    private static String satir(InputStream in) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream(); int c;
        while ((c = in.read()) >= 0) { if (c == '\n') break; if (c != '\r') b.write(c); if (b.size() > 8192) throw new Exception("satir"); }
        return b.toString("UTF-8");
    }
    private static void yaz(OutputStream o, int kod, String durum, byte[] govde, Map<String, String> ek) throws Exception {
        StringBuilder h = new StringBuilder("HTTP/1.1 " + kod + " " + durum + "\r\nContent-Type: application/json; charset=utf-8\r\nCache-Control: no-store\r\nConnection: close\r\nContent-Length: " + govde.length + "\r\n");
        if (ek != null) for (Map.Entry<String, String> e : ek.entrySet()) h.append(e.getKey()).append(": ").append(e.getValue()).append("\r\n");
        h.append("\r\n");
        o.write(h.toString().getBytes(StandardCharsets.UTF_8)); o.write(govde); o.flush();
    }
    private static void json(OutputStream o, int kod, JSONObject j) throws Exception { yaz(o, kod, kod == 200 ? "OK" : "Error", j.toString().getBytes(StandardCharsets.UTF_8), null); }

    private void isle(Socket s) {
        try (Socket so = s) {
            so.setSoTimeout(120000);
            InputStream in = so.getInputStream(); OutputStream o = so.getOutputStream();
            String[] ilk = satir(in).split(" ");
            if (ilk.length < 2) return;
            String yontem = ilk[0], yol = ilk[1].split("\\?")[0];
            Map<String, String> bas = new java.util.HashMap<>();
            for (String l; !(l = satir(in)).isEmpty(); ) { int i = l.indexOf(':'); if (i > 0) bas.put(l.substring(0, i).trim().toLowerCase(Locale.ROOT), l.substring(i + 1).trim()); }
            if (bas.containsKey("origin")) { json(o, 403, new JSONObject().put("hata", "origin")); return; }
            if ("GET".equals(yontem) && "/ing2/ping".equals(yol)) { json(o, 200, new JSONObject().put("app", "ingmufredat").put("v", 2).put("ad", cihazAdi()).put("meydan", meydanVer())); return; }
            if ("/ing-ping".equals(yol)) { json(o, 200, new JSONObject().put("app", "ingmufredat").put("v", 2)); return; }
            if ("/ing-esitle".equals(yol)) { json(o, 426, new JSONObject().put("hata", "eski-surum")); return; }
            if (!"POST".equals(yontem) || !"/ing2/esitle".equals(yol)) { json(o, 404, new JSONObject().put("hata", "yok")); return; }
            if (kilit || pin == null) { json(o, 423, new JSONObject().put("hata", "kilitli")); return; }
            if (mesgul) { json(o, 409, new JSONObject().put("hata", "mesgul")); return; }
            String meydan = bas.getOrDefault("x-ing-meydan", ""), nonce = bas.getOrDefault("x-ing-nonce", ""), imza = bas.getOrDefault("x-ing-imza", "");
            if (!meydan.matches("[0-9a-f]{32}") || !nonce.matches("[0-9a-f]{16,64}") || !imza.matches("[0-9a-f]{64}")) { json(o, 400, new JSONObject().put("hata", "baslik")); return; }
            int boy; try { boy = Integer.parseInt(bas.getOrDefault("content-length", "-1")); } catch (Exception e) { boy = -1; }
            if (boy < 0 || boy > AZAMI) { json(o, 413, new JSONObject().put("hata", "boyut")); return; }
            byte[] govde = new byte[boy]; int n = 0;
            while (n < boy) { int r = in.read(govde, n, boy - n); if (r < 0) return; n += r; }
            byte[] k = anahtar(pin);
            boolean meydanOk = meydanAl(meydan);
            if (!meydanOk || !esit(imza, imzaIstek(k, meydan, nonce, govde))) {
                synchronized (this) {
                    yanlis++;
                    if (yanlis >= YANLIS_SINIR) { kilit = true; pin = yeniPin(); json(o, 423, new JSONObject().put("hata", "kilitli")); durdur(); return; }
                }
                json(o, 401, new JSONObject().put("hata", meydanOk ? "imza" : "meydan")); return;
            }
            yanlis = 0; mesgul = true;
            try {
                byte[] yanit = arayuzeVer(new String(govde, StandardCharsets.UTF_8)).getBytes(StandardCharsets.UTF_8);
                Map<String, String> ek = new java.util.HashMap<>(); ek.put("X-Ing-Imza", imzaYanit(k, meydan, nonce, yanit));
                yaz(o, 200, "OK", yanit, ek);
            } catch (Exception e) {
                json(o, 500, new JSONObject().put("hata", String.valueOf(e.getMessage())));
            } finally { mesgul = false; }
        } catch (Exception ignored) { }
    }

    /** Gelen veriyi arayüze verir (UI iş parçacığı), arayüzün birleştirmeden önceki verisini döndürür. */
    private String arayuzeVer(String metin) throws Exception {
        CountDownLatch l = new CountDownLatch(1);
        AtomicReference<String> r = new AtomicReference<>(null);
        String js = "(function(){try{return window.__ingLanIn?window.__ingLanIn(" + JSONObject.quote(metin) + "):null}catch(e){return null}})()";
        a.ui.post(() -> a.web.evaluateJavascript(js, v -> { r.set(v); l.countDown(); }));
        if (!l.await(90, TimeUnit.SECONDS)) throw new Exception("zaman");
        String v = r.get();
        if (v == null || "null".equals(v)) throw new Exception("arayuz");
        return new JSONArray("[" + v + "]").getString(0);   // evaluateJavascript sonucu JSON dizgesi olarak gelir
    }

    // ------------------------------------------------------------------ istemci
    private static final class Yanit { int kod; Map<String, List<String>> bas; byte[] govde; }
    private static Yanit istek(String url, String yontem, byte[] govde, Map<String, String> bas, int zaman) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        try {
            c.setConnectTimeout(Math.min(zaman, 5000)); c.setReadTimeout(zaman); c.setUseCaches(false); c.setRequestMethod(yontem);
            c.setRequestProperty("Content-Type", "application/json");
            if (bas != null) for (Map.Entry<String, String> e : bas.entrySet()) c.setRequestProperty(e.getKey(), e.getValue());
            if (govde != null) { c.setDoOutput(true); c.setFixedLengthStreamingMode(govde.length); try (OutputStream o = c.getOutputStream()) { o.write(govde); } }
            Yanit y = new Yanit(); y.kod = c.getResponseCode(); y.bas = c.getHeaderFields();
            InputStream in = y.kod >= 400 ? c.getErrorStream() : c.getInputStream();
            y.govde = in == null ? new byte[0] : MainActivity.readAll(in);
            return y;
        } finally { c.disconnect(); }
    }
    private static String baslik(Yanit y, String ad) {
        for (Map.Entry<String, List<String>> e : y.bas.entrySet()) if (e.getKey() != null && e.getKey().equalsIgnoreCase(ad) && !e.getValue().isEmpty()) return e.getValue().get(0);
        return "";
    }

    String esitle(String host, String p, String metin) throws Exception {
        host = String.valueOf(host).trim(); p = String.valueOf(p).trim();
        if (!host.matches("[0-9A-Za-z.\\-]{1,64}")) throw new Exception("unreachable");
        String taban = "http://" + host + ":" + PORT;
        Yanit ping;
        try { ping = istek(taban + "/ing2/ping", "GET", null, null, 4000); } catch (Exception e) { throw new Exception("unreachable"); }
        JSONObject pj; try { pj = new JSONObject(new String(ping.govde, StandardCharsets.UTF_8)); } catch (Exception e) { throw new Exception("unreachable"); }
        if (ping.kod != 200 || !"ingmufredat".equals(pj.optString("app"))) throw new Exception("unreachable");
        if (pj.optInt("v") < 2 || pj.optString("meydan").isEmpty()) throw new Exception("eski-surum");
        String meydan = pj.getString("meydan"), nonce = rastgeleHex(16);
        byte[] k = anahtar(p), govde = metin.getBytes(StandardCharsets.UTF_8);
        Map<String, String> bas = new java.util.HashMap<>();
        bas.put("X-Ing-Meydan", meydan); bas.put("X-Ing-Nonce", nonce); bas.put("X-Ing-Imza", imzaIstek(k, meydan, nonce, govde));
        Yanit y;
        try { y = istek(taban + "/ing2/esitle", "POST", govde, bas, 180000); } catch (Exception e) { throw new Exception("unreachable"); }
        if (y.kod == 401) throw new Exception("pin");
        if (y.kod == 423) throw new Exception("kilitli");
        if (y.kod == 426) throw new Exception("eski-surum");
        if (y.kod != 200) { String h = ""; try { h = new JSONObject(new String(y.govde, StandardCharsets.UTF_8)).optString("hata"); } catch (Exception ignored) { } throw new Exception(h.isEmpty() ? "http " + y.kod : h); }
        if (!esit(baslik(y, "X-Ing-Imza"), imzaYanit(k, meydan, nonce, y.govde))) throw new Exception("imza");
        return new String(y.govde, StandardCharsets.UTF_8);
    }

    JSONArray bul() {
        List<String> hosts = new ArrayList<>(); List<String> mine = ipler();
        for (String ip : mine) { String b = ip.substring(0, ip.lastIndexOf('.')); for (int i = 1; i < 255; i++) { String h = b + "." + i; if (!mine.contains(h) && !hosts.contains(h)) hosts.add(h); } }
        JSONArray found = new JSONArray();
        ExecutorService ex = Executors.newFixedThreadPool(40);
        for (String h : hosts) ex.execute(() -> {
            try {
                Yanit y = istek("http://" + h + ":" + PORT + "/ing2/ping", "GET", null, null, 700);
                JSONObject j = new JSONObject(new String(y.govde, StandardCharsets.UTF_8));
                if (y.kod == 200 && "ingmufredat".equals(j.optString("app")) && j.optInt("v") >= 2) synchronized (found) { found.put(new JSONObject().put("host", h).put("ad", j.optString("ad"))); }
            } catch (Exception ignored) { }
        });
        ex.shutdown();
        try { ex.awaitTermination(40, TimeUnit.SECONDS); } catch (Exception ignored) { }
        return found;
    }
}
