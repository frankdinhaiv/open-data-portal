# Arena Feature — Test Strategy, Plan & Cases

**Feature:** Arena (Battle, Side-by-Side, Direct Chat)
**Spec:** `docs/features/arena/SPEC.md`
**Last updated:** 2026-03-21
**Status:** Pre-launch QA

---

## Part 1: Test Strategy

### 1.1 Objective

Validate that the Arena feature meets all functional requirements in SPEC.md before the public launch (target: Apr 5, 2026). Ensure the three Arena modes (Battle, SBS, Direct Chat), vote system, Elo engine, leaderboard, and supporting features work correctly across devices and network conditions.

### 1.2 Scope

**In scope:**
- All 3 Arena modes: Battle, Side-by-Side, Direct Chat
- Vote system (submission, dedup, offline queue, guest linking)
- Elo engine (calculation, confidence intervals, batch schedule)
- Arena Leaderboard (5 tabs, sorting, filtering)
- Response serving (live LLM inference, Redis caching, pair selection, multi-turn)
- Chat history & user stats
- Guest gating (3 free battles → auth modal on 4th battle attempt)
- localStorage persistence & recovery
- Mobile responsiveness (< 768px breakpoint)
- Authentication flow (register, login, guest→registered linking)
- Live infrastructure (EVENT_MODE, WebSocket, Redis vote queue, graceful degradation)

**Out of scope:**
- Benchmark Leaderboard (separate feature, separate SPEC)
- Category auto-classification (open question per SPEC)
- Anti-gaming measures (P1, not P0)
- Vietnamese Intelligence Index (VIX) — methodology TBD
- Load testing / performance benchmarking (functional infrastructure tests included in Section 3.13)

### 1.3 Risk Areas (Priority Testing)

| Risk Area | Severity | Rationale |
|-----------|----------|-----------|
| Elo calculation correctness | Critical | Incorrect rankings undermine scientific credibility |
| Vote data integrity | Critical | Lost/duplicate votes corrupt the entire dataset |
| Battle mode blindness | Critical | Leaking model identity before vote invalidates data |
| Guest gating bypass | High | localStorage-based counter can be manipulated |
| Offline vote queue | High | Edge case-heavy; data loss risk |
| Multi-turn state consistency | High | Both models must receive identical history |
| Mobile layout | Medium | Stacked cards + full-width buttons must work |
| LLM API reliability | Medium | 12 providers with varying rate limits and latency; fallback rotation critical |

### 1.4 Test Environments

| Environment | Purpose | Stack |
|-------------|---------|-------|
| Local dev | Unit + integration tests | Vite dev server + FastAPI + SQLite |
| Staging | E2E + browser QA | Deployed build, seeded DB |
| Mobile emulation | Responsive testing | Browser DevTools (375×812, 390×844) |

### 1.5 Test Types

| Type | Coverage | Tools |
|------|----------|-------|
| **Unit tests** | Elo calculation, fuzzy matching, vote dedup logic | pytest (backend), vitest (frontend) |
| **API integration** | All 6 Arena endpoints, auth flow, error responses | pytest + httpx / Postman |
| **Component tests** | VoteBar, EloReveal, DualResponsePanel, ChatInput | vitest + @testing-library/react |
| **E2E / Browser QA** | Full user flows across all 3 modes | gstack /qa (Playwright-based) |
| **Exploratory** | Edge cases, localStorage manipulation, network drops | Manual + gstack /browse |

### 1.6 Entry / Exit Criteria

**Entry criteria:**
- [ ] All 3 modes render without console errors
- [ ] Backend serves responses for at least 30 seed prompts × 12 models
- [ ] Auth flow (register + login) functional
- [ ] DB seeded with models and seed prompts; LLM API keys configured for live inference

**Exit criteria:**
- [ ] All Critical and High test cases pass
- [ ] No data integrity issues (votes recorded correctly, Elo computed correctly)
- [ ] Model identities never leaked before vote in Battle mode
- [ ] Mobile layout functional at 375px width
- [ ] Health score ≥ 80 from gstack /qa run

---

## Part 2: Test Plan

### 2.1 Test Areas & Priority

| # | Area | Test Cases | Priority | Est. Time (CC) |
|---|------|-----------|----------|-----------------|
| 1 | Battle Mode | TC-B01 to TC-B19 | P0 | 25 min |
| 2 | Side-by-Side Mode | TC-S01 to TC-S10 | P0 | 15 min |
| 3 | Direct Chat Mode | TC-D01 to TC-D08 | P0 | 10 min |
| 4 | Vote System | TC-V01 to TC-V14 | P0 | 20 min |
| 5 | Elo Engine | TC-E01 to TC-E08 | P0 | 15 min |
| 6 | Arena Leaderboard | TC-L01 to TC-L10 | P1 | 15 min |
| 7 | Response Serving | TC-R01 to TC-R07 | P0 | 10 min |
| 8 | Chat History & Stats | TC-H01 to TC-H08 | P1 | 10 min |
| 9 | Guest Gating & Auth | TC-G01 to TC-G12 | P0 | 15 min |
| 10 | localStorage & Recovery | TC-LS01 to TC-LS06 | P1 | 10 min |
| 11 | Mobile & Responsive | TC-M01 to TC-M08 | P1 | 12 min |
| 12 | Edge Cases & Error Handling | TC-X01 to TC-X13 | P1 | 15 min |
| 13 | Live Infrastructure | TC-INF01 to TC-INF06 | P0 | 15 min |

**Total: ~128 test cases across 13 areas**

### 2.2 Test Data Requirements

| Data | Minimum | Source |
|------|---------|--------|
| Seed prompts | 30 (across categories) | `backend/seed.py` |
| Models | 12 (mix of open + proprietary) | models table |
| LLM API access | 12 models with active API keys | Provider configs |
| Test user accounts | 3 (new, existing, guest→registered) | Created during test |
| Internal team battles | 50+ per model pair | Seeding requirement |

### 2.3 Execution Order

1. **Smoke test** — Can the app load? Do all 3 modes render? (TC-B01, TC-S01, TC-D01)
2. **Core flow** — Complete one battle end-to-end (TC-B02 through TC-B07)
3. **Vote integrity** — Votes stored correctly, Elo updates (TC-V01 through TC-V05, TC-E01 through TC-E04)
4. **Auth & gating** — Guest limit, register, login, vote linking (TC-G01 through TC-G08)
5. **All modes** — SBS and Direct mode full flows (TC-S02 through TC-S10, TC-D02 through TC-D08)
6. **Leaderboard** — All 5 tabs, sorting, filtering (TC-L01 through TC-L10)
7. **Edge cases** — Network, localStorage, mobile, error states (TC-X01 through TC-X13)
8. **Live infrastructure** — EVENT_MODE, WebSocket, Redis, degradation (TC-INF01 through TC-INF06)

---

## Part 3: Test Cases

### Legend

- **Pre:** Preconditions
- **Steps:** Numbered actions
- **Expected:** Expected result
- **Spec ref:** Traceability to SPEC.md section
- **Type:** Manual / API / Unit / E2E

---

### 3.1 Battle Mode (TC-B01 to TC-B19)

#### TC-B01: Battle mode loads with suggested prompts
- **Priority:** P0
- **Type:** E2E
- **Pre:** User navigates to Arena, Battle mode selected
- **Steps:**
  1. Open Arena page
  2. Verify Battle mode is default (or select "Đấu Trường")
- **Expected:**
  - 3 random suggested prompts displayed
  - Prompts are in Vietnamese
  - WelcomeScreen shows ⚔️ icon and "Đấu Trường GenAI Việt Nam" title
- **Spec ref:** Battle Mode → User Flow step 1

#### TC-B02: Submit prompt and receive anonymous responses
- **Priority:** P0
- **Type:** E2E
- **Pre:** Battle mode active, prompts visible
- **Steps:**
  1. Click one of the 3 suggested prompts (or type a custom prompt)
  2. Wait for responses to load
- **Expected:**
  - Two response cards displayed: "Mô hình A" / "Mô hình B"
  - Model names are NOT visible (identities hidden)
  - Markdown is rendered in responses
  - Token count shown for each response
- **Spec ref:** Battle Mode → User Flow steps 2-3, Response display

#### TC-B03: Vote buttons display and function
- **Priority:** P0
- **Type:** E2E
- **Pre:** Two anonymous responses displayed
- **Steps:**
  1. Verify 4 vote buttons visible: "Thắng" / "Thua" / "Hòa" / "Cả hai đều tệ"
  2. Click "Thắng"
