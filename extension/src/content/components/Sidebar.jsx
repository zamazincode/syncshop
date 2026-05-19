import { useState } from 'react';
import Header from './Header.jsx';
import UsersTray from './UsersTray.jsx';
import ProductList from './ProductList.jsx';
import ChatPanel from './ChatPanel.jsx';
import { Plug, ShoppingBag, MessageSquare, Eye } from 'lucide-react';

/**
 * Sidebar — Ana sidebar container
 */
export default function Sidebar({
  isOpen, onClose,
  code, users,
  session, userId, userName,
  onVote, onAnalyze, onSendMessage, onRemoveProduct, onRequestRecommendation,
  connected,
  detectedProduct, isAdded, onAddProduct
}) {
  const [activeTab, setActiveTab] = useState('chat');

  const products = session?.products || [];
  const messages = session?.messages || [];
  const votes = session?.votes || {};

  const unreadCount = activeTab !== 'chat' && messages.length > 0 ? '•' : '';

  function handleRequestRecommendation(productIds) {
    setActiveTab('chat');
    onRequestRecommendation(productIds);
  }

  return (
    <div
      className={`fixed top-4 bottom-4 w-[380px] bg-glass backdrop-blur-[24px] backdrop-saturate-[180%] border border-border rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col text-text font-sans z-[2147483647] overflow-hidden transition-all duration-600 ${
        isOpen ? 'right-4' : '-right-[420px]'
      }`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <Header code={code} onClose={onClose} />

      {!connected ? (
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center opacity-70">
          <div className="mb-5 text-white/30 flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/5">
            <Plug size={24} strokeWidth={1} />
          </div>
          <h2 className="text-[15px] font-medium mb-2 tracking-wide uppercase text-white/90">Oturum Açılmadı</h2>
          <p className="text-[11px] text-white/40 font-light leading-relaxed">
            SyncShop'u başlatmak için uzantı simgesinden bir odaya katılın veya yeni bir oda kurun.
          </p>
        </div>
      ) : (
        <>
          <UsersTray users={users} />

          <div className="flex px-6 gap-6 border-b border-white/5 shrink-0">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 text-[10px] font-medium uppercase tracking-[0.2em] relative cursor-pointer bg-transparent border-none flex items-center gap-2 ${
                activeTab === 'products' ? 'text-white' : 'text-white/40 hover:text-white/70'
              } transition-colors`}
            >
              <ShoppingBag size={14} strokeWidth={1.25} /> KOLEKSİYON <span className="text-white/40 font-light">{products.length}</span>
              {activeTab === 'products' && (
                <span className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-4 text-[10px] font-medium uppercase tracking-[0.2em] relative cursor-pointer bg-transparent border-none flex items-center gap-2 ${
                activeTab === 'chat' ? 'text-white' : 'text-white/40 hover:text-white/70'
              } transition-colors`}
            >
              <MessageSquare size={14} strokeWidth={1.25} /> MESAJLAR {unreadCount && <span className="text-white ml-1">{unreadCount}</span>}
              {activeTab === 'chat' && (
                <span className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
              )}
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === 'products' && detectedProduct && !isAdded && (
              <div className="mx-5 mt-5 p-3.5 rounded-xl bg-transparent border border-white/10 flex flex-col gap-2.5 shrink-0 animate-[slideUp_0.4s_ease-out]">
                <div className="flex items-center gap-1.5">
                  <Eye size={14} strokeWidth={1.25} className="text-white/60" />
                  <span className="text-[9px] font-medium text-white/60 uppercase tracking-widest">Şu An İnceliyorsun</span>
                </div>
                <div className="text-[13px] font-normal text-white/90 truncate">{detectedProduct.name}</div>
                <button 
                  onClick={onAddProduct}
                  className="mt-1 w-full flex items-center justify-center gap-2 py-2 bg-white text-black rounded-lg text-[11px] font-medium tracking-wide transition-all cursor-pointer border border-transparent hover:bg-gray-200"
                >
                  <ShoppingBag size={13} strokeWidth={1.25} /> Koleksiyona Ekle
                </button>
              </div>
            )}

            {activeTab === 'products' ? (
              <ProductList
                products={products}
                votes={votes}
                userId={userId}
                onVote={onVote}
                onAnalyze={onAnalyze}
                onRemove={onRemoveProduct}
                onRequestRecommendation={handleRequestRecommendation}
              />
            ) : (
              <ChatPanel
                messages={messages}
                userName={userName}
                users={users}
                onSend={onSendMessage}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
