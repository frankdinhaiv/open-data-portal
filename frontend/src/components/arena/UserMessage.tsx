import { useState } from 'react'
import copyIcon from '../../assets/icons/copy.svg'

interface Props {
  content: string
}

export function UserMessage({ content }: Props) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex justify-end items-center gap-[10px] animate-slide-up group">
      {/* Copy button - to the left of bubble, shows on hover per Figma 2:12761 */}
      <button
        onClick={handleCopy}
        className="flex items-center justify-center overflow-hidden rounded-lg bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 shrink-0"
        style={{ padding: '6px', boxShadow: '0px 1px 2px 0px rgba(16,24,40,0.05)', background: copied ? 'rgba(71, 205, 137, 0.2)' : undefined }}
        title={copied ? 'Đã sao chép!' : 'Sao chép'}
      >
        {copied ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16.6667 5L7.50001 14.1667L3.33334 10" stroke="#75E0A7" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : (
          <img src={copyIcon} alt="Copy" className="w-5 h-5" />
        )}
      </button>

      {/* Message bubble */}
      <div
        className="max-w-[600px] rounded-2xl p-4"
        style={{
          background: 'linear-gradient(to bottom, #2970FF, #194399)',
        }}
      >
        <p className="text-base text-white m-0" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 400, lineHeight: '24px' }}>
          {content}
        </p>
      </div>
    </div>
  )
}
