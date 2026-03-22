import { useEffect, useState, useCallback } from 'react'
import { useStore } from '../../hooks/useStore'
import { fetchHistory } from '../../api/client'
import type { HistoryEntry } from '../../types'

const SAMPLE_HISTORY: HistoryEntry[] = [
  { id: 1, prompt_text: 'So sánh phở Hà Nội và phở Sài Gòn', mode: 'battle', created_at: '2026-03-21T10:00:00' },
  { id: 2, prompt_text: 'Khoảng cách từ Nhà hát lớn tới Hồ Gươm', mode: 'sbs', created_at: '2026-03-21T09:00:00' },
  { id: 3, prompt_text: 'Nếu có thể du lịch đến một nơi nào đó, bạn sẽ chọn đâu: Đà Lạt hay Nha Trang?', mode: 'direct', created_at: '2026-03-20T15:00:00' },
  { id: 4, prompt_text: 'Bạn nghĩ gì về việc thưởng thức cà phê ở phố cổ Hà Nội?', mode: 'battle', created_at: '2026-03-20T12:00:00' },
  { id: 5, prompt_text: 'Món ăn nào bạn muốn thử nhất trong ẩm thực Việt Nam?', mode: 'sbs', created_at: '2026-03-19T18:00:00' },
]

import sidebarToggle from '../../assets/icons/sidebar-toggle.svg'
import newChat from '../../assets/icons/new-chat.svg'
import barChart from '../../assets/icons/bar-chart.svg'
import searchIcon from '../../assets/icons/search.svg'
import battleIcon from '../../assets/icons/battle.svg'
import scalesIcon from '../../assets/icons/scales.svg'
import messageCircle from '../../assets/icons/message-circle.svg'

/*
 * Sidebar — matches Figma node 2:10666 (280×620)
 *
 * Structure:
 *   Frame (280×620, px-8, flex-col gap-32)
 *   ├── Search (px-4 py-8) — 40×40 glass button, icon 20×20
 *   ├── Navigation (gap-4)
 *   │   └── Nav item (264×40, px-12 py-8, rounded-6, icon 24×24, gap-12, 16px SemiBold #F2F4F7)
 *   └── History (px-16, gap-16)
 *       ├── Label "Lịch sử" (16px Medium #FFF)
 *       └── Items (gap-16, each: gap-8, icon 20×20 opacity-50, text 14px Regular opacity-75)
 */

