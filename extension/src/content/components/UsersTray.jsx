import { Eye } from 'lucide-react';

/**
 * UsersTray — Online kullanıcı avatarları
 *
 * Her kullanıcı bir daire avatar olarak gösterilir.
 * Yeşil nokta = online, gri nokta = offline.
 * Eğer kullanıcı bir ürün sayfasına bakıyorsa göz ikonu çıkar
 * ve avatara tıklayınca o sayfaya gidersin.
 */
export default function UsersTray({ users }) {
  if (!users || users.length === 0) return null;

  return (
    <div className="flex gap-2 px-6 py-3 overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
      {users.map((user) => {
        const isBrowsing = user.currentPage?.url;
        const initial = user.name?.substring(0, 1).toUpperCase() || '?';

        return (
          <div
            key={user.id}
            className={`relative w-8 h-8 rounded-lg bg-white/5 text-white/80 flex items-center justify-center text-xs font-medium shrink-0 border ${
              isBrowsing
                ? 'border-white/20 cursor-pointer hover:scale-105 transition-transform'
                : 'border-white/5'
            }`}
            title={`${user.name}${isBrowsing ? ` — ${user.currentPage.title}` : ''}`}
            onClick={() => isBrowsing && window.open(user.currentPage.url, '_blank')}
          >
            {initial}
            {/* Online/Offline indicator */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${
                user.online ? 'bg-white' : 'bg-white/20'
              }`}
            />
            {/* Browsing indicator */}
            {isBrowsing && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-black rounded-full flex items-center justify-center border border-white/10">
                <Eye size={10} strokeWidth={1.25} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