- **Expected:**
  - Vote is recorded (API call to POST /api/conversations/{id}/votes)
  - Vote buttons become disabled for 1 second after click
  - Optimistic Elo update within 500ms
- **Spec ref:** Battle Mode → Voting mechanics

#### TC-B04: Elo reveal after vote
- **Priority:** P0
- **Type:** E2E
- **Pre:** Vote submitted in Battle mode
- **Steps:**
  1. Submit a vote
  2. Observe reveal animation
- **Expected:**
  - 1.5-second animated delay before reveal
  - Model identities revealed (actual model names + organizations)
  - Elo delta shown for both models (e.g., "+5" / "-5")
  - "Trận Mới" (New Battle) button appears
- **Spec ref:** Battle Mode → User Flow step 6

#### TC-B05: New battle resets state
- **Priority:** P0
- **Type:** E2E
- **Pre:** Elo reveal visible after a completed battle
- **Steps:**
  1. Click "⚔️ Trận Mới"
- **Expected:**
  - Previous conversation cleared
  - New set of 3 random suggested prompts displayed
  - New random model pair selected (may differ from previous)
  - Turn counter reset to 0
- **Spec ref:** Battle Mode → User Flow step 7

#### TC-B06: Model identities hidden before vote
- **Priority:** P0 (Critical — data integrity)
- **Type:** E2E + API
- **Pre:** Battle mode, responses displayed
- **Steps:**
  1. Inspect the DOM for model names/IDs in response cards
  2. Check Network tab — does the POST /api/conversations response include model names?
  3. Check localStorage for model identity leaks
- **Expected:**
  - Response cards show only "Mô hình A" / "Mô hình B" — no model names
  - API response for POST /api/conversations may include model IDs internally but frontend must NOT render them before vote
  - No model identity in localStorage before vote
- **Spec ref:** Battle Mode → Design Decisions (blind pairwise evaluation)

#### TC-B07: Vote is immutable
- **Priority:** P0
- **Type:** E2E
- **Pre:** Vote submitted in Battle mode
- **Steps:**
  1. After voting, attempt to click a different vote button
  2. Navigate back to the battle from history
- **Expected:**
  - Vote buttons are disabled after submission — cannot change vote
  - History view is read-only (no re-voting)
- **Spec ref:** Battle Mode → Design Decisions (vote immutable)

#### TC-B08: Multi-turn battle (up to 5 turns)
- **Priority:** P0
- **Type:** E2E
- **Pre:** Battle mode, first response displayed
- **Steps:**
  1. Instead of voting, type a follow-up prompt
  2. Submit follow-up
  3. Repeat for turns 2-5
  4. Attempt a 6th follow-up
- **Expected:**
  - Follow-up responses come from same model pair
  - Both models receive identical conversation history
  - Turn counter increments (shown in ChatInput)
  - Vote is allowed at any turn
  - 5th turn is the maximum — 6th follow-up should be blocked or vote forced
- **Spec ref:** Battle Mode → Multi-turn

#### TC-B09: Vote at any turn in multi-turn
- **Priority:** P1
- **Type:** E2E
- **Pre:** Multi-turn battle at turn 3
- **Steps:**
  1. After 3 turns, click a vote button
- **Expected:**
  - Vote accepted at turn 3
  - Elo reveal shows with model identities
  - Turn number recorded in vote data
- **Spec ref:** Battle Mode → Multi-turn ("Vote allowed at any turn")

#### TC-B10: Suggested prompts are random
- **Priority:** P1
- **Type:** E2E
- **Pre:** None
- **Steps:**
  1. Load Arena 5 times, record suggested prompts each time
- **Expected:**
  - Prompts vary across loads (not always the same 3)
  - All prompts come from the seed dataset
- **Spec ref:** Battle Mode → Prompt handling

#### TC-B11: Custom prompt triggers live inference
- **Priority:** P1
- **Type:** API
- **Pre:** Seed prompts loaded
- **Steps:**
  1. Type a custom prompt not matching any seed prompt
  2. Submit
- **Expected:**
  - Prompt sent directly to LLMs for live inference
  - Two anonymous responses returned from model pair
  - If prompt matches a seed prompt, cached response may be returned (faster)
- **Spec ref:** Battle Mode → Prompt handling, Response Serving

#### TC-B12: Suggested prompt uses cached response
- **Priority:** P1
- **Type:** API
- **Pre:** Seed prompts loaded, Redis cache warm
- **Steps:**
  1. Click a suggested prompt that has been requested before
  2. Observe response time
- **Expected:**
  - Response served from Redis cache (by prompt_hash + model_id)
  - Faster than first-time live inference
- **Spec ref:** Response Serving → Response caching

#### TC-B13: Desktop layout — side-by-side
- **Priority:** P1
- **Type:** E2E
- **Pre:** Desktop viewport (≥ 1024px)
- **Steps:**
  1. Complete a battle prompt
  2. Observe response layout
- **Expected:**
  - Two responses displayed side-by-side (columns)
- **Spec ref:** Battle Mode → Response display

#### TC-B14: Mobile layout — stacked cards
- **Priority:** P1
- **Type:** E2E
- **Pre:** Viewport < 768px
- **Steps:**
  1. Set viewport to 375×812
  2. Complete a battle prompt
- **Expected:**
  - Response cards stacked vertically
  - Vote buttons are full-width
- **Spec ref:** Edge Cases → "Mobile (< 768px)"

#### TC-B15: Model pair balanced distribution
- **Priority:** P2
- **Type:** API / Data
- **Pre:** Database with battle records
- **Steps:**
  1. Create 100 conversations via POST /api/conversations
  2. Tally pair frequency
- **Expected:**
  - No single pair appears >1.5× more than any other pair
- **Spec ref:** Battle Mode → Model pair selection

#### TC-B16: Position randomization is server-side
- **Priority:** P1
- **Type:** API
- **Pre:** None
- **Steps:**
  1. Create multiple conversations with the same prompt via POST /api/conversations
  2. Check which model is "A" vs "B" each time
- **Expected:**
  - Position assignment varies (not always same model in A slot)
  - Randomization done server-side (not predictable from client)
- **Spec ref:** Battle Mode → Model pair selection ("Position randomized server-side")

#### TC-B17: LLM API timeout handling
- **Priority:** P0
- **Type:** API
- **Pre:** Battle mode active
- **Steps:**
  1. Submit a prompt
  2. Simulate slow LLM response (>30 seconds)
- **Expected:**
  - "Đang tải..." (Loading) indicator shown during wait
  - After timeout, "Thử lại" (Retry) option displayed
  - User can retry or system auto-swaps model pair
- **Spec ref:** Battle Mode → Response serving, Edge Cases → "LLM API timeout"

#### TC-B18: Fallback model rotation on 429
- **Priority:** P0
- **Type:** API
- **Pre:** Battle mode active
- **Steps:**
  1. Submit a prompt
  2. Simulate one LLM provider returning 429 (rate limit)
- **Expected:**
  - Rate-limited model swapped out of pair selection
  - Different model pair served via fallback rotation
  - Battle continues without error visible to user
- **Spec ref:** Battle Mode → Response serving, Edge Cases → "LLM API rate limit (429)"

#### TC-B19: Response caching for suggested prompts
- **Priority:** P1
- **Type:** API
- **Pre:** Redis cache available, suggested prompt previously requested
- **Steps:**
  1. Submit a suggested prompt for the first time (cache miss)
  2. Submit the same suggested prompt again (cache hit)
  3. Compare response times
- **Expected:**
  - Second request returns faster (served from Redis cache by prompt_hash + model_id)
  - Response content identical for same prompt+model combination
- **Spec ref:** Response Serving → Response caching

---

### 3.2 Side-by-Side Mode (TC-S01 to TC-S10)

#### TC-S01: SBS mode loads with model dropdowns
- **Priority:** P0
- **Type:** E2E
- **Pre:** Switch to Side-by-Side mode
- **Steps:**
  1. Select Side-by-Side mode
  2. Verify UI elements
- **Expected:**
  - Two searchable dropdowns visible ("Mô hình A", "Mô hình B")
  - Shared prompt input visible
  - Models populated from /api/models
- **Spec ref:** Side-by-Side Mode → Flow step 1

#### TC-S02: Same model validation
- **Priority:** P0
- **Type:** E2E
- **Pre:** SBS mode active
- **Steps:**
  1. Select the same model in both dropdowns
  2. Attempt to submit a prompt
- **Expected:**
  - Error displayed: "Chọn 2 mô hình khác nhau"
  - Submit is blocked
- **Spec ref:** Side-by-Side Mode → Flow step 2

