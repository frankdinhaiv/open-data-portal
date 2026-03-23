import { useStore } from '../../hooks/useStore'

export function BottomNav() {
  const { view, setView, setShowAuthModal, setSidebarDrawerOpen, clearMessages, resetTurn } = useStore()

  const items = [
    {
      id: 'home',
      label: 'Trang Chủ',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      active: view === 'arena',
      onClick: () => { setView('arena'); clearMessages(); resetTurn() },
    },
    {
      id: 'leaderboard',
      label: 'Bảng Xếp Hạng',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      active: view === 'leaderboard',
      onClick: () => setView('leaderboard'),
    },
    {
      id: 'history',
      label: 'Lịch Sử',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      active: false,
      onClick: () => setSidebarDrawerOpen(true),
    },
    {
      id: 'account',
      label: 'Tài Khoản',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      active: false,
      onClick: () => setShowAuthModal(true),
    },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        height: '64px',
        background: 'rgba(0, 20, 70, 0.98)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={item.onClick}
          className="flex flex-col items-center justify-center bg-transparent border-none cursor-pointer transition-all"
          style={{
            flex: 1,
            height: '100%',
            gap: '2px',
            color: item.active ? '#BAFAFF' : 'rgba(255,255,255,0.5)',
          }}
        >
          {item.icon}
          <span
            style={{
              fontFamily: "'Be Vietnam Pro', sans-serif",
              fontSize: '10px',
              lineHeight: '14px',
              fontWeight: item.active ? 600 : 400,
            }}
          >
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  )
}
