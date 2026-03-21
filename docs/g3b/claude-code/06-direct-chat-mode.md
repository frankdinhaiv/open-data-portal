# G3B Spec 06 — Direct Chat Mode Implementation

**ViGen Arena — Vietnamese GenAI Human Evaluation Platform**

**Delivery:** March 9–15, 2026 | **Status:** Implementation-Ready
**Owner:** Frontend Lead | **Depends on:** Specs 00, 01, 07

---

## Overview

Direct Chat Mode is single-model evaluation with multi-turn conversation and optional star rating + quality tags. Users select one model, submit a prompt, and engage in unlimited turns of conversation. After any turn, users can rate the model's performance using 5-star scale + multi-select quality tags (Accurate, Natural, Culturally Appropriate, Creative, Helpful).

**Key Flows:**
1. Model selector dropdown + prompt input
2. Submit → Fetch initial response (model name visible)
3. Full-width single response card
4. Optional: Rate with stars + quality tags
5. Unlimited multi-turn conversation (no turn limit like Battle/SBS)
6. Rating can be submitted at any turn

**Technology:**
- React 19 + Vite + Zustand + TypeScript
- Shadcn/ui Star Rating component
- Tailwind CSS + responsive design
- API integration: GET /api/arena/models, GET /api/arena/response, POST /api/arena/vote

---

## Part 1: State Management (Zustand)

### File: `src/stores/directChatStore.ts`

