# G3B Spec 05 — Side-by-Side Mode Implementation

**ViGen Arena — Vietnamese GenAI Human Evaluation Platform**

**Delivery:** March 9–15, 2026 | **Status:** Implementation-Ready
**Owner:** Frontend Lead | **Depends on:** Specs 00, 01, 07, 08 (API + Elo)

---

## Overview

Side-by-Side (SBS) Mode is named model comparison. Users select 2 specific models from a dropdown, submit a prompt, and vote on a winner. Model names are visible throughout (unlike Battle Mode's anonymous pairs).

**Key Flows:**
1. Model selector dropdowns (Mô hình A / Mô hình B) + prompt input
2. Validation: can't select same model twice
3. Submit → Fetch responses from both models (names visible)
4. Display dual response cards with model names in headers
5. Vote → Show contextual confirmation (e.g., "Claude Opus 4.6 thắng!")
6. Multi-turn: same as Battle Mode

**Technology:**
- React 19 + Vite + Zustand + TypeScript
- Shadcn/ui Select/Combobox for searchable model dropdown
- Tailwind CSS + responsive design
- API integration: GET /api/arena/models, GET /api/arena/pair, POST /api/arena/vote

---

## Part 1: State Management (Zustand)

### File: `src/stores/sbsStore.ts`

```typescript
import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export interface SBSModel {
  id: string;
  name: string;
  organization: string;
  license: 'proprietary' | 'open';
  color_hex?: string;
}

export interface SBSResponse {
  id: number;
  model_id: string;
  content: string;
  tokens_used?: number;
  created_at: string;
}

export interface SBSPair {
  prompt_id: number;
  prompt_text: string;
  response_a: SBSResponse;
  response_b: SBSResponse;
  model_a: SBSModel;
  model_b: SBSModel;
}

export interface SBSConversation {
  conversation_id: number;
  pair: SBSPair;
  turn_number: number;
  vote_status: 'pending' | 'voted';
  chosen_winner?: 'a' | 'b' | 'tie' | 'bad';
  model_a_elo?: number;
  model_b_elo?: number;
  elo_delta_a?: number;
  elo_delta_b?: number;
}

// ============================================================================
// Store
// ============================================================================

interface SBSState {
  // Model selection
  models: SBSModel[];
  loadingModels: boolean;
  selectedModelA: SBSModel | null;
  selectedModelB: SBSModel | null;

  // Current battle state
  currentBattle: SBSConversation | null;
  loadingPair: boolean;
  errorMessage: string | null;

  // Multi-turn support
  turnHistory: SBSPair[];

  // Reveal state
  eloRevealed: boolean;

  // Actions
  fetchModels: () => Promise<void>;
  setSelectedModelA: (model: SBSModel) => void;
  setSelectedModelB: (model: SBSModel) => void;
  startBattle: (promptText: string) => Promise<void>;
  submitVote: (choice: 'a' | 'b' | 'tie' | 'bad') => Promise<void>;
  continueConversation: (userMessage: string) => Promise<void>;
  continueAfterVote: () => void;  // Re-enable input after SBS vote (multi-turn continue)
  resetBattle: () => void;
  validateModels: () => boolean;
}

export const useSBSStore = create<SBSState>((set, get) => ({
  models: [],
  loadingModels: false,
  selectedModelA: null,
  selectedModelB: null,
  currentBattle: null,
  loadingPair: false,
  errorMessage: null,
  turnHistory: [],
  eloRevealed: false,

  // ========================================================================
  // Fetch Models
  // ========================================================================

  fetchModels: async () => {
    set({ loadingModels: true, errorMessage: null });
    try {
      const response = await fetch('/api/arena/models?active_only=true', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data: SBSModel[] = await response.json();
      set({ models: data });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      set({ loadingModels: false });
    }
  },

  // ========================================================================
  // Set Selected Models
  // ========================================================================

  setSelectedModelA: (model: SBSModel) => {
    set({ selectedModelA: model, errorMessage: null });
  },

  setSelectedModelB: (model: SBSModel) => {
    set({ selectedModelB: model, errorMessage: null });
  },

  // ========================================================================
  // Validate Models (Can't select same model twice)
  // ========================================================================

  validateModels: () => {
    const state = get();
    if (!state.selectedModelA || !state.selectedModelB) {
      set({ errorMessage: 'Vui lòng chọn cả hai mô hình.' });
      return false;
    }
    if (state.selectedModelA.id === state.selectedModelB.id) {
      set({ errorMessage: 'Không thể chọn cùng một mô hình hai lần.' });
      return false;
    }
    return true;
  },

  // ========================================================================
  // Start Battle (Fetch Pair)
  // ========================================================================

  startBattle: async (promptText: string) => {
    const state = get();

    if (!state.validateModels()) {
      return;
    }

    set({ loadingPair: true, errorMessage: null, eloRevealed: false });
    try {
      const modelAId = state.selectedModelA?.id;
      const modelBId = state.selectedModelB?.id;

      const response = await fetch(
        `/api/arena/pair?model_a=${modelAId}&model_b=${modelBId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch pair: ${response.statusText}`);
      }

      const pairData: SBSPair = await response.json();

      // Extract conversation_id from response URL or headers
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
        mode: 'sbs',
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

      set((state) => ({
        currentBattle: state.currentBattle
          ? {
              ...state.currentBattle,
              vote_status: 'voted',
              chosen_winner: choice,
              model_a_elo: voteResponse.model_a_elo,
              model_b_elo: voteResponse.model_b_elo,
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

      const responseA: SBSResponse = await resA.json();
      const responseB: SBSResponse = await resB.json();

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
  // Reset Battle
  // ========================================================================

  // Continue conversation after vote (multi-turn after SBS vote)
  continueAfterVote: () => {
    set((state) => ({
      eloRevealed: false,
      currentBattle: state.currentBattle
        ? {
            ...state.currentBattle,
            vote_status: 'pending' as const,
          }
        : null,
    }));
  },

  resetBattle: () => {
    // NOTE: Model selections are PRESERVED on reset (per spec)
    set({
      currentBattle: null,
      turnHistory: [],
      eloRevealed: false,
      errorMessage: null,
      // selectedModelA and selectedModelB intentionally NOT cleared
    });
  },
}));
```

---

## Part 2: Components

### Component 1: `SBSPage.tsx`

```typescript
import React, { useEffect } from 'react';
import { useSBSStore } from '@/stores/sbsStore';
import ModelSelectorScreen from './ModelSelectorScreen';
import SBSBattleScreen from './SBSBattleScreen';

export default function SBSPage() {
  const currentBattle = useSBSStore((state) => state.currentBattle);
  const resetBattle = useSBSStore((state) => state.resetBattle);
  const fetchModels = useSBSStore((state) => state.fetchModels);

  useEffect(() => {
    // Initialize: fetch available models
    fetchModels();
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            🔀 Chế độ So Sánh Cạnh Nhau
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
            <ModelSelectorScreen />
          ) : (
            <SBSBattleScreen />
          )}
        </div>
      </main>
    </div>
  );
}
```

### Component 2: `ModelSelectorScreen.tsx`

```typescript
import React, { useState } from 'react';
import { useSBSStore } from '@/stores/sbsStore';
import ModelSelector from './ModelSelector';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function ModelSelectorScreen() {
  const [customPrompt, setCustomPrompt] = useState('');
  const models = useSBSStore((state) => state.models);
  const loadingModels = useSBSStore((state) => state.loadingModels);
  const loadingPair = useSBSStore((state) => state.loadingPair);
  const selectedModelA = useSBSStore((state) => state.selectedModelA);
  const selectedModelB = useSBSStore((state) => state.selectedModelB);
  const errorMessage = useSBSStore((state) => state.errorMessage);
  const startBattle = useSBSStore((state) => state.startBattle);

  const canStart = selectedModelA && selectedModelB && customPrompt.trim();

  const handleStart = () => {
    if (canStart) {
      startBattle(customPrompt);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Chọn Hai Mô Hình Để So Sánh
        </h2>
        <p className="text-lg text-gray-600">
          Chọn mô hình, gửi câu hỏi, và xem chúng trả lời như thế nào.
        </p>
      </div>

      {/* Model Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ModelSelector
          label="Mô hình A"
          selectedModel={selectedModelA}
          models={models}
          loading={loadingModels}
          position="a"
        />
        <ModelSelector
          label="Mô hình B"
          selectedModel={selectedModelB}
          models={models}
          loading={loadingModels}
          position="b"
        />
      </div>

      {/* Swap Button (Optional) */}
      <div className="flex justify-center">
        <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          ⇄ Hoán đổi mô hình
        </button>
      </div>

      {/* Prompt Input */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          ✏️ Nhập câu hỏi hoặc yêu cầu
        </h3>
        <Textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Câu hỏi của bạn..."
          className="min-h-24 border-gray-300 rounded-lg"
          disabled={loadingPair}
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">
            <strong>Lỗi:</strong> {errorMessage}
          </p>
        </div>
      )}

      {/* Start Button */}
      <Button
        onClick={handleStart}
        disabled={!canStart || loadingPair}
        size="lg"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loadingPair ? 'Đang tải...' : 'So Sánh'}
      </Button>
    </div>
  );
}
```

### Component 3: `ModelSelector.tsx`

```typescript
import React from 'react';
import { useSBSStore } from '@/stores/sbsStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SBSModel } from '@/stores/sbsStore';
import { Skeleton } from '@/components/ui/skeleton';

interface ModelSelectorProps {
  label: string;
  selectedModel: SBSModel | null;
  models: SBSModel[];
  loading: boolean;
  position: 'a' | 'b';
}

export default function ModelSelector({
  label,
  selectedModel,
  models,
  loading,
  position,
}: ModelSelectorProps) {
  const setSelectedModelA = useSBSStore(
    (state) => state.setSelectedModelA
  );
  const setSelectedModelB = useSBSStore(
    (state) => state.setSelectedModelB
  );

  const handleSelect = (modelId: string) => {
    const selected = models.find((m) => m.id === modelId);
    if (selected) {
      if (position === 'a') {
        setSelectedModelA(selected);
      } else {
        setSelectedModelB(selected);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <Skeleton className="h-10 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <Select
        value={selectedModel?.id || ''}
        onValueChange={handleSelect}
      >
        <SelectTrigger className="w-full border-gray-300">
          <SelectValue placeholder="Chọn mô hình..." />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center gap-2">
                {model.color_hex && (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: model.color_hex }}
                  />
                )}
                <span className="font-medium">{model.name}</span>
                <span className="text-xs text-gray-500">
                  {model.organization}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedModel && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm">
            <span className="font-semibold text-blue-900">
              {selectedModel.name}
            </span>
            <span className="text-blue-700"> • {selectedModel.organization}</span>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {selectedModel.license === 'open'
              ? '🔓 Mã nguồn mở'
              : '🔐 Độc quyền'}
          </p>
        </div>
      )}
    </div>
  );
}
```

### Component 4: `SBSBattleScreen.tsx`

```typescript
import React from 'react';
import { useSBSStore } from '@/stores/sbsStore';
import SBSResponsePanel from './SBSResponsePanel';
import SBSVoteBar from './SBSVoteBar';
import SBSEloReveal from './SBSEloReveal';
import ContinueInput from './ContinueInput';

export default function SBSBattleScreen() {
  const currentBattle = useSBSStore((state) => state.currentBattle);
  const loadingPair = useSBSStore((state) => state.loadingPair);
  const eloRevealed = useSBSStore((state) => state.eloRevealed);

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

      {/* Response Panel (Names Visible) */}
      {!loadingPair && (
        <SBSResponsePanel
          responseA={pair.response_a}
          responseB={pair.response_b}
          modelA={pair.model_a}
          modelB={pair.model_b}
          voteStatus={vote_status}
          chosenWinner={currentBattle.chosen_winner}
        />
      )}

      {/* Vote Interface */}
      {vote_status === 'pending' && !loadingPair && (
        <div className="space-y-4">
          <SBSVoteBar modelA={pair.model_a} modelB={pair.model_b} />
          {turn_number < 3 && (
            <ContinueInput disabled={loadingPair} />
          )}
        </div>
      )}

      {/* Post-Vote Actions: Continue Conversation + New Comparison */}
      {vote_status === 'voted' && eloRevealed && (
        <>
          <SBSEloReveal battle={currentBattle} />
          <div className="flex gap-3 justify-center">
            {turn_number < 5 && (
              <button
                onClick={() => {
                  useSBSStore.getState().continueAfterVote();
                }}
                className="px-6 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium hover:bg-blue-100 transition"
              >
                💬 Tiếp tục hội thoại
              </button>
            )}
            <button
              onClick={resetBattle}
              className="px-6 py-3 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg font-medium hover:bg-gray-100 transition"
            >
              ⚖️ So sánh tiếp
            </button>
          </div>
        </>
      )}

      {loadingPair && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}
```

### Component 5: `SBSResponsePanel.tsx`

```typescript
import React from 'react';
import { Card } from '@/components/ui/card';
import { SBSResponse, SBSModel } from '@/stores/sbsStore';

interface SBSResponsePanelProps {
  responseA: SBSResponse;
  responseB: SBSResponse;
  modelA: SBSModel;
  modelB: SBSModel;
  voteStatus: 'pending' | 'voted';
  chosenWinner?: 'a' | 'b' | 'tie' | 'bad';
}

export default function SBSResponsePanel({
  responseA,
  responseB,
  modelA,
  modelB,
  voteStatus,
  chosenWinner,
}: SBSResponsePanelProps) {
  const getCardClassName = (position: 'a' | 'b') => {
    const baseClass =
      'flex-1 p-6 border-2 rounded-lg transition-all duration-300';

    if (voteStatus === 'pending') {
      return baseClass + ' border-gray-200 hover:border-gray-300';
    }

    if (chosenWinner === 'tie') {
      return baseClass + ' border-green-300 bg-green-50';
    }

    if (chosenWinner === 'bad') {
      return baseClass + ' border-red-300 bg-red-50 opacity-60';
    }

    if (chosenWinner === position) {
      return baseClass + ' border-green-400 bg-green-50';
    } else {
      return baseClass + ' border-red-300 bg-red-50 opacity-60';
    }
  };

  const getBadgeContent = (position: 'a' | 'b') => {
    if (voteStatus === 'pending') {
      return position === 'a' ? modelA.name : modelB.name;
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
            <div className="space-y-1">
              <p className="font-semibold text-gray-900">{modelA.name}</p>
              <p className="text-xs text-gray-500">{modelA.organization}</p>
            </div>
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
              {getBadgeContent('a')}
            </span>
          </div>
          {responseA.tokens_used && (
            <p className="text-xs text-gray-500">
              {responseA.tokens_used} tokens
            </p>
          )}
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
            <div className="space-y-1">
              <p className="font-semibold text-gray-900">{modelB.name}</p>
              <p className="text-xs text-gray-500">{modelB.organization}</p>
            </div>
            <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
              {getBadgeContent('b')}
            </span>
          </div>
          {responseB.tokens_used && (
            <p className="text-xs text-gray-500">
              {responseB.tokens_used} tokens
            </p>
          )}
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

### Component 6: `SBSVoteBar.tsx`

```typescript
import React, { useState } from 'react';
import { useSBSStore } from '@/stores/sbsStore';
import { Button } from '@/components/ui/button';
import { SBSModel } from '@/stores/sbsStore';

interface SBSVoteBarProps {
  modelA: SBSModel;
  modelB: SBSModel;
}

export default function SBSVoteBar({ modelA, modelB }: SBSVoteBarProps) {
  const [selectedVote, setSelectedVote] = useState<'a' | 'b' | 'tie' | 'bad' | null>(null);
  const submitVote = useSBSStore((state) => state.submitVote);

  const handleVote = (choice: 'a' | 'b' | 'tie' | 'bad') => {
    setSelectedVote(choice);
    submitVote(choice);
  };

  const voteOptions = [
    { key: 'a', label: `${modelA.name} tốt hơn`, color: 'blue' },
    { key: 'b', label: `${modelB.name} tốt hơn`, color: 'purple' },
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

### Component 7: `SBSEloReveal.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { SBSConversation } from '@/stores/sbsStore';

interface SBSEloRevealProps {
  battle: SBSConversation;
}

export default function SBSEloReveal({ battle }: SBSEloRevealProps) {
  const [displayEloA, setDisplayEloA] = useState(1000);
  const [displayEloB, setDisplayEloB] = useState(1000);
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    const animationDuration = 2000;
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

      {modelAWins ? (
        <div className="p-6 bg-green-50 border-2 border-green-400 rounded-lg text-center space-y-2">
          <h4 className="text-xl font-bold text-green-900">
            🏆 {battle.pair.model_a.name} thắng!
          </h4>
          <p className="text-sm text-green-700">
            {battle.pair.model_a.organization}
          </p>
        </div>
      ) : modelBWins ? (
        <div className="p-6 bg-green-50 border-2 border-green-400 rounded-lg text-center space-y-2">
          <h4 className="text-xl font-bold text-green-900">
            🏆 {battle.pair.model_b.name} thắng!
          </h4>
          <p className="text-sm text-green-700">
            {battle.pair.model_b.organization}
          </p>
        </div>
      ) : battle.chosen_winner === 'tie' ? (
        <div className="p-6 bg-blue-50 border-2 border-blue-400 rounded-lg text-center space-y-2">
          <h4 className="text-xl font-bold text-blue-900">
            🤝 Hòa giữa {battle.pair.model_a.name} và {battle.pair.model_b.name}
          </h4>
        </div>
      ) : (
        <div className="p-6 bg-red-50 border-2 border-red-400 rounded-lg text-center space-y-2">
          <h4 className="text-xl font-bold text-red-900">
            👎 Cả hai đều tệ
          </h4>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model A */}
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <div className="text-center space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">
              {battle.pair.model_a.name}
            </h4>
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
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <div className="text-center space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">
              {battle.pair.model_b.name}
            </h4>
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

### Component 8: `ContinueInput.tsx` (Shared)

```typescript
import React, { useState } from 'react';
import { useSBSStore } from '@/stores/sbsStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ContinueInputProps {
  disabled: boolean;
}

export default function ContinueInput({ disabled }: ContinueInputProps) {
  const [followUpMessage, setFollowUpMessage] = useState('');
  const continueConversation = useSBSStore(
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
        placeholder="Nhập câu hỏi tiếp theo..."
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

## Part 3: API Integration Summary

```
1. User loads SBSPage
   └─ fetchModels()
      └─ GET /api/arena/models?active_only=true
         └─ Returns: [{ id, name, organization, license, color_hex }, ...]

2. User selects Model A & Model B + prompt
   └─ Validation: Different models, prompt provided
   └─ startBattle(promptText)
      └─ GET /api/arena/pair?model_a=X&model_b=Y
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
         └─ Returns: { model_a_elo, model_b_elo, ... }

4. User continues (optional)
   └─ continueConversation(userMessage)
      └─ Same as Battle Mode

5. User continues conversation after vote (optional)
   └─ continueAfterVote() → re-enables input for follow-up
   └─ continueConversation(userMessage) → same 2 models, full context preserved

6. User starts new comparison
   └─ resetBattle() → clears conversation but preserves model selections
```

---

## Part 4: Testing Checklist

- [ ] Models dropdown loads and populates
- [ ] Can select Model A and Model B independently
- [ ] Validation prevents selecting same model twice
- [ ] Model names displayed in selector preview
- [ ] Prompt input required before starting
- [ ] "So Sánh" button disabled until both models + prompt ready
- [ ] Response cards show model names in headers
- [ ] Vote buttons include model names
- [ ] Elo reveal shows contextual winner message
- [ ] After vote: "Tiếp tục hội thoại" button appears (hidden at turn limit 5)
- [ ] After vote: "So sánh tiếp" button always appears
- [ ] "Tiếp tục hội thoại" re-enables input; preserves full conversation context
- [ ] "So sánh tiếp" clears conversation but preserves model selections
- [ ] Multi-turn works same as Battle Mode (turn limit 5)
- [ ] Mobile layout stacks responses vertically
- [ ] Color-coded by model (blue for A, purple for B)
- [ ] Token counts displayed

---

## Part 5: Differences from Battle Mode

| Aspect | Battle Mode | SBS Mode |
|--------|------------|----------|
| Model Selection | Random, anonymous (revealed post-vote) | User-selected, visible throughout |
| Dropdown UI | None | Searchable model selector |
| Vote Confirmation | Generic (just "Chiến thắng") | Contextual (e.g., "Claude Opus 4.6 thắng!") |
| Response Headers | "Mô hình A" / "Mô hình B" | Actual model names |

---

**Status:** Ready for implementation. All components production-ready.
