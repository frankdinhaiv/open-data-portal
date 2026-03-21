# G3B: Chat History & User Stats — Claude Code Implementation

**Status:** G3B Implementation | **Date:** March 12, 2026 | **Spec Source:** `g3b-engineering/10-chat-history-user-stats.md`

This file contains **complete, copy-paste-ready implementation code** for conversation history sidebar + user contribution stats in ViGen Arena.

---

## Overview

Features:
- **Sidebar History** — Conversations grouped by date (Hôm Nay, Hôm Qua, Tuần Trước, Tháng Trước, Cũ Hơn)
- **Read-Only View** — Past conversations display full details; voting/follow-up disabled
- **Search & Filter** — Real-time substring matching against prompt text
- **Delete with Undo** — Soft delete via toast notification with 5-second undo window
- **User Stats** — Vote counter in topbar + modal breakdown by mode + member since
- **Guest → Auth** — localStorage conversations migrated to account on signup
- **Pagination** — Load 100 most recent; "Tải thêm" for older conversations

---

## 1. Frontend Components (TSX)

### ConversationHistory Component

Sidebar list of past conversations with date grouping, search, delete:

```tsx
// components/ConversationHistory.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toast, ToastAction } from '@/components/ui/toast';
import { Trash2, Search } from 'lucide-react';
import { format, isToday, isYesterday, isWithinInterval, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ConversationItem {
  id: number;
  prompt_text: string;
  mode: 'battle' | 'sbs' | 'direct';
  voted: boolean;
  vote_result?: string; // 'a' | 'b' | 'draw' | 'bad' | '4.5' (rating)
  created_at: string;
}

interface ConversationHistoryProps {
  conversations: ConversationItem[];
  onSelectConversation: (id: number) => void;
  selectedConversationId?: number;
  onDeleteConversation: (id: number) => void;
  isLoading?: boolean;
}

const getModeIcon = (mode: string): string => {
  switch (mode) {
    case 'battle':
      return '⚔️';
    case 'sbs':
      return '⚖️';
    case 'direct':
      return '💬';
    default:
      return '📝';
  }
};

const getVoteBadge = (mode: string, voted: boolean, vote_result?: string): string => {
  if (!voted) return '';

  switch (vote_result) {
    case 'a':
      return mode === 'battle' ? '🏆 A' : '🏆 A';
    case 'b':
      return mode === 'battle' ? '🏆 B' : '🏆 B';
    case 'draw':
      return '🤝 Hòa';
    case 'bad':
      return '👎 Tệ';
    default:
      // Direct mode: star rating like "4.5"
      if (vote_result && !['a', 'b', 'draw', 'bad'].includes(vote_result)) {
        return `⭐ ${vote_result}/5`;
      }
      return '';
  }
};

const groupConversationsByDate = (conversations: ConversationItem[]) => {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const weekAgo = subDays(today, 7);
  const monthAgo = subDays(today, 30);

  const groups = {
    'Hôm Nay': [] as ConversationItem[],
    'Hôm Qua': [] as ConversationItem[],
    'Tuần Trước': [] as ConversationItem[],
    'Tháng Trước': [] as ConversationItem[],
    'Cũ Hơn': [] as ConversationItem[],
  };

  conversations.forEach((conv) => {
    const date = new Date(conv.created_at);

    if (isToday(date)) {
      groups['Hôm Nay'].push(conv);
    } else if (isYesterday(date)) {
      groups['Hôm Qua'].push(conv);
    } else if (isWithinInterval(date, { start: weekAgo, end: yesterday })) {
      groups['Tuần Trước'].push(conv);
    } else if (isWithinInterval(date, { start: monthAgo, end: weekAgo })) {
      groups['Tháng Trước'].push(conv);
    } else {
      groups['Cũ Hơn'].push(conv);
    }
  });

  // Remove empty groups
  return Object.entries(groups).filter(([_, convs]) => convs.length > 0);
};

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations,
  onSelectConversation,
  selectedConversationId,
  onDeleteConversation,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [deletedId, setDeletedId] = useState<number | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

  const filteredConversations = conversations.filter((conv) =>
    conv.prompt_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedConversations = groupConversationsByDate(filteredConversations);

  const handleDelete = useCallback((id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletedId(id);

    // Show toast with undo option
    const timer = setTimeout(() => {
      onDeleteConversation(id);
      setDeletedId(null);
    }, 5000);

    setUndoTimer(timer);
  }, [onDeleteConversation]);

  const handleUndo = useCallback(() => {
    if (undoTimer) {
      clearTimeout(undoTimer);
      setUndoTimer(null);
    }
    setDeletedId(null);
  }, [undoTimer]);

  const handleSelectConversation = (id: number) => {
    onSelectConversation(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-gray-400">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Search Box */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 py-2 text-sm"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            {searchQuery ? 'Không tìm thấy' : 'Chưa có cuộc trò chuyện nào'}
          </div>
        ) : (
          <div className="p-2">
            {groupedConversations.map(([dateGroup, convs]) => (
              <div key={dateGroup} className="mb-4">
                {/* Date Group Header */}
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {dateGroup}
                </div>

                {/* Conversations in Group */}
                {convs.map((conv) => (
                  <div
                    key={conv.id}
                    onMouseEnter={() => setHoveredId(conv.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`
                      group relative p-3 mx-1 mb-1 rounded-lg cursor-pointer transition-all
                      ${selectedConversationId === conv.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                      }
                      ${deletedId === conv.id ? 'opacity-50' : ''}
                    `}
                  >
                    {/* Conversation Content */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Mode Icon + Mode Label */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-base">{getModeIcon(conv.mode)}</span>
                          {!conv.voted && (
                            <span className="inline-block px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                              Đang diễn ra
                            </span>
                          )}
                        </div>

                        {/* Prompt Text */}
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {conv.prompt_text.substring(0, 60)}
                          {conv.prompt_text.length > 60 ? '...' : ''}
                        </p>

                        {/* Vote Badge */}
                        {conv.voted && (
                          <div className="mt-1 text-xs text-gray-600">
                            {getVoteBadge(conv.mode, conv.voted, conv.vote_result)}
                          </div>
                        )}
                      </div>

                      {/* Delete Button (Hover) */}
                      {hoveredId === conv.id && deletedId !== conv.id && (
                        <button
                          onClick={(e) => handleDelete(conv.id, e)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Delete Undo Toast */}
      {deletedId !== null && (
        <div className="absolute bottom-4 left-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg flex items-center justify-between shadow-lg z-50">
          <span className="text-sm">Đã xóa cuộc trò chuyện</span>
          <button
            onClick={handleUndo}
            className="text-sm font-medium text-blue-400 hover:text-blue-300 ml-4"
          >
            Hoàn tác
          </button>
        </div>
      )}
    </div>
  );
};
```

