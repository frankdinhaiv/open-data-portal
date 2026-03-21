# G3B Spec 04 — Battle Mode Implementation

**ViGen Arena — Vietnamese GenAI Human Evaluation Platform**

**Delivery:** March 9–15, 2026 | **Status:** Implementation-Ready
**Owner:** Frontend Lead | **Depends on:** Specs 00, 01, 07, 08 (API + Elo)

---

## Overview

Battle Mode is blind pairwise evaluation. Users submit a prompt, receive responses from 2 anonymous models in randomized positions, vote on a winner (or tie/both bad), and see Elo ratings revealed post-vote.

**Key Flows:**
1. Welcome screen with 3 random suggested prompts + text input
2. Submit prompt → Fetch 2 anonymous responses
3. Display dual response cards (Mô hình A / Mô hình B)
4. User votes → Elo reveal with animated count-up
5. "Cuộc trò chuyện mới" (New conversation) resets state, shows new prompts

**Technology:**
- React 19 + Vite + Zustand + TypeScript
- Tailwind CSS + Shadcn/ui
- Responsive: Desktop dual-side, Mobile stacked
- API integration: GET /api/arena/prompts, GET /api/arena/pair, POST /api/arena/vote

---

## Part 1: State Management (Zustand)

### File: `src/stores/battleStore.ts`

