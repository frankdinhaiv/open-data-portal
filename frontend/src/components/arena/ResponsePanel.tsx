import { useState } from 'react'
import type { Model } from '../../types'

import refreshIcon from '../../assets/icons/refresh.svg'
import copyIcon from '../../assets/icons/copy.svg'
import expandIcon from '../../assets/icons/expand.svg'
import starFilledIcon from '../../assets/icons/star-filled.svg'
import starEmptyIcon from '../../assets/icons/star-empty.svg'

import gptAvatar from '../../assets/models/gpt.png'
import deepseekAvatar from '../../assets/models/deepseek.png'

const MODEL_AVATARS: Record<string, string> = {
  'gpt': gptAvatar,
  'deepseek': deepseekAvatar,
}

/**
 * Visual state for the response panel.
 * - 'default': normal glass card
 * - 'winner': green border (#47CD89), green model name (#75E0A7), trophy icon
 * - 'loser': dimmed via opacity on parent
 * - 'tie-good': green border (#47CD89), green model name (#75E0A7), handshake icon
 * - 'tie-bad': red border (#F97066), red model name (#FDA29B), thumbs-down icon
 */
export type PanelVisualState = 'default' | 'winner' | 'loser' | 'tie-good' | 'tie-bad'

const QUALITY_TAGS = ['Chính xác', 'Tự nhiên', 'Phù hợp văn hoá', 'Hữu ích']

interface Props {
  content: string
  model: Model
  isBattle: boolean
  label?: string  // "Model A" or "Model B" for battle mode
  visualState?: PanelVisualState
  /** If true, show model name even in battle mode (for post-vote reveal) */
  revealModel?: boolean
  /** Called when user submits inline star rating (direct mode only) */
  onDirectRate?: (stars: number, tags: string[]) => void
  /** Called when user clicks re-generate */
  onRegenerate?: () => void
}

function getAvatar(modelId: string): string | undefined {
  const key = Object.keys(MODEL_AVATARS).find((k) => modelId.toLowerCase().includes(k))
  return key ? MODEL_AVATARS[key] : undefined
}