#### TC-S03: SBS comparison with visible model names
- **Priority:** P0
- **Type:** E2E
- **Pre:** Two different models selected
- **Steps:**
  1. Select Model A and Model B
  2. Submit a prompt
- **Expected:**
  - Responses displayed with actual model names visible (not "Mô hình A/B")
  - Both responses rendered with markdown
- **Spec ref:** Side-by-Side Mode → Flow step 3, Design Decisions

#### TC-S04: SBS vote shows model names in buttons
- **Priority:** P1
- **Type:** E2E
- **Pre:** SBS responses displayed
- **Steps:**
  1. Observe vote buttons
- **Expected:**
  - Vote buttons show actual model names (not generic "A / B")
  - 4 options: "{Model A} wins" / "{Model B} wins" / "Tie" / "Both bad"
- **Spec ref:** SBS Design Decisions

#### TC-S05: No Elo reveal panel in SBS
- **Priority:** P1
- **Type:** E2E
- **Pre:** SBS vote submitted
- **Steps:**
  1. Submit a vote in SBS mode
- **Expected:**
  - No Elo reveal animation/panel (models already visible)
  - Confirmation message shown: "🏆 {modelName} thắng!" or "🤝 Hòa"
  - Vote still triggers Elo update on backend
- **Spec ref:** SBS Design Decisions ("No Elo reveal panel")

#### TC-S06: Continue conversation after SBS vote
- **Priority:** P1
- **Type:** E2E
- **Pre:** SBS vote submitted
- **Steps:**
  1. After voting, click "Tiếp tục hội thoại"
  2. Type a follow-up prompt
- **Expected:**
  - Same model pair continues responding
  - Conversation context maintained
- **Spec ref:** SBS → Flow step 6

#### TC-S07: New comparison retains model selections
- **Priority:** P1
- **Type:** E2E
- **Pre:** SBS vote submitted
- **Steps:**
  1. After voting, click "So sánh tiếp" (new comparison)
- **Expected:**
  - Conversation cleared
  - Model A and Model B dropdowns retain previous selections
  - New prompt input ready
- **Spec ref:** SBS → Flow step 6, Design Decisions

#### TC-S08: SBS multi-turn (up to 5 turns)
- **Priority:** P1
- **Type:** E2E
- **Pre:** SBS mode, first response displayed
- **Steps:**
  1. Submit follow-up prompts through 5 turns
- **Expected:**
  - Both models receive identical conversation history
  - Turn counter increments
  - Max 5 turns
- **Spec ref:** SBS → Multi-turn

#### TC-S09: SBS vote triggers Elo update
- **Priority:** P0
- **Type:** API
- **Pre:** SBS vote submitted
- **Steps:**
  1. Submit SBS vote via API
  2. Query elo_snapshots table for both models
- **Expected:**
  - New elo_snapshot rows created for both models
  - Elo ratings updated according to vote choice
- **Spec ref:** Vote System — SBS votes count toward Elo

#### TC-S10: Model pair persists in localStorage
- **Priority:** P2
- **Type:** E2E
- **Pre:** SBS mode with models selected
- **Steps:**
  1. Select two models and complete a comparison
  2. Reload the page
  3. Return to SBS mode
- **Expected:**
  - Model selections persisted (or not — verify against current implementation)
- **Spec ref:** SBS Design Decisions ("Model pair persists in localStorage")

---

### 3.3 Direct Chat Mode (TC-D01 to TC-D08)

#### TC-D01: Direct mode loads with single model dropdown
- **Priority:** P0
- **Type:** E2E
- **Pre:** Switch to Direct Chat mode
- **Steps:**
  1. Select Direct Chat mode
- **Expected:**
  - One searchable model dropdown visible
  - Prompt input visible
  - No second model dropdown
- **Spec ref:** Direct Chat Mode → Flow step 1

#### TC-D02: Direct chat response at full width
- **Priority:** P1
- **Type:** E2E
- **Pre:** Direct mode, model selected
- **Steps:**
  1. Submit a prompt
- **Expected:**
  - Single response displayed at full width (not split layout)
  - Model name visible
  - Markdown rendered
- **Spec ref:** Direct Chat Mode → Flow step 2

#### TC-D03: Integer rating (1-10)
- **Priority:** P0
- **Type:** E2E
- **Pre:** Direct mode response displayed
- **Steps:**
  1. Rate the response with a score of 7
  2. Verify rating is recorded
- **Expected:**
  - 1-10 integer rating UI available (not star-based)
  - Rating submitted via POST /api/conversations/{id}/votes
  - Confirmation: "✓ Đánh giá đã được ghi nhận"
- **Spec ref:** Direct Chat Mode → Flow step 3

#### TC-D04: Quality tags (optional)
- **Priority:** P1
- **Type:** E2E
- **Pre:** Direct mode response displayed
- **Steps:**
  1. Select quality tags: "Chính xác", "Tự nhiên", "Sáng tạo"
  2. Submit rating with tags
- **Expected:**
  - Tags are optional — can submit without them
  - Tags: accurate, natural, culturally appropriate, creative, helpful
  - Tags stored as quality_tags in vote record
- **Spec ref:** Direct Chat Mode → Flow step 3

#### TC-D05: Ratings feed quality engine, NOT Elo
- **Priority:** P0
- **Type:** API
- **Pre:** Direct mode vote submitted
- **Steps:**
  1. Submit a direct-mode rating
  2. Check elo_snapshots table
- **Expected:**
  - Vote recorded with mode="direct"
  - No Elo snapshot created/updated for direct ratings
  - Direct ratings kept separate from Elo ranking
- **Spec ref:** Direct Chat Design Decisions

#### TC-D06: Multiple ratings per conversation
- **Priority:** P1
- **Type:** E2E
- **Pre:** Direct mode, multi-turn conversation
- **Steps:**
  1. Rate turn 1 with score 8
  2. Submit follow-up, rate turn 2 with score 4
- **Expected:**
  - Each turn can be rated independently
  - Both ratings stored with correct turn_number
- **Spec ref:** Direct Chat Mode → Flow step 4

#### TC-D07: Re-rating replaces old rating
- **Priority:** P1
- **Type:** API
- **Pre:** Direct mode, turn already rated
- **Steps:**
  1. Rate turn 1 with score 5
  2. Re-rate turn 1 with score 9
- **Expected:**
  - Second rating overwrites first (dedup constraint)
  - Only one vote per (voterId, conversationId, turnNumber, mode)
- **Spec ref:** Direct Chat Mode → Flow step 4, Vote System → Deduplication

#### TC-D08: Model selection NOT retained after new conversation
- **Priority:** P2
- **Type:** E2E
- **Pre:** Direct mode conversation completed
- **Steps:**
  1. Complete a conversation
  2. Click "New Conversation"
- **Expected:**
  - Model dropdown resets (no model pre-selected)
  - This differs from SBS where model selection persists
- **Spec ref:** Direct Chat Design Decisions

---

### 3.4 Vote System (TC-V01 to TC-V14)

#### TC-V01: Vote stored with correct fields
- **Priority:** P0
- **Type:** API
- **Pre:** Any mode
- **Steps:**
  1. Submit a vote via POST /api/conversations/{id}/votes
  2. Query votes table
- **Expected:**
  - Record contains: voter_id (or session_id for guest), conversation_id, turn_number, choice, timestamp, mode
- **Spec ref:** Vote System → Storage

#### TC-V02: Vote deduplication — overwrite
- **Priority:** P0
- **Type:** API
- **Pre:** Existing vote for same (voterId, conversationId, turnNumber, mode)
- **Steps:**
  1. Submit vote choice "a" for a battle
  2. Submit vote choice "b" for the same (voterId, conversationId, turnNumber, mode)
- **Expected:**
  - Second vote overwrites first
  - Only one vote record exists for that combination
- **Spec ref:** Vote System → Deduplication

#### TC-V03: Vote buttons disabled for 1 second after click
- **Priority:** P1
- **Type:** E2E
- **Pre:** Vote buttons visible
- **Steps:**
  1. Click a vote button
  2. Immediately try clicking another button
- **Expected:**
  - All vote buttons disabled for 1 second post-click
  - Prevents double-click/rapid switching
- **Spec ref:** Vote System → Design Decisions

#### TC-V04: Optimistic Elo update within 500ms
- **Priority:** P1
- **Type:** E2E
- **Pre:** Battle mode, vote submitted
- **Steps:**
  1. Submit vote
  2. Measure time until Elo reveal/update appears
- **Expected:**
  - Elo update visible in UI within 500ms of vote click
- **Spec ref:** Vote System → Voting mechanics

