import { supabase } from '../lib/supabase.js';

// ═══════════════════════════════════════
// PRODUCT CRUD
// ═══════════════════════════════════════

export const productVotes = new Map(); // productId -> { userId: { vote: 'up'|'down' } }

/**
 * Trendyol'un public component API'sinden ürün açıklamalarını çeker.
 * Bu işlem server-side yapılıyor çünkü:
 * 1. CORS sorunu yok (client-side fetch bazen başarısız oluyor)
 * 2. Extension rebuild/cache'e bağımlılık yok
 * 3. Her zaman çalışır
 */
async function fetchTrendyolDescription(productUrl) {
  try {
    const match = (productUrl || '').match(/-p-(\d+)/);
    if (!match) return '';
    const contentId = match[1];

    const apiUrl = `https://apigw.trendyol.com/discovery-storefront-trproductgw-service/api/component-read/component/${contentId}?channelId=1`;
    const res = await fetch(apiUrl, {
      headers: { 'x-agentname': 'oz' },
    });
    if (!res.ok) {
      console.log(`[Product] Description API returned ${res.status} for ${contentId}`);
      return '';
    }

    const data = await res.json();
    const descriptions = data.result?.descriptions || [];

    // priority: 0 → satıcının yazdığı ürün açıklamaları (bullet points)
    // Diğer priority değerleri (2, 4, 7, 1001...) → Trendyol'un politika metinleri, bunları istemiyoruz
    const bulletPoints = descriptions
      .filter((d) => d.priority === 0 && d.text)
      .map((d) => d.text.trim())
      .join('\n');

    console.log(`[Product] Fetched description for ${contentId}: ${bulletPoints.length} chars`);
    return bulletPoints;
  } catch (e) {
    console.error('[Product] Description fetch error:', e.message);
    return '';
  }
}

export function mapProductDbToFrontend(p) {
  if (!p) return null;
  return {
    ...p,
    imageUrl: p.image_url,
    productUrl: p.product_url,
    description: p.description, // Yeni bağımsız sütun
    aiAnalysis: p.ai_analysis,
    ratingValue: p.rating_value || 0,
    ratingCount: p.rating_count || 0,
  };
}

export async function addProduct(code, product, userName) {
  const url = (product.productUrl || '').split('?')[0];

  // Clean product name from common e-commerce page title suffixes
  let cleanedName = (product.name || '').trim();
  cleanedName = cleanedName
    .replace(/\s*-\s*Trendyol$/gi, '')
    .replace(/\s*-\s*Hepsiburada$/gi, '')
    .replace(/\s*\|\s*Hepsiburada$/gi, '')
    .replace(/\s*-\s*Fiyatı\s*,\s*Yorumları$/gi, '')
    .replace(/\s*Fiyatı\s*,\s*Yorumları$/gi, '')
    .replace(/\s*Fiyatı\s*Yorumları$/gi, '')
    .trim();

  // Compress reviews for storage (limit to essential fields)
  const reviews = (product.reviews || []).map(r => ({
    text: (r.text || '').substring(0, 300),
    rating: r.rating,
    date: r.date,
  }));

  // Description: client'tan geldiyse onu kullan, yoksa server-side API'den çek
  let description = product.description || '';
  if (!description && product.site === 'trendyol') {
    description = await fetchTrendyolDescription(product.productUrl);
  }

  const { data, error } = await supabase
    .from('products')
    .insert([{
      session_code: code,
      name: cleanedName,
      price: product.price,
      image_url: product.imageUrl,
      product_url: url,
      site: product.site,
      rating_value: product.ratingValue || 0,
      rating_count: product.ratingCount || 0,
      description: description || null, // Yeni bağımsız sütun
      ai_analysis: null, // Sadece analiz bitince doldurulacak
      raw_reviews: reviews.length > 0 ? reviews : null,
    }])
    .select()
    .single();

  if (error) {
    console.error('[Product] Add error:', error);
    return null;
  }

  return mapProductDbToFrontend({
    ...data,
    rating_value: data.rating_value || product.ratingValue || 0,
    rating_count: data.rating_count || product.ratingCount || 0,
  });
}

export async function updateProductAnalysis(productId, analysis, rawReviews = undefined) {
  const updateData = {};
  if (analysis !== undefined) {
    updateData.ai_analysis = analysis;
  }
  if (rawReviews !== undefined) {
    updateData.raw_reviews = rawReviews;
  }

  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    console.error('[Product] updateAnalysis error:', error);
    return null;
  }

  return mapProductDbToFrontend(data);
}

export async function removeProduct(productId) {
  productVotes.delete(productId);
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) {
    console.error('[Product] Remove error:', error);
    return false;
  }
  return true;
}

// ═══════════════════════════════════════
// VOTING
// ═══════════════════════════════════════

export async function voteProduct(code, productId, userId, voteType) {
  if (!productVotes.has(productId)) {
    productVotes.set(productId, {});
  }
  const votes = productVotes.get(productId);

  // Toggle: If clicked same vote again, remove it
  if (votes[userId]?.vote === voteType) {
    delete votes[userId];
  } else {
    votes[userId] = { vote: voteType };
  }

  return votes;
}
