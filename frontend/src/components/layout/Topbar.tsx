import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../hooks/useStore'
import type { ArenaMode } from '../../types'

const MODES: { id: ArenaMode; icon: string; title: string; desc: string }[] = [
  { id: 'battle', icon: '⚔️', title: 'Battle — Đấu mù', desc: 'So sánh 2 mô hình ẩn danh, đánh giá không thiên vị' },
  { id: 'sbs', icon: '⚖️', title: 'Side-by-Side — Song song', desc: 'Chọn 2 mô hình cụ thể để so sánh trực tiếp' },
  { id: 'direct', icon: '💬', title: 'Direct Chat — Trò chuyện', desc: 'Chat trực tiếp với 1 mô hình, đánh giá bằng sao' },
]

export function Topbar() {
  const {
    mode, setMode, totalVotes, clearMessages, resetTurn,
    models, selectedModelA, selectedModelB, selectedModelDirect,
    setSelectedModelA, setSelectedModelB, setSelectedModelDirect,
    isLoggedIn, userEmail, displayName, logoutUser, setShowAuthModal,
  } = useStore()

  const [ddOpen, setDdOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const ddRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false)
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const currentMode = MODES.find((m) => m.id === mode)!

  function selectMode(m: ArenaMode) {
    setMode(m)
    setDdOpen(false)
    clearMessages()
    resetTurn()
  }

  function handleNewBattle() {
    clearMessages()
    resetTurn()
  }

  const avatarInitial = displayName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || '?'

  return (
    <div className="flex items-center justify-between px-5 border-b border-[var(--border)] bg-[var(--bg-card)] shrink-0 h-[52px]">
      <div className="flex items-center gap-3.5">
        {/* Mode selector */}
        <div className="relative" ref={ddRef}>
          <button
            onClick={() => setDdOpen(!ddOpen)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-xl hover:bg-[var(--bg-hover)] transition-all border border-transparent hover:border-[var(--border)]"
          >
            <span>{currentMode.icon}</span>
            <span>{currentMode.id === 'battle' ? 'Battle' : currentMode.id === 'sbs' ? 'Side-by-Side' : 'Direct Chat'}</span>
            <span className={`text-[0.55rem] text-[var(--text-muted)] transition-transform ${ddOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {ddOpen && (
            <div className="absolute top-[calc(100%+6px)] left-0 min-w-80 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-1.5 z-50 shadow-xl animate-fade-in">
              {MODES.map((m) => (
                <div
                  key={m.id}
                  onClick={() => selectMode(m.id)}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border
                    ${mode === m.id ? 'bg-[var(--accent-light)] border-[var(--border-accent)]' : 'border-transparent hover:bg-[var(--bg-hover)]'}`}
                >
                  <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-lg shrink-0
                    ${mode === m.id ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'bg-[var(--bg-input)]'}`}>
                    {m.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{m.title}</div>
                    <div className="text-xs text-[var(--text-muted)]">{m.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Model selectors for SBS */}
        {mode === 'sbs' && (
          <div className="flex items-center gap-2">
            <select
              value={selectedModelA}
              onChange={(e) => setSelectedModelA(e.target.value)}
              className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs hover:border-[var(--accent)] outline-none"
            >
              {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <span className="text-[0.72rem] text-[var(--text-muted)] font-bold uppercase">VS</span>
            <select
              value={selectedModelB}
              onChange={(e) => setSelectedModelB(e.target.value)}
              className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs hover:border-[var(--accent)] outline-none"
            >
              {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}

        {/* Model selector for Direct */}
        {mode === 'direct' && (
          <select
            value={selectedModelDirect}
            onChange={(e) => setSelectedModelDirect(e.target.value)}
            className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs hover:border-[var(--accent)] outline-none"
          >
            {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[var(--green)] bg-[var(--green-bg)]">
          <span>🗳️</span>
          <span>{totalVotes}</span> phiếu
        </div>
        <button
          onClick={handleNewBattle}
          className="h-[34px] px-3.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:border-[var(--accent)] transition-all"
        >
          ⚔️ Trận mới
        </button>

        {!isLoggedIn ? (
          <button
            onClick={() => setShowAuthModal(true)}
            className="h-[34px] px-3.5 rounded-lg text-xs font-semibold border border-[var(--accent)] text-[var(--accent)] bg-transparent hover:bg-[var(--accent)] hover:text-white transition-all"
          >
            Đăng nhập
          </button>
        ) : (
          <div className="relative" ref={avatarRef}>
            <div
              onClick={() => setAvatarOpen(!avatarOpen)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center text-white font-semibold text-xs cursor-pointer border-2 border-transparent hover:border-[var(--accent)] hover:shadow-md transition-all"
            >
              {avatarInitial}
            </div>
            {avatarOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 min-w-52 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2 z-50 shadow-xl animate-fade-in">
                <div className="px-3 py-2 border-b border-[var(--border-light)] mb-1">
                  <div className="text-sm font-semibold">{displayName || 'User'}</div>
                  <div className="text-xs text-[var(--text-muted)]">{userEmail}</div>
                </div>
                <div
                  onClick={() => { logoutUser(); setAvatarOpen(false) }}
                  className="px-3 py-2 text-sm text-[var(--red)] rounded-lg cursor-pointer hover:bg-[var(--bg-hover)] transition-all"
                >
                  Đăng xuất
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
