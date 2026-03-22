import { useEffect, useRef, useState } from 'react'
import { fetchStats } from '../../api/client'

import openaiAvatar from '../../assets/models/openai.png'
import googleAvatar from '../../assets/models/google.png'
import metaAvatar from '../../assets/models/meta.png'
import deepseekAvatar from '../../assets/models/deepseek.png'
import xaiAvatar from '../../assets/models/xai.png'
import anthropicAvatar from '../../assets/models/anthropic.png'
import qwenAvatar from '../../assets/models/qwen.png'

const MODEL_AVATARS: Record<string, string> = {
  'openai': openaiAvatar,
  'gpt': openaiAvatar,
  'google': googleAvatar,
  'gemini': googleAvatar,
  'meta': metaAvatar,
  'llama': metaAvatar,
  'deepseek': deepseekAvatar,
  'xai': xaiAvatar,
  'grok': xaiAvatar,
  'anthropic': anthropicAvatar,
  'claude': anthropicAvatar,
  'qwen': qwenAvatar,
  'alibaba': qwenAvatar,
}

function getModelAvatar(modelName: string): string | undefined {
  const lower = modelName.toLowerCase()
  const key = Object.keys(MODEL_AVATARS).find((k) => lower.includes(k))
  return key ? MODEL_AVATARS[key] : undefined
}

/*
 * StatCharts — three visualization sections matching Figma 2:10985, 2:11498, 2:11512
 *
 * 1. Win Rate Matrix (heatmap) — green/red/neutral cells
 * 2. Battle Count Matrix (heatmap) — gold/blue gradient
 * 3. Average Win Rate (horizontal bars with gradient)
 */

// ─── Color helpers ───

function winrateColor(wr: number): string {
  // >50% → green (#00FF88 glow), <50% → red (#FF3366 glow), 50% → neutral gray
  if (wr > 0.52) {
    const t = Math.min((wr - 0.5) * 4, 1)
    const r = Math.round(20 + (1 - t) * 50)
    const g = Math.round(60 + t * 140)
    const b = Math.round(80 + (1 - t) * 40)
    return `rgba(${r}, ${g}, ${b}, 0.85)`
  }
  if (wr < 0.48) {
    const t = Math.min((0.5 - wr) * 4, 1)
    const r = Math.round(80 + t * 100)
    const g = Math.round(50 + (1 - t) * 30)
    const b = Math.round(60 + (1 - t) * 40)
    return `rgba(${r}, ${g}, ${b}, 0.85)`
  }
  return 'rgba(74, 80, 96, 0.85)'
}

function winrateTextColor(wr: number): string {
  if (wr > 0.52) return '#DDFFF0'
  if (wr < 0.48) return '#FFD0D0'
  return 'rgba(200,232,255,0.8)'
}

function battleCountColor(t: number): string {
  // low → blue (#1A6FCC), high → gold (#F5C800)
  const r = Math.round(26 + t * 219)
  const g = Math.round(111 + t * 89)
  const b = Math.round(204 - t * 204)
  return `rgba(${r}, ${g}, ${b}, 0.75)`
}

// ─── Section header component ───

