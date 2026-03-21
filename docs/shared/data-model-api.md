# Data Model & API

## Overview

Shared data layer for the Open Data Portal, serving both Arena and Benchmark Leaderboard features. Defines the core data entities, their relationships, API surface, and data integrity rules. This spec establishes WHAT data exists and WHY — not database schema or storage technology choices.

## Database Schema

### Core Entities

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| **Models** | LLM provider instances (12 at launch) | id, name, provider, status (active/archived) |
| **Prompts** | Battle prompts (user-submitted or curated) | id, text, category, subcategory, source (user/curated/seed) |
| **Responses** | Model output for a given prompt | id, prompt_id, model_id, text, tokens_used |
| **Users** | Authenticated accounts | id, email, name, auth_method (google/email), profile_picture_url |
| **Conversations** | A battle, SBS, or direct rating session | id, user_id, mode, prompt_id, model_ids, guest_sessionId (nullable) |
| **Turns** | Single exchange in multi-turn conversation | id, conversation_id, turn_number, user_prompt, response_ids |
| **Votes** | Pairwise preference signal | id, conversation_id, user_id, turn_number, vote_type (win/loss/draw), model_ids_compared, guest_sessionId (nullable) |
| **Direct Ratings** | Absolute quality rating (1-10) | id, response_id, user_id, rating |
| **Elo Snapshots** | Point-in-time Elo rating per model | id, model_id, elo_rating, date_snapshot, vote_count |
| **Pairwise Stats** | Aggregated win/loss/draw between model pairs | id, model_a_id, model_b_id, model_a_wins, model_b_wins, draws, total_matchups |

### Key Relationships
- Prompt → has many Responses (one per model per prompt)
- Conversation → belongs to User and Prompt, has many Votes and Turns
- Turn → belongs to Conversation, references Responses
- Vote → belongs to Conversation and User
- Elo Snapshot → references Model (append-only, never updated)
- Pairwise Stats → references two Models (bidirectional)

### Prompt Categories
Hard Prompts, Coding, Math, Data Analysis, Creative Writing, Instruction Following, Longer Query, Multi-Turn

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/models` | Fetch active model list |
| GET | `/api/prompts` | Fetch seed prompts (filtered by category) |
| POST | `/api/conversations` | Create conversation (mode, prompt, models) |
| GET | `/api/conversations/{id}` | Fetch conversation history |
| GET | `/api/conversations/{id}/responses` | Fetch responses for current turn |
| POST | `/api/conversations/{id}/votes` | Submit pairwise or direct vote |
| POST | `/api/conversations/{id}/turns` | Append turn (multi-turn follow-up) |
| GET | `/api/leaderboard` | Fetch Elo rankings + Pairwise Stats |
| POST | `/api/auth/signup` | Register user, link guest conversations |
| POST | `/api/auth/login` | Authenticate user |
| GET | `/api/users/me` | Current user profile + history |
| POST | `/api/users/logout` | Terminate session |

## Data Flow

1. **Initiate Battle:** Frontend requests prompt (user input or suggested)
2. **Serve Responses:** Backend fetches pre-computed responses from 2-3 models
3. **User Votes:** Frontend submits vote (pairwise win/loss/draw or direct 1-10)
4. **Persist Vote:** Backend stores with user_id or guest_sessionId
5. **Calculate Elo:** Batch recalculation after vote batches
6. **Update Leaderboard:** Query latest Elo Snapshots and Pairwise Stats

## Seed Data Requirements

- 30+ prompts across all categories
- 2+ responses per prompt per model
- 50+ internal team battles per model pair to establish base Elo
- Leaderboard launches with real data, not empty rankings

## Design Decisions

- **Responses immutable after creation** — Ensures consistent vote interpretation. An update would invalidate existing votes.
- **Guest sessions use client-generated UUID in localStorage** — Privacy choice; no device fingerprinting. Key: `vigen_guest_sessionId`.
- **`guest_sessionId` and `user_id` are mutually exclusive** — Prevents duplicate vote counting after guest signs up and votes are migrated.
- **Elo Snapshots are append-only (never updated)** — Enables historical leaderboard replay and trend views.
- **Pairwise votes are ternary only: win/loss/draw** — Prevents ambiguous preference signals.
- **Direct Ratings use 1-10 integers only** — Standardized scoring for cross-user comparison.
- **Simple Elo with fixed K=32 for G3B** — Advanced algorithms (Glicko-2, TrueSkill, Bradley-Terry) deferred until data volume justifies.
- **All vote timestamps are server-side generated** — Prevents clock skew from client-side manipulation.
- **Seed leaderboard with 50+ internal team battles per model pair** — Avoids cold-start problem where rankings are meaningless on day one.
- **Stale Elo acceptable on leaderboard (< 5 min latency)** — Real-time Elo streaming explicitly ruled out; batch updates accepted.

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User clears localStorage before signup | Guest votes lost; new votes start fresh |
| Multiple tabs open as guest | Independent sessionIds per tab; no merging |
| Model goes offline mid-battle | Response retried or marked error; vote still counted if submitted |
| Leaderboard queried during Elo batch | Stale Elo shown; refreshes after batch (< 5 min) |

## Out of Scope

- Advanced Elo algorithms (Glicko-2, TrueSkill) — simple Elo with K=32
- Vote weighting by user reputation — all votes equal weight
- Real-time leaderboard streaming — batch updates acceptable
- Detailed vote audit logs — P1+
