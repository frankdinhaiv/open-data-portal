# Arena QA Council — Multi-Agent Test Automation Plan

**Purpose:** Adapt the QA Council multi-agent pipeline (proven on Daily Brief POC) to autonomously generate and execute test suites for the Arena feature once development is complete.

**Source of truth:** `docs/features/arena/SPEC.md` (the PRD)
**Test strategy reference:** `docs/testing/arena-test-strategy.md` (109 test cases)
**QA Council POC:** `qa/` directory in main branch

---

## 1. Architecture Overview

The QA Council is a **7-agent pipeline** orchestrated by a bash script. Each agent runs as an independent Claude session (`claude -p`) with a fresh context window, scoped tools, and JSON artifact contracts between phases.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Arena QA Council Pipeline                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: DUAL ANALYST (parallel)                               │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │  Analyst A    │  │  Analyst B    │   Input: SPEC.md           │
│  │  (A-TS-001…) │  │  (B-TS-001…) │   Output: test-plan.json   │
│  └──────┬───────┘  └──────┬───────┘                             │
│         └────────┬────────┘                                     │
│           Symmetric Diff + Merge                                │
│                  │                                               │
│  Phase 2: ARCHITECT                                             │
│  ┌──────────────────────┐                                       │
│  │  Test Architect       │   Input: test-plan.json              │
│  │  Design file structure│   Output: test-architecture.json     │
│  └──────────┬───────────┘                                       │
│             │                                                   │
│  Phase 3: ENGINEERS (parallel)                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  UI Engineer  │  │  API Engineer │  │  Elo Engineer │         │
│  │  Playwright   │  │  HTTP tests   │  │  Unit tests   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         └────────┬────────┴────────┬────────┘                   │
│                  │                                               │
│  Phase 4: SENTINEL (quality gate, up to 3 attempts)             │
│  ┌──────────────────────┐                                       │
│  │  Sentinel Reviewer    │   Score threshold: 85                │
│  │  Read-only review     │   Routes fixes to engineers          │
│  └──────────┬───────────┘                                       │
│             │                                                   │
│  Phase 5: HEALER                                                │
│  ┌──────────────────────┐                                       │
│  │  Test Healer          │   Runs tests, fixes selectors        │
│  │  Max 50 turns         │   Flags REAL BUGs                    │
│  └──────────┬───────────┘                                       │
│             │                                                   │
│  Phase 6: SCRIBE                                                │
│  ┌──────────────────────┐                                       │
│  │  Report Writer        │   Output: qa-report.md              │
│  │  Screenshots + costs  │   + screenshots/ + baseline.json    │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Arena-Specific Adaptations

### 2.1 What changes from the POC

| Aspect | Daily Brief POC | Arena Adaptation |
|--------|----------------|------------------|
| **Spec input** | `qa/specs/daily-brief-app.md` (515 lines) | `docs/features/arena/SPEC.md` (263 lines, denser) |
| **Test scope** | 1 page, 1 API endpoint | 3 modes × 6 API endpoints × 5 tabs |
| **Agents** | 7 agents | **8 agents** (add Elo Engineer) |
| **Model for Healer** | Opus (expensive) | **Sonnet** (cost optimization from POC lesson) |
| **Max turns (Healer)** | 30 (insufficient) | **50** (POC lesson: increase) |
| **Test data** | Empty state was untested | **Fixtures required:** seeded DB with prompts, models, responses |
| **Base URL** | http://localhost:8800 | **Configurable** (local or staging) |
| **Black-box rule** | No source code access | **Same — SPEC.md is the only input** |

### 2.2 New agent: Elo Engineer

The Arena has a mathematical Elo rating engine that needs **deterministic unit-level tests** beyond what UI or API tests can validate. The Elo Engineer writes tests that verify:

- Expected score formula: `E_A = 1 / (1 + 10^((R_B - R_A) / 400))`
- Rating update with K-factor
- Tie and "Both bad" both produce S=0.5
- Bootstrap CI computation
- Elo snapshots are append-only
- Initial rating = 1000

These tests run against the **API** (not internal functions), validating that vote submissions produce correct Elo deltas in the response.

### 2.3 Test data fixtures

