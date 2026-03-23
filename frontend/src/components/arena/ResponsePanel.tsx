import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Model } from '../../types'

import refreshIcon from '../../assets/icons/refresh.svg'
import copyIcon from '../../assets/icons/copy.svg'
import expandIcon from '../../assets/icons/expand.svg'
import starFilledIcon from '../../assets/icons/star-filled.svg'

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
  /** If true, animate content character-by-character (streaming simulation) */
  streaming?: boolean
}

/**
 * Hook that progressively reveals `fullText` to simulate LLM streaming.
 * Reveals ~15–30 chars per tick every `speed` ms.
 * Returns `{ displayed, isStreaming }`.
 */
function useStreamingText(fullText: string, speed: number = 30, enabled: boolean = false) {
  const [displayed, setDisplayed] = useState(enabled ? '' : fullText)
  const [isStreaming, setIsStreaming] = useState(enabled && fullText.length > 0)

  useEffect(() => {
    if (!enabled || !fullText) {
      setDisplayed(fullText)
      setIsStreaming(false)
      return
    }
    setDisplayed('')
    setIsStreaming(true)
    let i = 0
    const interval = setInterval(() => {
      const chunkSize = 15 + Math.floor(Math.random() * 15)
      i = Math.min(i + chunkSize, fullText.length)
      setDisplayed(fullText.slice(0, i))
      if (i >= fullText.length) {
        setIsStreaming(false)
        clearInterval(interval)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [fullText, speed, enabled])

  return { displayed, isStreaming }
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
    // Handshake icon (same path data as handshake.svg asset)
    return (
      <svg width="20" height="20" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.93334 13.1946L10.7333 14.9604C10.9106 15.1343 11.1211 15.2723 11.3527 15.3664C11.5844 15.4605 11.8326 15.509 12.0833 15.509C12.3341 15.509 12.5823 15.4605 12.814 15.3664C13.0456 15.2723 13.2561 15.1343 13.4333 14.9604C13.6106 14.7865 13.7513 14.58 13.8472 14.3528C13.9431 14.1255 13.9925 13.882 13.9925 13.636C13.9925 13.3901 13.9431 13.1465 13.8472 12.9193C13.7513 12.692 13.6106 12.4856 13.4333 12.3116M11.6333 10.5458L13.8833 12.7531C14.2414 13.1044 14.727 13.3017 15.2333 13.3017C15.7397 13.3017 16.2253 13.1044 16.5833 12.7531C16.9414 12.4019 17.1425 11.9255 17.1425 11.4287C17.1425 10.932 16.9414 10.4556 16.5833 10.1044L13.0913 6.67867C12.5851 6.18265 11.8988 5.90403 11.1833 5.90403C10.4678 5.90403 9.78157 6.18265 9.27532 6.67867L8.48332 7.45563C8.12528 7.80688 7.63967 8.00421 7.13332 8.00421C6.62697 8.00421 6.14136 7.80688 5.78332 7.45563C5.42528 7.10439 5.22413 6.628 5.22413 6.13126C5.22413 5.63453 5.42528 5.15814 5.78332 4.80689L8.31232 2.3259C9.13334 1.52258 10.204 1.01085 11.3549 0.871718C12.5058 0.732589 13.6711 0.974011 14.6663 1.55777L15.0893 1.80498C15.4725 2.03188 15.9282 2.11057 16.3673 2.02571L17.9333 1.71669M17.9333 0.833763L18.8333 10.5458H17.0333M1.73334 0.833763L0.833338 10.5458L6.68334 16.2848C7.04138 16.636 7.52699 16.8333 8.03334 16.8333C8.53969 16.8333 9.0253 16.636 9.38334 16.2848C9.74138 15.9335 9.94253 15.4571 9.94253 14.9604C9.94253 14.4637 9.74138 13.9873 9.38334 13.636M1.73334 1.71668H8.93334" stroke="#75E0A7" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
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

export function ResponsePanel({ content, model, isBattle, label, visualState = 'default', revealModel, onDirectRate, onRegenerate, streaming = false }: Props) {
  const avatar = getAvatar(model.id)
  const showRealName = revealModel || !isBattle
  const displayName = showRealName ? model.name : (label || 'Model')

  // Streaming simulation
  const { displayed: streamedContent, isStreaming } = useStreamingText(content, 30, streaming)

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

  // While streaming, hide action buttons
  const showActions = !isStreaming

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

          {/* Action buttons: shown in default/loser state, hidden while streaming */}
          {(visualState === 'default' || visualState === 'loser') && showActions && (
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
        {formatResponse(streamedContent)}
        {/* Blinking cursor while streaming */}
        {isStreaming && (
          <span
            className="inline-block w-[2px] h-[1em] ml-[1px] align-middle"
            style={{
              background: 'rgba(255,255,255,0.8)',
              animation: 'blink 0.8s step-end infinite',
            }}
          />
        )}
      </div>

      {/* Rating footer — direct mode only (Figma: Frame 1686560582 / 2:11962) */}
      {showRatingFooter && (
        <div
          className="flex flex-col items-start p-4 shrink-0 w-full relative"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            gap: stars > 0 ? '16px' : '0',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.1) 100%), linear-gradient(90deg, rgb(0,34,102) 0%, rgb(0,34,102) 100%)',
            zIndex: 1,
          }}
        >
          {/* Stars row — label left, 5 stars right, gap-[8px] between stars per Figma 2:11963 */}
          <div className="flex items-center justify-between w-full">
            <span
              className="text-sm font-medium text-white whitespace-nowrap"
              style={{ opacity: 0.75, lineHeight: '20px' }}
            >
              Đánh giá phản hồi này
            </span>
            {/* Five filled stars; unselected at opacity-10, selected at full opacity — Figma 2:11965 */}
            <div className="flex items-center" style={{ gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  onMouseEnter={() => setHoverStar(n)}
                  onMouseLeave={() => setHoverStar(0)}
                  onClick={() => setStars(n)}
                  className="cursor-pointer transition-all select-none relative shrink-0"
                  style={{ width: '32px', height: '32px', opacity: n <= displayStars ? 1 : 0.1 }}
                >
                  {/* Single filled star SVG at all times — Figma uses opacity for selected/unselected state */}
                  <img
                    src={starFilledIcon}
                    alt=""
                    className="absolute block"
                    style={{ inset: '6.79% 6.56% 9.99% 6.56%', width: 'auto', height: 'auto', maxWidth: 'none' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quality tags — visible once a star is selected, Figma 2:12182 */}
          {stars > 0 && (
            <div className="flex flex-wrap items-start" style={{ gap: '10px' }}>
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

          {/* Submit button — Figma 2:12187: bg #155EEF, px-[10px] py-[6px], rounded-[8px] */}
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

      {/* Fullscreen side panel — rendered via portal at document.body to escape overflow:hidden */}
      {fullscreen && createPortal(
        <>
          {/* Dark overlay — click to close */}
          <div
            className="fixed inset-0 animate-fade-in"
            style={{ zIndex: 999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={() => setFullscreen(false)}
          />
          {/* Side panel */}
          <div
            className="fixed top-0 right-0 bottom-0 flex flex-col animate-slide-in-right"
            style={{
              zIndex: 1000,
              width: '50vw',
              minWidth: '400px',
              maxWidth: '720px',
              background: 'rgba(0, 20, 70, 0.75)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderLeft: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
            }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
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
                  title={copied ? 'Đã sao chép!' : 'Sao chép'}
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
                  title="Đóng"
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-transparent border-none text-white cursor-pointer hover:bg-white/10 transition-all"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5L15 15" stroke="white" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
            {/* Panel body */}
            <div className="px-6 py-6 text-base leading-7 text-white overflow-y-auto flex-1">
              {formatResponse(content)}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
