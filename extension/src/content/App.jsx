import { useState } from 'react';
import { useSocket } from './hooks/useSocket.js';
import { useProductDetector } from './hooks/useProductDetector.js';
import Sidebar from './components/Sidebar.jsx';
import Fab from './components/Fab.jsx';

/**
 * App — Content Script Root Component
 *
 * Bu, sidebar'ın "beyni". Tüm hook'ları burada çağırır,
 * state'i yönetir ve alt component'lere props olarak iletir.
 *
 * React'ta veri akışı TEK YÖNLÜDÜR (unidirectional):
 *   App (state) → Sidebar → ProductList → ProductCard
 *   ProductCard'daki buton tıklaması → callback → App → Socket → Server
 *
 * Bu sayede her component sadece kendi işini bilir.
 */
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // useSocket: Socket.IO bağlantısı + tüm session state
  const {
    session, connected, userId, userName, code,
    sendMessage, addProduct, requestAnalysis, vote,
    sendBrowsingUpdate, setSession,
  } = useSocket();

  // useProductDetector: Otomatik ürün algılama
  useProductDetector({
    connected,
    session,
    addProduct,
    sendBrowsingUpdate,
  });

  // AI analiz handler: Ürün kartındaki butona tıklayınca
  function handleAnalyze(product, reviews) {
    // UI'da "analyzing" durumunu göster
    setSession((prev) => {
      if (!prev) return prev;
      const products = prev.products.map((p) =>
        p.id === product.id ? { ...p, aiStatus: 'analyzing' } : p
      );
      return { ...prev, products };
    });

    // Server'a analiz isteği gönder
    requestAnalysis(product, reviews);
  }

  return (
    <>
      <Fab onClick={() => setSidebarOpen((prev) => !prev)} />
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
      />
    </>
  );
}
