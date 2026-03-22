import { UserMessage } from './UserMessage'
import { ResponsePanel } from './ResponsePanel'
import { VoteBar } from './VoteBar'
import { ChatInput } from './ChatInput'
import type { Model, VoteChoice } from '../../types'

interface Props {
  userContent: string
  responseA: string
  responseB: string
  modelA: Model
  modelB: Model
  isBattle: boolean
  onVote: (choice: VoteChoice) => void
  onContinue: () => void
  onDirectRate: (stars: number, tags: string[]) => void
  onSubmitFollowUp: (text: string) => void
  showVoteBar: boolean
}

export function CompareView({
  userContent,
  responseA,
  responseB,
  modelA,
  modelB,
  isBattle,
  onVote,
  onContinue,
  onDirectRate,
  onSubmitFollowUp,
  showVoteBar,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* User message */}
      <UserMessage content={userContent} />

      {/* Two response panels side by side */}
      <div className="flex gap-4 animate-slide-up">
        <ResponsePanel
          content={responseA}
          model={modelA}
          isBattle={isBattle}
          label="Model A"
        />
        <ResponsePanel
          content={responseB}
          model={modelB}
          isBattle={isBattle}
          label="Model B"
        />
      </div>

      {/* Vote bar */}
      {showVoteBar && (
        <VoteBar onVote={onVote} onContinue={onContinue} onDirectRate={onDirectRate} />
      )}

      {/* Follow-up input */}
      <div className="mt-2">
        <ChatInput onSubmit={onSubmitFollowUp} placeholder="Tiếp tục hỏi..." />
      </div>
    </div>
  )
}
