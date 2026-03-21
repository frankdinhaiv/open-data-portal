# G3B: Data Model & API Surface

Covers: P0-8 (Vote Persistence), P0-9 (Response Serving)
Date: March 12, 2026
Status: G3B Design Review
Depends on: None
Visual ref: ../prototype/arena-prototype.html

## 1. What This Feature Does

Defines the core data entities that power ViGen Arena, their relationships, and the high-level API surface through which the frontend requests and submits data. This spec does NOT prescribe database schema, storage technology, or request/response schemas — those are engineering decisions. It establishes WHAT data exists, WHY it exists, and the logical flow through the system.

## 2. Core Data Entities

### Models
- **What:** LLM provider instances (e.g., Claude Opus 4.6, GPT-5, Gemini 3 Pro)
- **Fields:** ID, name, provider (Anthropic/OpenAI/Google/etc.), status (active/archived)
- **Relationships:** Referenced by Responses, Elo Snapshots, Pairwise Stats
- **Notes:** Roster is 12 models [PENDING G2 FINALIZATION]

### Prompts
- **What:** User-submitted or curated battle prompts
- **Fields:** ID, text, category (Hard Prompts, Coding, Math, Data Analysis, Creative Writing, Instruction Following, Longer Query, Multi-Turn), subcategory (occupational), created_at, source (user/curated/seed)
- **Relationships:** Has many Responses (one response per model per prompt), has many Conversations
- **Notes:** Seed dataset includes 30+ prompts across Arena.ai categories

### Responses
- **What:** Model output for a given prompt
- **Fields:** ID, prompt_id, model_id, text, created_at, tokens_used
- **Relationships:** Belongs to Prompt and Model, has many Turns (in multi-turn conversations), referenced by Votes
- **Notes:** Immutable once created; one response per model per prompt

### Users
- **What:** Authenticated accounts
- **Fields:** ID, email, name, auth_method (google/email), created_at, profile_picture_url
- **Relationships:** Has many Conversations, has many Direct Ratings
- **Notes:** Guest accounts are pseudo-users with localStorage-backed sessionId (no database entry until signup)

### Conversations
- **What:** A single battle, SBS, or direct rating session
- **Fields:** ID, user_id, mode (battle/sbs/direct), prompt_id, model_ids (array of 2-3 model IDs), created_at, guest_sessionId (nullable, links pre-auth votes)
- **Relationships:** Belongs to User and Prompt, has many Votes, has many Turns
- **Notes:** Guest conversations stored in localStorage with guest_sessionId UUID; linked to User on signup

### Turns
- **What:** A single exchange in a multi-turn conversation
- **Fields:** ID, conversation_id, turn_number, user_prompt, response_ids (array of 2-3 Response IDs, one per model)
- **Relationships:** Belongs to Conversation, references Responses
- **Notes:** Turn 1 is the initial prompt; Turn 2+ are follow-ups

### Votes
- **What:** A user's preference signal (pairwise comparison or direct rating)
- **Fields:** ID, conversation_id, user_id, turn_number, vote_type (win/loss/draw), model_ids_compared (array of 2 for pairwise), rating_score (1-10 for direct), created_at, guest_sessionId (nullable)
- **Relationships:** Belongs to Conversation and User
- **Notes:** Pairwise votes record winner(s) and loser(s); direct votes record absolute score. Guest votes carry guest_sessionId; after user signup, guest_sessionId is replaced with user_id

### Direct Ratings
- **What:** Explicit quality ratings for individual model responses (separate from pairwise votes)
- **Fields:** ID, response_id, user_id, rating (1-10), created_at
- **Relationships:** References Response and User
- **Notes:** Used in Direct Rating mode; can coexist with pairwise votes

### Elo Snapshots
- **What:** Point-in-time Elo rating for each model
- **Fields:** ID, model_id, elo_rating, date_snapshot, vote_count (cumulative votes factored into this rating)
- **Relationships:** References Model
- **Notes:** Recalculated after each vote batch; historical snapshots enable leaderboard trends

### Pairwise Stats
- **What:** Aggregated win/loss/draw counts between any two models
- **Fields:** ID, model_a_id, model_b_id, model_a_wins, model_b_wins, draws, total_matchups
- **Relationships:** References Models (bidirectional)
- **Notes:** Used for leaderboard detail views; recalculated after vote batches

## 3. Data Flow

**Prompt → Response → Vote → Leaderboard Update**

1. **Initiate Battle:** Frontend requests prompt (user input or suggested random prompt)
2. **Serve Responses:** Backend fetches or generates responses from 2-3 models for that prompt
3. **User Votes:** Frontend submits vote (pairwise win/loss/draw or direct 1-10 rating)
4. **Persist Vote:** Backend stores vote with user_id (or guest_sessionId if unauthenticated)
5. **Calculate Elo:** Backend recalculates Elo ratings after each vote batch
6. **Update Leaderboard:** Leaderboard queries latest Elo Snapshots and Pairwise Stats

