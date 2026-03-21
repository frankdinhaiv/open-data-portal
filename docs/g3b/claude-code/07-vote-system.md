# G3B Claude Code: Vote System Implementation

**Covers:** P0-8 (Vote Persistence)
**Date:** March 12, 2026
**Format:** Complete implementation code (Python FastAPI + TypeScript React)
**Status:** Ready for engineering build
**Dependencies:** Database (PostgreSQL), Authentication (06-auth), Response Serving (09)

---

## Overview

This file provides **complete, production-ready code** for the vote submission endpoint, validation layer, guest vote storage, guest→account linking, data models, and frontend hook. Copy, customize for your stack, and deploy.

---

## 1. SQLAlchemy Data Models

**File: `backend/models/vote.py`**

```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, UniqueConstraint, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from enum import Enum

Base = declarative_base()

class VoteMode(str, Enum):
    BATTLE = "battle"
    SBS = "sbs"
    DIRECT = "direct"

class BattleChoice(str, Enum):
    A = "a"
    B = "b"
    TIE = "tie"
    BAD = "bad"

class Vote(Base):
    __tablename__ = "votes"

    id = Column(String(36), primary_key=True)  # UUID
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)  # Null for guest votes
    guest_session_id = Column(String(36), nullable=True)  # UUID for guest sessions

    turn_number = Column(Integer, nullable=False)  # Which turn in conversation
    mode = Column(String(20), nullable=False)  # "battle", "sbs", "direct"
    choice = Column(String(20), nullable=False)  # "a"|"b"|"tie"|"bad" (battle/sbs), "1"-"5" (direct)

    model_a_id = Column(String(36), ForeignKey("models.id"), nullable=True)
    model_b_id = Column(String(36), ForeignKey("models.id"), nullable=True)

    quality_tags = Column(JSON, nullable=True)  # ["accurate", "clear", "creative"] for direct mode

    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="votes")
    user = relationship("User", back_populates="votes")
    model_a = relationship("Model", foreign_keys=[model_a_id])
    model_b = relationship("Model", foreign_keys=[model_b_id])

    # Constraints
    __table_args__ = (
        UniqueConstraint("conversation_id", "turn_number", "user_id",
                        name="uq_vote_user_conversation_turn"),
        UniqueConstraint("conversation_id", "turn_number", "guest_session_id",
                        name="uq_vote_guest_conversation_turn"),
        Index("ix_votes_conversation_id", "conversation_id"),
        Index("ix_votes_user_id", "user_id"),
        Index("ix_votes_guest_session_id", "guest_session_id"),
        Index("ix_votes_created_at", "created_at"),
    )

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    guest_session_id = Column(String(36), nullable=True)
    mode = Column(String(20), nullable=False)  # "battle", "sbs", "direct"
    prompt_id = Column(String(36), ForeignKey("prompts.id"), nullable=False)
    model_ids = Column(JSON, nullable=False)  # [id1, id2] or [id1, id2, id3]
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    votes = relationship("Vote", back_populates="conversation", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    auth_method = Column(String(50), nullable=False)  # "google", "email"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    votes = relationship("Vote", back_populates="user")

class Model(Base):
    __tablename__ = "models"

    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    provider = Column(String(50), nullable=False)  # "anthropic", "openai", "google"
    status = Column(String(20), default="active")  # "active", "archived"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(String(36), primary_key=True)
    text = Column(String(2000), nullable=False)
    category = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
```

---

## 2. Pydantic Request/Response Schemas

**File: `backend/schemas/vote.py`**

