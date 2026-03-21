# Docs Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure docs/ from gate-based (g3a/g3b) to product-centric layout following Dean Peters' PRD methodology.

**Architecture:** One product-level PRD (15 sections) + two feature specs + three shared specs. Engineering and claude-code tiers retired after extracting design decisions.

**Spec:** `docs/superpowers/specs/2026-03-21-docs-restructure-design.md`

**Note:** This plan uses atomic commits per task (9 total) for agentic execution safety. Squash into a single commit before merging if git history cleanliness is preferred.

---

### Task 1: Create folder structure

**Files:**
- Create: `docs/features/arena/` (directory)
- Create: `docs/features/benchmark-leaderboard/` (directory)
- Create: `docs/shared/` (directory)

- [ ] **Step 1: Create directories**

```bash
mkdir -p docs/features/arena docs/features/benchmark-leaderboard docs/shared
```

- [ ] **Step 2: Verify prototype files already in place**

Prototype files are already at `docs/prototype/` — no move needed.

- [ ] **Step 3: Commit**

```bash
git add docs/features docs/shared
git commit -m "docs: create new folder structure for product-centric layout"
```

---

### Task 2: Build PRD.md

**Files:**
- Read: `docs/g3a/G3A-PRD-ViGen-Arena.md`
- Read: `docs/g3a/G3A-PRD-Benchmark-Leaderboard.md`
- Create: `docs/PRD.md`

- [ ] **Step 1: Read both existing PRDs**

- [ ] **Step 2: Write `docs/PRD.md` following Dean Peters' 15-section template**

```markdown
# Open Data Portal — Product Requirements Document

## 1. Executive Summary
Synthesize: building the first Vietnamese AI evaluation platform combining
automated benchmarks and human preference voting.

## 2. Problem Statement (G1)
Merge Arena G1 (no trusted Vietnamese evaluation) + Benchmark G1 (existing
benchmarks don't capture Vietnamese nuance, results fragmented).

## 3. Target Users & Personas
3 personas from Benchmark PRD (Researcher, Enterprise PM, Power User).

## 4. Strategic Context
Competitive landscape (G10 analysis: llm-stats, artificialanalysis, Vellum, Scale AI).
Why now: Vietnam AI strategy, no Vietnamese-first platform exists.

## 5. Solution Ideation & Prioritization
Two features selected:
- Benchmark Leaderboard → see features/benchmark-leaderboard/SPEC.md
- Arena → see features/arena/SPEC.md
P0/P1/P2/P3 priority tables from both PRDs.

## 6. Solution Overview — Vision & Architecture
Vision from Benchmark PRD G3a. System architecture diagram showing
how Arena and Benchmark Leaderboard connect through shared data model.

## 7. Design Specification — Cutline
What's in for April 5: P0 features from both PRDs.
What's deferred: VIX, multi-modal, monetization, dark mode, API access.

## 8. Success Metrics
- 10,000+ human preference votes in 60 days
- 12+ models ranked
- 2,000+ registered voters, 500+ weekly active by Day 60
- Pre-launch: 1,000-1,500 votes, 100-150 voters
- Post-launch: ~5,000 votes, 500-750 users

## 9. Estimation & Timeline
G5 started Mar 19, G6 Mar 24-25, G8 Mar 27, Launch Apr 5.

## 10. User Stories & Requirements
High-level epics only. Detail in feature specs.

## 11. Out of Scope
Combined non-goals: multi-modal, live inference, gamified data collection,
VIX composite score, monetization, top voter ranking (deferred).

## 12. Gating Timeline & Delivery Tracking
G5-G9 checklist with dates and owners.

## 13. Evaluation Plan (G10)
How to measure if launch solved the G1.

## 14. Dependencies & Risks
API keys for 12 LLMs, domain (vieteval.ai), benchmark data categories,
hi-fi design completion, data seeding.

## 15. Open Questions
Current blockers from Slack scan.
```

- [ ] **Step 3: Commit**

```bash
git add docs/PRD.md
git commit -m "docs: add product-level PRD following Dean Peters 15-section template"
```

---

### Task 3: Build shared/data-model-api.md

**Files:**
- Read: `docs/g3b/specs/00-data-model-api.md` (authoritative schema)
- Read: `docs/g3b/engineering/00-data-model-api.md` (design rationale)
- Create: `docs/shared/data-model-api.md`