## 4. Data Integrity Rules

| Rule | Why |
|------|-----|
| Every Vote must reference exactly one Conversation | Ensures vote is tied to a specific prompt + user intent |
| Every Conversation has exactly one Prompt | One prompt per session prevents ambiguous vote attribution |
| Every Conversation references 2-3 Models | Battle/SBS requires fixed model count |
| Every Response is immutable after creation | Ensures consistent vote interpretation |
| Votes can have guest_sessionId OR user_id, not both | Prevents duplicate vote counting after signup |
| Guest sessionId is a UUID, unique per localStorage session | Deterministic, no device fingerprinting |
| Elo Snapshots are point-in-time; never updated, only created | Enables historical leaderboard replay |
| Direct Ratings are 1-10 integers only | Standardized scoring for comparison |
| Pairwise votes are ternary: win/loss/draw only | Prevents ambiguous preference signals |

## 5. API Surface (High-Level)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/models` | Fetch active model list |
| GET | `/api/prompts` | Fetch seed prompts (filtered by category) |
| POST | `/api/conversations` | Create new conversation (specify mode, prompt, models) |
| GET | `/api/conversations/{id}` | Fetch conversation history (prompts, responses, votes) |
| GET | `/api/conversations/{id}/responses` | Fetch responses for current turn |
| POST | `/api/conversations/{id}/votes` | Submit pairwise or direct vote |
| POST | `/api/conversations/{id}/turns` | Append turn (multi-turn follow-up) |
| GET | `/api/leaderboard` | Fetch current Elo rankings + Pairwise Stats |
| POST | `/api/auth/signup` | Register user, link guest conversations to account |
| POST | `/api/auth/login` | Authenticate user |
| GET | `/api/users/me` | Fetch current user profile + conversation history |
| POST | `/api/users/logout` | Terminate session |

## 6. Seed Data Requirements

- **30+ prompts** seeded across Arena.ai categories (Hard Prompts, Coding, Math, Data Analysis, Creative Writing, Instruction Following, Longer Query, Multi-Turn)
- **2+ responses per prompt per model** (ensure diversity for seeded battles)
- **~100 votes per model pair** (internal team) to establish base Elo ratings
- **Leaderboard launches with real data**, not empty rankings
- Seeding votes are visible and attributed to internal team accounts

## 7. Guest Data Lifecycle

| Phase | Storage | Identifier | Linked? |
|-------|---------|-----------|---------|
| Pre-signup | localStorage | guest_sessionId (UUID) | No |
| Vote submitted | Backend + localStorage | guest_sessionId | No |
| 4th battle → Sign-up modal | localStorage (cleared after signup) | guest_sessionId → user_id | Yes |
| Post-signup | Database | user_id | Yes |

## 8. Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User votes without signup, then signs up with same email | All guest votes linked to new account; guest_sessionId replaced with user_id |
| User clears localStorage before signup | Guest conversations/votes lost (no recovery); new votes start fresh as authenticated user |
| User votes from multiple tabs | Each tab has separate localStorage sessionId; votes are independent; no merging |
| Model goes offline mid-battle | Conversation continues; response generation retried or marked as error; vote still counted if submitted |
| User requests leaderboard while Elo calculation in progress | Stale Elo shown; refreshes after batch completes (< 5 min latency acceptable) |

## 9. Acceptance Criteria

- [ ] Models entity schema supports all 12 roster members [PENDING G2 FINALIZATION]
- [ ] Prompts entity includes category + subcategory fields for filtering
- [ ] Responses are immutable after creation (no update/delete operations exposed)
- [ ] Conversations track guest_sessionId for pre-auth votes
- [ ] Votes support both pairwise (win/loss/draw) and direct (1-10) types
- [ ] Guest conversations auto-link to user_id on signup, localStorage cleared
- [ ] Elo Snapshots are append-only; historical snapshots queryable
- [ ] Pairwise Stats support bidirectional model lookups (A vs B, B vs A)
- [ ] API endpoints are stateless and can be called from frontend without backend state assumptions
- [ ] Guest sessionId is a deterministic UUID, generated client-side and persisted in localStorage
- [ ] All vote timestamps are server-side generated to prevent clock skew
- [ ] Seed data (30+ prompts, ~100 votes per model pair) loaded before launch
- [ ] Database transactions prevent race conditions on vote submission + Elo recalculation
- [ ] Leaderboard query returns Elo ratings, rank, win/loss/draw counts, and confidence intervals

## 10. Out of Scope

- Advanced Elo algorithms (Glicko-2, TrueSkill) — use simple Elo with fixed K-factor for G3B
- Vote weighting by user reputation or expertise — all votes equal weight in G3B
- Real-time leaderboard streaming — batch Elo updates acceptable
- Vote audit logs beyond timestamps — detailed audit trail is P1+
- Multi-language prompt curation — English seed prompts for G3B
