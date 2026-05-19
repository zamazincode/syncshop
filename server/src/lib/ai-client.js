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
      const content = response?.choices?.[0]?.message?.content;
      if (!content) throw new Error('503 Model returned an empty response');
      return content;
    } else if (provider === 'groq') {
      const modelName = env.AI_MODEL || 'llama-3.3-70b-versatile';
      const response = await groqClient.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      });
      const content = response?.choices?.[0]?.message?.content;
      if (!content) throw new Error('503 Model returned an empty response');
      return content;
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

  // 1. Extract only the JSON block (from first '{' to last '}')
  let cleaned = String(text).trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // 2. Escape literal newlines/control characters inside string values
  let escaped = '';
  let inString = false;
  let quoteChar = null;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    // Handle escape character
    if (char === '\\' && inString) {
      escaped += char;
      if (i + 1 < cleaned.length) {
        escaped += cleaned[i + 1];
        i++;
      }
      continue;
    }
    // Handle quote character
    if (char === '"' || char === "'") {
      if (!inString) {
        inString = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inString = false;
        quoteChar = null;
      }
    }
    // Handle newline when inside a string
    if (inString && (char === '\n' || char === '\r')) {
      escaped += '\\n';
    } else {
      escaped += char;
    }
  }
  cleaned = escaped;

  // 3. Try to parse directly
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (err) {
    console.warn('[AI] Initial JSON Parse failed, attempting quote repairs...', err.message);
  }

  // 4. Quote repairs
  // Normalize mismatched or single-quoted keys: 'key':, "key':, 'key": to "key":
  cleaned = cleaned.replace(/(["'])(.*?)(["'])\s*:/g, '"$2":');

  // Normalize single-quoted or mismatched values: : 'value', : "value', : 'value" to : "value"
  cleaned = cleaned.replace(/:\s*['"](.*?)['"]\s*([,}\]])/gs, (match, quoteOpen, val, quoteClose, suffix) => {
    const safeVal = val.replace(/(?<!\\)"/g, '\\"');
    return `: "${safeVal}"${suffix}`;
  });

  // Repair common broken array quotes (e.g. [..., "desc] or [..., 'desc])
  cleaned = cleaned.replace(/\[\s*(.*?)\s*\]/gs, (match, arrayContent) => {
    const items = arrayContent.split(',').map(item => {
      let trimmed = item.trim();
      // If it starts with quote but doesn't end with quote
      if ((trimmed.startsWith('"') || trimmed.startsWith("'")) && 
          !(trimmed.endsWith('"') || trimmed.endsWith("'"))) {
        trimmed = trimmed + trimmed[0]; // append matching quote
      }
      // If it ends with quote but doesn't start with quote
      else if ((trimmed.endsWith('"') || trimmed.endsWith("'")) && 
               !(trimmed.startsWith('"') || trimmed.startsWith("'"))) {
        trimmed = trimmed[trimmed.length - 1] + trimmed; // prepend matching quote
      }
      return trimmed;
    });
    return `[${items.join(', ')}]`;
  });

  // Try parsing again after quote repairs
  try {
    const parsed2 = JSON.parse(cleaned);
    if (parsed2 && typeof parsed2 === 'object') {
      return parsed2;
    }
  } catch (e) {
    console.error('[AI] Raw faulty JSON output from model:\n', text);
    throw e;
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
      const content = response?.choices?.[0]?.message?.content;
      if (!content) throw new Error('503 Model returned an empty response');
      return safeJSONParse(content);
    } else if (provider === 'groq') {
      const modelName = env.AI_MODEL || 'llama-3.3-70b-versatile';
      const response = await groqClient.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      });
      const content = response?.choices?.[0]?.message?.content;
      if (!content) throw new Error('503 Model returned an empty response');
      return safeJSONParse(content);
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
