/**
 * SyncShop — Product Data Extractors
 *
 * Her e-ticaret sitesi için ürün bilgisi çıkarma stratejileri.
 * Content script, aktif sayfadan ürün adı, fiyat, resim, puan gibi
 * bilgileri bu fonksiyonlarla scrape eder.
 *
 * Neden ayrı dosya? Çünkü:
 * 1. Her site farklı DOM yapısı kullanır
 * 2. Yeni site eklemek = yeni bir extractor fonksiyonu eklemek
 * 3. React component'lerden bağımsız, saf DOM işlemleri
 */

/**
 * Sayfa JSON-LD verilerini okur.
 * Google'ın schema.org standardı — birçok e-ticaret sitesi bunu kullanır.
 * DOM'u kazımaktan çok daha güvenilir çünkü yapılandırılmış veridir.
 */
function getJsonLd() {
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      const data = JSON.parse(s.textContent);
      if (Array.isArray(data)) {
        const found = data.find(
          (d) => d['@type'] === 'Product' || d['@type']?.includes('Product')
        );
        if (found) return found;
      }
      if (data['@type'] === 'Product' || data['@type']?.includes('Product')) return data;
    }
  } catch {
    return null;
  }
  return null;
}

function getMeta(prop) {
  return document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`)?.content;
}



/**
 * Trendyol ürün sayfasından bilgi çıkar.
 * Strateji: JSON-LD > OpenGraph > DOM selectors (fallback zinciri)
 */
export function extractTrendyol() {
  const ld = getJsonLd();

  // İsim: OG title > DOM selector
  let name = getMeta('og:title')?.split('- Trendyol')[0]?.trim();

  // Kara liste: Ana sayfa, arama sonuçları gibi ürün olmayan sayfaları filtrele
  const blacklist = ['online alışveriş', 'arama sonuçları', 'en trend ürünler', 'indirimli ürünler'];
  if (blacklist.some((b) => name?.toLowerCase().includes(b))) return null;

  if (!name || name.length < 5) {
    name = document.querySelector('.pr-new-br h1, .product-name')?.textContent?.trim();
  }
  if (!name || name.length < 5 || name.includes('Trendyol')) return null;

  name = name
    .replace(/\s*-\s*Fiyatı\s*,\s*Yorumları$/gi, '')
    .replace(/\s*Fiyatı\s*,\s*Yorumları$/gi, '')
    .replace(/\s*Fiyatı\s*Yorumları$/gi, '')
    .trim();

  // Fiyat: DOM > JSON-LD fallback
  const priceEl = document.querySelector('.prc-dsc, .product-price, .pr-bx-nm-v2');
  let priceStr = priceEl?.textContent || ld?.offers?.price || ld?.offers?.lowPrice || '0';
  const priceMatch = String(priceStr).match(/\d[\d\s,.]*/);
  priceStr = priceMatch ? priceMatch[0].replace(/\s/g, '').replace(',', '.') : '0';
  const price = parseFloat(priceStr) || 0;

  // Resim: OG > DOM > büyük resim arama
  let imageUrl = getMeta('og:image') ||
    document.querySelector('.base-product-image img, .styles-module_slider__1zW_Y img')?.src || '';
  if (!imageUrl || imageUrl.includes('base64')) {
    const allImgs = Array.from(document.querySelectorAll('img'));
    const bigImg = allImgs.find((i) => i.width > 200 && i.src.includes('dsmcdn'));
    if (bigImg) imageUrl = bigImg.src;
  }

  // Açıklama (description) burada çekilmez — Trendyol açıklamaları
  // asenkron yüklüyor, DOM'da güvenilmez. Bunun yerine ürün eklenirken
  // fetchTrendyolDescription() API çağrısı ile çekilir (bkz. App.jsx).

  return {
    name,
    price,
    imageUrl,
    productUrl: location.origin + location.pathname,
    site: 'trendyol',
    ratingValue: ld?.aggregateRating?.ratingValue || 0,
    ratingCount: ld?.aggregateRating?.reviewCount || 0,
  };
}

/**
 * Hepsiburada ürün sayfasından bilgi çıkar.
 */
export function extractHepsiburada() {
  const ld = getJsonLd();

  let name = ld?.name || getMeta('og:title')?.split('| Hepsiburada')[0]?.trim();
  if (!name || name.toLowerCase().includes('hepsiburada')) {
    name = document.querySelector('#product-name, h1.product-name')?.textContent?.trim();
  }
  if (!name || name.length < 5) return null;

  name = name
    .replace(/\s*-\s*Fiyatı$/gi, '')
    .replace(/\s*-\s*Fiyatı\s*,\s*Yorumları$/gi, '')
    .replace(/\s*Fiyatı\s*,\s*Yorumları$/gi, '')
    .replace(/\s*Fiyatı\s*Yorumları$/gi, '')
    .trim();

  const priceEl = document.querySelector('[data-test-id="price-current-price"], .product-price-container');
  let priceStr = priceEl?.textContent || ld?.offers?.price || ld?.offers?.lowPrice || '0';
  const priceMatch = String(priceStr).match(/\d[\d\s,.]*/);
  priceStr = priceMatch ? priceMatch[0].replace(/\s/g, '').replace(',', '.') : '0';
  const price = parseFloat(priceStr) || 0;

  const imageUrl = getMeta('og:image') ||
    document.querySelector('img[data-test-id="product-image"], .product-image img')?.src || '';

  // 1. Açıklama metnini çekiyoruz
  const descEl = document.querySelector('#productDescriptionContent, [data-test-id="product-description"], .product-description');
  let descText = descEl?.textContent?.replace(/\s+/g, ' ')?.trim() || '';

  // 2. Teknik özellikleri çekiyoruz
  const attrEl = document.querySelector('.tech-specs, #productTechSpecsContainer, .product-detail-content');
  let attrText = attrEl?.textContent?.replace(/\s+/g, ' ')?.trim() || '';

  // 3. Birleştiriyoruz
  let description = '';
  if (descText) {
    description += descText;
  }
  if (attrText) {
    description += (description ? '\n\nÖzellikler:\n' : '') + attrText;
  }

  // 4. Fallback
  if (!description) {
    const fallbackEl = document.querySelector('#tabProductDesc');
    description = fallbackEl?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
  }

  if (description.length > 1200) {
    description = description.substring(0, 1200) + '...';
  }

  return {
    name,
    price,
    imageUrl,
    productUrl: location.origin + location.pathname,
    site: 'hepsiburada',
    ratingValue: ld?.aggregateRating?.ratingValue || 0,
    ratingCount: ld?.aggregateRating?.reviewCount || 0,
    description,
  };
}

/**
 * Aktif siteye göre doğru extractor'ı çağır.
 * Yeni site eklemek istersen buraya bir case daha eklemen yeterli.
 */
export function extractProduct() {
  const host = location.hostname;

  // Sadece ürün detay sayfalarında çalış
  const isProductPage = /(-p-\d+|-p-HBV|[/]+urun[/]+)/i.test(location.pathname);
  if (!isProductPage || location.pathname === '/' || location.pathname.includes('/hesabim')) {
    return null;
  }

  if (host.includes('trendyol')) return extractTrendyol();
  if (host.includes('hepsiburada')) return extractHepsiburada();
  return null;
}