The POC's biggest failure mode was **missing test data** (25 of 50 test failures). For Arena, we need pre-populated data before any test runs.

**Required fixture data (via API or DB seed):**
- 12 models (mix of open + proprietary licenses)
- 30+ seed prompts across categories
- 540+ pre-computed responses (12 models × 30 prompts + follow-ups)
- 2 test user accounts (for auth-gated features)
- 50+ seeded battles per model pair (for leaderboard testing)

**Fixture strategy:**
- If the app has a `/seed` or DB seed script → run it before tests
- If not → create a fixture agent that calls POST endpoints to populate data
- Guest sessions created fresh per test (no fixture needed)

---

## 3. Agent Specifications

### 3.1 Dual Analyst

**Purpose:** Extract every testable behavior from SPEC.md as structured JSON scenarios.

**Input:** `docs/features/arena/SPEC.md`
**Output:** `artifacts/test-plan-a.json`, `artifacts/test-plan-b.json` → merged into `artifacts/test-plan.json`
**Tools:** Read, Grep, Glob (read-only)

**Arena-specific guidance for analyst prompt:**
```
Focus areas (mapped to SPEC sections):
1. Battle Mode — 7-step user flow, prompt handling, response display,
   voting mechanics, multi-turn, guest gate, model pair selection
2. Side-by-Side Mode — 6-step flow, model validation, post-vote continuation
3. Direct Chat Mode — 5-step flow, star ratings, quality tags
4. Vote System — storage, offline queue, deduplication, guest linking
5. Elo Engine — formula, K-factor, confidence intervals, batch schedule
6. Arena Leaderboard — 5 tabs, sorting, filtering, reliability flags
7. Response Serving — fuzzy matching, pair distribution, multi-turn tree
8. Chat History & Stats — date grouping, soft delete, vote counter
9. Edge Cases table (8 scenarios) — each becomes a test case

Expected scenario count: 80-120 (based on 109 cases in test strategy)
```

**Dual-analyst value:** Two independent analysts reading the same SPEC catch different interpretations. The symmetric diff reveals:
- Scenarios one analyst hallucinated (not in SPEC)
- Scenarios one analyst missed (in SPEC but overlooked)

### 3.2 Architect

**Purpose:** Design test file structure, Page Object Models, and fixtures.

**Input:** `artifacts/test-plan.json`
**Output:** `artifacts/test-architecture.json`
**Tools:** Read, Write

**Arena test suite structure (recommended):**

| Suite | File | Scenarios |
|-------|------|-----------|
| Battle Mode | `tests/ui/battle.spec.ts` | Prompt selection, anonymous responses, voting, Elo reveal, new battle |
| Side-by-Side | `tests/ui/sbs.spec.ts` | Model selection, comparison, voting, continuation |
| Direct Chat | `tests/ui/direct.spec.ts` | Single model, star rating, quality tags |
| Guest & Auth | `tests/ui/auth.spec.ts` | Guest gating, register, login, vote linking |
| Leaderboard | `tests/ui/leaderboard.spec.ts` | 5 tabs, sorting, filtering |
| Chat History | `tests/ui/history.spec.ts` | Date groups, soft delete, stats |
| Arena API | `tests/api/arena.api-spec.ts` | All 6 endpoints, error responses |
| Elo Calculations | `tests/api/elo.api-spec.ts` | Vote → Elo delta verification |
| Mobile | `tests/ui/mobile.spec.ts` | Responsive layouts, stacked cards |

**Page Objects:**

| POM | URL Pattern | Key Selectors |
|-----|-------------|---------------|
| ArenaPage | `/arena` or `/` | Mode switcher, prompt suggestions, chat input |
| BattlePage | `/arena?mode=battle` | Response cards A/B, vote buttons, Elo reveal |
| SBSPage | `/arena?mode=sbs` | Model dropdowns A/B, comparison view |
| DirectPage | `/arena?mode=direct` | Model dropdown, star rating, quality tags |
| LeaderboardPage | `/leaderboard` | Tab navigation, ranking table, heatmaps |
| AuthModal | (overlay) | Email, password, register/login buttons |
| Sidebar | (persistent) | History list, date groups, delete button |

### 3.3 UI Engineer

**Purpose:** Write Playwright browser tests for all UI scenarios.

