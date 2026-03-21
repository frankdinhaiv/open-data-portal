# Design: Open Data Portal Docs Restructure

**Date:** 2026-03-21
**Status:** Approved
**Author:** Frank + Claude

---

## Context

The Open Data Portal repo has a `docs/` folder inherited from the AIV-PM artifacts directory. It uses a gating-based structure (`g3a/`, `g3b/specs/`, `g3b/engineering/`, `g3b/claude-code/`) that mixes two features (Arena and Benchmark Leaderboard) under shared numbered spec files.

### Problems
1. Arena and Benchmark Leaderboard are conflated — `08-leaderboard.md` covers Arena's Elo leaderboard, not the Benchmark Leaderboard
2. Three spec tiers (PM specs, engineering, claude-code) are redundant now that code exists in `backend/` and `frontend/`
3. No product-level PRD — only feature-level PRDs exist
4. Folder structure follows project lifecycle (gates) rather than product organization

## Design

### Principles
- **One product, two features:** Open Data Portal is the product; Arena and Benchmark Leaderboard are features
- **Dean Peters' PRD methodology:** Product-level PRD follows the 15-section template from `skills/prd-development/`
- **Feature specs own the "what and how":** Detailed behavior lives in feature specs, not the PRD
- **Shared specs prevent duplication:** Cross-cutting concerns (auth, data model, layout) get their own docs
- **Code is source of truth:** No engineering or claude-code spec tiers — design decisions merge into feature specs

### Target Folder Structure

```
docs/
├── PRD.md                              # Open Data Portal product PRD (15 sections)
├── features/
│   ├── arena/
│   │   ├── SPEC.md                     # Arena feature spec
│   │   └── battle-mode.md             # Battle mode sub-feature detail
│   └── benchmark-leaderboard/
│       └── SPEC.md                     # Benchmark leaderboard feature spec
├── shared/
│   ├── data-model-api.md              # DB schema, API endpoints
│   ├── authentication.md              # Auth flow, guest voting, signup
│   └── core-layout.md                 # Navigation, sidebar, topbar, responsive
├── prototype/
│   ├── arena-prototype.html           # Interactive HTML prototype
│   └── arena-ui-prototype-approach.md # Design rationale
└── superpowers/
    └── specs/
        └── 2026-03-21-docs-restructure-design.md  # This file
```

**Deleted:** `g3a/`, `g3b/` (all tiers). Recoverable from git history.

### Disposition of Deleted Files

The `g3b/engineering/` and `g3b/claude-code/` tiers (~13K lines across ~25 files) are **intentionally retired**, not migrated. Rationale:

- **Engineering specs** described architecture decisions. Useful decisions are extracted into feature SPEC.md "Design Decisions" sections during migration. The rest is superseded by the built codebase.
- **Claude-code specs** were copy-paste-ready implementation code. The actual source code in `backend/` and `frontend/` is now the source of truth. These files will drift from reality with every commit.
- **Meta-documents** (`_MANIFEST.md`, `IMPLEMENTATION-SUMMARY.md`, `INDEX.md`, `README.md`) described build order and cross-references for the claude-code tier. No longer needed.
- **Archive** (`g3b/archive/03-battle-mode.md`) is a superseded draft. Deleted with everything else.

If any implementation detail is needed later, `git log -- docs/g3b/` recovers the full history.

### PRD.md — Product-Level Document

Follows Dean Peters' 15-section PRD template:

