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

let provider = null;    // 'groq' | 'gemini' | 'openrouter'
let groqClient = null;  // OpenAI SDK instance (Groq'a yönlendirilmiş)
let geminiClient = null; // GoogleGenerativeAI instance
let openrouterClient = null; // OpenAI SDK instance (OpenRouter'a yönlendirilmiş)
let isConfigured = false;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Retry wrapper with exponential backoff.
 * Retries on 503 (Service Unavailable) and 429 (Rate Limit) errors.
 */
async function withRetry(fn) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err.message || '';
      const isRetryable = msg.includes('503') || msg.includes('429') || msg.includes('overloaded') || msg.includes('high demand') || msg.includes('JSON') || msg.includes('control character') || msg.includes('Unexpected') || msg.includes('token');

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[AI] Attempt ${attempt}/${MAX_RETRIES} failed (${msg.substring(0, 60)}...). Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

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
    if (provider === 'openrouter') {
      const model = env.AI_MODEL || 'openai/gpt-oss-120b:free';
      openrouterClient = new OpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://syncshop.zamazincode.com',
          'X-Title': 'SyncShop',
        }
      });
      console.log(`[AI] OpenRouter initialized (${model})`);
    } else if (provider === 'groq') {
      const model = env.AI_MODEL || 'llama-3.3-70b-versatile';
      groqClient = new OpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      console.log(`[AI] Groq initialized (${model})`);
    } else {
      const model = env.AI_MODEL || 'gemini-2.5-flash';
      geminiClient = new GoogleGenerativeAI(apiKey);
      console.log(`[AI] Gemini initialized (${model})`);
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

  return withRetry(async () => {
    if (provider === 'openrouter') {
      const modelName = env.AI_MODEL || 'openai/gpt-oss-120b:free';
      const response = await openrouterClient.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      });
      return response.choices[0].message.content;
    } else if (provider === 'groq') {
      const modelName = env.AI_MODEL || 'llama-3.3-70b-versatile';
      const response = await groqClient.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      });
      return response.choices[0].message.content;
    } else {
      const modelName = env.AI_MODEL || 'gemini-2.5-flash';
      const model = geminiClient.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
  });
}

// ═══════════════════════════════════════
// UNIFIED API — generateJSON
// ═══════════════════════════════════════

function safeJSONParse(text) {
  if (!text) {
    throw new Error('503 Model returned an empty response');
  }
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Parsed content is not a valid JSON object');
    }
    return parsed;
  } catch (err) {
    console.warn('[AI] JSON Parse failed, attempting to clean text...', err.message);
    let cleaned = String(text).trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();

    // Repair single-quoted keys: 'key': -> "key":
    cleaned = cleaned.replace(/'([^']*)'\s*:/g, '"$1":');
    // Repair single-quoted values: : 'value' -> : "value"
    cleaned = cleaned.replace(/:\s*'([^']*)'/g, (match, p1) => {
      const escaped = p1.replace(/"/g, '\\"');
      return `: "${escaped}"`;
    });

    try {
      const parsed2 = JSON.parse(cleaned);
      if (!parsed2 || typeof parsed2 !== 'object') {
        throw new Error('Parsed content is not a valid JSON object after cleaning');
      }
      return parsed2;
    } catch (e) {
      console.error('[AI] Raw faulty JSON output from model:\n', text);
      throw e;
    }
  }
}

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

  return withRetry(async () => {
    if (provider === 'openrouter') {
      const modelName = env.AI_MODEL || 'openai/gpt-oss-120b:free';
      const response = await openrouterClient.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      });
      return safeJSONParse(response.choices[0].message.content);
    } else if (provider === 'groq') {
      const modelName = env.AI_MODEL || 'llama-3.3-70b-versatile';
      const response = await groqClient.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      });
      return safeJSONParse(response.choices[0].message.content);
    } else {
      const modelName = env.AI_MODEL || 'gemini-2.5-flash';
      const model = geminiClient.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });
      const result = await model.generateContent(prompt);
      return safeJSONParse(result.response.text());
    }
  });
}
