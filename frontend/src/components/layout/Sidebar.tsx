import { useEffect, useState, useCallback } from 'react'
import { useStore } from '../../hooks/useStore'
import { fetchHistory } from '../../api/client'
import type { ViewType, HistoryEntry } from '../../types'

export function Sidebar() {
  const { view, setView, clearMessages, resetTurn, totalVotes, userId, isLoggedIn } = useStore()
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const loadHistory = useCallback(() => {
    if (!isLoggedIn || !userId) {
      setHistory([])
      return
    }
    fetchHistory(userId).then(setHistory).catch(() => {})
  }, [userId, isLoggedIn])

  // Load on mount and whenever totalVotes or login state changes
  useEffect(() => {
    loadHistory()
  }, [loadHistory, totalVotes])

  const navItems: { view: ViewType; icon: string; label: string }[] = [
    { view: 'arena', icon: '⚔️', label: 'Đấu Trường' },
    { view: 'leaderboard', icon: '🏆', label: 'Bảng Xếp Hạng' },
  ]

  function handleNav(v: ViewType) {
    setView(v)
    if (v === 'arena') {
      clearMessages()
      resetTurn()
    }
  }

  function choiceLabel(entry: HistoryEntry): string {
    if (entry.choice === 'a') return `${entry.model_a_name} thắng`
    if (entry.choice === 'b') return `${entry.model_b_name} thắng`
    if (entry.choice === 'tie') return 'Hòa'
    if (entry.choice === 'bad') return 'Cả hai chưa tốt'
    return `${entry.choice} sao`
  }

  function modeIcon(mode: string): string {
    if (mode === 'battle') return '⚔️'
    if (mode === 'sbs') return '⚖️'
    return '💬'
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr + 'Z').getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'vừa xong'
    if (mins < 60) return `${mins} phút trước`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} giờ trước`
    return `${Math.floor(hours / 24)} ngày trước`
  }

  return (
    <aside className="w-60 border-r border-[var(--border)] flex flex-col shrink-0 bg-[var(--bg-sidebar)] max-md:hidden">
      <div
        className="flex items-center gap-2.5 px-5 py-4 cursor-pointer hover:bg-[var(--bg-hover)] transition-all"
        onClick={() => handleNav('arena')}
      >
        <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
          V
        </div>
        <span className="text-lg font-bold tracking-tight">ViGen Arena</span>
        <span className="text-[0.6rem] text-[var(--accent)] font-semibold bg-[var(--accent-light)] px-1.5 rounded-full">
          beta
        </span>
      </div>

      <nav className="px-3 py-2 flex flex-col gap-0.5">
        {navItems.map((item) => (
          <div
            key={item.view}
            onClick={() => handleNav(item.view)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-sm transition-all
              ${view === item.view
                ? 'text-[var(--accent)] font-semibold bg-[var(--accent-light)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]'
              }`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      <div className="h-px bg-[var(--border-light)] mx-4 my-2" />

      <div className="text-[0.68rem] text-[var(--text-muted)] px-5 pt-3 pb-1 uppercase tracking-wider font-semibold flex items-center justify-between">
        <span>Lịch sử</span>
        {history.length > 0 && (
          <span className="text-[var(--accent)] font-bold">{history.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {history.length === 0 ? (
          <p className="px-3 py-3 text-[0.72rem] text-[var(--text-muted)]">
            Chưa có lượt đánh giá nào
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-all cursor-default"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[0.65rem]">{modeIcon(entry.mode)}</span>
                  <span className="text-[0.68rem] font-medium text-[var(--text)] truncate flex-1">
                    {entry.prompt_text.length > 28
                      ? entry.prompt_text.slice(0, 28) + '…'
                      : entry.prompt_text}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pl-4">
                  <span className="text-[0.65rem] text-[var(--text-muted)]">
                    {choiceLabel(entry)}
                  </span>
                  <span className="text-[0.6rem] text-[var(--text-muted)] ml-auto">
                    {timeAgo(entry.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto px-4 py-3 border-t border-[var(--border-light)] text-[0.68rem] text-[var(--text-muted)] flex gap-2">
        <span>Giới thiệu</span> · <span>API</span> · <span>Chính sách</span>
      </div>
    </aside>
  )
}