```python
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class VoteChoice(str, Enum):
    A = "a"
    B = "b"
    TIE = "tie"
    BAD = "bad"

class VoteMode(str, Enum):
    BATTLE = "battle"
    SBS = "sbs"
    DIRECT = "direct"

class VoteCreate(BaseModel):
    conversation_id: str = Field(..., description="UUID of conversation")
    turn_number: int = Field(..., ge=1, description="Turn number (1-indexed)")
    choice: str = Field(..., description="Vote choice: a|b|tie|bad (battle/sbs) or 1-5 (direct)")
    mode: VoteMode = Field(..., description="battle|sbs|direct")
    model_a_id: Optional[str] = Field(None, description="Model A ID (battle/sbs mode)")
    model_b_id: Optional[str] = Field(None, description="Model B ID (battle/sbs mode)")
    quality_tags: Optional[List[str]] = Field(None, description="Tags for direct mode: accurate|clear|creative|unhelpful")
    session_id: Optional[str] = Field(None, description="Guest session ID (if unauthenticated)")

    @validator("choice")
    def validate_choice(cls, v, values):
        mode = values.get("mode")
        if mode in ["battle", "sbs"]:
            if v not in ["a", "b", "tie", "bad"]:
                raise ValueError("Choice must be a|b|tie|bad for battle/sbs mode")
        elif mode == "direct":
            if v not in ["1", "2", "3", "4", "5"]:
                raise ValueError("Choice must be 1-5 for direct mode")
        return v

    @validator("quality_tags")
    def validate_tags(cls, v):
        if v:
            valid_tags = {"accurate", "clear", "creative", "unhelpful"}
            if not all(tag in valid_tags for tag in v):
                raise ValueError(f"Tags must be subset of {valid_tags}")
        return v

class EloReveal(BaseModel):
    model_id: str
    model_name: str
    old_elo: int
    new_elo: int
    delta: int

class VoteResponse(BaseModel):
    vote_id: str
    conversation_id: str
    turn_number: int
    choice: str
    mode: str
    model_a_id: Optional[str]
    model_b_id: Optional[str]
    elo_reveal: Optional[List[EloReveal]] = None  # Real-time deltas for both models
    created_at: datetime

    class Config:
        from_attributes = True
```

---

## 3. Vote Submission Endpoint

**File: `backend/api/routers/votes.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import uuid
import logging

from backend.models.vote import Vote, Conversation, Model, User
from backend.schemas.vote import VoteCreate, VoteResponse, EloReveal
from backend.database import get_db
from backend.auth import get_current_user_or_guest
from backend.elo_engine import compute_elo_delta

router = APIRouter(prefix="/api/arena", tags=["votes"])
logger = logging.getLogger(__name__)

@router.post("/vote", response_model=VoteResponse, status_code=status.HTTP_201_CREATED)
async def submit_vote(
    vote_create: VoteCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """
    Submit a vote (battle, SBS, or direct rating).

    - Validates vote format
    - Deduplicates by (conversation_id, turn_number, user_id/guest_session_id)
    - Computes real-time Elo deltas for two models
    - Returns vote_id + elo_reveal for UI update
    """

    try:
        # Determine voter (user_id or guest_session_id)
        user_id = current_user.id if current_user else None
        guest_session_id = vote_create.session_id if not user_id else None

        if not user_id and not guest_session_id:
            raise HTTPException(status_code=400, detail="Must be authenticated or provide session_id")

        # Fetch conversation to validate it exists
        conversation = db.query(Conversation).filter_by(id=vote_create.conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Validate models exist
        if vote_create.mode in ["battle", "sbs"]:
            model_a = db.query(Model).filter_by(id=vote_create.model_a_id).first()
            model_b = db.query(Model).filter_by(id=vote_create.model_b_id).first()
            if not model_a or not model_b:
                raise HTTPException(status_code=400, detail="One or both models not found")

        # Check for existing vote (deduplication)
        existing_vote = None
        if user_id:
            existing_vote = db.query(Vote).filter_by(
                conversation_id=vote_create.conversation_id,
                turn_number=vote_create.turn_number,
                user_id=user_id
            ).first()
        else:
            existing_vote = db.query(Vote).filter_by(
                conversation_id=vote_create.conversation_id,
                turn_number=vote_create.turn_number,
                guest_session_id=guest_session_id
            ).first()

        # Overwrite existing vote or create new one
        vote_id = existing_vote.id if existing_vote else str(uuid.uuid4())

        if existing_vote:
            existing_vote.choice = vote_create.choice
            existing_vote.quality_tags = vote_create.quality_tags
            existing_vote.updated_at = datetime.utcnow()
            vote = existing_vote
            logger.info(f"Vote updated: {vote_id}")
        else:
            vote = Vote(
                id=vote_id,
                conversation_id=vote_create.conversation_id,
                user_id=user_id,
                guest_session_id=guest_session_id,
                turn_number=vote_create.turn_number,
                mode=vote_create.mode,
                choice=vote_create.choice,
                model_a_id=vote_create.model_a_id,
                model_b_id=vote_create.model_b_id,
                quality_tags=vote_create.quality_tags,
                user_agent=request.headers.get("User-Agent", ""),
            )
            db.add(vote)
            logger.info(f"Vote created: {vote_id}")

        # Compute real-time Elo deltas
        elo_reveal = None
        if vote_create.mode in ["battle", "sbs"]:
            elo_reveal = compute_elo_delta(
                vote_create.model_a_id,
                vote_create.model_b_id,
                vote_create.choice,
                db
            )

        db.commit()

        return VoteResponse(
            vote_id=vote.id,
            conversation_id=vote.conversation_id,
            turn_number=vote.turn_number,
            choice=vote.choice,
            mode=vote.mode,
            model_a_id=vote.model_a_id,
            model_b_id=vote.model_b_id,
            elo_reveal=elo_reveal,
            created_at=vote.created_at,
        )

    except IntegrityError as e:
        db.rollback()
        logger.error(f"Integrity error on vote submission: {e}")
        raise HTTPException(status_code=409, detail="Duplicate vote detected")
    except Exception as e:
        db.rollback()
        logger.error(f"Error submitting vote: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit vote")

@router.get("/votes/{conversation_id}", response_model=list[VoteResponse])
async def get_conversation_votes(
    conversation_id: str,
    db: Session = Depends(get_db),
):
    """Fetch all votes for a conversation."""
    votes = db.query(Vote).filter_by(conversation_id=conversation_id).all()
    return votes
```

