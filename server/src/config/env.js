import 'dotenv/config';

export const env = {
  PORT: process.env.PORT || 3001,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
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

if (!env.GEMINI_API_KEY) {
  console.warn('[ENV] GEMINI_API_KEY not set — AI features will be disabled');
}
