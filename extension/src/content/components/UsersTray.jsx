/**
 * UsersTray — Online kullanıcı avatarları
 *
 * Her kullanıcı bir daire avatar olarak gösterilir.
 * Yeşil nokta = online, gri nokta = offline.
 * Eğer kullanıcı bir ürün sayfasına bakıyorsa 👀 ikonu çıkar
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
            className={`relative w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center text-xs font-bold shrink-0 border-2 ${
              isBrowsing
                ? 'border-accent cursor-pointer hover:scale-110 transition-transform'
                : 'border-border'
            }`}
            title={`${user.name}${isBrowsing ? ` — ${user.currentPage.title}` : ''}`}
            onClick={() => isBrowsing && window.open(user.currentPage.url, '_blank')}
          >
            {initial}
            {/* Online/Offline indicator */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-glass ${
                user.online ? 'bg-accent' : 'bg-text-muted'
              }`}
            />
            {/* Browsing indicator */}
            {isBrowsing && (
              <span className="absolute -top-2 -right-2 text-xs">👀</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
