# G3B — Claude Code Implementation Specs

**Status:** In Development (Spec 00 Complete)
**Project:** ViGen Arena — Vietnamese GenAI Human Evaluation Platform
**Timeline:** March 9–15, 2026 | Dev Complete: March 31
**Deployment:** April 5, 2026 (Launch Day)

---

## 📋 Spec Series (12 Total)

This folder contains **implementation-ready specs for Claude Code**, derived from the engineering specs in `../g3b-engineering/`.

**Key distinction:** Engineering specs describe **behavior only** (what the feature does, user flows, acceptance criteria). These Claude Code specs add **implementation details** (file structure, component hierarchy, API contracts, database queries, code patterns).

### Completed ✅

| # | Spec | Lines | Status | Coverage |
|---|------|-------|--------|----------|
| **00** | **Data Model & API** | **2,058** | **✅ COMPLETE** | **MySQL DDL, SQLAlchemy models, Pydantic schemas, 25+ API routes, seed data** |

### In Progress 🔄

| # | Spec | Feature | Owner |
|---|------|---------|-------|
| 01 | Auth Integration & Guest Gate | JWT + Google OAuth + session linking | Engineering (blocking 02) |
| 02 | Core Layout & Vietnamese UI | App shell, sidebar, topbar, i18n | Frontend |
| 03 | Battle Mode | Blind pairwise + multi-turn voting | Frontend (depends on 01, 06) |
| 04 | Side-by-Side Mode | Named model comparison + voting | Frontend (depends on 01, 06) |
| 05 | Direct Chat Mode | Single model + star rating + tags | Frontend (depends on 01, 06) |
| 06 | Vote System | Vote persistence, deduplication, attribution | Backend (depends on 00) |
| 07 | Elo Engine | Elo calculation, bootstrap CIs, batch job | Backend (depends on 00, 06) |
| 08 | Leaderboard | Table + 4 statistical views (heatmaps, etc.) | Frontend (depends on 07) |
| 09 | Response Serving | Pair serving, multi-turn support | Backend (depends on 00) |
| 10 | Chat History & User Stats | Conversation history, search, user stats | Frontend (depends on 01, 06, 09) |

---

## 📖 Spec 00 — Data Model & API Foundation

**File:** `00-data-model-api.md` (2,058 lines)

### What's Included

- **Part 1: MySQL Schema (DDL)**
  - 9 tables with UTF-8 collation: users, prompts, models, responses, conversations, conversation_turns, votes, elo_snapshots, leaderboard_stats
  - Foreign keys, unique constraints, check constraints, indexes
  - Ready to run: `mysql < schema.sql`

- **Part 2: SQLAlchemy 2.0 ORM Models**
  - 9 model classes with relationships, hybrid properties, __repr__
  - Copy-paste ready into `app/models.py`
  - Async-first design (future-proof)

- **Part 3: Pydantic v2 Request/Response Schemas**
  - 32 schema classes for all operations
  - Auth, Arena, Leaderboard, History modules
  - Input validation, JSON serialization

- **Part 4: API Endpoint Signatures**
  - 25+ routes across 5 routers
  - Auth, Arena, Leaderboard, History, Admin
  - Request/response shapes, auth requirements, error codes

- **Part 5: Database Connection Setup**
  - `app/database.py` — async engine, connection pooling, session factory
  - `app/main.py` — FastAPI app with lifespan, CORS, health check

- **Part 6: Seed Data Script**
  - 12-model roster (exact from G3A PRD)
  - 30 Vietnamese prompts (6 categories × 5 each)
  - Sample responses for testing
  - Demo user

- **Part 7–10: Supporting Setup**
  - Alembic migration workflow
  - .env configuration template
  - Quick-start checklist
  - Dependency graph (how specs 01–10 depend on 00)

### Key Design Decisions

