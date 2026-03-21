# ViGen Arena — G3B Claude Code Implementation Specs

**Created:** March 12, 2026
**Purpose:** Comprehensive, technically rich specs enabling Claude Code to build the full ViGen Arena application.
**Architecture:** Fresh build — React 19 + TypeScript + Vite + Tailwind 4 + Shadcn/ui | Python FastAPI + SQLAlchemy + MySQL | Docker on EC2

## Spec Index

| # | File | Lines | What It Contains |
|---|------|-------|-----------------|
| 00 | 00-project-setup.md | 1,112 | Tech stack, complete file tree, .env.example, Docker (docker-compose + multi-stage Dockerfiles), package.json, requirements.txt, vite/tsconfig/tailwind config, Alembic setup, dev workflow, build order |
| 01 | 01-data-model-api.md | 2,058 | MySQL CREATE TABLE statements (9 tables), SQLAlchemy 2.0 models, Pydantic v2 schemas (32+ classes), all API endpoint signatures (25+ routes across 5 routers), async DB connection setup, seed data script (12 models, 30 prompts), Alembic migration |
| 02 | 02-auth-integration.md | 1,085 | Guest session management (localStorage), AuthModal component (Shadcn Dialog), topbar auth UI, guest→account migration endpoint, Zustand auth store, useAuth hook, FastAPI auth guard middleware, edge cases |
| 03 | 03-core-layout.md | 1,242 | App shell (Topbar + Sidebar + Main), responsive layout (mobile/tablet/desktop), tailwind.config.ts (light theme), Vietnamese UI constants, Shadcn component list + install commands, CSS custom properties, React Router setup |
| 04 | 04-battle-mode.md | 1,090 | BattlePage, WelcomeScreen, DualResponsePanel, VoteBar, EloReveal components. Vote color CSS. Multi-turn flow. Model pair selection. Zustand battle store. Full TSX. |
| 05 | 05-side-by-side-mode.md | ~1,200 | SBSPage, ModelSelector (searchable dropdown), named response display, contextual winner message. Multi-turn continue after vote ("Tiếp tục hội thoại" + "So sánh tiếp"). Model selections persist on reset. Full TSX. |
| 06 | 06-direct-chat-mode.md | 1,169 | DirectChatPage, StarRating, QualityTags components. Unlimited multi-turn. 5-star + 5-tag rating system. Full TSX. |
| 07 | 07-vote-system.md | 860 | POST /api/arena/vote endpoint (full Python), vote validation + deduplication, rate limiting middleware, guest vote localStorage queue, guest→account linking SQL, useVote hook |
| 08 | 08-elo-engine.md | 822 | Elo update function (K=32), bootstrap CI (1000 permutations), pairwise stats (win fraction, battle count, avg win rate), daily batch job (cron), on-vote Elo delta for real-time reveal |
| 09 | 09-leaderboard.md | ~1,100 | LeaderboardPage + StatTabs components. 4 Recharts visualizations: win fraction heatmap, battle count heatmap, avg win rate bars, CI dot-and-whisker. FastAPI endpoints. Sortable table with sort persistence (localStorage). License Type column (Open/Prop badges). Category filter tabs (7 tabs, P1-2 preview). |
| 10 | 10-response-serving.md | 1,401 | Response matching service (Battle/SBS/Direct modes), position randomization, closest-match fallback, multi-turn response trees, seed data structure + script, FastAPI endpoints |
| 11 | 11-chat-history-user-stats.md | 1,403 | ConversationHistory sidebar component, search/filter, read-only detail view, soft delete with undo, user stats dropdown, vote counter, FastAPI history endpoints (6 routes), guest localStorage utilities |

**Total: 13,442 lines across 12 specs** (excludes duplicate 00-data-model-api.md)

## Build Order

```
Phase 1: Foundation
  00-project-setup.md     → Bootstrap project, install deps, Docker, configs
  01-data-model-api.md    → Create DB schema, ORM models, Pydantic schemas, API skeleton

Phase 2: Auth + Shell
  02-auth-integration.md  → Guest session, auth modal, topbar auth, migration endpoint
  03-core-layout.md       → App shell, sidebar, topbar, responsive, Vietnamese UI

Phase 3: Arena Modes
  04-battle-mode.md       → Blind pairwise evaluation (core feature)
  05-side-by-side-mode.md → Named model comparison
  06-direct-chat-mode.md  → Single model + star rating

Phase 4: Backend Systems
  07-vote-system.md       → Vote persistence, validation, guest linking
  08-elo-engine.md        → Elo calculation, bootstrap CIs, batch job
  10-response-serving.md  → Pre-computed response matching + seed data

Phase 5: Leaderboard + History
  09-leaderboard.md       → Table + 4 statistical views
  11-chat-history-user-stats.md → Conversation history, search, user stats
```

## Dependency Graph

```
01 (Data Model) ← ALL other specs depend on this
02 (Auth) ← 04, 05, 06, 07, 11 (all need auth state)
03 (Layout) ← 04, 05, 06, 09, 11 (all render inside the shell)
07 (Vote) ← 04, 05, 06 (all modes submit votes)
08 (Elo) ← 07 (votes trigger Elo updates), 09 (leaderboard displays Elo)
10 (Response) ← 04, 05, 06 (all modes fetch responses)
```

## Key Design Decisions

1. **Fresh build** — Does NOT reuse existing vigen-arena codebase. New architecture with MySQL, Shadcn/ui, Alembic migrations.
2. **Light theme** — White/gray background, blue accent (#2563eb), Inter font. NOT dark mode.
3. **Auth is integration-only** — Google OAuth, email/password, 2FA, profile page, password reset all already built. Specs cover Arena UI integration points only.
4. **No category chips on chat screens** — Categories are leaderboard-only filters (P1-2). Auto-classification approach TBD by engineering.
5. **Pre-computed responses** — No live LLM inference. Responses served from MySQL.
6. **Recharts for charts** — Not Canvas-based. Better React/Shadcn integration.
7. **Zustand for state** — Lightweight, TypeScript-first. Separate stores per feature domain.
8. **Vietnamese-only UI** — Hardcoded strings, no i18n framework.

## How Claude Code Should Use These Specs

1. Read `00-project-setup.md` first — bootstrap the project
2. Read `01-data-model-api.md` — create DB schema and API skeleton
3. For each feature: read the corresponding spec, implement, test
4. Follow the build order above — each phase builds on the previous
5. All code in specs is copy-paste ready — adapt to project structure as needed

## Cross-Reference to G3B Engineering Specs

| Claude Code Spec | Engineering Spec | G3A PRD Requirement |
|-----------------|-----------------|-------------------|
| 00-project-setup | (new — no eng equivalent) | Architecture Overview |
| 01-data-model-api | 00-data-model-api | P0-8, P0-9 |
| 02-auth-integration | 01-authentication | P0-6, P0-7 |
| 03-core-layout | 02-core-layout | P0-5, P0-10 |
| 04-battle-mode | 03-battle-mode | P0-1, P0-12 |
| 05-side-by-side-mode | 04-side-by-side-mode | P0-2, P0-12 |
| 06-direct-chat-mode | 05-direct-chat-mode | P0-3, P0-12 |
| 07-vote-system | 06-vote-system | P0-8 |
| 08-elo-engine | 07-elo-engine | P0-11 |
| 09-leaderboard | 08-leaderboard | P0-4 |
| 10-response-serving | 09-response-serving | P0-9 |
| 11-chat-history-user-stats | 10-chat-history-user-stats | P0-5 |
