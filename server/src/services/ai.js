import { generateText, generateJSON, isAIReady } from '../lib/ai-client.js';
import { getSession, addMessage } from './session.js';
import { updateProductAnalysis } from './product.js';

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

/**
 * Normalize raw_reviews from Supabase.
 * Handles both formats:
 * - JSON array: [{text, rating, date}, ...]
 * - Legacy compressed text string: "[5★ Ekim 2025] yorum..."
 */
function getReviews(product) {
  const raw = product.reviews || product.raw_reviews || product.rawReviews;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    // Try JSON parse first
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch { }
    // Legacy text format: "[5★ Ekim 2025] yorum text"
    return raw.split('\n').filter(Boolean).map(line => {
      const match = line.match(/^\[(\d)★\s*([^\]]*)\]\s*(.*)/);
      return match
        ? { rating: Number(match[1]), date: match[2], text: match[3] }
        : { rating: 0, date: '', text: line };
    });
  }
  return [];
}

// ═══════════════════════════════════════
// PRODUCT ANALYZER
// ═══════════════════════════════════════

export async function analyzeProduct(product) {
  if (!isAIReady()) return null;

  try {
    const prompt = `GÖREV: Bu ürünü ve kullanıcı yorumlarını analiz et.
Ürün: ${product.name}
Fiyat: ${product.price}₺
Genel Puan: ${product.ratingValue || 'Bilinmiyor'} / 5 (Toplam ${product.ratingCount || 'Bilinmiyor'} değerlendirme)

Aşağıdaki kullanıcı yorumları, en kritik örneklerin sıkıştırılmış halidir:
${getReviews(product)
        .filter((r) => r.text && r.text.split(/\s+/).length > 5)
        .map((r) => `[${r.rating}★ ${r.date?.split(' ').slice(-2).join(' ') || '?'}] ${r.text.substring(0, 150)}`)
        .join('\n')}

DİKKAT: Ürünün genel kalitesini ve 'Olumlu' oranını (positivePercent) belirlerken SADECE bu yorumlara değil, yukarıdaki 'Genel Puan'a öncelik ver.

SENİN SÜPER GÜCÜN:
1. MANİPÜLE YORUM TESPİTİ: Tarih kümelenmesi, dil benzerliği (bot tespiti).
2. SATICI GÜVENİ: "Sahte ürün", "Barkod okumuyor" gibi kırmızı bayraklar.
3. GİZLİ GERÇEKLER: Açıklama-yorum çelişkileri.

ÖNEMLİ KURAL: Yanıtındaki tüm alanlar (özet, gizli gerçek, artılar, eksiler vb.) %100 TÜRKÇE olmalıdır. İngilizce terimler (Örn: "gift inside", "packaging", "delivery" gibi) karıştırma. Tamamen doğal Türkçe ifadeler kullan.

SADECE aşağıdaki JSON formatında yanıt ver:
{
  "summary": "Ürünün ve satıcının kısa özeti (max 2 cümle)",
  "hiddenTruth": "Yorumların satır aralarındaki gizli gerçek",
  "trustScore": 85,
  "authenticityRisk": "Low | Medium | High",
  "authenticityReason": "Neden bu risk seviyesi verildi?",
  "idealFor": "Bu ürünü alması gereken kullanıcı profili",
  "notFor": "Bu üründen uzak durması gereken kullanıcı profili",
  "pros": ["artı 1", "artı 2"],
  "cons": ["eksi 1", "eksi 2"],
  "priceVerdict": "Fiyat değerlendirmesi (Pahalı/Uygun/Fırsat)",
  "positivePercent": 90
}`;

    return await generateJSON(prompt);
  } catch (e) {
    console.error('[AI] Analysis error:', e.message);
    return null;
  }
}

// ═══════════════════════════════════════
// CHAT HANDLER (@SyncBot)
// ═══════════════════════════════════════

