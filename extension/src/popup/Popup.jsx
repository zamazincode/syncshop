import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { API_URL } from '../utils/config.js';
import './popup.css';

/**
 * SyncShop Popup — Session Yönetimi
 *
 * Bu component extension ikonuna tıklandığında açılır.
 * İki işlevi var:
 * 1. Yeni oturum oluştur (diğerleriyle paylaşacağın bir oda kodu üretir)
 * 2. Mevcut oturuma katıl (arkadaşının verdiği oda kodunu gir)
 *
 * State yönetimi: chrome.storage.local kullanılır. Neden?
 * - Popup her açılıp kapandığında React component sıfırdan mount olur
 * - State'i kaybetmemek için chrome.storage'a yazarız
 * - Content script de aynı storage'ı okur → ikisi senkronize kalır
 */

function Popup() {
  const [tab, setTab] = useState('join'); // 'join' | 'create'
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [userName, setUserName] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [inputName, setInputName] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  // Popup açıldığında mevcut durumu chrome.storage'dan oku
  useEffect(() => {
    chrome.storage.local.get(['ss_code', 'ss_name', 'ss_connected'], (data) => {
      if (data.ss_connected && data.ss_code) {
        setConnected(true);
        setRoomCode(data.ss_code);
        setUserName(data.ss_name || '');
        fetchUsers(data.ss_code);
      }
    });

    // Storage değişikliklerini dinle (content script'ten gelen güncellemeler)
    const listener = () => {
      chrome.storage.local.get(['ss_code', 'ss_name', 'ss_connected'], (data) => {
        setConnected(!!data.ss_connected);
        setRoomCode(data.ss_code || '');
        setUserName(data.ss_name || '');
      });
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  async function fetchUsers(code) {
    try {
      const res = await fetch(`${API_URL}/api/session/${code}`);
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch { /* sessiz hata */ }
  }

  async function handleCreate() {
    if (!inputName.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'genel' }),
      });
      const data = await res.json();

      chrome.storage.local.set({
        ss_code: data.session.code,
        ss_name: inputName.trim(),
        ss_userId: data.userId,
        ss_connected: true,
      });
      setConnected(true);
      setRoomCode(data.session.code);
      setUserName(inputName.trim());
    } catch {
      alert('Oturum oluşturulamadı.');
    }
    setLoading(false);
  }

  async function handleJoin() {
    if (!inputCode.trim() || !inputName.trim() || loading) return;
    setLoading(true);
    try {
      const code = inputCode.trim().toUpperCase();
      const res = await fetch(`${API_URL}/api/session/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: inputName.trim() }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); setLoading(false); return; }

      chrome.storage.local.set({
        ss_code: code,
        ss_name: inputName.trim(),
        ss_userId: data.userId,
        ss_connected: true,
      });
      setConnected(true);
      setRoomCode(code);
      setUserName(inputName.trim());
    } catch {
      alert('Bağlantı hatası.');
    }
    setLoading(false);
  }

  function handleDisconnect() {
    chrome.storage.local.set({
      ss_code: '',
      ss_name: '',
      ss_userId: '',
      ss_connected: false,
    });
    // Content script'e de bildir
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'ss-disconnect' });
    });
    setConnected(false);
    setRoomCode('');
    setUsers([]);
  }

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════

  return (
    <div className="w-[340px] font-sans bg-surface text-text p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-extrabold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent tracking-tight">
          SyncShop
        </h1>
        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-accent animate-pulse' : 'bg-gray-400'}`} />
          {connected ? 'Bağlı' : 'Bağlantı yok'}
        </div>
      </div>

      {!connected ? (
        /* ═══ NOT CONNECTED ═══ */
        <div>
          {/* Tab Buttons */}
          <div className="flex gap-1 mb-4 bg-surface-dark p-1 rounded-xl">
            <button
              onClick={() => setTab('join')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                tab === 'join'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Katıl
            </button>
            <button
              onClick={() => setTab('create')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                tab === 'create'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Oda Kur
            </button>
          </div>

          {tab === 'join' ? (
            <div className="space-y-2.5">
              <input
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Oda kodu (SS-XXXX)"
                className="w-full px-3.5 py-3 border-[1.5px] border-border rounded-xl bg-white text-sm outline-none focus:border-primary focus:bg-[#F8F7FF] transition-colors"
              />
              <input
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="İsminiz"
                className="w-full px-3.5 py-3 border-[1.5px] border-border rounded-xl bg-white text-sm outline-none focus:border-primary focus:bg-[#F8F7FF] transition-colors"
              />
              <button
                onClick={handleJoin}
                disabled={loading}
                className="w-full py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary-glow hover:bg-primary-light hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {loading ? 'Bağlanıyor...' : 'Oturuma Katıl'}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <input
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="İsminiz"
                className="w-full px-3.5 py-3 border-[1.5px] border-border rounded-xl bg-white text-sm outline-none focus:border-primary focus:bg-[#F8F7FF] transition-colors"
              />
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary-glow hover:bg-primary-light hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {loading ? 'Kuruluyor...' : 'Yeni Oturum Başlat'}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ═══ CONNECTED ═══ */
        <div className="text-center space-y-4">
          {/* Room Code */}
          <div className="bg-[#EEF2FF] border border-dashed border-primary p-4 rounded-xl">
            <span className="text-[11px] text-primary uppercase font-bold tracking-wide block mb-1">
              Oda Kodu
            </span>
            <span className="text-2xl font-extrabold text-text tracking-wider">
              {roomCode}
            </span>
          </div>

          {/* Online Users */}
          {users.length > 0 && (
            <div>
              <h3 className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Online</h3>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {users.map((u) => (
                  <span
                    key={u.id}
                    className="flex items-center gap-1.5 bg-surface-dark px-3 py-1.5 rounded-full text-xs font-semibold"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${u.online ? 'bg-accent' : 'bg-gray-400'}`} />
                    {u.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Disconnect */}
          <button
            onClick={handleDisconnect}
            className="w-full py-3 bg-white text-text-muted border border-border rounded-xl text-sm font-bold hover:bg-surface-dark transition-all"
          >
            Bağlantıyı Kes
          </button>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Popup />);