**Input:** `artifacts/test-architecture.json`
**Output:** Test files in `tests/ui/` and `tests/pages/`
**Tools:** Read, Write, Bash

**Arena-specific test patterns:**

```typescript
// Battle Mode — anonymous response verification
test('model identities hidden before vote', async ({ page }) => {
  await arenaPage.selectPrompt(0);
  // Response cards should show "Mô hình A" / "Mô hình B" only
  await expect(page.getByText('Mô hình A')).toBeVisible();
  await expect(page.getByText('Mô hình B')).toBeVisible();
  // No actual model names visible
  const responseArea = page.locator('[data-testid="responses"]');
  await expect(responseArea).not.toContainText('GPT-4');
  await expect(responseArea).not.toContainText('Gemini');
});

// Guest gating — 4th battle triggers auth
test('guest blocked after 3 battles', async ({ page }) => {
  for (let i = 0; i < 3; i++) {
    await arenaPage.selectPrompt(0);
    await arenaPage.vote('a');
    await arenaPage.newBattle();
  }
  await arenaPage.selectPrompt(0);
  await expect(page.getByRole('dialog')).toBeVisible(); // Auth modal
});

// Mobile — stacked layout
test('mobile shows stacked response cards', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await arenaPage.selectPrompt(0);
  const cardA = page.locator('[data-testid="response-a"]');
  const cardB = page.locator('[data-testid="response-b"]');
  const boxA = await cardA.boundingBox();
  const boxB = await cardB.boundingBox();
  expect(boxB.y).toBeGreaterThan(boxA.y + boxA.height); // B below A
});
```

### 3.4 API Engineer

**Purpose:** Write HTTP endpoint tests for all API scenarios.

**Input:** `artifacts/test-architecture.json`
**Output:** Test files in `tests/api/`
**Tools:** Read, Write, Bash

**Arena API endpoints to test:**

| Endpoint | Key Tests |
|----------|-----------|
| `GET /api/arena/prompts` | Returns prompts, optional category filter, ≥30 prompts |
| `GET /api/arena/pair` | Random pair (battle), specific pair (SBS), model metadata hidden per mode |
| `GET /api/arena/response` | Single model response (direct), required params |
| `POST /api/arena/vote` | All 4 choices, Elo reveal in response, dedup, guest session_id |
| `GET /api/arena/models` | 12 models, correct schema (id, name, org, license, color) |
| `GET /api/arena/history` | User-scoped, date ordering, limit param |

### 3.5 Elo Engineer (NEW — Arena-specific)

**Purpose:** Write tests that verify Elo calculation correctness through API vote submissions.

**Input:** `artifacts/test-architecture.json` + `docs/features/arena/SPEC.md` (Elo Engine section)
**Output:** Test files in `tests/api/elo.api-spec.ts`
**Tools:** Read, Write, Bash

**Test approach — verify via API responses:**

```typescript
// Submit vote and check Elo deltas in response
test('equal-rated models: winner gains, loser loses symmetrically', async () => {
  // Submit battle vote
  const result = await submitVote({ choice: 'a', ... });

  // With K=32 and equal starting ratings (1000 vs 1000):
  // Expected: delta_a ≈ +16, delta_b ≈ -16
  expect(result.elo_reveal.model_a_delta).toBeCloseTo(16, 0);
  expect(result.elo_reveal.model_b_delta).toBeCloseTo(-16, 0);
});

test('tie produces zero net change for equal ratings', async () => {
  const result = await submitVote({ choice: 'tie', ... });
  expect(result.elo_reveal.model_a_delta).toBeCloseTo(0, 0);
});

test('"both bad" treated same as tie', async () => {
  const tieDelta = await submitVote({ choice: 'tie', ... });
  const badDelta = await submitVote({ choice: 'bad', ... });
  // Same formula applied (S=0.5)
  expect(Math.abs(tieDelta.elo_reveal.model_a_delta))
    .toBeCloseTo(Math.abs(badDelta.elo_reveal.model_a_delta), 0);
});
```

**Critical Elo tests:**
1. Expected score formula correctness (known input/output pairs)
2. K=32 max rating swing
3. Initial rating = 1000 for new models
4. Tie and "Both bad" both produce S=0.5
5. Elo snapshots append-only (query snapshots table before/after)
6. Underdog upset produces larger delta than expected win

