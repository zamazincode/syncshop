import React, { useState, useRef, useEffect, memo } from 'react';
import { MessageSquare, Bot, Send } from 'lucide-react';
import QuestionCard from './QuestionCard.jsx';
import RecommendationCard from './RecommendationCard.jsx';

function generateTableHTML(rows) {
  if (rows.length === 0) return '';
  const headers = rows[0];
  const bodyRows = rows.slice(1);

  const headerHTML = headers.map(h => `<th style="text-align: left; padding: 8px 10px; font-weight: 600; text-transform: uppercase; font-size: 8px; letter-spacing: 0.05em; color: rgba(255,255,255,0.5); border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); white-space: nowrap;">${h}</th>`).join('');

  const bodyHTML = bodyRows.map((row, rIdx) => {
    const bg = rIdx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent';
    return `<tr style="background: ${bg};">` +
      row.map(cell => `<td style="padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 9px; color: rgba(255,255,255,0.85); font-weight: 300; white-space: nowrap;">${cell}</td>`).join('') +
      `</tr>`;
  }).join('');

  return `<div style="overflow-x: auto; margin: 12px 0; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; background: rgba(10,10,12,0.4);"><table style="width: 100%; border-collapse: collapse; text-align: left;"><thead><tr>${headerHTML}</tr></thead><tbody>${bodyHTML}</tbody></table></div>`;
}

function renderMarkdown(rawText) {
  if (!rawText) return '';
  let html = rawText;

  // Parse markdown tables
  const lines = html.split('\n');
  let inTable = false;
  let tableRows = [];
  let newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      // Skip separator rows
      if (!line.includes('---')) {
        const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        tableRows.push(cells);
      }
    } else {
      if (inTable) {
        inTable = false;
        newLines.push(generateTableHTML(tableRows));
      }
      newLines.push(lines[i]);
    }
  }
  if (inTable) {
    newLines.push(generateTableHTML(tableRows));
  }
  html = newLines.join('\n');

  // Headings (match lines starting with #, ##, ###)
  html = html.replace(/^### (.*?)$/gm, '<h3 style="font-size: 13px; font-weight: 700; color: #fff; margin-top: 10px; margin-bottom: 4px">$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2 style="font-size: 14px; font-weight: 700; color: #fff; margin-top: 12px; margin-bottom: 6px">$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1 style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 14px; margin-bottom: 8px">$1</h1>');

  // Bullet Lists (match lines starting with * or -)
  html = html.replace(/^\s*[-*]\s+(.*?)$/gm, '<li style="margin-left: 12px; list-style-type: disc; margin-bottom: 2px">$1</li>');

  // Bold text (**bold**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Images and Links
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="width:100%;border-radius:8px;margin:8px 0;display:block;border:1px solid rgba(255,255,255,0.1)" />');
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color:#818cf8;text-decoration:underline;font-weight:700;word-break:break-all">$1</a>');

  // Newlines to <br/>
  html = html.replace(/\n/g, '<br/>');

  // Clean up double <br/> around headings and list elements
  html = html.replace(/(<\/h[1-3]>)<br\/>/g, '$1');
  html = html.replace(/<br\/>(<h[1-3]>)/g, '$1');
  html = html.replace(/(<\/li>)<br\/>/g, '$1');

  return html;
}

// Memoized component to prevent re-rendering and losing scroll state on tables
const MessageItem = memo(({ msg, isMe, isBot }) => {
  // Special rich-UI for JSON recommendation payloads
  if (msg.text && msg.text.startsWith('[RECOMMENDATION_JSON]')) {
    try {
      const jsonStr = msg.text.substring('[RECOMMENDATION_JSON]'.length);
      const data = JSON.parse(jsonStr);
      return <RecommendationCard data={data} />;
    } catch (err) {
      console.error('Failed to parse recommendation JSON:', err);
    }
  }

  return (
    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
      <span className={`text-[9px] font-medium text-white/40 uppercase tracking-widest mb-1.5 ${isMe ? 'mr-1' : 'ml-1'}`}>
        {isMe ? 'SEN' : msg.from.toUpperCase()}
      </span>
      <div
        className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed break-words font-light ${isMe
          ? 'bg-white text-black rounded-tr-sm shadow-md'
          : isBot
            ? 'bg-white/10 text-white rounded-tl-sm border border-white/10'
            : 'bg-white/5 text-white/90 rounded-tl-sm border border-white/5'
          }`}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
      />
    </div>
  );
}, (prev, next) => prev.msg.text === next.msg.text && prev.msg.from === next.msg.from);

export default function ChatPanel({ messages, userName, users = [], onSend, activeQuiz, onQuizComplete, onQuizDismiss, isQuizLoading, isBotThinking }) {
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const hasScrolledInitial = useRef(false);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    const currentLength = messages?.length || 0;
    if (currentLength === 0) return;

    if (!hasScrolledInitial.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      hasScrolledInitial.current = true;
    } else if (currentLength > prevLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = currentLength;
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
            return <MessageItem key={msg.id || i} msg={msg} isMe={isMe} isBot={isBot} />;
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Thinking Indicator */}
        {((isQuizLoading && !activeQuiz) || isBotThinking) && (
          <div className="mx-4 mb-3 animate-fade-in">
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-medium text-white/40 uppercase tracking-widest mb-1.5 ml-1">SYNCBOT</span>
              <div className="bg-white/10 rounded-xl rounded-tl-sm border border-white/10 px-4 py-3 flex items-center gap-2">
                <Bot size={13} strokeWidth={1.25} className="text-white/50" />
                <span className="text-[11px] text-white/50 font-light">
                  {isQuizLoading ? 'Ürünler analiz ediliyor' : 'Düşünüyor'}
                </span>
                <span className="flex gap-0.5 ml-1">
                  <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          </div>
        )}

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
                  className={`w-full px-4 py-2 flex items-center gap-2 text-xs text-left border-none cursor-pointer transition-colors ${i === mentionIndex ? 'bg-white/10 text-white' : 'bg-transparent text-white/50 hover:bg-white/5'
                    }`}
                >
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-medium shrink-0 ${m.type === 'bot' ? 'bg-white/10 text-white' : 'bg-white/20 text-white'
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
