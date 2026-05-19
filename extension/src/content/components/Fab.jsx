import { useState } from 'react';
import { Sparkles, ShoppingBag, X, Check } from 'lucide-react';

export default function Fab({ onClick, detectedProduct, onAddProduct, connected, isAdded }) {
  const [animating, setAnimating] = useState(false);

  const [dismissedUrl, setDismissedUrl] = useState(null);

  function handleAdd() {
    if (animating || isAdded) return;
    setAnimating(true);
    onAddProduct();
    setTimeout(() => setAnimating(false), 1500);
  }

  function handleDismiss() {
    if (detectedProduct) {
      setDismissedUrl(detectedProduct.productUrl);
    }
  }

  // Bar is visible if: connected + detected + not added + not dismissed for this URL
  const showHologramBar = connected && detectedProduct && !isAdded && (dismissedUrl !== detectedProduct.productUrl);

  return (
    <>
      {/* 1. Hologram Bar (Center Bottom) */}
      {showHologramBar && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[2147483647] animate-[slideUp_0.4s_ease-out_backwards]">
          <div className="relative flex items-center gap-4 bg-[#0a0a0c]/95 backdrop-blur-2xl border border-white/5 p-2 pr-3.5 pl-3 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6)]">

            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 text-white/70 border border-white/5 flex-shrink-0">
              <Sparkles size={16} strokeWidth={1.25} className="animate-pulse" />
            </div>

            <div className="flex flex-col mr-2">
              <span className="text-white text-[13px] font-normal truncate max-w-[180px] leading-tight">
                {detectedProduct.name}
              </span>
              <span className="text-white/40 text-[9px] font-medium tracking-widest mt-0.5">
                AI ANALİZ HAZIR
              </span>
            </div>

            <button
              onClick={handleAdd}
              disabled={animating}
              className={`flex items-center gap-1.5 ml-1 px-3.5 py-2 rounded-lg text-xs font-medium tracking-wide border border-transparent cursor-pointer transition-all duration-300 ${animating
                  ? 'bg-white/10 text-white/50 scale-100'
                  : 'bg-white text-black hover:bg-gray-200 shadow-sm'
                }`}
            >
              {animating ? (
                <>
                  <Check size={14} strokeWidth={1.25} /> Eklendi
                </>
              ) : (
                'Koleksiyona Ekle'
              )}
            </button>

            <button
              onClick={handleDismiss}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#0a0a0c] border border-white/10 hover:bg-[#1c1c1f] text-white/40 hover:text-white flex items-center justify-center cursor-pointer shadow-lg transition-colors"
              title="Gizle"
            >
              <X size={10} strokeWidth={1.25} />
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Sidebar Toggle FAB (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-[2147483646]">
        <button
          onClick={onClick}
          className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center cursor-pointer shadow-xl border border-transparent hover:bg-gray-200 hover:-translate-y-0.5 transition-all duration-300"
        >
          <ShoppingBag size={20} strokeWidth={1.25} />
        </button>
      </div>
    </>
  );
}