export async function handleChat(message, sessionData) {
  if (!isAIReady()) return '🤖 **SyncBot:** AI yapılandırılmamış.';

  try {
    const productsContext = sessionData.products
      .map((p) => {
        const votes = sessionData.votes[p.id] || {};
        const voteStr = Object.values(votes)
          .map((v) => `${v.vote === 'up' ? '👍' : '👎'}`)
          .join(', ');
        return `- ${p.name} (${p.price}₺, ⭐${p.ratingValue || '?'}) [Oylar: ${voteStr || 'henüz yok'}]`;
      })
      .join('\n');

    const prompt = `Sen SyncBot'sun — bir grup alışveriş asistanısın. Sadece aşağıdaki koleksiyonda bulunan ürünler hakkında soruları yanıtla.

KOLEKSİYONDAKİ ÜRÜNLER:
${productsContext || 'Henüz ürün yok.'}

Kullanıcı mesajı: "${message}"

GÖREV:
1. Kullanıcı koleksiyondan bir ürün seçmeni istiyorsa; bütçe, kullanım amacı ve kime alınacağı (hediye vb.) gibi kriterlere göre en uygun ürünü seç.
2. Seçim yaparken DİKKAT ET: Koleksiyonda gruptan en çok "👍" (upvote) almış ürüne her zaman öncelik ver ve neden onu seçtiğini (oy sayısını da belirterek) açıkla.
3. Ürün karşılaştırması isteniyorsa kısa ve öz bir tablo oluştur.
4. Fiyat ve performans analizi yap, çok pahalı ve az oy almışsa uyar.
5. Kısa, samimi ve enerjik bir ton kullan.`;

    return await generateText(prompt);
  } catch (e) {
    console.error('[AI] Chat error:', e.message);
    if (e.message?.includes('429') || e.message?.includes('quota')) {
      return '🤖 **SyncBot:** API kota limiti aşıldı. Lütfen birkaç dakika bekleyin veya yeni bir API key ayarlayın.';
    }
    return '🤖 **SyncBot:** Üzgünüm, şu an cevap veremiyorum.';
  }
}

// ═══════════════════════════════════════
// RECOMMENDATION — STRUCTURED QUESTIONS
// ═══════════════════════════════════════

export async function generateRecommendationQuestions(products, sessionData) {
  if (!isAIReady()) return null;

  try {
    const productsContext = products
      .map((p) => {
        const votes = sessionData.votes[p.id] || {};
        const ups = Object.values(votes).filter((v) => v.vote === 'up').length;
        const downs = Object.values(votes).filter((v) => v.vote === 'down').length;
        const rating = p.ratingValue ? `⭐${p.ratingValue}/5 (${p.ratingCount || '?'} değerlendirme)` : 'Puan yok';

        let analysisBlock = '';
        if (p.aiAnalysis) {
          const a = p.aiAnalysis;
          analysisBlock = `
  → AI Analiz: %${a.trustScore} güven | ${a.priceVerdict} | ${a.authenticityRisk} risk
  → Özet: ${a.summary || '-'}
  → Gizli Gerçek: ${a.hiddenTruth || '-'}
  → Artılar: ${(a.pros || []).join(', ')}
  → Eksiler: ${(a.cons || []).join(', ')}`;
        }

        // Include top review excerpts if available
        let reviewBlock = '';
        const reviews = getReviews(p);
        if (reviews.length > 0) {
          const topReviews = reviews.slice(0, 5).map(r => `    "${(r.text || '').substring(0, 120)}" (⭐${r.rating})`).join('\n');
          reviewBlock = `\n  → Kullanıcı Yorumları (${reviews.length} yorum):\n${topReviews}`;
        }

        return `- ${p.name} | ${p.price}₺ | ${rating} | Grup oyları: 👍${ups} 👎${downs}${analysisBlock}${reviewBlock}`;
      })
      .join('\n\n');

    const prompt = `Sen SyncBot'sun — bir grup alışveriş asistanısın. Kullanıcılar aşağıdaki ürünleri karşılaştırmak istiyor.

ÜRÜNLER:
${productsContext}

GÖREVLERİN:
Kullanıcının kararını netleştirecek tam 3 adet soru üret. Her soru için 4 adet tıklanabilir seçenek ver.

SORU KURALLARI:
1. KESİNLİKLE ürünler hakkında bilgi/olgusal (factual) sorular sorma (Örn: "Hangi ürün daha ucuz?", "Hangi ürünün puanı daha yüksek?" gibi sorular sormak YASAKTIR. Bu veriler sende zaten var!).
2. Sorular sadece KULLANICININ kişisel tercihlerine, beklentilerine, kullanım senaryolarına ve bütçe/fiyat önceliklerine odaklanmalıdır.
3. Örnek doğru sorular: "Bu takviyeden öncelikli beklentiniz nedir?", "Bütçe planlamanızda hangisine öncelik verirsiniz?", "Kullanım sıklığınız ne olacak?" vb.
4. Seçenekler bu ürün kategorisine özel ve anlamlı olmalı. Yorumlardan çıkardığın bilgileri sorulara yansıt.

SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir şey yazma:
{
  "questions": [
    {
      "question": "Soru metni?",
      "options": ["Seçenek 1", "Seçenek 2", "Seçenek 3", "Seçenek 4"]
    }
  ]
}`;

    console.log('\n[AI] ═══ RECOMMENDATION QUESTIONS PROMPT ═══');
    console.log(prompt);
    console.log('[AI] ═══ END PROMPT ═══\n');

    return await generateJSON(prompt);
  } catch (e) {
    console.error('[AI] generateRecommendationQuestions error:', e.message);
    return null;
  }
}

