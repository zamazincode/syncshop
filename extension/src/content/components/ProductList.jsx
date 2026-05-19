import ProductCard from './ProductCard.jsx';
import { PackageOpen, Bot } from 'lucide-react';

/**
 * ProductList — Ürün kartları listesi
 */
export default function ProductList({ products, votes, userId, onVote, onAnalyze, onRemove, onRequestRecommendation }) {
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

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 ss-scrollbar">
      <button
        onClick={onRequestRecommendation}
        className="w-full py-2.5 rounded-lg bg-white text-black text-[11px] font-medium tracking-wide border border-transparent cursor-pointer hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
      >
        <Bot size={14} strokeWidth={1.25} />
        <span>SEÇİM ASİSTANI İSTE</span>
      </button>

      {[...products].reverse().map((product, i) => (
        <ProductCard
          key={product.id || i}
          product={product}
          votes={votes[product.id] || {}}
          userId={userId}
          onVote={onVote}
          onAnalyze={onAnalyze}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
