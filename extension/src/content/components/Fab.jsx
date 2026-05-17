import { useState } from 'react';

export default function Fab({ onClick, detectedProduct, onAddProduct, connected, isAdded }) {
  const [animating, setAnimating] = useState(false);

  function handleAdd() {
    if (animating || isAdded) return;
    setAnimating(true);
    onAddProduct();
    setTimeout(() => setAnimating(false), 1500);
  }

  return (
    <div className="fixed bottom-8 right-8 flex flex-col items-end gap-3 z-[2147483646]">
      {connected && detectedProduct && !isAdded && (
        <button
          onClick={handleAdd}
          disabled={animating}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold shadow-lg border-none cursor-pointer transition-all duration-300 ${
            animating
              ? 'bg-accent scale-110 shadow-accent/50'
              : 'bg-accent/90 hover:bg-accent hover:scale-105 shadow-accent/30'
          }`}
        >
          <span className={animating ? 'animate-spin' : ''}>
            {animating ? '✓' : '➕'}
          </span>
          <span className="max-w-[180px] truncate">
            {animating ? 'Eklendi!' : detectedProduct.name}
          </span>
        </button>
      )}

      <button
        onClick={onClick}
        className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-3xl cursor-pointer shadow-[0_10px_25px] shadow-primary-glow border-none hover:scale-110 hover:rotate-[5deg] transition-all duration-400"
        style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
      >
        🛍️
      </button>
    </div>
  );
}
