import { supabase } from '../lib/supabase.js';

// ═══════════════════════════════════════
// PRODUCT CRUD
// ═══════════════════════════════════════

export async function addProduct(code, product, userName) {
  const url = (product.productUrl || '').split('?')[0];

  const { data, error } = await supabase
    .from('products')
    .insert([{
      session_code: code,
      name: product.name,
      price: product.price,
      image_url: product.imageUrl,
      product_url: url,
      site: product.site,
      ai_analysis: product.description ? { description: product.description } : null,
    }])
    .select()
    .single();

  if (error) {
    console.error('[Product] Add error:', error);
    return null;
  }

  // Rating bilgileri DB'de yok, in-memory olarak ekliyoruz
  // Socket event'iyle frontend'e taşınacak
  data.ratingValue = product.ratingValue || 0;
  data.ratingCount = product.ratingCount || 0;

  return data;
}

export async function updateProductAnalysis(productId, analysis, rawReviews = null) {
  const { data, error } = await supabase
    .from('products')
    .update({
      ai_analysis: analysis,
      raw_reviews: rawReviews,
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    console.error('[Product] updateAnalysis error:', error);
    return null;
  }

  return data;
}

// ═══════════════════════════════════════
// VOTING
// ═══════════════════════════════════════

export async function voteProduct(code, productId, userId, voteType) {
  await supabase.from('votes').upsert(
    { product_id: productId, user_id: userId, vote: voteType },
    { onConflict: 'product_id,user_id' }
  );

  const { data: allVotes } = await supabase
    .from('votes')
    .select('*')
    .eq('product_id', productId);

  const votesObj = {};
  (allVotes || []).forEach((v) => {
    votesObj[v.user_id] = { vote: v.vote };
  });

  return votesObj;
}
