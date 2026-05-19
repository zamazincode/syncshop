import { useState } from 'react';
import { Bot, ChevronRight, SkipForward, Pencil } from 'lucide-react';

/**
 * QuestionCard — Claude-style interactive question cards for AI recommendation flow.
 * Displays one question at a time with clickable options.
 * On completion, calls onComplete with all collected answers.
 */
export default function QuestionCard({ quiz, onComplete, onDismiss }) {
  const { productIds, questions } = quiz;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const total = questions.length;
  const current = questions[currentIndex];

  function handleSelect(option) {
    const newAnswers = [...answers, { question: current.question, answer: option }];
    setAnswers(newAnswers);
    setShowCustom(false);
    setCustomInput('');

    if (currentIndex + 1 < total) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(productIds, newAnswers);
    }
  }

  function handleSkip() {
    const newAnswers = [...answers, { question: current.question, answer: 'Atlandı' }];
    setAnswers(newAnswers);
    setShowCustom(false);
    setCustomInput('');

    if (currentIndex + 1 < total) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(productIds, newAnswers);
    }
  }

  function handleCustomSubmit() {
    if (!customInput.trim()) return;
    const val = customInput.trim();

    // If user types a number (1-4), select the corresponding option
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= current.options.length) {
      handleSelect(current.options[num - 1]);
      return;
    }

    handleSelect(val);
  }

  return (
    <div className="mx-1 mb-3 animate-fade-in">
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <Bot size={12} strokeWidth={1.5} className="text-white/50" />
            <span className="text-[9px] font-medium tracking-widest text-white/40 uppercase">SyncBot Soruyor</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-medium text-white/30 tracking-wide">{currentIndex + 1} / {total}</span>
            <button
              onClick={onDismiss}
              className="text-[9px] text-white/30 hover:text-white/60 bg-transparent border-none cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ═══ PROGRESS BAR ═══ */}
        <div className="h-[2px] bg-white/5">
          <div
            className="h-full bg-white/40 transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex) / total) * 100}%` }}
          />
        </div>

        {/* ═══ QUESTION ═══ */}
        <div className="px-4 pt-3.5 pb-2">
          <p className="text-[12px] font-medium text-white/80 leading-relaxed">{current.question}</p>
        </div>

        {/* ═══ OPTIONS ═══ */}
        <div className="px-3 pb-2 space-y-1.5">
          {current.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleSelect(option)}
              className="w-full text-left px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-white/70 font-light hover:bg-white/[0.08] hover:border-white/15 hover:text-white transition-all cursor-pointer flex items-center gap-2.5 group"
            >
              <span className="w-5 h-5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-semibold text-white/40 group-hover:bg-white/10 group-hover:text-white/70 transition-all shrink-0">
                {i + 1}
              </span>
              <span className="flex-1">{option}</span>
              <ChevronRight size={12} strokeWidth={1.5} className="text-white/0 group-hover:text-white/40 transition-all" />
            </button>
          ))}
        </div>

        {/* ═══ CUSTOM + SKIP ═══ */}
        <div className="px-3 pb-3 flex gap-2">
          {showCustom ? (
            <div className="flex-1 flex gap-1.5">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                placeholder="Cevabınızı yazın..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/80 font-light placeholder-white/20 outline-none focus:border-white/20 transition-colors"
                autoFocus
              />
              <button
                onClick={handleCustomSubmit}
                className="px-3 py-1.5 rounded-lg bg-white text-black text-[9px] font-semibold tracking-wider uppercase cursor-pointer hover:bg-gray-200 transition-colors"
              >
                Gönder
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustom(true)}
              className="flex-1 px-3 py-2 rounded-xl bg-transparent border border-dashed border-white/10 text-[10px] text-white/30 font-light hover:border-white/20 hover:text-white/50 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Pencil size={10} strokeWidth={1.5} /> Başka bir şey
            </button>
          )}
          <button
            onClick={handleSkip}
            className="px-3 py-2 rounded-xl bg-transparent border border-white/5 text-[10px] text-white/30 font-light hover:text-white/50 hover:border-white/10 transition-all cursor-pointer flex items-center gap-1"
          >
            <SkipForward size={10} strokeWidth={1.5} /> Atla
          </button>
        </div>
      </div>
    </div>
  );
}
