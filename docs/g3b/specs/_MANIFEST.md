# ViGen Arena — G3B PM Specs (Full Manifest)

**Created:** March 12, 2026
**Format:** Markdown | 100-250 lines per spec
**Language:** English (flow descriptions), Vietnamese (UI copy only)

## Files Delivered

### 00-data-model-api.md
**Covers:** P0-8, P0-9 | Data Model & API Surface
**What:** Core data entities (Models, Prompts, Responses, Users, Conversations, Turns, Votes, Direct Ratings, Elo Snapshots, Pairwise Stats), relationships, API surface, seed data requirements.
**Key Feature:** Guest data lifecycle — localStorage → backend → account linking on signup.

### 01-authentication.md
**Covers:** P0-6, P0-7 | Authentication & Guest Session Flow
**What:** Guest session lifecycle (3 free battles → sign-up gate), Google OAuth + email/password auth, guest data migration on signup.
**Key Feature:** Guest votes stored with `guest_sessionId`, retroactively linked to `user_id` on signup.

### 02-core-layout.md
**Covers:** P0-5, P0-10 | Core Layout & Vietnamese-First UI
**What:** App shell (topbar, sidebar, main content area), navigation, responsive breakpoints, Vietnamese labels.
**Key Feature:** Exactly 3 suggested prompts (text only, no category chips). Mode switching navigates back to arena from leaderboard.

### 03-battle-mode.md
**Covers:** P0-1 | Battle Mode
**What:** Blind pairwise evaluation — random model selection, position randomization, multi-turn, 4-point voting, Elo reveal.
**Key Feature:** A/B position randomized server-side; skeleton loaders until both responses ready; turn limit 5.

### 04-side-by-side-mode.md
**Covers:** P0-2 | Side-by-Side Mode
**What:** User-selected model comparison with visible model names, multi-turn, searchable dropdowns.
**Key Feature:** Multi-turn continues after vote ("Tiếp tục hội thoại" + "So sánh tiếp"). Model pair persisted in localStorage.

### 05-direct-chat-mode.md
**Covers:** P0-3 | Direct Chat Mode
**What:** Single model evaluation with 1-5 star rating + quality tags (accurate, natural, culturally appropriate, creative, helpful).
**Key Feature:** Star rating + quality tags coexist; tags optional.

### 06-vote-system.md
**Covers:** P0-8 | Vote Persistence
**What:** Captures user judgments (battle/SBS/direct), handles guest persistence, offline queueing (1000-item cap, FIFO), retroactive account linking.
**Key Feature:** Guest votes stored locally, retroactively linked on signup (no data loss). Re-vote overwrites previous vote on same turn.

### 07-elo-engine.md
**Covers:** P0-11 | Elo Calculation Engine
**What:** Computes model rankings using K=32, base-10 logistic. Bootstrap 95% CIs (1K permutations). Daily batch.
**Key Feature:** Leaderboard seeded with 50+ internal team votes per model pair before public launch.

### 08-leaderboard.md
**Covers:** P0-4 | Arena Leaderboard
**What:** Main table (Rank, Model, Elo, CI, Vote Count, Avg Win Rate, Org, License Type) + 4 statistical tabs + 7 category filter tabs.
**Key Feature:** License badges (Open/Prop). Category filter tabs (P1-2 preview). Sort persistence in localStorage.

### 09-response-serving.md
**Covers:** P0-9 | Response Pair Serving
**What:** Delivers pre-computed responses (no live inference). Random pair selection, position randomization, multi-turn trees.
**Key Feature:** Exactly 3 suggested prompts per welcome screen (`count=3`). 540 pre-computed responses minimum.

### 10-chat-history-user-stats.md
**Covers:** P0-5 (Conversation History), User Story (vote count + contribution history)
**What:** Sidebar conversation history (grouped by date, searchable, deletable with undo), user stats in topbar ("🗳️ [N] phiếu").
**Key Feature:** Vote counter auth-gated. Read-only past conversations. Soft-delete with 5s undo.

---

## Cross-Reference Map

```
User Flow →
  Auth (01) ← session management
    ↓ (creates conversations)
  Data Model (00) ← entities & API
    ↓ (renders in)
  Core Layout (02) ← app shell

  Battle (03) / SBS (04) / Direct (05) ← evaluation modes
    ↓ (submit votes)
  Vote System (06) ← stores votes
    ↓ (daily batch)
  Elo Engine (07) ← computes rankings
    ↓ (serves snapshots)
  Leaderboard (08) ← displays rankings

  Response Serving (09) ← delivers prompts + responses
    ↓ (queues to)
  Vote System (06)

  Chat History (10) ← displays past conversations + stats
    ↑ (reads from)
  Data Model (00) + Vote System (06)
```

---

## Status

All 11 specs ready for G3B engineering review.
