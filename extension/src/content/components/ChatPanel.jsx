import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Bot, Send } from 'lucide-react';
import QuestionCard from './QuestionCard.jsx';

export default function ChatPanel({ messages, userName, users = [], onSend, activeQuiz, onQuizComplete, onQuizDismiss }) {
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length]);

  // @ yazıldığında mention listesini güncelle
  useEffect(() => {
    const atMatch = text.match(/@(\w*)$/);
    if (!atMatch) {
      setMentions([]);
      return;
    }

    const query = atMatch[1].toLowerCase();
    const candidates = [
      { name: 'SyncBot', type: 'bot' },
      ...users.filter((u) => u.name !== userName).map((u) => ({ name: u.name, type: 'user' })),
    ];

    const filtered = candidates.filter((c) => c.name.toLowerCase().startsWith(query));
    setMentions(filtered);
    setMentionIndex(0);
  }, [text, users, userName]);

  function insertMention(mention) {
    const newText = text.replace(/@\w*$/, `@${mention.name} `);
    setText(newText);
    setMentions([]);
    inputRef.current?.focus();
  }

  function handleSend() {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    setMentions([]);
  }

  function handleKeyDown(e) {
    if (mentions.length > 0) {
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        insertMention(mentions[mentionIndex]);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentions.length) % mentions.length);
        return;
      }
      if (e.key === 'Escape') {
        setMentions([]);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function renderMarkdown(rawText) {
    let html = rawText;
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="width:100%;border-radius:8px;margin:8px 0;display:block;border:1px solid rgba(255,255,255,0.1)" />');
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color:#818cf8;text-decoration:underline;font-weight:700;word-break:break-all">$1</a>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\n/g, '<br/>');
    return html;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 ss-scrollbar">
        {(!messages || messages.length === 0) && (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30 py-16 text-center">
            <div className="mb-4 text-text-muted">
              <MessageSquare size={36} strokeWidth={1} />
            </div>
            <div className="text-xs font-medium tracking-wide">HENÜZ MESAJ YOK</div>
            <div className="text-[10px] text-text-muted mt-1.5">@SyncBot yazarak AI asistanla konuşun</div>
          </div>
        )}
        {messages?.map((msg, i) => {
          const isMe = msg.from === userName;
          const isBot = msg.from === 'SyncBot';
          return (
            <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className={`text-[9px] font-medium text-white/40 uppercase tracking-widest mb-1.5 ${isMe ? 'mr-1' : 'ml-1'}`}>
                {isMe ? 'SEN' : msg.from.toUpperCase()}
              </span>
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed break-words font-light ${
                  isMe
                    ? 'bg-white text-black rounded-tr-sm shadow-md'
                    : isBot
                    ? 'bg-white/10 text-white rounded-tl-sm border border-white/10'
                    : 'bg-white/5 text-white/90 rounded-tl-sm border border-white/5'
                }`}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
              />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Question Card */}
      {activeQuiz && (
        <QuestionCard
          quiz={activeQuiz}
          onComplete={onQuizComplete}
          onDismiss={onQuizDismiss}
        />
      )}

      {/* Input Area */}
      <div className="relative p-4 bg-black/10 border-t border-white/5 shrink-0">
        {/* Mention Autocomplete Dropdown */}
        {mentions.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#0d0d10] border border-white/10 rounded-lg overflow-hidden shadow-2xl">
            {mentions.map((m, i) => (
              <button
                key={m.name}
                onClick={() => insertMention(m)}
                className={`w-full px-4 py-2 flex items-center gap-2 text-xs text-left border-none cursor-pointer transition-colors ${
                  i === mentionIndex ? 'bg-white/10 text-white' : 'bg-transparent text-white/50 hover:bg-white/5'
                }`}
              >
                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-medium shrink-0 ${
                  m.type === 'bot' ? 'bg-white/10 text-white' : 'bg-white/20 text-white'
                }`}>
                  {m.type === 'bot' ? <Bot size={11} strokeWidth={1.25} /> : m.name[0].toUpperCase()}
                </span>
                <span className="font-medium">{m.name}</span>
                {m.type === 'bot' && <span className="text-[9px] text-white/40 ml-auto uppercase tracking-widest">AI Asistan</span>}
              </button>
            ))}
            <div className="px-4 py-1.5 text-[9px] text-white/30 border-t border-white/5 bg-black/30">
              Tab ile seç · Esc ile kapat
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mesaj yaz... (@SyncBot)"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-xs outline-none focus:border-white/20 focus:bg-white/10 transition-all font-light"
          />
          <button
            onClick={handleSend}
            className="w-10 bg-white rounded-lg flex items-center justify-center text-black border-none hover:bg-gray-200 transition-all cursor-pointer"
          >
            <Send size={14} strokeWidth={1.25} className="translate-x-[-0.5px] translate-y-[0.5px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
