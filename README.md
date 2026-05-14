# SyncShop (AI Destekli Ortak Alışveriş Asistanı)

Alışverişi link çöplüğünden kurtarın; birlikte arayın, AI ile karar verin.

## Projenin Amacı

İnsanların arkadaşlarıyla veya aileleriyle internetten ortak bir hediye ya da ürün seçme süreci genellikle WhatsApp üzerinden bitmek bilmeyen bir "link atma" ve "bunu beğendin mi?" karmaşasına dönüşür. SyncShop, bu süreci e-ticaret sitelerinin ilk aşamada Trendyol üzerine binen, gerçek zamanlı ve yapay zeka moderatörlüğünde çok oyunculu bir deneyime dönüştürür.

## Temel Akış ve Özellikler

### 1. Odaya Katılım ve Bağlam Algılama

- Kullanıcılar eklentiye tıklayarak "Kullanıcı Adı" ve "Oda Adı" (Session ID) girer.
- Ekranda sağ alt köşeye şık ve minimalist bir sohbet (chat) penceresi entegre edilir.
- AI Context Check: Oturum başladığında AI, aktif sekmenin URL'ini kontrol eder. Eğer kullanıcı Trendyol'daysa sohbeti otomatik başlatır: "Hoş geldiniz! Görüyorum ki Trendyol'dasınız. Bugün ne arıyoruz, size ve odadaki arkadaşlarınıza nasıl yardımcı olabilirim?"

### 2. Gerçek Zamanlı Senkronizasyon

- Odada bulunan bir kullanıcı Trendyol'da spesifik bir ürün sayfasına girdiğinde, chat penceresinin üst kısmında bir bildirim çıkar: "Ahmet şu an 'X Marka Kulaklık' ürününe bakıyor."
- Kullanıcılar bu bildirime veya "Yanına Git" butonuna tıklayarak saniyeler içinde arkadaşının incelediği ürün sayfasına ışınlanır.

### 3. @ai Komutları ve Akıllı Kürasyon

- Sohbet penceresinde kullanıcılar kendi aralarında mesajlaşabilirler.
- Asistana ihtiyaç duyduklarında @ai etiketiyle komut verebilirler.
- Örnek: @ai Anneme anneler günü için maksimum 1500 TL bandında mutfak veya kozmetik hediyeleri önerir misin?
- AI, bu isteği işler ve chat ekranına tıklanabilir, görseli olan şık ürün kartlarından oluşan bir liste atar.

### 4. Ortak Karar Mekanizması

- AI'ın sunduğu veya kullanıcıların kendi bulup chat'e düşürdüğü ürünlerin altında 👍 (Beğen) ve 👎 (Geç) butonları bulunur.
- AI moderasyonu arka planda bu oylamaları dinler. Oda üyelerinin ortak beğendiği ürünleri yakaladığında araya girer:
    - "🎉 Harika! İkiniz de [Ürün A] ve [Ürün B]'yi beğendiniz. Kararınızı verdiniz mi, yoksa alternatif aramaya devam edelim mi?" diyerek satın alma sürecini hızlandırır.

## Faz 2

Hackathon sonrasında veya projenin ileri aşamalarında eklenecek özellikler:

- Canlı İmleç (Live Cursors): Kullanıcılar aynı ürün sayfasındayken, birbirlerinin mouse hareketlerini seçtikleri özel ikonlar (avatar) şeklinde ekranda anlık olarak görebilecek. Bu sayede "Şu detaya baksana" diyerek ürünün belirli bir noktasını işaret edebilecekler.
- Platform Bağımsız Çalışma: Sadece Trendyol değil, Amazon, Hepsiburada gibi diğer e-ticaret devlerinde de çapraz site (cross-site) senkronizasyonu sağlanması.
- Sepet Birleştirme: Ortak karar verilen ürünlerin, API entegrasyonlarıyla tek bir tıklama ile seçilen kullanıcının sepetine eklenmesi.

## Tavsiye Edilen Teknik Mimari

Bu kadar anlık (real-time) veri akışının olduğu bir projede gecikmeyi (latency) en aza indirmek çok önemlidir.

- Frontend (Eklenti): React.js veya Vanilla JS (DOM manipülasyonu ve chat widget'ı için).
- Backend ve Real-time İletişim: Node.js üzerinde, gereksiz soyutlamalardan kaçınmak ve tam kontrol sağlamak için socket.io yerine native WebSockets (ws) kullanımı. Bu, jüriye altyapıya olan hakimiyeti göstermek açısından da çok şık bir hamle olur.
- AI Entegrasyonu: LangChain veya doğrudan OpenAI/Gemini API ile ürün önerisi ve chat moderasyonu.
