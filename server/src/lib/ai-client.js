import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

/**
 * SyncShop — AI Client (Provider-Agnostic)
 *
 * ADAPTER PATTERN:
 * Bu dosya, farklı AI provider'ları (Groq, Gemini) tek bir arayüz
 * arkasına saklar. services/ai.js bu dosyayı kullanır ve hangi
 * provider'ın aktif olduğunu bilmesine gerek yoktur.
 *
 * Neden bu yapı?
 * - Development'ta Groq (ücretsiz, hızlı)
 * - Production'da Gemini (Google ekosistemi, function calling)
 * - Provider değiştirmek = .env'de AI_PROVIDER değiştirmek, kod aynı
 *
 * Groq neden OpenAI SDK ile çalışır?
 * - Groq, OpenAI-compatible API sunuyor (aynı endpoint formatı)
 * - openai npm paketi, baseURL'i değiştirerek Groq'a yönlendirilebilir
 * - Bu pattern'e "OpenAI-compatible" denir, birçok provider destekler
 */

let provider = null;    // 'groq' | 'gemini'
let groqClient = null;  // OpenAI SDK instance (Groq'a yönlendirilmiş)
let geminiClient = null; // GoogleGenerativeAI instance
let isConfigured = false;

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════

export function initAI() {
  provider = env.AI_PROVIDER || 'groq';
  const apiKey = env.AI_API_KEY || env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[AI] No API key — AI features disabled');
    return;
  }

  try {
    if (provider === 'groq') {
      // Groq: OpenAI SDK'yı Groq'un base URL'ine yönlendir
      groqClient = new OpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      console.log('[AI] Groq initialized (llama-3.3-70b-versatile)');
    } else {
      // Gemini: Google SDK kullan
      geminiClient = new GoogleGenerativeAI(apiKey);
      console.log('[AI] Gemini initialized (gemini-2.5-flash)');
    }
    isConfigured = true;
  } catch (e) {
    console.error('[AI] Init failed:', e.message);
  }
}

export function isAIReady() {
  return isConfigured;
}

// ═══════════════════════════════════════
// UNIFIED API — generateText
// ═══════════════════════════════════════

/**
 * Düz metin yanıt üret (chat handler için).
 *
 * @param {string} prompt - Kullanıcıya gönderilecek prompt
 * @returns {string} AI yanıtı
 */
export async function generateText(prompt) {
  if (!isConfigured) throw new Error('AI not configured');

  if (provider === 'groq') {
    const response = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    });
    return response.choices[0].message.content;
  } else {
    const model = geminiClient.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}

// ═══════════════════════════════════════
// UNIFIED API — generateJSON
// ═══════════════════════════════════════

/**
 * JSON formatında yanıt üret (product analysis için).
 *
 * Groq'ta JSON mode: response_format: { type: "json_object" }
 * Gemini'de JSON mode: responseMimeType: "application/json"
 *
 * @param {string} prompt - JSON yanıt isteyen prompt
 * @returns {object} Parse edilmiş JSON
 */
export async function generateJSON(prompt) {
  if (!isConfigured) throw new Error('AI not configured');

  if (provider === 'groq') {
    const response = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
      response_format: { type: 'json_object' }, // Groq JSON mode
    });
    return JSON.parse(response.choices[0].message.content);
  } else {
    const model = geminiClient.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  }
}