#### TC-V05: "Both bad" treated as draw (S=0.5)
- **Priority:** P0
- **Type:** API + Unit
- **Pre:** None
- **Steps:**
  1. Submit vote with choice "bad"
  2. Check Elo deltas in response
- **Expected:**
  - Elo calculated with S_A = 0.5 (same as tie)
  - Both models get symmetric rating change
- **Spec ref:** Vote System → Design Decisions, Elo Engine

#### TC-V06: Offline vote queued in localStorage
- **Priority:** P1
- **Type:** E2E
- **Pre:** Responses displayed, network disconnected
- **Steps:**
  1. Disconnect network (DevTools → Offline)
  2. Submit a vote
  3. Reconnect network
- **Expected:**
  - Vote queued in localStorage
  - On reconnect, queued votes batch-submitted
  - No vote data lost
- **Spec ref:** Vote System → Offline queue

#### TC-V07: Offline queue max size (1,000 votes)
- **Priority:** P2
- **Type:** Unit
- **Pre:** Simulated offline with 1,000+ queued votes
- **Steps:**
  1. Queue 1,001 votes in localStorage
- **Expected:**
  - Oldest queued votes dropped
  - Warning displayed to user
- **Spec ref:** Edge Cases → "Vote queue exceeds 1,000"

#### TC-V08: [REMOVED — timestamps are server-generated]

_Server generates all vote timestamps. Client-submitted timestamps are ignored. No test needed._

#### TC-V09: Guest votes use session_id
- **Priority:** P0
- **Type:** API
- **Pre:** Not logged in
- **Steps:**
  1. Submit a vote as a guest
  2. Check vote record in DB
- **Expected:**
  - voter_id is null
  - session_id is populated (from localStorage vigen_guest_sessionId)
- **Spec ref:** Vote System → Guest → Registered

#### TC-V10: Guest votes retroactively linked on signup
- **Priority:** P0
- **Type:** API
- **Pre:** 2 guest votes submitted with session_id
- **Steps:**
  1. Submit 2 votes as guest
  2. Register a new account
  3. Query votes for the new user
- **Expected:**
  - Previous guest votes linked to new account
  - session_id matches the guest session
- **Spec ref:** Vote System → Guest → Registered

#### TC-V11: All votes equal weight
- **Priority:** P2
- **Type:** Unit
- **Pre:** None
- **Steps:**
  1. Verify Elo calculation uses same K-factor regardless of voter
- **Expected:**
  - No reputation weighting — all votes treated equally
- **Spec ref:** Vote System → Design Decisions ("All votes equal weight")

#### TC-V12: Vote types per mode
- **Priority:** P0
- **Type:** API
- **Pre:** None
- **Steps:**
  1. Battle vote: choice "a"/"b"/"tie"/"bad"
  2. SBS vote: choice "a"/"b"/"tie"/"bad"
  3. Direct vote: 1-10 integer rating + optional tags
- **Expected:**
  - Battle/SBS accept 4-point choice
  - Direct accepts 1-10 integer rating + quality tags
  - Invalid combinations rejected
- **Spec ref:** Vote System → Vote types

#### TC-V13: Session-based rate limiting
- **Priority:** P0
- **Type:** API
- **Pre:** Active session (guest or authenticated)
- **Steps:**
  1. Submit >100 votes within 1 hour from the same session
- **Expected:**
  - First 100 votes accepted
  - 101st vote rejected with rate limit error
  - Rate limiting keyed by vigen_guest_sessionId (guest) or user_id from JWT (authenticated)
  - Never IP-based
- **Spec ref:** Vote System → Rate limiting

#### TC-V14: Redis dedup check
- **Priority:** P1
- **Type:** API
- **Pre:** Redis available
- **Steps:**
  1. Submit a vote for (voterId, conversationId, turnNumber, mode)
  2. Submit a second vote for the same combination
  3. Verify dedup mechanism
- **Expected:**
  - Dedup check performed via Redis in-memory set (fast path)
  - NOT via MySQL query
  - Second vote overwrites first correctly
- **Spec ref:** Vote System → Deduplication ("Dedup via Redis, not MySQL")

---

### 3.5 Elo Engine (TC-E01 to TC-E08)

#### TC-E01: Elo expected score formula
- **Priority:** P0
- **Type:** Unit
- **Pre:** None
- **Steps:**
  1. Call elo_expected(1600, 1400)
  2. Call elo_expected(1000, 1000)
  3. Call elo_expected(800, 1200)
- **Expected:**
  - E(1600,1400) ≈ 0.76
  - E(1000,1000) = 0.50
  - E(800,1200) ≈ 0.24
- **Spec ref:** Elo Engine → Core algorithm

#### TC-E02: Elo update calculation
- **Priority:** P0
- **Type:** Unit
- **Pre:** K=32
- **Steps:**
  1. elo_update(1000, 1000, 1.0) — A wins from equal ratings
  2. elo_update(1000, 1000, 0.0) — B wins
  3. elo_update(1000, 1000, 0.5) — Tie
- **Expected:**
  - A wins: delta_a = +16, delta_b = -16
  - B wins: delta_a = -16, delta_b = +16
  - Tie: delta_a = 0, delta_b = 0
- **Spec ref:** Elo Engine → Core algorithm (K=32)

#### TC-E03: Elo update with unequal ratings
- **Priority:** P0
- **Type:** Unit
- **Pre:** K=32
- **Steps:**
  1. elo_update(1200, 800, 1.0) — Favored model wins (upset factor low)
  2. elo_update(800, 1200, 1.0) — Underdog wins (big upset)
- **Expected:**
  - Favored wins: small gain for A, small loss for B
  - Underdog wins: large gain for A, large loss for B
  - K-factor caps max shift at 32 points
- **Spec ref:** Elo Engine → Design Decisions (K=32)

#### TC-E04: Initial rating is 1000
- **Priority:** P0
- **Type:** API
- **Pre:** New model with no votes
- **Steps:**
  1. Query leaderboard for a model with 0 votes
- **Expected:**
  - Elo rating = 1000 (default starting value)
- **Spec ref:** Elo Engine → Core algorithm ("Initial rating: 1000")

#### TC-E05: Bootstrap confidence intervals
- **Priority:** P1
- **Type:** Unit
- **Pre:** Sample vote dataset
- **Steps:**
  1. Call bootstrap_elo with 100 votes, 1000 permutations
  2. Check CI bounds for each model
- **Expected:**
  - 95% CI = 2.5th and 97.5th percentile of bootstrap Elo distribution
  - CI narrows with more votes
  - Non-overlapping CIs indicate statistically significant difference
- **Spec ref:** Elo Engine → Confidence intervals

#### TC-E06: Elo snapshots are append-only
- **Priority:** P1
- **Type:** API
- **Pre:** Existing elo_snapshot records
- **Steps:**
  1. Submit a vote
  2. Check elo_snapshots table
- **Expected:**
  - New snapshot rows inserted (not updated)
  - Historical snapshots preserved
- **Spec ref:** Elo Engine → Design Decisions ("Elo Snapshots append-only")

#### TC-E07: Tie and "Both bad" produce same Elo change
- **Priority:** P1
- **Type:** Unit
- **Pre:** None
- **Steps:**
  1. elo_update(1000, 1000, 0.5) — Tie
  2. Verify "Both bad" also maps to score 0.5
- **Expected:**
  - Identical Elo deltas for tie and "both bad"
- **Spec ref:** Elo Engine → "Tie / Both bad: S = 0.5"

#### TC-E08: K-factor is configurable
- **Priority:** P2
- **Type:** Unit
- **Pre:** Check config.py
- **Steps:**
  1. Verify ELO_K is defined in config
  2. Change ELO_K and verify Elo deltas scale
- **Expected:**
  - K imported from config (not hardcoded)
  - Higher K = larger rating swings
- **Spec ref:** Elo Engine → Core algorithm

---

### 3.6 Arena Leaderboard (TC-L01 to TC-L10)

#### TC-L01: Ranking table displays correctly
- **Priority:** P0
- **Type:** E2E
- **Pre:** Navigate to Leaderboard
- **Steps:**
  1. Open Leaderboard (Tab 1 — Ranking Table)
- **Expected:**
  - Columns: Rank, Model Name, Elo Score, ±CI, Vote Count, Avg Win Rate, Organization, License Type badge
  - Default sort: Elo descending
  - License badge: Open (green) or Prop (blue/gray)
- **Spec ref:** Arena Leaderboard → Tab 1

#### TC-L02: Ranking table sort persistence
- **Priority:** P1
- **Type:** E2E
- **Pre:** Leaderboard open
- **Steps:**
  1. Sort by Vote Count (click column header)
  2. Navigate away
  3. Return to Leaderboard
