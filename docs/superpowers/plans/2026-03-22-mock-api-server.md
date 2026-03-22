# Mock API Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stateful Express mock server with 12 models, 10 prompts, ~50 Vietnamese responses, and Elo computation so all Arena and Leaderboard FE screens can be tested end-to-end without the real backend.

**Architecture:** Single Express server file + JSON fixture files. Vite proxies `/api` to mock server. In-memory state for Elo updates during session. No database.

**Tech Stack:** Express, tsx (dev runner), concurrently (parallel dev+mock), TypeScript

**Spec:** `docs/superpowers/specs/2026-03-22-mock-api-server-design.md`

---

### Task 1: Install Dependencies & Configure Proxy

**Files:**
- Modify: `frontend/package.json` — add devDeps + scripts
- Modify: `frontend/vite.config.ts:8-10` — change proxy port to 3001

- [ ] **Step 1: Install dev dependencies**

Run:
```bash
cd frontend && npm install --save-dev express @types/express tsx concurrently
```

- [ ] **Step 2: Add mock scripts to package.json**

Add to `"scripts"`:
```json
"mock": "tsx mock/server.ts",
"dev:mock": "concurrently --names mock,vite --prefix-color blue,green \"npm run mock\" \"npm run dev\""
```

- [ ] **Step 3: Update vite proxy to port 3001**

In `vite.config.ts`, change:
```ts
proxy: {
  '/api': 'http://localhost:3001',
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vite.config.ts
git commit -m "chore: add mock server dependencies and proxy config"
```

---

### Task 2: Create Model Fixtures

**Files:**
- Create: `frontend/mock/fixtures/models.json`

- [ ] **Step 1: Create fixtures directory**

```bash
mkdir -p frontend/mock/fixtures
```

- [ ] **Step 2: Write models.json**

12 models matching the Arena SPEC. Each model needs: `id`, `name`, `org`, `license`, `color`, `elo_rating`, `ci`, `win_rate`, `total_votes`.

```json
[
  { "id": "deepseek/deepseek-r1", "name": "DeepSeek R1", "org": "DeepSeek", "license": "open", "color": "#4f8ef7", "elo_rating": 1387, "ci": 22, "win_rate": 0.61, "total_votes": 245 },
  { "id": "google/gemini-2.5-flash", "name": "Gemini 2.5 Flash", "org": "Google", "license": "prop", "color": "#4285f4", "elo_rating": 1352, "ci": 28, "win_rate": 0.57, "total_votes": 198 },
  { "id": "google/gemini-3.1-pro-preview", "name": "Gemini 3.1 Pro", "org": "Google", "license": "prop", "color": "#4285f4", "elo_rating": 1421, "ci": 18, "win_rate": 0.65, "total_votes": 312 },
  { "id": "meta-llama/llama-3-70b-instruct", "name": "Llama 3 70B", "org": "Meta", "license": "open", "color": "#0668e1", "elo_rating": 1298, "ci": 35, "win_rate": 0.49, "total_votes": 167 },
  { "id": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "org": "OpenAI", "license": "prop", "color": "#10a37f", "elo_rating": 1335, "ci": 25, "win_rate": 0.55, "total_votes": 221 },
  { "id": "openai/gpt-5-mini", "name": "GPT-5 Mini", "org": "OpenAI", "license": "prop", "color": "#10a37f", "elo_rating": 1412, "ci": 20, "win_rate": 0.64, "total_votes": 287 },
  { "id": "openai/gpt-5.4", "name": "GPT-5.4", "org": "OpenAI", "license": "prop", "color": "#10a37f", "elo_rating": 1445, "ci": 15, "win_rate": 0.68, "total_votes": 334 },
  { "id": "qwen/qwen-vl-plus", "name": "Qwen VL Plus", "org": "Alibaba", "license": "open", "color": "#6f42c1", "elo_rating": 1275, "ci": 38, "win_rate": 0.46, "total_votes": 143 },
  { "id": "xai/grok-3-mini", "name": "Grok 3 Mini", "org": "xAI", "license": "prop", "color": "#1d9bf0", "elo_rating": 1310, "ci": 30, "win_rate": 0.52, "total_votes": 189 },
  { "id": "xai/grok-3-fast-latest", "name": "Grok 3 Fast", "org": "xAI", "license": "prop", "color": "#1d9bf0", "elo_rating": 1368, "ci": 24, "win_rate": 0.59, "total_votes": 256 },
  { "id": "anthropic/claude-sonnet", "name": "Claude Sonnet", "org": "Anthropic", "license": "prop", "color": "#d97706", "elo_rating": 1432, "ci": 17, "win_rate": 0.66, "total_votes": 298 },
  { "id": "vinai/phobert-large", "name": "PhoBERT Large", "org": "VinAI", "license": "open", "color": "#e11d48", "elo_rating": 1245, "ci": 42, "win_rate": 0.42, "total_votes": 112 }
]
```

