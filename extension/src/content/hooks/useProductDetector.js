import { useEffect, useRef } from 'react';
import { extractProduct } from '../../utils/extractors.js';
import { fetchTrendyolReviews } from '../../utils/reviewFetcher.js';

/**
 * useProductDetector — Otomatik Ürün Algılama
 *
 * Bu hook, kullanıcı Trendyol/Hepsiburada'da gezinirken:
 * 1. Her 2 saniyede URL'yi kontrol eder
 * 2. Ürün sayfasındaysa, sayfa DOM'undan ürün bilgisini çıkarır
 * 3. Ürün daha önce session'a eklenmemişse otomatik ekler
 * 4. Browsing update gönderir (diğer kullanıcılar görsün)
 *
 * Neden setInterval? Trendyol bir SPA (Single Page Application).
 * URL değiştiğinde sayfa yeniden yüklenmez, sadece içerik değişir.
 * MutationObserver da kullanılabilir ama setInterval daha basit ve güvenilir.
 */

export function useProductDetector({ connected, session, addProduct, sendBrowsingUpdate }) {
  const lastAddedUrlRef = useRef('');

  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(async () => {
      const product = extractProduct();

      // Browsing update gönder (kullanıcının hangi sayfada olduğunu bildir)
      if (product) {
        sendBrowsingUpdate(product.name, product.productUrl);
      }

      // Fiyat validation: 10₺'den ucuz ürünler genelde hatalı parse
      if (!product || product.price < 10) return;

      // Session'da zaten var mı kontrol et
      const isAlreadyInSession = session?.products?.some(
        (existing) =>
          existing.productUrl === product.productUrl ||
          (existing.name === product.name && Math.abs(existing.price - product.price) < 1)
      );

      // Son eklenen URL ile aynı mı? (çift ekleme önleme)
      if (isAlreadyInSession || product.productUrl === lastAddedUrlRef.current) return;

      lastAddedUrlRef.current = product.productUrl;
      console.log('[SyncShop] Auto-adding product:', product.name);

      // Trendyol ise yorumları da çek
      if (product.site === 'trendyol') {
        product.reviews = await fetchTrendyolReviews(product.productUrl, product.ratingValue);
      }

      addProduct(product);
    }, 2000);

    return () => clearInterval(interval);
  }, [connected, session?.products?.length]); // products.length değişince re-subscribe
}
