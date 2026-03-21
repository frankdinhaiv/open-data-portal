import { useEffect, useRef, useState } from 'react'
import { fetchStats } from '../../api/client'

type StatType = 'win-fraction' | 'battle-count' | 'avg-win-rate' | 'confidence-intervals'

const TABS: { id: StatType; icon: string; label: string }[] = [
  { id: 'win-fraction', icon: '📊', label: 'Win Fraction Matrix' },
  { id: 'battle-count', icon: '🔢', label: 'Battle Count Matrix' },
  { id: 'avg-win-rate', icon: '📈', label: 'Average Win Rate' },
  { id: 'confidence-intervals', icon: '📉', label: 'Confidence Intervals' },
]

const DESCRIPTIONS: Record<StatType, { title: string; desc: string }> = {
  'win-fraction': {
    title: 'Fraction of Model A Wins (Non-tied Battles)',
    desc: 'Position-bias corrected. Blue = row wins, white = even, red = row loses.',
  },
  'battle-count': {
    title: 'Battle Count per Model Pair (No Ties)',
    desc: 'Symmetric matrix. Yellow = high count, purple = low. Pairs <50 battles are unreliable.',
  },
  'avg-win-rate': {
    title: 'Average Win Rate Against All Other Models',
    desc: 'Uniform sampling, ties excluded. Non-parametric sanity check.',
  },
  'confidence-intervals': {
    title: 'Confidence Intervals on Elo Score',
    desc: 'Bootstrap Elo (1,000 permutations). Non-overlapping CIs = statistically significant difference.',
  },
}

function winrateColor(wr: number): string {
  if (wr >= 0.5) {
    const t = (wr - 0.5) * 2
    return `rgb(${Math.round(255 - t * 196)},${Math.round(255 - t * 130)},255)`
  }
  const t = (0.5 - wr) * 2
  return `rgb(255,${Math.round(255 - t * 150)},${Math.round(255 - t * 187)})`
}

function battleCountColor(t: number): string {
  return `rgb(${Math.round(88 + t * 167)},${Math.round(48 + t * 185)},${Math.round(140 - t * 100)})`
}

export function StatCharts() {
  const [activeStat, setActiveStat] = useState<StatType>('win-fraction')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetchStats(activeStat).then((data) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      if (activeStat === 'win-fraction') drawHeatmap(ctx, canvas, data, 'winrate')
      else if (activeStat === 'battle-count') drawHeatmap(ctx, canvas, data, 'count')
      else if (activeStat === 'avg-win-rate') drawAvgWinRate(ctx, canvas, data)
      else if (activeStat === 'confidence-intervals') drawCI(ctx, canvas, data)
    })
  }, [activeStat])

  return (
    <div>
      <div className="flex gap-1.5 mt-5 mb-4 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveStat(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all
              ${activeStat === tab.id
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]'
              }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden animate-fade-in">
        <div className="px-5 py-4 border-b border-[var(--border-light)] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">{DESCRIPTIONS[activeStat].title}</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-lg">{DESCRIPTIONS[activeStat].desc}</p>
          </div>
        </div>
        <div className="p-5 flex justify-center overflow-x-auto">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  )
}

function drawHeatmap(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: { models: string[]; matrix: number[][] }, type: 'winrate' | 'count') {
  const n = data.models.length
  const margin = 100, cellSize = 38
  canvas.width = margin + n * cellSize + 20
  canvas.height = margin + n * cellSize + 20
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  let maxCount = 0
  if (type === 'count') {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) maxCount = Math.max(maxCount, data.matrix[i][j])
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = margin + j * cellSize, y = margin + i * cellSize
      if (i === j) {
        ctx.fillStyle = '#1a1d23'
        ctx.fillRect(x, y, cellSize - 1, cellSize - 1)
      } else {
        const val = data.matrix[i][j]
        if (type === 'winrate') {
          ctx.fillStyle = winrateColor(val)
          ctx.fillRect(x, y, cellSize - 1, cellSize - 1)
          ctx.fillStyle = val > 0.65 || val < 0.35 ? '#fff' : '#333'
          ctx.font = 'bold 9px Inter'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(Math.round(val * 100) + '%', x + cellSize / 2, y + cellSize / 2)
        } else {
          const t = maxCount > 0 ? val / maxCount : 0
          ctx.fillStyle = battleCountColor(t)
          ctx.fillRect(x, y, cellSize - 1, cellSize - 1)
          ctx.fillStyle = t > 0.6 ? '#fff' : '#333'
          ctx.font = 'bold 9px Inter'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(val), x + cellSize / 2, y + cellSize / 2)
        }
      }
    }
  }

  // Labels
  ctx.fillStyle = '#5a6070'
  ctx.font = '600 9px Inter'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  data.models.forEach((name, i) => {
    const label = name.length > 14 ? name.slice(0, 14) + '…' : name
    ctx.fillText(label, margin - 6, margin + i * cellSize + cellSize / 2)
  })
  ctx.textAlign = 'center'
  data.models.forEach((name, j) => {
    ctx.save()
    ctx.translate(margin + j * cellSize + cellSize / 2, margin - 6)
    ctx.rotate(-Math.PI / 3)
    ctx.textAlign = 'right'
    ctx.fillText(name.length > 14 ? name.slice(0, 14) + '…' : name, 0, 0)
    ctx.restore()
  })
}