- **Expected:**
  - Sort state persisted in localStorage key `vigen_lb_sort`
  - Same sort applied on return
- **Spec ref:** Arena Leaderboard → Tab 1

#### TC-L03: Win fraction heatmap (Tab 2)
- **Priority:** P1
- **Type:** E2E
- **Pre:** Navigate to Leaderboard Tab 2
- **Steps:**
  1. Open Win Fraction Heatmap tab
- **Expected:**
  - M×M matrix displayed
  - Cell (i,j) = fraction of non-tied battles model i defeated model j
  - Color scale: Blue (→1.0) → White (0.5) → Red (→0.0)
  - Position-bias corrected
- **Spec ref:** Arena Leaderboard → Tab 2

#### TC-L04: Battle count matrix (Tab 3)
- **Priority:** P1
- **Type:** E2E
- **Pre:** Navigate to Leaderboard Tab 3
- **Steps:**
  1. Open Battle Count Matrix tab
  2. Find a pair with <50 battles
- **Expected:**
  - Symmetric N×N heatmap
  - Pairs with <50 battles flagged as "unreliable"
- **Spec ref:** Arena Leaderboard → Tab 3

#### TC-L05: Average win rate (Tab 4)
- **Priority:** P1
- **Type:** E2E
- **Pre:** Navigate to Leaderboard Tab 4
- **Steps:**
  1. Open Average Win Rate tab
- **Expected:**
  - Mean win rate per model across all opponents displayed
- **Spec ref:** Arena Leaderboard → Tab 4

#### TC-L06: Confidence intervals chart (Tab 5)
- **Priority:** P1
- **Type:** E2E
- **Pre:** Navigate to Leaderboard Tab 5
- **Steps:**
  1. Open Confidence Intervals tab
- **Expected:**
  - Dot-and-whisker plot showing bootstrap Elo CIs
  - Each model shown with point estimate + error bars
- **Spec ref:** Arena Leaderboard → Tab 5

#### TC-L07: License filter
- **Priority:** P1
- **Type:** E2E
- **Pre:** Leaderboard open
- **Steps:**
  1. Filter by "Open" license
  2. Filter by "Prop" license
  3. Reset to "All"
- **Expected:**
  - Table filters to show only matching license type
  - All models shown when "All" selected
- **Spec ref:** Arena Leaderboard (license badge / filter)

#### TC-L08: Leaderboard during Elo batch
- **Priority:** P2
- **Type:** Manual
- **Pre:** Query leaderboard during 2 AM UTC batch
- **Steps:**
  1. Access leaderboard during batch computation
- **Expected:**
  - Stale Elo shown (previous batch results)
  - Refreshes within 5 minutes after batch completes
- **Spec ref:** Edge Cases → "Leaderboard queried during Elo batch"

#### TC-L09: Category filter tabs (P1-2 feature)
- **Priority:** P2
- **Type:** E2E
- **Pre:** Category filters implemented
- **Steps:**
  1. Select category filter (e.g., "Knowledge", "Creative")
- **Expected:**
  - 7 categories available
  - Independent Elo per category
  - Filter does NOT persist to localStorage
- **Spec ref:** Arena Leaderboard → Category filter tabs

#### TC-L10: Seeding requirement met
- **Priority:** P0
- **Type:** Data
- **Pre:** Pre-launch
- **Steps:**
  1. Query vote count per model pair
- **Expected:**
  - Each model pair has 50+ internal team battles
  - This is a launch gate criterion
- **Spec ref:** Elo Engine → Seeding

---

### 3.7 Response Serving (TC-R01 to TC-R07)

#### TC-R01: Live LLM inference for battle responses
- **Priority:** P0
- **Type:** API
- **Pre:** None
- **Steps:**
  1. Submit prompt via POST /api/conversations (mode=battle)
  2. Verify response source
- **Expected:**
  - Backend creates Conversation, selects random model pair, calls both LLM APIs simultaneously
  - Responses returned from live inference (not pre-computed)
  - Redis cache checked first by (prompt_hash + model_id); cache miss triggers live call
- **Spec ref:** Response Serving → Flow, Design Decisions

#### TC-R02: Minimum 30 seed prompts at launch
- **Priority:** P0
- **Type:** Data
- **Pre:** Database seeded
- **Steps:**
  1. GET /api/prompts and count available seed prompts
- **Expected:**
  - >= 30 seed prompts in database
  - All 12 model API keys configured and functional
- **Spec ref:** Battle Mode → Prompt handling ("Minimum 30 seed prompts at launch")

#### TC-R03: Redis response cache lookup
- **Priority:** P1
- **Type:** API
- **Pre:** Redis available, seed prompts loaded
- **Steps:**
  1. Submit a suggested prompt (first time — cache miss, live inference)
  2. Submit the same prompt again (cache hit)
- **Expected:**
  - Cache key: (prompt_hash + model_id)
  - First request: live LLM inference, response cached in Redis
  - Second request: served from Redis cache (faster)
- **Spec ref:** Response Serving → Response caching

#### TC-R04: Multi-turn triggers new LLM API calls
- **Priority:** P1
- **Type:** API
- **Pre:** Active battle conversation
- **Steps:**
  1. Start battle via POST /api/conversations, get turn 1 responses
  2. Submit follow-up via POST /api/conversations/{id}/turns, get turn 2 responses
- **Expected:**
  - Each follow-up triggers new LLM API calls with full conversation history
  - Turn 2 responses indexed by (conversation_id, turn_number)
  - Same model pair throughout
- **Spec ref:** Response Serving → Multi-turn

#### TC-R05: Prompt endpoint returns 3 random prompts
- **Priority:** P1
- **Type:** API
- **Pre:** ≥ 30 seed prompts
- **Steps:**
  1. GET /api/prompts?random=true&count=3
- **Expected:**
  - Returns prompts from seed dataset
  - Multiple calls return varying prompts
- **Spec ref:** Battle Mode → Prompt handling

#### TC-R06: SBS fetches responses for user-selected pair
- **Priority:** P0
- **Type:** API
- **Pre:** SBS mode
- **Steps:**
  1. POST /api/conversations with mode=sbs, model_a=X, model_b=Y, prompt
- **Expected:**
  - Backend calls both model APIs for the user-selected pair
  - Both responses returned for the same prompt via live inference
- **Spec ref:** Response Serving → Flow (SBS)

#### TC-R07: Direct mode fetches single response
- **Priority:** P0
- **Type:** API
- **Pre:** Direct mode
- **Steps:**
  1. POST /api/conversations with mode=direct, model_id=X, prompt
- **Expected:**
  - Backend calls single model API for live inference
  - Returns single model's response with model metadata
- **Spec ref:** Response Serving → Flow (Direct)

---

### 3.8 Chat History & User Stats (TC-H01 to TC-H08)

#### TC-H01: History grouped by date
- **Priority:** P1
- **Type:** E2E
- **Pre:** Logged in, multiple battles across different days
- **Steps:**
  1. Open sidebar history
- **Expected:**
  - Groups: Hôm Nay, Hôm Qua, Tuần Trước, Tháng Trước, Cũ Hơn
  - Each entry shows truncated prompt + mode icon + vote result badge
- **Spec ref:** Chat History → History

#### TC-H02: History is read-only after vote
- **Priority:** P0
- **Type:** E2E
- **Pre:** History with completed battles
- **Steps:**
  1. Click on a history entry
- **Expected:**
  - Conversation displayed in read-only mode
  - No vote buttons / no ability to re-vote
- **Spec ref:** Chat History → Design Decisions

#### TC-H03: Soft-delete with 5-second undo
- **Priority:** P1
- **Type:** E2E
- **Pre:** History entries visible
- **Steps:**
  1. Delete a history entry
  2. Click "Undo" within 5 seconds
  3. Delete another entry, wait >5 seconds
- **Expected:**
  - Undo within 5s: entry restored
  - After 5s: entry permanently soft-deleted
- **Spec ref:** Chat History → Delete

#### TC-H04: History capped at 100 items
- **Priority:** P2
- **Type:** API
- **Pre:** User with >100 conversations
- **Steps:**
  1. Open history sidebar
- **Expected:**
  - Maximum 100 conversations displayed
  - Most recent shown first
- **Spec ref:** Chat History → Design Decisions ("100 items")

#### TC-H05: Vote counter in topbar (authenticated)
- **Priority:** P1
- **Type:** E2E
- **Pre:** Logged in
- **Steps:**
  1. Verify vote counter visible in topbar
  2. Submit a vote
- **Expected:**
  - Counter visible in topbar
  - Real-time update after vote
