import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './Header.jsx';
import UsersTray from './UsersTray.jsx';
import ProductList from './ProductList.jsx';
import ChatPanel from './ChatPanel.jsx';
import { Plug, ShoppingBag, MessageSquare, Eye, ChevronDown, ChevronUp, Bot } from 'lucide-react';

/**
 * Sidebar — Ana sidebar container
 */
export default function Sidebar({
  isOpen, onClose,
  code, users,
  session, userId, userName,
  onVote, onAnalyze, onSendMessage, onRemoveProduct, onRequestRecommendation,
  activeQuiz, onQuizComplete, onQuizDismiss, isQuizLoading, isBotThinking,
  connected,
  detectedProduct, isAdded, onAddProduct
}) {
  const [activeTab, setActiveTab] = useState('chat');
  const [width, setWidth] = useState(380);
  const [position, setPosition] = useState('right');
  const [productsCollapsed, setProductsCollapsed] = useState(true);

  const isResizingRef = useRef(false);

  const products = session?.products || [];
  const messages = session?.messages || [];
  const votes = session?.votes || {};

  // Load saved width/position
  useEffect(() => {
    chrome.storage.local.get(['ss_sidebarWidth', 'ss_sidebarPosition'], (data) => {
      if (data.ss_sidebarWidth) setWidth(Number(data.ss_sidebarWidth));
      if (data.ss_sidebarPosition) setPosition(data.ss_sidebarPosition);
    });
  }, []);

  const togglePosition = useCallback(() => {
    const newPos = position === 'right' ? 'left' : 'right';
    setPosition(newPos);
    chrome.storage.local.set({ ss_sidebarPosition: newPos });
  }, [position]);

  const widthRef = useRef(width);
  const positionRef = useRef(position);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Resizing mouse events
  const startResizing = useCallback((e) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      let newWidth;
      if (positionRef.current === 'right') {
        newWidth = window.innerWidth - e.clientX - 16;
      } else {
        newWidth = e.clientX - 16;
      }
      newWidth = Math.max(320, Math.min(newWidth, 600));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        chrome.storage.local.set({ ss_sidebarWidth: widthRef.current });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const unreadCount = activeTab !== 'chat' && messages.length > 0 ? '•' : '';

  function handleRequestRecommendation(productIds) {
    setActiveTab('chat');
    onRequestRecommendation(productIds);
  }

  const isRight = position === 'right';

  const sidebarStyle = {
    width: `${width}px`,
    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    transitionProperty: 'left, right, transform, opacity',
    ...(isRight
      ? { right: isOpen ? '16px' : `-${width + 40}px`, left: 'auto' }
      : { left: isOpen ? '16px' : `-${width + 40}px`, right: 'auto' }
    )
  };

  return (
    <div
      className="fixed top-4 bottom-4 bg-glass backdrop-blur-[24px] backdrop-saturate-[180%] border border-border rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col text-text font-sans z-[2147483647] overflow-hidden transition-all duration-600"
      style={sidebarStyle}
    >
      {/* ═══ RESIZE HANDLE ═══ */}
      {isOpen && (
        <div
          onMouseDown={startResizing}
          className={`absolute top-0 bottom-0 w-3 cursor-col-resize z-[99999] hover:bg-white/5 active:bg-white/10 transition-colors ${isRight ? 'left-0 border-l border-white/5' : 'right-0 border-r border-white/5'
            }`}
        />
      )}

      <Header
        code={code}
        onClose={onClose}
        position={position}
        onTogglePosition={togglePosition}
      />

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
              className={`py-4 text-[10px] font-medium uppercase tracking-[0.2em] relative cursor-pointer bg-transparent border-none flex items-center gap-2 ${activeTab === 'products' ? 'text-white' : 'text-white/40 hover:text-white/70'
                } transition-colors`}
            >
              <ShoppingBag size={14} strokeWidth={1.25} /> KOLEKSİYON <span className="text-white/40 font-light">{products.length}</span>
              {activeTab === 'products' && (
                <span className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-4 text-[10px] font-medium uppercase tracking-[0.2em] relative cursor-pointer bg-transparent border-none flex items-center gap-2 ${activeTab === 'chat' ? 'text-white' : 'text-white/40 hover:text-white/70'
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
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Collapsible Mini Products Drawer */}
                {products.length > 0 && (
                  <div className="border-b border-white/5 bg-white/[0.01] shrink-0 flex flex-col overflow-hidden transition-all duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-2.5 bg-white/[0.02]">
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag size={12} className="text-white/50" />
                        <span className="text-[9px] font-medium tracking-wider text-white/50 uppercase">
                          Koleksiyon ({products.length} Ürün)
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {products.length >= 2 && (
                          <button
                            onClick={() => handleRequestRecommendation(products.map(p => p.id))}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white text-black text-[8px] font-semibold tracking-wider uppercase hover:bg-gray-200 transition-colors cursor-pointer border border-transparent"
                          >
                            <Bot size={10} /> AI Karşılaştır
                          </button>
                        )}
                        <button
                          onClick={() => setProductsCollapsed(!productsCollapsed)}
                          className="text-white/40 hover:text-white/80 bg-transparent border-none cursor-pointer p-0.5 flex items-center justify-center"
                        >
                          {productsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Horizontal scroll list when expanded */}
                    {!productsCollapsed && (
                      <div className="flex gap-3 px-5 py-3 overflow-x-auto ss-scrollbar bg-black/10">
                        {products.map((product) => {
                          const productVotes = votes[product.id] || {};
                          const yesCount = Object.values(productVotes).filter(v => v === 'yes').length;
                          const noCount = Object.values(productVotes).filter(v => v === 'no').length;

                          return (
                            <div
                              key={product.id}
                              className="flex gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/5 min-w-[170px] max-w-[170px] shrink-0 hover:border-white/10 transition-colors"
                            >
                              <img
                                src={product.imageUrl || product.image}
                                alt={product.name}
                                className="w-10 h-10 object-cover rounded-lg bg-white/5 shrink-0"
                              />
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div className="text-[10px] text-white/80 font-light truncate" title={product.name}>
                                  {product.name}
                                </div>
                                <div className="flex items-end justify-between">
                                  <span className="text-[10px] font-medium text-white/50">{product.price}₺</span>
                                  <div className="flex items-center gap-1.5 text-[8px] text-white/40">
                                    <span className="flex items-center gap-0.5 text-emerald-400/80">👍{yesCount}</span>
                                    <span className="flex items-center gap-0.5 text-rose-400/80">👎{noCount}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <ChatPanel
                  messages={messages}
                  userName={userName}
                  users={users}
                  onSend={onSendMessage}
                  activeQuiz={activeQuiz}
                  onQuizComplete={onQuizComplete}
                  onQuizDismiss={onQuizDismiss}
                  isQuizLoading={isQuizLoading}
                  isBotThinking={isBotThinking}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