- [ ] **Step 1: Read both source files and extract**
  - From specs: DB schema, table definitions, API endpoint catalog, response formats
  - From engineering: Design decisions (immutable responses, guest UUID in localStorage, append-only Elo snapshots, ternary votes, server-side timestamps, stale Elo < 5 min acceptable, seed 50+ internal team battles per model pair)

- [ ] **Step 2: Write `docs/shared/data-model-api.md`**

Structure:
```markdown
# Data Model & API

## Overview
One paragraph describing the shared data layer.

## Database Schema
Tables, relationships, key constraints from specs tier.

## API Endpoints
Endpoint catalog organized by domain (arena, leaderboard, auth, responses).

## Design Decisions
- Responses immutable after creation (protects vote integrity)
- Guest sessions use client-generated UUID in localStorage (privacy)
- guest_sessionId and user_id are mutually exclusive (prevents double-counting)
- Elo Snapshots append-only (enables historical replay)
- Pairwise votes ternary only: win/loss/draw
- Simple Elo with K=32 for G3B (advanced algorithms deferred)
- All vote timestamps server-side generated
- Seed leaderboard with 50+ internal team battles per model pair
- Stale Elo acceptable on leaderboard (< 5 min latency)
```

- [ ] **Step 3: Commit**

```bash
git add docs/shared/data-model-api.md
git commit -m "docs: add shared data model and API spec"
```

---

### Task 4: Build shared/authentication.md

**Files:**
- Read: `docs/g3b/specs/01-authentication.md`
- Read: `docs/g3b/engineering/01-authentication.md` (design rationale)
- Create: `docs/shared/authentication.md`

- [ ] **Step 1: Read source files and extract**
  - From specs: Auth flows, guest gate behavior, signup modal, vote migration
  - From engineering: Design decisions (auth is integration-only, guest data in backend not just localStorage, gate at 4th battle, continue-as-guest option, migration by sessionId not email, JWT in httpOnly cookie, no refresh tokens at P0)

- [ ] **Step 2: Write `docs/shared/authentication.md`**

Structure:
```markdown
# Authentication

## Overview
Auth backend is pre-existing. This spec covers Arena UI integration and guest-to-account migration only.

## Guest Flow
3 free battles → sign-up modal at 4th attempt → "Continue as Guest" available (browse only, no new battles)

## Vote Migration
Guest votes linked via guest_sessionId from localStorage on signup. Session-keyed, not identity-keyed.

## Design Decisions
- Auth is integration-only (no rebuild)
- Guest data stored in backend with guest_sessionId (not only localStorage)
- Guest gate at 4th battle (3 free)
- "Continue as Guest" explicitly allowed (browse, no new battles)
- Migration uses guest_sessionId, not email matching
- JWT in httpOnly cookie (not localStorage)
- No session refresh tokens at P0
```

- [ ] **Step 3: Commit**

```bash
git add docs/shared/authentication.md
git commit -m "docs: add shared authentication spec"
```

---

### Task 5: Build shared/core-layout.md

**Files:**
- Read: `docs/g3b/specs/02-core-layout.md`
- Read: `docs/g3b/engineering/02-core-layout.md` (design rationale)
- Create: `docs/shared/core-layout.md`

- [ ] **Step 1: Read source files and extract**
  - From specs: Navigation structure, sidebar, topbar, routing, responsive behavior
  - From engineering: Design decisions (Vietnamese-first UI, three battle modes as first-class nav, no category chips at P0, random suggested prompts via API, history capped at 100, mode in localStorage, light theme only, 768px breakpoint, client-side search)

- [ ] **Step 2: Write `docs/shared/core-layout.md`**

Structure:
```markdown
# Core Layout

## Overview
Shared navigation, sidebar, topbar, and responsive behavior for the Open Data Portal.

## Navigation Structure
Sidebar with mode selector, conversation history, suggested prompts.

## Responsive Behavior
Desktop: full sidebar. Mobile (< 768px): bottom nav + hamburger drawer.

## Design Decisions
- Vietnamese-first UI (all interactive text in Vietnamese, English for logos only)
- Three battle modes as first-class sidebar navigation
- No category chips on chat screens at P0 (deferred to leaderboard filtering)
- 3 random suggested prompts per page load via API (not hard-coded)
- Conversation history capped at 100 items (pagination deferred)
- Mode persisted in localStorage (vigen_selected_mode)
- Light theme only at P0 (dark mode deferred)
- Mobile breakpoint at 768px: sidebar → bottom nav + hamburger
- Conversation search is client-side substring match
```

