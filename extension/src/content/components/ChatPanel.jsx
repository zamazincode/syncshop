import { useState, useRef, useEffect } from 'react';

export default function ChatPanel({ messages, userName, users = [], onSend }) {
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
      <div ref={containerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 ss-scrollbar">
        {(!messages || messages.length === 0) && (
          <div className="flex-1 flex flex-col items-center justify-center opacity-50 py-16">
            <div className="text-4xl mb-3">💬</div>
            <div className="text-sm">Henüz mesaj yok</div>
            <div className="text-xs text-text-muted mt-1">@SyncBot ile AI'a sor</div>
          </div>
        )}
        {messages?.map((msg, i) => {
          const isMe = msg.from === userName;
          return (
            <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className={`text-[10px] font-bold text-text-muted uppercase tracking-wide mb-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                {isMe ? 'Sen' : msg.from}
              </span>
              <div
                className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed break-words ${
                  isMe
                    ? 'bg-primary text-white rounded-br-sm shadow-lg shadow-primary-glow/30'
                    : 'bg-card border border-border rounded-bl-sm'
                }`}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
              />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="relative p-4 bg-black/20 shrink-0">
        {/* Mention Autocomplete Dropdown */}
        {mentions.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-1 bg-[#1a1a1e] border border-border rounded-xl overflow-hidden shadow-xl">
            {mentions.map((m, i) => (
              <button
                key={m.name}
                onClick={() => insertMention(m)}
                className={`w-full px-4 py-2.5 flex items-center gap-2.5 text-sm text-left border-none cursor-pointer transition-colors ${
                  i === mentionIndex ? 'bg-primary/20 text-white' : 'bg-transparent text-text-muted hover:bg-white/5'
                }`}
              >
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                  m.type === 'bot' ? 'bg-primary text-white' : 'bg-accent text-white'
                }`}>
                  {m.type === 'bot' ? '🤖' : m.name[0].toUpperCase()}
                </span>
                <span className="font-semibold">{m.name}</span>
                {m.type === 'bot' && <span className="text-[10px] text-text-muted ml-auto">AI Asistan</span>}
              </button>
            ))}
            <div className="px-4 py-1.5 text-[10px] text-text-muted border-t border-border bg-black/20">
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
            className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary focus:bg-white/5 transition-all"
          />
          <button
            onClick={handleSend}
            className="w-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold border-none hover:bg-primary-light transition-all cursor-pointer"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
