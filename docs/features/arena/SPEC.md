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

### Battle Mode

The core Arena experience: blind pairwise evaluation. Users submit Vietnamese prompts, receive responses from two anonymous models, and vote for the better one. Model identities hidden until after vote. Primary vote collection mechanism — gates the Q2 2026 OKR.

**User Flow:**
1. User lands on Arena or selects "Đấu Trường" → 3 random suggested prompts displayed via API (`/api/prompts?random=true&count=3`)
2. User clicks a prompt or types their own → backend creates a Conversation, selects random model pair, randomizes A/B position server-side, calls LLM APIs for live responses
3. Two anonymous response cards displayed ("Mô hình A" / "Mô hình B")
4. Optional multi-turn: up to 5 follow-up turns via `POST /api/conversations/{id}/turns`, both models receive identical history
5. User votes: "Thắng" / "Thua" / "Hòa" / "Cả hai đều tệ" — vote is immutable
6. Elo reveal: 1.5s animated delay → model identities shown with Elo delta
7. "Trận Mới" resets to fresh prompt + new model pair

**Prompt handling:** 3 random prompts from seed dataset via API (`/api/prompts?random=true&count=3`). Randomized on every page load (not hard-coded). User-typed prompts matched against seed prompts or sent directly to LLMs. Minimum 30 seed prompts at launch. No category chips at P0. "Mới" button refreshes suggested prompts.

**Response serving:** Live LLM inference — every battle triggers 2 simultaneous API calls (one per model). Responses cached in Redis by `(prompt_hash + model_id)` for repeat prompts. 30-second timeout per LLM call. If a model's API is rate-limited or down, fallback model rotation swaps it out. Response retried or shows "Đang tải..." (Loading) with "Thử lại" (Retry) option.

**Response display:** Side-by-side (desktop ≥ 1024px) or stacked (mobile < 768px). Model names hidden. Markdown rendered. Token count shown.

**Voting mechanics:** 4-point scale (Thắng / Thua / Hòa / Cả hai đều tệ). Buttons disabled 1s post-click. Optimistic Elo update within 500ms. Offline votes queued in localStorage.

**Multi-turn:** Max 5 turns. Same model pair throughout. Vote allowed at any turn. Each follow-up triggers 2 more LLM API calls.

**Guest gate:** 3 free battles → sign-up modal on 4th battle attempt. Battle count tracked via `vigen_guest_sessionId` in localStorage. Guest can dismiss modal ("Tiếp Tục Là Khách") — can browse but cannot start new battles. Re-triggers on each subsequent battle attempt. Guest votes linked on signup.

**Model pair selection:** Random from 12 models. Balanced: no pair >1.5× any other in first 100 battles. Position randomized server-side.

**12 Arena models (confirmed):**
- `deepseek/deepseek-r1`
- `google/gemini-2.5-flash`
- `google/gemini-3.1-pro-preview`
- `meta-llama/llama-3-70b-instruct`
- `openai/gpt-4o-mini`
- `openai/gpt-5-mini`
- `openai/gpt-5.4`
- `qwen/qwen-vl-plus`
- `xai/grok-3-mini`
- `xai/grok-3-fast-latest`
- `anthropic/[TBD]`
- `[TBD]`

**Edge cases:**
- Page refresh mid-battle → restored from localStorage (30-min TTL)
- 4th battle attempt as guest → sign-up modal; dismiss allows browse but not battle
- Network drop during vote → queued in localStorage
- LLM API rate limit (429) → request queued with exponential backoff; "Đang tải..." shown
- LLM API timeout (>30s) → "Thử lại" (Retry) or auto-swap model pair
- Mobile (< 768px) → stacked cards, full-width vote buttons

### Side-by-Side Mode