- **Spec ref:** Chat History → User stats

#### TC-H06: Vote counter hidden for guests
- **Priority:** P1
- **Type:** E2E
- **Pre:** Not logged in
- **Steps:**
  1. Check topbar as guest
- **Expected:**
  - No vote counter visible (guests have no persistent identity)
- **Spec ref:** Chat History → Design Decisions ("authenticated-only")

#### TC-H07: Stats in avatar dropdown
- **Priority:** P1
- **Type:** E2E
- **Pre:** Logged in, several votes cast
- **Steps:**
  1. Click avatar dropdown
- **Expected:**
  - Total votes displayed
  - Vote breakdown by mode (battle/sbs/direct)
  - No separate profile page
- **Spec ref:** Chat History → User stats

#### TC-H08: History mode icon correct
- **Priority:** P2
- **Type:** E2E
- **Pre:** History with battles from all 3 modes
- **Steps:**
  1. Check mode icons in history sidebar
- **Expected:**
  - Battle: ⚔️
  - SBS: ⚖️
  - Direct: 💬
- **Spec ref:** Chat History → History

---

### 3.9 Guest Gating & Auth (TC-G01 to TC-G12)

#### TC-G01: 3 free battles, auth modal on 4th attempt
- **Priority:** P0
- **Type:** E2E
- **Pre:** Fresh session, not logged in
- **Steps:**
  1. Complete battle 1 — submit prompt, vote
  2. Complete battle 2
  3. Complete battle 3
  4. Attempt to start battle 4 (4th battle attempt)
- **Expected:**
  - Battles 1-3: work normally
  - 4th battle attempt: sign-up modal appears with:
    - "Đăng Nhập Bằng Google" (Google OAuth) button
    - Email/password form with "Đăng Ký" button
    - "Tiếp Tục Là Khách" dismiss option
  - Battle count tracked via vigen_guest_sessionId in localStorage
- **Spec ref:** Battle Mode → Guest gate, Authentication → Guest Flow

#### TC-G02: Guest session tracked via vigen_guest_sessionId
- **Priority:** P1
- **Type:** E2E
- **Pre:** None
- **Steps:**
  1. Complete 2 battles as guest
  2. Check localStorage for vigen_guest_sessionId key
- **Expected:**
  - vigen_guest_sessionId (UUID) exists in localStorage
  - Battle count associated with this session ID
  - Same sessionId persists across page reloads
- **Spec ref:** Battle Mode → Guest gate, Authentication → Guest Flow

#### TC-G03: Auth modal — register flow
- **Priority:** P0
- **Type:** E2E
- **Pre:** Auth modal triggered
- **Steps:**
  1. Fill in email, password, display name
  2. Submit registration
- **Expected:**
  - Account created
  - JWT stored in httpOnly cookie (not localStorage)
  - Guest conversations and votes migrated to user_id
  - localStorage vigen_guest_sessionId cleared after migration
  - Modal closes
  - User can continue battling
- **Spec ref:** Auth flow, Authentication → Vote Migration

#### TC-G04: Auth modal — login flow
- **Priority:** P0
- **Type:** E2E
- **Pre:** Existing account
- **Steps:**
  1. Click "Đăng nhập" (login)
  2. Enter email + password
- **Expected:**
  - Login successful
  - JWT stored in httpOnly cookie (not localStorage)
  - Vote counter appears in topbar
- **Spec ref:** Auth flow, Authentication → Session Management

#### TC-G05: Guest votes linked after signup
- **Priority:** P0
- **Type:** API
- **Pre:** 2 guest votes submitted
- **Steps:**
  1. Complete 2 battles as guest (votes have session_id)
  2. Register new account
  3. Check if guest votes are linked to new account
- **Expected:**
  - Guest votes retroactively associated with the new user_id
- **Spec ref:** Vote System → Guest → Registered

#### TC-G06: Logout clears session
- **Priority:** P1
- **Type:** E2E
- **Pre:** Logged in
- **Steps:**
  1. Click logout
- **Expected:**
  - JWT cookie deleted via POST /api/users/logout
  - Vote counter hidden
  - Guest mode resumed — new vigen_guest_sessionId generated on next visit
- **Spec ref:** Auth flow, Authentication → Session Management

#### TC-G07: Guest gating only applies to Battle mode
- **Priority:** P1
- **Type:** E2E
- **Pre:** Fresh guest session
- **Steps:**
  1. Use SBS mode without logging in
  2. Use Direct mode without logging in
- **Expected:**
  - Verify whether guest gating applies to all modes or only Battle
  - (Spec says "3 free battles" — clarify scope)
- **Spec ref:** Battle Mode → Guest gate

#### TC-G08: Auth persistence across page reload
- **Priority:** P1
- **Type:** E2E
- **Pre:** Logged in
- **Steps:**
  1. Reload page
- **Expected:**
  - Still logged in (JWT in httpOnly cookie survives reload + browser restart; expires 30 days)
  - User info displayed correctly
- **Spec ref:** Auth flow, Authentication → Session Management

#### TC-G09: Guest dismiss — browse but no new battles
- **Priority:** P0
- **Type:** E2E
- **Pre:** Auth modal triggered on 4th battle attempt
- **Steps:**
  1. Click "Tiếp Tục Là Khách" to dismiss modal
  2. Attempt to browse leaderboard and history
  3. Attempt to start a new battle
- **Expected:**
  - Modal dismissed
  - Guest can browse leaderboard, history, and other content
  - Guest cannot start new battles — auth modal re-triggers on each subsequent battle attempt
- **Spec ref:** Battle Mode → Guest gate, Authentication → Guest Flow

#### TC-G10: Google OAuth flow
- **Priority:** P0
- **Type:** E2E
- **Pre:** Auth modal triggered
- **Steps:**
  1. Click "Đăng Nhập Bằng Google" button
  2. Complete Google OAuth flow in popup
- **Expected:**
  - Google OAuth popup opens
  - On successful auth: account created/linked, JWT stored in httpOnly cookie
  - Guest conversations and votes migrated to new user_id
  - Modal closes, user can continue battling
- **Spec ref:** Authentication → Guest Flow

#### TC-G11: OAuth popup blocked — fallback to email/password
- **Priority:** P1
- **Type:** E2E
- **Pre:** Auth modal triggered, browser blocks popups
- **Steps:**
  1. Click "Đăng Nhập Bằng Google" with popup blocker active
- **Expected:**
  - Error message displayed when popup blocked
  - Fallback to email/password form shown
- **Spec ref:** Authentication → Auth Edge Cases

#### TC-G12: Duplicate email signup — triggers login flow
- **Priority:** P1
- **Type:** E2E
- **Pre:** Auth modal triggered, existing account with same email
- **Steps:**
  1. Enter email that already has an account
  2. Click "Đăng Ký" (Register)
- **Expected:**
  - Login flow triggered instead of creating duplicate account
  - Existing account detected, user prompted to log in
- **Spec ref:** Authentication → Auth Edge Cases

---

### 3.10 localStorage & Recovery (TC-LS01 to TC-LS06)

#### TC-LS01: Mid-battle page refresh recovery
- **Priority:** P1
- **Type:** E2E
- **Pre:** Battle in progress (responses displayed, no vote yet)
- **Steps:**
  1. Refresh the page
- **Expected:**
  - Battle state restored from localStorage
  - Same model pair, same responses
  - 30-minute TTL on stored state
- **Spec ref:** Edge Cases → "Page refresh mid-battle"

#### TC-LS02: localStorage cleared mid-battle
- **Priority:** P1
- **Type:** E2E
- **Pre:** Battle in progress
- **Steps:**
  1. Clear localStorage via DevTools
  2. Refresh page
- **Expected:**
  - New guest_sessionId generated
  - In-progress battle lost (no recovery)
  - Fresh state
- **Spec ref:** Edge Cases → "User clears localStorage mid-battle"

#### TC-LS03: 30-minute TTL on battle state
- **Priority:** P2
- **Type:** Manual
- **Pre:** Battle state saved in localStorage
- **Steps:**
  1. Start a battle
  2. Wait >30 minutes
  3. Refresh page
- **Expected:**
  - Stored battle state expired
  - Fresh state loaded (no stale data)
- **Spec ref:** Battle Mode → Design Decisions (30-min TTL)

#### TC-LS04: Session ID persistence
- **Priority:** P1
- **Type:** E2E
- **Pre:** Fresh session
- **Steps:**
  1. Check localStorage for vigen_guest_sessionId
  2. Reload page
  3. Check again
- **Expected:**
  - vigen_guest_sessionId UUID created on first visit
  - Same UUID persists across reloads
