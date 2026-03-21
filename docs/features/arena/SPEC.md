# Arena

## Overview

Live evaluation platform where users compare AI model responses through three modes: Battle (blind pairwise), Side-by-Side (named models), and Direct Chat (single model rating). Battle votes feed an Elo-based ranking system. The Arena produces the human preference signal that complements the Benchmark Leaderboard's automated scores.

## User Stories

### AI/ML Practitioner / Researcher
- As a **Vietnamese AI researcher**, I want to compare two LLMs on a Vietnamese prompt without knowing which model is which, so that my evaluation is unbiased.
- As a **researcher**, I want to see the Elo ranking and confidence intervals for all evaluated models, so that I can cite trustworthy results in my papers.
- As a **researcher**, I want to see all models ranked together regardless of license type, so that I can compare the full landscape.

### Enterprise AI Decision-Maker (PM / CTO)
- As a **product manager** evaluating LLMs for a Vietnamese chatbot, I want to compare specific models side-by-side on prompts relevant to my domain, so that I can make an informed vendor decision.
- As a **CTO**, I want to see how open-source models rank against proprietary models on Vietnamese tasks, so that I can assess the build-vs-buy tradeoff.

### Vietnamese Power User / Domain Expert
- As a **Vietnamese language enthusiast**, I want to evaluate AI responses on cultural nuance (poetry, proverbs, tone), so that I can contribute to improving AI's understanding of Vietnamese.
- As a **community member**, I want to see my vote count and contribution history, so that I feel my participation matters.
- As a **voter**, I want suggested prompts in Vietnamese that test interesting edge cases, so that I don't have to think of prompts from scratch.

## Functional Requirements

### Side-by-Side Mode