---

## 4. Vote Validation & Rate Limiting Middleware

**File: `backend/middleware/rate_limit.py`**

```python
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from redis import Redis
import json

class RateLimitMiddleware:
    """Rate limit: max 100 votes per user per day."""

    def __init__(self, redis_client: Redis, votes_per_day: int = 100):
        self.redis = redis_client
        self.votes_per_day = votes_per_day

    async def __call__(self, request: Request, call_next):
        # Skip rate limiting for non-vote endpoints
        if "/api/arena/vote" not in request.url.path:
            return await call_next(request)

        if request.method != "POST":
            return await call_next(request)

        # Get user identifier
        user_id = None
        if hasattr(request.state, "user") and request.state.user:
            user_id = request.state.user.id
        elif hasattr(request.state, "guest_session_id"):
            user_id = f"guest:{request.state.guest_session_id}"

        if not user_id:
            return JSONResponse(
                status_code=400,
                content={"detail": "Unable to identify user for rate limiting"}
            )

        # Check rate limit
        rate_key = f"vote_rate:{user_id}:{datetime.utcnow().date()}"
        vote_count = self.redis.incr(rate_key)

        if vote_count == 1:
            # First vote of the day; set expiry
            self.redis.expire(rate_key, 86400)  # 24 hours

        if vote_count > self.votes_per_day:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": f"Rate limit exceeded. Max {self.votes_per_day} votes per day."}
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.votes_per_day)
        response.headers["X-RateLimit-Remaining"] = str(self.votes_per_day - vote_count)
        return response

# Usage in main.py:
# from redis import Redis
# redis = Redis(host="localhost", port=6379, db=0)
# app.add_middleware(RateLimitMiddleware, redis_client=redis, votes_per_day=100)
```

---

## 5. Guest Vote Storage & Offline Queue

**File: `frontend/hooks/useVote.ts`**