- [ ] **Step 3: Commit**

```bash
git add frontend/mock/
git commit -m "feat(mock): add 12 model fixtures"
```

---

### Task 3: Create Prompt & Response Fixtures

**Files:**
- Create: `frontend/mock/fixtures/prompts.json`
- Create: `frontend/mock/fixtures/responses.json`

- [ ] **Step 1: Write prompts.json**

10 prompts, 2 per category. Include the 3 welcome screen prompts. Each: `{ id, text, category }`.

Categories: `"tong-hop"`, `"sang-tao"`, `"suy-luan"`, `"lap-trinh"`, `"van-hoa"`.

- [ ] **Step 2: Write responses.json**

~50 pre-written Vietnamese responses. Structure:
```json
[
  {
    "prompt_id": 1,
    "model_id": "openai/gpt-5.4",
    "content": "Vietnamese response text here..."
  }
]
```

Cover at least 5 models per prompt with varying quality. Include:
- Long detailed responses (3-4 paragraphs) for top models
- Shorter, less detailed responses for weaker models
- At least one response with markdown formatting (bullet lists, bold)

- [ ] **Step 3: Commit**

```bash
git add frontend/mock/fixtures/
git commit -m "feat(mock): add 10 prompts and ~50 Vietnamese response fixtures"
```

---

### Task 4: Create Leaderboard Fixtures

**Files:**
- Create: `frontend/mock/fixtures/leaderboard.json`

- [ ] **Step 1: Write leaderboard.json**

Structure:
```json
{
  "rankings": [...],
  "win_fraction_matrix": {
    "models": ["model_id_1", ...],
    "data": [[0.5, 0.62, ...], ...]
  },
  "battle_count_matrix": {
    "models": ["model_id_1", ...],
    "data": [[0, 45, ...], ...]
  },
  "avg_win_rate": [
    { "model_id": "openai/gpt-5.4", "name": "GPT-5.4", "org": "OpenAI", "color": "#10a37f", "win_rate": 0.68 },
    ...
  ]
}
```

- 12x12 win fraction matrix with realistic values (0.35-0.65 range, diagonal = 0.5)
- 12x12 battle count matrix (50-300 range, symmetric)
- avg_win_rate sorted descending

- [ ] **Step 2: Commit**

```bash
git add frontend/mock/fixtures/leaderboard.json
git commit -m "feat(mock): add leaderboard fixtures with matrices"
```

---

### Task 5: Build Express Mock Server

**Files:**
- Create: `frontend/mock/server.ts`

- [ ] **Step 1: Write server.ts with all endpoints**