- **Spec ref:** Frontend store (sessionId)

#### TC-LS05: Leaderboard sort state persistence
- **Priority:** P2
- **Type:** E2E
- **Pre:** Leaderboard visited
- **Steps:**
  1. Sort leaderboard by Win Rate
  2. Navigate away
  3. Return to leaderboard
- **Expected:**
  - Sort state stored in localStorage key vigen_lb_sort
  - Restored on return
- **Spec ref:** Arena Leaderboard → Tab 1

#### TC-LS06: Category filter does NOT persist
- **Priority:** P2
- **Type:** E2E
- **Pre:** Leaderboard with category filter
- **Steps:**
  1. Select category "Creative"
  2. Navigate away and return
- **Expected:**
  - Category resets to "Overall" (not persisted)
- **Spec ref:** Arena Leaderboard → Design Decisions

---

### 3.11 Mobile & Responsive (TC-M01 to TC-M08)

#### TC-M01: Mobile battle layout (< 768px)
- **Priority:** P1
- **Type:** E2E
- **Pre:** Viewport 375×812
- **Steps:**
  1. Complete a battle
- **Expected:**
  - Response cards stacked vertically (not side-by-side)
  - Full-width vote buttons
- **Spec ref:** Edge Cases → "Mobile (< 768px)"

#### TC-M02: Mobile vote buttons full-width
- **Priority:** P1
- **Type:** E2E
- **Pre:** Mobile viewport, vote bar visible
- **Steps:**
  1. Check vote button layout
- **Expected:**
  - Vote buttons span full width
  - Easy to tap on mobile
- **Spec ref:** Edge Cases → Mobile

#### TC-M03: Mobile navigation
- **Priority:** P1
- **Type:** E2E
- **Pre:** Mobile viewport
- **Steps:**
  1. Navigate between Arena and Leaderboard on mobile
  2. Switch between Battle/SBS/Direct modes
- **Expected:**
  - All navigation works on mobile
  - Mode switcher accessible
- **Spec ref:** General mobile UX

#### TC-M04: Mobile sidebar/history
- **Priority:** P2
- **Type:** E2E
- **Pre:** Mobile viewport, logged in
- **Steps:**
  1. Access chat history on mobile
- **Expected:**
  - Sidebar collapses or becomes a drawer
  - History entries tappable
- **Spec ref:** Chat History (mobile)

#### TC-M05: Tablet breakpoint (768px-1024px)
- **Priority:** P2
- **Type:** E2E
- **Pre:** Viewport 768×1024
- **Steps:**
  1. Complete a battle
- **Expected:**
  - Layout transitions appropriately at 768px breakpoint
  - Side-by-side or stacked based on breakpoint
- **Spec ref:** Battle Mode → Response display

#### TC-M06: Elo reveal on mobile
- **Priority:** P1
- **Type:** E2E
- **Pre:** Mobile viewport, battle vote submitted
- **Steps:**
  1. Submit vote
  2. Observe Elo reveal
- **Expected:**
  - Reveal animation works on mobile
  - Model names and Elo deltas readable
  - "Trận Mới" button tappable
- **Spec ref:** Battle Mode → Elo reveal

#### TC-M07: Mobile bottom navigation
- **Priority:** P1
- **Type:** E2E
- **Pre:** Viewport < 768px
- **Steps:**
  1. Set viewport to 375x812
  2. Observe bottom navigation bar
  3. Tap each icon
- **Expected:**
  - 4 bottom nav icons visible: Trang Chu (Home), Bang Xep Hang (Leaderboard), Lich Su (History), Tai Khoan (User/Login)
  - Each icon navigates to correct section
  - Hamburger opens slide-out drawer with mode selector + search
- **Spec ref:** Layout & Navigation → Mobile Bottom Navigation

#### TC-M08: Tablet drawer (768-1023px)
- **Priority:** P2
- **Type:** E2E
- **Pre:** Viewport 768-1023px (tablet)
- **Steps:**
  1. Set viewport to 800x1024
  2. Open sidebar drawer (hamburger)
  3. Click outside the drawer
- **Expected:**
  - Semi-transparent overlay behind drawer
  - Drawer closes on outside click or navigation
  - Sidebar hidden by default, collapsible drawer behavior
- **Spec ref:** Layout & Navigation → Responsive Behavior, Mobile Bottom Navigation

---

### 3.12 Edge Cases & Error Handling (TC-X01 to TC-X13)

#### TC-X01: Network drop during vote
- **Priority:** P1
- **Type:** E2E
- **Pre:** Responses displayed
- **Steps:**
  1. Go offline (DevTools)
  2. Submit vote
  3. Go back online
- **Expected:**
  - Vote queued in localStorage
  - Batched submission on reconnect
  - No data loss
- **Spec ref:** Edge Cases → "Network offline during vote"

#### TC-X02: Vote queue exceeds 1,000
- **Priority:** P2
- **Type:** Unit
- **Pre:** Simulated queue
- **Steps:**
  1. Populate localStorage with 1,001 queued votes
- **Expected:**
  - Oldest votes dropped
  - Warning displayed
- **Spec ref:** Edge Cases → "Vote queue exceeds 1,000"

#### TC-X03: Model goes offline mid-battle
- **Priority:** P2
- **Type:** Manual
- **Pre:** Battle in progress
- **Steps:**
  1. Simulate model response failure
- **Expected:**
  - Response retried or marked error
  - Vote still counted if user submitted before failure
- **Spec ref:** Edge Cases → "Model goes offline mid-battle"

#### TC-X04: Non-Vietnamese prompt
- **Priority:** P2
- **Type:** E2E
- **Pre:** Battle mode
- **Steps:**
  1. Submit an English prompt
- **Expected:**
  - Counted for leaderboard at P0 (language filtering deferred)
  - Response returned normally
- **Spec ref:** Edge Cases → "Non-Vietnamese prompt submitted"

#### TC-X05: Rapid mode switching
- **Priority:** P1
- **Type:** E2E
- **Pre:** Arena loaded
- **Steps:**
  1. Switch from Battle → SBS → Direct → Battle rapidly
  2. Submit a prompt after each switch
- **Expected:**
  - No UI state leaks between modes
  - Each mode renders correct UI elements
  - No console errors
- **Spec ref:** Exploratory (frontend state management)

#### TC-X06: Concurrent votes from same user
- **Priority:** P1
- **Type:** API
- **Pre:** None
- **Steps:**
  1. Submit 2 votes simultaneously (race condition)
- **Expected:**
  - Dedup constraint handles gracefully
  - No duplicate records
  - No DB constraint violation crash
- **Spec ref:** Vote System → Deduplication

#### TC-X07: Empty/whitespace prompt
- **Priority:** P1
- **Type:** E2E
- **Pre:** Any mode
- **Steps:**
  1. Submit empty prompt
  2. Submit whitespace-only prompt
- **Expected:**
  - Submission blocked or error shown
  - No API call made for empty input
- **Spec ref:** Input validation

#### TC-X08: Very long prompt
- **Priority:** P2
- **Type:** E2E
- **Pre:** Any mode
- **Steps:**
  1. Submit a 5,000-character prompt
- **Expected:**
  - Handled gracefully (truncated, error, or accepted)
  - No UI overflow/crash
- **Spec ref:** Input validation

#### TC-X09: Console errors across full flow
- **Priority:** P0
- **Type:** E2E
- **Pre:** None
- **Steps:**
  1. Complete full Battle flow (prompt → vote → reveal → new battle)
  2. Complete full SBS flow
  3. Complete full Direct flow
  4. Check console after each
- **Expected:**
  - Zero console errors during happy path flows
  - No hydration errors, unhandled promises, or type errors
- **Spec ref:** General quality

#### TC-X10: Browser back/forward navigation
- **Priority:** P1
- **Type:** E2E
- **Pre:** Multiple Arena interactions completed
- **Steps:**
  1. Complete a battle
  2. Navigate to Leaderboard
  3. Press browser Back button
  4. Press Forward button
- **Expected:**
  - Navigation works correctly (SPA routing)
  - No stale state or blank screens
  - History state maintained
- **Spec ref:** General SPA behavior

#### TC-X11: Mode switch mid-conversation
- **Priority:** P1
- **Type:** E2E
- **Pre:** Active conversation in any mode
- **Steps:**
  1. Start a battle and receive responses (do not vote)
  2. Switch mode via sidebar (e.g., Battle → Song Song)
- **Expected:**
  - Current conversation discarded
  - Welcome screen shown for the new mode
  - No stale state from previous mode
