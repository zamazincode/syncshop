import { useState, useCallback } from 'react';
import { useSocket } from './hooks/useSocket.js';
import { useProductDetector } from './hooks/useProductDetector.js';
import Sidebar from './components/Sidebar.jsx';
import Fab from './components/Fab.jsx';
import { fetchTrendyolReviews, fetchTrendyolDescription } from '../utils/reviewFetcher.js';

import CursorOverlay from './components/CursorOverlay.jsx';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addedUrls, setAddedUrls] = useState(new Set());

  const {
    session, connected, userId, userName, code, socket,
    sendMessage, addProduct, removeProduct, requestAnalysis, requestRecommendation, vote,
    sendBrowsingUpdate, sendCursorUpdate, setSession,
    activeQuiz, setActiveQuiz, submitRecommendationAnswers, dismissRecommendation, isQuizLoading, isBotThinking,
  } = useSocket();

  const { detectedProduct } = useProductDetector({
    connected,
    sendBrowsingUpdate,
  });

  const isProductAdded = Boolean(
    detectedProduct && (
      addedUrls.has(detectedProduct.productUrl) ||
      session?.products?.some(p => p.productUrl === detectedProduct.productUrl || p.url === detectedProduct.productUrl)
    )
  );

  async function handleAddProduct() {
    if (!detectedProduct || !connected) return;

    let reviews = [];
    let apiDescription = '';

    if (detectedProduct.site === 'trendyol') {
      console.log('[SyncShop] Fetching reviews + description for:', detectedProduct.productUrl);
      try {
        // Yorumları ve açıklamayı paralel olarak çek — ikisi birbirinden bağımsız
        const [fetchedReviews, fetchedDesc] = await Promise.all([
          fetchTrendyolReviews(detectedProduct.productUrl, detectedProduct.ratingValue).catch(() => []),
          fetchTrendyolDescription(detectedProduct.productUrl).catch(() => ''),
        ]);
        reviews = fetchedReviews;
        apiDescription = fetchedDesc;
        console.log(`[SyncShop] Scraped ${reviews.length} reviews, description length: ${apiDescription.length}`);
      } catch (err) {
        console.error('[SyncShop] Review/description fetching error:', err);
      }
    }

    // Açıklama için SADECE API kullan — DOM güvenilmez çünkü Trendyol
    // açıklamaları asenkron yüklüyor, sayfa DOM'unda genelde boş geliyor.
    addProduct({ ...detectedProduct, description: apiDescription || '', reviews });
    setAddedUrls((prev) => new Set(prev).add(detectedProduct.productUrl));
  }

  function handleAnalyze(product, reviews) {
    setSession((prev) => {
      if (!prev) return prev;
      const products = prev.products.map((p) =>
        p.id === product.id ? { ...p, aiStatus: 'analyzing' } : p
      );
      return { ...prev, products };
    });
    requestAnalysis(product, reviews);
  }

  function handleRequestRecommendation(productIds) {
    requestRecommendation(productIds);
    setSidebarOpen(true);
  }

  return (
    <>
      {connected && (
        <CursorOverlay
          socket={socket}
          sendCursorUpdate={sendCursorUpdate}
          connected={connected}
          session={session}
        />
      )}
      <Fab
        onClick={() => setSidebarOpen((prev) => !prev)}
        detectedProduct={detectedProduct}
        onAddProduct={handleAddProduct}
        connected={connected}
        isAdded={isProductAdded}
      />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        code={code}
        users={session?.users || []}
        session={session}
        userId={userId}
        userName={userName}
        connected={connected}
        onVote={vote}
        onAnalyze={handleAnalyze}
        onSendMessage={sendMessage}
        onRemoveProduct={removeProduct}
        onRequestRecommendation={handleRequestRecommendation}
        activeQuiz={activeQuiz}
        onQuizComplete={(productIds, answers) => {
          submitRecommendationAnswers(productIds, answers);
          setActiveQuiz(null);
        }}
        onQuizDismiss={dismissRecommendation}
        isQuizLoading={isQuizLoading}
        isBotThinking={isBotThinking}
        detectedProduct={detectedProduct}
        isAdded={isProductAdded}
        onAddProduct={handleAddProduct}
      />
    </>
  );
}