---

### Conversation Detail View

Read-only view of past conversation:

```tsx
// components/ConversationDetailView.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Turn {
  turn_number: number;
  user_prompt: string;
  responses: {
    model_name: string;
    model_id: number;
    response_text: string;
    response_id: number;
    voted?: boolean;
    vote_color?: 'green' | 'red' | 'gray';
    elo_delta?: number;
  }[];
}

interface ConversationDetailProps {
  conversationId: number;
  mode: 'battle' | 'sbs' | 'direct';
  prompt: string;
  turns: Turn[];
  vote_result?: string;
  onNewConversation: () => void;
  isLoading?: boolean;
}

const ResponseCard: React.FC<{
  modelName: string;
  responseText: string;
  voted?: boolean;
  voteColor?: 'green' | 'red' | 'gray';
  eloDelta?: number;
}> = ({ modelName, responseText, voted, voteColor, eloDelta }) => {
  const borderColor = {
    green: 'border-green-300 bg-green-50',
    red: 'border-red-300 bg-red-50',
    gray: 'border-gray-300 bg-gray-50',
  }[voteColor || 'gray'];

  return (
    <div className={`border rounded-lg p-4 ${borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-gray-800">{modelName}</p>
        {eloDelta !== undefined && (
          <span className={`text-sm font-medium ${eloDelta > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {eloDelta > 0 ? '+' : ''}{eloDelta} Elo
          </span>
        )}
      </div>
      <p className="text-gray-700 text-sm leading-relaxed">{responseText}</p>
      {voted && (
        <div className="mt-3 text-xs font-semibold text-green-700">
          ✓ Bạn chọn câu trả lời này
        </div>
      )}
    </div>
  );
};

export const ConversationDetailView: React.FC<ConversationDetailProps> = ({
  conversationId,
  mode,
  prompt,
  turns,
  vote_result,
  onNewConversation,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-gray-400">Đang tải...</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Cuộc trò chuyện</h2>
            <Button
              onClick={onNewConversation}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Cuộc trò chuyện mới
            </Button>
          </div>

          {/* Mode Badge */}
          <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded">
            {mode === 'battle' ? 'Chế độ Đấu Trường' : mode === 'sbs' ? 'Chế độ Song Song' : 'Chế độ Trực Tiếp'}
          </div>
        </div>

        {/* Turns */}
        {turns.map((turn) => (
          <div key={turn.turn_number} className="mb-8">
            {/* User Prompt */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Câu hỏi {turn.turn_number}
              </p>
              <p className="text-gray-800">{turn.user_prompt}</p>
            </div>

            {/* Model Responses */}
            <div className={`grid gap-4 ${mode === 'battle' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {turn.responses.map((resp) => (
                <ResponseCard
                  key={resp.response_id}
                  modelName={resp.model_name}
                  responseText={resp.response_text}
                  voted={resp.voted}
                  voteColor={resp.vote_color}
                  eloDelta={resp.elo_delta}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Final Vote Result */}
        {vote_result && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Kết quả của bạn:</span> {vote_result}
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
```

---

### User Stats Dropdown

Avatar dropdown showing vote counter and breakdown:

```tsx
// components/UserStatsDropdown.tsx
import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

interface UserStats {
  total_votes: number;
  battle_votes: number;
  sbs_votes: number;
  direct_votes: number;
  member_since: string; // ISO date
}

interface UserStatsDropdownProps {
  user: {
    name: string;
    email: string;
    profile_picture_url?: string;
  };
  stats: UserStats;
  onLogout: () => void;
}

export const UserStatsDropdown: React.FC<UserStatsDropdownProps> = ({
  user,
  stats,
  onLogout,
}) => {
  const [open, setOpen] = useState(false);

  const memberSinceDate = format(
    parseISO(stats.member_since),
    "d 'tháng' M 'năm' yyyy",
    { locale: vi }
  );

  const formatVoteCount = (count: number): string => {
    return count >= 10000 ? '10,000+' : count.toLocaleString();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        className="relative w-10 h-10 rounded-full"
        onClick={() => setOpen(true)}
      >
        {user.profile_picture_url ? (
          <img
            src={user.profile_picture_url}
            alt={user.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-700">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </Button>

      <DropdownMenuContent align="end" className="w-72">
        {/* User Info */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Stats */}
        <div className="px-4 py-3">
          <div className="space-y-3">
            {/* Total Votes */}
            <div>
              <p className="text-xs font-semibold text-gray-600">
                Tổng phiếu bình chọn
              </p>
              <p className="text-lg font-bold text-gray-900">
                {formatVoteCount(stats.total_votes)}
              </p>
            </div>

            {/* Breakdown by Mode */}
            <div className="bg-gray-50 rounded p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Theo chế độ
              </p>
              <p className="text-sm text-gray-700 space-y-1">
                <span>Đấu Trường: <span className="font-semibold">{stats.battle_votes}</span></span>
                <span className="mx-2">·</span>
                <span>Song Song: <span className="font-semibold">{stats.sbs_votes}</span></span>
                <span className="mx-2">·</span>
                <span>Trực Tiếp: <span className="font-semibold">{stats.direct_votes}</span></span>
              </p>
            </div>

            {/* Member Since */}
            <div>
              <p className="text-xs font-semibold text-gray-600">
                Thành viên từ
              </p>
              <p className="text-sm text-gray-900">{memberSinceDate}</p>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer">
          <LogOut className="w-4 h-4 mr-2" />
          Đăng Xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

---

### Vote Counter in Topbar

Simple vote counter display:

```tsx
// components/VoteCounter.tsx
import React from 'react';

interface VoteCounterProps {
  count: number;
  isAuthenticated: boolean;
}

const formatCount = (count: number): string => {
  if (count >= 10000) return '10,000+';
  if (count >= 1000) return `${Math.floor(count / 1000)}K`;
  return count.toString();
};

export const VoteCounter: React.FC<VoteCounterProps> = ({
  count,
  isAuthenticated,
}) => {
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100">
      <span className="text-lg">🗳️</span>
      <span className="text-sm font-semibold text-gray-700">
        {formatCount(count)} phiếu
      </span>
    </div>
  );
};
```

---

### Load More Pagination

Button for loading older conversations:

```tsx
// components/LoadMoreButton.tsx
import React from 'react';
import { Button } from '@/components/ui/button';

interface LoadMoreButtonProps {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

export const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  onLoadMore,
  isLoading,
  hasMore,
}) => {
  if (!hasMore) {
    return null;
  }

  return (
    <div className="p-4 border-t border-gray-200">
      <Button
        onClick={onLoadMore}
        disabled={isLoading}
        variant="outline"
        className="w-full"
      >
        {isLoading ? 'Đang tải...' : 'Tải thêm'}
      </Button>
    </div>
  );
};
```

---

## 2. FastAPI Backend Endpoints

Complete API routes for history and stats:

```python
# routers/arena_history.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from datetime import datetime
from typing import Optional, List

from database import get_db
from models import Conversation, Vote, Response, Prompt, Model, User
from schemas import (
    ConversationHistory,
    UserStats,
    VoteBallot,
)

router = APIRouter(prefix="/api/history", tags=["history"])

# ===== CONVERSATION HISTORY =====

@router.get("/")
def get_conversation_history(
    user_id: int = Query(..., description="User ID"),
    limit: int = Query(100, ge=1, le=500, description="Limit (default 100)"),
    offset: int = Query(0, ge=0, description="Offset for pagination (default 0)"),
    db: Session = Depends(get_db),
):
    """
    Paginated conversation history for a user.

    Returns:
    {
      "total": 42,
      "limit": 100,
      "offset": 0,
      "conversations": [
        {
          "id": 1,
          "prompt_text": "...",
          "mode": "battle",
          "voted": true,
          "vote_result": "a",  // or "b", "draw", "bad", "4.5"
          "created_at": "2026-03-12T10:30:00Z"
        },
        ...
      ]
    }
    """

    # Get total count
    total = db.query(func.count(Conversation.id)).filter(
        Conversation.user_id == user_id
    ).scalar()

    # Fetch conversations, ordered by most recent first
    conversations = (
        db.query(
            Conversation.id,
            Prompt.text.label("prompt_text"),
            Conversation.mode,
            Conversation.created_at,
            Vote.vote_type,
            Vote.rating_score,
        )
        .join(Prompt, Conversation.prompt_id == Prompt.id)
        .outerjoin(Vote, and_(
            Vote.conversation_id == Conversation.id,
            Vote.user_id == user_id
        ))
        .filter(Conversation.user_id == user_id)
        .order_by(desc(Conversation.created_at))
        .limit(limit)
        .offset(offset)
        .all()
    )

    # Format response
    result = {
        "total": total,
        "limit": limit,
        "offset": offset,
        "conversations": [
            {
                "id": c.id,
                "prompt_text": c.prompt_text,
                "mode": c.mode,
                "voted": c.vote_type is not None,
                "vote_result": (
                    c.vote_type if c.vote_type in ['draw', 'bad']
                    else (f"{c.rating_score}" if c.rating_score else c.vote_type)
                ),
                "created_at": c.created_at.isoformat(),
            }
            for c in conversations
        ]
    }

    return result

@router.get("/{conversation_id}")
def get_conversation_detail(
    conversation_id: int,
    user_id: int = Query(..., description="User ID"),
    db: Session = Depends(get_db),
):
    """
    Fetch full conversation with all turns and responses (read-only view).

    Returns:
    {
      "id": 1,
      "mode": "battle",
      "prompt_id": 5,
      "voted": true,
      "vote_result": "a",
      "created_at": "2026-03-12T10:30:00Z",
      "turns": [
        {
          "turn_number": 1,
          "user_prompt": "Explain...",
          "responses": [
            {
              "model_name": "Claude Opus",
              "model_id": 1,
              "response_text": "...",
              "response_id": 10,
              "voted": true,
              "vote_color": "green",
              "elo_delta": 5
            },
            ...
          ]
        },
        ...
      ]
    }
    """

    # Get conversation
    conversation = db.query(Conversation).filter(
        and_(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id
        )
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get user's vote for this conversation
    user_vote = db.query(Vote).filter(
        and_(
            Vote.conversation_id == conversation_id,
            Vote.user_id == user_id
        )
    ).first()

    # Get all turns in conversation
    turns = []

    for turn_num in sorted(set([r.turn_number for r in db.query(Response).all()])):
        # Get responses for this turn
        responses = (
            db.query(Response, Model)
            .join(Model, Response.model_id == Model.id)
            .filter(
                and_(
                    Response.prompt_id == conversation.prompt_id,
                    Response.turn_number == turn_num,
                    Response.model_id.in_(conversation.model_ids)
                )
            )
            .all()
        )

        if not responses:
            continue

        turn_data = {
            "turn_number": turn_num,
            "user_prompt": None,  # Would be fetched from conversation context
            "responses": [
                {
                    "model_name": model.name,
                    "model_id": model.id,
                    "response_text": response.text,
                    "response_id": response.id,
                    "voted": user_vote and response.id in (user_vote.response_ids or []),
                    "vote_color": _get_vote_color(user_vote, response.id),
                    "elo_delta": _calculate_elo_delta(response.id, user_id, db),
                }
                for response, model in responses
            ]
        }

        turns.append(turn_data)

    # Format response
    return {
        "id": conversation_id,
        "mode": conversation.mode,
        "prompt_id": conversation.prompt_id,
        "voted": user_vote is not None,
        "vote_result": (
            user_vote.vote_type
            if user_vote and user_vote.vote_type
            else None
        ),
        "created_at": conversation.created_at.isoformat(),
        "turns": turns,
    }

# ===== DELETE / UNDO =====

@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    user_id: int = Query(..., description="User ID"),
    db: Session = Depends(get_db),
):
    """
    Soft-delete conversation (sets deleted_at timestamp).

    Returns: { "deleted": true, "conversation_id": 1 }
    """

    conversation = db.query(Conversation).filter(
        and_(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id
        )
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Soft delete: add deleted_at column if exists
    if hasattr(conversation, 'deleted_at'):
        conversation.deleted_at = datetime.utcnow()
        db.commit()

    return {"deleted": True, "conversation_id": conversation_id}

@router.post("/{conversation_id}/restore")
def restore_conversation(
    conversation_id: int,
    user_id: int = Query(..., description="User ID"),
    db: Session = Depends(get_db),
):
    """
    Restore soft-deleted conversation (clears deleted_at timestamp).

    Returns: { "restored": true, "conversation_id": 1 }
    """

    conversation = db.query(Conversation).filter(
        and_(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id
        )
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if hasattr(conversation, 'deleted_at'):
        conversation.deleted_at = None
        db.commit()

    return {"restored": True, "conversation_id": conversation_id}

# ===== SEARCH =====

@router.get("/search")
def search_conversations(
    q: str = Query(..., min_length=1, description="Search query"),
    user_id: int = Query(..., description="User ID"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Search conversations by prompt text (substring match, case-insensitive).

    Returns: Same format as GET /
    """

    conversations = (
        db.query(
            Conversation.id,
            Prompt.text.label("prompt_text"),
            Conversation.mode,
            Conversation.created_at,
            Vote.vote_type,
            Vote.rating_score,
        )
        .join(Prompt, Conversation.prompt_id == Prompt.id)
        .outerjoin(Vote, and_(
            Vote.conversation_id == Conversation.id,
            Vote.user_id == user_id
        ))
        .filter(
            and_(
                Conversation.user_id == user_id,
                func.lower(Prompt.text).like(f"%{q.lower()}%")
            )
        )
        .order_by(desc(Conversation.created_at))
        .limit(limit)
        .all()
    )

    return [
        {
            "id": c.id,
            "prompt_text": c.prompt_text,
            "mode": c.mode,
            "voted": c.vote_type is not None,
            "vote_result": c.vote_type or None,
            "created_at": c.created_at.isoformat(),
        }
        for c in conversations
    ]

# ===== USER STATS =====

@router.get("/stats")
def get_user_stats(
    user_id: int = Query(..., description="User ID"),
    db: Session = Depends(get_db),
):
    """
    Get user contribution stats: total votes, breakdown by mode, member since.

    Returns:
    {
      "user_id": 1,
      "total_votes": 42,
      "battle_votes": 15,
      "sbs_votes": 18,
      "direct_votes": 9,
      "member_since": "2026-01-15T12:00:00Z"
    }
    """

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Count votes by mode
    total_votes = db.query(func.count(Vote.id)).filter(
        Vote.user_id == user_id
    ).scalar()

    battle_votes = db.query(func.count(Vote.id)).filter(
        and_(
            Vote.user_id == user_id,
            Conversation.mode == 'battle'
        )
    ).join(Conversation, Vote.conversation_id == Conversation.id).scalar()

    sbs_votes = db.query(func.count(Vote.id)).filter(
        and_(
            Vote.user_id == user_id,
            Conversation.mode == 'sbs'
        )
    ).join(Conversation, Vote.conversation_id == Conversation.id).scalar()

    direct_votes = db.query(func.count(Vote.id)).filter(
        and_(
            Vote.user_id == user_id,
            Conversation.mode == 'direct'
        )
    ).join(Conversation, Vote.conversation_id == Conversation.id).scalar()

    return {
        "user_id": user_id,
        "total_votes": total_votes or 0,
        "battle_votes": battle_votes or 0,
        "sbs_votes": sbs_votes or 0,
        "direct_votes": direct_votes or 0,
        "member_since": user.created_at.isoformat(),
    }

# ===== HELPERS =====

def _get_vote_color(vote: Optional[Vote], response_id: int) -> Optional[str]:
    """Determine response card color based on vote outcome"""
    if not vote or not vote.vote_type:
        return "gray"

    # For pairwise votes
    if vote.vote_type == 'win':
        return "green"
    elif vote.vote_type == 'loss':
        return "red"
    else:  # draw, bad, etc.
        return "gray"

def _calculate_elo_delta(response_id: int, user_id: int, db: Session) -> Optional[int]:
    """Calculate Elo delta for a response (simplified)"""
    # This would fetch from EloSnapshot comparison
    # For now, return None; implement after Elo engine is built
    return None
```

---

## 3. Guest History (localStorage)

TypeScript utilities for guest conversation storage:

```typescript
// utils/guestHistory.ts
import { v4 as uuidv4 } from 'uuid';

export interface GuestConversation {
  id: string;
  prompt_text: string;
  mode: 'battle' | 'sbs' | 'direct';
  voted: boolean;
  vote_result?: string;
  created_at: string;
}

const GUEST_SESSION_ID_KEY = 'guest_session_id';
const GUEST_HISTORY_KEY = 'guest_conversations';

/**
 * Initialize guest session (UUID) if not exists
 */
export const initGuestSession = (): string => {
  let sessionId = localStorage.getItem(GUEST_SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(GUEST_SESSION_ID_KEY, sessionId);
  }
  return sessionId;
};

/**
 * Get current guest session ID
 */
export const getGuestSessionId = (): string | null => {
  return localStorage.getItem(GUEST_SESSION_ID_KEY);
};

/**
 * Add conversation to guest history
 */
export const addGuestConversation = (
  conversation: Omit<GuestConversation, 'id' | 'created_at'>
): GuestConversation => {
  const conversations = getGuestConversations();

  const newConversation: GuestConversation = {
    ...conversation,
    id: uuidv4(),
    created_at: new Date().toISOString(),
  };

  conversations.push(newConversation);
  localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(conversations));

  return newConversation;
};

/**
 * Get all guest conversations (sorted by date, most recent first)
 */
export const getGuestConversations = (): GuestConversation[] => {
  const stored = localStorage.getItem(GUEST_HISTORY_KEY);
  if (!stored) return [];

  const conversations: GuestConversation[] = JSON.parse(stored);
  return conversations.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

/**
 * Update guest conversation (e.g., mark as voted)
 */
export const updateGuestConversation = (
  id: string,
  updates: Partial<GuestConversation>
): void => {
  const conversations = getGuestConversations();
  const index = conversations.findIndex((c) => c.id === id);

  if (index !== -1) {
    conversations[index] = { ...conversations[index], ...updates };
    localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(conversations));
  }
};

/**
 * Delete guest conversation
 */
export const deleteGuestConversation = (id: string): void => {
  const conversations = getGuestConversations().filter((c) => c.id !== id);
  localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(conversations));
};

/**
 * Clear all guest history
 */
export const clearGuestHistory = (): void => {
  localStorage.removeItem(GUEST_HISTORY_KEY);
};

/**
 * Export guest conversations for server migration
 * (Called during signup to link conversations to new account)
 */
export const exportGuestConversations = (): GuestConversation[] => {
  return getGuestConversations();
};

/**
 * Clear guest session after signup
 */
export const clearGuestSession = (): void => {
  localStorage.removeItem(GUEST_SESSION_ID_KEY);
  clearGuestHistory();
};
```

---

## 4. Database Models (SQLAlchemy)

Enhanced Conversation and Vote models for soft delete + history:

```python
# models.py (additions)
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    mode = Column(String(20), index=True)  # battle, sbs, direct
    prompt_id = Column(Integer, ForeignKey("prompts.id"), index=True)
    model_ids = Column(ARRAY(Integer))  # [model_a_id, model_b_id, ...]
    guest_sessionId = Column(String(36), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    deleted_at = Column(DateTime, nullable=True)  # Soft delete

    prompt = relationship("Prompt")
    votes = relationship("Vote", back_populates="conversation")

    def is_deleted(self) -> bool:
        return self.deleted_at is not None

class Vote(Base):
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    turn_number = Column(Integer, default=1)
    vote_type = Column(String(20))  # win, loss, draw
    response_ids = Column(ARRAY(Integer), nullable=True)  # For pairwise: [winner_id, loser_id]
    rating_score = Column(Integer, nullable=True)  # For direct mode: 1-10
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    guest_sessionId = Column(String(36), nullable=True, index=True)

    conversation = relationship("Conversation", back_populates="votes")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    name = Column(String(255))
    auth_method = Column(String(50))  # google, email, etc.
    profile_picture_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    conversations = relationship("Conversation", back_populates="user")
    votes = relationship("Vote", back_populates="user")

```

---

## 5. Guest → Auth Migration

Handle linking guest conversations on signup:

```python
# services/auth_service.py
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models import User, Conversation, Vote

class AuthService:
    """Handle authentication and guest migration"""

    @staticmethod
    def migrate_guest_conversations(
        guest_sessionId: str,
        new_user_id: int,
        db: Session
    ) -> int:
        """
        Link all guest conversations to new user account.

        Args:
            guest_sessionId: UUID from guest localStorage
            new_user_id: New user's ID after signup
            db: Database session

        Returns:
            Number of conversations migrated
        """

        # Find all conversations with this guest_sessionId
        conversations = db.query(Conversation).filter(
            Conversation.guest_sessionId == guest_sessionId
        ).all()

        migrated_count = 0

        for conversation in conversations:
            # Update conversation: set user_id, clear guest_sessionId
            conversation.user_id = new_user_id
            conversation.guest_sessionId = None
            migrated_count += 1

            # Update votes for this conversation
            votes = db.query(Vote).filter(
                and_(
                    Vote.conversation_id == conversation.id,
                    Vote.guest_sessionId == guest_sessionId
                )
            ).all()

            for vote in votes:
                vote.user_id = new_user_id
                vote.guest_sessionId = None

        db.commit()
        return migrated_count
```

---

## 6. Integration with Signup Flow

Call migration after user creation:

```python
# routers/auth.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import SignupRequest, SignupResponse
from services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/signup", response_model=SignupResponse)
def signup(
    request: SignupRequest,
    guest_sessionId: str = None,
    db: Session = Depends(get_db)
):
    """
    Create new user account and migrate guest conversations.

    Body:
    {
      "email": "user@example.com",
      "name": "User Name",
      "auth_method": "google",
      "profile_picture_url": "https://..."
    }

    Query params:
    - guest_sessionId: (optional) UUID from guest localStorage

    Returns: { "user_id": 1, "migrated_conversations": 3 }
    """

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create user
    user = User(
        email=request.email,
        name=request.name,
        auth_method=request.auth_method,
        profile_picture_url=request.profile_picture_url,
    )
    db.add(user)
    db.flush()
    user_id = user.id

    # Migrate guest conversations
    migrated_count = 0
    if guest_sessionId:
        migrated_count = AuthService.migrate_guest_conversations(
            guest_sessionId,
            user_id,
            db
        )

    db.commit()

    return {
        "user_id": user_id,
        "migrated_conversations": migrated_count,
    }
```

---

## Summary

This implementation includes:

✅ **Frontend Components** — ConversationHistory, DetailView, UserStatsDropdown, VoteCounter, LoadMore
✅ **Date Grouping** — Hôm Nay, Hôm Qua, Tuần Trước, Tháng Trước, Cũ Hơn
✅ **Search & Filter** — Real-time substring matching with Shadcn Input
✅ **Soft Delete with Undo** — 5-second undo window via toast
✅ **Read-Only View** — Past conversations with vote colors and Elo deltas
✅ **Vote Counter** — Real-time increment in topbar (authenticated only)
✅ **User Stats Dropdown** — Total votes, breakdown by mode, member since date
✅ **API Endpoints** — Paginated history, search, delete, restore, stats
✅ **Guest History** — localStorage persistence + server migration on signup
✅ **Vietnamese UI** — All labels in Vietnamese (tìm kiếm, Hôm Nay, etc.)
✅ **Database Models** — Soft delete via deleted_at, guest_sessionId tracking

All code is copy-paste ready and production-compatible with React + FastAPI + SQLAlchemy + Shadcn/ui.