```typescript
import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

interface VotePayload {
  conversation_id: string;
  turn_number: number;
  choice: string;
  mode: "battle" | "sbs" | "direct";
  model_a_id?: string;
  model_b_id?: string;
  quality_tags?: string[];
  session_id?: string;
}

interface VoteQueueItem {
  id: string;
  payload: VotePayload;
  timestamp: number;
  retries: number;
}

interface EloReveal {
  model_id: string;
  model_name: string;
  old_elo: number;
  new_elo: number;
  delta: number;
}

interface VoteResponse {
  vote_id: string;
  conversation_id: string;
  turn_number: number;
  choice: string;
  mode: string;
  model_a_id?: string;
  model_b_id?: string;
  elo_reveal?: EloReveal[];
  created_at: string;
}

const VOTE_QUEUE_KEY = "arena_vote_queue";
const GUEST_SESSION_KEY = "arena_guest_session";
const MAX_QUEUE_SIZE = 1000;
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 seconds

export function useVote() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestSessionId, setGuestSessionId] = useState<string>("");

  // Initialize guest session on mount
  useEffect(() => {
    let sessionId = localStorage.getItem(GUEST_SESSION_KEY);
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem(GUEST_SESSION_KEY, sessionId);
    }
    setGuestSessionId(sessionId);
  }, []);

  // Get vote queue from localStorage
  const getVoteQueue = useCallback((): VoteQueueItem[] => {
    try {
      const queue = localStorage.getItem(VOTE_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch {
      return [];
    }
  }, []);

  // Save vote queue to localStorage
  const saveVoteQueue = useCallback((queue: VoteQueueItem[]) => {
    try {
      localStorage.setItem(VOTE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error("Failed to save vote queue:", e);
    }
  }, []);

  // Submit single vote to backend
  const submitToBackend = useCallback(
    async (payload: VotePayload): Promise<VoteResponse | null> => {
      try {
        const token = localStorage.getItem("auth_token");
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        // Use guest session if no auth token
        if (!token && !payload.session_id) {
          payload.session_id = guestSessionId;
        }

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch("/api/arena/vote", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "Failed to submit vote");
        }

        return await response.json();
      } catch (err) {
        console.error("Backend submission failed:", err);
        throw err;
      }
    },
    [guestSessionId]
  );

  // Submit vote (with offline queue fallback)
  const submitVote = useCallback(
    async (payload: VotePayload): Promise<VoteResponse | null> => {
      setIsSubmitting(true);
      setError(null);

      try {
        // Try immediate submission
        const response = await submitToBackend(payload);

        // If successful, try flushing queued votes
        await flushVoteQueue();

        return response;
      } catch (err) {
        // Fall back to offline queue
        const queue = getVoteQueue();

        if (queue.length >= MAX_QUEUE_SIZE) {
          setError("Vote queue full. Please retry later.");
          setIsSubmitting(false);
          return null;
        }

        const queueItem: VoteQueueItem = {
          id: uuidv4(),
          payload,
          timestamp: Date.now(),
          retries: 0,
        };

        queue.push(queueItem);
        saveVoteQueue(queue);

        setError(
          "Offline mode: vote saved locally. It will sync when you're online."
        );
        setIsSubmitting(false);
        return null;
      }
    },
    [guestSessionId, getVoteQueue, saveVoteQueue, submitToBackend]
  );

  // Flush queued votes on reconnect
  const flushVoteQueue = useCallback(async () => {
    const queue = getVoteQueue();
    if (queue.length === 0) return;

    let successCount = 0;
    const failed: VoteQueueItem[] = [];

    for (const item of queue) {
      try {
        await submitToBackend(item.payload);
        successCount++;
      } catch {
        item.retries++;
        if (item.retries < MAX_RETRIES) {
          failed.push(item);
        }
      }
    }

    if (failed.length > 0) {
      saveVoteQueue(failed);
      console.warn(`${failed.length} votes still queued after sync attempt`);
    } else {
      saveVoteQueue([]);
    }

    return { successCount, failed: failed.length };
  }, [getVoteQueue, saveVoteQueue, submitToBackend]);

  // Listen for online event to auto-flush
  useEffect(() => {
    const handleOnline = async () => {
      await flushVoteQueue();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [flushVoteQueue]);

  return {
    submitVote,
    flushVoteQueue,
    isSubmitting,
    error,
    guestSessionId,
  };
}
```

---

## 6. Guest → Account Linking on Signup

**File: `backend/api/routers/auth.py`** (addition)

```python
from sqlalchemy.orm import Session
from backend.models.vote import Vote, Conversation
from backend.models.user import User
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

async def link_guest_votes_to_user(
    user_id: str,
    guest_session_id: str,
    db: Session,
) -> int:
    """
    Link all guest votes to newly created user account.

    Returns count of votes linked.
    """
    try:
        # Update votes
        vote_count = db.query(Vote).filter_by(guest_session_id=guest_session_id).count()

        db.query(Vote).filter_by(guest_session_id=guest_session_id).update({
            Vote.user_id: user_id,
            Vote.guest_session_id: None,
            Vote.updated_at: datetime.utcnow(),
        })

        # Update conversations
        db.query(Conversation).filter_by(guest_session_id=guest_session_id).update({
            Conversation.user_id: user_id,
            Conversation.guest_session_id: None,
        })

        db.commit()
        logger.info(f"Linked {vote_count} guest votes to user {user_id}")
        return vote_count

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to link guest votes: {e}")
        raise

# Call this in signup handler:
#
# @router.post("/auth/signup")
# async def signup(signup_data: SignupSchema, db: Session = Depends(get_db)):
#     user = User(id=str(uuid.uuid4()), email=signup_data.email, ...)
#     db.add(user)
#     db.commit()
#
#     # Link guest votes if guest_session_id provided
#     if signup_data.guest_session_id:
#         linked_count = await link_guest_votes_to_user(
#             user.id,
#             signup_data.guest_session_id,
#             db
#         )
#         return {
#             "user_id": user.id,
#             "message": f"Welcome! {linked_count} votes from your guest session have been linked."
#         }
```

---

## 7. Real-Time Elo Delta Calculation

**File: `backend/elo_engine.py`** (excerpt)