Users explicitly select two models from the registry and compare their responses to the same prompt. Models are visible by name and organization (unlike Battle Mode's blind evaluation). Accessed via "Song Song" mode selector.

**Flow:**
1. Two searchable dropdowns ("Mô hình A", "Mô hình B") + shared prompt input
2. System validates Model A ≠ Model B (error: "Chọn 2 mô hình khác nhau")
3. User submits prompt → backend creates Conversation, calls both model APIs → responses displayed with model names visible
4. User votes on 4-point scale (Thắng / Thua / Hòa / Cả hai đều tệ)
5. Vote triggers Elo update; no Elo reveal panel (models already visible)
6. User can continue conversation after vote ("Tiếp tục hội thoại") or start new comparison ("So sánh tiếp" — retains model selections)

**Multi-turn:** Up to 5 turns per comparison. Both models receive identical conversation history.

### Direct Chat Mode

Single-model evaluation. Users select one model and engage in open-ended multi-turn conversation with no turn limit. Accessed via "Trực Tiếp" mode selector.

**Flow:**
1. One searchable model dropdown + prompt input
2. User submits prompt → backend calls model API → response displayed at full width with model name visible
3. User can rate response (1-10 integer scale) and optionally tag quality (accurate, natural, culturally appropriate, creative, helpful)
4. Multiple ratings per conversation (one per turn); re-rating a turn replaces the old rating
5. Ratings feed a quality feedback engine, NOT the Elo leaderboard

**Note:** Model selection is NOT retained after "New Conversation" (unlike SBS where selections persist).

### Vote System

Captures all user judgments across all three modes. Handles guest sessions, deduplication, offline queueing, and retroactive account linking.

**Vote types:**
- Battle/SBS: "Thắng" | "Thua" | "Hòa" | "Cả hai đều tệ"
- Direct: 1-10 integer rating + optional quality tags

**Storage:** voter ID (or `vigen_guest_sessionId`), conversation ID, turn number, choice, server-generated timestamp, mode

**Offline queue:** Votes queued in localStorage if network unavailable; batched on reconnect. Max queue size: 1,000 votes.

**Deduplication:** One vote per (voterId, conversationId, turnNumber, mode). Second vote in same context overwrites first. Dedup check via Redis (in-memory set) on the fast path — NOT MySQL.

**Guest → Registered:** Guest votes stored with `vigen_guest_sessionId`; retroactively linked to account on signup. Migration is session-keyed (by `vigen_guest_sessionId`), not identity-keyed (by email). After migration, localStorage cleared.

**Rate limiting:** Session-based (never IP-based). Limits by `vigen_guest_sessionId` or `user_id` from JWT:
- Production: 100 votes/session/hour, 60 battle initiations/session/hour
- EVENT_MODE: 200 votes/session/hour, same battle limits

### Elo Engine

Computes model rankings from battle votes using Elo rating algorithm.

**Core algorithm:**
- Expected score: `E_A = 1 / (1 + 10^((R_B - R_A) / 400))`
- Rating update: `R'_A = R_A + K * (S_A - E_A)`
- K-factor: 32 (fixed). Initial rating: 1000.
- Tie / "Both bad": S = 0.5 (draw)

**Confidence intervals:** Bootstrap — 1,000 random permutations of battle sequence, recompute Elo on each, 2.5th/97.5th percentile = 95% CI. Non-overlapping CIs = statistically significant difference.

**Batch schedule:**
- **Production:** Daily at 2 AM UTC. Elo Snapshots are append-only (never updated).
- **EVENT_MODE:** Micro-batch every 2-5 seconds (near-real-time for live demo). Vote worker drains Redis queue, batch-inserts to MySQL, triggers Elo recalculation, publishes updated leaderboard via WebSocket.

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

**Live leaderboard (EVENT_MODE):**
- WebSocket endpoint: `ws://api/leaderboard/live`
- On connect: server sends current leaderboard snapshot
- On Elo recalc: broadcast updated rankings to all connected clients
- Client animates rank changes (rows slide, Elo numbers tick, delta badges flash)
- Heartbeat ping every 15 seconds
- Auto-reconnect on drop with exponential backoff
- Fallback: if WebSocket fails, client polls `/api/leaderboard` every 10 seconds

**Updated daily at 2 AM UTC (production) or every 2-5 seconds (EVENT_MODE).**

### Response Serving

Delivers AI responses via live LLM inference.

**Flow:**
- Battle: Backend creates Conversation, picks random model pair, randomizes A/B position (server-side coin flip), calls both model APIs simultaneously
- SBS: Backend calls APIs for user-selected model pair
- Direct: Backend calls single model API

**Response caching:** Redis cache by `(prompt_hash + model_id)`. Suggested prompts have high cache hit rate. Cache reduces LLM API costs and latency.

**LLM API handling:**
- 30-second timeout per call
- On 429 (rate limit): queue request with exponential backoff, show "Đang tải..."
- On provider down: fallback model rotation — swap out of pair selection
- Response retry on timeout with "Thử lại" option for user

**Model pair distribution:** Balanced — no pair shown >1.5× any other in first 100 battles per category.

**Multi-turn:** Each follow-up turn triggers new LLM API calls with full conversation history.

### Chat History & User Stats

Persistent record of Arena activity in the left sidebar.

**History:** Grouped by date (Hôm Nay, Hôm Qua, Tuần Trước, Tháng Trước). Each entry shows truncated prompt (50 chars) + timestamp + mode icon + vote result badge. Click to review — read-only after vote (no re-voting). Hover shows full prompt tooltip.

**Search:** "Tìm kiếm..." placeholder. Client-side substring match, case-insensitive. "Không tìm thấy" when no results.

**Delete:** "Xóa" on hover. Soft-delete with 5-second undo window. Max 100 conversations displayed.

**User stats:** Vote counter in topbar ("Bạn đã bình chọn: N lần", authenticated only, real-time update). Stats summary in avatar dropdown: total votes, vote breakdown by mode. No separate profile page (P1+).

## Authentication

Auth backend is pre-existing (Google OAuth + email/password). This section covers Arena UI integration and guest-to-account migration.

### Guest Flow
1. User lands on Arena → system generates `vigen_guest_sessionId` (UUID) in localStorage
2. Guest initiates battles — all conversations and votes tied to `vigen_guest_sessionId`
3. Data persisted in both localStorage and backend
4. At 4th battle attempt: sign-up modal displays:
   - "Đăng Nhập Bằng Google" (Google OAuth)
   - Email/password form with "Đăng Ký" button
   - "Tiếp Tục Là Khách" dismiss — can browse but cannot start new battles
5. On successful auth: guest conversations and votes migrated to `user_id`, localStorage cleared

### Session Management
- **Guest:** localStorage `vigen_guest_sessionId` — survives refresh; lost if localStorage cleared
- **Authenticated:** httpOnly cookie JWT — survives refresh + browser restart; expires 30 days
- **Logout:** Token deleted; new `vigen_guest_sessionId` on next visit
- **Multiple tabs:** Independent sessionIds per tab; no cross-tab sync

### Vote Migration
Session-keyed (by `vigen_guest_sessionId`), not identity-keyed (by email):
1. Look up all Conversations matching `vigen_guest_sessionId`
2. Migrate conversations: `vigen_guest_sessionId` → `user_id`
3. Migrate all votes: `vigen_guest_sessionId` → `user_id`
4. Clear localStorage after migration

### Auth Edge Cases
| Scenario | Expected Behavior |
|----------|-------------------|
| Guest clears localStorage before signup | Previous guest votes lost; new sessionId generated |
| Duplicate email signup | Login flow triggered; existing account detected |
| OAuth popup blocked | Error message; fallback to email/password |
| Migration fails during signup | Account created but votes orphaned; recovery via support (P1+) |
| Multiple tabs as guest | Independent sessions; votes don't sync cross-tab |

## Data Model

### Core Entities

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| **Models** | LLM provider instances (12 at launch) | id, name, provider, status (active/archived) |
| **Prompts** | Battle prompts (user-submitted or curated) | id, text, category, subcategory, source (user/curated/seed) |
| **Responses** | Model output for a given prompt | id, prompt_id, model_id, text, tokens_used |
| **Users** | Authenticated accounts | id, email, name, auth_method (google/email), profile_picture_url |
| **Conversations** | A battle, SBS, or direct session | id, user_id, mode, prompt_id, model_ids, guest_sessionId (nullable) |
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

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/models` | Fetch active model list |
| GET | `/api/prompts` | Fetch seed prompts (filtered by category, `?random=true&count=3`) |
| POST | `/api/conversations` | Create conversation (mode, prompt, models) — triggers LLM API calls |
| GET | `/api/conversations/{id}` | Fetch conversation history |
| GET | `/api/conversations/{id}/responses` | Fetch responses for current turn |
| POST | `/api/conversations/{id}/votes` | Submit pairwise or direct vote |
| POST | `/api/conversations/{id}/turns` | Append turn (multi-turn follow-up) — triggers LLM API calls |
| GET | `/api/leaderboard` | Fetch Elo rankings + Pairwise Stats |
| WS | `ws://api/leaderboard/live` | WebSocket for live leaderboard updates (EVENT_MODE) |
| POST | `/api/auth/signup` | Register user, link guest conversations |
| POST | `/api/auth/login` | Authenticate user |
| GET | `/api/users/me` | Current user profile + history |
| POST | `/api/users/logout` | Terminate session |

## Layout & Navigation

### App Structure
Two main regions: persistent **Topbar** across the top, and below it a **Sidebar** (left) alongside the **Main Content Area** (right). On mobile, sidebar collapses into a slide-out drawer with bottom navigation.

### Topbar
| Position | Element | Notes |
|----------|---------|-------|
| Left | ViGen Arena logo + home link | |
| Center | Vote counter ("Bạn đã bình chọn: N lần") | Authenticated users only; real-time update |
| Right | Tabs: "Đấu Trường" \| "Bảng Xếp Hạng" | Arena \| Leaderboard navigation |
| Right | User avatar or "Đăng Nhập" button | Auth state dependent |
| Right | Hamburger icon | Mobile/tablet only |

### Sidebar
- **Search:** "Tìm kiếm..." placeholder, client-side substring match
- **Mode Selector:** "Đấu Trường" (Battle), "Song Song" (Side-by-Side), "Trực Tiếp" (Direct). Selected mode highlighted; persisted in localStorage (`vigen_selected_mode`). Switching mode discards current conversation and resets to welcome screen.
- **Conversation History:** Grouped by date, truncated prompt (50 chars) + timestamp, click to review, "Xóa" on hover, max 100 items

### Responsive Behavior

| Breakpoint | Sidebar | Topbar | Main Area | Bottom Nav |
|------------|---------|--------|-----------|-----------|
| Desktop (≥ 1024px) | Visible, fixed ~300px | Full width, all elements | Fills remaining space | None |
| Tablet (768-1023px) | Hidden, collapsible drawer | Compact: logo + hamburger + right nav | Expands when sidebar closed | None |
| Mobile (< 768px) | Hidden, hamburger drawer | Minimal: logo + hamburger | Full width | 4 icons: Trang Chủ, Bảng Xếp Hạng, Lịch Sử, Tài Khoản |

### Mobile Bottom Navigation
- Home (Trang Chủ), Leaderboard (Bảng Xếp Hạng), History (Lịch Sử), User/Login (Tài Khoản)
- Hamburger opens slide-out drawer with mode selector + search
- Tablet drawer has semi-transparent overlay; closes on outside click or navigation

## Design Decisions

### Battle Mode
- Blind pairwise evaluation — model identities hidden until after vote (prevents brand bias, produces scientifically credible data)
- Position randomization server-side (prevents client-side manipulation; position logged for statistical correction)
- Vote immutable once submitted (no undo — protects data integrity)
- Elo reveal with 1.5-second delay (makes reveal feel meaningful, reinforces "game" metaphor)
- "Both bad" treated as draw in Elo (S = 0.5)
- Turn limit of 5 per battle (caps multi-turn complexity and LLM API costs)
- Conversation state in localStorage with 30-minute TTL
- Guest gate at 4th battle attempt (mirrors Arena.ai onboarding); dismiss allowed but blocks new battles
- Suggested prompts randomized across all categories at P0 (no category filtering at battle time)

### Side-by-Side Mode
- Models visible (unlike blind Battle) — SBS is for explicit comparison, not unbiased signal generation
- No Elo reveal panel after vote — models already visible, reveal adds no information
- Vote buttons show actual model names, not "A / B"
- Model pair persists in localStorage — frequent comparers don't re-select each time
- "Continue conversation after vote" allowed (unlike Battle where vote ends interaction)
- "New comparison" resets conversation but retains model selections

### Direct Chat Mode
- 1-10 integer ratings (not pairwise) — designed for absolute quality measurement, standardized for cross-user comparison
- Feeds quality feedback engine, NOT Elo — keeps absolute and relative signals separate
- No turn limit — exploratory single-model conversations
- Multiple independent ratings per conversation (one per turn), re-rating replaces old
- Model selection NOT retained after "New Conversation" (unlike SBS — re-selection is intentional)
- Quality tags are optional, boolean — metadata for model improvement, not individual scoring

### Vote System
- Offline queue in localStorage (max 1,000 votes) — no vote lost on network failure
- All vote timestamps are server-side generated — prevents clock skew from client-side manipulation
- Dedup constraint: one vote per (voterId, conversationId, turnNumber, mode) — second overwrites first. Dedup via Redis, not MySQL.
- "Both bad" and "Tie" both compress to S=0.5 in Elo
- Optimistic Elo UI update within 500ms; server batch reconciles
- Vote buttons disabled 1 second post-click (double-click protection, client-side)
- All votes equal weight — no reputation weighting at P0
- Guest votes retroactively linked via `vigen_guest_sessionId` on signup (session-keyed migration)
- Session-based rate limiting everywhere (never IP-based)

### Elo Engine
- K=32 fixed, base-10 logistic — standard Elo constant; single battle can shift rating by max 32 points
- Bootstrap CIs (1,000 permutations, 95%) — non-analytical form requires resampling
- Production: daily batch at 2 AM UTC (off-peak). EVENT_MODE: micro-batch every 2-5 seconds.
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
- Production: updated daily at 2 AM UTC. EVENT_MODE: live via WebSocket.
- Seeded with 50+ battles per model pair before public launch (launch gate criterion)

### Response Serving
- Live LLM inference — every battle triggers 2 API calls. Cached in Redis by (prompt_hash + model_id).
- Balanced model pair distribution — no pair >1.5× any other in first 100 battles per category
- Multi-turn triggers new LLM API calls with full conversation history
- Position randomization (A/B) is server-side coin flip — prevents client manipulation
- 30-second timeout per LLM call; fallback model rotation on provider failure

### Authentication
- Auth is integration-only — no rebuild of existing auth backend
- Guest data stored in backend with `vigen_guest_sessionId` — not only localStorage
- JWT stored in httpOnly cookie — not localStorage, for security
- Guest gate triggers at 4th battle attempt; "Tiếp Tục Là Khách" dismiss allowed
- Vote migration uses `vigen_guest_sessionId`, not email matching — session-keyed prevents linking unintended votes
- No session refresh tokens at P0 — simple 30-day expiry

### Chat History & User Stats
- Read-only after vote — re-voting would corrupt Elo time-series
- Soft-delete with 5-second undo window — protects against accidental deletion
- History capped at 100 items — sidebar performance limit; pagination deferred
- Vote counter authenticated-only — guests have no persistent identity to count against
- Vote counter updates real-time — immediate feedback reinforces participation
- Stats in avatar dropdown, not separate profile page — lightweight, no navigation required
- Sidebar search is client-side substring — server-side search deferred to P1+

## Vietnamese UI Labels

| Location | Label | Context |
|----------|-------|---------|
| Topbar Tabs | Đấu Trường \| Bảng Xếp Hạng | Arena \| Leaderboard |
| Mode Selector | Đấu Trường, Song Song, Trực Tiếp | Battle, Side-by-Side, Direct |
| Search | Tìm kiếm... | Conversation search |
| History Groups | Hôm Nay, Hôm Qua, Tuần Trước, Tháng Trước | Date grouping |
| Delete | Xóa | Hover-reveal button |
| Battle Voting | Thắng, Thua, Hòa, Cả hai đều tệ | Win, Lose, Draw, Both bad |
| Direct Rating | Đánh Giá: [1-10] | Rating label |
| Welcome | Mới | Refresh prompts button |
| Auth Modal | Đăng Nhập Bằng Google, Đăng Ký, Tiếp Tục Là Khách | Login, signup, guest |
| Guest Topbar | Đăng Nhập | Login button |
| Auth Topbar | [User Name], Đăng Xuất | User menu, logout |
| Vote Counter | Bạn đã bình chọn: [N] lần | Auth only |
| Gate Message | Vui lòng đăng ký để tiếp tục bình chọn | 4th battle gate |
| Loading | Đang tải... | LLM response loading |
| Retry | Thử lại | LLM timeout retry |
| SBS Continue | Tiếp tục hội thoại | Continue after vote |
| SBS New | So sánh tiếp | New comparison |
| SBS Error | Chọn 2 mô hình khác nhau | Same model validation |
| Empty History | Chưa có cuộc trò chuyện nào | No conversations |
| No Search Results | Không tìm thấy | Search empty state |

## UI/UX

- **Figma:** https://www.figma.com/design/s58LWGpASUoNlHMT51CghO/ViGen-Product-Release-R1?node-id=13920-133313
- **Prototype:** `docs/prototype/arena-prototype.html`

## Theme & Styling

- Typography: Inter font family, system fallback
- Color: Light elegant (white/gray background, blue accent, light gray borders)
- Spacing: 8px grid
- Buttons: Rounded corners (4-8px), hover shadow
- Icons: Material Design or custom, 24px baseline
- Dark Mode: Not in scope (P1+)

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| User clears localStorage mid-battle | New `vigen_guest_sessionId` generated; in-progress battle lost |
| Network offline during vote | Vote queued in localStorage; batched on reconnect |
| Vote queue exceeds 1,000 | Oldest queued votes dropped; warning displayed |
| LLM API rate limit (429) | Request queued with exponential backoff; "Đang tải..." shown |
| LLM API timeout (>30s) | Show timeout message; offer "Thử lại" or auto-swap model pair |
| LLM provider down entirely | Fallback model rotation removes model from pair selection; battle continues with different model |
| Leaderboard queried during Elo batch | Stale Elo shown; refreshes < 5 min |
| User types prompt with no fuzzy match | Prompt sent directly to LLMs for live inference |
| Same model selected for both SBS slots | Error: "Chọn 2 mô hình khác nhau"; submit blocked |
| Non-Vietnamese prompt submitted | Counted for leaderboard at P0 (language filtering deferred) |
| Guest clears localStorage before signup | Previous guest votes lost; new sessionId generated; fresh start |
| Duplicate email signup | Login flow triggered instead; existing account detected |
| OAuth popup blocked | Error message; fallback to email/password |
| Multiple tabs as guest | Independent sessionIds per tab; no cross-tab sync |
| Mode switch mid-conversation | Current conversation discarded; resets to welcome screen |
| All conversations deleted | Empty state: "Chưa có cuộc trò chuyện nào"; welcome screen shows |
| Search with no results | "Không tìm thấy"; user can clear search |
| Navigate to leaderboard during pending vote | Vote continues in background; leaderboard loads |
| WebSocket drops (EVENT_MODE) | Auto-reconnect with exponential backoff; fallback to 10s polling |

## Infrastructure (Live Demo — April 5)

For the AI Day event with 500+ concurrent mobile users:

- **Vote pipeline:** `POST /api/votes` → Redis queue → vote worker micro-batches → MySQL → Elo recalc → WebSocket broadcast
- **EVENT_MODE toggle:** Switches Elo from daily cron to micro-batch (every 2-5s), enables WebSocket, relaxes rate limits (200 votes/session/hour)
- **Performance targets:** Vote submission < 100ms (p95), leaderboard update < 5s, 600 concurrent WebSocket connections
- **Graceful degradation:** Redis down → direct MySQL writes; WebSocket drops → 10s polling; provider down → model rotation
- **Monitoring:** Sentry for error tracking + performance; designated team member monitors backstage during event

See `docs/superpowers/specs/2026-03-21-infra-live-demo-design.md` for full infrastructure spec.

## Open Questions

- Category auto-classification approach (LLM classifier vs keyword rules) — engineering to propose
- Anti-gaming measures beyond basic session-based rate limiting (P1)
- Vietnamese Intelligence Index (VIX) composite methodology
- 2 remaining model slots (Anthropic model TBD, 1 more TBD from Sonny)
