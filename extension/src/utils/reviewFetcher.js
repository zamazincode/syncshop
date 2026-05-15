/**
 * SyncShop — Trendyol Review Fetcher
 *
 * Trendyol'un public API'sinden ürün yorumlarını çeker.
 * Neden bu var?
 * - Trendyol sayfasındaki DOM'dan yorum kazımak kırılgan
 * - Trendyol'un kendi API'si yapılandırılmış JSON döndürür
 * - 4 farklı sıralama ile çekeriz: En kötü, en iyi, nötr, yararlı
 *   → AI'a dengeli bir veri seti veririz, sadece olumlu veya olumsuz değil
 *
 * TOKEN EKONOMİSİ: Gemini'ye gönderilecek yorum sayısını ve uzunluğunu
 * sınırlıyoruz. Fazla veri = fazla token = fazla maliyet + yavaş yanıt.
 */

/**
 * Trendyol API JSON'undan yorumları çıkarır.
 * API farklı nested yapılar kullanabiliyor, bu yüzden recursive arama yaparız.
 */
function extractFromJSON(text) {
  try {
    const data = JSON.parse(text);
    const results = [];

    function search(obj) {
      if (Array.isArray(obj)) {
        for (const item of obj) search(item);
      } else if (obj && typeof obj === 'object') {
        if (obj.comment && typeof obj.comment === 'string' && obj.comment.length > 5) {
          const rate = obj.rate || obj.rating || obj.star || 5;

          // Tarih yakalama
          let date = obj.commentDateStr || obj.reviewDate || obj.creationDate || '';
          const ts = obj.createdAt || obj.commentDate;
          if (ts && typeof ts === 'number') {
            const d = new Date(ts);
            date = `${d.getDate()} ${d.toLocaleString('tr-TR', { month: 'long' })} ${d.getFullYear()}`;
          }

          results.push({
            text: obj.comment,
            rating: Number(rate),
            date: String(date),
            id: obj.id,
          });
        }
        for (const key in obj) search(obj[key]);
      }
    }

    search(data);
    return results;
  } catch {
    return [];
  }
}

/**
 * Trendyol API'sinden ürün yorumlarını demokratik dağılımla çeker.
 *
 * @param {string} productUrl - Ürün sayfası URL'i (-p-123456 içermeli)
 * @param {number} productRating - Ürünün genel puanı (kota dağılımı için)
 * @returns {Array} Yorumlar dizisi
 */
export async function fetchTrendyolReviews(productUrl, productRating = 4.5) {
  try {
    // URL'den contentId çıkar: /.../-p-752356123 → 752356123
    const match = productUrl.match(/-p-(\d+)/);
    if (!match) throw new Error('Content ID bulunamadı.');
    const contentId = match[1];

    // 4 farklı sıralama ile API'ye istek at
    const baseUrl = `https://apigw.trendyol.com/discovery-storefront-trproductgw-service/api/review-read/product-reviews/detailed?contentId=${contentId}&page=0&pageSize=30&channelId=1`;

    const urls = {
      worst: `${baseUrl}&order=ASC&orderBy=Rate`,
      best: `${baseUrl}&order=DESC&orderBy=Rate`,
      neutral: `${baseUrl}&rates=3`,
      helpful: `${baseUrl}&orderBy=Confidance`,
    };

    // Paralel fetch — 4 istek aynı anda gider
    const responses = await Promise.all(
      Object.values(urls).map((url) => fetch(url).then((r) => r.text()).catch(() => ''))
    );

    const [textWorst, textBest, textNeutral, textHelpful] = responses;

    // Tüm yorumları topla ve tekilleştir
    const rawPool = [
      ...extractFromJSON(textWorst),
      ...extractFromJSON(textBest),
      ...extractFromJSON(textNeutral),
    ];

    const seenIds = new Set();
    const seenText = new Set();
    const allComments = [];

    rawPool.forEach((c) => {
      const cleanText = c.text.trim();
      if (!seenIds.has(c.id) && !seenText.has(cleanText)) {
        seenIds.add(c.id);
        seenText.add(cleanText);
        allComments.push(c);
      }
    });

    // Yıldızlara göre grupla
    const grouped = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    allComments.forEach((c) => grouped[c.rating]?.push(c));

    // Puana göre demokratik kota dağılımı
    const rating = Number(productRating) || 4.5;
    let positiveQuota, neutralQuota, negativeQuota;

    if (rating >= 4.5)      { positiveQuota = 11; neutralQuota = 2; negativeQuota = 2; }
    else if (rating >= 4.0) { positiveQuota = 8;  neutralQuota = 4; negativeQuota = 3; }
    else if (rating >= 3.0) { positiveQuota = 5;  neutralQuota = 5; negativeQuota = 5; }
    else if (rating >= 2.0) { positiveQuota = 3;  neutralQuota = 4; negativeQuota = 8; }
    else                    { positiveQuota = 1;  neutralQuota = 2; negativeQuota = 12; }

    // Kotaları doldur
    const comments = [];

    function fillQuota(targetBuckets, quota) {
      let needed = quota;
      while (needed > 0) {
        let taken = 0;
        for (const bucket of targetBuckets) {
          if (grouped[bucket]?.length > 0 && needed > 0) {
            comments.push(grouped[bucket].shift());
            needed--;
            taken++;
          }
        }
        if (taken === 0) break;
      }
      return needed;
    }

    const leftoverPos = fillQuota([5, 4], positiveQuota);
    const leftoverNeu = fillQuota([3], neutralQuota);
    const leftoverNeg = fillQuota([1, 2], negativeQuota);

    // Kalan boşlukları doldurmaya çalış
    const totalLeftover = leftoverPos + leftoverNeu + leftoverNeg;
    if (totalLeftover > 0) fillQuota([5, 4, 3, 2, 1], totalLeftover);

    // + Yararlı bulunan yorumlardan rastgele 10 tane ekle
    const helpfulReviews = extractFromJSON(textHelpful)
      .sort(() => 0.5 - Math.random())
      .slice(0, 10);
    comments.push(...helpfulReviews);

    return comments.length > 0 ? comments : [];
  } catch (e) {
    console.error('[ReviewFetcher] Error:', e.message);
    return [];
  }
}