Users explicitly select two models from the registry and compare their responses to the same prompt. Models are visible by name and organization (unlike Battle Mode's blind evaluation).

**Flow:**
1. Two searchable dropdowns ("Mô hình A", "Mô hình B") + shared prompt input
2. System validates Model A ≠ Model B (error: "Chọn 2 mô hình khác nhau")
3. User submits prompt → pre-computed responses displayed with model names visible
4. User votes on 4-point scale (A wins / B wins / Tie / Both bad)
5. Vote triggers Elo update; no Elo reveal panel (models already visible)
6. User can continue conversation after vote ("Tiếp tục hội thoại") or start new comparison ("So sánh tiếp" — retains model selections)

**Multi-turn:** Up to 5 turns per comparison. Both models receive identical conversation history.

### Direct Chat Mode

Single-model evaluation. Users select one model and engage in open-ended multi-turn conversation with no turn limit.

**Flow:**
1. One searchable model dropdown + prompt input
2. User submits prompt → response displayed at full width with model name visible
3. User can rate response (1-5 stars) and optionally tag quality (accurate, natural, culturally appropriate, creative, helpful)
4. Multiple ratings per conversation (one per turn); re-rating a turn replaces the old rating
5. Ratings feed a quality feedback engine, NOT the Elo leaderboard

**Note:** Model selection is NOT retained after "New Conversation" (unlike SBS where selections persist).

### Vote System

Captures all user judgments across all three modes. Handles guest sessions, deduplication, offline queueing, and retroactive account linking.

**Vote types:**
- Battle/SBS: "A is better" | "B is better" | "Tie" | "Both bad"
- Direct: 1-5 star rating + optional quality tags

**Storage:** voter ID (or guest_sessionId), conversation ID, turn number, choice, timestamp, mode

**Offline queue:** Votes queued in localStorage if network unavailable; batched on reconnect. Max queue size: 1,000 votes.

**Deduplication:** One vote per (voterId, conversationId, turnNumber, mode). Second vote in same context overwrites first.

**Guest → Registered:** Guest votes stored with guest_sessionId; retroactively linked to account on signup.

### Elo Engine

Computes model rankings from battle votes using Elo rating algorithm.

**Core algorithm:**
- Expected score: `E_A = 1 / (1 + 10^((R_B - R_A) / 400))`
- Rating update: `R'_A = R_A + K * (S_A - E_A)`
- K-factor: 32 (fixed). Initial rating: 1000.
- Tie / "Both bad": S = 0.5 (draw)

**Confidence intervals:** Bootstrap — 1,000 random permutations of battle sequence, recompute Elo on each, 2.5th/97.5th percentile = 95% CI. Non-overlapping CIs = statistically significant difference.

**Batch schedule:** Daily at 2 AM UTC. Elo Snapshots are append-only (never updated). Real-time streaming ruled out.

**Seeding:** 50+ internal team battles per model pair before public launch.

### Arena Leaderboard

Displays model rankings with 5 tabs:

**Tab 1 — Ranking Table:**
Columns: Rank, Model Name, Elo Score, ±CI, Vote Count, Avg Win Rate, Organization, License Type (Open/Prop badge). Default sort: Elo descending. Sort state persisted in localStorage (`vigen_lb_sort`).

**Tab 2 — Win Fraction Heatmap:**
M×M matrix. Cell (i,j) = fraction of non-tied battles model i defeated model j. Position-bias corrected. Blue (→1.0) → white (0.5) → red (→0.0).

**Tab 3 — Battle Count Matrix:**
Symmetric N×N heatmap. Total non-tied battles per pair. Pairs with <50 battles flagged as "unreliable."

**Tab 4 — Average Win Rate:**
Mean win rate per model across all opponents. Uniform sampling (beating weakest counts equally as beating strongest).

**Tab 5 — Confidence Intervals:**
Dot-and-whisker plot of bootstrap Elo CIs.

**Category filter tabs (P1-2):** 7 categories (Overall, Knowledge, Creative, Coding, Culture VN, Math, Professional). Independent Elo per category. Filter doesn't persist to localStorage.

**Updated daily at 2 AM UTC.**

### Response Serving

Delivers pre-computed AI responses. No live inference at P0.

**Flow:**
- Battle: Backend picks random seed prompt + random model pair, randomizes A/B position (server-side coin flip)
- SBS: Backend fetches pre-computed responses for user-selected pair
- Direct: Backend fetches single model response

**Prompt matching:** Levenshtein distance < 10% for fuzzy matching user-typed prompts to seed prompts.

**Model pair distribution:** Balanced — no pair shown >1.5× any other in first 100 battles per category.

**Multi-turn:** Pre-computed as conversation tree indexed by (conversation_id, turn_number).

**Minimum at launch:** 540 pre-computed responses (12 models × 30 prompts + follow-up turns).

### Chat History & User Stats

Persistent record of Arena activity in the left sidebar.

**History:** Grouped by date (Hôm Nay, Hôm Qua, Tuần Trước, Tháng Trước, Cũ Hơn). Each entry shows truncated prompt + mode icon + vote result badge. Click to review — read-only after vote (no re-voting).

**Delete:** Soft-delete with 5-second undo window. Max 100 conversations displayed.

**User stats:** Vote counter in topbar (authenticated only, real-time update). Stats summary in avatar dropdown: total votes, vote breakdown by mode. No separate profile page (P1+).

## Design Decisions

### Side-by-Side Mode
- Models visible (unlike blind Battle) — SBS is for explicit comparison, not unbiased signal generation
- No Elo reveal panel after vote — models already visible, reveal adds no information
- Vote buttons show actual model names, not "A / B"
- Model pair persists in localStorage — frequent comparers don't re-select each time
- "Continue conversation after vote" allowed (unlike Battle where vote ends interaction)
- "New comparison" resets conversation but retains model selections

### Direct Chat Mode
- 1-5 star ratings (not pairwise) — designed for absolute quality measurement
- Feeds quality feedback engine, NOT Elo — keeps absolute and relative signals separate
- No turn limit — exploratory single-model conversations don't have pre-computation complexity
- Multiple independent ratings per conversation (one per turn), re-rating replaces old
- Model selection NOT retained after "New Conversation" (unlike SBS — re-selection is intentional)
- Quality tags are optional, boolean — metadata for model improvement, not individual scoring

### Vote System
- Offline queue in localStorage (max 1,000 votes) — no vote lost on network failure
- Server accepts votes with past timestamps (no staleness rejection)
- Dedup constraint: one vote per (voterId, conversationId, turnNumber, mode) — second overwrites first
- "Both bad" and "Tie" both compress to S=0.5 in Elo
- Optimistic Elo UI update within 500ms; server batch reconciles nightly
- Vote buttons disabled 1 second post-click (double-click protection, client-side)
- All votes equal weight — no reputation weighting at P0
- Guest votes retroactively linked via guest_sessionId on signup

### Elo Engine
- K=32 fixed, base-10 logistic — standard Elo constant; single battle can shift rating by max 32 points
- Bootstrap CIs (1,000 permutations, 95%) — non-analytical form requires resampling
- Daily batch at 2 AM UTC (off-peak) — real-time streaming ruled out
- Elo Snapshots append-only — enables historical trend views and auditing
- Position-bias correction in pairwise win fraction matrix
- Transitivity violations flagged but not auto-corrected — preserved for data transparency
- Migration trigger to Bradley-Terry MLE defined at >500K cumulative battles and order-sensitivity problems

### Leaderboard
- 5 tabs: 1 ranking table + 4 statistical views
- Pairs with <50 battles flagged "unreliable" — data quality signal surfaced to users
- License badge (Open/Prop) on each row — transparency on open-source vs proprietary
- Category filter (7 categories, P1-2) doesn't persist to localStorage — overall ranking is canonical
- Sort state persists in localStorage (`vigen_lb_sort`)
- Updated daily at 2 AM UTC (synchronized with Elo batch)
- Seeded with 50+ battles per model pair before public launch (launch gate criterion)

### Response Serving
- Pre-computed responses only — no live inference. Eliminates real-time API cost, ensures fairness (same prompt → same responses for all users)
- Levenshtein fuzzy match < 10% — finds closest seed prompt for user-typed input
- Balanced model pair distribution — no pair >1.5× any other in first 100 battles per category
- Multi-turn as pre-computed conversation tree — locks model context to original pair
- Minimum 540 pre-computed responses at launch (defined data readiness threshold)
- Position randomization (A/B) is server-side coin flip — prevents client manipulation

### Chat History & User Stats
- Read-only after vote — re-voting would corrupt Elo time-series
- Soft-delete with 5-second undo window — protects against accidental deletion
- History capped at 100 items — sidebar performance limit; pagination deferred
- Vote counter authenticated-only — guests have no persistent identity to count against
- Vote counter updates real-time — immediate feedback reinforces participation
- Stats in avatar dropdown, not separate profile page — lightweight, no navigation required

## UI/UX

- **Figma:** https://www.figma.com/design/s58LWGpASUoNlHMT51CghO/ViGen-Product-Release-R1
- **Prototype:** `docs/prototype/arena-prototype.html`
- **Sub-feature detail:** `docs/features/arena/battle-mode.md`

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| User clears localStorage mid-battle | New guest_sessionId generated; in-progress battle lost |
| Network offline during vote | Vote queued in localStorage; batched on reconnect |
| Vote queue exceeds 1,000 | Oldest queued votes dropped; warning displayed |
| Model goes offline mid-battle | Response retried or marked error; vote counted if submitted |
| Leaderboard queried during Elo batch | Stale Elo shown; refreshes < 5 min |
| User types prompt with no fuzzy match | Closest seed prompt used if Levenshtein < 10%; otherwise "no match" error |
| Same model selected for both SBS slots | Error: "Chọn 2 mô hình khác nhau"; submit blocked |
| Non-Vietnamese prompt submitted | Counted for leaderboard at P0 (language filtering deferred) |

## Open Questions

- Category auto-classification approach (LLM classifier vs keyword rules) — engineering to propose
- Anti-gaming measures beyond basic rate limiting (P1)
- Response pair balancing algorithm details
- Vietnamese Intelligence Index (VIX) composite methodology
