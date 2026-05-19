import { useState } from 'react';
import ProductCard from './ProductCard.jsx';
import { PackageOpen, Bot } from 'lucide-react';

/**
 * ProductList — Ürün kartları listesi
 */
export default function ProductList({ products, votes, userId, onVote, onAnalyze, onRemove, onRequestRecommendation }) {
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  if (!products || products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center opacity-40 py-16 text-center">
        <div className="mb-4 text-text-muted">
          <PackageOpen size={40} strokeWidth={1} />
        </div>
        <div className="text-xs font-medium tracking-wide">HENÜZ ÜRÜN EKLENMEDİ</div>
        <div className="text-[10px] text-text-muted mt-1.5 max-w-[200px] leading-relaxed">Trendyol veya Hepsiburada'da bir ürün sayfasına gidin</div>
      </div>
    );
  }

  function handleToggleSelect(productId) {
    setSelectedIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }

  function handleCancelCompare() {
    setCompareMode(false);
    setSelectedIds([]);
  }

  function handleConfirmCompare() {
    if (selectedIds.length < 2) return;
    onRequestRecommendation(selectedIds);
    setCompareMode(false);
    setSelectedIds([]);
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden h-full">
      {/* ═══ SCROLLABLE PRODUCT LIST ═══ */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ss-scrollbar transition-all ${compareMode ? 'pb-24' : ''}`}>
        {!compareMode && (
          <button
            disabled={products.length < 2}
            onClick={() => setCompareMode(true)}
            className={`w-full py-2.5 rounded-lg text-[10px] font-medium tracking-widest transition-all flex items-center justify-center gap-2 border ${
              products.length >= 2
                ? 'bg-white text-black cursor-pointer hover:bg-gray-200 border-transparent'
                : 'bg-transparent border-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            <Bot size={14} strokeWidth={1.25} />
            <span>{products.length < 2 ? 'KARŞILAŞTIRMAK İÇİN EN AZ 2 ÜRÜN GEREK' : 'ÜRÜNLERİ KARŞILAŞTIR'}</span>
          </button>
        )}

        {[...products].reverse().map((product, i) => (
          <ProductCard
            key={product.id || i}
            product={product}
            votes={votes[product.id] || {}}
            userId={userId}
            onVote={onVote}
            onAnalyze={onAnalyze}
            onRemove={onRemove}
            compareMode={compareMode}
            isSelected={selectedIds.includes(product.id)}
            onToggleSelect={() => handleToggleSelect(product.id)}
          />
        ))}
      </div>

      {/* ═══ FLOATING CONFIRMATION BAR ═══ */}
      {compareMode && (
        <div className="absolute bottom-4 left-4 right-4 bg-black/90 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.7)] z-20 flex items-center justify-between animate-scale-up">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[8px] font-medium tracking-widest text-white/30 uppercase">SEÇİLEN ÜRÜNLER</span>
            <span className="text-[11px] font-semibold text-white/80 truncate">{selectedIds.length} ürün işaretlendi</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCancelCompare}
              className="px-3 py-1.5 rounded-lg text-[10px] text-white/50 hover:text-white bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer font-medium uppercase tracking-wider"
            >
              İptal
            </button>
            <button
              disabled={selectedIds.length < 2}
              onClick={handleConfirmCompare}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-medium tracking-wider transition-all flex items-center gap-1.5 uppercase ${
                selectedIds.length >= 2
                  ? 'bg-white text-black cursor-pointer hover:bg-gray-200 shadow-lg'
                  : 'bg-white/5 border border-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              <Bot size={12} strokeWidth={1.5} />
              AI Sor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
