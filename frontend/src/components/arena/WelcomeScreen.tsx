import { ChatInput } from './ChatInput'
import { PromptCard } from './PromptCard'
import { useBreakpoint } from '../layout/Topbar'

const PROMPT_SUGGESTIONS = [
  'Viết một đoạn thơ ngắn (4 câu) theo phong cách lục bát, chủ đề: tình yêu quê hương.',
  'Giải thích vì sao cầu vồng thường xuất hiện sau cơn mưa bằng 2–3 câu, dùng ngôn ngữ rõ ràng, dễ hiểu.',
  'Tóm tắt tác phẩm Truyện Kiều của Nguyễn Du và phân loại thể loại văn học của tác phẩm này.',
]

interface Props {
  onSubmitPrompt: (text: string) => void
}

export function WelcomeScreen({ onSubmitPrompt }: Props) {
  const bp = useBreakpoint()
  const isMobile = bp === 'mobile'
  const isTablet = bp === 'tablet'

  return (
    <div
      className="flex-1 flex flex-col items-center animate-fade-in relative"
      style={{ paddingTop: isMobile ? '48px' : isTablet ? '80px' : '113px' }}
    >
      {/* Heading group */}
      <div className="flex flex-col items-center w-full" style={{ gap: '4px', padding: isMobile ? '0 16px' : '0' }}>
        <h1
          className="text-gold-gradient text-center relative z-10"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: isMobile ? '32px' : '48px',
            lineHeight: isMobile ? '40px' : '60px',
            fontWeight: 400,
            letterSpacing: '-0.96px',
          }}
        >
          Bạn muốn hỏi gì hôm nay?
        </h1>
        <p
          className="text-center w-full relative z-10"
          style={{
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontSize: isMobile ? '16px' : '20px',
            lineHeight: isMobile ? '24px' : '30px',
            fontWeight: 400,
            color: '#FFFFFF',
            opacity: 0.75,
            padding: isMobile ? '0 8px' : '0',
          }}
        >
          Đo độ hiệu qủa của các mô hình khác nhau. Mô hình nào sẽ làm bạn hài lòng nhất?
        </p>
      </div>

      {/* Chatbox area */}
      <div className="flex flex-col items-center w-full relative z-10" style={{ padding: isMobile ? '16px' : '24px 0' }}>
        <div style={{ width: isMobile ? '100%' : isTablet ? '90%' : '600px', maxWidth: '600px', padding: isMobile ? '0 16px' : '0', boxSizing: 'border-box' }}>
          <ChatInput onSubmit={onSubmitPrompt} />
        </div>
      </div>

      {/* Prompt suggestion cards */}
      <div
        className="flex items-start justify-center w-full relative z-10"
        style={{
          padding: isMobile ? '0 16px' : isTablet ? '0 32px' : '0 64px',
          gap: isMobile ? '8px' : '16px',
          flexDirection: isMobile ? 'column' : 'row',
          height: isMobile ? 'auto' : '92px',
        }}
      >
        {PROMPT_SUGGESTIONS.map((text) => (
          <PromptCard
            key={text}
            text={text}
            onClick={() => onSubmitPrompt(text)}
          />
        ))}
      </div>
    </div>
  )
}
