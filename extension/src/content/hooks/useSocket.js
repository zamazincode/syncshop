import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { WS_URL } from '../../utils/config.js';

/**
 * useSocket — Socket.IO bağlantı yönetimi
 *
 * Custom Hook Nedir?
 * React'ta "use" ile başlayan fonksiyonlar "hook" olarak adlandırılır.
 * Hook'lar, component'lerin state ve side-effect mantığını
 * yeniden kullanılabilir şekilde paylaşmalarını sağlar.
 *
 * Bu hook ne yapar?
 * 1. Socket.IO bağlantısı kurar/kapatır (session state'e göre)
 * 2. Server'dan gelen event'leri dinler (message, product-added, vote-update...)
 * 3. Server'a event gönderir (send-message, add-product, vote...)
 * 4. Session state'i güncel tutar
 *
 * Neden ayrı hook? Çünkü socket mantığı hiçbir UI component'ine
 * bağımlı olmamalı. Sidebar, ProductCard, ChatPanel hepsi bu hook'u kullanır.
 */

export function useSocket() {
  const socketRef = useRef(null);
  const [session, setSession] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState('');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');

  // chrome.storage'dan mevcut durumu oku
  useEffect(() => {
    chrome.storage.local.get(
      ['ss_code', 'ss_name', 'ss_userId', 'ss_connected'],
      (data) => {
        setConnected(!!data.ss_connected);
        setCode(data.ss_code || '');
        setUserName(data.ss_name || '');
        setUserId(data.ss_userId || '');
      }
    );

    // Storage değişikliklerini dinle (popup'tan gelen güncellemeler)
    const listener = (changes) => {
      if (changes.ss_connected) setConnected(!!changes.ss_connected.newValue);
      if (changes.ss_code) setCode(changes.ss_code.newValue || '');
      if (changes.ss_name) setUserName(changes.ss_name.newValue || '');
      if (changes.ss_userId) setUserId(changes.ss_userId.newValue || '');
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  // Bağlantı durumuna göre socket'i aç/kapat
  useEffect(() => {
    if (!connected || !code || !userName) {
      // Bağlantı yok → socket'i kapat
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSession(null);
      return;
    }

    // Zaten bağlıysa tekrar bağlanma
    if (socketRef.current?.connected) return;

    const socket = io(WS_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      // Server'a katılım bildir
      socket.emit('join-session', { code, userName, userId }, (data) => {
        if (data?.session) {
          setSession(data.session);
          if (data.userId) {
            setUserId(data.userId);
            chrome.storage.local.set({ ss_userId: data.userId });
          }
        }
      });
    });

    // ═══ SERVER EVENT LISTENERS ═══

    socket.on('product-added', (product) => {
      setSession((prev) => {
        if (!prev) return prev;
        return { ...prev, products: [...prev.products, product] };
      });
    });

    socket.on('message', (msg) => {
      setSession((prev) => {
        if (!prev) return prev;
        return { ...prev, messages: [...prev.messages, msg] };
      });
    });

    socket.on('vote-update', ({ productId, votes }) => {
      setSession((prev) => {
        if (!prev) return prev;
        return { ...prev, votes: { ...prev.votes, [productId]: votes } };
      });
    });

    socket.on('ai-analysis', ({ productId, analysis }) => {
      setSession((prev) => {
        if (!prev) return prev;
        const products = prev.products.map((p) =>
          p.id === productId
            ? { ...p, aiAnalysis: analysis, aiStatus: analysis ? 'done' : 'failed' }
            : p
        );
        return { ...prev, products };
      });
    });

    socket.on('user-joined', ({ users }) => {
      setSession((prev) => (prev ? { ...prev, users } : prev));
    });

    socket.on('user-left', ({ userId: leftId }) => {
      setSession((prev) => {
        if (!prev) return prev;
        return { ...prev, users: prev.users.filter((u) => u.id !== leftId) };
      });
    });

    socket.on('product-removed', ({ productId }) => {
      setSession((prev) => {
        if (!prev) return prev;
        const products = prev.products.filter((p) => p.id !== productId);
        const votes = { ...prev.votes };
        delete votes[productId];
        return { ...prev, products, votes };
      });
    });

    socket.on('user-browsing', ({ userId: browsingUserId, page }) => {
      setSession((prev) => {
        if (!prev) return prev;
        const users = prev.users.map((u) =>
          u.id === browsingUserId ? { ...u, currentPage: page } : u
        );
        return { ...prev, users };
      });
    });

    socket.on('recommendation-questions', ({ productIds, questions }) => {
      setActiveQuiz({ productIds, questions });
      setIsQuizLoading(false);
    });

    // Cleanup: component unmount olduğunda socket'i kapat
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [connected, code, userName]); // Bu 3 değer değiştiğinde socket yeniden bağlanır

  // ═══ OUTGOING ACTIONS ═══

  const sendMessage = useCallback((text) => {
    socketRef.current?.emit('send-message', { text });
  }, []);

  const addProduct = useCallback((product) => {
    socketRef.current?.emit('add-product', { product });
  }, []);

  const requestAnalysis = useCallback((product, reviews) => {
    socketRef.current?.emit('request-analysis', { product, reviews });
  }, []);

  const vote = useCallback((productId, voteType) => {
    socketRef.current?.emit('vote', { productId, voteType });
  }, []);

  const sendBrowsingUpdate = useCallback((pageTitle, pageUrl) => {
    socketRef.current?.emit('browsing-update', { pageTitle, pageUrl });
  }, []);

  const removeProduct = useCallback((productId) => {
    socketRef.current?.emit('remove-product', { productId });
  }, []);

  const requestRecommendation = useCallback((productIds) => {
    setIsQuizLoading(true);
    socketRef.current?.emit('request-recommendation', { productIds });
  }, []);

  const submitRecommendationAnswers = useCallback((productIds, answers) => {
    socketRef.current?.emit('submit-recommendation-answers', { productIds, answers });
  }, []);

  const sendCursorUpdate = useCallback((x, y, pageUrl) => {
    // Note: To avoid react state overhead for high-frequency events, 
    // we use a direct emit here. We could also expose socketRef.
    socketRef.current?.emit('cursor-move', { x, y, pageUrl });
  }, []);

  // Disconnect handler (popup'tan gelen mesaj)
  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === 'ss-disconnect') {
        setConnected(false);
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
        setSession(null);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  return {
    socket: socketRef.current,
    session,
    setSession,
    connected,
    userId,
    userName,
    code,
    activeQuiz,
    setActiveQuiz,
    isQuizLoading,
    // Actions
    sendMessage,
    addProduct,
    removeProduct,
    requestAnalysis,
    requestRecommendation,
    submitRecommendationAnswers,
    vote,
    sendBrowsingUpdate,
    sendCursorUpdate,
  };
}
