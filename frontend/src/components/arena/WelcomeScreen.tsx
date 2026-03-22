import { ChatInput } from './ChatInput'
import { PromptCard } from './PromptCard'

/*
 * WelcomeScreen — matches Figma node 2:10708 (Frame 1686560715, 1111×564)
 *
 * Structure:
 *   Welcome area (flex-col items-center justify-center)
 *   ├── Heading group (y:113, centered)
 *   │   ├── "Bạn muốn hỏi gì hôm nay?" — Space Grotesk 48px, gold gradient
 *   │   └── Subtitle — 20px Regular, opacity 75%, gap: 4px from heading
 *   ├── Chatbox area (y:207, 1111×152, py-24)
 *   │   └── ChatInput (600×104, centered)
 *   └── Prompt cards (y:359, 1111×92, px-64)
 *       └── 3 cards (flex-1, gap-16)
 */

const PROMPT_SUGGESTIONS = [
  'Viết một đoạn thơ ngắn (4 câu) theo phong cách lục bát, chủ đề: tình yêu quê hương.',
  'Giải thích vì sao cầu vồng thường xuất hiện sau cơn mưa bằng 2–3 câu, dùng ngôn ngữ rõ ràng, dễ hiểu.',
  'Tóm tắt tác phẩm Truyện Kiều của Nguyễn Du và phân loại thể loại văn học của tác phẩm này.',
]

interface Props {
  onSubmitPrompt: (text: string) => void
}

export function WelcomeScreen({ onSubmitPrompt }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center animate-fade-in relative" style={{ paddingTop: '113px' }}>
      {/* Heading group — Figma: centered, gap-4px between heading and subtitle */}
      <div className="flex flex-col items-center w-full" style={{ gap: '4px' }}>
        <h1 className="display-lg text-gold-gradient text-center relative z-10">
          Bạn muốn hỏi gì hôm nay?
        </h1>
        <p
          className="text-center w-full relative z-10"
          style={{
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontSize: '20px',
            lineHeight: '30px',
            fontWeight: 400,
            color: '#FFFFFF',
            opacity: 0.75,
          }}
        >
          Đo độ hiệu qủa của các mô hình khác nhau. Mô hình nào sẽ làm bạn hài lòng nhất?
        </p>
      </div>

      {/* Chatbox area — Figma: py-24, 600px centered */}
      <div className="flex flex-col items-center w-full relative z-10" style={{ padding: '24px 0' }}>
        <div style={{ width: '600px' }}>
          <ChatInput onSubmit={onSubmitPrompt} />
        </div>
      </div>

      {/* Prompt suggestion cards — Figma: px-64, h-92, 3 cards flex-1, gap-16 */}
      <div
        className="flex items-start justify-center w-full relative z-10"
        style={{ padding: '0 64px', height: '92px', gap: '16px' }}
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
