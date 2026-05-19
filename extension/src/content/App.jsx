import { useState, useCallback } from 'react';
import { useSocket } from './hooks/useSocket.js';
import { useProductDetector } from './hooks/useProductDetector.js';
import Sidebar from './components/Sidebar.jsx';
import Fab from './components/Fab.jsx';
import { fetchTrendyolReviews } from '../utils/reviewFetcher.js';

import CursorOverlay from './components/CursorOverlay.jsx';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addedUrls, setAddedUrls] = useState(new Set());

  const {
    session, connected, userId, userName, code, socket,
    sendMessage, addProduct, removeProduct, requestAnalysis, requestRecommendation, vote,
    sendBrowsingUpdate, sendCursorUpdate, setSession,
    activeQuiz, setActiveQuiz, submitRecommendationAnswers, isQuizLoading,
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

    // Fetch reviews while adding (non-blocking for UI)
    let reviews = [];
    if (detectedProduct.site === 'trendyol') {
      reviews = await fetchTrendyolReviews(detectedProduct.productUrl, detectedProduct.ratingValue);
    }

    addProduct({ ...detectedProduct, reviews });
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
        onQuizDismiss={() => setActiveQuiz(null)}
        isQuizLoading={isQuizLoading}
        detectedProduct={detectedProduct}
        isAdded={isProductAdded}
        onAddProduct={handleAddProduct}
      />
    </>
  );
}
