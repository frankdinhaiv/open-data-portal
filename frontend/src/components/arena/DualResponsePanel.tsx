import type { Model } from '../../types'

interface Props {
  responseA: string
  responseB: string
  modelA: Model
  modelB: Model
  isBattle: boolean
  voteResult?: 'a' | 'b' | 'tie' | 'bad' | null
}

function formatResponse(text: string) {
  return text.split('\n').map((line, i) => {
    const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    if (line.match(/^\d+\./)) return <p key={i} className="ml-3" dangerouslySetInnerHTML={{ __html: formatted }} />
    if (line.startsWith('```')) return <pre key={i} className="bg-[var(--bg-input)] rounded-lg p-3 text-xs overflow-x-auto my-2">{line.replace(/```\w*/, '')}</pre>
    return line ? <p key={i} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{ __html: formatted }} /> : null
  })
}

function cardClass(side: 'a' | 'b', voteResult?: string | null) {
  if (!voteResult) return 'border-[var(--border)]'
  if (voteResult === 'tie') return 'border-[var(--green)] bg-gradient-to-b from-green-50 to-white'
  if (voteResult === 'bad') return 'border-[var(--red)] bg-gradient-to-b from-red-50 to-white opacity-70'
  if (voteResult === side) return 'border-[var(--green)] bg-gradient-to-b from-green-50 to-white shadow-[0_0_0_2px_rgba(16,185,129,0.15)]'
  return 'border-[var(--red)] bg-gradient-to-b from-red-50 to-white opacity-75'
}

function headerBadge(side: 'a' | 'b', voteResult?: string | null) {
  if (!voteResult) return null
  if (voteResult === 'tie') return <span className="text-[0.7rem] font-bold text-emerald-800 bg-[var(--green-light)] px-2 py-0.5 rounded-full">🤝 Hòa</span>
  if (voteResult === 'bad') return <span className="text-[0.7rem] font-bold text-red-800 bg-[var(--red-light)] px-2 py-0.5 rounded-full">👎 Tệ</span>
  if (voteResult === side) return <span className="text-[0.7rem] font-bold text-emerald-800 bg-[var(--green-light)] px-2 py-0.5 rounded-full">🏆 Thắng</span>
  return <span className="text-[0.7rem] font-bold text-red-800 bg-[var(--red-light)] px-2 py-0.5 rounded-full">Thua</span>
}

export function DualResponsePanel({ responseA, responseB, modelA, modelB, isBattle, voteResult }: Props) {
  return (
    <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4 animate-slide-up">
      {/* Response A */}
      <div className={`bg-[var(--bg-card)] border rounded-2xl overflow-hidden transition-all hover:shadow-md ${cardClass('a', voteResult)}`}>
        <div className="px-4 py-3 border-b border-[var(--border-light)] flex items-center justify-between">
          <div className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[0.72rem] font-bold text-white bg-[var(--accent)]">A</span>
            {isBattle ? 'Mô hình A' : modelA.name}
          </div>
          {!isBattle && <span className="text-[0.72rem] text-[var(--text-dim)]">{modelA.org}</span>}
          {headerBadge('a', voteResult)}
        </div>
        <div className="px-4 py-4 text-sm leading-relaxed max-h-96 overflow-y-auto">
          {formatResponse(responseA)}
        </div>
      </div>

      {/* Response B */}
      <div className={`bg-[var(--bg-card)] border rounded-2xl overflow-hidden transition-all hover:shadow-md ${cardClass('b', voteResult)}`}>
        <div className="px-4 py-3 border-b border-[var(--border-light)] flex items-center justify-between">
          <div className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[0.72rem] font-bold text-white bg-[var(--orange)]">B</span>
            {isBattle ? 'Mô hình B' : modelB.name}
          </div>
          {!isBattle && <span className="text-[0.72rem] text-[var(--text-dim)]">{modelB.org}</span>}
          {headerBadge('b', voteResult)}
        </div>
        <div className="px-4 py-4 text-sm leading-relaxed max-h-96 overflow-y-auto">
          {formatResponse(responseB)}
        </div>
      </div>
    </div>
  )
}
