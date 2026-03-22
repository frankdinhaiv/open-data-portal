import { useEffect, useCallback, useState } from 'react'
import { useStore } from '../../hooks/useStore'
import { fetchLeaderboard } from '../../api/client'
import switchVerticalIcon from '../../assets/icons/switch-vertical.svg'
import helpCircleIcon from '../../assets/icons/help-circle.svg'
import trophyIcon from '../../assets/icons/trophy.svg'
import featherIcon from '../../assets/icons/feather.svg'
import lightbulbIcon from '../../assets/icons/lightbulb.svg'
import codeIcon from '../../assets/icons/code.svg'
import starIcon from '../../assets/icons/star.svg'
import arrowLeftIcon from '../../assets/icons/arrow-left.svg'
import arrowRightIcon from '../../assets/icons/arrow-right.svg'

const CATEGORIES = [
  { key: 'all', label: 'Tổng hợp', icon: trophyIcon, active: true },
  { key: 'creative', label: 'Sáng tạo', icon: featherIcon },
  { key: 'reasoning', label: 'Suy luận', icon: lightbulbIcon },
  { key: 'coding', label: 'Lập trình', icon: codeIcon },
  { key: 'culture', label: 'Văn hoá Việt Nam', icon: starIcon },
]

type SortKey = 'rank' | 'name' | 'elo_rating' | 'ci' | 'win_rate' | 'total_votes' | 'license'
type SortDir = 'asc' | 'desc'

const ITEMS_PER_PAGE = 10