export function Sidebar() {
  const { view, clearMessages, resetTurn, totalVotes, userId, isLoggedIn, setView, sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed } = useStore()
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const loadHistory = useCallback(() => {
    if (!isLoggedIn || !userId) {
      setHistory(SAMPLE_HISTORY)
      return
    }
    fetchHistory(userId).then((data) => setHistory(data.length > 0 ? data : SAMPLE_HISTORY)).catch(() => setHistory(SAMPLE_HISTORY))
  }, [userId, isLoggedIn])

  useEffect(() => {
    loadHistory()
  }, [loadHistory, totalVotes])

  function handleNewChat() {
    clearMessages()
    resetTurn()
    setView('arena')
  }

  function modeIcon(mode: string): string {
    if (mode === 'battle') return battleIcon
    if (mode === 'sbs') return scalesIcon
    return messageCircle
  }

  // Glass button style shared between collapsed and expanded
  const glassButtonStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.1)',
    padding: '10px',
    boxShadow: '0px 1px 2px rgba(16,24,40,0.05)',
  }

  if (collapsed) {
    return (
      <aside
        className="fixed left-0 top-[90px] z-40 flex flex-col"
        style={{ width: '56px', padding: '0 8px', gap: '32px', height: '620px' }}
      >
        {/* Toggle button — same position as expanded */}
        <div style={{ padding: '8px 4px 0' }}>
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center cursor-pointer hover:bg-white/20 transition-all"
            style={glassButtonStyle}
          >
            <img src={sidebarToggle} alt="Expand" style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Icon-only nav buttons — Figma: 48×128, 3 buttons 40×40, gap-4 */}
        <nav className="flex flex-col" style={{ padding: '0 4px', gap: '4px' }}>
          <button
            onClick={handleNewChat}
            className="flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all bg-transparent border-none"
            style={{ width: '40px', height: '40px', borderRadius: '6px', padding: '8px', background: view === 'arena' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            title="Cuộc trò chuyện mới"
          >
            <img src={newChat} alt="Cuộc trò chuyện mới" style={{ width: '24px', height: '24px' }} />
          </button>
          <button
            onClick={() => setView('leaderboard')}
            className="flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all bg-transparent border-none"
            style={{ width: '40px', height: '40px', borderRadius: '6px', padding: '8px', background: view === 'leaderboard' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            title="Bảng xếp hạng"
          >
            <img src={barChart} alt="Bảng xếp hạng" style={{ width: '24px', height: '24px' }} />
          </button>
          <button
            className="flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all bg-transparent border-none"
            style={{ width: '40px', height: '40px', borderRadius: '6px', padding: '8px' }}
            title="Tìm kiếm"
          >
            <img src={searchIcon} alt="Tìm kiếm" style={{ width: '24px', height: '24px' }} />
          </button>
        </nav>

        {/* Gradient divider — Figma: Rectangle 4667, 1×620px */}
        <div
          className="absolute right-0 top-0 w-px pointer-events-none"
          style={{
            height: '620px',
            background: 'linear-gradient(180deg, rgba(0, 34, 102, 0) 0%, #5281DD 50%, rgba(0, 34, 102, 0) 100%)',
          }}
        />
      </aside>
    )
  }

  return (
    <aside
      className="w-[280px] fixed left-0 top-[90px] z-40 flex flex-col"
      style={{ padding: '0 8px', gap: '32px', height: '620px' }}
    >
      {/* Search section — Figma: px-4 py-8, contains 40×40 glass button */}
      <div style={{ padding: '8px 4px 0' }}>
        <button
          onClick={() => setCollapsed(true)}
          className="flex items-center justify-center cursor-pointer hover:bg-white/20 transition-all"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.1)',
            padding: '10px',
            boxShadow: '0px 1px 2px rgba(16,24,40,0.05)',
          }}
        >
          <img src={sidebarToggle} alt="Collapse" style={{ width: '20px', height: '20px' }} />
        </button>
      </div>

      {/* Navigation — Figma: gap-4, each item 264×40 */}
      <nav className="flex flex-col cursor-pointer" style={{ gap: '4px' }}>
        {[
          { icon: newChat, label: 'Cuộc trò chuyện mới', onClick: handleNewChat, activeView: 'arena' as const },
          { icon: barChart, label: 'Bảng xếp hạng', onClick: () => setView('leaderboard'), activeView: 'leaderboard' as const },
          { icon: searchIcon, label: 'Tìm kiếm cuộc trò chuyện', onClick: undefined, activeView: null },
        ].map((item) => {
          const isActive = item.activeView !== null && view === item.activeView
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex items-start w-full border-none bg-transparent cursor-pointer"
              style={{ height: '40px' }}
            >
              <div
                className="flex flex-1 items-center self-stretch overflow-hidden hover:bg-white/10 transition-all"
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  gap: '12px',
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}
              >
                <div className="shrink-0 overflow-hidden" style={{ width: '24px', height: '24px' }}>
                  <img src={item.icon} alt="" aria-hidden="true" style={{ width: '100%', height: '100%' }} />
                </div>
                <span
                  className="shrink-0 whitespace-nowrap"
                  style={{
                    fontFamily: "'Be Vietnam Pro', sans-serif",
                    fontSize: '16px',
                    lineHeight: '24px',
                    fontWeight: 600,
                    color: '#F2F4F7',
                    textAlign: 'left',
                  }}
                >
                  {item.label}
                </span>
              </div>
            </button>
          )
        })}
      </nav>

      {/* History section — Figma: px-16, gap-16 */}
      <div className="flex flex-col" style={{ padding: '0 16px', gap: '16px' }}>
        {/* Label */}
        <div className="flex items-center shrink-0">
          <span
            className="shrink-0 whitespace-nowrap"
            style={{
              fontFamily: "'Be Vietnam Pro', sans-serif",
              fontSize: '16px',
              lineHeight: '24px',
              fontWeight: 500,
              color: '#FFFFFF',
            }}
          >
            Lịch sử
          </span>
        </div>

        {/* History items — Figma: gap-16, each item gap-8 */}
        <div className="flex flex-col overflow-y-auto" style={{ gap: '16px' }}>
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center shrink-0 w-full"
              style={{ gap: '8px' }}
            >
              <div className="shrink-0 overflow-hidden" style={{ width: '20px', height: '20px', opacity: 0.5 }}>
                <img src={modeIcon(entry.mode)} alt="" aria-hidden="true" style={{ width: '100%', height: '100%' }} />
              </div>
              <p
                className="flex-1 overflow-hidden"
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontSize: '14px',
                  lineHeight: '20px',
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.75)',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  margin: 0,
                  minWidth: 0,
                }}
              >
                {entry.prompt_text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Right edge gradient divider — Figma: Rectangle 4667, 1×620px */}
      <div
        className="absolute right-0 top-0 w-px pointer-events-none"
        style={{
          height: '620px',
          background: 'linear-gradient(180deg, rgba(0, 34, 102, 0) 0%, #5281DD 50%, rgba(0, 34, 102, 0) 100%)',
        }}
      />
    </aside>
  )
}
