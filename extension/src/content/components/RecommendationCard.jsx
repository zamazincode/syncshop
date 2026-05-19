import { Trophy, Medal, ChevronRight } from 'lucide-react';

export default function RecommendationCard({ data }) {
  if (!data || !data.recommendations) return null;

  return (
    <div className="w-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden my-3 shadow-2xl animate-fade-in">
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 px-4 py-3 border-b border-white/10">
        <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
          <span>✨</span> AI Karar & Öneri
        </h3>
      </div>

      <div className="p-3 space-y-3">
        {data.recommendations.map((rec, i) => {
          const isWinner = rec.award === 'winner';
          return (
            <div
              key={i}
              className={`relative rounded-xl p-3 border ${isWinner
                  ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'bg-white/5 border-white/5'
                } transition-all hover:bg-white/10`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isWinner ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50'
                  }`}>
                  {isWinner ? <Trophy size={14} strokeWidth={2} /> : <Medal size={14} strokeWidth={2} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-[11px] font-bold text-white/90 truncate flex-1">
                      {rec.productName}
                    </h4>
                    <span className="text-[9px] font-medium text-white/40 uppercase tracking-widest whitespace-nowrap bg-black/30 px-1.5 py-0.5 rounded">
                      {rec.priceAndVotes}
                    </span>
                  </div>

                  <div className="text-[10px] text-white/70 leading-relaxed font-light mb-2">
                    {rec.reason}
                  </div>

                  <div className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-white/5 text-white/50">
                    {isWinner ? (
                      <span className="text-emerald-400">🏆 En Uygun Seçim</span>
                    ) : (
                      <span>🥈 En İyi Alternatif</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {data.summary && (
        <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5 text-[10px] font-light text-white/60 leading-relaxed">
          <span className="font-semibold text-white/80">SyncBot Özeti:</span> {data.summary}
        </div>
      )}
    </div>
  );
}
