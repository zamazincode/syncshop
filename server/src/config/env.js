import 'dotenv/config';

/**
 * Environment Configuration
 *
 * AI_PROVIDER: Hangi AI servisini kullanacağımızı belirler.
 *   - 'groq'   → Development (ücretsiz, hızlı, Llama 3.3)
 *   - 'gemini' → Production (Google Gemini API)
 *
 * AI_API_KEY: Seçilen provider'ın API anahtarı.
 *   - Groq:   console.groq.com → API Keys
 *   - Gemini: aistudio.google.com → API Key
 *
 * Bu yaklaşım sayesinde AI provider'ını değiştirmek için
 * sadece .env dosyasını güncellemen yeterli, kod değişikliği yok.
 */

export const env = {
  PORT: process.env.PORT || 3001,

  // AI Config
  AI_PROVIDER: process.env.AI_PROVIDER || 'gemini', // 'groq' | 'gemini'
  AI_API_KEY: process.env.AI_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '', // Gemini backward compat

  // DB Config
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_KEY: process.env.SUPABASE_KEY || '',
};

// Validate required environment variables
const required = ['SUPABASE_URL', 'SUPABASE_KEY'];
for (const key of required) {
  if (!env[key]) {
    console.error(`[ENV] Missing required environment variable: ${key}`);
  }
}

// AI key validation
const aiKey = env.AI_API_KEY || env.GEMINI_API_KEY;
if (!aiKey) {
  console.warn('[ENV] AI_API_KEY not set — AI features will be disabled');
}
