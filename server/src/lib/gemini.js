import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

let genAI = null;
let isConfigured = false;

export function initGemini() {
  if (!env.GEMINI_API_KEY) {
    console.warn('[AI] GEMINI_API_KEY not set — AI functions will be disabled');
    return;
  }
  try {
    genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    isConfigured = true;
    console.log('[AI] Gemini initialized');
  } catch (e) {
    console.error('[AI] Gemini init failed:', e.message);
  }
}

/**
 * Get a Gemini model instance with optional config overrides.
 */
export function getModel(options = {}) {
  if (!genAI) return null;
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    ...options,
  });
}

/**
 * Get a model configured for JSON responses.
 */
export function getJsonModel() {
  if (!genAI) return null;
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });
}

export function isAIReady() {
  return isConfigured;
}
