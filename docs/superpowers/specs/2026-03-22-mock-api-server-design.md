# Mock API Server Design

**Date:** 2026-03-22
**Status:** Approved
**Purpose:** Enable end-to-end frontend testing of all Arena and Leaderboard screens before the real backend API is ready.

## Approach

Lightweight Express mock server (`mock/server.ts`) running on port 3001. Vite dev server proxies `/api` to it. Zero FE code changes — when real API is ready, remove the proxy line.

## File Structure

```
frontend/
├── mock/
│   ├── server.ts           # Express server (~200 lines)
│   ├── fixtures/
│   │   ├── models.json      # 12 models with metadata + Elo
│   │   ├── prompts.json     # 10 Vietnamese prompts, 5 categories
│   │   ├── responses.json   # ~50 pre-written Vietnamese responses
│   │   └── leaderboard.json # Pre-computed Elo, CI, matrices
│   └── README.md
├── vite.config.ts           # proxy: /api → localhost:3001
└── package.json             # devDeps: express, @types/express, tsx
```

## 12 Arena Models

| ID | Name | Org | License |
|----|------|-----|---------|
| `deepseek/deepseek-r1` | DeepSeek R1 | DeepSeek | open |
| `google/gemini-2.5-flash` | Gemini 2.5 Flash | Google | prop |
| `google/gemini-3.1-pro-preview` | Gemini 3.1 Pro | Google | prop |
| `meta-llama/llama-3-70b-instruct` | Llama 3 70B | Meta | open |
| `openai/gpt-4o-mini` | GPT-4o Mini | OpenAI | prop |
| `openai/gpt-5-mini` | GPT-5 Mini | OpenAI | prop |
| `openai/gpt-5.4` | GPT-5.4 | OpenAI | prop |
| `qwen/qwen-vl-plus` | Qwen VL Plus | Alibaba | open |
| `xai/grok-3-mini` | Grok 3 Mini | xAI | prop |
| `xai/grok-3-fast-latest` | Grok 3 Fast | xAI | prop |
| `anthropic/claude-sonnet` | Claude Sonnet | Anthropic | prop |
| `vinai/phobert-large` | PhoBERT Large | VinAI | open |

## 10 Prompts (2 per category)

Categories: Tổng hợp, Sáng tạo, Suy luận, Lập trình, Văn hoá Việt Nam.
Includes the 3 existing welcome screen prompts.

## Endpoint Behavior

### Static (return fixtures)
- `GET /api/arena/models` → 12 models
- `GET /api/arena/prompts` → 10 prompts, filterable by `?category=`
- `GET /api/arena/history` → 5 sample entries

### Dynamic (stateful)

**`GET /api/arena/pair`** — Battle/SBS pair generation
- Random model pair (or `?model_a=&model_b=` for SBS)
- Looks up pre-written response for prompt+model; falls back to template
- Randomizes A/B position (coin flip)
- 800-1500ms delay

**`GET /api/arena/response`** — Direct mode
- Single model response for `?model_id=&prompt_id=`
- 500-1000ms delay

**`POST /api/arena/vote`** — Vote + Elo computation
- Computes Elo delta (K=32)
- Updates in-memory leaderboard
- Battle mode: returns `elo_reveal` object
- SBS/direct: returns `{ success: true }`

**`GET /api/leaderboard/`** — Dynamic rankings
- Returns current Elo rankings (affected by session votes)
- Supports `?license=` filter

**`GET /api/leaderboard/stats/{type}`** — Matrix/chart data
- `win-fraction` → 12x12 win rate matrix
- `battle-count` → 12x12 battle count matrix
- `avg-win-rate` → sorted bar data

**`POST /api/auth/register` + `/login`** — Fake auth
- Always succeeds; returns `{ user_id: 1, email, token: "mock-jwt-token" }`

### Error Simulation
Any endpoint + `?simulate_error=true` → returns 500 error.

## Run Commands

```bash
npm run mock        # Express on :3001
npm run dev         # Vite on :5173, proxies /api → :3001
npm run dev:mock    # Both concurrently
```

## Vietnamese Response Strategy

~50 pre-written responses covering key model+prompt combos. Quality varies intentionally (some models respond better than others) to make voting meaningful. Fallback template for uncovered combos: generic Vietnamese text with model name injected.

## Transition to Real API

1. Remove `proxy` from `vite.config.ts`
2. Set API base URL env var to real backend
3. Delete `mock/` directory
4. No FE code changes needed
