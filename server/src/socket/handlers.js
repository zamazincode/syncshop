import {
  joinSession, getSession,
  addMessage, updateUserPage, removeUser,
} from '../services/session.js';
import { addProduct, removeProduct, voteProduct, updateProductAnalysis, mapProductDbToFrontend } from '../services/product.js';
import { handleChat, runAI, analyzeProduct, generateRecommendationQuestions, generateFinalRecommendation } from '../services/ai.js';
import { supabase } from '../lib/supabase.js';

// Global map to track disconnect timers across socket connections (e.g. page refreshes)
const disconnectTimers = new Map(); // "room:userId" -> timeoutId

// Global map to track active recommendation quizzes (e.g. page refreshes)
const activeQuizzes = new Map(); // "room:userId" -> { productIds, questions }


export function registerHandlers(io, socket) {
  let currentRoom = null;
  let currentUserId = null;
  let currentUserName = null;

  // ═══════════════════════════════════════
  // JOIN SESSION
  // ═══════════════════════════════════════
  socket.on('join-session', async ({ code, userName, userId }, callback) => {
    const { session, userId: finalUserId, isNewJoin, error } = await joinSession(code, userName, userId);
    if (error) return callback?.({ error });

    currentRoom = code;
    currentUserId = finalUserId;
    currentUserName = userName;
    socket.join(currentRoom);

    // Cancel pending disconnect if user reconnected within the grace period
    const key = `${code}:${finalUserId}`;
    if (disconnectTimers.has(key)) {
      clearTimeout(disconnectTimers.get(key));
      disconnectTimers.delete(key);
      console.log(`[Socket] Reconnection detected: user ${userName} (${finalUserId}), cancelled disconnect timer.`);
    }

    callback?.({ session, userId: finalUserId });

    // Send active quiz if this user had one in progress
    const quizKey = `${code}:${finalUserId}`;
    if (activeQuizzes.has(quizKey)) {
      const activeQuiz = activeQuizzes.get(quizKey);
      socket.emit('recommendation-questions', activeQuiz);
    }

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

      // Auto-analyze products that haven't been analyzed yet
      const unanalyzed = targetProducts.filter(p => !p.aiAnalysis);
      if (unanalyzed.length > 0) {
        console.log(`[Socket] Auto-analyzing ${unanalyzed.length} products before comparison...`);

        await Promise.all(unanalyzed.map(async (product) => {
          const analysis = await analyzeProduct(product);

          if (analysis) {
            product.aiAnalysis = analysis;
            await updateProductAnalysis(product.id, analysis);
            io.to(currentRoom).emit('ai-analysis', { productId: product.id, analysis });
            console.log(`[Socket] Auto-analyzed: ${product.name} (trust: ${analysis.trustScore}%)`);
          }
        }));
      }

      const result = await generateRecommendationQuestions(targetProducts, session);

      if (!result || !result.questions) {
        const botMsg = await addMessage(currentRoom, "🤖 **SyncBot:** Sorular oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.", 'SyncBot');
        io.to(currentRoom).emit('message', botMsg);
        return;
      }

      const quizData = {
        productIds,
        questions: result.questions,
      };

      // Save to active quizzes map
      const quizKey = `${currentRoom}:${currentUserId}`;
      activeQuizzes.set(quizKey, quizData);

      // Send structured questions ONLY to the initiating client
      socket.emit('recommendation-questions', quizData);
    } catch (err) {
      console.error('[Socket] request-recommendation error:', err);
    }
  });

  socket.on('submit-recommendation-answers', async ({ productIds, answers } = {}) => {
    if (!currentRoom) return;
    try {
      console.log(`[Socket] submit-recommendation-answers for room ${currentRoom}`);
      const session = await getSession(currentRoom);

      let targetProducts = session.products || [];
      if (productIds && productIds.length > 0) {
        targetProducts = targetProducts.filter(p => productIds.includes(p.id));
      }

      const finalResponse = await generateFinalRecommendation(targetProducts, session, answers);
      const botMsg = await addMessage(currentRoom, finalResponse, 'SyncBot');
      io.to(currentRoom).emit('message', botMsg);

      // Clean up active quiz for this user
      const quizKey = `${currentRoom}:${currentUserId}`;
      activeQuizzes.delete(quizKey);
    } catch (err) {
      console.error('[Socket] submit-recommendation-answers error:', err);
    }
  });

  socket.on('dismiss-recommendation', () => {
    if (!currentRoom || !currentUserId) return;
    const quizKey = `${currentRoom}:${currentUserId}`;
    activeQuizzes.delete(quizKey);
    console.log(`[Socket] dismiss-recommendation: quiz cleared for user ${currentUserId} in room ${currentRoom}`);
  });

  // ═══════════════════════════════════════
  // PRODUCTS
  // ═══════════════════════════════════════
  socket.on('add-product', async ({ product }) => {
    if (!currentRoom) return;
    console.log(`[Socket] add-product: ${product.name}`);
    console.log(`[Socket] description length: ${(product.description || '').length}, preview: ${(product.description || '').substring(0, 100)}`);

    const newProduct = await addProduct(currentRoom, product, currentUserName);
    if (newProduct) {
      io.to(currentRoom).emit('product-added', newProduct);
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

    // Veritabanından en güncel ürünü çekip açıklamayı kaybetmediğimizden emin oluyoruz
    const { data: dbProduct } = await supabase
      .from('products')
      .select('*')
      .eq('id', product.id)
      .single();

    const mergedProduct = dbProduct
      ? mapProductDbToFrontend(dbProduct)
      : product;

    // Debug: description izleme
    const desc = mergedProduct.description || mergedProduct.aiAnalysis?.description || '';
    console.log(`[Socket] analysis desc source: description=${!!mergedProduct.description}, aiAnalysis.description=${!!mergedProduct.aiAnalysis?.description}, length=${desc.length}`);

    mergedProduct.reviews = reviews;
    runAI(io, currentRoom, mergedProduct);
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
      const key = `${room}:${uid}`;

      // Clear any existing disconnect timer for this user connection
      if (disconnectTimers.has(key)) {
        clearTimeout(disconnectTimers.get(key));
      }

      const timer = setTimeout(() => {
        removeUser(room, uid);
        io.to(room).emit('user-left', { userId: uid });
        disconnectTimers.delete(key);

        // Clean up active quiz for the departed user
        activeQuizzes.delete(key);
        console.log(`[Socket] User ${uid} left session ${room}, cleared active quiz.`);
      }, 5000);

      disconnectTimers.set(key, timer);
    }
  });
}