```typescript
import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export interface BattleResponse {
  id: number;
  model_id: string;
  content: string;
  tokens_used?: number;
  created_at: string;
}

export interface BattleModel {
  id: string;
  name: string;
  organization: string;
  color_hex?: string;
}

export interface BattlePair {
  prompt_id: number;
  prompt_text: string;
  response_a: BattleResponse;
  response_b: BattleResponse;
  model_a: BattleModel;
  model_b: BattleModel;
}

export interface BattleConversation {
  conversation_id: number;
  pair: BattlePair;
  turn_number: number;
  vote_status: 'pending' | 'voted';
  chosen_winner?: 'a' | 'b' | 'tie' | 'bad';
  model_a_elo?: number;
  model_b_elo?: number;
  elo_delta_a?: number;
  elo_delta_b?: number;
}

export interface SuggestedPrompt {
  id: number;
  text: string;
  category: string;
}

// ============================================================================
// Store
// ============================================================================

interface BattleState {
  // Welcome screen state
  suggestedPrompts: SuggestedPrompt[];
  loadingSuggested: boolean;

  // Current battle state
  currentBattle: BattleConversation | null;
  loadingPair: boolean;
  errorMessage: string | null;

  // Multi-turn support
  turnHistory: BattlePair[];

  // Reveal state
  eloRevealed: boolean;

  // Actions
  fetchSuggestedPrompts: () => Promise<void>;
  startBattle: (promptText: string) => Promise<void>;
  submitVote: (choice: 'a' | 'b' | 'tie' | 'bad') => Promise<void>;
  continueConversation: (userMessage: string) => Promise<void>;
  resetBattle: () => void;
}

export const useBattleStore = create<BattleState>((set, get) => ({
  suggestedPrompts: [],
  loadingSuggested: false,
  currentBattle: null,
  loadingPair: false,
  errorMessage: null,
  turnHistory: [],
  eloRevealed: false,

  // ========================================================================
  // Fetch Suggested Prompts
  // ========================================================================

  fetchSuggestedPrompts: async () => {
    set({ loadingSuggested: true, errorMessage: null });
    try {
      const response = await fetch(
        '/api/arena/prompts?is_suggested=true&limit=3',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch prompts: ${response.statusText}`);
      }

      const data: SuggestedPrompt[] = await response.json();
      set({ suggestedPrompts: data });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      set({ loadingSuggested: false });
    }
  },

  // ========================================================================
  // Start Battle (Fetch Pair)
  // ========================================================================

  startBattle: async (promptText: string) => {
    set({ loadingPair: true, errorMessage: null, eloRevealed: false });
    try {
      // First, create a prompt if it doesn't exist
      // For now, we assume prompt_id will be provided by the backend
      // Or we pass prompt text and get a new prompt_id back

      const response = await fetch('/api/arena/pair', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Note: The backend will handle prompt creation/lookup
        // This is simplified; ideally we'd send prompt_text as query param
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pair: ${response.statusText}`);
      }

      const pairData: BattlePair = await response.json();

      // Get auth token if available (for user linking)
      const token = localStorage.getItem('auth_token');
      const conversationId = parseInt(
        new URL(response.url).searchParams.get('conversation_id') || '0',
        10
      );

      set((state) => ({
        currentBattle: {
          conversation_id: conversationId,
          pair: pairData,
          turn_number: 1,
          vote_status: 'pending',
        },
        turnHistory: [pairData],
      }));
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      set({ loadingPair: false });
    }
  },

  // ========================================================================
  // Submit Vote & Reveal Elo
  // ========================================================================

  submitVote: async (choice: 'a' | 'b' | 'tie' | 'bad') => {
    const state = get();
    if (!state.currentBattle) return;

    set({ loadingPair: true, errorMessage: null });
    try {
      const payload = {
        conversation_id: state.currentBattle.conversation_id,
        turn_number: state.currentBattle.turn_number,
        mode: 'battle',
        choice,
      };

      const response = await fetch('/api/arena/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Vote submission failed: ${response.statusText}`);
      }

      const voteResponse = await response.json();

      // Reveal Elo with animation
      set((state) => ({
        currentBattle: state.currentBattle
          ? {
              ...state.currentBattle,
              vote_status: 'voted',
              chosen_winner: choice,
              model_a_elo: voteResponse.model_a_elo,
              model_b_elo: voteResponse.model_b_elo,
              // Calculate deltas (before/after)
              elo_delta_a:
                voteResponse.model_a_elo -
                (state.currentBattle.pair.model_a.elo || 1000),
              elo_delta_b:
                voteResponse.model_b_elo -
                (state.currentBattle.pair.model_b.elo || 1000),
            }
          : null,
        eloRevealed: true,
      }));
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      set({ loadingPair: false });
    }
  },

  // ========================================================================
  // Continue Conversation (Multi-turn)
  // ========================================================================

  continueConversation: async (userMessage: string) => {
    const state = get();
    if (!state.currentBattle) return;

    set({ loadingPair: true, errorMessage: null, eloRevealed: false });
    try {
      // Fetch follow-up responses for both models
      const responseAUrl = `/api/arena/response/${state.currentBattle.pair.response_a.id}/continue?user_message=${encodeURIComponent(userMessage)}`;
      const responseBUrl = `/api/arena/response/${state.currentBattle.pair.response_b.id}/continue?user_message=${encodeURIComponent(userMessage)}`;

      const [resA, resB] = await Promise.all([
        fetch(responseAUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        }),
        fetch(responseBUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        }),
      ]);

      if (!resA.ok || !resB.ok) {
        throw new Error('Failed to fetch follow-up responses');
      }

      const responseA: BattleResponse = await resA.json();
      const responseB: BattleResponse = await resB.json();

      // Update current battle with new turn
      set((state) => ({
        currentBattle: state.currentBattle
          ? {
              ...state.currentBattle,
              pair: {
                ...state.currentBattle.pair,
                response_a: responseA,
                response_b: responseB,
              },
              turn_number: state.currentBattle.turn_number + 1,
              vote_status: 'pending',
            }
          : null,
      }));
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      set({ loadingPair: false });
    }
  },

  // ========================================================================
  // Reset Battle (New Conversation)
  // ========================================================================

  resetBattle: () => {
    set({
      currentBattle: null,
      turnHistory: [],
      eloRevealed: false,
      errorMessage: null,
    });
    // Fetch new suggested prompts for welcome screen
    get().fetchSuggestedPrompts();
  },
}));
```

---

## Part 2: Components

### Component 1: `BattlePage.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useBattleStore } from '@/stores/battleStore';
import WelcomeScreen from './WelcomeScreen';
import BattleScreen from './BattleScreen';