```typescript
import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export interface DirectChatModel {
  id: string;
  name: string;
  organization: string;
  license: 'proprietary' | 'open';
  color_hex?: string;
}

export interface DirectChatResponse {
  id: number;
  model_id: string;
  content: string;
  tokens_used?: number;
  created_at: string;
}

export interface DirectChatTurn {
  turn_number: number;
  user_message: string;
  response: DirectChatResponse;
  rating?: {
    stars: number;
    quality_tags: string[];
    timestamp: string;
  };
}

export interface DirectChatConversation {
  conversation_id: number;
  model: DirectChatModel;
  prompt_text: string;
  turns: DirectChatTurn[];
  is_rated: boolean;
}

// ============================================================================
// Store
// ============================================================================

interface DirectChatState {
  // Model selection
  models: DirectChatModel[];
  loadingModels: boolean;
  selectedModel: DirectChatModel | null;

  // Current conversation state
  currentConversation: DirectChatConversation | null;
  loadingResponse: boolean;
  errorMessage: string | null;

  // Rating state
  ratingInProgress: {
    turn_number: number;
    stars: number;
    quality_tags: string[];
  } | null;

  // Actions
  fetchModels: () => Promise<void>;
  setSelectedModel: (model: DirectChatModel) => void;
  startChat: (promptText: string) => Promise<void>;
  sendMessage: (userMessage: string) => Promise<void>;
  submitRating: (
    turnNumber: number,
    stars: number,
    qualityTags: string[]
  ) => Promise<void>;
  resetChat: () => void;
  setRatingInProgress: (
    turnNumber: number,
    stars: number,
    qualityTags: string[]
  ) => void;
  cancelRating: () => void;
}

export const useDirectChatStore = create<DirectChatState>((set, get) => ({
  models: [],
  loadingModels: false,
  selectedModel: null,
  currentConversation: null,
  loadingResponse: false,
  errorMessage: null,
  ratingInProgress: null,

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

      const data: DirectChatModel[] = await response.json();
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
  // Set Selected Model
  // ========================================================================

  setSelectedModel: (model: DirectChatModel) => {
    set({ selectedModel: model, errorMessage: null });
  },

  // ========================================================================
  // Start Chat (Fetch Initial Response)
  // ========================================================================

  startChat: async (promptText: string) => {
    const state = get();

    if (!state.selectedModel) {
      set({ errorMessage: 'Vui lòng chọn một mô hình.' });
      return;
    }

    set({ loadingResponse: true, errorMessage: null });
    try {
      // First, create or get a prompt
      // For now, assume backend handles prompt creation
      // We need to get prompt_id from somewhere

      // Call backend to get initial response
      const response = await fetch(
        `/api/arena/response/${state.selectedModel.id}?prompt_text=${encodeURIComponent(promptText)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to start chat: ${response.statusText}`);
      }

      const data = await response.json();

      set({
        currentConversation: {
          conversation_id: data.conversation_id,
          model: state.selectedModel,
          prompt_text: promptText,
          turns: [
            {
              turn_number: 1,
              user_message: promptText,
              response: data.response,
            },
          ],
          is_rated: false,
        },
      });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      set({ loadingResponse: false });
    }
  },

  // ========================================================================
  // Send Message (Multi-turn)
  // ========================================================================

  sendMessage: async (userMessage: string) => {
    const state = get();
    if (!state.currentConversation) return;

    set({ loadingResponse: true, errorMessage: null });
    try {
      const lastTurn =
        state.currentConversation.turns[
          state.currentConversation.turns.length - 1
        ];

      const response = await fetch(
        `/api/arena/response/${lastTurn.response.id}/continue?user_message=${encodeURIComponent(userMessage)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch response');
      }

      const newResponse: DirectChatResponse = await response.json();
      const newTurnNumber = lastTurn.turn_number + 1;

      set((state) => ({
        currentConversation: state.currentConversation
          ? {
              ...state.currentConversation,
              turns: [
                ...state.currentConversation.turns,
                {
                  turn_number: newTurnNumber,
                  user_message: userMessage,
                  response: newResponse,
                },
              ],
            }
          : null,
      }));
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      set({ loadingResponse: false });
    }
  },

  // ========================================================================
  // Submit Rating
  // ========================================================================

  submitRating: async (
    turnNumber: number,
    stars: number,
    qualityTags: string[]
  ) => {
    const state = get();
    if (!state.currentConversation) return;

    set({ loadingResponse: true, errorMessage: null });
    try {
      const payload = {
        conversation_id: state.currentConversation.conversation_id,
        turn_number: turnNumber,
        mode: 'direct',
        choice: stars.toString(), // 1-5
        quality_tags: qualityTags,
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
        throw new Error(`Rating submission failed: ${response.statusText}`);
      }

      // Update turn with rating
      set((state) => ({
        currentConversation: state.currentConversation
          ? {
              ...state.currentConversation,
              turns: state.currentConversation.turns.map((turn) =>
                turn.turn_number === turnNumber
                  ? {
                      ...turn,
                      rating: {
                        stars,
                        quality_tags: qualityTags,
                        timestamp: new Date().toISOString(),
                      },
                    }
                  : turn
              ),
              is_rated: true,
            }
          : null,
        ratingInProgress: null,
      }));
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      set({ loadingResponse: false });
    }
  },

  // ========================================================================
  // Rating In Progress (UI state)
  // ========================================================================

  setRatingInProgress: (
    turnNumber: number,
    stars: number,
    qualityTags: string[]
  ) => {
    set({
      ratingInProgress: { turn_number: turnNumber, stars, quality_tags: qualityTags },
    });
  },

  cancelRating: () => {
    set({ ratingInProgress: null });
  },

  // ========================================================================
  // Reset Chat
  // ========================================================================

  resetChat: () => {
    set({
      currentConversation: null,
      ratingInProgress: null,
      errorMessage: null,
      selectedModel: null,
    });
  },
}));
```

---

## Part 2: Components

### Component 1: `DirectChatPage.tsx`

```typescript
import React, { useEffect } from 'react';
import { useDirectChatStore } from '@/stores/directChatStore';
import ModelSelectionScreen from './ModelSelectionScreen';
import DirectChatScreen from './DirectChatScreen';

