import { useStore } from '../../hooks/useStore'
import type { VoteChoice } from '../../types'

import arrowLeft from '../../assets/icons/arrow-left.svg'
import arrowRightVote from '../../assets/icons/arrow-right-vote.svg'
import handshake from '../../assets/icons/handshake.svg'
import thumbsDown from '../../assets/icons/thumbs-down.svg'

interface Props {
  onVote: (choice: VoteChoice) => void
  onContinue: () => void
  onDirectRate: (stars: number, tags: string[]) => void
  /** Currently hovered/selecting vote choice (for visual highlighting) */
  selectingChoice?: VoteChoice | null
  /** Called when the user hovers/unhovers a vote button */
  onSelectingChange?: (choice: VoteChoice | null) => void
  /** Model names for SBS mode labels (Figma: "GPT-4.1 tốt hơn" / "DeepSeek V3 tốt hơn") */
  modelAName?: string
  modelBName?: string
}

export function VoteBar({ onVote, selectingChoice, onSelectingChange, modelAName, modelBName }: Props) {
  const mode = useStore((s) => s.mode)

  // Direct mode: rating is now inline inside ResponsePanel — VoteBar does not render
  if (mode === 'direct') {
    return null
  }

  // Battle/SBS vote buttons
  const isBattle = mode === 'battle'
  const leftLabel = isBattle ? 'Bên trái tốt hơn' : (modelAName ? `${modelAName} tốt hơn` : 'Mô hình A tốt hơn')
  const rightLabel = isBattle ? 'Bên phải tốt hơn' : (modelBName ? `${modelBName} tốt hơn` : 'Mô hình B tốt hơn')

  // Determine the highlight color for the selecting state
  function getButtonStyle(choice: VoteChoice) {
    const isSelecting = selectingChoice === choice
    if (!isSelecting) {
      return {
        border: '1px solid #FFFFFF',
        color: '#FFFFFF',
      }
    }
    // 'bad' uses error color, all others use success color
    if (choice === 'bad') {
      return {
        border: '1px solid #FDA29B',
        color: '#FDA29B',
      }
    }
    return {
      border: '1px solid #75E0A7',
      color: '#75E0A7',
    }
  }

  // Figma: 4 buttons in a row, no wrapping glass container
  // Each button: border-white, rounded-8, px-10 py-6, gap-4, shadow-xs
  const btnClass = "flex items-center gap-1 bg-transparent cursor-pointer hover:bg-white/10 transition-all"

  return (
    <div className="py-4 animate-slide-up shrink-0">
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => onVote('a')}
          onMouseEnter={() => onSelectingChange?.('a')}
          onMouseLeave={() => onSelectingChange?.(null)}
          className={btnClass}
          style={{
            ...getButtonStyle('a'),
            padding: '6px 10px',
            borderRadius: '8px',
            gap: '4px',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: "'Be Vietnam Pro', sans-serif",
            lineHeight: '20px',
            boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
          }}
        >
          <img src={arrowLeft} alt="" style={{ width: '20px', height: '20px' }} />
          <span>{leftLabel}</span>
        </button>
        <button
          onClick={() => onVote('tie')}
          onMouseEnter={() => onSelectingChange?.('tie')}
          onMouseLeave={() => onSelectingChange?.(null)}
          className={btnClass}
          style={{
            ...getButtonStyle('tie'),
            padding: '6px 10px',
            borderRadius: '8px',
            gap: '4px',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: "'Be Vietnam Pro', sans-serif",
            lineHeight: '20px',
            boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
          }}
        >
          <img src={handshake} alt="" style={{ width: '20px', height: '20px' }} />
          <span>Hoà</span>
        </button>
        <button
          onClick={() => onVote('bad')}
          onMouseEnter={() => onSelectingChange?.('bad')}
          onMouseLeave={() => onSelectingChange?.(null)}
          className={btnClass}
          style={{
            ...getButtonStyle('bad'),
            padding: '6px 10px',
            borderRadius: '8px',
            gap: '4px',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: "'Be Vietnam Pro', sans-serif",
            lineHeight: '20px',
            boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
          }}
        >
          <img src={thumbsDown} alt="" style={{ width: '20px', height: '20px' }} />
          <span>Cả hai đều tệ</span>
        </button>
        <button
          onClick={() => onVote('b')}
          onMouseEnter={() => onSelectingChange?.('b')}
          onMouseLeave={() => onSelectingChange?.(null)}
          className={btnClass}
          style={{
            ...getButtonStyle('b'),
            padding: '6px 10px',
            borderRadius: '8px',
            gap: '4px',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: "'Be Vietnam Pro', sans-serif",
            lineHeight: '20px',
            boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
          }}
        >
          <span>{rightLabel}</span>
          <img src={arrowRightVote} alt="" style={{ width: '20px', height: '20px' }} />
        </button>
      </div>
    </div>
  )
}
