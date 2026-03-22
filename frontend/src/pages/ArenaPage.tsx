import { useRef, useEffect, useState, useCallback } from 'react'
import { useStore } from '../hooks/useStore'
import { ModeSelector } from '../components/layout/ModeSelector'
import { WelcomeScreen } from '../components/arena/WelcomeScreen'
import { ChatInput } from '../components/arena/ChatInput'
import { UserMessage } from '../components/arena/UserMessage'
import { DualResponsePanel } from '../components/arena/DualResponsePanel'
import { ResponsePanel } from '../components/arena/ResponsePanel'
import { VoteBar } from '../components/arena/VoteBar'
import { ErrorResponsePanel } from '../components/arena/ErrorResponsePanel'
import * as api from '../api/client'
import type { VoteChoice, PairData, Model } from '../types'

interface DisplayMessage {
  id: number
  role: 'user' | 'dual' | 'direct' | 'system' | 'error'
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
    incrementVotes,
    isLoggedIn, guestBattles, incrementGuestBattles, sessionId,
    isLoading, setIsLoading,
    selectedModelA, selectedModelB, selectedModelDirect,
    models,
    setShowCTAModal,
  } = useStore()

  const chatRef = useRef<HTMLDivElement>(null)
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([])
  const msgIdRef = useRef(0)
  /** Track which vote button is being hovered (selecting state) */
  const [selectingChoice, setSelectingChoice] = useState<VoteChoice | null>(null)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [displayMessages, showVoteBar])

  useEffect(() => {
    if (messages.length === 0) {
      setDisplayMessages([])
      setShowVoteBar(false)
      setSelectingChoice(null)
    }
  }, [messages, setShowVoteBar])

  const handleSubmitPrompt = useCallback(async (text: string) => {
    if (!isLoggedIn) {
      if (guestBattles >= 3) {
        setShowCTAModal(true)
        return
      }
      incrementGuestBattles()
    }

    incrementTurn()
    setShowVoteBar(false)
    setSelectingChoice(null)

    const userId = ++msgIdRef.current
    setDisplayMessages((prev) => [...prev, { id: userId, role: 'user', content: text }])
    setIsLoading(true)

    try {
      if (mode === 'direct') {
        const modelId = selectedModelDirect || models[0]?.id || 'openai/gpt-5.4'
        const promptsData = await api.fetchPrompts()
        const matchedPrompt = promptsData.find((p: { text: string }) => p.text === text)
        // Use matched prompt ID or fallback to first prompt (for custom text)
        const promptId = matchedPrompt?.id || promptsData[0]?.id || 1

        const data = await api.fetchResponse(modelId, promptId)
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
        const promptsData = await api.fetchPrompts()
        const matchedPrompt = promptsData.find((p: { id: number; text: string }) => p.text === text)
        const promptId = matchedPrompt?.id

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
    } catch {
      // Determine the model that errored for display in ErrorResponsePanel
      const modelId = mode === 'direct' ? (selectedModelDirect || 'unknown') : (selectedModelA || 'unknown')
      const foundModel = models.find((m) => m.id === modelId)
      const errorModel: Model = foundModel || { id: modelId, name: modelId, org: '', license: 'prop', color: '#3b82f6' }
      setDisplayMessages((prev) => [...prev, { id: ++msgIdRef.current, role: 'error', modelA: errorModel }])
    } finally {
      setIsLoading(false)
    }
  }, [mode, isLoggedIn, guestBattles, incrementGuestBattles, incrementTurn, setShowVoteBar, setCurrentPair, setIsLoading, setShowCTAModal, selectedModelA, selectedModelB, selectedModelDirect, models])

  async function handleVote(choice: VoteChoice) {
    if (!currentPair) return

    setShowVoteBar(false)
    setSelectingChoice(null)
    incrementVotes()

    setDisplayMessages((prev) => prev.map((msg, i) =>
      i === prev.length - 1 && msg.role === 'dual' ? { ...msg, voteResult: choice } : msg
    ))

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

    // Vote result is shown via DualResponsePanel visual states (winner/loser/tie)
    // No system message needed
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
      content: 'Đánh giá đã được ghi nhận. Cảm ơn bạn!',
    }])
  }

  function handleContinue() {
    setShowVoteBar(false)
    setSelectingChoice(null)
  }

  const hasMessages = displayMessages.length > 0

  // Find the last dual message index to apply selecting state only to it
  const lastDualIdx = displayMessages.reduce((acc, msg, i) => msg.role === 'dual' ? i : acc, -1)

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 90px)' }}>
      {/* Mode selector bar */}
      <ModeSelector />

      {/* Chat area -- fills remaining viewport height */}
      <div className="flex-1 px-6 py-3 flex flex-col gap-4" ref={chatRef}>
        {!hasMessages && <WelcomeScreen onSubmitPrompt={handleSubmitPrompt} />}
        {displayMessages.map((msg, idx) => {
          if (msg.role === 'user') {
            return <UserMessage key={msg.id} content={msg.content || ''} />
          }
          if (msg.role === 'dual' && msg.modelA && msg.modelB) {
            // Only apply selecting state to the latest dual message
            const isLatest = idx === lastDualIdx
            return (
              <DualResponsePanel
                key={msg.id}
                responseA={msg.responseA || ''}
                responseB={msg.responseB || ''}
                modelA={msg.modelA}
                modelB={msg.modelB}
                isBattle={mode === 'battle'}
                voteResult={msg.voteResult}
                selectingChoice={isLatest && showVoteBar ? selectingChoice : null}
              />
            )
          }
          if (msg.role === 'direct' && msg.modelA) {
            // In direct mode the rating UI lives inside the ResponsePanel (Figma: inline footer)
            // The latest unrated direct message gets the interactive onDirectRate callback;
            // earlier messages show the footer in a read-only/dimmed state (no callback)
            const isLatestDirect = displayMessages.slice(idx + 1).every((m) => m.role !== 'direct')
            return (
              <div key={msg.id} className="animate-slide-up max-w-3xl">
                <ResponsePanel
                  content={msg.content || ''}
                  model={msg.modelA}
                  isBattle={false}
                  onDirectRate={isLatestDirect ? handleDirectRate : undefined}
                />
              </div>
            )
          }
          if (msg.role === 'error' && msg.modelA) {
            return (
              <ErrorResponsePanel
                key={msg.id}
                model={msg.modelA}
                onRetry={() => {
                  // Remove the error message and let user re-submit
                  setDisplayMessages((prev) => prev.filter((m) => m.id !== msg.id))
                }}
              />
            )
          }
          if (msg.role === 'system') {
            return (
              <div key={msg.id} className="animate-slide-up">
                <div className="rounded-lg px-4 py-3 text-sm text-center glass">
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

      {/* Vote bar — only for battle/sbs modes; direct mode uses inline rating in ResponsePanel */}
      {showVoteBar && mode !== 'direct' && (
        <VoteBar
          onVote={handleVote}
          onContinue={handleContinue}
          onDirectRate={handleDirectRate}
          selectingChoice={selectingChoice}
          onSelectingChange={setSelectingChoice}
          modelAName={currentPair?.model_a?.name}
          modelBName={currentPair?.model_b?.name}
        />
      )}

      {/* Chat input (post-submit) */}
      {hasMessages && (
        <div className="shrink-0 px-6 py-4">
          <ChatInput onSubmit={handleSubmitPrompt} placeholder="Tiếp tục hỏi..." />
        </div>
      )}
    </div>
  )
}
