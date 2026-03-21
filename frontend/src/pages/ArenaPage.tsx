import { useRef, useEffect, useState, useCallback } from 'react'
import { useStore } from '../hooks/useStore'
import { WelcomeScreen } from '../components/arena/WelcomeScreen'
import { ChatInput } from '../components/arena/ChatInput'
import { DualResponsePanel } from '../components/arena/DualResponsePanel'
import { VoteBar } from '../components/arena/VoteBar'
import { EloReveal } from '../components/arena/EloReveal'
import * as api from '../api/client'
import type { VoteChoice, PairData, Model } from '../types'

interface DisplayMessage {
  id: number
  role: 'user' | 'dual' | 'direct' | 'system'
  content?: string
  responseA?: string
  responseB?: string
  modelA?: Model
  modelB?: Model
  pairData?: PairData
  voteResult?: VoteChoice | null
}

export function ArenaPage() {
  const {
    mode, messages, turnCount, incrementTurn,
    currentPair, setCurrentPair,
    showVoteBar, setShowVoteBar,
    showEloReveal, setShowEloReveal,
    setEloRevealData, incrementVotes,
    isLoggedIn, guestBattles, incrementGuestBattles, sessionId,
    setShowAuthModal,
    isLoading, setIsLoading,
    selectedModelA, selectedModelB, selectedModelDirect,
  } = useStore()

  const chatRef = useRef<HTMLDivElement>(null)
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([])
  const msgIdRef = useRef(0)

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [displayMessages, showVoteBar, showEloReveal])

  // Reset on clear
  useEffect(() => {
    if (messages.length === 0) {
      setDisplayMessages([])
      setShowVoteBar(false)
      setShowEloReveal(false)
      setEloRevealData(null)
    }
  }, [messages, setShowVoteBar, setShowEloReveal, setEloRevealData])

  const handleSubmitPrompt = useCallback(async (text: string) => {
    // Guest gate
    if (!isLoggedIn) {
      incrementGuestBattles()
      if (guestBattles >= 3) {
        setShowAuthModal(true)
        return
      }
    }

    incrementTurn()
    setShowVoteBar(false)
    setShowEloReveal(false)

    // Add user message
    const userId = ++msgIdRef.current
    setDisplayMessages((prev) => [...prev, { id: userId, role: 'user', content: text }])
    setIsLoading(true)

    try {
      if (mode === 'direct') {
        // Direct mode: single model response
        const promptsData = await api.fetchPrompts()
        const matchedPrompt = promptsData.find((p: { text: string }) => p.text === text)
        const modelId = selectedModelDirect || 'claude-opus'

        if (matchedPrompt) {
          const data = await api.fetchResponse(modelId, matchedPrompt.id)
          if (data.response) {
            const msgId = ++msgIdRef.current
            setDisplayMessages((prev) => [...prev, {
              id: msgId, role: 'direct',
              content: data.response.content,
              modelA: data.model,
            }])
            setShowVoteBar(true)
          }
        } else {
          // No matched prompt, show placeholder
          const msgId = ++msgIdRef.current
          setDisplayMessages((prev) => [...prev, {
            id: msgId, role: 'direct',
            content: 'Đây là phản hồi mẫu cho prompt tùy chỉnh. Trong phiên bản chính thức, mô hình sẽ tạo phản hồi thời gian thực.',
            modelA: { id: modelId, name: modelId, org: '', license: 'prop', color: '#3b82f6' },
          }])
          setShowVoteBar(true)
        }
      } else {
        // Match user input to a prompt in the database
        const promptsData = await api.fetchPrompts()
        const matchedPrompt = promptsData.find((p: { id: number; text: string }) => p.text === text)
        const promptId = matchedPrompt?.id

        // Battle mode: random pair. SBS mode: use selected models.
        const pairData = mode === 'sbs'
          ? await api.fetchPair(promptId, selectedModelA, selectedModelB)
          : await api.fetchPair(promptId)
        if (pairData.error) {
          setDisplayMessages((prev) => [...prev, { id: ++msgIdRef.current, role: 'system', content: pairData.error }])
          setIsLoading(false)
          return
        }
        setCurrentPair(pairData)
        const pair: PairData = pairData

        // Simulate typing delay
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 600))

        const msgId = ++msgIdRef.current
        setDisplayMessages((prev) => [...prev, {
          id: msgId, role: 'dual',
          responseA: pair.response_a.content,
          responseB: pair.response_b.content,
          modelA: pair.model_a,
          modelB: pair.model_b,
          pairData: pair,
          voteResult: null,
        }])
        setShowVoteBar(true)
      }
    } catch (err) {
      setDisplayMessages((prev) => [...prev, { id: ++msgIdRef.current, role: 'system', content: 'Có lỗi xảy ra. Vui lòng thử lại.' }])
    } finally {
      setIsLoading(false)
    }
  }, [mode, isLoggedIn, guestBattles, incrementGuestBattles, incrementTurn, setShowVoteBar, setShowEloReveal, setCurrentPair, setIsLoading, setShowAuthModal, selectedModelA, selectedModelB, selectedModelDirect])

  async function handleVote(choice: VoteChoice) {
    if (!currentPair) return

    setShowVoteBar(false)
    incrementVotes()

    // Update the last dual message with vote result
    setDisplayMessages((prev) => prev.map((msg, i) =>
      i === prev.length - 1 && msg.role === 'dual' ? { ...msg, voteResult: choice } : msg
    ))

    // Submit vote to backend
    const result = await api.submitVote({
      mode,
      prompt_text: currentPair.prompt.text,
      prompt_id: currentPair.prompt.id,
      model_a_id: currentPair.model_a.id,
      model_b_id: currentPair.model_b.id,
      response_a_id: currentPair.response_a.id,
      response_b_id: currentPair.response_b.id,
      choice,
      turn_number: turnCount,
    }, sessionId)

    // Show Elo reveal in battle mode
    if (mode === 'battle' && result.elo_reveal) {
      setEloRevealData({ ...result.elo_reveal, choice })
      setShowEloReveal(true)
    } else {
      // SBS mode - show confirmation
      const label = choice === 'a' ? `🏆 ${currentPair.model_a.name} thắng!`
        : choice === 'b' ? `🏆 ${currentPair.model_b.name} thắng!`
        : choice === 'tie' ? '🤝 Hòa — cả hai đều tốt'
        : '👎 Cả hai đều chưa tốt'
      setDisplayMessages((prev) => [...prev, { id: ++msgIdRef.current, role: 'system', content: label }])
    }
  }

  function handleDirectRate(stars: number, tags: string[]) {
    setShowVoteBar(false)
    incrementVotes()

    api.submitVote({
      mode: 'direct',
      prompt_text: 'direct',
      model_a_id: selectedModelDirect || 'claude-opus',
      choice: String(stars),
      quality_tags: JSON.stringify(tags),
      turn_number: turnCount,
    }, sessionId)

    setDisplayMessages((prev) => [...prev, {
      id: ++msgIdRef.current, role: 'system',
      content: '✓ Đánh giá đã được ghi nhận. Cảm ơn bạn!',
    }])
  }

  function handleContinue() {
    setShowVoteBar(false)
  }

  const hasMessages = displayMessages.length > 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 flex flex-col gap-4" ref={chatRef}>
        {!hasMessages && <WelcomeScreen onSubmitPrompt={handleSubmitPrompt} />}
        {displayMessages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end animate-slide-up">
                <div className="bg-[var(--accent)] text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm max-w-xl shadow-sm">
                  <p>{msg.content}</p>
                </div>
              </div>
            )
          }
          if (msg.role === 'dual' && msg.modelA && msg.modelB) {
            return (
              <DualResponsePanel
                key={msg.id}
                responseA={msg.responseA || ''}
                responseB={msg.responseB || ''}
                modelA={msg.modelA}
                modelB={msg.modelB}
                isBattle={mode === 'battle'}
                voteResult={msg.voteResult}
              />
            )
          }
          if (msg.role === 'direct') {
            return (
              <div key={msg.id} className="animate-slide-up">
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3 text-sm max-w-3xl shadow-sm">
                  {msg.modelA && (
                    <div className="text-[0.72rem] text-[var(--text-muted)] mb-2 font-semibold">
                      {msg.modelA.name} · {msg.modelA.org}
                    </div>
                  )}
                  <div className="leading-relaxed" dangerouslySetInnerHTML={{
                    __html: (msg.content || '').split('\n').map((line) => {
                      const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                      return line ? `<p class="mb-2">${formatted}</p>` : ''
                    }).join('')
                  }} />
                </div>
              </div>
            )
          }
          if (msg.role === 'system') {
            const isSuccess = msg.content?.includes('✓') || msg.content?.includes('🏆') || msg.content?.includes('🤝')
            const isError = msg.content?.includes('👎') || msg.content?.includes('lỗi')
            return (
              <div key={msg.id} className="animate-slide-up">
                <div className={`rounded-2xl px-4 py-3 text-sm text-center border shadow-sm
                  ${isSuccess ? 'bg-[var(--green-light)] border-[var(--green)] text-emerald-800'
                    : isError ? 'bg-[var(--red-light)] border-[var(--red)] text-red-800'
                    : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)]'}`}>
                  {msg.content}
                </div>
              </div>
            )
          }
          return null
        })}
        {isLoading && (
          <div className="animate-slide-up">
            <div className="typing-dots flex gap-1 px-4 py-3">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {showVoteBar && (
        <VoteBar onVote={handleVote} onContinue={handleContinue} onDirectRate={handleDirectRate} />
      )}
      {showEloReveal && <EloReveal />}

      <ChatInput onSubmit={handleSubmitPrompt} />
    </div>
  )
}
