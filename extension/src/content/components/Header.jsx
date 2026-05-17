/**
 * Header — Sidebar üst bölümü
 * Logo, oda kodu badge'i ve kapatma butonu.
 */
export default function Header({ code, onClose }) {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
      <div className="flex flex-col">
        <span className="text-xl font-extrabold bg-gradient-to-r from-white to-text-muted bg-clip-text text-transparent tracking-tight">
          SyncShop
        </span>
        {code && (
          <button
            onClick={handleCopyCode}
            className="text-[10px] font-bold uppercase text-primary tracking-wider mt-0.5 text-left hover:text-primary-light transition-colors cursor-pointer"
            title="Kodu kopyalamak için tıkla"
          >
            🏠 Oda: {code}
          </button>
        )}
      </div>
      <button
        onClick={onClose}
        className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-text-muted hover:bg-danger/10 hover:text-danger hover:border-danger/20 transition-all cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}
