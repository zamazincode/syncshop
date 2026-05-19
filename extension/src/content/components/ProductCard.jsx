import { useState } from 'react';
import { fetchTrendyolReviews } from '../../utils/reviewFetcher.js';
import { Package, Star, Bot, XCircle, RefreshCcw, Sparkles, ShieldCheck, Search, AlertTriangle, Eye, CheckCircle2, ThumbsUp, ThumbsDown, ExternalLink, Trash2, X } from 'lucide-react';

/**
 * ProConItem — Artılar ve Eksiler için tıklanabilir kaynakça gösteren satır
 */
function ProConItem({ item, type }) {
  const [isOpen, setIsOpen] = useState(false);
  const isPro = type === 'pro';

  const text = typeof item === 'object' ? item.text : item;
  const quotes = typeof item === 'object' && Array.isArray(item.quotes) ? item.quotes : [];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-1.5 text-[10px] text-white/70">
        <span className={isPro ? 'text-emerald-400 mt-0.5' : 'text-rose-400 mt-0.5'}>•</span>
        {quotes.length > 0 ? (
          <span
            onClick={() => setIsOpen(!isOpen)}
            className="cursor-pointer border-b border-dashed border-white/10 hover:border-white/30 hover:text-white transition-all pb-0.5 leading-normal"
            title={`${quotes.length} adet kaynakça görmek için tıkla`}
          >
            {text}
          </span>
        ) : (
          <span className="leading-normal">{text}</span>
        )}
      </div>
      {isOpen && quotes.length > 0 && (
        <div className="ml-3.5 pr-2 py-1.5 rounded bg-black/35 border border-white/5 text-[9px] text-white/45 italic leading-relaxed animate-fade-in space-y-1.5">
          {quotes.map((q, idx) => (
            <div key={idx} className="border-l border-white/10 pl-1.5">
              {q.type === 'desc' ? (
                <span className="not-italic font-medium text-white/60">ℹ️ {q.text}</span>
              ) : (
                <span>
                  "{q.text}" {q.rating > 0 && <span className="text-[8px] text-warning/70 not-italic ml-0.5">({q.rating}★)</span>}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ProductCard — Tek bir ürün kartı
 */
export default function ProductCard({
  product, votes = {}, userId, onVote, onAnalyze, onRemove,
  compareMode = false, isSelected = false, onToggleSelect
}) {
  const p = product;
  const a = p.aiAnalysis && (p.aiAnalysis.summary || p.aiAnalysis.trustScore) ? p.aiAnalysis : null;

  // Oy sayıları
  const upCount = Object.values(votes).filter((v) => v.vote === 'up').length;
  const downCount = Object.values(votes).filter((v) => v.vote === 'down').length;
  const myVote = votes[userId]?.vote;

  const [isZoomed, setIsZoomed] = useState(false);

  async function handleAnalyze() {
    if (p.aiStatus === 'analyzing') return;

    let reviews = [];
    if (p.site === 'trendyol') {
      reviews = await fetchTrendyolReviews(p.productUrl, p.ratingValue);
    }
    onAnalyze(p, reviews);
  }

  return (
    <div className={`bg-transparent border rounded-2xl p-4 transition-all hover:bg-white/[0.02] ${compareMode && isSelected ? 'border-white/30 bg-white/[0.01]' : 'border-white/5 hover:border-white/10'
      }`}>
      {/* ═══ HEADER: Image + Info ═══ */}
      <div className="flex gap-3 mb-4 items-center">
        {compareMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-3.5 h-3.5 rounded border-white/20 bg-transparent text-white focus:ring-0 focus:ring-offset-0 cursor-pointer accent-white shrink-0"
          />
        )}
        {p.imageUrl ? (
          <img
            src={p.imageUrl}
            alt={p.name}
            onClick={compareMode ? onToggleSelect : () => setIsZoomed(true)}
            className={`w-16 h-16 rounded-xl object-cover bg-black/20 shrink-0 border border-white/5 transition-opacity ${compareMode ? 'cursor-pointer hover:opacity-90' : 'cursor-zoom-in hover:opacity-85'
              }`}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="w-16 h-16 rounded-xl bg-black/20 shrink-0 flex items-center justify-center text-text-muted border border-white/5" style={{ display: p.imageUrl ? 'none' : 'flex' }}>
          <Package size={24} strokeWidth={1} />
        </div>
        <div className="min-w-0 flex flex-col justify-center flex-1" onClick={compareMode ? onToggleSelect : undefined} style={{ cursor: compareMode ? 'pointer' : 'default' }}>
          <h3 className="text-xs font-light leading-snug line-clamp-1 text-white/60 tracking-wide" title={p.name}>{p.name}</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[15px] font-semibold text-white tracking-wide">
              {p.price?.toLocaleString('tr-TR')} ₺
            </span>
            {p.ratingValue > 0 && (
              <span className="text-[10px] text-white/40 flex items-center gap-0.5">
                <Star size={9} strokeWidth={1} fill="currentColor" /> {p.ratingValue}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ═══ AI ANALYSIS STATUS SECTION ═══ */}
      {p.aiStatus === 'analyzing' ? (
        <div className="bg-transparent rounded-lg p-2.5 mb-3 border border-white/10 animate-pulse flex items-center gap-2">
          <Bot size={13} strokeWidth={1.25} className="text-white/50" />
          <span className="text-[9px] font-medium text-white/50 uppercase tracking-widest mt-0.5">Analiz Ediliyor...</span>
        </div>
      ) : p.aiStatus === 'failed' ? (
        <div className="bg-transparent rounded-lg p-2.5 mb-3 border border-danger/30 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <XCircle size={13} strokeWidth={1.25} className="text-danger" />
            <span className="text-[9px] font-medium text-danger uppercase tracking-widest mt-0.5">Analiz Başarısız</span>
          </div>
          <button
            onClick={handleAnalyze}
            className="w-full py-1.5 rounded-md bg-transparent text-white/60 text-[10px] font-medium border border-white/10 hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RefreshCcw size={11} strokeWidth={1.25} /> Tekrar Dene
          </button>
        </div>
      ) : null}

      {/* ═══ AI RESULTS (when available) ═══ */}
      {a && (
        <div className="bg-transparent rounded-xl p-3.5 mb-3.5 border border-white/10 space-y-2.5">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} strokeWidth={1.25} className="text-white/50" />
              <span className="text-[9px] font-medium text-white/50 uppercase tracking-widest mt-0.5">Analiz Sonucu</span>
            </div>
            <div className={`flex items-center gap-1 text-[9px] font-medium tracking-wide uppercase ${a.trustScore > 70 ? 'text-white/80' : a.trustScore > 40 ? 'text-warning' : 'text-danger'
              }`}>
              <ShieldCheck size={11} strokeWidth={1.25} /> %{a.trustScore || '??'} GÜVEN
            </div>
          </div>

          <div className="space-y-1.5 text-[10px] text-white/50 font-light">
            <p className="text-[11px] text-white/85 leading-relaxed italic mb-2.5">
              "{a.hiddenTruth || a.summary}"
            </p>
            {a.pros && a.pros.length > 0 && (
              <div className="flex flex-col gap-1.5 text-emerald-400/80">
                <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-400 font-semibold shrink-0 tracking-wider w-max mb-0.5">ARTILAR</span>
                <div className="flex flex-col gap-1">
                  {a.pros.map((pro, idx) => (
                    <ProConItem key={idx} item={pro} type="pro" />
                  ))}
                </div>
              </div>
            )}
            {a.cons && a.cons.length > 0 && (
              <div className="flex flex-col gap-1.5 text-rose-400/80 mt-2.5">
                <span className="text-[8px] bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded text-rose-400 font-semibold shrink-0 tracking-wider w-max mb-0.5">EKSİLER</span>
                <div className="flex flex-col gap-1">
                  {a.cons.map((con, idx) => (
                    <ProConItem key={idx} item={con} type="con" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {a.authenticityRisk && (
            <div className={`px-2 py-1.5 mt-2 flex flex-col gap-0.5 rounded-lg text-[10px] font-medium border ${a.authenticityRisk === 'High'
              ? 'bg-transparent text-danger border-danger/20'
              : a.authenticityRisk === 'Medium'
                ? 'bg-transparent text-warning border-warning/20'
                : 'bg-transparent text-white/60 border-white/5'
              }`}>
              <div className="flex items-center gap-1">
                {a.authenticityRisk === 'High' ? <AlertTriangle size={10} strokeWidth={1.25} /> :
                  a.authenticityRisk === 'Medium' ? <Eye size={10} strokeWidth={1.25} /> : <CheckCircle2 size={10} strokeWidth={1.25} />}
                <span className="tracking-wide uppercase text-[8px]">
                  {a.authenticityRisk === 'High' ? 'Yüksek Risk' :
                    a.authenticityRisk === 'Medium' ? 'Şüpheli' : 'Güvenilir'}
                </span>
              </div>
            </div>
          )}


          {a.details && (
            <p className="text-[10px] text-white/40 leading-relaxed pt-2.5 mt-1 border-t border-white/5 font-light">
              {a.details}
            </p>
          )}
        </div>
      )}

      {/* ═══ VOTE ACTIONS ═══ */}
      <div className="flex gap-2">
        {!a && p.aiStatus !== 'analyzing' && p.aiStatus !== 'failed' && (
          <button
            onClick={handleAnalyze}
            className="flex-[2] py-2 rounded-lg bg-transparent text-white/90 text-[11px] font-medium tracking-wide border border-white/15 hover:bg-white/5 hover:border-white/30 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <Bot size={13} strokeWidth={1.25} /> AI Analiz
          </button>
        )}
        <button
          onClick={() => onVote(p.id, 'up')}
          className={`flex-1 py-2 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${myVote === 'up'
            ? 'bg-white text-black border-transparent'
            : 'bg-transparent border-white/15 text-white/80 hover:bg-white/5 hover:border-white/30 hover:text-white'
            }`}
        >
          <ThumbsUp size={14} strokeWidth={1.25} /> {upCount}
        </button>
        <button
          onClick={() => onVote(p.id, 'down')}
          className={`flex-1 py-2 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${myVote === 'down'
            ? 'bg-white text-black border-transparent'
            : 'bg-transparent border-white/15 text-white/80 hover:bg-white/5 hover:border-white/30 hover:text-white'
            }`}
        >
          <ThumbsDown size={14} strokeWidth={1.25} /> {downCount}
        </button>
        <a
          href={p.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 bg-transparent border border-white/15 rounded-lg flex items-center justify-center text-white/80 no-underline hover:bg-white/5 hover:border-white/30 hover:text-white transition-all"
        >
          <ExternalLink size={14} strokeWidth={1.25} />
        </a>
        <button
          onClick={() => onRemove(p.id)}
          className="w-10 bg-transparent border border-white/15 rounded-lg flex items-center justify-center text-white/40 hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-all cursor-pointer"
          title="Ürünü Kaldır"
        >
          <Trash2 size={14} strokeWidth={1.25} />
        </button>
      </div>

      {isZoomed && p.imageUrl && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2147483647] flex items-center justify-center cursor-zoom-out animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-[85vw] max-h-[85vh] bg-[#0a0a0c] p-2 rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center animate-scale-up"
          >
            <img
              src={p.imageUrl}
              alt={p.name}
              className="max-w-[70vw] max-h-[70vh] rounded-xl object-contain"
            />
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-[#0a0a0c] border border-white/10 hover:bg-[#1a1a1d] text-white/50 hover:text-white flex items-center justify-center cursor-pointer shadow-lg transition-colors"
            >
              <X size={12} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