| Section | Content Source |
|---------|---------------|
| §1 Executive Summary | Synthesized from both existing PRDs |
| §2 Problem Statement (G1) | Merged Arena PRD G1 + Benchmark PRD G1 |
| §3 Target Users & Personas | Benchmark PRD's 3 personas (cover both features) |
| §4 Strategic Context | Competitive landscape (G10 from Trang's deck), why now |
| §5 Solution Ideation & Prioritization | References feature specs |
| §6 Solution Overview — Vision & Architecture | System architecture showing how features connect |
| §7 Design Specification — Cutline | What's in for April 5 launch vs deferred |
| §8 Success Metrics | Voter targets, user acquisition goals |
| §9 Estimation & Timeline | G5→G8 (Mar 19 → Mar 27), launch Apr 5 |
| §10 User Stories & Requirements | High-level epics only — detail in feature specs |
| §11 Out of Scope | Combined non-goals from both PRDs |
| §12 Gating Timeline | G5–G9 checklist with dates |
| §13 Evaluation Plan (G10) | How to measure if launch solved the G1 |
| §14 Dependencies & Risks | API keys, domain, benchmark data gaps |
| §15 Open Questions | Current blockers |

PRD.md stays at product level. It does not describe battle mode mechanics or leaderboard table columns.

### Feature SPEC.md Template

```markdown
# [Feature Name]

## Overview
One paragraph — what this feature does and why it exists.

## User Stories
- As a [persona], I want [action] so that [outcome]
- Acceptance criteria per story

## Functional Requirements
Detailed behavior organized by sub-feature (use H3 headings per sub-feature).

## Design Decisions
Why key choices were made (merged from engineering tier).

## UI/UX
Key screens and flows. Links to Figma and prototype.

## Edge Cases & Constraints

## Open Questions
```

### Arena Sub-Feature Consolidation

The Arena has 8 sub-features currently spread across separate spec files. They consolidate as follows:

| Current Spec File | Destination |
|-------------------|-------------|
| `03-battle-mode.md` | `features/arena/battle-mode.md` (own file — largest sub-feature) |
| `04-side-by-side-mode.md` | `features/arena/SPEC.md` § Functional Requirements → Side-by-Side Mode |
| `05-direct-chat-mode.md` | `features/arena/SPEC.md` § Functional Requirements → Direct Chat Mode |
| `06-vote-system.md` | `features/arena/SPEC.md` § Functional Requirements → Vote System |
| `07-elo-engine.md` | `features/arena/SPEC.md` § Functional Requirements → Elo Engine |
| `08-leaderboard.md` | `features/arena/SPEC.md` § Functional Requirements → Arena Leaderboard |
| `09-response-serving.md` | `features/arena/SPEC.md` § Functional Requirements → Response Serving |
| `10-chat-history-user-stats.md` | `features/arena/SPEC.md` § Functional Requirements → Chat History & User Stats |

Battle mode gets its own file because it's the primary user-facing experience with the most complexity. The other 7 sub-features collapse into H3 sections within SPEC.md. If any section grows too large during migration, it can be extracted into its own file.

### Benchmark Leaderboard — Thin Spec Expected

The Benchmark Leaderboard has **no existing g3b specs** — the entire g3b/ folder covers Arena only. The `features/benchmark-leaderboard/SPEC.md` will be drafted primarily from:

1. `g3a/G3A-PRD-Benchmark-Leaderboard.md` (Trang's PRD — G1, G2, G3a, G3b sections)
2. Slack context (Lộc's questions about data structure, category gaps)
3. Figma designs (Aaron's leaderboard screens)

This spec is expected to be thinner than Arena's at this stage. It will grow as the feature is built.

### Shared Specs

Cross-cutting docs serving both features:

- **`shared/data-model-api.md`** — DB schema, API endpoint catalog, response formats. Source: merge `g3b/specs/00-data-model-api.md` (authoritative schema definitions) with relevant design rationale from `g3b/engineering/00-data-model-api.md`. Implementation details from `g3b/claude-code/` are omitted — the code is the source of truth.
- **`shared/authentication.md`** — Guest voting, signup/login, 2FA reuse, 1-free-vote-then-auth rule
- **`shared/core-layout.md`** — Sidebar, topbar, page routing, responsive breakpoints, light theme

Only content that serves both features belongs here. Feature-specific APIs stay in feature specs.

### Migration Plan

| Step | Action |
|------|--------|
| 1 | Create new folder structure |
| 2 | Build `PRD.md` by merging both G3A PRDs into 15-section template |
| 3 | Build `features/arena/SPEC.md` from Arena PM specs + engineering design decisions |
| 4 | Move `sample-prd-battle-mode.md` → `features/arena/battle-mode.md` |
| 5 | Build `features/benchmark-leaderboard/SPEC.md` from G3b sections within `g3a/G3A-PRD-Benchmark-Leaderboard.md` + Slack context + Figma designs (no separate g3b/ files exist for this feature) |
| 6 | Build shared specs from `00-data-model-api.md`, `01-authentication.md`, `02-core-layout.md` |
| 7 | Move prototype files to `prototype/` |
| 8 | Delete `g3a/` and `g3b/` entirely |
| 9 | Commit as one restructuring commit |

### Design Specs Convention

The `docs/superpowers/specs/` folder holds design documents created during brainstorming sessions. Naming convention: `YYYY-MM-DD-<topic>-design.md`. These are internal decision records, not product specs.
