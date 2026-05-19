import { Home, X, ArrowLeftRight } from 'lucide-react';

/**
 * Header — Sidebar üst bölümü
 * Logo, oda kodu badge'i ve kapatma butonu.
 */
export default function Header({ code, onClose, position, onTogglePosition }) {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
      <div className="flex flex-col">
        <span className="text-lg font-light tracking-wide text-white">
          SyncShop
        </span>
        {code && (
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 text-[9px] font-medium uppercase text-white/50 tracking-[0.2em] mt-1 text-left hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0"
            title="Kodu kopyalamak için tıkla"
          >
            <Home size={10} strokeWidth={1} /> ODA: {code}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePosition}
          className="w-8 h-8 rounded-lg bg-transparent border border-white/5 flex items-center justify-center text-white/40 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
          title={position === 'right' ? "Sola Taşı" : "Sağa Taşı"}
        >
          <ArrowLeftRight size={13} strokeWidth={1.25} />
        </button>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-transparent border border-white/5 flex items-center justify-center text-white/40 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
        >
          <X size={14} strokeWidth={1} />
        </button>
      </div>
    </div>
  );
}
