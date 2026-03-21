# G3B Spec 00 — Data Model & API Foundation

**ViGen Arena — Vietnamese GenAI Human Evaluation Platform**

**Delivery:** March 9–15, 2026 | **Status:** Ready for Implementation
**Owner:** Backend/DevOps Lead | **Blocker for:** All downstream specs (01–10)

---

## Overview

This spec defines the complete backend architecture for ViGen Arena: MySQL database schema, SQLAlchemy ORM models, Pydantic request/response schemas, all API endpoint signatures, database connection setup, and seed data.

This is the **foundation layer**. All other specs (Auth, Battle Mode, Leaderboard, Elo Engine, etc.) depend on these contracts.

**Technology Stack:**
- Backend: Python FastAPI (async)
- ORM: SQLAlchemy 2.0 (async sessions)
- Database: MySQL 8.0+ (AWS RDS or EC2)
- Schema validation: Pydantic v2
- Migrations: Alembic
- Connection pool: aiomysql / asyncpg

---

## Part 1: MySQL Schema (DDL)

### Database & Collation

```sql
CREATE DATABASE IF NOT EXISTS vigen_arena
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE vigen_arena;

-- Enable referential integrity
SET FOREIGN_KEY_CHECKS=1;
```

### Table: `users`

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    -- Authentication
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255), -- NULL if Google auth only
    auth_provider ENUM('email', 'google') NOT NULL DEFAULT 'email',
    google_id VARCHAR(255) UNIQUE, -- NULL if email auth

    -- Profile
    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),

    -- Guest linking (for users who voted as guests before signing up)
    linked_session_id VARCHAR(100),

    -- Stats (denormalized for fast UI queries; recomputed daily)
    vote_count INT NOT NULL DEFAULT 0,
    battle_count INT NOT NULL DEFAULT 0,
    sbs_count INT NOT NULL DEFAULT 0,
    direct_count INT NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints
    INDEX idx_email (email),
    INDEX idx_google_id (google_id),
    INDEX idx_created_at (created_at),
    CONSTRAINT chk_auth_provider CHECK (auth_provider IN ('email', 'google')),
    CONSTRAINT chk_vote_count CHECK (vote_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Table: `prompts`

```sql
CREATE TABLE prompts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    -- Content
    text LONGTEXT NOT NULL,

    -- Categorization
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),

    -- Is this prompt shown in the welcome screen's "suggested prompts" section?
    is_suggested BOOLEAN NOT NULL DEFAULT FALSE,

    -- Optional: for filtering in P1 (category-based leaderboards)
    difficulty VARCHAR(50), -- 'easy', 'medium', 'hard', NULL
    tags JSON, -- e.g., ["cultural", "coding", "reasoning"]

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints & Indexes
    INDEX idx_category (category),
    INDEX idx_is_suggested (is_suggested),
    INDEX idx_created_at (created_at),
    CONSTRAINT chk_category CHECK (category IN (
        'kiến_thức',      -- knowledge
        'sáng_tạo',        -- creative
        'suy_luận',        -- reasoning
        'lập_trình',       -- coding
        'văn_hóa_vn',      -- culture
        'nghề_nghiệp'      -- professional
    ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Table: `models`

```sql
CREATE TABLE models (
    id VARCHAR(100) PRIMARY KEY, -- slug like 'claude-opus-46'

    -- Display
    name VARCHAR(255) NOT NULL UNIQUE, -- display name like "Claude Opus 4.6"
    organization VARCHAR(100) NOT NULL, -- Anthropic, OpenAI, Google, etc.
    description TEXT,

    -- Metadata
    license ENUM('proprietary', 'open') NOT NULL,
    color_hex VARCHAR(7), -- e.g., '#FF5733' for Anthropic red

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints & Indexes
    INDEX idx_is_active (is_active),
    INDEX idx_organization (organization),
    INDEX idx_created_at (created_at),
    CONSTRAINT chk_license CHECK (license IN ('proprietary', 'open')),
    CONSTRAINT chk_color CHECK (color_hex REGEXP '^#[0-9A-F]{6}$' OR color_hex IS NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Table: `responses`

```sql
CREATE TABLE responses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    -- Foreign keys
    prompt_id BIGINT NOT NULL,
    model_id VARCHAR(100) NOT NULL,

    -- Content
    content LONGTEXT NOT NULL,

    -- Multi-turn support: if NULL, this is the first response in a conversation turn
    parent_response_id BIGINT,
    turn_number INT NOT NULL DEFAULT 1,

    -- Metadata
    tokens_used INT, -- estimate or actual token count

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints & Indexes
    CONSTRAINT fk_responses_prompt FOREIGN KEY (prompt_id)
        REFERENCES prompts(id) ON DELETE CASCADE,
    CONSTRAINT fk_responses_model FOREIGN KEY (model_id)
        REFERENCES models(id) ON DELETE RESTRICT,
    CONSTRAINT fk_responses_parent FOREIGN KEY (parent_response_id)
        REFERENCES responses(id) ON DELETE CASCADE,
    INDEX idx_prompt_id (prompt_id),
    INDEX idx_model_id (model_id),
    INDEX idx_prompt_model (prompt_id, model_id),
    INDEX idx_parent_response_id (parent_response_id),
    INDEX idx_created_at (created_at),
    CONSTRAINT chk_turn_number CHECK (turn_number >= 1),
    CONSTRAINT chk_tokens CHECK (tokens_used IS NULL OR tokens_used > 0),
    UNIQUE KEY uk_prompt_model_turn (prompt_id, model_id, turn_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Table: `conversations`

```sql
CREATE TABLE conversations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    -- User association (nullable for guests)
    user_id BIGINT,
    guest_session_id VARCHAR(100),

    -- Metadata
    mode ENUM('battle', 'sbs', 'direct') NOT NULL,
    initial_prompt_text LONGTEXT NOT NULL,

    -- Model assignment
    model_a_id VARCHAR(100) NOT NULL,
    model_b_id VARCHAR(100), -- NULL for direct mode

    -- Status lifecycle
    status ENUM('active', 'voted', 'abandoned') NOT NULL DEFAULT 'active',

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints & Indexes
    CONSTRAINT fk_conversations_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_conversations_model_a FOREIGN KEY (model_a_id)
        REFERENCES models(id) ON DELETE RESTRICT,
    CONSTRAINT fk_conversations_model_b FOREIGN KEY (model_b_id)
        REFERENCES models(id) ON DELETE RESTRICT,
    INDEX idx_user_id (user_id),
    INDEX idx_guest_session_id (guest_session_id),
    INDEX idx_mode (mode),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_user_created (user_id, created_at),
    CONSTRAINT chk_mode CHECK (mode IN ('battle', 'sbs', 'direct')),
    CONSTRAINT chk_status CHECK (status IN ('active', 'voted', 'abandoned')),
    CONSTRAINT chk_user_or_guest CHECK ((user_id IS NOT NULL AND guest_session_id IS NULL)
                                      OR (user_id IS NULL AND guest_session_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Table: `conversation_turns`

```sql
CREATE TABLE conversation_turns (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    -- Foreign key
    conversation_id BIGINT NOT NULL,

    -- Turn metadata
    turn_number INT NOT NULL,

    -- User message for this turn
    user_message LONGTEXT NOT NULL,

    -- Responses
    response_a_id BIGINT NOT NULL,
    response_b_id BIGINT, -- NULL for direct mode

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints & Indexes
    CONSTRAINT fk_turns_conversation FOREIGN KEY (conversation_id)
        REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_turns_response_a FOREIGN KEY (response_a_id)
        REFERENCES responses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_turns_response_b FOREIGN KEY (response_b_id)
        REFERENCES responses(id) ON DELETE RESTRICT,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_conversation_turn (conversation_id, turn_number),
    INDEX idx_created_at (created_at),
    UNIQUE KEY uk_conversation_turn (conversation_id, turn_number),
    CONSTRAINT chk_turn_number CHECK (turn_number >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Table: `votes`

```sql
CREATE TABLE votes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    -- Association
    conversation_id BIGINT NOT NULL,
    voter_id BIGINT, -- NULL if guest
    guest_session_id VARCHAR(100), -- populated if guest, cleared after sign-up

    -- Vote metadata
    mode ENUM('battle', 'sbs', 'direct') NOT NULL,
    turn_number INT NOT NULL,

    -- Vote choice
    choice VARCHAR(50) NOT NULL, -- 'a', 'b', 'tie', 'bad' (for battle/sbs), '1'-'5' (for direct)

    -- Quality tags (for direct mode or optional battle mode refinement)
    quality_tags JSON, -- ["accurate", "natural", "culturally_appropriate", "creative", "helpful"]

    -- Model references (denormalized for analytics)
    model_a_id VARCHAR(100) NOT NULL,
    model_b_id VARCHAR(100), -- NULL for direct mode

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints & Indexes
    CONSTRAINT fk_votes_conversation FOREIGN KEY (conversation_id)
        REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_votes_voter FOREIGN KEY (voter_id)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_votes_model_a FOREIGN KEY (model_a_id)
        REFERENCES models(id) ON DELETE RESTRICT,
    CONSTRAINT fk_votes_model_b FOREIGN KEY (model_b_id)
        REFERENCES models(id) ON DELETE RESTRICT,
    INDEX idx_voter_id (voter_id),
    INDEX idx_guest_session_id (guest_session_id),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_mode (mode),
    INDEX idx_created_at (created_at),
    INDEX idx_model_a_id (model_a_id),
    INDEX idx_model_b_id (model_b_id),
    INDEX idx_voter_created (voter_id, created_at),
    CONSTRAINT chk_mode CHECK (mode IN ('battle', 'sbs', 'direct')),
    CONSTRAINT chk_choice CHECK (
        (mode IN ('battle', 'sbs') AND choice IN ('a', 'b', 'tie', 'bad'))
        OR (mode = 'direct' AND choice IN ('1', '2', '3', '4', '5'))
    ),
    CONSTRAINT chk_voter_or_guest CHECK ((voter_id IS NOT NULL AND guest_session_id IS NULL)
                                        OR (voter_id IS NULL AND guest_session_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Table: `elo_snapshots`

```sql
CREATE TABLE elo_snapshots (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    -- Model
    model_id VARCHAR(100) NOT NULL,

    -- Elo state
    elo_rating FLOAT NOT NULL DEFAULT 1000,
    ci_lower FLOAT NOT NULL, -- 95% confidence interval lower bound
    ci_upper FLOAT NOT NULL, -- 95% confidence interval upper bound

    -- Stats from vote data
    win_count INT NOT NULL DEFAULT 0,
    loss_count INT NOT NULL DEFAULT 0,
    tie_count INT NOT NULL DEFAULT 0,
    total_votes INT NOT NULL DEFAULT 0,
    win_rate FLOAT GENERATED ALWAYS AS (
        CASE WHEN total_votes = 0 THEN 0
             ELSE (win_count + 0.5 * tie_count) / total_votes
        END
    ) STORED,

    -- Computation metadata
    computed_at TIMESTAMP NOT NULL,

    -- Indexes
    CONSTRAINT fk_elo_model FOREIGN KEY (model_id)
        REFERENCES models(id) ON DELETE CASCADE,
    INDEX idx_model_id (model_id),
    INDEX idx_computed_at (computed_at),
    UNIQUE KEY uk_model_computed (model_id, computed_at),
    CONSTRAINT chk_elo CHECK (elo_rating >= 0),
    CONSTRAINT chk_ci CHECK (ci_lower <= ci_upper),
    CONSTRAINT chk_counts CHECK (win_count >= 0 AND loss_count >= 0 AND tie_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Table: `leaderboard_stats`

```sql
CREATE TABLE leaderboard_stats (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    -- Stat type
    stat_type VARCHAR(100) NOT NULL, -- 'win_fraction_matrix', 'battle_count_matrix', 'avg_win_rate', 'ci_distribution'

    -- Data (JSON to handle variable shapes)
    data JSON NOT NULL,
    /*
    Examples:
    - win_fraction_matrix: {"model_pairs": [{"model_a": "claude-opus-46", "model_b": "gpt-5", "win_fraction": 0.55}, ...]}
    - battle_count_matrix: {"model_pairs": [{"model_a": "...", "model_b": "...", "count": 150}, ...]}
    - avg_win_rate: {"models": [{"model_id": "...", "avg_win_rate": 0.58}, ...]}
    - ci_distribution: {"models": [{"model_id": "...", "elo": 1050, "ci_lower": 1020, "ci_upper": 1080}, ...]}
    */

    -- Computation metadata
    computed_at TIMESTAMP NOT NULL,

    -- Indexes
    INDEX idx_stat_type (stat_type),
    INDEX idx_computed_at (computed_at),
    UNIQUE KEY uk_stat_computed (stat_type, computed_at),
    CONSTRAINT chk_stat_type CHECK (stat_type IN (
        'win_fraction_matrix',
        'battle_count_matrix',
        'avg_win_rate',
        'ci_distribution'
    ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Indexes Summary

```sql
-- Run after creation to verify:
SHOW INDEXES FROM users;
SHOW INDEXES FROM prompts;
SHOW INDEXES FROM models;
SHOW INDEXES FROM responses;
SHOW INDEXES FROM conversations;
SHOW INDEXES FROM conversation_turns;
SHOW INDEXES FROM votes;
SHOW INDEXES FROM elo_snapshots;
SHOW INDEXES FROM leaderboard_stats;
```

---

## Part 2: SQLAlchemy 2.0 ORM Models

**File:** `app/models.py`

```python
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    BigInteger, String, Text, Enum, Boolean, Float, JSON,
    ForeignKey, Index, UniqueConstraint, CheckConstraint,
    func, and_, or_
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from enum import Enum as PyEnum

# ============================================================================
# Base
# ============================================================================

class Base(DeclarativeBase):
    """SQLAlchemy 2.0 declarative base."""
    pass


# ============================================================================
# Enums
# ============================================================================

class AuthProviderEnum(str, PyEnum):
    EMAIL = "email"
    GOOGLE = "google"


class ModeEnum(str, PyEnum):
    BATTLE = "battle"
    SBS = "sbs"
    DIRECT = "direct"


class StatusEnum(str, PyEnum):
    ACTIVE = "active"
    VOTED = "voted"
    ABANDONED = "abandoned"


class LicenseEnum(str, PyEnum):
    PROPRIETARY = "proprietary"
    OPEN = "open"


class ChoiceEnum(str, PyEnum):
    A = "a"
    B = "b"
    TIE = "tie"
    BAD = "bad"
    RATE_1 = "1"
    RATE_2 = "2"
    RATE_3 = "3"
    RATE_4 = "4"
    RATE_5 = "5"


class CategoryEnum(str, PyEnum):
    KNOWLEDGE = "kiến_thức"
    CREATIVE = "sáng_tạo"
    REASONING = "suy_luận"
    CODING = "lập_trình"
    CULTURE = "văn_hóa_vn"
    PROFESSIONAL = "nghề_nghiệp"


# ============================================================================
# User Model
# ============================================================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    auth_provider: Mapped[AuthProviderEnum] = mapped_column(
        Enum(AuthProviderEnum), nullable=False, default=AuthProviderEnum.EMAIL
    )
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)

    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    linked_session_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    vote_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    battle_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    sbs_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    direct_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(nullable=False, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(nullable=False, default=func.now(), onupdate=func.now())

    # Relationships
    conversations: Mapped[List["Conversation"]] = relationship(
        "Conversation", back_populates="user", foreign_keys="Conversation.user_id"
    )
    votes: Mapped[List["Vote"]] = relationship("Vote", back_populates="voter", foreign_keys="Vote.voter_id")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, display_name={self.display_name})>"


# ============================================================================
# Prompt Model
# ============================================================================

class Prompt(Base):
    __tablename__ = "prompts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    category: Mapped[CategoryEnum] = mapped_column(Enum(CategoryEnum), nullable=False, index=True)
    subcategory: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    is_suggested: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    difficulty: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tags: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(nullable=False, default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(nullable=False, default=func.now(), onupdate=func.now())

    # Relationships
    responses: Mapped[List["Response"]] = relationship(
        "Response", back_populates="prompt", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Prompt(id={self.id}, category={self.category})>"


# ============================================================================
# Model (LLM) Model
# ============================================================================

class Model(Base):
    __tablename__ = "models"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    organization: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    license: Mapped[LicenseEnum] = mapped_column(Enum(LicenseEnum), nullable=False)
    color_hex: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    created_at: Mapped[datetime] = mapped_column(nullable=False, default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(nullable=False, default=func.now(), onupdate=func.now())

    # Relationships
    responses: Mapped[List["Response"]] = relationship(
        "Response", back_populates="model", foreign_keys="Response.model_id"
    )
    conversations_a: Mapped[List["Conversation"]] = relationship(
        "Conversation", back_populates="model_a", foreign_keys="Conversation.model_a_id"
    )
    conversations_b: Mapped[List["Conversation"]] = relationship(
        "Conversation", back_populates="model_b", foreign_keys="Conversation.model_b_id"
    )
    elo_snapshots: Mapped[List["EloSnapshot"]] = relationship(
        "EloSnapshot", back_populates="model", cascade="all, delete-orphan"
    )
    votes_a: Mapped[List["Vote"]] = relationship(
        "Vote", back_populates="model_a", foreign_keys="Vote.model_a_id"
    )
    votes_b: Mapped[List["Vote"]] = relationship(
        "Vote", back_populates="model_b", foreign_keys="Vote.model_b_id"
    )

    def __repr__(self) -> str:
        return f"<Model(id={self.id}, name={self.name}, org={self.organization})>"


# ============================================================================
# Response Model
# ============================================================================

class Response(Base):
    __tablename__ = "responses"
    __table_args__ = (
        UniqueConstraint("prompt_id", "model_id", "turn_number", name="uk_prompt_model_turn"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    prompt_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("prompts.id", ondelete="CASCADE"), nullable=False, index=True)
    model_id: Mapped[str] = mapped_column(String(100), ForeignKey("models.id", ondelete="RESTRICT"), nullable=False, index=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)

    parent_response_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("responses.id", ondelete="CASCADE"), nullable=True, index=True
    )
    turn_number: Mapped[int] = mapped_column(nullable=False, default=1)

    tokens_used: Mapped[Optional[int]] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(nullable=False, default=func.now(), index=True)

    # Relationships
    prompt: Mapped["Prompt"] = relationship("Prompt", back_populates="responses")
    model: Mapped["Model"] = relationship("Model", back_populates="responses", foreign_keys="Response.model_id")
    parent: Mapped[Optional["Response"]] = relationship(
        "Response", remote_side=[id], foreign_keys=[parent_response_id], backref="children"
    )
    turns_a: Mapped[List["ConversationTurn"]] = relationship(
        "ConversationTurn", back_populates="response_a", foreign_keys="ConversationTurn.response_a_id"
    )
    turns_b: Mapped[List["ConversationTurn"]] = relationship(
        "ConversationTurn", back_populates="response_b", foreign_keys="ConversationTurn.response_b_id"
    )
    votes_a: Mapped[List["Vote"]] = relationship(
        "Vote", primaryjoin="and_(Vote.response_a_id==Response.id)"
    )

    def __repr__(self) -> str:
        return f"<Response(id={self.id}, prompt_id={self.prompt_id}, model_id={self.model_id}, turn={self.turn_number})>"


# ============================================================================
# Conversation Model
# ============================================================================

class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    guest_session_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)

    mode: Mapped[ModeEnum] = mapped_column(Enum(ModeEnum), nullable=False, index=True)
    initial_prompt_text: Mapped[str] = mapped_column(Text, nullable=False)

    model_a_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("models.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    model_b_id: Mapped[Optional[str]] = mapped_column(
        String(100), ForeignKey("models.id", ondelete="RESTRICT"), nullable=True, index=True
    )

    status: Mapped[StatusEnum] = mapped_column(Enum(StatusEnum), nullable=False, default=StatusEnum.ACTIVE, index=True)

    created_at: Mapped[datetime] = mapped_column(nullable=False, default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(nullable=False, default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="conversations", foreign_keys=[user_id])
    model_a: Mapped["Model"] = relationship("Model", back_populates="conversations_a", foreign_keys=[model_a_id])
    model_b: Mapped[Optional["Model"]] = relationship("Model", back_populates="conversations_b", foreign_keys=[model_b_id])
    turns: Mapped[List["ConversationTurn"]] = relationship(
        "ConversationTurn", back_populates="conversation", cascade="all, delete-orphan"
    )
    votes: Mapped[List["Vote"]] = relationship(
        "Vote", back_populates="conversation", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "((user_id IS NOT NULL AND guest_session_id IS NULL) OR (user_id IS NULL AND guest_session_id IS NOT NULL))",
            name="chk_user_or_guest"
        ),
    )

    def __repr__(self) -> str:
        return f"<Conversation(id={self.id}, mode={self.mode}, status={self.status})>"


# ============================================================================
# ConversationTurn Model
# ============================================================================

class ConversationTurn(Base):
    __tablename__ = "conversation_turns"
    __table_args__ = (
        UniqueConstraint("conversation_id", "turn_number", name="uk_conversation_turn"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    conversation_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )

    turn_number: Mapped[int] = mapped_column(nullable=False)
    user_message: Mapped[str] = mapped_column(Text, nullable=False)

    response_a_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("responses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    response_b_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("responses.id", ondelete="RESTRICT"), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(nullable=False, default=func.now(), index=True)

    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="turns")
    response_a: Mapped["Response"] = relationship("Response", back_populates="turns_a", foreign_keys=[response_a_id])
    response_b: Mapped[Optional["Response"]] = relationship("Response", back_populates="turns_b", foreign_keys=[response_b_id])

    def __repr__(self) -> str:
        return f"<ConversationTurn(id={self.id}, conversation_id={self.conversation_id}, turn={self.turn_number})>"


# ============================================================================
# Vote Model
# ============================================================================

class Vote(Base):
    __tablename__ = "votes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    conversation_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    voter_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    guest_session_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)

    mode: Mapped[ModeEnum] = mapped_column(Enum(ModeEnum), nullable=False, index=True)
    turn_number: Mapped[int] = mapped_column(nullable=False)

    choice: Mapped[str] = mapped_column(String(50), nullable=False)  # 'a', 'b', 'tie', 'bad', '1'-'5'
    quality_tags: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    model_a_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("models.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    model_b_id: Mapped[Optional[str]] = mapped_column(
        String(100), ForeignKey("models.id", ondelete="RESTRICT"), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(nullable=False, default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(nullable=False, default=func.now(), onupdate=func.now())

    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="votes")
    voter: Mapped[Optional["User"]] = relationship("User", back_populates="votes", foreign_keys=[voter_id])
    model_a: Mapped["Model"] = relationship("Model", back_populates="votes_a", foreign_keys=[model_a_id])
    model_b: Mapped[Optional["Model"]] = relationship("Model", back_populates="votes_b", foreign_keys=[model_b_id])

    __table_args__ = (
        CheckConstraint(
            "((voter_id IS NOT NULL AND guest_session_id IS NULL) OR (voter_id IS NULL AND guest_session_id IS NOT NULL))",
            name="chk_voter_or_guest"
        ),
        CheckConstraint(
            "((mode IN ('battle', 'sbs') AND choice IN ('a', 'b', 'tie', 'bad')) OR (mode = 'direct' AND choice IN ('1', '2', '3', '4', '5')))",
            name="chk_choice"
        ),
    )

    def __repr__(self) -> str:
        return f"<Vote(id={self.id}, conversation_id={self.conversation_id}, choice={self.choice})>"


# ============================================================================
# EloSnapshot Model
# ============================================================================

class EloSnapshot(Base):
    __tablename__ = "elo_snapshots"
    __table_args__ = (
        UniqueConstraint("model_id", "computed_at", name="uk_model_computed"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    model_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("models.id", ondelete="CASCADE"), nullable=False, index=True
    )

    elo_rating: Mapped[float] = mapped_column(Float, nullable=False, default=1000.0)
    ci_lower: Mapped[float] = mapped_column(Float, nullable=False)
    ci_upper: Mapped[float] = mapped_column(Float, nullable=False)

    win_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    loss_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    tie_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    total_votes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    computed_at: Mapped[datetime] = mapped_column(nullable=False, index=True)

    # Relationships
    model: Mapped["Model"] = relationship("Model", back_populates="elo_snapshots")

    @property
    def win_rate(self) -> float:
        if self.total_votes == 0:
            return 0.0
        return (self.win_count + 0.5 * self.tie_count) / self.total_votes

    def __repr__(self) -> str:
        return f"<EloSnapshot(model_id={self.model_id}, elo={self.elo_rating:.1f}, ci=[{self.ci_lower:.1f}, {self.ci_upper:.1f}])>"


# ============================================================================
# LeaderboardStats Model
# ============================================================================

class LeaderboardStats(Base):
    __tablename__ = "leaderboard_stats"
    __table_args__ = (
        UniqueConstraint("stat_type", "computed_at", name="uk_stat_computed"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    stat_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # Enum values: 'win_fraction_matrix', 'battle_count_matrix', 'avg_win_rate', 'ci_distribution'

    data: Mapped[dict] = mapped_column(JSON, nullable=False)
    computed_at: Mapped[datetime] = mapped_column(nullable=False, index=True)

    def __repr__(self) -> str:
        return f"<LeaderboardStats(type={self.stat_type}, computed_at={self.computed_at})>"
```

---

## Part 3: Pydantic v2 Schemas

**File:** `app/schemas.py`

```python
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, field_validator
from enum import Enum as PyEnum

# ============================================================================
# Enums (mirrored from models)
# ============================================================================

class AuthProviderEnum(str, PyEnum):
    EMAIL = "email"
    GOOGLE = "google"


class ModeEnum(str, PyEnum):
    BATTLE = "battle"
    SBS = "sbs"
    DIRECT = "direct"


class StatusEnum(str, PyEnum):
    ACTIVE = "active"
    VOTED = "voted"
    ABANDONED = "abandoned"


class LicenseEnum(str, PyEnum):
    PROPRIETARY = "proprietary"
    OPEN = "open"


class CategoryEnum(str, PyEnum):
    KNOWLEDGE = "kiến_thức"
    CREATIVE = "sáng_tạo"
    REASONING = "suy_luận"
    CODING = "lập_trình"
    CULTURE = "văn_hóa_vn"
    PROFESSIONAL = "nghề_nghiệp"


# ============================================================================
# Auth Schemas
# ============================================================================

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    display_name: str = Field(..., min_length=1, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    google_id: str
    display_name: str
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    display_name: str
    avatar_url: Optional[str]
    auth_provider: AuthProviderEnum
    vote_count: int
    battle_count: int
    sbs_count: int
    direct_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class LinkSessionRequest(BaseModel):
    guest_session_id: str


class LoginResponse(BaseModel):
    access_token: str
    user: UserResponse


# ============================================================================
# Prompt Schemas
# ============================================================================

class PromptCreate(BaseModel):
    text: str
    category: CategoryEnum
    subcategory: Optional[str] = None
    is_suggested: bool = False
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None


class PromptResponse(BaseModel):
    id: int
    text: str
    category: CategoryEnum
    subcategory: Optional[str]
    is_suggested: bool
    difficulty: Optional[str]
    tags: Optional[List[str]]
    created_at: datetime

    model_config = {"from_attributes": True}


# ============================================================================
# Model Schemas
# ============================================================================

class ModelCreate(BaseModel):
    id: str
    name: str
    organization: str
    license: LicenseEnum
    color_hex: Optional[str] = None
    description: Optional[str] = None


class ModelResponse(BaseModel):
    id: str
    name: str
    organization: str
    license: LicenseEnum
    color_hex: Optional[str]
    description: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ============================================================================
# Response Schemas
# ============================================================================

class ResponseCreate(BaseModel):
    prompt_id: int
    model_id: str
    content: str
    turn_number: int = 1
    parent_response_id: Optional[int] = None
    tokens_used: Optional[int] = None


class ResponseInDB(BaseModel):
    id: int
    prompt_id: int
    model_id: str
    content: str
    turn_number: int
    parent_response_id: Optional[int]
    tokens_used: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


# ============================================================================
# Conversation Schemas
# ============================================================================

class ConversationCreate(BaseModel):
    mode: ModeEnum
    initial_prompt_text: str
    model_a_id: str
    model_b_id: Optional[str] = None


class ConversationResponse(BaseModel):
    id: int
    mode: ModeEnum
    initial_prompt_text: str
    model_a_id: str
    model_b_id: Optional[str]
    status: StatusEnum
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetailResponse(ConversationResponse):
    turns: List["ConversationTurnResponse"]


# ============================================================================
# ConversationTurn Schemas
# ============================================================================

class ConversationTurnCreate(BaseModel):
    conversation_id: int
    turn_number: int
    user_message: str
    response_a_id: int
    response_b_id: Optional[int] = None


class ConversationTurnResponse(BaseModel):
    id: int
    conversation_id: int
    turn_number: int
    user_message: str
    response_a_id: int
    response_b_id: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


# ============================================================================
# Vote Schemas
# ============================================================================

class VoteCreate(BaseModel):
    conversation_id: int
    turn_number: int
    mode: ModeEnum
    choice: str  # 'a', 'b', 'tie', 'bad', '1'-'5'
    quality_tags: Optional[List[str]] = None

    @field_validator("choice")
    @classmethod
    def validate_choice(cls, v: str, info) -> str:
        mode = info.data.get("mode")
        if mode in (ModeEnum.BATTLE, ModeEnum.SBS):
            if v not in ("a", "b", "tie", "bad"):
                raise ValueError(f"Invalid choice '{v}' for mode {mode}")
        elif mode == ModeEnum.DIRECT:
            if v not in ("1", "2", "3", "4", "5"):
                raise ValueError(f"Invalid choice '{v}' for mode {mode}")
        return v


class VoteResponse(BaseModel):
    id: int
    conversation_id: int
    mode: ModeEnum
    turn_number: int
    choice: str
    quality_tags: Optional[List[str]]
    model_a_id: str
    model_b_id: Optional[str]
    created_at: datetime

    # Reveal Elo only after voting
    model_a_elo: Optional[float] = None
    model_b_elo: Optional[float] = None

    model_config = {"from_attributes": True}


# ============================================================================
# Elo Snapshot Schemas
# ============================================================================

class EloSnapshotResponse(BaseModel):
    model_id: str
    elo_rating: float
    ci_lower: float
    ci_upper: float
    win_count: int
    loss_count: int
    tie_count: int
    total_votes: int
    win_rate: float
    computed_at: datetime

    model_config = {"from_attributes": True}


# ============================================================================
# Leaderboard Schemas
# ============================================================================

class LeaderboardEntryResponse(BaseModel):
    rank: int
    model_id: str
    model_name: str
    organization: str
    elo_rating: float
    ci_lower: float
    ci_upper: float
    vote_count: int
    win_rate: float
    license: LicenseEnum
    color_hex: Optional[str]


class LeaderboardTableResponse(BaseModel):
    timestamp: datetime
    entries: List[LeaderboardEntryResponse]


class WinFractionMatrixResponse(BaseModel):
    """Position-bias corrected pairwise win rates."""
    model_pairs: List[Dict[str, Any]]  # [{"model_a": "...", "model_b": "...", "win_fraction": 0.55}, ...]
    computed_at: datetime


class BattleCountMatrixResponse(BaseModel):
    """Total non-tied battles per pair."""
    model_pairs: List[Dict[str, Any]]  # [{"model_a": "...", "model_b": "...", "count": 150}, ...]
    computed_at: datetime


class AvgWinRateResponse(BaseModel):
    """Per-model mean win rate against all opponents."""
    models: List[Dict[str, Any]]  # [{"model_id": "...", "avg_win_rate": 0.58}, ...]
    computed_at: datetime


class CIDistributionResponse(BaseModel):
    """Confidence interval dot-and-whisker data."""
    models: List[Dict[str, Any]]  # [{"model_id": "...", "elo": 1050, "ci_lower": 1020, "ci_upper": 1080}, ...]
    computed_at: datetime


# ============================================================================
# Pair Serving Schemas
# ============================================================================

class ResponsePairResponse(BaseModel):
    """Pair of responses for Battle or SBS modes."""
    prompt_id: int
    prompt_text: str
    response_a: ResponseInDB
    response_b: ResponseInDB
    model_a: ModelResponse
    model_b: ModelResponse


class DirectChatStartResponse(BaseModel):
    """Initial response for Direct Chat mode."""
    conversation_id: int
    prompt_id: int
    prompt_text: str
    initial_response: ResponseInDB
    model: ModelResponse


# ============================================================================
# Search & History Schemas
# ============================================================================

class ConversationHistoryResponse(BaseModel):
    id: int
    mode: ModeEnum
    initial_prompt_text: str
    model_a_id: str
    model_a_name: str
    model_b_id: Optional[str]
    model_b_name: Optional[str]
    status: StatusEnum
    created_at: datetime
    vote_choice: Optional[str] = None  # The vote choice if voted


class UserStatsResponse(BaseModel):
    user_id: int
    total_votes: int
    battle_votes: int
    sbs_votes: int
    direct_votes: int
    avg_time_per_vote_seconds: float
    most_voted_category: Optional[CategoryEnum]
    created_at: datetime


# ============================================================================
# Batch Operations Schemas
# ============================================================================

class BatchVoteCreate(BaseModel):
    """Batch submit multiple votes (for testing)."""
    votes: List[VoteCreate]


class BatchVoteResponse(BaseModel):
    success_count: int
    error_count: int
    errors: Optional[List[Dict[str, Any]]]


# ============================================================================
# Error Schemas
# ============================================================================

class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
```

---

## Part 4: API Endpoint Signatures (All Routes)

### Auth Router (`/api/auth`)

```
POST /api/auth/register
├─ Request: UserRegister
├─ Response: LoginResponse (201)
├─ Auth: None
└─ Error: 400 (invalid email), 409 (email exists)

POST /api/auth/login
├─ Request: UserLogin
├─ Response: LoginResponse (200)
├─ Auth: None
└─ Error: 401 (invalid credentials)

GET /api/auth/me
├─ Request: None (Authorization header required)
├─ Response: UserResponse (200)
├─ Auth: Bearer token
└─ Error: 401 (unauthorized), 404 (user not found)

POST /api/auth/google
├─ Request: GoogleLoginRequest
├─ Response: LoginResponse (200)
├─ Auth: None
└─ Error: 400 (invalid google_id), 500 (account creation failed)

POST /api/auth/link-session
├─ Request: LinkSessionRequest
├─ Response: UserResponse (200)
├─ Auth: Bearer token
└─ Notes: Links guest votes (via guest_session_id) to the authenticated user
└─ Error: 400 (invalid session), 404 (session not found)
```

### Arena Router (`/api/arena`)

```
GET /api/arena/models
├─ Query: ?active_only=true (default)
├─ Response: List[ModelResponse] (200)
├─ Auth: None
└─ Notes: Returns all active models for dropdown selection

GET /api/arena/prompts
├─ Query: ?limit=5&category=kiến_thức&is_suggested=true
├─ Response: List[PromptResponse] (200)
├─ Auth: None
└─ Notes: Returns random suggested prompts for welcome screen
└─ Pagination: limit, offset

GET /api/arena/pair
├─ Query: ?model_a=claude-opus-46&model_b=gpt-5 (optional)
├─ Response: ResponsePairResponse (200)
├─ Auth: None (guest) or Bearer (authenticated)
├─ Notes: Returns randomized pair if models not specified
├─ Side effects: Creates Conversation record in database
└─ Error: 404 (no pair found), 400 (invalid model)

GET /api/arena/response/{model_id}
├─ Query: ?prompt_id=123
├─ Response: DirectChatStartResponse (200)
├─ Auth: None (guest) or Bearer (authenticated)
├─ Notes: Returns initial response for Direct Chat mode
├─ Side effects: Creates Conversation record in database
└─ Error: 404 (prompt or model not found)

GET /api/arena/response/{response_id}/continue
├─ Query: ?user_message=...
├─ Response: ResponseInDB (200)
├─ Auth: None (guest) or Bearer (authenticated)
├─ Notes: Generates follow-up response in multi-turn conversation
├─ Side effects: Creates ConversationTurn + Response records
└─ Error: 404 (response not found)

POST /api/arena/vote
├─ Request: VoteCreate
├─ Response: VoteResponse (201)
├─ Auth: None (guest via session) or Bearer (authenticated)
├─ Notes: Submits vote, updates conversation status to 'voted'
├─ Side effects:
│   ├─ Creates Vote record
│   ├─ Updates Conversation.status = 'voted'
│   ├─ Increments User.vote_count (if authenticated)
│   └─ VoteResponse includes model Elo ratings after reveal
└─ Error: 400 (invalid choice), 409 (vote already exists)
```

### Leaderboard Router (`/api/leaderboard`)

```
GET /api/leaderboard
├─ Query: ?sort_by=elo&order=desc (elo|win_rate)
├─ Response: LeaderboardTableResponse (200)
├─ Auth: None
├─ Notes: Returns current leaderboard table with Elo + CI
├─ Cache: 1 hour (served from elo_snapshots)
└─ Error: 404 (no data computed yet)

GET /api/leaderboard/stats/{stat_type}
├─ Stat types: win_fraction_matrix, battle_count_matrix, avg_win_rate, ci_distribution
├─ Response: WinFractionMatrixResponse | BattleCountMatrixResponse | AvgWinRateResponse | CIDistributionResponse (200)
├─ Auth: None
├─ Notes: Returns latest computed stats
├─ Cache: 1 hour
└─ Error: 400 (invalid stat_type), 404 (stats not computed)

POST /api/leaderboard/recompute
├─ Request: None
├─ Response: {"status": "recomputing", "job_id": "..."} (202)
├─ Auth: Bearer token (admin only)
├─ Notes: Triggers Elo batch job (normally runs daily at midnight UTC+7)
└─ Error: 401 (not authorized), 409 (job already running)

GET /api/leaderboard/job/{job_id}
├─ Response: {"status": "pending|running|completed|failed", "progress": 0.75, "error": null} (200)
├─ Auth: Bearer token (admin only)
└─ Error: 404 (job not found)
```

### History Router (`/api/history`)

```
GET /api/history
├─ Query: ?limit=20&offset=0&mode=battle (optional)
├─ Response: List[ConversationHistoryResponse] (200)
├─ Auth: Bearer token (authenticated users only)
├─ Notes: Returns user's conversation history sorted by created_at DESC
├─ Pagination: limit, offset
└─ Error: 401 (unauthorized)

GET /api/history/{conversation_id}
├─ Response: ConversationDetailResponse (200)
├─ Auth: Bearer token (must be owner)
├─ Notes: Returns full conversation with all turns + vote
└─ Error: 401 (not owner), 404 (conversation not found)

DELETE /api/history/{conversation_id}
├─ Request: None
├─ Response: 204 No Content
├─ Auth: Bearer token (must be owner)
├─ Notes: Soft delete (mark as abandoned, don't remove from DB)
└─ Error: 401 (not owner), 404 (conversation not found)

GET /api/history/search
├─ Query: ?q=blockchain&limit=10 (text search in prompts)
├─ Response: List[ConversationHistoryResponse] (200)
├─ Auth: Bearer token (authenticated users only)
├─ Notes: Full-text search on initial_prompt_text
├─ Pagination: limit, offset
└─ Error: 400 (query too short)

GET /api/history/stats
├─ Response: UserStatsResponse (200)
├─ Auth: Bearer token (authenticated users only)
├─ Notes: Returns aggregated user voting stats
└─ Error: 401 (unauthorized)
```

### Admin Router (`/api/admin`) — Internal Use Only

```
POST /api/admin/models
├─ Request: ModelCreate
├─ Response: ModelResponse (201)
├─ Auth: Bearer token (admin only)
└─ Notes: Create/activate models for Arena

POST /api/admin/prompts/batch
├─ Request: List[PromptCreate]
├─ Response: List[PromptResponse] (201)
├─ Auth: Bearer token (admin only)
└─ Notes: Batch seed prompts

POST /api/admin/responses/batch
├─ Request: List[ResponseCreate]
├─ Response: List[ResponseInDB] (201)
├─ Auth: Bearer token (admin only)
└─ Notes: Batch load pre-computed responses

GET /api/admin/stats
├─ Response: {"total_votes": 15000, "unique_voters": 1200, "daily_votes": [...]...}
├─ Auth: Bearer token (admin only)
└─ Notes: Real-time dashboard stats
```

---

## Part 5: Database Connection Setup

**File:** `app/database.py`

```python
import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    create_async_engine, AsyncSession, async_sessionmaker,
    AsyncEngine
)
from sqlalchemy.pool import NullPool, QueuePool
from sqlalchemy.orm import sessionmaker

# ============================================================================
# Configuration
# ============================================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+aiomysql://root:password@localhost:3306/vigen_arena"
)

# For production, use environment variables
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DB = os.getenv("MYSQL_DB", "vigen_arena")

# Connection pool settings
POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "20"))
MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "10"))
POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "3600"))  # Recycle connections every hour

# ============================================================================
# Engine & Session Factory
# ============================================================================

def get_database_url() -> str:
    """Build MySQL connection string with aiomysql driver."""
    return f"mysql+aiomysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"


# Create async engine
engine: AsyncEngine = create_async_engine(
    get_database_url(),
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",  # Debug mode
    pool_size=POOL_SIZE,
    max_overflow=MAX_OVERFLOW,
    pool_recycle=POOL_RECYCLE,
    pool_pre_ping=True,  # Verify connections before using
    # Use QueuePool for persistent connections, NullPool for serverless
    poolclass=QueuePool if os.getenv("DEPLOY_ENV") != "serverless" else NullPool,
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    future=True,
)

# ============================================================================
# Dependency: Get DB Session (for FastAPI)
# ============================================================================

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency injection for database sessions.

    Usage in endpoint:
        async def get_votes(session: AsyncSession = Depends(get_db_session)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# ============================================================================
# Initialization (call on app startup)
# ============================================================================

async def init_db():
    """Create all tables (idempotent)."""
    from app.models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Close engine connection pool (call on app shutdown)."""
    await engine.dispose()


# ============================================================================
# Health Check
# ============================================================================

async def check_db_connection() -> bool:
    """Test database connectivity."""
    try:
        async with AsyncSessionLocal() as session:
            await session.execute("SELECT 1")
            return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False
```

**File:** `app/main.py` (FastAPI app initialization)

```python
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db, close_db, check_db_connection

# ============================================================================
# Lifespan events
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Initializing database...")
    await init_db()
    print("Database ready.")

    yield

    # Shutdown
    print("Closing database connections...")
    await close_db()
    print("Shutdown complete.")


# ============================================================================
# Create FastAPI app
# ============================================================================

app = FastAPI(
    title="ViGen Arena API",
    version="0.1.0",
    description="Vietnamese GenAI Human Evaluation Platform",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://vigen-arena.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Health check endpoint
# ============================================================================

@app.get("/health")
async def health_check():
    db_ok = await check_db_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "error"
    }

# ============================================================================
# Router imports (to be implemented in specs 01–10)
# ============================================================================

# from app.routers import auth, arena, leaderboard, history
# app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
# app.include_router(arena.router, prefix="/api/arena", tags=["arena"])
# app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])
# app.include_router(history.router, prefix="/api/history", tags=["history"])
```

---

## Part 6: Seed Data

**File:** `scripts/seed_data.py`

```python
"""
Seed script for ViGen Arena.
Run: python -m scripts.seed_data
"""

import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal, engine, init_db
from app.models import (
    User, Model, Prompt, Response, Base, CategoryEnum, LicenseEnum, AuthProviderEnum
)

# ============================================================================
# Model Roster (12 models)
# ============================================================================

MODELS_DATA = [
    {
        "id": "claude-opus-46",
        "name": "Claude Opus 4.6",
        "organization": "Anthropic",
        "license": LicenseEnum.PROPRIETARY,
        "color_hex": "#d4514f",
        "description": "Anthropic's latest frontier model. Top reasoning and instruction-following.",
    },
    {
        "id": "gpt-5",
        "name": "GPT-5",
        "organization": "OpenAI",
        "license": LicenseEnum.PROPRIETARY,
        "color_hex": "#00a67e",
        "description": "OpenAI flagship. Strong coding, reasoning, creative writing.",
    },
    {
        "id": "gemini-3-pro",
        "name": "Gemini 3 Pro",
        "organization": "Google",
        "license": LicenseEnum.PROPRIETARY,
        "color_hex": "#4285f4",
        "description": "Google's latest frontier model.",
    },
    {
        "id": "gemini-3-flash",
        "name": "Gemini 3 Flash",
        "organization": "Google",
        "license": LicenseEnum.PROPRIETARY,
        "color_hex": "#34a853",
        "description": "Speed-optimized. Cost-efficient for high-volume tasks.",
    },
    {
        "id": "claude-sonnet-46",
        "name": "Claude Sonnet 4.6",
        "organization": "Anthropic",
        "license": LicenseEnum.PROPRIETARY,
        "color_hex": "#f5a623",
        "description": "Strong balance of quality and speed.",
    },
    {
        "id": "grok-4",
        "name": "Grok 4",
        "organization": "xAI",
        "license": LicenseEnum.PROPRIETARY,
        "color_hex": "#ffc40c",
        "description": "xAI's latest. Trending rapidly in 2026.",
    },
    {
        "id": "deepseek-v32",
        "name": "DeepSeek V3.2",
        "organization": "DeepSeek",
        "license": LicenseEnum.OPEN,
        "color_hex": "#1890ff",
        "description": "685B total / 37B active (MoE). MIT license.",
    },
    {
        "id": "llama-4-maverick",
        "name": "Llama 4 Maverick",
        "organization": "Meta",
        "license": LicenseEnum.OPEN,
        "color_hex": "#0084d1",
        "description": "400B total / 17B active. Outperforms GPT-4o on image understanding.",
    },
    {
        "id": "qwen-35",
        "name": "Qwen 3.5",
        "organization": "Alibaba",
        "license": LicenseEnum.OPEN,
        "color_hex": "#ff6700",
        "description": "235B / 22B active (MoE). SOTA on math, coding, science.",
    },
    {
        "id": "glm-5",
        "name": "GLM-5",
        "organization": "Zhipu AI",
        "license": LicenseEnum.OPEN,
        "color_hex": "#5b7cfa",
        "description": "Strong multilingual. #1 open-source on Arena.ai",
    },
    {
        "id": "kimi-k25",
        "name": "Kimi K2.5",
        "organization": "Moonshot AI",
        "license": LicenseEnum.OPEN,
        "color_hex": "#13c2c2",
        "description": "Strong reasoning. Trending rapidly in 2026.",
    },
    {
        "id": "mistral-large-2",
        "name": "Mistral Large 2",
        "organization": "Mistral AI",
        "license": LicenseEnum.OPEN,
        "color_hex": "#ff8c00",
        "description": "European open-source leader.",
    },
]

# ============================================================================
# Prompts (6 categories × 5 prompts = 30 total)
# ============================================================================

PROMPTS_DATA = [
    # Knowledge
    ("Kiến thức", CategoryEnum.KNOWLEDGE, [
        "Giải thích blockchain cho học sinh lớp 10",
        "AI là gì? Tại sao nó quan trọng cho tương lai?",
        "Điểm khác nhau giữa HTTP và HTTPS là gì?",
        "Photosynthesis hoạt động như thế nào?",
        "Kinh tế học vi mô khác với kinh tế học vĩ mô ở điểm nào?",
    ]),
    # Creative
    ("Sáng tạo", CategoryEnum.CREATIVE, [
        "Viết bài thơ lục bát về mùa xuân Hà Nội",
        "Sáng tác một bài hát về tình bạn",
        "Kể một câu chuyện cổ tích Việt Nam theo cách hiện đại",
        "Viết một đoạn mở đầu hấp dẫn cho một cuốn tiểu thuyết lịch sử",
        "Tạo một kịch bản hài kịch về cuộc sống văn phòng",
    ]),
    # Reasoning
    ("Suy luận", CategoryEnum.REASONING, [
        "Tại sao kinh tế Việt Nam tăng trưởng nhanh?",
        "Phân tích nguyên nhân dẫn đến biến đổi khí hậu toàn cầu",
        "Nêu một số lý do tại sao giáo dục là chìa khóa phát triển xã hội",
        "So sánh ưu và nhược điểm của năng lượng tái tạo so với năng lượng hóa thạch",
        "Giải thích tại sao đổi mới sáng tạo lại quan trọng trong kinh doanh",
    ]),
    # Coding
    ("Lập trình", CategoryEnum.CODING, [
        "Viết hàm Python sắp xếp tên tiếng Việt theo thứ tự abc",
        "Tạo một REST API endpoint để lấy danh sách sản phẩm",
        "Giải thích cơ chế hoạt động của event loop trong Node.js",
        "Viết code SQL để tính lương trung bình của nhân viên theo phòng ban",
        "Lập trình một chatbot đơn giản bằng Python",
    ]),
    # Culture
    ("Văn hóa VN", CategoryEnum.CULTURE, [
        "So sánh phở Hà Nội và phở Sài Gòn",
        "Ý nghĩa của các lễ hội truyền thống ở Việt Nam",
        "Phân tích những ca truyền dân gian nổi tiếng của Việt Nam",
        "Tâm lý người Việt: những đặc điểm nổi bật",
        "Thiệt hại của Tết Nguyên Đán với gia đình Việt Nam là gì?",
    ]),
    # Professional
    ("Nghề nghiệp", CategoryEnum.PROFESSIONAL, [
        "Viết email xin nghỉ phép gửi sếp",
        "Cách viết CV hiệu quả để xin việc",
        "Phỏng vấn cho vị trí Project Manager: câu hỏi và câu trả lời tiêu chuẩn",
        "Cách quản lý xung đột trong nhóm làm việc",
        "Viết một bản báo cáo tiến độ dự án cho khách hàng",
    ]),
]

# ============================================================================
# Sample Responses
# ============================================================================

SAMPLE_RESPONSES = {
    "claude-opus-46": {
        "Giải thích blockchain cho học sinh lớp 10": (
            "Blockchain là một công nghệ lưu trữ dữ liệu dưới dạng một chuỗi các khối (blocks), "
            "mỗi khối chứa một danh sách các giao dịch. Các khối được liên kết với nhau bằng "
            "mã hóa (hash), tạo thành một chuỗi không thể bị thay đổi. Ứng dụng phổ biến nhất "
            "là Bitcoin và các loại tiền điện tử khác."
        ),
    },
    "gpt-5": {
        "Giải thích blockchain cho học sinh lớp 10": (
            "Blockchain là sổ cái kỹ thuật số được bảo vệ bằng mật mã. Nó hoạt động như một "
            "danh sách được chia sẻ giữa nhiều máy tính, mỗi máy có bản sao giống hệt. Mỗi "
            "lần có giao dịch mới, nó được thêm vào sổ cái và được xác minh bởi mạng. Điều "
            "này làm cho blockchain rất an toàn và trong suốt."
        ),
    },
}

# ============================================================================
# Seed function
# ============================================================================

async def seed_database():
    """Populate database with seed data."""

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # ====================================================================
        # Seed Models
        # ====================================================================
        print("Seeding models...")
        for model_data in MODELS_DATA:
            existing = await session.execute(
                "SELECT id FROM models WHERE id = %s",
                (model_data["id"],)
            )
            if not existing.scalar():
                model = Model(**model_data)
                session.add(model)
        await session.commit()
        print(f"✓ Seeded {len(MODELS_DATA)} models")

        # ====================================================================
        # Seed Prompts
        # ====================================================================
        print("Seeding prompts...")
        total_prompts = 0
        for category_name, category_enum, prompts in PROMPTS_DATA:
            for prompt_text in prompts:
                prompt = Prompt(
                    text=prompt_text,
                    category=category_enum,
                    is_suggested=True,
                )
                session.add(prompt)
                total_prompts += 1
        await session.commit()
        print(f"✓ Seeded {total_prompts} prompts")

        # ====================================================================
        # Seed Responses
        # ====================================================================
        print("Seeding responses...")
        prompts = await session.execute("SELECT id, text FROM prompts LIMIT 5")
        prompts = prompts.fetchall()

        for prompt_id, prompt_text in prompts:
            # Add responses for each model
            for model_id in ["claude-opus-46", "gpt-5"]:
                # Use sample response or fallback
                content = SAMPLE_RESPONSES.get(model_id, {}).get(
                    prompt_text,
                    f"[Sample response from {model_id} for: {prompt_text[:50]}...]"
                )
                response = Response(
                    prompt_id=prompt_id,
                    model_id=model_id,
                    content=content,
                    turn_number=1,
                    tokens_used=len(content.split()),
                )
                session.add(response)
        await session.commit()
        print("✓ Seeded sample responses")

        # ====================================================================
        # Seed Demo User
        # ====================================================================
        print("Seeding demo user...")
        demo_user = User(
            email="demo@vigen.ai",
            password_hash="hashed_password_here",  # In production, use bcrypt
            auth_provider=AuthProviderEnum.EMAIL,
            display_name="Demo User",
        )
        session.add(demo_user)
        await session.commit()
        print("✓ Seeded demo user")

        print("\n✓ Seed data complete!")


# ============================================================================
# Run script
# ============================================================================

if __name__ == "__main__":
    asyncio.run(seed_database())
```

---

## Part 7: Alembic Migrations Setup

**File:** `alembic/env.py` (auto-generate migrations)

```bash
# Initialize Alembic
alembic init alembic

# Configure sqlalchemy.url in alembic.ini
# sqlalchemy.url = mysql+aiomysql://root:password@localhost/vigen_arena

# Generate initial migration
alembic revision --autogenerate -m "Initial schema"

# Apply migrations
alembic upgrade head
```

---

## Part 8: Environment Variables

**File:** `.env.example`

```bash
# Database
DATABASE_URL=mysql+aiomysql://root:password@localhost:3306/vigen_arena
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DB=vigen_arena
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10
DB_POOL_RECYCLE=3600
SQL_ECHO=false

# Auth
JWT_SECRET_KEY=your-secret-key-here-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# App
DEPLOY_ENV=development
DEBUG=true
```

---

## Part 9: Quick-Start Checklist

- [ ] MySQL 8.0+ installed and running
- [ ] Create `vigen_arena` database with UTF-8 collation
- [ ] Copy `.env.example` to `.env` and fill in values
- [ ] Install dependencies: `pip install fastapi sqlalchemy aiomysql pydantic[email] python-jose[cryptography] alembic`
- [ ] Run migrations: `alembic upgrade head`
- [ ] Seed data: `python -m scripts.seed_data`
- [ ] Start server: `uvicorn app.main:app --reload`
- [ ] Test health check: `curl http://localhost:8000/health`

---

## Part 10: Dependency Graph (Spec Order)

```
00-data-model-api (THIS SPEC)
  ├─ Blocks: All downstream specs
  ├─ Depends on: MySQL, SQLAlchemy, Pydantic
  └─ Deliverables:
      ├─ Database schema (DDL)
      ├─ SQLAlchemy models
      ├─ Pydantic schemas
      ├─ API endpoint signatures
      └─ Seed data

01-authentication (requires 00)
  ├─ JWT token generation
  ├─ Google login integration
  └─ Guest session tracking

02-core-layout (requires 00, 01)
  ├─ App shell
  └─ Sidebar + topbar

03-battle-mode (requires 00, 01, 02)
  ├─ Blind pairwise voting
  └─ Vote recording

04-side-by-side-mode (requires 00, 01, 02, 03)
  ├─ Named model comparison
  └─ Vote recording

05-direct-chat-mode (requires 00, 01, 02)
  ├─ Single model selection
  └─ Star rating

06-vote-system (requires 00, 03, 04, 05)
  ├─ Vote persistence
  ├─ Guest → user attribution
  └─ Deduplication

07-elo-engine (requires 00, 06)
  ├─ Elo batch calculation
  └─ Bootstrap CIs

08-leaderboard (requires 00, 07)
  ├─ Display rankings
  └─ Statistical views

09-response-serving (requires 00)
  ├─ Pair serving
  └─ Multi-turn support

10-chat-history (requires 00, 01, 06)
  ├─ User conversation history
  └─ Search functionality
```

---

**Status:** Ready for Implementation
**Next Step:** Begin Spec 01 (Authentication & Guest Gate) once this foundation is approved.

