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
  /** The choice the user already voted for — keeps that button highlighted after voting */
  votedChoice?: VoteChoice
  /** Model names for SBS mode labels (Figma: "GPT-4.1 tốt hơn" / "DeepSeek V3 tốt hơn") */
  modelAName?: string
  modelBName?: string
}

export function VoteBar({ onVote, selectingChoice, onSelectingChange, votedChoice, modelAName, modelBName }: Props) {
  const mode = useStore((s) => s.mode)

  // Direct mode: rating is now inline inside ResponsePanel — VoteBar does not render
  if (mode === 'direct') {
    return null
  }

  // Battle/SBS vote buttons
  const isBattle = mode === 'battle'
  const leftLabel = isBattle ? 'Bên trái tốt hơn' : (modelAName ? `${modelAName} tốt hơn` : 'Mô hình A tốt hơn')
  const rightLabel = isBattle ? 'Bên phải tốt hơn' : (modelBName ? `${modelBName} tốt hơn` : 'Mô hình B tốt hơn')

  // Determine the highlight color for the selecting/voted state
  function getButtonStyle(choice: VoteChoice) {
    const isSelecting = selectingChoice === choice
    const isVoted = votedChoice === choice
    const hasVoted = !!votedChoice
    const isActive = isSelecting || isVoted

    if (!isActive) {
      // After voting, non-voted buttons are dimmed
      return {
        border: '1px solid rgba(255,255,255,0.4)',
        color: 'rgba(255,255,255,0.4)',
        opacity: hasVoted ? 0.5 : 1,
      }
    }
    // 'bad' uses error color, all others use success color
    if (choice === 'bad') {
      return {
        border: '1px solid #FDA29B',
        color: '#FDA29B',
        opacity: 1,
      }
    }
    return {
      border: '1px solid #75E0A7',
      color: '#75E0A7',
      opacity: 1,
    }
  }

  // Figma node 2:11857: glass wrapper with 4 buttons inside
  const hasVoted = !!votedChoice
  const btnClass = `flex items-center gap-1 bg-transparent transition-all ${hasVoted ? 'cursor-default' : 'cursor-pointer hover:bg-white/10'}`

  return (
    <div className="py-4 animate-slide-up shrink-0">
      <div
        className="flex items-center justify-center gap-2 mx-auto w-fit"
        style={{
          padding: '8px',
          borderRadius: '16px',
          background: 'rgba(239, 244, 255, 0.1)',
          border: '1px solid rgba(209, 224, 255, 0.1)',
          backdropFilter: 'blur(4px)',
          boxShadow: '0px 1px 3px 0px rgba(16, 24, 40, 0.1), 0px 1px 2px 0px rgba(16, 24, 40, 0.06)',
        }}
      >
        <button
          onClick={() => !hasVoted && onVote('a')}
          onMouseEnter={() => !hasVoted && onSelectingChange?.('a')}
          onMouseLeave={() => !hasVoted && onSelectingChange?.(null)}
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
          onClick={() => !hasVoted && onVote('tie')}
          onMouseEnter={() => !hasVoted && onSelectingChange?.('tie')}
          onMouseLeave={() => !hasVoted && onSelectingChange?.(null)}
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
          onClick={() => !hasVoted && onVote('bad')}
          onMouseEnter={() => !hasVoted && onSelectingChange?.('bad')}
          onMouseLeave={() => !hasVoted && onSelectingChange?.(null)}
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
          onClick={() => !hasVoted && onVote('b')}
          onMouseEnter={() => !hasVoted && onSelectingChange?.('b')}
          onMouseLeave={() => !hasVoted && onSelectingChange?.(null)}
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