// ═══════════════════════════════════════
// RECOMMENDATION — FINAL DECISION
// ═══════════════════════════════════════

export async function generateFinalRecommendation(products, sessionData, answers) {
  if (!isAIReady()) return '🤖 **SyncBot:** AI yapılandırılmamış.';

  try {
    const productsContext = products
      .map((p) => {
        const votes = sessionData.votes[p.id] || {};
        const ups = Object.values(votes).filter((v) => v.vote === 'up').length;
        const downs = Object.values(votes).filter((v) => v.vote === 'down').length;
        const rating = p.ratingValue ? `⭐${p.ratingValue}/5 (${p.ratingCount || '?'} değerlendirme)` : 'Puan yok';

        let analysisBlock = '';
        if (p.aiAnalysis) {
          const a = p.aiAnalysis;
          analysisBlock = `
  → AI Analiz: %${a.trustScore} güven | ${a.priceVerdict} | ${a.authenticityRisk} risk
  → Özet: ${a.summary || '-'}
  → Gizli Gerçek: ${a.hiddenTruth || '-'}
  → Artılar: ${(a.pros || []).join(', ')}
  → Eksiler: ${(a.cons || []).join(', ')}`;
        }

        let reviewBlock = '';
        const reviews = getReviews(p);
        if (reviews.length > 0) {
          const topReviews = reviews.slice(0, 5).map(r => `    "${(r.text || '').substring(0, 120)}" (⭐${r.rating})`).join('\n');
          reviewBlock = `\n  → Kullanıcı Yorumları (${reviews.length} yorum):\n${topReviews}`;
        }

        return `- ${p.name} | ${p.price}₺ | ${rating} | Grup oyları: 👍${ups} 👎${downs}${analysisBlock}${reviewBlock}`;
      })
      .join('\n\n');

    const answersContext = answers
      .map((a, i) => `Soru ${i + 1}: ${a.question} → Cevap: ${a.answer}`)
      .join('\n');

    const prompt = `Sen SyncBot'sun — bir grup alışveriş asistanısın. Kullanıcılar ürün karşılaştırması yapıyor ve tercih sorularını cevapladı.

ÜRÜNLER:
${productsContext}

KULLANICI TERCİHLERİ:
${answersContext}

GÖREVLERİN:
1. Kullanıcının cevaplarına göre en uygun ürünü seç ve neden onu seçtiğini kısa açıkla.
2. Grup oylarını (👍/👎) da dikkate al — çok oy almış ürüne öncelik ver.
3. İkinci en iyi alternatifi de belirt.
4. Kısa, samimi, enerjik ve Türkçe yaz. Markdown formatını kullan. Emoji kullan ama abartma.
5. Max 150 kelime.`;

    console.log('\n[AI] ═══ FINAL RECOMMENDATION PROMPT ═══');
    console.log(prompt);
    console.log('[AI] ═══ END PROMPT ═══\n');

    return await generateText(prompt);
  } catch (e) {
    console.error('[AI] generateFinalRecommendation error:', e.message);
    return '🤖 **SyncBot:** Final tavsiye oluşturulurken bir hata oluştu.';
  }
}