### 3.6 Sentinel

**Purpose:** Quality gate — review all test files for completeness, assertion quality, and coverage.

**Input:** All test files in `tests/`
**Output:** `artifacts/qa-review.json` with score and issues
**Tools:** Read, Grep, Glob (read-only)

**Arena-specific review criteria:**
- Every SPEC.md section has corresponding tests
- Battle mode blindness verified (no model name leaks)
- Guest gating tested (3-battle limit)
- All 3 voting modes covered (battle/SBS/direct)
- Elo calculation tests use known mathematical values
- Mobile breakpoint tested (375px, 768px)
- Offline queue behavior tested
- Score threshold: **85** (raised from 80 in POC)

### 3.7 Healer

**Purpose:** Run all tests, fix selector/timing failures, flag real bugs.

**Input:** All test files
**Output:** `artifacts/heal-log.json`
**Tools:** Read, Write, Edit, Bash

**Arena-specific healing notes:**
- **Model:** Use **Sonnet** (POC lesson: Healer was 62% of total cost with Opus)
- **Max turns:** **50** (POC ran out at 30)
- **Common fixable failures:**
  - Selector mismatches (test expected `data-testid` but app uses different attributes)
  - Timing issues (Elo reveal 1.5s delay needs explicit wait)
  - Vietnamese text encoding in assertions
  - localStorage state from previous tests (need test isolation)
- **Real bugs to flag (not fix):**
  - Wrong Elo delta values
  - Model identity leak before vote
  - Guest gate not triggering at battle 4
  - Vote not persisted in DB

### 3.8 Scribe

**Purpose:** Generate final QA report with screenshots, pass rates, and cost summary.

**Input:** All artifacts + test results
**Output:** `reports/qa-report.md` + `reports/screenshots/`
**Tools:** Read, Bash

---

## 4. Orchestration

### 4.1 Execution script

Adapt `qa/qa-run.sh` for Arena. Key changes:

```bash
#!/bin/bash
set -euo pipefail

SPEC="${1:-docs/features/arena/SPEC.md}"
BASE_URL="${2:-http://localhost:3000}"
QA_DIR="$(cd "$(dirname "$0")" && pwd)/arena-qa"

# ... (same orchestration structure as POC)

# Phase 3: Add Elo Engineer in parallel with UI + API engineers
run_agent "$QA_DIR/prompts/elo-engineer.md" "Read,Write,Bash" \
  "Read the architecture at: $ARTIFACTS/test-architecture.json
Write test files to: $QA_DIR/tests/api/" \
  "$ARTIFACTS/elo-eng-raw.json" > /dev/null &
PID_ELO=$!

# Phase 5: Use Sonnet for Healer (cost optimization)
claude -p "$healer_prompt" \
  --allowedTools "Read,Write,Edit,Bash" \
  --model sonnet \
  --max-turns 50 > "$ARTIFACTS/healer-raw.json"
```

### 4.2 When to run

| Trigger | Action |
|---------|--------|
| Development phase complete | Run full pipeline against staging |
| Pre-launch gate (Apr 5) | Run full pipeline, require pass rate ≥ 80% |
| Post-hotfix | Run targeted subset (affected test suites only) |
| Weekly regression | Run full pipeline on staging, compare to baseline |

### 4.3 Cost estimate

Based on POC actuals, scaled for Arena complexity:

| Agent | Model | Est. Cost |
|-------|-------|-----------|
| Analyst A | Opus | $0.40 |
| Analyst B | Opus | $0.40 |
| Architect | Opus | $0.30 |
| UI Engineer | Opus | $1.20 |
| API Engineer | Opus | $0.80 |
| Elo Engineer | Opus | $0.60 |
| Sentinel (×3) | Opus | $1.00 |
| Healer | **Sonnet** | $1.50 |
| Scribe | Opus | $0.30 |
| **Total** | | **~$6.50** |

(Healer on Sonnet saves ~$3.50 vs Opus, based on POC data where Healer was $5.17.)

---

## 5. Artifact Contracts

All inter-agent communication uses JSON with `jq` validation. Schemas inherited from POC (`qa/schemas/`).