✓ **MySQL 8.0+** with UTF-8 collation (Vietnamese support)
✓ **SQLAlchemy 2.0 async** (aiomysql) for concurrency
✓ **Pydantic v2** for strict type validation
✓ **Elo rating system** as specified (K=32, base-10, 1000 anchor)
✓ **Position-bias correction** in vote matrices (average both positions)
✓ **Bootstrap Elo CIs** (1,000 shuffles, 2.5th/97.5th percentile)
✓ **Guest → user attribution** via session_id + email linking
✓ **Soft deletes** (status='abandoned', not hard delete)

### Ready for Implementation

✅ Claude Code can implement routers immediately
✅ Frontend can consume API contracts
✅ Database engineers can build schemas
✅ QA can write integration tests
✅ DevOps can containerize and deploy

---

## 🚀 How to Use These Specs

1. **Start with Spec 00** — Creates the foundation all others depend on
2. **Database engineers:** Run the DDL (Part 1) to create schema
3. **Backend engineers:** Copy-paste the ORM models and schemas (Parts 2–3) into your FastAPI project
4. **Routers:** Implement endpoints per Part 4 signatures
5. **Seed data:** Load 12 models + 30 prompts via script (Part 6)
6. **Frontend engineers:** Consume the API contracts from Part 4

**Dependency chain:**
```
Spec 00 (Data Model & API)
  ├─ Blocks: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10
  └─ Dependencies: MySQL, SQLAlchemy, Pydantic, FastAPI
```

---

## 📊 Model Roster (Included in Spec 00)

12 models across proprietary and open-source:

**Proprietary (6):**
1. Claude Opus 4.6 (Anthropic) — #1 reasoning
2. GPT-5 (OpenAI) — Coding + creative
3. Gemini 3 Pro (Google) — Frontier model
4. Gemini 3 Flash (Google) — Speed-optimized
5. Claude Sonnet 4.6 (Anthropic) — Quality/speed balance
6. Grok 4 (xAI) — Trending

**Open-source (6):**
7. DeepSeek V3.2 (DeepSeek) — 685B/37B MoE
8. Llama 4 Maverick (Meta) — 400B/17B active
9. Qwen 3.5 (Alibaba) — Math/coding/science SOTA
10. GLM-5 (Zhipu AI) — Multilingual
11. Kimi K2.5 (Moonshot AI) — Strong reasoning
12. Mistral Large 2 (Mistral AI) — European SOTA

---

## 📋 Categories (Included in Spec 00)

6 Vietnamese-first evaluation categories, 5 prompts each:

- **Kiến thức** (Knowledge) — Factual explanations
- **Sáng tạo** (Creative) — Poetry, stories, creative text
- **Suy luận** (Reasoning) — Analysis, argumentation
- **Lập trình** (Coding) — Vietnamese code specs
- **Văn hóa VN** (Culture) — Proverbs, tone, traditions
- **Nghề nghiệp** (Professional) — Business Vietnamese

---

## ⚙️ Modes & Voting (Included in Spec 00)

**Voting Modes:**
- **Battle** — Blind pairwise (model names hidden until reveal)
- **SBS** — Side-by-side (model names visible)
- **Direct** — Single model + star rating

**Vote Choices:**
- Battle/SBS: `a`, `b`, `tie`, `bad`
- Direct: `1`, `2`, `3`, `4`, `5` (stars)

---

## 📞 Questions During Development?

Refer to:
1. **G3A PRD** (`../G3A-PRD-ViGen-Arena.md`) — Product requirements and competitive analysis
2. **Spec 00** (this folder) — API contracts and database schema
3. **Engineering specs** (`../g3b-engineering/`) — Feature behavior and acceptance criteria

---

## 🔄 Status Updates

| Date | Milestone | Status |
|------|-----------|--------|
| Mar 12, 2026 | Spec 00 delivered | ✅ Complete |
| Mar 15 | Specs 01–05 drafted | 🔄 In progress |
| Mar 20 | All specs complete | 📅 Planned |
| Mar 31 | Dev + testing complete | 📅 Planned |
| Apr 5 | Launch | 🚀 Target |