// ═══════════════════════════════════════
// AI ORCHESTRATOR (runAI)
// ═══════════════════════════════════════

export async function runAI(io, roomCode, product) {
  try {
    // Compress reviews for token efficiency
    const allRaw = product.reviews || [];
    const meaningful = allRaw.filter((r) => r.text && r.text.split(/\s+/).length > 5);
    const others = allRaw.filter((r) => !r.text || r.text.split(/\s+/).length <= 5);
    const selectedReviews = [...meaningful, ...others].slice(0, 20);

    const compressedReviews = selectedReviews.map((r) => {
      const datePart = r.date ? r.date.split(' ').slice(-2).join(' ') : '?';
      const cleanText = (r.text || '').substring(0, 150).replace(/\n/g, ' ');
      return `[${r.rating}★ ${datePart}] ${cleanText}`;
    });

    const productDesc = product.description || product.aiAnalysis?.description || '';
    const descriptionText = productDesc ? `[ÜRÜN AÇIKLAMASI]: ${productDesc}\n\n` : '';
    const compressedText = descriptionText + compressedReviews.join('\n');

    // Save compressed reviews to DB (audit trail)
    await updateProductAnalysis(product.id, null, compressedText);

    console.log(`[AI] Analyzing product: ${product.name}`);
    const analysis = await analyzeProduct(product);

    if (analysis) {
      // Send analysis data to UI
      io.to(roomCode).emit('ai-analysis', { productId: product.id, analysis });

      // Send readable summary to chat
      const analysisMsg =
        `✨ **AI Derin Analizi: ${product.name}**\n\n` +
        `📝 ${analysis.summary}\n\n` +
        `🕵️‍♂️ **Gizli Gerçek:** ${analysis.hiddenTruth}\n\n` +
        `🎯 **Kimin İçin İdeal:** ${analysis.idealFor}\n` +
        `⚠️ **Kim Uzak Durmalı:** ${analysis.notFor}\n\n` +
        `✅ **Artılar:** ${analysis.pros.join(', ')}\n` +
        `❌ **Eksiler:** ${analysis.cons.join(', ')}\n\n` +
        `⚖️ **Karar:** ${analysis.priceVerdict} (Güven: %${analysis.trustScore} - Olumlu: %${analysis.positivePercent})`;

      const botMsg = await addMessage(roomCode, analysisMsg, 'SyncBot');
      io.to(roomCode).emit('message', botMsg);

      // Save final analysis to DB
      await updateProductAnalysis(product.id, analysis, compressedText);
    } else {
      console.log(`[AI] Analysis failed for ${product.id}`);
      io.to(roomCode).emit('ai-analysis', { productId: product.id, analysis: null });

      // Kullanıcıya bilgi ver
      const failMsg = await addMessage(roomCode, '🤖 **SyncBot:** Analiz başarısız oldu. API kotası aşılmış olabilir.', 'SyncBot');
      io.to(roomCode).emit('message', failMsg);
    }
  } catch (err) {
    console.error('[AI] runAI error:', err);
  }
}