```typescript
import express from 'express'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json())

// Load fixtures
const models = JSON.parse(readFileSync(join(__dirname, 'fixtures/models.json'), 'utf-8'))
const prompts = JSON.parse(readFileSync(join(__dirname, 'fixtures/prompts.json'), 'utf-8'))
const responses = JSON.parse(readFileSync(join(__dirname, 'fixtures/responses.json'), 'utf-8'))
const leaderboardData = JSON.parse(readFileSync(join(__dirname, 'fixtures/leaderboard.json'), 'utf-8'))

// In-memory Elo state (reset on restart)
const eloState = new Map<string, number>()
models.forEach((m: any) => eloState.set(m.id, m.elo_rating))

let responseIdCounter = 1000
let voteIdCounter = 1

// Helper: random delay
function delay(min: number, max: number) {
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)))
}

// Helper: error simulation
function shouldError(req: express.Request) {
  return req.query.simulate_error === 'true'
}

// Helper: Elo computation (K=32)
function computeElo(ratingA: number, ratingB: number, scoreA: number) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
  const deltaA = Math.round(32 * (scoreA - expectedA))
  return { deltaA, deltaB: -deltaA }
}

// GET /api/arena/models
app.get('/api/arena/models', async (req, res) => {
  if (shouldError(req)) return res.status(500).json({ error: 'Internal server error' })
  res.json(models)
})

// GET /api/arena/prompts
app.get('/api/arena/prompts', async (req, res) => {
  if (shouldError(req)) return res.status(500).json({ error: 'Internal server error' })
  const category = req.query.category as string | undefined
  const filtered = category ? prompts.filter((p: any) => p.category === category) : prompts
  res.json(filtered)
})

// GET /api/arena/pair
app.get('/api/arena/pair', async (req, res) => {
  if (shouldError(req)) return res.status(500).json({ error: 'Internal server error' })
  await delay(800, 1500)

  const promptId = req.query.prompt_id ? Number(req.query.prompt_id) : prompts[Math.floor(Math.random() * prompts.length)].id
  const prompt = prompts.find((p: any) => p.id === promptId) || prompts[0]

  let modelA: any, modelB: any
  if (req.query.model_a && req.query.model_b) {
    modelA = models.find((m: any) => m.id === req.query.model_a) || models[0]
    modelB = models.find((m: any) => m.id === req.query.model_b) || models[1]
  } else {
    const shuffled = [...models].sort(() => Math.random() - 0.5)
    modelA = shuffled[0]
    modelB = shuffled[1]
  }

  // Coin flip for A/B position
  if (Math.random() > 0.5) [modelA, modelB] = [modelB, modelA]

  const findResponse = (modelId: string) => {
    const match = responses.find((r: any) => r.prompt_id === prompt.id && r.model_id === modelId)
    return match?.content || `${modelId} đang phân tích câu hỏi "${prompt.text.slice(0, 30)}...".\n\nĐây là phản hồi mẫu từ model. Trong phiên bản chính thức, model sẽ tạo phản hồi thời gian thực dựa trên khả năng AI của mình.`
  }

  res.json({
    prompt,
    response_a: { id: ++responseIdCounter, prompt_id: prompt.id, model_id: modelA.id, content: findResponse(modelA.id), turn_number: 1 },
    response_b: { id: ++responseIdCounter, prompt_id: prompt.id, model_id: modelB.id, content: findResponse(modelB.id), turn_number: 1 },
    model_a: modelA,
    model_b: modelB,
  })
})

// GET /api/arena/response (direct mode)
app.get('/api/arena/response', async (req, res) => {
  if (shouldError(req)) return res.status(500).json({ error: 'Internal server error' })
  await delay(500, 1000)

  const modelId = req.query.model_id as string
  const promptId = Number(req.query.prompt_id)
  const model = models.find((m: any) => m.id === modelId) || models[0]
  const prompt = prompts.find((p: any) => p.id === promptId) || prompts[0]

  const match = responses.find((r: any) => r.prompt_id === prompt.id && r.model_id === model.id)
  const content = match?.content || `Phản hồi từ ${model.name} cho câu hỏi của bạn.\n\nĐây là phản hồi mẫu. Model sẽ tạo câu trả lời thực tế trong phiên bản chính thức.`

  res.json({
    response: { id: ++responseIdCounter, prompt_id: prompt.id, model_id: model.id, content, turn_number: 1 },
    model,
  })
})

// POST /api/arena/vote
app.post('/api/arena/vote', async (req, res) => {
  if (shouldError(req)) return res.status(500).json({ error: 'Internal server error' })

  const { mode, model_a_id, model_b_id, choice } = req.body
  const voteId = ++voteIdCounter

  if (mode === 'battle' && model_a_id && model_b_id) {
    const eloA = eloState.get(model_a_id) || 1300
    const eloB = eloState.get(model_b_id) || 1300
    const scoreA = choice === 'a' ? 1 : choice === 'b' ? 0 : 0.5
    const { deltaA, deltaB } = computeElo(eloA, eloB, scoreA)

    eloState.set(model_a_id, eloA + deltaA)
    eloState.set(model_b_id, eloB + deltaB)

    const mA = models.find((m: any) => m.id === model_a_id)
    const mB = models.find((m: any) => m.id === model_b_id)

    res.json({
      vote_id: voteId,
      elo_reveal: {
        model_a_name: mA?.name || model_a_id,
        model_a_org: mA?.org || '',
        model_a_elo: eloA + deltaA,
        model_a_delta: deltaA,
        model_b_name: mB?.name || model_b_id,
        model_b_org: mB?.org || '',
        model_b_elo: eloB + deltaB,
        model_b_delta: deltaB,
        choice,
      },
    })
  } else {
    res.json({ vote_id: voteId, elo_reveal: null })
  }
})

// GET /api/leaderboard/
app.get('/api/leaderboard/', async (req, res) => {
  if (shouldError(req)) return res.status(500).json({ error: 'Internal server error' })
  const license = req.query.license as string | undefined

  const rankings = models
    .map((m: any) => ({
      rank: 0,
      model_id: m.id, name: m.name, org: m.org, license: m.license, color: m.color,
      elo_rating: eloState.get(m.id) || m.elo_rating,
      ci: m.ci, win_rate: m.win_rate, total_votes: m.total_votes,
    }))
    .filter((m: any) => !license || license === 'all' || m.license === license)
    .sort((a: any, b: any) => b.elo_rating - a.elo_rating)
    .map((m: any, i: number) => ({ ...m, rank: i + 1 }))

  res.json(rankings)
})

// GET /api/leaderboard/stats/:type
app.get('/api/leaderboard/stats/:type', async (req, res) => {
  if (shouldError(req)) return res.status(500).json({ error: 'Internal server error' })

  const type = req.params.type
  if (type === 'win-fraction') return res.json(leaderboardData.win_fraction_matrix)
  if (type === 'battle-count') return res.json(leaderboardData.battle_count_matrix)
  if (type === 'avg-win-rate') return res.json(leaderboardData.avg_win_rate)
  res.status(404).json({ error: 'Unknown stat type' })
})

// GET /api/arena/history
app.get('/api/arena/history', async (req, res) => {
  if (shouldError(req)) return res.status(500).json({ error: 'Internal server error' })
  res.json([
    { id: 1, mode: 'battle', prompt_text: 'So sanh pho Ha Noi va pho Sai Gon', choice: 'a', model_a_name: 'GPT-5.4', model_b_name: 'DeepSeek R1', model_a_color: '#10a37f', model_b_color: '#4f8ef7', created_at: '2026-03-22T10:00:00' },
    { id: 2, mode: 'sbs', prompt_text: 'Khoang cach tu Nha hat lon toi Ho Guom', choice: 'b', model_a_name: 'Claude Sonnet', model_b_name: 'Gemini 3.1 Pro', model_a_color: '#d97706', model_b_color: '#4285f4', created_at: '2026-03-22T09:00:00' },
    { id: 3, mode: 'direct', prompt_text: 'Giai thich vi sao cau vong xuat hien', choice: '8', model_a_name: 'GPT-5 Mini', model_b_name: null, model_a_color: '#10a37f', model_b_color: null, created_at: '2026-03-21T15:00:00' },
  ])
})

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  if (shouldError(req)) return res.status(500).json({ error: 'Internal server error' })
  const { email, display_name } = req.body
  res.json({ user_id: 1, email, display_name: display_name || email.split('@')[0], token: 'mock-jwt-token-' + Date.now() })
})

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  if (shouldError(req)) return res.status(500).json({ error: 'Internal server error' })
  const { email } = req.body
  res.json({ user_id: 1, email, display_name: email.split('@')[0], token: 'mock-jwt-token-' + Date.now() })
})

// Start
const PORT = 3001
app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`)
  console.log(`  12 models, 10 prompts, ${responses.length} responses loaded`)
  console.log(`  Add ?simulate_error=true to any endpoint for error testing`)
})
```

- [ ] **Step 2: Verify server starts**

Run: `cd frontend && npx tsx mock/server.ts`
Expected: `Mock API server running on http://localhost:3001`