```python
import math
from sqlalchemy.orm import Session
from backend.models.vote import Vote, Model
from typing import List, Optional
from backend.schemas.vote import EloReveal

class EloEngine:
    K_FACTOR = 32
    INITIAL_RATING = 1000

    @staticmethod
    def expected_score(rating_a: float, rating_b: float) -> float:
        """Compute expected score for A vs B using base-10 logistic."""
        return 1.0 / (1.0 + math.pow(10, (rating_b - rating_a) / 400.0))

    @staticmethod
    def update_rating(current_rating: float, expected: float, actual: float, k: int = K_FACTOR) -> float:
        """Update rating based on actual outcome."""
        return current_rating + k * (actual - expected)

    @staticmethod
    def get_current_elo(model_id: str, db: Session) -> float:
        """Get latest Elo for a model (from latest snapshot or default)."""
        from backend.models.elo import EloSnapshot

        snapshot = db.query(EloSnapshot)\
            .filter_by(model_id=model_id)\
            .order_by(EloSnapshot.date_snapshot.desc())\
            .first()

        return float(snapshot.elo_rating) if snapshot else EloEngine.INITIAL_RATING

def compute_elo_delta(
    model_a_id: str,
    model_b_id: str,
    choice: str,
    db: Session,
) -> List[EloReveal]:
    """
    Compute real-time Elo deltas for both models.

    This is approximate (for UI feedback); daily batch is source of truth.
    """
    engine = EloEngine()

    # Get current Elo
    elo_a = engine.get_current_elo(model_a_id, db)
    elo_b = engine.get_current_elo(model_b_id, db)

    # Determine actual scores
    if choice == "a":
        actual_a, actual_b = 1.0, 0.0
    elif choice == "b":
        actual_a, actual_b = 0.0, 1.0
    else:  # "tie" or "bad"
        actual_a, actual_b = 0.5, 0.5

    # Compute expected scores
    expected_a = engine.expected_score(elo_a, elo_b)
    expected_b = engine.expected_score(elo_b, elo_a)

    # Compute new ratings
    new_elo_a = engine.update_rating(elo_a, expected_a, actual_a)
    new_elo_b = engine.update_rating(elo_b, expected_b, actual_b)

    # Get model names
    model_a = db.query(Model).filter_by(id=model_a_id).first()
    model_b = db.query(Model).filter_by(id=model_b_id).first()

    return [
        EloReveal(
            model_id=model_a_id,
            model_name=model_a.name if model_a else "Unknown",
            old_elo=int(elo_a),
            new_elo=int(new_elo_a),
            delta=int(new_elo_a - elo_a),
        ),
        EloReveal(
            model_id=model_b_id,
            model_name=model_b.name if model_b else "Unknown",
            old_elo=int(elo_b),
            new_elo=int(new_elo_b),
            delta=int(new_elo_b - elo_b),
        ),
    ]
```

---

## Checklist

- [ ] SQLAlchemy models created with proper constraints
- [ ] Pydantic schemas validate choice per mode
- [ ] Vote endpoint accepts auth + guest session
- [ ] Deduplication prevents duplicate votes on same (conversation, turn, user)
- [ ] Rate limit middleware enforces 100 votes/day
- [ ] Frontend hook handles offline queue + localStorage persistence
- [ ] Guest votes stored with guest_session_id
- [ ] Guest → user linking implemented (no data loss)
- [ ] Real-time Elo deltas computed for UI feedback
- [ ] All timestamps server-side (prevents clock skew)
- [ ] P99 vote submission latency ≤ 300ms

---

## Testing

```bash
# Test vote submission (auth user)
curl -X POST http://localhost:8000/api/arena/vote \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "conv-123",
    "turn_number": 1,
    "choice": "a",
    "mode": "battle",
    "model_a_id": "model-1",
    "model_b_id": "model-2"
  }'

# Test guest vote
curl -X POST http://localhost:8000/api/arena/vote \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "conv-123",
    "turn_number": 1,
    "choice": "b",
    "mode": "battle",
    "model_a_id": "model-1",
    "model_b_id": "model-2",
    "session_id": "guest-session-uuid"
  }'

# Test direct rating
curl -X POST http://localhost:8000/api/arena/vote \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "conv-123",
    "turn_number": 1,
    "choice": "5",
    "mode": "direct",
    "quality_tags": ["accurate", "clear"],
    "session_id": "guest-session-uuid"
  }'
```

---

## Dependencies

```
fastapi==0.104.1
sqlalchemy==2.0.23
pydantic==2.5.0
redis==5.0.1
python-dotenv==1.0.0
```
