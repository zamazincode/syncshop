import {
  joinSession, getSession,
  addMessage, updateUserPage, removeUser,
} from '../services/session.js';
import { addProduct, voteProduct } from '../services/product.js';
import { handleChat, runAI } from '../services/ai.js';

export function registerHandlers(io, socket) {
  let currentRoom = null;
  let currentUserId = null;
  let currentUserName = null;

  // ═══════════════════════════════════════
  // JOIN SESSION
  // ═══════════════════════════════════════
  socket.on('join-session', async ({ code, userName, userId }, callback) => {
    const { session, userId: finalUserId, error } = await joinSession(code, userName, userId);
    if (error) return callback?.({ error });

    currentRoom = code;
    currentUserId = finalUserId;
    currentUserName = userName;
    socket.join(currentRoom);

    callback?.({ session, userId: finalUserId });

    const fullSession = await getSession(code);
    io.to(currentRoom).emit('user-joined', { users: fullSession.users });
  });

  // ═══════════════════════════════════════
  // MESSAGING
  // ═══════════════════════════════════════
  socket.on('send-message', async ({ text }) => {
    if (!currentRoom) return;

    try {
      const msg = await addMessage(currentRoom, text, currentUserName);
      io.to(currentRoom).emit('message', msg);

      // Bot trigger: @syncbot
      if (text.toLowerCase().includes('@syncbot')) {
        const session = await getSession(currentRoom);
        console.log('[Socket] AI chat triggered');
        const botResponse = await handleChat(text, session);
        const botMsg = await addMessage(currentRoom, botResponse, 'SyncBot');
        io.to(currentRoom).emit('message', botMsg);
      }
    } catch (err) {
      console.error('[Socket] send-message error:', err);
    }
  });

  // ═══════════════════════════════════════
  // PRODUCTS
  // ═══════════════════════════════════════
  socket.on('add-product', async ({ product }) => {
    if (!currentRoom) return;
    console.log(`[Socket] add-product: ${product.name}`);

    const newProduct = await addProduct(currentRoom, product, currentUserName);
    if (newProduct) {
      const mapped = {
        ...newProduct,
        imageUrl: newProduct.image_url,
        productUrl: newProduct.product_url,
      };
      io.to(currentRoom).emit('product-added', mapped);
    }
  });

  socket.on('request-analysis', async ({ product, reviews }) => {
    if (!currentRoom) return;
    console.log(`[Socket] request-analysis: ${product.name}`);
    product.reviews = reviews;
    runAI(io, currentRoom, product);
  });

  // ═══════════════════════════════════════
  // VOTING
  // ═══════════════════════════════════════
  socket.on('vote', async ({ productId, voteType }) => {
    if (!currentRoom || !currentUserId) return;
    const votes = await voteProduct(currentRoom, productId, currentUserId, voteType);
    io.to(currentRoom).emit('vote-update', { productId, votes });
  });

  // ═══════════════════════════════════════
  // BROWSING & SCROLL SYNC
  // ═══════════════════════════════════════
  socket.on('browsing-update', ({ pageTitle, pageUrl }) => {
    if (!currentRoom || !currentUserId) return;
    updateUserPage(currentRoom, currentUserId, { title: pageTitle, url: pageUrl });
    io.to(currentRoom).emit('user-browsing', {
      userId: currentUserId,
      page: { title: pageTitle, url: pageUrl },
    });
  });

  socket.on('scroll-update', ({ scrollPercent, pageUrl }) => {
    if (!currentRoom || !currentUserId) return;
    io.to(currentRoom).emit('user-scroll', {
      userId: currentUserId,
      scrollPercent,
      pageUrl,
    });
  });

  // ═══════════════════════════════════════
  // DISCONNECT
  // ═══════════════════════════════════════
  socket.on('disconnect', () => {
    if (currentRoom && currentUserId) {
      removeUser(currentRoom, currentUserId);
      io.to(currentRoom).emit('user-left', { userId: currentUserId });
    }
  });
}
