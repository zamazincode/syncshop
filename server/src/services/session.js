import { supabase } from '../lib/supabase.js';
import { productVotes } from './product.js';

// ═══════════════════════════════════════
// IN-MEMORY ONLINE USERS (per room)
// ═══════════════════════════════════════
const onlineUsers = new Map();

const genId = () => Math.random().toString(36).substring(2, 9);
const genRoomCode = () => 'SS-' + Math.random().toString(36).substring(2, 6).toUpperCase();

// ═══════════════════════════════════════
// SESSION CRUD
// ═══════════════════════════════════════

export async function createSession(category = 'genel') {
  const code = genRoomCode();
  console.log(`[Session] Creating: ${code}`);

  const { data, error } = await supabase
    .from('sessions')
    .insert([{ code, category }])
    .select()
    .single();

  if (error) {
    console.error('[Session] Create error:', error);
    throw error;
  }

  await addMessage(code, `🛍️ **SyncShop Oturumu Başladı!**\nOda kodu: **${code}**\n\nTrendyol veya Hepsiburada'da ürün sayfalarına gidin, ürünler otomatik eklenecek.\n💡 Bana soru sormak için **@SyncBot** yazın!`, 'SyncBot', true);

  return {
    session: { ...data, users: [], products: [], messages: [] },
    userId: genId(),
  };
}

export async function joinSession(code, userName, existingUserId = null) {
  console.log(`[Session] User joining: ${userName} → ${code}`);

  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !session) return { error: 'Oturum bulunamadı.' };

  const userId = existingUserId || genId();

  if (!onlineUsers.has(code)) onlineUsers.set(code, []);
  const users = onlineUsers.get(code);

  let isNewJoin = false;

  const existingById = users.find((u) => u.id === userId);
  if (existingById) {
    existingById.online = true;
    existingById.name = userName;
  } else {
    const existingByName = users.findIndex((u) => u.name === userName);
    if (existingByName !== -1) {
      users.splice(existingByName, 1);
    } else {
      isNewJoin = true;
    }
    users.push({ id: userId, name: userName, online: true });
  }

  const fullSession = await getSession(code);
  return { session: fullSession, userId, isNewJoin };
}

export async function getSession(code) {
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('code', code)
    .single();

  if (!session) return null;

  const { data: productsRaw } = await supabase
    .from('products')
    .select('*')
    .eq('session_code', code)
    .order('created_at', { ascending: true });

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('session_code', code)
    .order('created_at', { ascending: true });

  // Map snake_case → camelCase for frontend
  const products = (productsRaw || []).map((p) => ({
    ...p,
    imageUrl: p.image_url,
    productUrl: p.product_url,
    aiAnalysis: p.ai_analysis,
  }));

  // Fetch votes from in-memory map
  const votes = {};
  products.forEach((p) => {
    votes[p.id] = productVotes.get(p.id) || {};
  });

  return {
    ...session,
    products,
    messages: messages || [],
    votes,
    users: onlineUsers.get(code) || [],
  };
}

// ═══════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════

export async function addMessage(code, text, from, isBot = false) {
  const { data } = await supabase
    .from('messages')
    .insert([{ session_code: code, from, text, is_bot: isBot }])
    .select()
    .single();

  return data;
}

// ═══════════════════════════════════════
// USER STATE
// ═══════════════════════════════════════

export function updateUserPage(code, userId, page) {
  const users = onlineUsers.get(code) || [];
  const user = users.find((u) => u.id === userId);
  if (user) user.currentPage = page;
}

export function removeUser(code, userId) {
  const users = onlineUsers.get(code) || [];
  const index = users.findIndex((u) => u.id === userId);
  if (index !== -1) users.splice(index, 1);

  // Oda boşaldıysa → map'ten sil (zombie session önleme)
  if (users.length === 0) {
    onlineUsers.delete(code);
    console.log(`[Session] Room ${code} empty, cleaned up`);
  }
}

/**
 * Bir oda hâlâ aktif mi kontrol et (en az 1 online kullanıcı var mı).
 */
export function isRoomActive(code) {
  return onlineUsers.has(code) && onlineUsers.get(code).length > 0;
}