- [ ] **Step 3: Commit**

```bash
git add docs/shared/core-layout.md
git commit -m "docs: add shared core layout spec"
```

---

### Task 6: Build features/arena/SPEC.md

**Files:**
- Read: `docs/g3b/specs/04-side-by-side-mode.md`
- Read: `docs/g3b/specs/05-direct-chat-mode.md`
- Read: `docs/g3b/specs/06-vote-system.md`
- Read: `docs/g3b/specs/07-elo-engine.md`
- Read: `docs/g3b/specs/08-leaderboard.md`
- Read: `docs/g3b/specs/09-response-serving.md`
- Read: `docs/g3b/specs/10-chat-history-user-stats.md`
- Read: `docs/g3b/engineering/` (all matching files for design decisions)
- Read: `docs/g3a/G3A-PRD-ViGen-Arena.md` (for user stories, non-goals)
- Create: `docs/features/arena/SPEC.md`

- [ ] **Step 1: Read all Arena source files**

- [ ] **Step 2: Write `docs/features/arena/SPEC.md`**

Structure:
```markdown
# Arena

## Overview
Live blind battles where users vote on anonymous model responses, producing an
Elo-based leaderboard from human preference votes.

## User Stories
(From Arena PRD user stories section)

## Functional Requirements

### Side-by-Side Mode
(From 04-side-by-side-mode.md specs)

### Direct Chat Mode
(From 05-direct-chat-mode.md specs)

### Vote System
(From 06-vote-system.md specs)

### Elo Engine
(From 07-elo-engine.md specs)

### Arena Leaderboard
(From 08-leaderboard.md specs)

### Response Serving
(From 09-response-serving.md specs)

### Chat History & User Stats
(From 10-chat-history-user-stats.md specs)

## Design Decisions
Consolidated from engineering tier:
- SBS: models visible (unlike blind Battle), no Elo reveal, vote buttons show model names
- SBS: model pair persists in localStorage, continue conversation after vote allowed
- Direct Chat: 1-5 star ratings (not pairwise), feeds quality engine not Elo, no turn limit
- Direct Chat: multiple ratings per conversation (per turn), re-rating replaces old
- Vote System: offline queue in localStorage (max 1000), server accepts past timestamps
- Vote System: dedup by (voterId, conversationId, turnNumber, mode), second vote overwrites
- Vote System: "Both bad" and "Tie" both = S=0.5 in Elo
- Vote System: optimistic Elo UI update within 500ms, server batch reconciles nightly
- Vote System: all votes equal weight (no reputation weighting at P0)
- Elo: K=32 fixed, base-10 logistic, bootstrap CIs (1000 permutations, 95%)
- Elo: daily batch at 2 AM UTC, append-only snapshots
- Elo: position-bias correction in pairwise win fraction matrix
- Elo: transitivity violations flagged but not auto-corrected
- Leaderboard: 5 tabs (1 ranking table + 4 stats views: win fraction heatmap, battle count matrix, avg win rate, confidence intervals)
- Leaderboard: pairs <50 battles flagged "unreliable"
- Leaderboard: license badge (Open/Prop), category filter (7 categories, P1-2) doesn't persist to localStorage
- Response serving: pre-computed only (no live inference), Levenshtein fuzzy match <10%
- Response serving: balanced model pair distribution (no pair >1.5x any other in first 100)
- Response serving: multi-turn as pre-computed conversation tree
- Response serving: minimum 540 pre-computed responses at launch
- History: read-only after vote, soft-delete with 5s undo, capped at 100
- History: vote counter authenticated-only, real-time update, stats in avatar dropdown

## UI/UX
Links to Figma: https://www.figma.com/design/s58LWGpASUoNlHMT51CghO/ViGen-Product-Release-R1
Links to prototype: docs/prototype/arena-prototype.html

## Edge Cases & Constraints
(From specs edge cases + engineering constraints)

## Open Questions
(Current open items from Slack)
```

- [ ] **Step 3: Commit**

```bash
git add docs/features/arena/SPEC.md
git commit -m "docs: add Arena feature spec with consolidated design decisions"
```

---

### Task 7: Build features/arena/battle-mode.md