- [ ] **Step 3: Commit**

```bash
git add frontend/mock/server.ts
git commit -m "feat(mock): add Express mock server with all Arena + Leaderboard endpoints"
```

---

### Task 6: Update FE Model Handling for 12 Models

**Files:**
- Modify: `frontend/src/App.tsx:14-22` — update FALLBACK_MODELS to match 12 spec models
- Modify: `frontend/src/components/layout/ModeSelector.tsx:19-24` — update MODEL_AVATARS map

- [ ] **Step 1: Update FALLBACK_MODELS in App.tsx**

Replace the 7-model array with all 12 models from `models.json`, same structure.

- [ ] **Step 2: Update MODEL_AVATARS in ModeSelector.tsx**

Add avatar mappings for new models. Download missing model avatar PNGs from the web or use placeholder colored circles.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/layout/ModeSelector.tsx
git commit -m "feat: update fallback models to match 12-model spec"
```

---

### Task 7: End-to-End Smoke Test

**Files:** None (testing only)

- [ ] **Step 1: Start mock server + dev server**

Run: `cd frontend && npm run dev:mock`
Expected: Both servers start, no errors.

- [ ] **Step 2: Test Arena welcome**

Navigate to `http://localhost:5173`. Verify:
- Models dropdown shows 12 models
- Prompt cards visible

- [ ] **Step 3: Test Battle flow**

Click a prompt card. Verify:
- Loading delay (800-1500ms)
- Dual response panel with 2 model responses
- Vote bar appears
- Click a vote → Elo reveal with model names + deltas

- [ ] **Step 4: Test SBS flow**

Switch to SBS mode, select 2 models, submit prompt. Verify responses from selected models.

- [ ] **Step 5: Test Direct flow**

Switch to Direct mode, submit prompt. Verify single response + star rating.

- [ ] **Step 6: Test Leaderboard**

Click "Bảng xếp hạng". Verify:
- Table populated with 12 models
- Category tabs filter
- Win rate matrix renders
- Battle count matrix renders
- Average win rate bars render

- [ ] **Step 7: Test Error state**

Navigate to any endpoint with `?simulate_error=true` in the network (or temporarily modify a fetch URL). Verify ErrorResponsePanel renders.

- [ ] **Step 8: Test CTA modal**

Submit 4 prompts as guest. Verify CTA modal appears on 4th attempt.

- [ ] **Step 9: Commit README**

Create `frontend/mock/README.md` documenting how to run and what's mocked.

```bash
git add frontend/mock/README.md
git commit -m "docs(mock): add README for mock API server"
```