### Pipeline state flow

```
SPEC.md
  → test-plan-a.json + test-plan-b.json
    → test-plan.json (merged)
      → test-architecture.json
        → test files (*.spec.ts, *.api-spec.ts)
          → qa-review.json (sentinel)
            → heal-log.json
              → qa-report.md + baseline.json
```

### New schema: Elo test assertions

```json
{
  "elo_test_cases": [
    {
      "id": "ELO-001",
      "description": "Equal ratings, A wins",
      "input": { "rating_a": 1000, "rating_b": 1000, "choice": "a" },
      "expected": { "delta_a": 16, "delta_b": -16 },
      "tolerance": 1
    }
  ]
}
```

---

## 6. Integration with Test Strategy

The test strategy (`arena-test-strategy.md`) defines 109 test cases. The QA Council maps to them as follows:

| Test Strategy Area | QA Council Agent | Coverage |
|-------------------|-----------------|----------|
| Battle Mode (TC-B01–B16) | UI Engineer | All 16 |
| Side-by-Side (TC-S01–S10) | UI Engineer | All 10 |
| Direct Chat (TC-D01–D08) | UI Engineer | All 8 |
| Vote System (TC-V01–V12) | API Engineer + UI Engineer | All 12 |
| Elo Engine (TC-E01–E08) | **Elo Engineer** | All 8 |
| Leaderboard (TC-L01–L10) | UI Engineer | All 10 |
| Response Serving (TC-R01–R07) | API Engineer | All 7 |
| Chat History (TC-H01–H08) | UI Engineer | All 8 |
| Guest Gating (TC-G01–G08) | UI Engineer + API Engineer | All 8 |
| localStorage (TC-LS01–LS06) | UI Engineer | All 6 |
| Mobile (TC-M01–M06) | UI Engineer | All 6 |
| Edge Cases (TC-X01–X10) | UI Engineer + API Engineer | All 10 |

**Expected automated coverage: 109/109 test cases (100%)**

The Dual Analyst phase should independently discover these same test cases from the SPEC. Discrepancies between the analyst output and the test strategy reveal either:
- Gaps in the test strategy (analyst found something we missed)
- Hallucinations by the analyst (scenario not in SPEC)

---

## 7. Pre-Execution Checklist

Before running the QA Council pipeline:

- [ ] Arena SPEC.md is finalized (no open questions affecting test design)
- [ ] Development is complete (all 3 modes, vote system, Elo engine, leaderboard)
- [ ] App deployed to staging with seeded database
- [ ] Minimum data: 12 models, 30 prompts, 540 responses
- [ ] Base URL confirmed and accessible
- [ ] Playwright dependencies installed (`npx playwright install`)
- [ ] QA Council scripts adapted from `qa/qa-run.sh`
- [ ] Agent prompts customized for Arena (this document's Section 3)
- [ ] Cost budget approved (~$6.50 per full run)

---

## 8. Success Criteria

| Metric | Target | Rationale |
|--------|--------|-----------|
| Test scenario extraction | ≥ 100 scenarios | 109 in test strategy |
| Sentinel score | ≥ 85 | Raised from 80 (POC lesson) |
| Test pass rate (post-heal) | ≥ 70% | POC achieved 32% pre-heal; 70% is the bar for launch |
| Real bugs found | Documented, not fixed | Healer flags; dev team triages |
| Cost per run | ≤ $8 | Budget cap |
| Wall-clock time | ≤ 45 min | POC was 35 min with fewer tests |

---

## 9. Lessons Applied from POC

| POC Lesson | Arena Adaptation |
|------------|-----------------|
| Healer ran out of turns (30) | Increased to 50 |
| Healer was 62% of cost ($5.17 on Opus) | Switch to Sonnet |
| 25 tests failed due to empty DB state | Mandatory fixture data before test run |
| Sentinel scored 52 on first pass | Provide test strategy as additional context to engineers |
| Scribe never ran (blocked by Healer failure) | Scribe runs regardless of Healer outcome |
| Black-box rule was effective | Maintained — agents only see SPEC.md, never source code |
| Dual-analyst symmetric diff caught 8 discrepancies | Keep dual-analyst pattern |
