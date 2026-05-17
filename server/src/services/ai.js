import { generateText, generateJSON, isAIReady } from '../lib/ai-client.js';
import { getSession, addMessage } from './session.js';
import { updateProductAnalysis } from './product.js';

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
${(product.reviews || [])
  .filter((r) => r.text && r.text.split(/\s+/).length > 5)
  .map((r) => `[${r.rating}★ ${r.date?.split(' ').slice(-2).join(' ') || '?'}] ${r.text.substring(0, 150)}`)
  .join('\n')}

DİKKAT: Ürünün genel kalitesini ve 'Olumlu' oranını (positivePercent) belirlerken SADECE bu yorumlara değil, yukarıdaki 'Genel Puan'a öncelik ver.

SENİN SÜPER GÜCÜN:
1. MANİPÜLE YORUM TESPİTİ: Tarih kümelenmesi, dil benzerliği (bot tespiti).
2. SATICI GÜVENİ: "Sahte ürün", "Barkod okumuyor" gibi kırmızı bayraklar.
3. GİZLİ GERÇEKLER: Açıklama-yorum çelişkileri.

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