function SectionHeader({
  title,
  subtitle,
  legends,
}: {
  title: string
  subtitle: string
  legends?: { color: string; glow: string; label: string }[]
}) {
  return (
    <div
      className="flex flex-col items-center"
      style={{ paddingTop: '48px', gap: '32px', width: '100%' }}
    >
      <div className="flex items-start justify-center" style={{ width: '900px' }}>
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '36px',
            lineHeight: '44px',
            fontWeight: 400,
            letterSpacing: '-0.72px',
            color: '#FFFFFF',
            whiteSpace: 'nowrap',
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      <div
        className="flex flex-col items-center"
        style={{ width: '900px', gap: '10px' }}
      >
        <p
          style={{
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontSize: '20px',
            lineHeight: '30px',
            fontWeight: 400,
            color: '#FFFFFF',
            opacity: 0.75,
            textAlign: 'center',
            width: '100%',
            margin: 0,
          }}
        >
          {subtitle}
        </p>
        {legends && (
          <div
            className="flex flex-wrap items-start justify-center"
            style={{ width: '100%', gap: '0 24px', minHeight: '15px' }}
          >
            {legends.map((leg) => (
              <div
                key={leg.label}
                className="flex items-center"
                style={{ gap: '8px', alignSelf: 'stretch' }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    background: leg.color,
                    boxShadow: `0px 0px 8px 0px ${leg.glow}`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Be Vietnam Pro', sans-serif",
                    fontSize: '12px',
                    fontWeight: 400,
                    letterSpacing: '1px',
                    color: 'rgba(200,232,255,0.6)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {leg.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───

export function StatCharts() {
  return (
    <div className="flex flex-col items-center" style={{ gap: '0px', width: '100%' }}>
      <WinRateMatrix />
      <BattleCountMatrix />
      <AvgWinRate />
    </div>
  )
}

// ─── Win Rate Matrix ───

function WinRateMatrix() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchStats('win-fraction')
      .then((data) => {
        if (!data?.models?.length) { setError(true); return }
        drawWinRateHeatmap(canvasRef.current, data)
      })
      .catch(() => setError(true))
  }, [])

  return (
    <div>
      <SectionHeader
        title="Ma trận tỉ lệ thắng"
        subtitle="Đã hiệu chỉnh thiên lệch vị trí  ·  Hàng = model chơi  ·  Cột = đối thủ"
        legends={[
          { color: '#00FF88', glow: '#00FF88', label: 'Thắng (>50%)' },
          { color: '#FF3366', glow: '#FF3366', label: 'Thua (<50%)' },
          { color: '#4A5060', glow: 'rgba(100,120,160,0.4)', label: 'Hoà (50%)' },
        ]}
      />
      <div className="flex justify-center" style={{ padding: '32px 0', overflow: 'auto' }}>
        {error ? (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Chưa có dữ liệu</p>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
    </div>
  )
}

function drawWinRateHeatmap(
  canvas: HTMLCanvasElement | null,
  data: { models: string[]; matrix: number[][] }
) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const n = data.models.length
  const cellSize = 56
  const gap = 3
  const labelMargin = 160
  const dpr = window.devicePixelRatio || 1

  const gridW = n * cellSize + (n - 1) * gap
  const totalW = labelMargin + gridW + 20
  const totalH = labelMargin + gridW + 20

  canvas.width = totalW * dpr
  canvas.height = totalH * dpr
  canvas.style.width = `${totalW}px`
  canvas.style.height = `${totalH}px`
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, totalW, totalH)

  // Draw cells
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = labelMargin + j * (cellSize + gap)
      const y = labelMargin + i * (cellSize + gap)

      if (i === j) {
        // Diagonal — darker
        ctx.fillStyle = 'rgba(21, 37, 80, 0.9)'
        roundRect(ctx, x, y, cellSize, cellSize, 8)
        ctx.fill()
      } else {
        const val = data.matrix[i][j]
        ctx.fillStyle = winrateColor(val)
        roundRect(ctx, x, y, cellSize, cellSize, 8)
        ctx.fill()

        // Text
        ctx.fillStyle = winrateTextColor(val)
        ctx.font = "bold 11px 'Be Vietnam Pro', sans-serif"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(Math.round(val * 100) + '%', x + cellSize / 2, y + cellSize / 2)
      }
    }
  }

  // Row labels (left)
  ctx.fillStyle = 'rgba(200, 232, 255, 0.8)'
  ctx.font = "500 11px 'Be Vietnam Pro', sans-serif"
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  data.models.forEach((name, i) => {
    const y = labelMargin + i * (cellSize + gap) + cellSize / 2
    const label = name.length > 16 ? name.slice(0, 16) + '…' : name
    ctx.fillText(label, labelMargin - 12, y)
  })

  // Column labels (top, rotated)
  data.models.forEach((name, j) => {
    ctx.save()
    const x = labelMargin + j * (cellSize + gap) + cellSize / 2
    ctx.translate(x, labelMargin - 12)
    ctx.rotate(-Math.PI / 4)
    ctx.fillStyle = 'rgba(200, 232, 255, 0.8)'
    ctx.font = "500 11px 'Be Vietnam Pro', sans-serif"
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(name.length > 16 ? name.slice(0, 16) + '…' : name, 0, 0)
    ctx.restore()
  })
}

// ─── Battle Count Matrix ───

function BattleCountMatrix() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchStats('battle-count')
      .then((data) => {
        if (!data?.models?.length) { setError(true); return }
        drawBattleCountHeatmap(canvasRef.current, data)
      })
      .catch(() => setError(true))
  }, [])

  return (
    <div>
      <SectionHeader
        title="Số trận đấu theo cặp mô hình"
        subtitle="Ma trận đối xứng"
        legends={[
          { color: '#F5C800', glow: '#F5C800', label: 'Nhiều trận (>200)' },
          { color: '#1A6FCC', glow: '#1A6FCC', label: 'Ít trận (<80)' },
        ]}
      />
      <div className="flex justify-center" style={{ padding: '32px 0', overflow: 'auto' }}>
        {error ? (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Chưa có dữ liệu</p>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
    </div>
  )
}

function drawBattleCountHeatmap(
  canvas: HTMLCanvasElement | null,
  data: { models: string[]; matrix: number[][] }
) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const n = data.models.length
  const cellSize = 56
  const gap = 3
  const labelMargin = 160
  const dpr = window.devicePixelRatio || 1

  const gridW = n * cellSize + (n - 1) * gap
  const totalW = labelMargin + gridW + 20
  const totalH = labelMargin + gridW + 20

  canvas.width = totalW * dpr
  canvas.height = totalH * dpr
  canvas.style.width = `${totalW}px`
  canvas.style.height = `${totalH}px`
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, totalW, totalH)

  // Find max count
  let maxCount = 0
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (i !== j) maxCount = Math.max(maxCount, data.matrix[i][j])

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = labelMargin + j * (cellSize + gap)
      const y = labelMargin + i * (cellSize + gap)

      if (i === j) {
        ctx.fillStyle = 'rgba(21, 37, 80, 0.9)'
        roundRect(ctx, x, y, cellSize, cellSize, 8)
        ctx.fill()
      } else {
        const val = data.matrix[i][j]
        const t = maxCount > 0 ? val / maxCount : 0
        ctx.fillStyle = battleCountColor(t)
        roundRect(ctx, x, y, cellSize, cellSize, 8)
        ctx.fill()

        ctx.fillStyle = t > 0.5 ? '#FFFFFF' : 'rgba(255,255,255,0.9)'
        ctx.font = "bold 11px 'Be Vietnam Pro', sans-serif"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(val), x + cellSize / 2, y + cellSize / 2)
      }
    }
  }

  // Row labels
  ctx.fillStyle = 'rgba(200, 232, 255, 0.8)'
  ctx.font = "500 11px 'Be Vietnam Pro', sans-serif"
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  data.models.forEach((name, i) => {
    const y = labelMargin + i * (cellSize + gap) + cellSize / 2
    ctx.fillText(name.length > 16 ? name.slice(0, 16) + '…' : name, labelMargin - 12, y)
  })

  // Column labels
  data.models.forEach((name, j) => {
    ctx.save()
    const x = labelMargin + j * (cellSize + gap) + cellSize / 2
    ctx.translate(x, labelMargin - 12)
    ctx.rotate(-Math.PI / 4)
    ctx.fillStyle = 'rgba(200, 232, 255, 0.8)'
    ctx.font = "500 11px 'Be Vietnam Pro', sans-serif"
    ctx.textAlign = 'right'
    ctx.fillText(name.length > 16 ? name.slice(0, 16) + '…' : name, 0, 0)
    ctx.restore()
  })
}

