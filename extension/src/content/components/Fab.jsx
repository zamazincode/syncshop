/**
 * Fab — Floating Action Button
 *
 * Sayfanın sağ alt köşesindeki yuvarlak buton.
 * Sidebar'ı açıp kapatır. Her zaman görünür.
 * Hover'da hafif büyüme + döndürme animasyonu var.
 */
export default function Fab({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-primary flex items-center justify-center text-3xl cursor-pointer shadow-[0_10px_25px] shadow-primary-glow border-none z-[2147483646] hover:scale-110 hover:rotate-[5deg] hover:shadow-[0_15px_35px] hover:shadow-primary-glow transition-all duration-400"
      style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
    >
      🛍️
    </button>
  );
}