function drawAvgWinRate(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: { model: string; avg_win_rate: number }[]) {
  canvas.width = 700
  canvas.height = 440
  ctx.clearRect(0, 0, 700, 440)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 700, 440)

  const sorted = [...data].sort((a, b) => b.avg_win_rate - a.avg_win_rate)
  const n = sorted.length
  const ml = 140, mr = 60, mt = 20, mb = 20
  const chartW = 700 - ml - mr, barH = (440 - mt - mb) / n - 4

  sorted.forEach((m, i) => {
    const y = mt + i * (barH + 4)
    const w = chartW * m.avg_win_rate
    const grad = ctx.createLinearGradient(ml, 0, ml + w, 0)
    grad.addColorStop(0, '#3b82f6')
    grad.addColorStop(1, '#60a5fa')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(ml, y, w, barH, [0, 4, 4, 0])
    ctx.fill()

    ctx.fillStyle = '#5a6070'
    ctx.font = '600 10px Inter'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(m.model, ml - 8, y + barH / 2)

    ctx.fillStyle = '#1a1d23'
    ctx.font = 'bold 10px Inter'
    ctx.textAlign = 'left'
    ctx.fillText(Math.round(m.avg_win_rate * 100) + '%', ml + w + 6, y + barH / 2)
  })
}

function drawCI(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: { model: string; color: string; elo: number; ci_lower: number; ci_upper: number }[]) {
  canvas.width = 700
  canvas.height = 440
  ctx.clearRect(0, 0, 700, 440)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 700, 440)

  const sorted = [...data].sort((a, b) => b.elo - a.elo)
  const n = sorted.length
  const ml = 140, mr = 40, mt = 20, mb = 30
  const chartW = 700 - ml - mr, chartH = 440 - mt - mb
  const rowH = chartH / n

  const minElo = Math.min(...sorted.map((m) => m.ci_lower)) - 10
  const maxElo = Math.max(...sorted.map((m) => m.ci_upper)) + 10
  const range = maxElo - minElo

  // Grid
  const step = 20
  ctx.strokeStyle = '#eceef2'
  ctx.lineWidth = 0.5
  ctx.font = '500 9px Inter'
  ctx.fillStyle = '#b0b5c0'
  ctx.textAlign = 'center'
  for (let e = Math.ceil(minElo / step) * step; e <= maxElo; e += step) {
    const x = ml + ((e - minElo) / range) * chartW
    ctx.beginPath(); ctx.moveTo(x, mt); ctx.lineTo(x, mt + chartH); ctx.stroke()
    ctx.fillText(String(e), x, mt + chartH + 16)
  }

  sorted.forEach((m, i) => {
    const y = mt + i * rowH + rowH / 2
    const xCenter = ml + ((m.elo - minElo) / range) * chartW
    const xLow = ml + ((m.ci_lower - minElo) / range) * chartW
    const xHigh = ml + ((m.ci_upper - minElo) / range) * chartW

    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(xLow, y); ctx.lineTo(xHigh, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(xLow, y - 5); ctx.lineTo(xLow, y + 5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(xHigh, y - 5); ctx.lineTo(xHigh, y + 5); ctx.stroke()

    ctx.fillStyle = m.color
    ctx.beginPath(); ctx.arc(xCenter, y, 5, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#5a6070'
    ctx.font = '600 10px Inter'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(m.model, ml - 8, y)

    ctx.fillStyle = '#1a1d23'
    ctx.font = 'bold 9px Inter'
    ctx.textAlign = 'left'
    ctx.fillText(String(Math.round(m.elo)), xHigh + 6, y)
  })
}
