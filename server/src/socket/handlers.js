import {
  joinSession, getSession,
  addMessage, updateUserPage, removeUser,
} from '../services/session.js';
import { addProduct, removeProduct, voteProduct } from '../services/product.js';
import { handleChat, runAI, generateRecommendationQuestions } from '../services/ai.js';

export function registerHandlers(io, socket) {
  let currentRoom = null;
  let currentUserId = null;
  let currentUserName = null;

  let disconnectTimer = null;

  // ═══════════════════════════════════════
  // JOIN SESSION
  // ═══════════════════════════════════════
  socket.on('join-session', async ({ code, userName, userId }, callback) => {
    // Cancel pending disconnect (page refresh)
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }

    const { session, userId: finalUserId, isNewJoin, error } = await joinSession(code, userName, userId);
    if (error) return callback?.({ error });

    currentRoom = code;
    currentUserId = finalUserId;
    currentUserName = userName;
    socket.join(currentRoom);

    callback?.({ session, userId: finalUserId });

    const fullSession = await getSession(code);
    io.to(currentRoom).emit('user-joined', { users: fullSession.users });

    if (isNewJoin) {
      const joinMsg = await addMessage(code, `👋 **${userName}** odaya katıldı!`, 'SyncBot', true);
      io.to(currentRoom).emit('message', joinMsg);
    }
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

  socket.on('request-recommendation', async ({ productIds } = {}) => {
    if (!currentRoom) return;
    try {
      console.log(`[Socket] request-recommendation for room ${currentRoom} with products:`, productIds);
      const session = await getSession(currentRoom);
      
      let targetProducts = session.products || [];
      if (productIds && productIds.length > 0) {
        targetProducts = targetProducts.filter(p => productIds.includes(p.id));
      }

      if (targetProducts.length === 0) {
        const botMsg = await addMessage(currentRoom, "🤖 **SyncBot:** Karşılaştırmak için geçerli ürünler seçilmedi.", 'SyncBot');
        io.to(currentRoom).emit('message', botMsg);
        return;
      }
      
      const recommendationResponse = await generateRecommendationQuestions(targetProducts, session);
      const botMsg = await addMessage(currentRoom, recommendationResponse, 'SyncBot');
      io.to(currentRoom).emit('message', botMsg);
    } catch (err) {
      console.error('[Socket] request-recommendation error:', err);
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

  socket.on('remove-product', async ({ productId }) => {
    if (!currentRoom) return;
    const ok = await removeProduct(productId);
    if (ok) {
      io.to(currentRoom).emit('product-removed', { productId });
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
  // BROWSING, SCROLL & CURSOR SYNC
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
    socket.to(currentRoom).emit('user-scroll', { // Sadece diğerlerine gönder
      userId: currentUserId,
      scrollPercent,
      pageUrl,
    });
  });

  socket.on('cursor-move', ({ x, y, pageUrl }) => {
    if (!currentRoom || !currentUserId) return;
    // Broadcast to others in the room
    socket.to(currentRoom).emit('cursor-update', {
      userId: currentUserId,
      userName: currentUserName,
      x,
      y,
      pageUrl,
    });
  });

  // ═══════════════════════════════════════
  // DISCONNECT (grace period for page refresh)
  // ═══════════════════════════════════════
  socket.on('disconnect', () => {
    if (currentRoom && currentUserId) {
      const room = currentRoom;
      const uid = currentUserId;
      disconnectTimer = setTimeout(() => {
        removeUser(room, uid);
        io.to(room).emit('user-left', { userId: uid });
      }, 5000);
    }
  });
}