function formatResponse(text: string) {
  return text.split('\n').map((line, i) => {
    const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    if (line.match(/^\d+\./)) return <p key={i} className="ml-3 mb-2" dangerouslySetInnerHTML={{ __html: formatted }} />
    if (line.startsWith('```')) return <pre key={i} className="bg-white/5 rounded-lg p-3 text-xs overflow-x-auto my-2 text-white/90">{line.replace(/```\w*/, '')}</pre>
    return line ? <p key={i} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{ __html: formatted }} /> : null
  })
}

/** Get the border color based on visual state */
function getBorderColor(state: PanelVisualState): string {
  switch (state) {
    case 'winner':
    case 'tie-good':
      return '#47CD89' // Success/400
    case 'tie-bad':
      return '#F97066' // Error/400
    default:
      return 'rgba(255, 255, 255, 0.1)'
  }
}

/** Get the model name color based on visual state */
function getNameColor(state: PanelVisualState): string {
  switch (state) {
    case 'winner':
    case 'tie-good':
      return '#75E0A7' // Success/300
    case 'tie-bad':
      return '#FDA29B' // Error/300
    default:
      return '#FFFFFF'
  }
}

/** Get the status icon SVG for the header based on visual state */
function StatusIcon({ state }: { state: PanelVisualState }) {
  if (state === 'winner') {
    // Trophy icon
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.25 17.5H13.75M10 14.1667V17.5M13.3333 2.5H15C15.9205 2.5 16.667 3.24646 16.667 4.16667V5C16.667 6.84095 15.1746 8.33333 13.3333 8.33333M6.66667 2.5H5C4.07953 2.5 3.33333 3.24646 3.33333 4.16667V5C3.33333 6.84095 4.82572 8.33333 6.66667 8.33333M6.66667 2.5H13.3333V8.33333C13.3333 11.0948 11.0948 13.3333 8.33333 13.3333H11.6667C8.90524 13.3333 6.66667 11.0948 6.66667 8.33333V2.5Z" stroke="#75E0A7" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  if (state === 'tie-good') {
    // Handshake icon
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.5 10L9.16667 11.6667L12.5 8.33333M17.5 10C17.5 14.1421 14.1421 17.5 10 17.5C5.85786 17.5 2.5 14.1421 2.5 10C2.5 5.85786 5.85786 2.5 10 2.5C14.1421 2.5 17.5 5.85786 17.5 10Z" stroke="#75E0A7" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  if (state === 'tie-bad') {
    // Thumbs-down icon
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.3333 2.5V10.8333M17.5 8.33333V4.16667C17.5 3.24619 16.7538 2.5 15.8333 2.5H6.42685C5.64952 2.5 4.97547 3.03598 4.79866 3.79318L3.33333 10C3.33333 10.9205 4.07953 11.6667 5 11.6667H8.33333L7.5 15C7.5 15.9205 8.24619 16.6667 9.16667 16.6667L13.3333 10.8333" stroke="#FDA29B" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  return null
}

export function ResponsePanel({ content, model, isBattle, label, visualState = 'default', revealModel, onDirectRate, onRegenerate }: Props) {
  const avatar = getAvatar(model.id)
  const showRealName = revealModel || !isBattle
  const displayName = showRealName ? model.name : (label || 'Model')

  // Inline rating state (direct mode only)
  const [stars, setStars] = useState(0)
  const [hoverStar, setHoverStar] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  // Copy feedback
  const [copied, setCopied] = useState(false)
  // Fullscreen modal
  const [fullscreen, setFullscreen] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function toggleTag(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  const borderColor = getBorderColor(visualState)
  const nameColor = getNameColor(visualState)

  // Rating footer shown ONLY when the onDirectRate prop is explicitly provided.
  // Figma Screen 6 (Direct) embeds stars in the panel; SBS/Battle screens do NOT.
  // Do NOT change this to !isBattle — SBS panels have isBattle=false but no stars.
  const showRatingFooter = !!onDirectRate
  const displayStars = hoverStar || stars

  return (
    <div
      className="flex-1 max-w-[600px] rounded-lg overflow-hidden flex flex-col"
      style={{
        backgroundImage: 'linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.1) 100%), linear-gradient(90deg, rgb(0, 34, 102) 0%, rgb(0, 34, 102) 100%)',
        border: `1px solid ${borderColor}`,
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2 flex-1">
          {/* In battle mode before vote: show dashed circle placeholder */}
          {isBattle && !revealModel ? (
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ border: '1.5px dashed rgba(255,255,255,0.5)' }} />
          ) : avatar ? (
            <div className="w-6 h-6 rounded-xl bg-white flex items-center justify-center overflow-hidden p-[3px]">
              <img src={avatar} alt="" className="w-[18px] h-[18px] object-contain" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: model.color || '#6585C5' }}>
              <span className="text-xs font-bold text-white">{displayName[0]}</span>
            </div>
          )}
          <span className="text-base font-medium" style={{ color: nameColor }}>{displayName}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status icon for selecting/voted states */}
          {visualState !== 'default' && visualState !== 'loser' && (
            <div
              className="flex items-center justify-center overflow-clip rounded-lg"
              style={{ padding: '6px', boxShadow: '0px 1px 2px 0px rgba(16,24,40,0.05)' }}
            >
              <StatusIcon state={visualState} />
            </div>
          )}

          {/* Action buttons only shown in default/loser state */}
          {(visualState === 'default' || visualState === 'loser') && (
            <>
              <button
                onClick={onRegenerate}
                title="Tạo lại phản hồi"
                className="flex items-center justify-center overflow-hidden rounded-lg bg-transparent border-none cursor-pointer hover:bg-white/10 transition-all"
                style={{ padding: '6px', boxShadow: '0px 1px 2px 0px rgba(16,24,40,0.05)' }}
              >
                <img src={refreshIcon} alt="Refresh" className="w-5 h-5" />
              </button>
              <button
                onClick={handleCopy}
                title={copied ? 'Đã sao chép!' : 'Sao chép'}
                className="flex items-center justify-center overflow-hidden rounded-lg bg-transparent border-none cursor-pointer hover:bg-white/10 transition-all"
                style={{ padding: '6px', boxShadow: '0px 1px 2px 0px rgba(16,24,40,0.05)', background: copied ? 'rgba(71, 205, 137, 0.2)' : undefined }}
              >
                {copied ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16.6667 5L7.50001 14.1667L3.33334 10" stroke="#75E0A7" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <img src={copyIcon} alt="Copy" className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setFullscreen(true)}
                title="Xem toàn màn hình"
                className="flex items-center justify-center overflow-hidden rounded-lg bg-transparent border-none cursor-pointer hover:bg-white/10 transition-all"
                style={{ padding: '6px', boxShadow: '0px 1px 2px 0px rgba(16,24,40,0.05)' }}
              >
                <img src={expandIcon} alt="Expand" className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4 text-base leading-6 text-white max-h-96 overflow-y-auto">
        {formatResponse(content)}
      </div>

      {/* Rating footer — direct mode only (Figma: Frame 1686560582 / 2:11962) */}
      {showRatingFooter && (
        <div
          className="flex flex-col items-start p-4 shrink-0 w-full"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)', gap: stars > 0 ? '16px' : '0' }}
        >
          {/* Stars row */}
          <div className="flex items-center justify-between w-full">
            <span
              className="text-sm font-medium text-white whitespace-nowrap"
              style={{ opacity: 0.75, lineHeight: '20px' }}
            >
              Đánh giá phản hồi này
            </span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  onMouseEnter={() => setHoverStar(n)}
                  onMouseLeave={() => setHoverStar(0)}
                  onClick={() => setStars(n)}
                  className="cursor-pointer transition-all select-none relative shrink-0"
                  style={{ width: '32px', height: '32px', opacity: n <= displayStars ? 1 : 0.1 }}
                >
                  <img
                    src={n <= displayStars ? starFilledIcon : starEmptyIcon}
                    alt=""
                    className="absolute block"
                    style={{ inset: '6.79% 6.56% 9.99% 6.56%', width: 'auto', height: 'auto', maxWidth: 'none' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quality tags — visible once a star is selected */}
          {stars > 0 && (
            <div className="flex flex-wrap gap-[10px] items-start">
              {QUALITY_TAGS.map((tag) => (
                <span
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="cursor-pointer transition-all text-sm font-medium text-center whitespace-nowrap"
                  style={tags.includes(tag)
                    ? {
                        background: '#ECFDF3',
                        color: '#067647',
                        border: '1px solid #ABEFC6',
                        borderRadius: '16px',
                        padding: '2px 10px',
                        lineHeight: '20px',
                      }
                    : {
                        background: 'transparent',
                        color: '#FFFFFF',
                        border: '1.5px solid #FFFFFF',
                        borderRadius: '16px',
                        padding: '2px 10px',
                        lineHeight: '20px',
                      }
                  }
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Submit button — visible once a star is selected */}
          {stars > 0 && onDirectRate && (
            <button
              onClick={() => { onDirectRate(stars, tags); setStars(0); setTags([]) }}
              className="text-sm font-semibold text-white cursor-pointer transition-all border-none"
              style={{
                background: '#155EEF',
                borderRadius: '8px',
                padding: '6px 10px',
                lineHeight: '20px',
                boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
              }}
            >
              Lưu đánh giá
            </button>
          )}
        </div>
      )}

      {/* Fullscreen modal */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setFullscreen(false)}
        >
          <div
            className="w-[90vw] max-w-[900px] max-h-[85vh] rounded-xl overflow-hidden flex flex-col"
            style={{
              backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.1) 100%), linear-gradient(90deg, rgb(0,34,102) 0%, rgb(0,34,102) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fullscreen header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center gap-3">
                {avatar ? (
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center overflow-hidden p-1">
                    <img src={avatar} alt="" className="w-6 h-6 object-contain" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: model.color || '#6585C5' }}>
                    <span className="text-sm font-bold text-white">{displayName[0]}</span>
                  </div>
                )}
                <span className="text-lg font-semibold text-white">{displayName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-transparent border border-white/20 text-white text-sm cursor-pointer hover:bg-white/10 transition-all"
                >
                  {copied ? (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M16.6667 5L7.50001 14.1667L3.33334 10" stroke="#75E0A7" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <img src={copyIcon} alt="" className="w-4 h-4" />
                  )}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
                <button
                  onClick={() => setFullscreen(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-transparent border-none text-white cursor-pointer hover:bg-white/10 transition-all"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5L15 15" stroke="white" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
            {/* Fullscreen body */}
            <div className="px-6 py-6 text-base leading-7 text-white overflow-y-auto flex-1">
              {formatResponse(content)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
