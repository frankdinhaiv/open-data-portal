"""Pydantic models for all request/response types."""

from __future__ import annotations

import enum
from datetime import datetime

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ConversationMode(str, enum.Enum):
    BATTLE = "battle"          # Anonymous A/B, models hidden until vote
    SIDE_BY_SIDE = "sbs"       # Named A/B, models visible
    DIRECT = "direct"          # Single-model chat


class VoteChoice(str, enum.Enum):
    MODEL_A = "model_a"
    MODEL_B = "model_b"
    TIE = "tie"
    BOTH_BAD = "both_bad"


class PromptCategory(str, enum.Enum):
    KNOWLEDGE = "knowledge"
    REASONING = "reasoning"
    CULTURAL = "cultural"
    CREATIVE = "creative"
    CODING = "coding"
    INSTRUCTION = "instruction"


class EloMode(str, enum.Enum):
    BATCH = "batch"
    REALTIME = "realtime"


# ---------------------------------------------------------------------------
# Model (LLM)
# ---------------------------------------------------------------------------

class ModelInfo(BaseModel):
    id: str
    name: str
    provider: str
    display_name: str
    elo_rating: float = 1000.0
    total_battles: int = 0
    win_rate: float = 0.0
    is_active: bool = True


class ModelListResponse(BaseModel):
    models: list[ModelInfo]


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

class PromptItem(BaseModel):
    id: int
    text: str
    category: PromptCategory


class PromptListResponse(BaseModel):
    prompts: list[PromptItem]


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------

class CreateConversationRequest(BaseModel):
    mode: ConversationMode
    prompt: str = Field(..., min_length=1, max_length=4000)
    model_a: str | None = None   # Optional — server picks if not set (battle)
    model_b: str | None = None   # Optional — server picks if not set (battle)
    model_id: str | None = None  # For direct chat mode


class CreateConversationResponse(BaseModel):
    conversation_id: str
    mode: ConversationMode
    model_a: str | None = None
    model_b: str | None = None
    model_id: str | None = None


class TurnRequest(BaseModel):
    """Append a multi-turn follow-up to an existing conversation."""
    prompt: str = Field(..., min_length=1, max_length=4000)


class ResponseItem(BaseModel):
    model_id: str
    model_display_name: str
    position: str  # "a" or "b" or "single"
    content: str
    latency_ms: int | None = None
    token_count: int | None = None
    turn_number: int = 1


class ConversationDetail(BaseModel):
    conversation_id: str
    mode: ConversationMode
    model_a: str | None = None
    model_b: str | None = None
    model_id: str | None = None
    turns: list[TurnDetail] = []
    created_at: datetime | None = None


class TurnDetail(BaseModel):
    turn_number: int
    prompt: str
    responses: list[ResponseItem] = []
    vote: VoteChoice | None = None


# ---------------------------------------------------------------------------
# Votes
# ---------------------------------------------------------------------------

class VoteRequest(BaseModel):
    choice: VoteChoice
    turn_number: int = 1


class VoteResponse(BaseModel):
    """Response after voting — reveals model identities in battle mode."""
    conversation_id: str
    choice: VoteChoice
    model_a: str
    model_a_display_name: str
    model_b: str
    model_b_display_name: str
    elo_change_a: float | None = None
    elo_change_b: float | None = None


# ---------------------------------------------------------------------------
# Direct Ratings (single-model chat)
# ---------------------------------------------------------------------------

class DirectRatingRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    turn_number: int = 1


class DirectRatingResponse(BaseModel):
    conversation_id: str
    model_id: str
    rating: int


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

class LeaderboardEntry(BaseModel):
    rank: int
    model_id: str
    display_name: str
    provider: str
    elo_rating: float
    total_battles: int
    win_rate: float
    ci_lower: float | None = None
    ci_upper: float | None = None


class PairwiseStat(BaseModel):
    model_a: str
    model_b: str
    wins_a: int
    wins_b: int
    ties: int
    total: int
    win_rate_a: float


class LeaderboardResponse(BaseModel):
    entries: list[LeaderboardEntry]
    last_updated: datetime | None = None
    total_votes: int = 0


class PairwiseResponse(BaseModel):
    stats: list[PairwiseStat]


class LeaderboardLiveMessage(BaseModel):
    """WebSocket message pushed to clients on leaderboard update."""
    type: str = "leaderboard_update"
    entries: list[LeaderboardEntry]
    total_votes: int = 0
    timestamp: datetime


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class SignupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    guest_session_id: str | None = None  # Link guest conversations on signup


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str


class UserProfile(BaseModel):
    user_id: str
    username: str
    email: str
    total_votes: int = 0
    total_conversations: int = 0
    created_at: datetime | None = None


# ---------------------------------------------------------------------------
# History (sidebar)
# ---------------------------------------------------------------------------

class HistoryItem(BaseModel):
    conversation_id: str
    mode: ConversationMode
    first_prompt: str
    model_a: str | None = None
    model_b: str | None = None
    model_id: str | None = None
    voted: bool = False
    created_at: datetime | None = None


class HistoryResponse(BaseModel):
    conversations: list[HistoryItem]
    total: int = 0
    page: int = 1
    per_page: int = 20


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    database: bool
    redis: bool
    version: str = "0.1.0"


# ---------------------------------------------------------------------------
# SSE Streaming
# ---------------------------------------------------------------------------

class StreamChunk(BaseModel):
    """A single SSE chunk for streaming LLM responses."""
    position: str  # "a", "b", or "single"
    content: str
    done: bool = False
    error: str | None = None
