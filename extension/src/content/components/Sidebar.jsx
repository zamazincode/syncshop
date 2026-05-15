import { useState } from 'react';
import Header from './Header.jsx';
import UsersTray from './UsersTray.jsx';
import ProductList from './ProductList.jsx';
import ChatPanel from './ChatPanel.jsx';

/**
 * Sidebar — Ana sidebar container
 *
 * Açık/kapalı durumunu yönetir, tab switching yapar.
 * İki sekme: Koleksiyon (ürünler) ve Mesajlar (chat).
 *
 * Mimari notu: Sidebar sadece layout'tan sorumlu.
 * İş mantığı (socket, session) App.jsx'te kalır ve
 * props olarak buraya akar.
 */
export default function Sidebar({
  isOpen, onClose,
  code, users,
  session, userId, userName,
  onVote, onAnalyze, onSendMessage,
  connected,
}) {
  const [activeTab, setActiveTab] = useState('products');

  const products = session?.products || [];
  const messages = session?.messages || [];
  const votes = session?.votes || {};

  // Okunmamış mesaj sayısı (basit implementasyon)
  const unreadCount = activeTab !== 'chat' && messages.length > 0 ? '•' : '';

  return (
    <div
      className={`fixed top-4 bottom-4 w-[380px] bg-glass backdrop-blur-[24px] backdrop-saturate-[180%] border border-border rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col text-text font-sans z-[2147483647] overflow-hidden transition-all duration-600 ${
        isOpen ? 'right-4' : '-right-[420px]'
      }`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <Header code={code} onClose={onClose} />

      {!connected ? (
        /* ═══ DISCONNECTED VIEW ═══ */
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
          <div className="text-5xl mb-5">🔌</div>
          <h2 className="text-xl font-bold mb-3">Oturum Açılmadı</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            SyncShop'u başlatmak için uzantı simgesinden bir odaya katılın veya yeni bir oda kurun.
          </p>
        </div>
      ) : (
        /* ═══ CONNECTED VIEW ═══ */
        <>
          <UsersTray users={users} />

          {/* Tabs */}
          <div className="flex px-6 gap-5 border-b border-border shrink-0">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 text-sm font-semibold relative cursor-pointer bg-transparent border-none ${
                activeTab === 'products' ? 'text-white' : 'text-text-muted hover:text-white'
              } transition-colors`}
            >
              🛍️ Koleksiyon <span className="text-text-muted">{products.length}</span>
              {activeTab === 'products' && (
                <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px] shadow-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-4 text-sm font-semibold relative cursor-pointer bg-transparent border-none ${
                activeTab === 'chat' ? 'text-white' : 'text-text-muted hover:text-white'
              } transition-colors`}
            >
              💬 Mesajlar {unreadCount && <span className="text-primary ml-1">{unreadCount}</span>}
              {activeTab === 'chat' && (
                <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px] shadow-primary" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === 'products' ? (
              <ProductList
                products={products}
                votes={votes}
                userId={userId}
                onVote={onVote}
                onAnalyze={onAnalyze}
              />
            ) : (
              <ChatPanel
                messages={messages}
                userName={userName}
                onSend={onSendMessage}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
