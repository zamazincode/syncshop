import { useEffect, useRef, useState } from 'react';

// Simple throttle to avoid lodash dependency
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

const CURSOR_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', 
  '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55'
];

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export default function CursorOverlay({ socket, sendCursorUpdate, connected, session }) {
  const containerRef = useRef(null);
  // Store remote cursors { [userId]: { x, y, userName, lastUpdate } }
  const cursorsRef = useRef({});
  // Store DOM elements so we can mutate them directly { [userId]: HTMLElement }
  const cursorElementsRef = useRef({});
  const animationFrameId = useRef(null);

  // ═══════════════════════════════════════
  // LOCAL CURSOR EMISSION
  // ═══════════════════════════════════════
  useEffect(() => {
    if (!connected || !sendCursorUpdate) return;

    // Send X relative to the center of the document to handle different screen widths for centered websites
    const handleMouseMove = throttle((e) => {
      const xOffset = e.pageX - (document.documentElement.scrollWidth / 2);
      const y = e.pageY;
      sendCursorUpdate(xOffset, y, window.location.href);
    }, 50); // 20 FPS

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [connected, sendCursorUpdate]);

  // ═══════════════════════════════════════
  // REMOTE CURSOR RECEPTION
  // ═══════════════════════════════════════
  useEffect(() => {
    if (!socket) return;

    const handleCursorUpdate = ({ userId, userName, x, y, pageUrl }) => {
      // Sadece aynı sayfada olanları göster (query string hariç)
      const currentUrl = window.location.href.split('?')[0];
      const incomingUrl = pageUrl.split('?')[0];
      
      if (currentUrl !== incomingUrl) {
        // Eğer kullanıcı farklı sayfaya geçmişse imlecini sil
        if (cursorsRef.current[userId]) {
          delete cursorsRef.current[userId];
          removeCursorElement(userId);
        }
        return;
      }

      cursorsRef.current[userId] = {
        x, y, userName,
        lastUpdate: Date.now()
      };
      
      ensureCursorElement(userId, userName);
    };

    socket.on('cursor-update', handleCursorUpdate);
    return () => {
      socket.off('cursor-update', handleCursorUpdate);
    };
  }, [socket]);

  // ═══════════════════════════════════════
  // RENDER LOOP (requestAnimationFrame)
  // ═══════════════════════════════════════
  useEffect(() => {
    const updateDOM = () => {
      const now = Date.now();
      const scrollWidth = document.documentElement.scrollWidth;

      Object.entries(cursorsRef.current).forEach(([userId, data]) => {
        // 5 saniye boyunca güncellenmeyen imleçleri sil
        if (now - data.lastUpdate > 5000) {
          delete cursorsRef.current[userId];
          removeCursorElement(userId);
          return;
        }

        const el = cursorElementsRef.current[userId];
        if (el) {
          // X'i sayfa merkezine göre tekrar hesapla
          const pixelX = (scrollWidth / 2) + data.x;
          // DOM üzerinden doğrudan manipülasyon (React bypass)
          el.style.transform = `translate(${pixelX}px, ${data.y}px)`;
        }
      });

      animationFrameId.current = requestAnimationFrame(updateDOM);
    };

    animationFrameId.current = requestAnimationFrame(updateDOM);
    return () => cancelAnimationFrame(animationFrameId.current);
  }, []);

  // ═══════════════════════════════════════
  // DOM ELEMENT MANAGEMENT
  // ═══════════════════════════════════════
  const ensureCursorElement = (userId, userName) => {
    if (cursorElementsRef.current[userId]) return;

    const color = stringToColor(userName || userId);
    const el = document.createElement('div');
    
    // Imleç konteyneri stili
    el.style.position = 'absolute';
    el.style.top = '0';
    el.style.left = '0';
    el.style.pointerEvents = 'none'; // Tıklamaları engellememeli
    el.style.zIndex = '2147483646';
    el.style.transition = 'transform 0.1s linear';
    el.style.willChange = 'transform';
    
    // SVG Imleç
    el.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.86a.5.5 0 0 0-.85.35z" fill="${color}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
      <div style="
        position: absolute;
        top: 20px;
        left: 14px;
        background: ${color};
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-family: Inter, sans-serif;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      ">
        ${userName}
      </div>
    `;

    if (containerRef.current) {
      containerRef.current.appendChild(el);
      cursorElementsRef.current[userId] = el;
    }
  };

  const removeCursorElement = (userId) => {
    const el = cursorElementsRef.current[userId];
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
    delete cursorElementsRef.current[userId];
  };

  return (
    <div 
      ref={containerRef} 
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} 
    />
  );
}
