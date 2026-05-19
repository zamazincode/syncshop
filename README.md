# 🛍️ SyncShop — Realtime AI-Powered Collaborative Shopping Assistant

> **Alışverişi link çöplüğünden kurtarın; birlikte arayın, AI ile ortak karar verin.**

SyncShop, arkadaşlarınız veya ailenizle birlikte internetten alışveriş yapma sürecini (hediye seçimi, ev alışverişi vb.) WhatsApp link çöplüğünden kurtarıp; **gerçek zamanlı, çok oyunculu (multiplayer) ve yapay zeka moderatörlüğünde** premium bir deneyime dönüştüren bir Chrome eklentisi ve socket server ekosistemidir.

---

## ✨ Öne Çıkan Özellikler

### 1. Multiplayer Cursors (Gerçek Zamanlı Mouse İmleçleri) 🖱️💨
Aynı ürün sayfasında olan kullanıcılar birbirlerinin mouse imleçlerini ve hareketlerini ekranlarında anlık olarak görür.
- **Akıllı Çözünürlük Eşitleme:** Her kullanıcının ekran boyutu farklı olabileceği için koordinatlar X ekseninde yüzdelik (`pageX / width`), Y ekseninde ise mutlak piksel (`pageY`) olarak normalize edilir.
- **Süper Akıcı Çizim:** React render döngüleri bypass edilerek tarayıcının yerel çizim döngüsü olan `requestAnimationFrame` ve CSS `transform: translate` kullanılmıştır. İmleçler saniyede 20 kare (50ms) veri akışı ile sıfır gecikmeyle hareket eder.

### 2. Canlı Oda ve Ekran Senkronizasyonu 🔗
- Odadaki arkadaşınızın hangi e-ticaret sitesinde hangi ürünü incelediğini anlık olarak görün.
- "Yanına Git" (Işınlan) butonuna tek tıklamayla arkadaşınızın baktığı ürün sayfasına saniyeler içinde geçiş yapın.

### 3. Manuel Ürün Koleksiyonu & Mikro-Animasyonlar ➕📦
- Ürün sayfalarında gezerken rahatsız edici otomatik ekleme yapılmaz. Ürün algılandığında beliren yeşil **"Koleksiyona Ekle"** butonuna basılarak tamamen manuel ve kontrollü olarak ekleme yapılır.
- Ekleme yapıldığında butonda büyüme, dönen onay işareti (✓) ve "Eklendi!" yazan şık mikro-animasyonlar oynatılır.
- Koleksiyon sekmesinden ürünleri anında kaldırabilmek için **Çöp Kutusu (🗑️)** entegrasyonu mevcuttur.

### 4. AI Seçim Asistanı & Tavsiye Sihirbazı 🤖💬
- Koleksiyon ekranındaki **"AI'dan Seçim Asistanı İste"** butonuyla alışveriş kararlarınızı yapay zekaya danışın.
- Bot gruptan ideal bütçe, kullanım amacı ve kime hediye alınacağı bilgilerini ister.
- Kullanıcıların gruptaki beğeni oylarına (👍/👎), fiyat/performans verilerine bakarak en uygun ürünü gerekçeleriyle birlikte chat paneline yazar.

### 5. Akıllı Bağlantı & Yenileme Koruması 🔌
- Sayfa yenilemelerinde (F5) socket bağlantısı kopsa dahi **5 saniyelik grace period (bekleme süresi)** sayesinde oda kirlenmez, kullanıcı "ayrıldı/katıldı" mesajı spamlanmadan kesintisiz alışverişe devam eder.

---

## 🛠️ Teknolojik Altyapı

### Frontend (Chrome Extension)
- **Framework:** React + Vite + Vanilla CSS (Glassmorphism & Neon UI Aesthetics).
- **Socket Client:** Socket.IO-client.
- **Custom Build Pipeline:** Chrome'un Content Script'lerde ES Module kısıtlaması nedeniyle özel yazılmış **IIFE Bundle Script** (Vite compile & static copy orchestrator).

### Backend (Socket & Rest Server)
- **Core:** Bun / Node.js + Express.js.
- **Realtime:** Socket.IO (Room management & real-time messaging).
- **Yapay Zeka:** Adapter Pattern ile tasarlanmış **Provider-Agnostic AI Client**. 
  - Geliştirme (Dev) ortamında hızlı ve bütçe dostu **Groq Llama-3.3-70b-versatile**.
  - Production ortamında yüksek zekalı **Google Gemini-2.0-flash**.
- **Database:** Supabase (PostgreSQL) - Session, Product ve Chat geçmişi yönetimi.

---

## 🚀 Kurulum ve Çalıştırma

### 1. Server Kurulumu
```bash
cd server
# Bağımlılıkları yükle
bun install  # veya npm install

# .env dosyasını oluşturup gerekli keyleri ekleyin
# GEMINI_API_KEY, AI_API_KEY (Groq), SUPABASE_URL, SUPABASE_ANON_KEY

# Geliştirme sunucusunu başlat
bun run dev
```

### 2. Extension Kurulumu
```bash
cd extension
# Bağımlılıkları yükle
bun install

# Extension'ı derle (IIFE modunda dist/ klasörüne çıkarır)
bun run build
```
- Tarayıcınızda `chrome://extensions` adresine gidin.
- Sağ üstteki **"Geliştirici modu"** (Developer mode) seçeneğini aktif edin.
- Sol üstteki **"Paketlenmemiş eklenti yükle"** (Load unpacked) butonuna basın.
- `extension/dist` klasörünü seçip yükleyin.

---

## 🎨 Tasarım Standartları
- **Glassmorphism:** Yarı saydam, arka planı buzlu cam efekti veren modern sidebar tasarımı.
- **Neon Accent:** Koyu tema üzerinde hayat bulan, kullanıcıyı yormayan neon yeşil, mavi ve mor renk paletleri.
- **Micro-interactions:** Butonların üzerine gelindiğinde (hover) veya tıklandığında (click) kullanıcıyı ödüllendiren akıcı animasyonlar.
