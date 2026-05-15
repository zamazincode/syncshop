import { useState, useRef, useEffect } from 'react';

/**
 * ChatPanel — Mesajlaşma paneli
 *
 * Kullanıcılar arası mesajlaşma + @SyncBot ile AI'a soru sorma.
 * Mesajlar otomatik scroll ile en alta iner.
 * Markdown image ve link render desteği var.
 */
export default function ChatPanel({ messages, userName, onSend }) {
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  // Yeni mesaj geldiğinde otomatik scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Sadece kullanıcı zaten en alttaysa scroll et
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages?.length]);

  function handleSend() {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /**
   * Basit markdown render:
   * - ![alt](url) → img tag'i
   * - [text](url) → link
   * - \n → <br>
   * - **bold** → <strong>
   */
  function renderMarkdown(rawText) {
    let html = rawText;
    // Images
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="width:100%;border-radius:8px;margin:8px 0;display:block;border:1px solid rgba(255,255,255,0.1)" />');
    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color:#818cf8;text-decoration:underline;font-weight:700;word-break:break-all">$1</a>');
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Newlines
    html = html.replace(/\n/g, '<br/>');
    return html;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-3 ss-scrollbar"
      >
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
            <div
              key={msg.id || i}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
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
      <div className="flex gap-2 p-4 bg-black/20 shrink-0">
        <input
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
  );
}