**Files:**
- Read: `docs/g3a/sample-prd-battle-mode.md` (primary PM source — most narrative)
- Read: `docs/g3b/specs/03-battle-mode.md` (detailed behavioral spec)
- Read: `docs/g3b/engineering/03-battle-mode.md` (design rationale)
- Create: `docs/features/arena/battle-mode.md`

- [ ] **Step 1: Read source files**

Note: `sample-prd-battle-mode.md` is the primary source (narrative PRD). `specs/03-battle-mode.md` provides detailed behavior. `engineering/03-battle-mode.md` provides design rationale. Do not treat the three as equal weight.

- [ ] **Step 2: Write `docs/features/arena/battle-mode.md`**

Merge PM spec content with Design Decisions from engineering:
- Blind pairwise evaluation (model identities hidden until vote)
- Position randomization server-side (prevents client-side bias)
- Vote immutable once submitted
- Pre-computed responses only (no live inference)
- Elo reveal with 1.5s delay
- "Both bad" = draw (S=0.5)
- Turn limit of 5
- Conversation state in localStorage with 30-min TTL
- Guest gate at 3 completed battles
- Suggested prompts randomized across all categories at P0

- [ ] **Step 3: Commit**

```bash
git add docs/features/arena/battle-mode.md
git commit -m "docs: add battle mode sub-feature spec"
```

---

### Task 8: Build features/benchmark-leaderboard/SPEC.md

**Files:**
- Read: `docs/g3a/G3A-PRD-Benchmark-Leaderboard.md` (primary source — no separate g3b files exist for this feature)
- Create: `docs/features/benchmark-leaderboard/SPEC.md`

- [ ] **Step 1: Read Benchmark Leaderboard PRD**

Extract G3b sections within the PRD: what makes the cutline, methodology layer, model discovery/filtering, community tab decision.

- [ ] **Step 2: Write `docs/features/benchmark-leaderboard/SPEC.md`**

Structure:
```markdown
# Benchmark Leaderboard

## Overview
Rankings of AI models on 6 Vietnamese-specific benchmarks (SEA-HELM-VN,
Vi-MMLU, Vi-HellaSwag, Vi-MT-Bench, Vi-HumanEval-X, DeepEduBench).

## User Stories
(From Benchmark PRD personas → user stories)

## Functional Requirements

### Leaderboard Table
Sortable, filterable table. Default sort by composite score. Last updated timestamps.
Model cost & infra stats. Methodology tooltips per benchmark score.

### Per-Benchmark Deep Dive Pages
Dedicated page per benchmark: description, methodology, dataset source, example questions, rankings.

### Vietnamese Intelligence Index (VIX)
Composite score across all 6 benchmarks, configurable weights.

### Model Filtering
Open-source vs proprietary, by provider. Submit/suggest model form.

### Community Tab
"Coming Soon" placeholder. Top Voters embedded in Arena leaderboard (Option 4).

## Design Decisions
(Thin — this feature has no engineering tier specs yet. Decisions will be added as the feature is built.)

## UI/UX
Links to Figma: https://www.figma.com/design/s58LWGpASUoNlHMT51CghO/ViGen-Product-Release-R1
Lo-fi mockup: https://chatgpt.com/canvas/shared/69a7c08b9b2c8191b286720e4bc39c18

## Edge Cases & Constraints
- Benchmark data lacks categories (flagged by Lộc Mar 20)
- JSON data structure not yet defined (Lộc asked Trang Mar 17)

## Open Questions
- What JSON data structure for benchmark scores?
- How to handle missing category data?
- Mobile-responsive table design for 6+ benchmark columns?
```

Note: This spec is intentionally thin. It will grow as the feature is built.

- [ ] **Step 3: Commit**

```bash
git add docs/features/benchmark-leaderboard/SPEC.md
git commit -m "docs: add Benchmark Leaderboard feature spec"
```

---

### Task 9: Delete old structure

**Files:**
- Delete: `docs/g3a/` (entire directory)
- Delete: `docs/g3b/` (entire directory)

- [ ] **Step 1: Verify all content has been migrated**

Check that PRD.md, feature specs, shared specs, and battle-mode.md are all committed.

- [ ] **Step 2: Delete old directories**

```bash
git rm -r docs/g3a docs/g3b
```

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: remove legacy g3a/g3b structure (content migrated to new layout)"
```

- [ ] **Step 4: Push**

```bash
git push aiv aiv-open-data-portal:main
```