export function LeaderboardTable() {
  const { leaderboard, setLeaderboard, licenseFilter, setLicenseFilter } = useStore()
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const refresh = useCallback(() => {
    fetchLeaderboard(licenseFilter)
      .then((data) => { if (Array.isArray(data)) setLeaderboard(data) })
      .catch(() => { /* API not available */ })
  }, [licenseFilter, setLeaderboard])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    setCurrentPage(1)
  }, [licenseFilter, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'rank' ? 'asc' : 'desc')
    }
  }

  const sorted = [...leaderboard].sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'rank': cmp = a.rank - b.rank; break
      case 'name': cmp = a.name.localeCompare(b.name); break
      case 'elo_rating': cmp = a.elo_rating - b.elo_rating; break
      case 'ci': cmp = a.ci - b.ci; break
      case 'win_rate': cmp = a.win_rate - b.win_rate; break
      case 'total_votes': cmp = a.total_votes - b.total_votes; break
      case 'license': cmp = a.license.localeCompare(b.license); break
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE))
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const paginationNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1, 2, 3)
      if (currentPage > 4) pages.push('...')
      if (currentPage > 3 && currentPage < totalPages - 2) pages.push(currentPage)
      if (currentPage < totalPages - 3) pages.push('...')
      pages.push(totalPages - 2, totalPages - 1, totalPages)
    }
    // deduplicate
    const unique: (number | string)[] = []
    for (const p of pages) {
      if (unique[unique.length - 1] !== p) unique.push(p)
    }
    return unique
  }

  return (
    <div>
      {/* Category filter tabs */}
      <div
        className="flex items-start"
        style={{ padding: '8px 0' }}
      >
        <div className="flex items-center gap-[8px] flex-1 min-w-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setLicenseFilter(cat.key)}
              className="flex items-center gap-[4px] shrink-0 overflow-hidden"
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: licenseFilter === cat.key ? '#155EEF' : 'transparent',
                boxShadow: licenseFilter === cat.key ? '0px 1px 2px rgba(16,24,40,0.05)' : 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <img src={cat.icon} alt="" style={{ width: 20, height: 20 }} />
              <span
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontSize: '14px',
                  lineHeight: '20px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                  padding: '0 2px',
                }}
              >
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ marginTop: '32px' }}>
        <table
          className="w-full"
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr>
              <HeaderCell
                label="#"
                sortKey="rank"
                currentSort={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                style={{ width: '56px', borderRadius: '12px 0 0 12px' }}
              />
              <HeaderCell
                label="Model"
                sortKey="name"
                currentSort={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                style={{ width: '220px' }}
              />
              <HeaderCell
                label="ELO"
                sortKey="elo_rating"
                currentSort={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                showHelp
              />
              <HeaderCell
                label="±CI"
                sortKey="ci"
                currentSort={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                showHelp
              />
              <HeaderCell
                label="Tỉ lệ thắng"
                sortKey="win_rate"
                currentSort={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                showHelp
              />
              <HeaderCell
                label="Phiếu"
                sortKey="total_votes"
                currentSort={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                showHelp
              />
              <HeaderCell
                label="Loại"
                sortKey="license"
                currentSort={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                showHelp
                align="right"
                style={{ borderRadius: '0 12px 12px 0' }}
              />
            </tr>
          </thead>
          <tbody>
            {paginated.map((m, idx) => (
              <tr
                key={m.model_id}
                className="transition-colors"
                style={{
                  background: idx === 3
                    ? 'linear-gradient(90deg, rgba(21,94,239,0.15) 0%, rgba(21,94,239,0.05) 100%)'
                    : 'transparent',
                }}
              >
                {/* Rank */}
                <td style={{ padding: '16px 24px', height: '72px', verticalAlign: 'middle' }}>
                  <span
                    style={{
                      fontFamily: "'Be Vietnam Pro', sans-serif",
                      fontSize: '14px',
                      lineHeight: '20px',
                      fontWeight: 400,
                      color: '#FFFFFF',
                    }}
                  >
                    {m.rank}
                  </span>
                </td>

                {/* Model */}
                <td style={{ padding: '16px 24px', height: '72px', verticalAlign: 'middle' }}>
                  <div className="flex items-center gap-[12px]">
                    <div
                      className="shrink-0 flex items-center justify-center"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '16px',
                        background: '#FFFFFF',
                        overflow: 'hidden',
                        padding: '4px',
                      }}
                    >
                      <div
                        className="flex items-center justify-center"
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '12px',
                          background: m.color || '#155EEF',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#FFFFFF',
                          flexShrink: 0,
                        }}
                      >
                        {m.name[0]}
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: "'Be Vietnam Pro', sans-serif",
                        fontSize: '14px',
                        lineHeight: '20px',
                        fontWeight: 500,
                        color: '#FFFFFF',
                      }}
                    >
                      {m.name}
                    </span>
                  </div>
                </td>

                {/* ELO */}
                <td style={{ padding: '16px 24px', height: '72px', verticalAlign: 'middle' }}>
                  <span
                    style={{
                      fontFamily: "'Be Vietnam Pro', sans-serif",
                      fontSize: '14px',
                      lineHeight: '20px',
                      fontWeight: 400,
                      color: '#FFFFFF',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {m.elo_rating}
                  </span>
                </td>

                {/* ±CI */}
                <td style={{ padding: '16px 24px', height: '72px', verticalAlign: 'middle' }}>
                  <span
                    style={{
                      fontFamily: "'Be Vietnam Pro', sans-serif",
                      fontSize: '14px',
                      lineHeight: '20px',
                      fontWeight: 400,
                      color: '#FFFFFF',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    ±{m.ci}
                  </span>
                </td>

                {/* Win Rate */}
                <td style={{ padding: '16px 24px', height: '72px', verticalAlign: 'middle' }}>
                  <div className="flex flex-col items-start">
                    <span
                      style={{
                        fontFamily: "'Be Vietnam Pro', sans-serif",
                        fontSize: '14px',
                        lineHeight: '20px',
                        fontWeight: 400,
                        color: '#FFFFFF',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {m.win_rate}%
                    </span>
                    <div className="relative w-full" style={{ height: '4px' }}>
                      {/* Red background bar (loss) */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: '#FDA29B',
                          borderRadius: '4px',
                        }}
                      />
                      {/* Green foreground bar (win) */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          bottom: 0,
                          width: `${m.win_rate}%`,
                          background: '#75E0A7',
                          borderRadius: '4px 0 0 4px',
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                </td>

                {/* Votes */}
                <td style={{ padding: '16px 24px', height: '72px', verticalAlign: 'middle' }}>
                  <span
                    style={{
                      fontFamily: "'Be Vietnam Pro', sans-serif",
                      fontSize: '14px',
                      lineHeight: '20px',
                      fontWeight: 400,
                      color: '#FFFFFF',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {m.total_votes.toLocaleString()}
                  </span>
                </td>

                {/* License badge */}
                <td style={{ padding: '16px 24px', height: '72px', verticalAlign: 'middle', textAlign: 'right' }}>
                  <LicenseBadge license={m.license} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-center gap-[12px]"
            style={{ padding: '8px 0', marginTop: '0px' }}
          >
            {/* Previous */}
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex items-center justify-center shrink-0 overflow-hidden"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                padding: '6px',
                cursor: currentPage === 1 ? 'default' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0px 1px 2px rgba(16,24,40,0.05)',
              }}
            >
              <img src={arrowLeftIcon} alt="Previous" style={{ width: 20, height: 20 }} />
            </button>

            {/* Page numbers */}
            <div className="flex items-start gap-[2px]">
              {paginationNumbers().map((p, i) =>
                typeof p === 'string' ? (
                  <div
                    key={`ellipsis-${i}`}
                    className="flex items-center justify-center"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      fontFamily: "'Be Vietnam Pro', sans-serif",
                      fontSize: '14px',
                      fontWeight: 500,
                      lineHeight: '20px',
                      color: '#FFFFFF',
                    }}
                  >
                    ...
                  </div>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className="flex items-center justify-center"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: currentPage === p ? 'rgba(255,255,255,0.1)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: "'Be Vietnam Pro', sans-serif",
                      fontSize: '14px',
                      fontWeight: 500,
                      lineHeight: '20px',
                      color: '#FFFFFF',
                    }}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

            {/* Next */}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center justify-center shrink-0 overflow-hidden"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                padding: '6px',
                cursor: currentPage === totalPages ? 'default' : 'pointer',
                opacity: currentPage === totalPages ? 0.5 : 1,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0px 1px 2px rgba(16,24,40,0.05)',
              }}
            >
              <img src={arrowRightIcon} alt="Next" style={{ width: 20, height: 20 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- Sub-components ---- */

function HeaderCell({
  label,
  sortKey,
  currentSort,
  sortDir,
  onSort,
  showHelp,
  align = 'left',
  style,
}: {
  label: string
  sortKey: SortKey
  currentSort: SortKey
  sortDir: SortDir
  onSort: (k: SortKey) => void
  showHelp?: boolean
  align?: 'left' | 'right'
  style?: React.CSSProperties
}) {
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: '12px 24px',
        background: 'rgba(255,255,255,0.1)',
        borderBottom: '1px solid #6585C5',
        cursor: 'pointer',
        textAlign: align,
        ...style,
      }}
    >
      <div
        className="flex items-center gap-[4px]"
        style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}
      >
        <span
          style={{
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontSize: '12px',
            lineHeight: '18px',
            fontWeight: 500,
            color: '#FFFFFF',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
        <img
          src={switchVerticalIcon}
          alt="Sort"
          style={{
            width: 16,
            height: 16,
            opacity: currentSort === sortKey ? 1 : 0.6,
          }}
        />
        {showHelp && (
          <img
            src={helpCircleIcon}
            alt="Help"
            style={{ width: 16, height: 16, opacity: 0.6 }}
          />
        )}
      </div>
    </th>
  )
}

function LicenseBadge({ license }: { license: string }) {
  const isOpen = license === 'open'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '16px',
        fontFamily: "'Be Vietnam Pro', sans-serif",
        fontSize: '12px',
        lineHeight: '18px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        background: isOpen ? '#ECFDF3' : '#F4F3FF',
        border: `1px solid ${isOpen ? '#ABEFC6' : '#D9D6FE'}`,
        color: isOpen ? '#067647' : '#5925DC',
      }}
    >
      {isOpen ? 'OPEN' : 'PROP'}
    </span>
  )
}
