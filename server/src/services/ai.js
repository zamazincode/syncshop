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
    return raw.split('\n')
      .filter(Boolean)
      .filter(line => !line.startsWith('[ÜRÜN AÇIKLAMASI]:'))
      .map(line => {
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

export async function analyzeProduct(product, passedReviews = null) {
  if (!isAIReady()) return null;

  try {
    const productDesc = product.description || product.aiAnalysis?.description || '';
    const raw = passedReviews || getReviews(product);
    const selectedReviews = raw
      .filter((r) => r.text && r.text.split(/\s+/).length > 5)
      .slice(0, 20);

    const prompt = `GÖREV: Bu ürünü, özelliklerini ve kullanıcı yorumlarını analiz et.
Ürün: ${product.name}
Fiyat: ${product.price}₺
Genel Puan: ${product.ratingValue || 'Bilinmiyor'} / 5 (Toplam ${product.ratingCount || 'Bilinmiyor'} değerlendirme)
${productDesc ? `\nÜRÜN ÖZELLİKLERİ / DETAYLARI:\n${productDesc}\n` : ''}

Aşağıdaki kullanıcı yorumları, [Yorum #indeks] şeklinde numaralandırılmıştır:
${selectedReviews
        .map((r, idx) => `[Yorum #${idx}] [${r.rating}★] ${r.text.substring(0, 150)}`)
        .join('\n')}

DİKKAT: Ürünün genel kalitesini ve 'Olumlu' oranını (positivePercent) belirlerken SADECE bu yorumlara değil, yukarıdaki 'Genel Puan'a öncelik ver.

SENİN SÜPER GÜCÜN:
1. MANİPÜLE YORUM TESPİTİ: Tarih kümelenmesi, dil benzerliği (bot tespiti).
2. SATICI GÜVENİ: "Sahte ürün", "Barkod okumuyor" gibi kırmızı bayraklar.
3. GİZLİ GERÇEKLER: Açıklama-yorum çelişkileri.

ÖNEMLİ KURALLAR:
1. Yanıtındaki tüm alanlar %100 TÜRKÇE olmalıdır. İngilizce terimler karıştırma.
2. Kesinlikle dolaylı, resmi ve uzun akademik cümleler kurma (örn: "Olumlu yorumlar genelde..." gibi gereksiz laf kalabalığı YASAKTIR).
3. Doğrudan, samimi ve arkadaşça bir ton kullan. 3 saniyede karar verdirecek kadar net ol.
4. JSON YAZIM KURALI: JSON çıktısı geçerli ve standartlara uygun JSON formatında olmalıdır. Tüm anahtarlar ve değerler standart çift tırnak (") ile sarılmalıdır. JSON yapısını bozmamak için metinlerin kendi içinde çift tırnak (") kullanma, sadece tek tırnak (') kullan (Örn: "summary": "Şarj kablosu 'kırılgan' yapıda" gibi).
5. KAYNAKÇA EŞLEŞTİRME KURALI: Artılar ve Eksiler listesindeki her bir maddeyi destekleyen kaynakları "sources" dizisine ekle.
   - Eğer destekleyen kaynak bir kullanıcı yorumu ise, o yorumun indeks numarasını yaz (Örn: 0, 1, 2).
   - Eğer destekleyen kaynak ürün özellikleri/açıklaması ise, "desc" kelimesini ekle (Örn: "desc").
   - Birden fazla kaynak varsa hepsini ekle (Örn: [0, 2, "desc"]). Kaynak bulamadıysan boş dizi bırak.
6. BAŞLIK KALİTESİ: Artı ve eksi maddeleri KESİNLİKLE robotik veya aşırı kısa kuru kelimelerden oluşmamalıdır (Örn: 'hızlı teslim' yerine 'Kargo teslimatı hızlıydı', 'bağlantı sorunu' yerine 'Wi-Fi bağlantısı sık kopuyor' gibi). Doğal, net ve ne olduğu tam anlaşılan 4-12 kelimelik ifadeler kullan.
7. SIKLIK/FREKANS KURALI: Artılar ve Eksiler listesine eklediğin maddelerin KESİNLİKLE sadece tek bir kullanıcının münferit şikayeti/övgüsü olmadığından emin ol. Birden fazla yorumda tekrarlanan (frekansı yüksek) ortak eğilimleri listele. İstisna: Eğer şikayet 'sahte ürün', 'dolandırıcılık', 'bozuk/kırık teslim' veya 'sağlık riski' gibi çok kritik bir kırmızı bayrak ise tek bir yorumda bile geçse Eksiler'e ekleyebilirsin.

SADECE aşağıdaki JSON formatında yanıt ver:
{
  "summary": "Ürün hakkında 3 saniyede karar verdirecek, samimi ve son derece kısa net özet (en fazla 12 kelime)",
  "hiddenTruth": "Satır aralarındaki en büyük risk veya gizli gerçek (en fazla 12 kelime)",
  "details": "Bu sonuca nasıl ulaşıldığını açıklayan, yorumlardaki genel eğilimi özetleyen 1-2 açıklayıcı cümle (en fazla 25 kelime)",
  "trustScore": 85,
  "authenticityRisk": "Low | Medium | High",
  "authenticityReason": "Neden bu risk seviyesi verildi? (en fazla 15 kelime)",
  "idealFor": "Bu ürünü alması gereken kullanıcı profili (en fazla 8 kelime)",
  "notFor": "Bu üründen uzak durması gereken kullanıcı profili (en fazla 8 kelime)",
  "pros": [
    { "text": "artı 1 (net ve ne olduğu anlaşılan, robotik olmayan 4-12 kelimelik kısa başlık)", "sources": [0, 1] },
    { "text": "artı 2 (net ve ne olduğu anlaşılan, robotik olmayan 4-12 kelimelik kısa başlık)", "sources": ["desc"] }
  ],
  "cons": [
    { "text": "eksi 1 (net ve ne olduğu anlaşılan, robotik olmayan 4-12 kelimelik kısa başlık)", "sources": [2] },
    { "text": "eksi 2 (net ve ne olduğu anlaşılan, robotik olmayan 4-12 kelimelik kısa başlık)", "sources": [3, "desc"] }
  ],
  "priceVerdict": "Fiyat değerlendirmesi (Pahalı/Uygun/Fırsat)",
  "positivePercent": 90
}`;

    console.log('\n[AI] ═══ ANALYZE PRODUCT PROMPT ═══');
    console.log(prompt);
    console.log('[AI] ═══ END PROMPT ═══\n');

    const result = await generateJSON(prompt);

    if (result) {
      const mapSources = (items) => {
        if (!Array.isArray(items)) return [];
        return items.map((item) => {
          const quotes = [];
          if (Array.isArray(item.sources)) {
            item.sources.forEach((src) => {
              if (src === 'desc' && productDesc) {
                quotes.push({
                  type: 'desc',
                  text: 'Ürün açıklamasında belirtilen teknik detay.'
                });
              } else if (typeof src === 'number' && selectedReviews[src]) {
                quotes.push({
                  type: 'review',
                  text: selectedReviews[src].text, // FULL text!
                  rating: selectedReviews[src].rating
                });
              }
            });
          }
          return {
            text: item.text,
            quotes
          };
        });
      };

      result.pros = mapSources(result.pros);
      result.cons = mapSources(result.cons);
    }

    return result;
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
  → Artılar: ${(a.pros || []).map(p => typeof p === 'object' ? p.text : p).join(', ')}
  → Eksiler: ${(a.cons || []).map(c => typeof c === 'object' ? c.text : c).join(', ')}`;
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
Kullanıcının kararını netleştirecek tam 3 adet soru üret. Soru için 4 adet tıklanabilir seçenek ver.

SORU KURALLARI:
1. KESİNLİKLE ürünler hakkında bilgi/olgusal (factual) sorular sorma (Örn: "Hangi ürün daha ucuz?", "Hangi ürünün puanı daha yüksek?" gibi sorular sormak YASAKTIR. Bu veriler sende zaten var!).
2. Sorular sadece KULLANICININ kişisel tercihlerine, beklentilerine, kullanım senaryolarına ve bütçe/fiyat önceliklerine odaklanmalıdır.
3. Örnek doğru sorular: "Bu takviyeden öncelikli beklentiniz nedir?", "Bütçe planlamanızda hangisine öncelik verirsiniz?", "Kullanım sıklığınız ne olacak?" vb.
4. Seçenekler bu ürün kategorisine özel ve anlamlı olmalı. Yorumlardan çıkardığın bilgileri sorulara yansıt.

SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir şey yazma:
{
  "questions": [
    {
      "question": "Soru 1?",
      "options": ["Seçenek 1", "Seçenek 2", "Seçenek 3", "Seçenek 4"]
    },
    {
      "question": "Soru 2?",
      "options": ["Seçenek 1", "Seçenek 2", "Seçenek 3", "Seçenek 4"]
    },
    {
      "question": "Soru 3?",
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
  → Artılar: ${(a.pros || []).map(p => typeof p === 'object' ? p.text : p).join(', ')}
  → Eksiler: ${(a.cons || []).map(c => typeof c === 'object' ? c.text : c).join(', ')}`;
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
Kullanıcının cevaplarını ve gruptaki ürün oylarını dikkate alarak ürünleri karşılaştır ve aşağıdaki JSON formatında yanıt ver. 

JSON FORMATI KURALI:
{
  "recommendations": [
    {
      "productId": "Ürünün ID'si (yukarıda verilmediyse adından tahmin et veya boş bırak)",
      "productName": "Ürün Adı",
      "award": "winner" veya "alternative",
      "reason": "Bu ürün neden seçildi? (Kısa ve net)",
      "priceAndVotes": "Fiyat ve Oylar (Örn: 355₺ - 👍2 👎0)"
    }
  ],
  "summary": "Sonuç için en fazla 2 cümlelik, samimi, Türkçe özet."
}
SADECE GEÇERLİ BİR JSON DÖNDÜR.`;

    console.log('\n[AI] ═══ FINAL RECOMMENDATION PROMPT ═══');
    console.log(prompt);
    console.log('[AI] ═══ END PROMPT ═══\n');

    const result = await generateJSON(prompt);
    return `[RECOMMENDATION_JSON]${JSON.stringify(result)}`;
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
    const analysis = await analyzeProduct(product, selectedReviews);

    if (analysis) {
      // Send analysis data to UI
      io.to(roomCode).emit('ai-analysis', { productId: product.id, analysis });

      // Send readable summary to chat
      const prosList = Array.isArray(analysis.pros) ? analysis.pros.map(p => p.text).join(', ') : '';
      const consList = Array.isArray(analysis.cons) ? analysis.cons.map(c => c.text).join(', ') : '';

      const analysisMsg =
        `✨ **AI Derin Analizi: ${product.name}**\n\n` +
        `📝 ${analysis.summary}\n\n` +
        `🕵️‍♂️ **Gizli Gerçek:** ${analysis.hiddenTruth}\n\n` +
        `🎯 **Kimin İçin İdeal:** ${analysis.idealFor}\n` +
        `⚠️ **Kim Uzak Durmalı:** ${analysis.notFor}\n\n` +
        `✅ **Artılar:** ${prosList}\n` +
        `❌ **Eksiler:** ${consList}\n\n` +
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
// Hot-reload trigger for gpt-oss-120b model changes
