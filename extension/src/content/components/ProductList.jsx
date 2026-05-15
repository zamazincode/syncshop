import ProductCard from './ProductCard.jsx';

/**
 * ProductList — Ürün kartları listesi
 * Session'daki tüm ürünleri ters sırada (en yeni üstte) gösterir.
 * Boşken "Henüz ürün eklenmedi" placeholder gösterir.
 */
export default function ProductList({ products, votes, userId, onVote, onAnalyze }) {
  if (!products || products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center opacity-50 py-16">
        <div className="text-4xl mb-3">📦</div>
        <div className="text-sm">Henüz ürün eklenmedi</div>
        <div className="text-xs text-text-muted mt-1">Trendyol'da bir ürün sayfasına gidin</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 ss-scrollbar">
      {[...products].reverse().map((product, i) => (
        <ProductCard
          key={product.id || i}
          product={product}
          votes={votes[product.id] || {}}
          userId={userId}
          onVote={onVote}
          onAnalyze={onAnalyze}
        />
      ))}
    </div>
  );
}
