import { useState } from 'react'
import { useStore } from '../../hooks/useStore'
import type { VoteChoice } from '../../types'

interface Props {
  onVote: (choice: VoteChoice) => void
  onContinue: () => void
  onDirectRate: (stars: number, tags: string[]) => void
}

const QUALITY_TAGS = ['Chính xác', 'Tự nhiên', 'Phù hợp văn hóa', 'Sáng tạo', 'Hữu ích']

export function VoteBar({ onVote, onContinue, onDirectRate }: Props) {
  const mode = useStore((s) => s.mode)
  const [stars, setStars] = useState(0)
  const [tags, setTags] = useState<string[]>([])

  function toggleTag(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  if (mode === 'direct') {
    return (
      <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-card)] animate-slide-up shrink-0">
        <div className="flex flex-col items-center gap-2 max-md:gap-3">
          <div className="text-sm font-semibold text-[var(--text-secondary)]">Đánh giá phản hồi</div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                onClick={() => setStars(n)}
                className={`text-2xl cursor-pointer transition-all ${n <= stars ? 'text-[var(--gold)]' : 'text-[var(--border)]'}`}
              >
                ★
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {QUALITY_TAGS.map((tag) => (
              <span
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all
                  ${tags.includes(tag)
                    ? 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--border-accent)]'
                    : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]'
                  }`}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => { onDirectRate(stars, tags); setStars(0); setTags([]) }}
              className="h-10 px-5 rounded-xl text-sm font-semibold bg-[var(--accent-light)] text-[var(--accent)] border border-blue-200 hover:bg-[var(--accent)] hover:text-white transition-all"
            >
              ✓ Gửi đánh giá
            </button>
            <button
              onClick={onContinue}
              className="h-10 px-5 rounded-xl text-sm font-medium text-[var(--text-muted)] border border-[var(--border-light)] hover:bg-[var(--bg-hover)] transition-all"
            >
              💬 Tiếp tục
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-card)] animate-slide-up shrink-0">
      <div className="flex items-center justify-center gap-2.5 flex-wrap max-md:flex-col">
        <button
          onClick={() => onVote('a')}
          className="h-10 px-5 rounded-xl text-sm font-semibold bg-[var(--accent-light)] text-[var(--accent)] border border-blue-200 hover:bg-[var(--accent)] hover:text-white hover:shadow-md transition-all"
        >
          👈 A tốt hơn
        </button>
        <button
          onClick={() => onVote('b')}
          className="h-10 px-5 rounded-xl text-sm font-semibold bg-[var(--orange-light)] text-[var(--orange)] border border-orange-200 hover:bg-[var(--orange)] hover:text-white hover:shadow-md transition-all"
        >
          B tốt hơn 👉
        </button>
        <button
          onClick={() => onVote('tie')}
          className="h-10 px-5 rounded-xl text-sm font-semibold bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--green)] hover:text-white hover:border-[var(--green)] transition-all"
        >
          🤝 Cả hai tốt
        </button>
        <button
          onClick={() => onVote('bad')}
          className="h-10 px-5 rounded-xl text-sm font-semibold bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--red)] hover:text-white hover:border-[var(--red)] transition-all"
        >
          👎 Cả hai tệ
        </button>
        <button
          onClick={onContinue}
          className="h-10 px-5 rounded-xl text-sm font-medium text-[var(--text-muted)] border border-[var(--border-light)] hover:bg-[var(--bg-hover)] transition-all"
        >
          💬 Tiếp tục hội thoại
        </button>
      </div>
    </div>
  )
}
