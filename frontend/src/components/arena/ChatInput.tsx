import { useState } from 'react'
import { useStore } from '../../hooks/useStore'

import plusIcon from '../../assets/icons/plus.svg'
import imageUpload from '../../assets/icons/image-upload.svg'
import microphoneIcon from '../../assets/icons/microphone.svg'
import arrowUp from '../../assets/icons/arrow-up.svg'

/*
 * ChatInput — matches Figma node 2:10714 (Chatbox, 600×104)
 *
 * Structure:
 *   Chatbox (600×104, shadow-lg, isolation: isolate)
 *   ├── Ellipse 4 (absolute, left:16 right:16 top:-8, h:48)
 *   │   background: linear-gradient(90deg, #31C7DB → #349CF4 → #B68EFF → #349CF4 → #31C7DB)
 *   │   filter: blur(6px)
 *   │   z-index: 0
 *   └── Frame 1686560538 (600×104, p:16, gap:16, z-index:1)
 *       ├── Text input (568×24, 16px Regular, color: rgba(255,255,255,0.5))
 *       └── Button row (568×32, justify-between)
 *           ├── Left (gap:8): + button (32×32, border solid white) + image button (32×32, no border)
 *           └── Right (gap:8): mic button (32×32, no border) + send button (32×32, glass bg)
 */

interface Props {
  onSubmit: (text: string) => void
  placeholder?: string
  autoFocus?: boolean
}

export function ChatInput({ onSubmit, placeholder, autoFocus }: Props) {
  const [text, setText] = useState('')
  const { isLoading } = useStore()

  function handleSubmit() {
    const t = text.trim()
    if (!t || isLoading) return
    onSubmit(t)
    setText('')
  }

  return (
    <div
      className="relative w-full"
      style={{
        height: '104px',
        isolation: 'isolate',
        boxShadow: '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',
      }}
    >
      {/* Ellipse glow — CSS gradient, animates during loading */}
      <div
        aria-hidden="true"
        className={isLoading ? 'animate-glow-shimmer' : ''}
        style={{
          position: 'absolute',
          height: '48px',
          left: '16px',
          right: '16px',
          top: '-8px',
          background: 'linear-gradient(90deg, #31C7DB 0%, #349CF4 25.48%, #B68EFF 50%, #349CF4 75.48%, #31C7DB 100%)',
          backgroundSize: isLoading ? '200% 100%' : '100% 100%',
          filter: 'blur(6px)',
          zIndex: 0,
          borderRadius: '50%',
          opacity: isLoading ? 1 : 0.6,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Input frame */}
      <div
        style={{
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '16px',
          gap: '16px',
          width: '100%',
          height: '104px',
          background: 'linear-gradient(0deg, rgba(255,255,255,0.25), rgba(255,255,255,0.25)), #002266',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Text input row */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '24px' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder={placeholder || 'Bạn muốn hỏi gì hôm nay?'}
            disabled={isLoading}
            autoFocus={autoFocus}
            rows={1}
            style={{
              width: '100%',
              height: '24px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: "'Be Vietnam Pro', sans-serif",
              fontSize: '16px',
              lineHeight: '24px',
              fontWeight: 400,
              color: '#FFFFFF',
              padding: 0,
              margin: 0,
            }}
            className="placeholder:text-white/50"
          />
        </div>

        {/* Button row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            height: '32px',
            gap: '8px',
          }}
        >
          {/* Left buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '72px', height: '32px' }}>
            {/* + button — white border */}
            <button
              className="flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all"
              style={{
                width: '32px',
                height: '32px',
                padding: '6px',
                border: '1px solid #FFFFFF',
                borderRadius: '8px',
                background: 'transparent',
                filter: 'drop-shadow(0px 1px 2px rgba(16, 24, 40, 0.05))',
              }}
            >
              <img src={plusIcon} alt="Add" style={{ width: '20px', height: '20px' }} />
            </button>
            {/* Image button — no border */}
            <button
              className="flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all"
              style={{
                width: '32px',
                height: '32px',
                padding: '6px',
                border: 'none',
                borderRadius: '8px',
                background: 'transparent',
                filter: 'drop-shadow(0px 1px 2px rgba(16, 24, 40, 0.05))',
              }}
            >
              <img src={imageUpload} alt="Upload image" style={{ width: '20px', height: '20px' }} />
            </button>
          </div>

          {/* Right buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', width: '72px', height: '32px' }}>
            {/* Mic button — no border */}
            <button
              className="flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all"
              style={{
                width: '32px',
                height: '32px',
                padding: '6px',
                border: 'none',
                borderRadius: '8px',
                background: 'transparent',
                filter: 'drop-shadow(0px 1px 2px rgba(16, 24, 40, 0.05))',
              }}
            >
              <img src={microphoneIcon} alt="Microphone" style={{ width: '14px', height: '20px' }} />
            </button>
            {/* Send button — glass bg */}
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || isLoading}
              className="flex items-center justify-center cursor-pointer hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                width: '32px',
                height: '32px',
                padding: '6px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.05)',
              }}
            >
              <img src={arrowUp} alt="Send" style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