- **Spec ref:** Edge Cases → "Mode switch mid-conversation", Layout & Navigation → Sidebar

#### TC-X12: Multi-tab guest sessions
- **Priority:** P1
- **Type:** E2E
- **Pre:** Guest user, multiple browser tabs
- **Steps:**
  1. Open Arena in Tab A and Tab B
  2. Check vigen_guest_sessionId in each tab's localStorage
  3. Submit votes in both tabs
- **Expected:**
  - Independent sessionIds per tab (no cross-tab sync)
  - Votes from each tab tracked separately
- **Spec ref:** Authentication → Session Management, Edge Cases → "Multiple tabs as guest"

#### TC-X13: WebSocket reconnection (EVENT_MODE)
- **Priority:** P1
- **Type:** API
- **Pre:** EVENT_MODE enabled, WebSocket connected to ws://api/leaderboard/live
- **Steps:**
  1. Connect to live leaderboard WebSocket
  2. Simulate network drop
  3. Restore network
- **Expected:**
  - Auto-reconnect with exponential backoff
  - On reconnect failure: fallback to polling /api/leaderboard every 10 seconds
  - Leaderboard data eventually consistent
- **Spec ref:** Arena Leaderboard → Live leaderboard (EVENT_MODE), Edge Cases → "WebSocket drops"

---

### 3.13 Live Infrastructure (TC-INF01 to TC-INF06)

#### TC-INF01: EVENT_MODE toggle behavior
- **Priority:** P0
- **Type:** API
- **Pre:** EVENT_MODE toggle accessible
- **Steps:**
  1. With EVENT_MODE off: submit votes, verify Elo updated via daily cron (2 AM UTC)
  2. Enable EVENT_MODE: submit votes, verify Elo updated via micro-batch (every 2-5 seconds)
- **Expected:**
  - EVENT_MODE off: Elo Snapshots updated only at 2 AM UTC daily batch
  - EVENT_MODE on: Vote worker drains Redis queue, batch-inserts to MySQL, triggers Elo recalc, publishes via WebSocket
  - Rate limits relaxed in EVENT_MODE (200 votes/session/hour vs 100)
- **Spec ref:** Elo Engine → Batch schedule, Infrastructure

#### TC-INF02: WebSocket live leaderboard updates
- **Priority:** P0
- **Type:** API
- **Pre:** EVENT_MODE enabled
- **Steps:**
  1. Connect to ws://api/leaderboard/live
  2. Submit a battle vote from another session
  3. Measure time until leaderboard update received
- **Expected:**
  - On connect: server sends current leaderboard snapshot
  - On Elo recalc: updated rankings broadcast to all connected clients
  - Update received within 5 seconds of vote
  - Client animates rank changes (rows slide, Elo numbers tick, delta badges flash)
- **Spec ref:** Arena Leaderboard → Live leaderboard (EVENT_MODE)

#### TC-INF03: WebSocket heartbeat and stale detection
- **Priority:** P1
- **Type:** API
- **Pre:** WebSocket connected
- **Steps:**
  1. Connect to live leaderboard
  2. Monitor ping/pong frames
  3. Simulate stale connection (no pong response)
- **Expected:**
  - Server sends heartbeat ping every 15 seconds
  - Stale connections detected and cleaned up
- **Spec ref:** Arena Leaderboard → Live leaderboard ("Heartbeat ping every 15 seconds")

#### TC-INF04: Redis vote queue processing
- **Priority:** P0
- **Type:** API
- **Pre:** EVENT_MODE enabled, Redis available
- **Steps:**
  1. Submit multiple votes rapidly
  2. Monitor Redis queue and MySQL writes
- **Expected:**
  - Votes queued in Redis
  - Vote worker micro-batches and inserts to MySQL
  - Elo recalculation triggered after batch insert
  - Vote submission latency < 100ms (p95)
- **Spec ref:** Infrastructure → Vote pipeline

#### TC-INF05: Graceful degradation — Redis down
- **Priority:** P0
- **Type:** API
- **Pre:** Redis unavailable (simulated)
- **Steps:**
  1. Stop Redis
  2. Submit a vote
- **Expected:**
  - Vote written directly to MySQL (fallback path)
  - No vote data lost
  - Performance may degrade but functionality preserved
- **Spec ref:** Infrastructure → Graceful degradation

#### TC-INF06: LLM rate limit handling with queued retry
- **Priority:** P1
- **Type:** API
- **Pre:** Battle mode active
- **Steps:**
  1. Submit prompt when LLM provider returns 429 (rate limit)
- **Expected:**
  - Request queued with exponential backoff
  - "Đang tải..." shown to user during wait
  - Retry succeeds or fallback model rotation triggered
- **Spec ref:** Response Serving → LLM API handling, Edge Cases → "LLM API rate limit (429)"

---

## Part 4: Traceability Matrix

| SPEC Section | Test Cases | Coverage |
|-------------|------------|----------|
| Battle Mode | TC-B01 to TC-B19 | 19 cases |
| Side-by-Side Mode | TC-S01 to TC-S10 | 10 cases |
| Direct Chat Mode | TC-D01 to TC-D08 | 8 cases |
| Vote System | TC-V01 to TC-V14 (TC-V08 removed) | 13 cases |
| Elo Engine | TC-E01 to TC-E08 | 8 cases |
| Arena Leaderboard | TC-L01 to TC-L10 | 10 cases |
| Response Serving | TC-R01 to TC-R07 | 7 cases |
| Chat History & Stats | TC-H01 to TC-H08 | 8 cases |
| Guest Gating & Auth | TC-G01 to TC-G12 | 12 cases |
| localStorage & Recovery | TC-LS01 to TC-LS06 | 6 cases |
| Mobile & Responsive | TC-M01 to TC-M08 | 8 cases |
| Edge Cases & Errors | TC-X01 to TC-X13 | 13 cases |
| Live Infrastructure | TC-INF01 to TC-INF06 | 6 cases |
| **Total** | | **128 cases** |

### Priority Distribution

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 43 | Must pass before launch |
| P1 | 55 | Should pass, critical for quality |
| P2 | 30 | Nice to have, can defer |

---

## Part 5: Execution Notes

### Running with gstack /qa

Once the app is deployed to staging, execute the browser-based tests:
```
/qa https://staging.vigen.ai --standard
```

This will cover all E2E test cases (TC-B*, TC-S*, TC-D*, TC-G*, TC-M*, TC-X* marked as E2E type).

### Running unit tests

For Elo engine and vote logic:
```bash
cd backend && pytest tests/ -v -k "elo or vote"
```

For frontend component tests:
```bash
cd frontend && npx vitest run --reporter=verbose
```

### API integration tests

Use the API endpoints directly:
```bash
# Smoke test all endpoints
curl http://localhost:8000/api/prompts?random=true&count=3
curl http://localhost:8000/api/models
curl -X POST http://localhost:8000/api/conversations -d '{"mode":"battle","prompt":"Xin chào"}'
curl http://localhost:8000/api/leaderboard
```

### Known Implementation Gaps (from SPEC review)

1. **Live LLM inference pipeline** — All responses served via live API calls to 12 LLM providers. Requires Redis caching layer by (prompt_hash + model_id) to control cost and latency. Fallback model rotation needed when providers return 429 or timeout.
2. **Redis vote queue (EVENT_MODE)** — Vote pipeline: POST → Redis queue → vote worker micro-batch → MySQL → Elo recalc → WebSocket broadcast. Graceful degradation to direct MySQL writes if Redis is down.
3. **WebSocket live leaderboard** — ws://api/leaderboard/live endpoint needed for EVENT_MODE. Requires heartbeat (15s ping), auto-reconnect with backoff, fallback to 10s polling.
4. **Conversation-based API** — All endpoints are conversation-centric: POST /api/conversations (create), POST /api/conversations/{id}/votes (vote), POST /api/conversations/{id}/turns (multi-turn). No legacy /api/arena/* endpoints.
5. **Session-based rate limiting** — 100 votes/session/hour (production), 200 votes/session/hour (EVENT_MODE). Keyed by vigen_guest_sessionId or user_id from JWT. Never IP-based.
6. **Guest gate at 4th battle attempt** — Battle count tracked via vigen_guest_sessionId. "Tiep Tuc La Khach" dismiss allows browse but blocks new battles.
7. **JWT in httpOnly cookie** — Auth token stored in httpOnly cookie, not localStorage. 30-day expiry, no refresh tokens at P0.
8. **Vote timestamps server-generated** — All timestamps generated server-side. Client-submitted timestamps ignored.
9. **Redis dedup** — Vote deduplication via Redis in-memory set on the fast path, not MySQL query.
