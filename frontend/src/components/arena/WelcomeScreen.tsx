import { useStore } from '../../hooks/useStore'

const PROMPTS = [
  { cat: 'Kiến thức', text: 'Giải thích blockchain cho học sinh lớp 10' },
  { cat: 'Sáng tạo', text: 'Viết bài thơ lục bát về mùa xuân Hà Nội' },
  { cat: 'Suy luận', text: 'Tại sao kinh tế Việt Nam tăng trưởng nhanh hơn dự kiến?' },
  { cat: 'Lập trình', text: 'Viết hàm Python sắp xếp tên tiếng Việt theo alphabet' },
  { cat: 'Văn hóa VN', text: 'So sánh phở Hà Nội và phở Sài Gòn' },
  { cat: 'Nghề nghiệp', text: 'Viết email xin nghỉ phép gửi sếp bằng giọng lịch sự' },
]

interface Props {
  onSubmitPrompt: (text: string) => void
}

export function WelcomeScreen({ onSubmitPrompt }: Props) {
  const mode = useStore((s) => s.mode)

  const icon = mode === 'battle' ? '⚔️' : mode === 'sbs' ? '⚖️' : '💬'
  const title = mode === 'battle' ? 'Đấu Trường GenAI Việt Nam' : mode === 'sbs' ? 'So Sánh Song Song' : 'Trò Chuyện Trực Tiếp'
  const desc = mode === 'battle'
    ? 'So sánh và đánh giá các mô hình AI trên tiếng Việt. Nhập prompt hoặc chọn gợi ý bên dưới.'
    : mode === 'sbs'
      ? 'Chọn 2 mô hình cụ thể và so sánh câu trả lời.'
      : 'Chat với 1 mô hình và đánh giá bằng sao.'

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 animate-fade-in">
      <div className="text-5xl mb-4 drop-shadow-lg">{icon}</div>
      <h2 className="text-2xl font-bold tracking-tight mb-1.5">{title}</h2>
      <p className="text-[var(--text-secondary)] text-sm max-w-md text-center mb-7">{desc}</p>
      <div className="grid grid-cols-3 max-md:grid-cols-2 gap-2.5 max-w-2xl w-full">
        {PROMPTS.map((p) => (
          <div
            key={p.text}
            onClick={() => onSubmitPrompt(p.text)}
            className="px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl cursor-pointer text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text)] hover:bg-[var(--accent-light)] hover:-translate-y-0.5 hover:shadow-sm transition-all text-left leading-relaxed"
          >
            <div className="text-[0.65rem] uppercase tracking-wider text-[var(--text-muted)] mb-1 font-semibold">{p.cat}</div>
            {p.text}
          </div>
        ))}
      </div>
    </div>
  )
}