// ─── Average Win Rate ───

function AvgWinRate() {
  const [data, setData] = useState<{ model: string; avg_win_rate: number; color?: string }[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchStats('avg-win-rate')
      .then((d) => {
        if (!d?.length) { setError(true); return }
        setData([...d].sort((a: { avg_win_rate: number }, b: { avg_win_rate: number }) => b.avg_win_rate - a.avg_win_rate))
      })
      .catch(() => setError(true))
  }, [])

  const maxRate = data.length > 0 ? Math.max(...data.map((d) => d.avg_win_rate)) : 1

  return (
    <div>
      <SectionHeader
        title="Tỉ lệ thắng trung bình"
        subtitle="Lấy mẫu đồng đều, không tính hòa."
      />
      <div style={{ padding: '32px 0', width: '900px', margin: '0 auto' }}>
        {error ? (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', textAlign: 'center' }}>
            Chưa có dữ liệu
          </p>
        ) : (
          <div className="flex flex-col" style={{ gap: '8px', borderRadius: '12px' }}>
            {data.map((item, idx) => {
              const pct = Math.round(item.avg_win_rate * 100)
              // Bar width proportional to max rate, container is 900px - rank area
              const barWidthPct = (item.avg_win_rate / maxRate) * 100

              return (
                <div
                  key={item.model}
                  className="flex items-center"
                  style={{
                    height: '48px',
                    padding: '8px',
                    borderRadius: '24px',
                    background: `linear-gradient(to right, rgba(21,94,239,0) 20%, #155EEF 100%)`,
                    width: `${barWidthPct}%`,
                    minWidth: '300px',
                  }}
                >
                  <div className="flex items-center gap-[8px] flex-1 min-w-0">
                    {/* Rank badge */}
                    <div
                      className="flex flex-col items-center justify-center shrink-0"
                      style={{ width: '32px', height: '32px' }}
                    >
                      {idx < 3 ? (
                        <RankBadge rank={idx + 1} />
                      ) : (
                        <span
                          style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#FFFFFF',
                            textAlign: 'center',
                            width: '100%',
                            lineHeight: '0.95',
                          }}
                        >
                          {idx + 1}
                        </span>
                      )}
                    </div>

                    {/* Model name */}
                    <span
                      className="flex-1 min-w-0 truncate"
                      style={{
                        fontFamily: "'Be Vietnam Pro', sans-serif",
                        fontSize: '12px',
                        lineHeight: '18px',
                        fontWeight: 400,
                        color: '#FFFFFF',
                      }}
                    >
                      {item.model}
                    </span>

                    {/* Percentage */}
                    <span
                      className="flex-1 min-w-0"
                      style={{
                        fontFamily: "'Be Vietnam Pro', sans-serif",
                        fontSize: '12px',
                        lineHeight: '18px',
                        fontWeight: 400,
                        color: '#FFFFFF',
                        textAlign: 'right',
                      }}
                    >
                      {pct}%
                    </span>
                  </div>

                  {/* Model logo */}
                  <div
                    className="shrink-0 flex items-center justify-center"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '16px',
                      background: '#FFFFFF',
                      padding: '4px',
                      marginLeft: '4px',
                    }}
                  >
                    {getModelAvatar(item.model) ? (
                      <img
                        src={getModelAvatar(item.model)}
                        alt=""
                        style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center"
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '12px',
                          background: item.color || '#155EEF',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#FFFFFF',
                        }}
                      >
                        {item.model[0]}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Rank badge (glassmorphism style for top 3) ───

function RankBadge({ rank }: { rank: number }) {
  const medals: Record<number, { bg: string; emoji: string }> = {
    1: { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', emoji: '🥇' },
    2: { bg: 'linear-gradient(135deg, #C0C0C0, #A0A0A0)', emoji: '🥈' },
    3: { bg: 'linear-gradient(135deg, #CD7F32, #A0522D)', emoji: '🥉' },
  }
  const medal = medals[rank]
  if (!medal) return null

  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: '32px',
        height: '32px',
        fontSize: '18px',
        lineHeight: 1,
      }}
    >
      {medal.emoji}
    </div>
  )
}

// ─── Canvas utility ───

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
