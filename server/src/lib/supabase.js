import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from '../config/env.js';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
  realtime: { transport: ws },
});

console.log('[DB] Supabase client initialized.');
