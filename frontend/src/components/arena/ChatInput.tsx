import { useState } from 'react'
import { useStore } from '../../hooks/useStore'

interface Props {
  onSubmit: (text: string) => void
}

export function ChatInput({ onSubmit }: Props) {
  const [text, setText] = useState('')
  const { turnCount, isLoading } = useStore()

  function handleSubmit() {
    const t = text.trim()
    if (!t || isLoading) return
    onSubmit(t)
    setText('')
  }

  return (
    <div className="px-5 py-3 bg-[var(--bg)] border-t border-[var(--border-light)] shrink-0">
      <div className="max-w-3xl mx-auto flex items-center gap-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-1 shadow-sm focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-light)] transition-all">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Nhập prompt tiếng Việt..."
          disabled={isLoading}
          className="flex-1 bg-transparent border-none outline-none text-sm py-2"
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading}
          className="w-9 h-9 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center text-base cursor-pointer hover:bg-[var(--accent-hover)] hover:scale-105 transition-all shrink-0 disabled:bg-[var(--bg-input)] disabled:text-[var(--text-dim)] disabled:cursor-not-allowed disabled:scale-100"
        >
          ➤
        </button>
      </div>
      {turnCount > 0 && (
        <div className="text-center text-[0.72rem] text-[var(--text-muted)] mt-1.5">
          Lượt {turnCount} · Bạn có thể tiếp tục hội thoại hoặc bỏ phiếu bất cứ lúc nào
        </div>
      )}
    </div>
  )
}