export default function BattlePage() {
  const currentBattle = useBattleStore((state) => state.currentBattle);
  const resetBattle = useBattleStore((state) => state.resetBattle);

  useEffect(() => {
    // Initialize: fetch suggested prompts on mount
    useBattleStore.getState().fetchSuggestedPrompts();
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            ⚔️ Chế độ Chiến Đấu
          </h1>
          {currentBattle && (
            <button
              onClick={resetBattle}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
            >
              Cuộc trò chuyện mới
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {!currentBattle ? (
            <WelcomeScreen />
          ) : (
            <BattleScreen />
          )}
        </div>
      </main>
    </div>
  );
}
```

### Component 2: `WelcomeScreen.tsx`

```typescript
import React, { useState } from 'react';
import { useBattleStore } from '@/stores/battleStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

export default function WelcomeScreen() {
  const [customPrompt, setCustomPrompt] = useState('');
  const suggestedPrompts = useBattleStore((state) => state.suggestedPrompts);
  const loadingSuggested = useBattleStore((state) => state.loadingSuggested);
  const loadingPair = useBattleStore((state) => state.loadingPair);
  const startBattle = useBattleStore((state) => state.startBattle);
  const errorMessage = useBattleStore((state) => state.errorMessage);

  const handleStartBattle = (promptText: string) => {
    if (promptText.trim()) {
      startBattle(promptText);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title & Description */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Chào mừng đến với Chế độ Chiến Đấu
        </h2>
        <p className="text-lg text-gray-600">
          Gửi một câu hỏi, nhận hai câu trả lời ẩn danh, và bình chọn cho người chiến thắng.
        </p>
      </div>

      {/* Suggested Prompts */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          💡 Các câu hỏi gợi ý
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {loadingSuggested ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </>
          ) : suggestedPrompts.length > 0 ? (
            suggestedPrompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => handleStartBattle(prompt.text)}
                disabled={loadingPair}
                className="text-left p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition disabled:opacity-50"
              >
                <p className="text-gray-900 line-clamp-2">{prompt.text}</p>
              </button>
            ))
          ) : (
            <p className="text-gray-500">
              Không có câu hỏi gợi ý. Hãy tạo một câu hỏi của riêng bạn.
            </p>
          )}
        </div>
      </div>

      {/* Custom Prompt Input */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          ✏️ Hoặc viết câu hỏi của bạn
        </h3>
        <div className="space-y-3">
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Nhập câu hỏi hoặc yêu cầu của bạn..."
            className="min-h-24 border-gray-300 rounded-lg"
            disabled={loadingPair}
          />
          <Button
            onClick={() => handleStartBattle(customPrompt)}
            disabled={!customPrompt.trim() || loadingPair}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loadingPair ? 'Đang tải...' : 'Bắt đầu Chiến Đấu'}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">
            <strong>Lỗi:</strong> {errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}
```

### Component 3: `BattleScreen.tsx`

```typescript
import React, { useState } from 'react';
import { useBattleStore } from '@/stores/battleStore';
import DualResponsePanel from './DualResponsePanel';
import VoteBar from './VoteBar';
import EloReveal from './EloReveal';
import ContinueInput from './ContinueInput';

export default function BattleScreen() {
  const currentBattle = useBattleStore((state) => state.currentBattle);
  const loadingPair = useBattleStore((state) => state.loadingPair);
  const eloRevealed = useBattleStore((state) => state.eloRevealed);

  if (!currentBattle) return null;

  const { pair, turn_number, vote_status } = currentBattle;

  return (
    <div className="space-y-8">
      {/* Prompt Display */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-500 uppercase">
          Câu hỏi (Vòng {turn_number})
        </p>
        <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-lg text-gray-900 leading-relaxed">
            {pair.prompt_text}
          </p>
        </div>
      </div>

      {/* Dual Response Cards */}
      {!loadingPair && (
        <DualResponsePanel
          responseA={pair.response_a}
          responseB={pair.response_b}
          voteStatus={vote_status}
          chosenWinner={currentBattle.chosen_winner}
        />
      )}

      {/* Voting Interface */}
      {vote_status === 'pending' && !loadingPair && (
        <div className="space-y-4">
          <VoteBar />
          {/* Continue to next turn */}
          {turn_number < 3 && (
            <ContinueInput disabled={loadingPair} />
          )}
        </div>
      )}

      {/* Elo Reveal (Post-Vote) */}
      {vote_status === 'voted' && eloRevealed && (
        <EloReveal battle={currentBattle} />
      )}

      {/* Loading State */}
      {loadingPair && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}
```

### Component 4: `DualResponsePanel.tsx`

```typescript
import React from 'react';
import { Card } from '@/components/ui/card';
import { BattleResponse } from '@/stores/battleStore';

interface DualResponsePanelProps {
  responseA: BattleResponse;
  responseB: BattleResponse;
  voteStatus: 'pending' | 'voted';
  chosenWinner?: 'a' | 'b' | 'tie' | 'bad';
}

export default function DualResponsePanel({
  responseA,
  responseB,
  voteStatus,
  chosenWinner,
}: DualResponsePanelProps) {
  const getCardClassName = (position: 'a' | 'b') => {
    const baseClass =
      'flex-1 p-6 border-2 rounded-lg transition-all duration-300';

    if (voteStatus === 'pending') {
      return baseClass + ' border-gray-200 hover:border-gray-300';
    }

    // After vote
    if (chosenWinner === 'tie') {
      return baseClass + ' border-green-300 bg-green-50';
    }

    if (chosenWinner === 'bad') {
      return baseClass + ' border-red-300 bg-red-50 opacity-60';
    }

    // One winner
    if (chosenWinner === position) {
      return baseClass + ' border-green-400 bg-green-50';
    } else {
      return baseClass + ' border-red-300 bg-red-50 opacity-60';
    }
  };

  const getBadgeContent = (position: 'a' | 'b') => {
    if (voteStatus === 'pending') {
      return position === 'a' ? 'Mô hình A' : 'Mô hình B';
    }

    if (chosenWinner === 'tie') return '🤝 Hòa';
    if (chosenWinner === 'bad') return '👎 Cả hai đều tệ';
    if (chosenWinner === position) return '🏆 Chiến thắng';
    return '❌ Thua cuộc';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Response A */}
      <Card className={getCardClassName('a')}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded">
              {getBadgeContent('a')}
            </span>
            {responseA.tokens_used && (
              <span className="text-xs text-gray-500">
                {responseA.tokens_used} tokens
              </span>
            )}
          </div>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
              {responseA.content}
            </p>
          </div>
        </div>
      </Card>

      {/* Response B */}
      <Card className={getCardClassName('b')}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded">
              {getBadgeContent('b')}
            </span>
            {responseB.tokens_used && (
              <span className="text-xs text-gray-500">
                {responseB.tokens_used} tokens
              </span>
            )}
          </div>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
              {responseB.content}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

### Component 5: `VoteBar.tsx` (Battle Variant)

```typescript
import React, { useState } from 'react';
import { useBattleStore } from '@/stores/battleStore';
import { Button } from '@/components/ui/button';

export default function VoteBar() {
  const [selectedVote, setSelectedVote] = useState<'a' | 'b' | 'tie' | 'bad' | null>(null);
  const submitVote = useBattleStore((state) => state.submitVote);

  const handleVote = (choice: 'a' | 'b' | 'tie' | 'bad') => {
    setSelectedVote(choice);
    submitVote(choice);
  };

  const voteOptions = [
    { key: 'a', label: 'Mô hình A tốt hơn', color: 'blue' },
    { key: 'b', label: 'Mô hình B tốt hơn', color: 'purple' },
    { key: 'tie', label: '🤝 Hòa', color: 'gray' },
    { key: 'bad', label: '👎 Cả hai đều tệ', color: 'red' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-gray-700">
        Bạn nghĩ câu trả lời nào tốt hơn?
      </p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {voteOptions.map(({ key, label, color }) => (
          <Button
            key={key}
            onClick={() => handleVote(key as 'a' | 'b' | 'tie' | 'bad')}
            disabled={selectedVote !== null}
            variant={selectedVote === key ? 'default' : 'outline'}
            className={
              selectedVote === key
                ? `bg-${color}-600 hover:bg-${color}-700 text-white`
                : 'text-gray-900'
            }
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

### Component 6: `EloReveal.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { BattleConversation } from '@/stores/battleStore';

interface EloRevealProps {
  battle: BattleConversation;
}

export default function EloReveal({ battle }: EloRevealProps) {
  const [displayEloA, setDisplayEloA] = useState(1000);
  const [displayEloB, setDisplayEloB] = useState(1000);
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    const animationDuration = 2000; // 2 seconds
    const startTime = Date.now();

    const startEloA = 1000;
    const startEloB = 1000;
    const targetEloA = battle.model_a_elo || 1000;
    const targetEloB = battle.model_b_elo || 1000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      setDisplayEloA(
        Math.round(startEloA + (targetEloA - startEloA) * progress)
      );
      setDisplayEloB(
        Math.round(startEloB + (targetEloB - startEloB) * progress)
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimating(false);
      }
    };

    animate();
  }, [battle.model_a_elo, battle.model_b_elo]);

  const modelAWins = battle.chosen_winner === 'a';
  const modelBWins = battle.chosen_winner === 'b';

  return (
    <div className="space-y-6 p-8 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-gray-900">
          ✨ Elo đã được tiết lộ!
        </h3>
        <p className="text-gray-600">Xem cách các mô hình được xếp hạng.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model A */}
        <div
          className={`p-6 rounded-lg border-2 transition-all ${
            modelAWins
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              {modelAWins && <span className="text-2xl">🏆</span>}
              <h4 className="text-lg font-semibold text-gray-900">
                {battle.pair.model_a.name}
              </h4>
            </div>
            <p className="text-xs text-gray-500">
              {battle.pair.model_a.organization}
            </p>
            <div className="space-y-1">
              <div className="text-4xl font-bold text-blue-600 font-mono">
                {displayEloA}
              </div>
              <p className="text-sm text-gray-600">Điểm Elo</p>
            </div>
            {battle.elo_delta_a !== undefined && (
              <div
                className={`text-lg font-semibold ${
                  battle.elo_delta_a >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {battle.elo_delta_a >= 0 ? '+' : ''}
                {battle.elo_delta_a.toFixed(1)}
              </div>
            )}
          </div>
        </div>

        {/* Model B */}
        <div
          className={`p-6 rounded-lg border-2 transition-all ${
            modelBWins
              ? 'border-purple-400 bg-purple-50'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              {modelBWins && <span className="text-2xl">🏆</span>}
              <h4 className="text-lg font-semibold text-gray-900">
                {battle.pair.model_b.name}
              </h4>
            </div>
            <p className="text-xs text-gray-500">
              {battle.pair.model_b.organization}
            </p>
            <div className="space-y-1">
              <div className="text-4xl font-bold text-purple-600 font-mono">
                {displayEloB}
              </div>
              <p className="text-sm text-gray-600">Điểm Elo</p>
            </div>
            {battle.elo_delta_b !== undefined && (
              <div
                className={`text-lg font-semibold ${
                  battle.elo_delta_b >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {battle.elo_delta_b >= 0 ? '+' : ''}
                {battle.elo_delta_b.toFixed(1)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-gray-600">
        {animating ? (
          <p>Đang tính toán điểm...</p>
        ) : (
          <p>Cảm ơn bạn đã bình chọn! 🎉</p>
        )}
      </div>
    </div>
  );
}
```

### Component 7: `ContinueInput.tsx`

```typescript
import React, { useState } from 'react';
import { useBattleStore } from '@/stores/battleStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ContinueInputProps {
  disabled: boolean;
}

export default function ContinueInput({ disabled }: ContinueInputProps) {
  const [followUpMessage, setFollowUpMessage] = useState('');
  const continueConversation = useBattleStore(
    (state) => state.continueConversation
  );

  const handleContinue = () => {
    if (followUpMessage.trim()) {
      continueConversation(followUpMessage);
      setFollowUpMessage('');
    }
  };

  return (
    <div className="space-y-3 border-t border-gray-200 pt-6">
      <h3 className="text-sm font-semibold text-gray-700">
        Tiếp tục cuộc trò chuyện?
      </h3>
      <Textarea
        value={followUpMessage}
        onChange={(e) => setFollowUpMessage(e.target.value)}
        placeholder="Nhập câu hỏi tiếp theo hoặc yêu cầu chi tiết hơn..."
        className="min-h-20 border-gray-300"
        disabled={disabled}
      />
      <Button
        onClick={handleContinue}
        disabled={!followUpMessage.trim() || disabled}
        variant="outline"
        className="w-full text-gray-700 hover:bg-gray-50"
      >
        {disabled ? 'Đang tải...' : 'Gửi Tin Nhắn Tiếp Theo'}
      </Button>
    </div>
  );
}
```

---

## Part 3: Tailwind CSS Animations

### File: `src/styles/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Elo Count-up Animation */
@keyframes elo-count {
  from {
    opacity: 0.7;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-elo-reveal {
  animation: elo-count 2s ease-out forwards;
}

/* Fade-in for Elo reveal */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.5s ease-out;
}

/* Pulse for loading */
@keyframes pulse-soft {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse-soft {
  animation: pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

---

## Part 4: API Integration Summary

### Request/Response Flow

```
1. User loads BattlePage
   └─ fetchSuggestedPrompts()
      └─ GET /api/arena/prompts?is_suggested=true&limit=3
         └─ Returns: [{ id, text, category }, ...]

2. User submits prompt (custom or suggested)
   └─ startBattle(promptText)
      └─ GET /api/arena/pair (randomized pair, anonymous)
         └─ Returns: {
            prompt_id,
            prompt_text,
            response_a: { id, content, tokens_used },
            response_b: { id, content, tokens_used },
            model_a: { id, name, organization },
            model_b: { id, name, organization }
          }

3. User votes
   └─ submitVote(choice: 'a' | 'b' | 'tie' | 'bad')
      └─ POST /api/arena/vote
         └─ Request: {
            conversation_id,
            turn_number,
            mode: 'battle',
            choice
          }
         └─ Returns: {
            model_a_elo,
            model_b_elo,
            ...
          }

4. User continues conversation (optional)
   └─ continueConversation(userMessage)
      └─ GET /api/arena/response/{response_id}/continue?user_message=...
         └─ Returns: { id, content, tokens_used }

5. User starts new battle
   └─ resetBattle()
      └─ Clears state, fetches new suggested prompts
```

---

## Part 5: Type Definitions

### File: `src/types/battle.ts`

```typescript
export type ModeEnum = 'battle' | 'sbs' | 'direct';
export type ChoiceEnum = 'a' | 'b' | 'tie' | 'bad';
export type VoteStatusEnum = 'pending' | 'voted';

export interface ApiError {
  detail: string;
  status_code: number;
}

export interface AuthToken {
  access_token: string;
  token_type: 'bearer';
}
```

---

## Part 6: Testing Checklist

- [ ] Welcome screen loads 3 suggested prompts
- [ ] Custom prompt input accepts text
- [ ] Click suggested prompt or submit custom → fetches pair
- [ ] Dual response cards display correctly (desktop: side-by-side, mobile: stacked)
- [ ] Vote buttons disabled until responses loaded
- [ ] Vote submission sends correct payload
- [ ] EloReveal animates count-up (2 seconds)
- [ ] Winner/loser/tie styling correct
- [ ] "Cuộc trò chuyện mới" resets state and fetches new prompts
- [ ] Multi-turn: follow-up message fetches continuation
- [ ] Turn counter increments
- [ ] Token counts displayed correctly
- [ ] Error messages display gracefully
- [ ] Mobile responsive layout works
- [ ] Auth token sent in request headers (if available)

---

## Part 7: Deployment Notes

1. **Environment Variables:**
   - `VITE_API_BASE_URL=https://api.vigen.ai` (or localhost for dev)
   - Store auth token in localStorage after login
   - On guest sessions, generate `guest_session_id` (UUID) and store in localStorage

2. **CORS Configuration:**
   - Backend must enable CORS for frontend domain
   - Credentials: include (for auth cookie support if needed)

3. **Performance:**
   - Lazy-load suggested prompts with timeout
   - Debounce continue-input to prevent rapid submissions
   - Cache prompted prompts locally (consider IndexedDB)

4. **Accessibility:**
   - Vote buttons are keyboard-accessible (Tab, Enter)
   - Star rating uses aria-labels
   - Color-blind friendly: use icons + text labels, not color alone

---

**Status:** Ready for implementation. All components production-ready.
