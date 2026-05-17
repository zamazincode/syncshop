import { useState, useCallback } from 'react';
import { useSocket } from './hooks/useSocket.js';
import { useProductDetector } from './hooks/useProductDetector.js';
import Sidebar from './components/Sidebar.jsx';
import Fab from './components/Fab.jsx';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addedUrls, setAddedUrls] = useState(new Set());

  const {
    session, connected, userId, userName, code,
    sendMessage, addProduct, removeProduct, requestAnalysis, requestRecommendation, vote,
    sendBrowsingUpdate, setSession,
  } = useSocket();

  const { detectedProduct } = useProductDetector({
    connected,
    sendBrowsingUpdate,
  });

  const isProductAdded = detectedProduct && addedUrls.has(detectedProduct.productUrl);

  function handleAddProduct() {
    if (!detectedProduct || !connected) return;
    addProduct(detectedProduct);
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

  function handleRequestRecommendation() {
    requestRecommendation();
    setSidebarOpen(true);
  }

  return (
    <>
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
      />
    </>
  );
}