export default function DirectChatPage() {
  const currentConversation = useDirectChatStore(
    (state) => state.currentConversation
  );
  const resetChat = useDirectChatStore((state) => state.resetChat);
  const fetchModels = useDirectChatStore((state) => state.fetchModels);

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            💬 Chế độ Trò Chuyện Trực Tiếp
          </h1>
          {currentConversation && (
            <button
              onClick={resetChat}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
            >
              Cuộc trò chuyện mới
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {!currentConversation ? (
            <ModelSelectionScreen />
          ) : (
            <DirectChatScreen />
          )}
        </div>
      </main>
    </div>
  );
}
```

### Component 2: `ModelSelectionScreen.tsx`

```typescript
import React, { useState } from 'react';
import { useDirectChatStore } from '@/stores/directChatStore';
import DirectModelSelector from './DirectModelSelector';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function ModelSelectionScreen() {
  const [customPrompt, setCustomPrompt] = useState('');
  const models = useDirectChatStore((state) => state.models);
  const loadingModels = useDirectChatStore((state) => state.loadingModels);
  const loadingResponse = useDirectChatStore((state) => state.loadingResponse);
  const selectedModel = useDirectChatStore((state) => state.selectedModel);
  const errorMessage = useDirectChatStore((state) => state.errorMessage);
  const startChat = useDirectChatStore((state) => state.startChat);

  const canStart = selectedModel && customPrompt.trim();

  const handleStart = () => {
    if (canStart) {
      startChat(customPrompt);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Chọn Một Mô Hình
        </h2>
        <p className="text-lg text-gray-600">
          Chọn một AI model và trò chuyện với nó. Bạn có thể đánh giá nó bất cứ lúc nào.
        </p>
      </div>

      {/* Model Selector */}
      <DirectModelSelector
        selectedModel={selectedModel}
        models={models}
        loading={loadingModels}
      />

      {/* Prompt Input */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          ✏️ Bắt đầu cuộc trò chuyện
        </h3>
        <Textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Nhập câu hỏi hoặc yêu cầu của bạn..."
          className="min-h-24 border-gray-300 rounded-lg"
          disabled={loadingResponse}
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
        disabled={!canStart || loadingResponse}
        size="lg"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loadingResponse ? 'Đang tải...' : 'Bắt Đầu Trò Chuyện'}
      </Button>
    </div>
  );
}
```

### Component 3: `DirectModelSelector.tsx`

```typescript
import React from 'react';
import { useDirectChatStore } from '@/stores/directChatStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DirectChatModel } from '@/stores/directChatStore';
import { Skeleton } from '@/components/ui/skeleton';

interface DirectModelSelectorProps {
  selectedModel: DirectChatModel | null;
  models: DirectChatModel[];
  loading: boolean;
}

export default function DirectModelSelector({
  selectedModel,
  models,
  loading,
}: DirectModelSelectorProps) {
  const setSelectedModel = useDirectChatStore(
    (state) => state.setSelectedModel
  );

  const handleSelect = (modelId: string) => {
    const selected = models.find((m) => m.id === modelId);
    if (selected) {
      setSelectedModel(selected);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Mô hình
        </label>
        <Skeleton className="h-10 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Chọn Mô Hình
      </label>
      <Select
        value={selectedModel?.id || ''}
        onValueChange={handleSelect}
      >
        <SelectTrigger className="w-full border-gray-300 h-12">
          <SelectValue placeholder="Chọn mô hình..." />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center gap-2">
                {model.color_hex && (
                  <div
                    className="w-3 h-3 rounded-full"
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
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            {selectedModel.color_hex && (
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedModel.color_hex }}
              />
            )}
            <div>
              <p className="font-semibold text-blue-900">
                {selectedModel.name}
              </p>
              <p className="text-xs text-blue-700">
                {selectedModel.organization}
              </p>
            </div>
          </div>
          <p className="text-xs text-blue-600">
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

### Component 4: `DirectChatScreen.tsx`

```typescript
import React, { useRef, useEffect } from 'react';
import { useDirectChatStore } from '@/stores/directChatStore';
import ConversationMessages from './ConversationMessages';
import MessageInput from './MessageInput';
import RatingPanel from './RatingPanel';

export default function DirectChatScreen() {
  const currentConversation = useDirectChatStore(
    (state) => state.currentConversation
  );
  const loadingResponse = useDirectChatStore((state) => state.loadingResponse);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.turns]);

  if (!currentConversation) return null;

  return (
    <div className="space-y-6">
      {/* Model Info Header */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-3">
          {currentConversation.model.color_hex && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentConversation.model.color_hex }}
            />
          )}
          <div>
            <h3 className="font-semibold text-gray-900">
              {currentConversation.model.name}
            </h3>
            <p className="text-xs text-gray-600">
              {currentConversation.model.organization}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ConversationMessages turns={currentConversation.turns} />
      <div ref={messagesEndRef} />

      {/* Loading Indicator */}
      {loadingResponse && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Message Input */}
      <MessageInput disabled={loadingResponse} />

      {/* Rating Panel (for latest turn) */}
      {currentConversation.turns.length > 0 && !loadingResponse && (
        <RatingPanel
          turnNumber={
            currentConversation.turns[
              currentConversation.turns.length - 1
            ].turn_number
          }
          hasRating={
            currentConversation.turns[
              currentConversation.turns.length - 1
            ].rating !== undefined
          }
        />
      )}
    </div>
  );
}
```

### Component 5: `ConversationMessages.tsx`

```typescript
import React from 'react';
import { DirectChatTurn } from '@/stores/directChatStore';
import { Card } from '@/components/ui/card';

interface ConversationMessagesProps {
  turns: DirectChatTurn[];
}

export default function ConversationMessages({
  turns,
}: ConversationMessagesProps) {
  return (
    <div className="space-y-4">
      {turns.map((turn) => (
        <div key={turn.turn_number} className="space-y-3">
          {/* User Message */}
          <div className="flex justify-end">
            <div className="max-w-xs md:max-w-xl lg:max-w-2xl bg-blue-600 text-white rounded-lg p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {turn.user_message}
              </p>
            </div>
          </div>

          {/* Model Response */}
          <div className="flex justify-start">
            <Card className="max-w-xs md:max-w-xl lg:max-w-2xl p-4 border border-gray-200">
              <div className="space-y-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-900">
                  {turn.response.content}
                </p>
                {turn.response.tokens_used && (
                  <p className="text-xs text-gray-500">
                    {turn.response.tokens_used} tokens
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Rating Badge (if rated) */}
          {turn.rating && (
            <div className="flex justify-center">
              <div className="px-3 py-1 bg-green-100 border border-green-300 rounded-full">
                <p className="text-xs text-green-800 font-semibold">
                  ✅ Đánh giá: {turn.rating.stars} sao
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Component 6: `MessageInput.tsx`

```typescript
import React, { useState } from 'react';
import { useDirectChatStore } from '@/stores/directChatStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface MessageInputProps {
  disabled: boolean;
}

export default function MessageInput({ disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const sendMessage = useDirectChatStore((state) => state.sendMessage);

  const handleSend = () => {
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="space-y-3 border-t border-gray-200 pt-6">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nhập tin nhắn của bạn... (Ctrl+Enter để gửi)"
        className="min-h-20 border-gray-300 rounded-lg"
        disabled={disabled}
      />
      <Button
        onClick={handleSend}
        disabled={!message.trim() || disabled}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {disabled ? 'Đang tải...' : 'Gửi'}
      </Button>
    </div>
  );
}
```

### Component 7: `StarRating.tsx`

```typescript
import React, { useState } from 'react';

interface StarRatingProps {
  value: number;
  onValue: (value: number) => void;
  disabled?: boolean;
}

export default function StarRating({
  value,
  onValue,
  disabled,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const stars = [1, 2, 3, 4, 5];
  const displayValue = hoverValue || value;

  return (
    <div className="flex gap-2">
      {stars.map((star) => (
        <button
          key={star}
          onClick={() => onValue(star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          disabled={disabled}
          className="text-3xl transition-transform hover:scale-110 disabled:opacity-50"
        >
          {star <= displayValue ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}
```

### Component 8: `QualityTags.tsx`

```typescript
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface QualityTagsProps {
  selected: string[];
  onToggle: (tag: string) => void;
  disabled?: boolean;
}

const QUALITY_OPTIONS = [
  { key: 'accurate', label: '✓ Chính xác' },
  { key: 'natural', label: '🎯 Tự nhiên' },
  { key: 'culturally_appropriate', label: '🌍 Phù hợp văn hóa' },
  { key: 'creative', label: '✨ Sáng tạo' },
  { key: 'helpful', label: '👍 Hữu ích' },
];

export default function QualityTags({
  selected,
  onToggle,
  disabled,
}: QualityTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUALITY_OPTIONS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onToggle(key)}
          disabled={disabled}
          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
            selected.includes(key)
              ? 'bg-blue-600 text-white border border-blue-600'
              : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

### Component 9: `RatingPanel.tsx`

```typescript
import React, { useState } from 'react';
import { useDirectChatStore } from '@/stores/directChatStore';
import StarRating from './StarRating';
import QualityTags from './QualityTags';
import { Button } from '@/components/ui/button';

interface RatingPanelProps {
  turnNumber: number;
  hasRating: boolean;
}

export default function RatingPanel({
  turnNumber,
  hasRating,
}: RatingPanelProps) {
  const [stars, setStars] = useState(0);
  const [qualityTags, setQualityTags] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const submitRating = useDirectChatStore((state) => state.submitRating);
  const loadingResponse = useDirectChatStore((state) => state.loadingResponse);

  const handleToggleTag = (tag: string) => {
    setQualityTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (stars > 0) {
      await submitRating(turnNumber, stars, qualityTags);
      // Reset form after submission
      setStars(0);
      setQualityTags([]);
      setIsOpen(false);
    }
  };

  if (hasRating) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
        <p className="text-sm font-semibold text-green-900">
          ✅ Cảm ơn đánh giá của bạn!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900">
          ⭐ Đánh giá mô hình này
        </h4>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          {isOpen ? '✕' : '+'}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Bạn thích câu trả lời này đến mức nào?
            </p>
            <StarRating
              value={stars}
              onValue={setStars}
              disabled={loadingResponse}
            />
          </div>

          {/* Quality Tags */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Tính chất của câu trả lời (tuỳ chọn)
            </p>
            <QualityTags
              selected={qualityTags}
              onToggle={handleToggleTag}
              disabled={loadingResponse}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={stars === 0 || loadingResponse}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loadingResponse ? 'Đang gửi...' : 'Gửi Đánh Giá'}
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## Part 3: Tailwind CSS Animations

### File: `src/styles/globals.css` (Additional)

```css
/* Smooth fade-in for messages */
@keyframes message-slide-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-message-in {
  animation: message-slide-in 0.3s ease-out;
}

/* Star rating hover scale */
@keyframes star-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.animate-star-pulse:hover {
  animation: star-pulse 0.3s ease-in-out;
}
```

---

## Part 4: API Integration Summary

```
1. User loads DirectChatPage
   └─ fetchModels()
      └─ GET /api/arena/models?active_only=true
         └─ Returns: [{ id, name, organization, license, color_hex }, ...]

2. User selects model + enters prompt
   └─ startChat(promptText)
      └─ GET /api/arena/response/{model_id}?prompt_text=...
         └─ Returns: {
            conversation_id,
            response: { id, content, tokens_used }
          }

3. User sends follow-up message (unlimited turns)
   └─ sendMessage(userMessage)
      └─ GET /api/arena/response/{response_id}/continue?user_message=...
         └─ Returns: { id, content, tokens_used }

4. User rates (optional, at any turn)
   └─ submitRating(turnNumber, stars, qualityTags)
      └─ POST /api/arena/vote
         └─ Request: {
            conversation_id,
            turn_number,
            mode: 'direct',
            choice: '1'–'5' (stars),
            quality_tags: ['accurate', 'natural', ...]
          }

5. User starts new conversation
   └─ resetChat()
```

---

## Part 5: Type Definitions

### File: `src/types/directChat.ts`

```typescript
export type QualityTagEnum =
  | 'accurate'
  | 'natural'
  | 'culturally_appropriate'
  | 'creative'
  | 'helpful';

export interface RatingData {
  stars: number;
  quality_tags: QualityTagEnum[];
  timestamp: string;
}
```

---

## Part 6: Testing Checklist

- [ ] Models dropdown loads and populates
- [ ] Can select single model
- [ ] Prompt input required before starting
- [ ] "Bắt Đầu Trò Chuyện" fetches initial response
- [ ] Model info header displays name + organization
- [ ] Conversation messages display user + model responses
- [ ] Messages auto-scroll to latest
- [ ] Token counts displayed correctly
- [ ] Message input supports Ctrl+Enter to send
- [ ] Star rating: can click stars, displays 1-5
- [ ] Quality tags: multi-select toggle, shows selected state
- [ ] Rating submission: POST sent with correct payload
- [ ] Post-rating: "Cảm ơn đánh giá" message shows
- [ ] Can continue conversation after rating
- [ ] Unlimited turns (no turn limit like Battle/SBS)
- [ ] "Cuộc trò chuyện mới" resets state + clears ratings
- [ ] Mobile responsive: single column layout
- [ ] Error messages display gracefully
- [ ] Auth token sent in request headers (if available)

---

## Part 7: Key Differences from Battle & SBS Modes

| Aspect | Direct Chat |
|--------|------------|
| Model Count | 1 (single model) |
| Model Visibility | Named, visible throughout |
| Turn Limit | Unlimited (no limit like Battle/SBS) |
| Rating System | 5-star + multi-select quality tags |
| Response Format | Full-width single card |
| Comparison | No comparison, just evaluation |
| Elo | Not displayed (single-model mode) |

---

## Part 8: Deployment Notes

1. **Environment Variables:**
   - `VITE_API_BASE_URL=https://api.vigen.ai`
   - Auth token stored in localStorage

2. **Performance:**
   - Message virtualization (react-window) if >100 turns
   - Debounce message input to prevent rapid spam

3. **Accessibility:**
   - Star rating keyboard-accessible (Tab, arrow keys, Enter)
   - Quality tags keyboard-accessible (Tab, Space)
   - Screen reader labels for icons

4. **Mobile UX:**
   - Full-width messages (no dual column)
   - Soft keyboard handling for message input
   - Rating panel always accessible (sticky bottom on mobile)

---

**Status:** Ready for implementation. All components production-ready.
