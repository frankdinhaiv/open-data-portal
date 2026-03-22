import copyIcon from '../../assets/icons/copy.svg'

interface Props {
  content: string
}

export function UserMessage({ content }: Props) {
  function handleCopy() {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="flex justify-end animate-slide-up">
      <div className="relative max-w-[600px] group">
        {/* Copy button - shows on hover */}
        <button
          onClick={handleCopy}
          className="absolute -top-2 -right-2 w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20"
        >
          <img src={copyIcon} alt="Copy" className="w-3.5 h-3.5" />
        </button>

        {/* Message bubble */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(to bottom, #2970FF, #194399)',
          }}
        >
          <p className="text-base text-white m-0" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 400, lineHeight: '24px' }}>
            {content}
          </p>
        </div>
      </div>
    </div>
  )
}
