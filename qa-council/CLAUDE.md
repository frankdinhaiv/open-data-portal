# QA Council — Shared Agent Context

## Project Under Test
- **Name:** ViGen Arena — AIV Open Data Portal
- **Base URL:** ${BASE_URL:-http://localhost:3000}
- **Source spec:** docs/features/arena/SPEC.md
- **Test strategy:** docs/testing/arena-test-strategy.md

## Application Overview
The Arena is a live evaluation platform where users compare Vietnamese AI model responses through three modes:
1. **Battle Mode** — Blind pairwise comparison. Model identities hidden until after vote. Primary vote collection mechanism.
2. **Side-by-Side (SBS) Mode** — Named model comparison. Users select two models explicitly.
3. **Direct Chat Mode** — Single model evaluation with 1-10 integer ratings + quality tags.

Battle and SBS votes feed an Elo-based ranking system. Direct ratings feed a separate quality feedback engine.

## Arena Modes — Key Differences

| Aspect | Battle | SBS | Direct |
|--------|--------|-----|--------|
| Model visibility | Hidden until vote | Visible | Visible |
| Vote type | Thắng/Thua/Hòa/Both bad | Thắng/Thua/Hòa/Both bad | 1-10 rating + tags |
| Elo impact | Yes | Yes | No (quality engine) |
| Post-vote reveal | Elo reveal (1.5s) | Confirmation msg | Confirmation msg |
| Model selection | Random | User picks 2 | User picks 1 |
| Turn limit | 5 | 5 | Unlimited |
| Model retention | Reset each battle | Persists | Reset each conversation |

## Vietnamese UI Text Reference
These are the Vietnamese labels used in the Arena. Tests should match these exactly:
- Mode names: "Đấu Trường" (Battle), "Song Song" (SBS), "Trực Tiếp" (Direct)
- Response cards: "Mô hình A" / "Mô hình B"
- Vote buttons: "Thắng" / "Thua" / "Hòa" / "Cả hai đều tệ"
- New battle: "Trận Mới"
- Loading state: "Đang tải..." (Loading), "Thử lại" (Retry)
- Refresh prompts: "Mới"
- SBS validation error: "Chọn 2 mô hình khác nhau"
- SBS winner: "Thắng" (Win), SBS tie: "Hòa"
- Continue conversation: "Tiếp tục hội thoại"
- New comparison: "So sánh tiếp"
- Direct rating confirmation: "Đánh giá đã được ghi nhận"
- Quality tags: "Chính xác", "Tự nhiên", "Phù hợp văn hóa", "Sáng tạo", "Hữu ích"
- History groups: "Hôm Nay", "Hôm Qua", "Tuần Trước", "Tháng Trước", "Cũ Hơn"
- Empty history: "Chưa có cuộc trò chuyện nào"
- No search results: "Không tìm thấy"
- Mode icons: ⚔️ (Battle), ⚖️ (SBS), 💬 (Direct)
- Auth: "Đăng Nhập Bằng Google", "Đăng Ký", "Tiếp Tục Là Khách", "Đăng Nhập", "Đăng Xuất"
- Guest gate: "Vui lòng đăng ký để tiếp tục bình chọn"
- Vote counter: "Bạn đã bình chọn: N lần"

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/models | Fetch active model list |
| GET | /api/prompts | Fetch seed prompts (filtered by category, `?random=true&count=3`) |
| POST | /api/conversations | Create conversation (mode, prompt, models) — triggers LLM API calls |
| GET | /api/conversations/{id}/responses | Fetch responses for current turn |
| POST | /api/conversations/{id}/votes | Submit pairwise or direct vote |
| POST | /api/conversations/{id}/turns | Append turn (multi-turn follow-up) — triggers LLM API calls |
| GET | /api/leaderboard | Fetch Elo rankings + Pairwise Stats |
| WS | ws://api/leaderboard/live | WebSocket for live leaderboard updates (EVENT_MODE) |
| POST | /api/auth/signup | Register user, link guest conversations |
| POST | /api/auth/login | Authenticate user |
| GET | /api/users/me | Current user profile + history |

## Test Conventions
- **Locators:** Use semantic locators in this order of preference:
  1. `getByRole()` — buttons, links, headings, checkboxes
  2. `getByLabel()` — form inputs with labels
  3. `getByText()` — visible text content (use Vietnamese text from reference above)
  4. `getByTestId()` — only when semantic locators are ambiguous
- **Page Object Model:** Every distinct view gets a POM class in `tests/pages/`
- **Naming:** Test files: `{feature}.spec.ts` (UI) or `{feature}.api-spec.ts` (API)
- **Assertions:** Every test MUST have at least one meaningful assertion. "Page renders" is NOT sufficient.
- **Waits:** Use Playwright auto-waiting. Explicit waits only for:
  - Elo reveal animation (1.5-second delay)
  - Vote button disable period (1 second)
  - Network-dependent state changes
- **Vietnamese text:** Use exact Vietnamese strings from the UI Text Reference above. Use regex for partial matches where appropriate.

## File Paths
- **Test files:** `qa-council/tests/ui/` (UI), `qa-council/tests/api/` (API)
- **Page Objects:** `qa-council/tests/pages/`
- **Fixtures:** `qa-council/tests/fixtures/`
- **Artifacts:** `qa-council/artifacts/` (JSON pipeline state)
- **Reports:** `qa-council/reports/`

## Black-Box Rule (CRITICAL)
You are a QA engineer. Interact with the application ONLY through:
1. The browser via Playwright (for UI testing)
2. HTTP requests to API endpoints (for API testing)

You have NO access to application source code. Never read files outside `qa-council/` and `docs/`.
Never weaken an assertion to make a test pass. If a test fails and you cannot
fix it through selector/timing changes, flag it as a REAL BUG.

## Real Bug vs. Fixable Failure (Healer Decision Boundary)

| Failure Type | Category | Action |
|---|---|---|
| DOM selector not found | **Fixable** | Update selector to match current DOM |
| Element not visible / timeout | **Fixable** | Add appropriate wait strategy |
| Assertion on text content fails (text changed) | **Fixable** | Update expected text if cosmetic change |
| Vietnamese text encoding mismatch | **Fixable** | Fix encoding in test assertion |
| Elo reveal timing issue | **Fixable** | Add explicit wait for 1.5s animation |
| HTTP status code unexpected (e.g., 200→500) | **REAL BUG** | Flag, do not fix |
| Wrong Elo delta value (math error) | **REAL BUG** | Flag, do not fix |
| Model identity visible before vote in Battle | **REAL BUG** | Flag, do not fix |
| Guest gate not triggering at battle 4 | **REAL BUG** | Flag, do not fix |
| Vote not persisted (DB empty after submit) | **REAL BUG** | Flag, do not fix |
| SBS allows same model in both slots | **REAL BUG** | Flag, do not fix |
| Direct rating updates Elo (should not) | **REAL BUG** | Flag, do not fix |
| LLM timeout shows no loading indicator | **REAL BUG** | Flag, do not fix |
| WebSocket doesn't reconnect after drop | **REAL BUG** | Flag, do not fix |
| Rate limiting uses IP instead of session | **REAL BUG** | Flag, do not fix |

**Rule of thumb:** If the failure is about HOW to find/interact with an element → fixable.
If the failure is about WHAT the element does or returns → real bug.

## Test Data Requirements (Fixtures)
The application must be seeded before tests run:
- 12 models (mix of `open` and `prop` licenses)
- 30+ seed prompts across categories (populate Redis cache for high hit rate)
- At least 2 test user accounts (for auth-gated features)
- 50+ battles per model pair (for leaderboard data)

**Note:** Seed data populates the Redis cache, but live LLM inference is the primary response path. Tests should account for potential LLM latency (up to 30s timeout). Cached responses reduce cost and latency for repeated seed prompts.

**Auth:** JWT is stored in httpOnly cookie (not localStorage). Guest sessions use `vigen_guest_sessionId` in localStorage.

If fixture data is not present, tests that depend on it should be marked as SKIPPED, not FAILED.
