import promptIcon from '../../assets/decorative/prompt-icon.png'

/*
 * PromptCard — matches Figma node 2:10727 (317×92)
 *
 * Structure:
 *   Card (backdrop-blur-12, bg rgba(255,255,255,0.1), border dashed #B2CCFF, rounded-8)
 *   └── Content (flex gap-8 items-start, pl-8 pr-16 py-16)
 *       ├── Icon (24×24, image scaled 177.78% offset -38.89%)
 *       └── Text (14px Regular white, line-height 20px, flex-1)
 */

interface Props {
  text: string
  onClick: () => void
}

export function PromptCard({ text, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-start cursor-pointer transition-all hover:bg-white/15 text-left self-stretch"
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px dashed #B2CCFF',
        backdropFilter: 'blur(12px)',
        borderRadius: '8px',
        paddingLeft: '8px',
        paddingRight: '16px',
        paddingTop: '16px',
        paddingBottom: '16px',
      }}
    >
      <div className="flex items-start w-full" style={{ gap: '8px' }}>
        {/* Icon — 24×24 container with image scaled to 177.78% and offset */}
        <div
          className="relative shrink-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
          style={{ width: '24px', height: '24px' }}
        >
          <img
            src={promptIcon}
            alt=""
            style={{
              position: 'absolute',
              left: '-38.89%',
              top: '-38.89%',
              width: '177.78%',
              height: '177.78%',
              maxWidth: 'none',
            }}
          />
        </div>
        {/* Text */}
        <span
          className="flex-1"
          style={{
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontSize: '14px',
            lineHeight: '20px',
            fontWeight: 400,
            color: '#FFFFFF',
            minWidth: 0,
          }}
        >
          {text}
        </span>
      </div>
    </button>
  )
}
