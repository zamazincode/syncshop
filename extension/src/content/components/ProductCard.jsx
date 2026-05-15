import { fetchTrendyolReviews } from '../../utils/reviewFetcher.js';

/**
 * ProductCard — Tek bir ürün kartı
 *
 * Eski kodda bu, renderProducts() içinde 60+ satırlık bir template literal'dı.
 * Şimdi her ürün kendi component'i — props alır, kendi state'ini yönetir.
 *
 * Props:
 * - product: Ürün bilgileri (name, price, imageUrl, aiAnalysis...)
 * - votes: Bu ürünün oyları { userId: { vote: 'up'|'down' } }
 * - userId: Aktif kullanıcının ID'si (kendi oyunu vurgulamak için)
 * - onVote: Oy callback'i
 * - onAnalyze: AI analiz callback'i
 */
export default function ProductCard({ product, votes = {}, userId, onVote, onAnalyze }) {
  const p = product;
  const a = p.aiAnalysis;

  // Oy sayıları
  const upCount = Object.values(votes).filter((v) => v.vote === 'up').length;
  const downCount = Object.values(votes).filter((v) => v.vote === 'down').length;
  const myVote = votes[userId]?.vote;

  async function handleAnalyze() {
    if (p.aiStatus === 'analyzing') return;

    // Yorumları çek ve analiz isteği gönder
    let reviews = [];
    if (p.site === 'trendyol') {
      reviews = await fetchTrendyolReviews(p.productUrl, p.ratingValue);
    }
    onAnalyze(p, reviews);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 transition-all hover:bg-card-hover hover:border-border-hover hover:-translate-y-1 animate-slide-up">
      {/* ═══ HEADER: Image + Info ═══ */}
      <div className="flex gap-3 mb-4">
        <img
          src={p.imageUrl}
          alt={p.name}
          className="w-20 h-20 rounded-xl object-cover bg-[#1e1e20] shrink-0"
          onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23222"/><text y="40" x="16" font-size="32">📦</text></svg>'; }}
        />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2">{p.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-extrabold text-accent">
              {p.price?.toLocaleString('tr-TR')}₺
            </span>
            {p.ratingValue > 0 && (
              <span className="text-xs text-warning font-bold">⭐ {p.ratingValue}</span>
            )}
          </div>
        </div>
      </div>

      {/* ═══ AI ANALYSIS SECTION ═══ */}
      {p.aiStatus === 'analyzing' ? (
        <div className="bg-primary/10 rounded-xl p-3 mb-4 border-l-[3px] border-primary animate-pulse">
          <span className="text-[10px] font-extrabold text-primary uppercase">🤖 AI Analiz Ediyor...</span>
        </div>
      ) : p.aiStatus === 'failed' ? (
        <div className="bg-danger/10 rounded-xl p-3 mb-4 border-l-[3px] border-danger">
          <span className="text-[10px] font-extrabold text-danger uppercase">❌ Analiz Başarısız</span>
          <button
            onClick={handleAnalyze}
            className="w-full mt-2 py-2 rounded-lg bg-card text-text-muted text-xs font-semibold border border-border hover:bg-card-hover transition-all cursor-pointer"
          >
            🔄 Tekrar Dene
          </button>
        </div>
      ) : !a ? (
        <button
          onClick={handleAnalyze}
          className="w-full mb-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold border-none hover:bg-primary-light transition-all cursor-pointer"
        >
          🤖 AI Analizini Başlat
        </button>
      ) : null}

      {/* ═══ AI RESULTS (when available) ═══ */}
      {a && (
        <div className="bg-primary/10 rounded-xl p-3 mb-4 border-l-[3px] border-primary space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-primary uppercase">✨ AI Analiz</span>
            <span className={`text-[10px] font-bold ${
              a.trustScore > 70 ? 'text-accent' : a.trustScore > 40 ? 'text-warning' : 'text-danger'
            }`}>
              🛡️ Güven: %{a.trustScore || '??'}
            </span>
          </div>

          <div>
            <span className="text-xs text-warning font-bold">🕵️‍♂️ Gizli Gerçek:</span>
            <p className="text-xs text-[#e2e8f0] italic mt-0.5 leading-relaxed">
              "{a.hiddenTruth || a.summary}"
            </p>
          </div>

          {a.authenticityRisk && (
            <div className={`px-2 py-1.5 rounded text-[11px] font-bold border ${
              a.authenticityRisk === 'High'
                ? 'bg-danger/15 text-danger border-danger'
                : a.authenticityRisk === 'Medium'
                ? 'bg-warning/15 text-warning border-warning'
                : 'bg-accent/15 text-accent border-accent'
            }`}>
              {a.authenticityRisk === 'High' ? '⚠️ YÜKSEK SAHTE RİSKİ' :
               a.authenticityRisk === 'Medium' ? '👀 ŞÜPHELİ DURUM' : '✅ ORİJİNAL GÖRÜNÜYOR'}
              <div className="font-normal opacity-90 mt-0.5">{a.authenticityReason}</div>
            </div>
          )}
        </div>
      )}

      {/* ═══ VOTE ACTIONS ═══ */}
      <div className="flex gap-2">
        <button
          onClick={() => onVote(p.id, 'up')}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            myVote === 'up'
              ? 'bg-accent/20 border-accent text-accent'
              : 'bg-card border-border text-white hover:bg-card-hover'
          }`}
        >
          👍 {upCount}
        </button>
        <button
          onClick={() => onVote(p.id, 'down')}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            myVote === 'down'
              ? 'bg-danger/20 border-danger text-danger'
              : 'bg-card border-border text-white hover:bg-card-hover'
          }`}
        >
          👎 {downCount}
        </button>
        <a
          href={p.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-11 bg-primary rounded-xl flex items-center justify-center text-white no-underline hover:bg-primary-light transition-all"
        >
          🔗
        </a>
      </div>
    </div>
  );
}
