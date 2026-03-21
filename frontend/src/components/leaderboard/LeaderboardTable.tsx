import { useEffect, useCallback } from 'react'
import { useStore } from '../../hooks/useStore'
import { fetchLeaderboard } from '../../api/client'

export function LeaderboardTable() {
  const { leaderboard, setLeaderboard, licenseFilter, setLicenseFilter } = useStore()

  const refresh = useCallback(() => {
    fetchLeaderboard(licenseFilter).then(setLeaderboard)
  }, [licenseFilter, setLeaderboard])

  // Refresh on mount and when filter changes
  useEffect(() => {
    refresh()
  }, [refresh])

  const filters = [
    { key: 'all', label: 'Tất cả' },
    { key: 'open', label: 'Open Source' },
    { key: 'prop', label: 'Proprietary' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">🏆 Bảng Xếp Hạng Arena</h2>
          <div className="text-[0.72rem] text-[var(--text-muted)]">
            Elo Rating System (K=32) · Bootstrap CI (n=1000)
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-[var(--text-muted)]">{leaderboard.length} mô hình · {leaderboard.reduce((s, m) => s + m.total_votes, 0).toLocaleString()} phiếu</span>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setLicenseFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all
                ${licenseFilter === f.key
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider border-b border-[var(--border)] bg-[var(--bg-input)] w-12 text-center">#</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider border-b border-[var(--border)] bg-[var(--bg-input)]">Mô hình</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider border-b border-[var(--border)] bg-[var(--bg-input)]">Elo</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider border-b border-[var(--border)] bg-[var(--bg-input)]">±CI</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider border-b border-[var(--border)] bg-[var(--bg-input)]">Win Rate</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider border-b border-[var(--border)] bg-[var(--bg-input)]">Phiếu</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider border-b border-[var(--border)] bg-[var(--bg-input)]">Tổ chức</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((m) => {
              const rankClass = m.rank === 1 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900'
                : m.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700'
                : m.rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)]'
              return (
                <tr key={m.model_id} className="hover:bg-[var(--bg-hover)] transition-all">
                  <td className="px-4 py-3 border-b border-[var(--border-light)] text-center">
                    <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${rankClass}`}>
                      {m.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-[var(--border-light)]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: m.color }}>
                        {m.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold">{m.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-[var(--border-light)] font-bold text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {m.elo_rating}
                  </td>
                  <td className="px-4 py-3 border-b border-[var(--border-light)] text-[var(--text-muted)] text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    ±{m.ci}
                  </td>
                  <td className="px-4 py-3 border-b border-[var(--border-light)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {m.win_rate}%
                    <div className="h-1 bg-[var(--bg-input)] rounded-full w-20 mt-1 overflow-hidden">
                      <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-500" style={{ width: `${m.win_rate}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-[var(--border-light)] text-[var(--text-secondary)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {m.total_votes.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 border-b border-[var(--border-light)] text-xs text-[var(--text-secondary)]">
                    {m.org}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
