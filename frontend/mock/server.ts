import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES = join(__dirname, 'fixtures');

// ─── Load fixtures ───────────────────────────────────────────────────────────

const modelsFixture: ModelRecord[] = JSON.parse(readFileSync(join(FIXTURES, 'models.json'), 'utf-8'));
const promptsFixture: Prompt[] = JSON.parse(readFileSync(join(FIXTURES, 'prompts.json'), 'utf-8'));
const responsesFixture: ResponseRecord[] = JSON.parse(readFileSync(join(FIXTURES, 'responses.json'), 'utf-8'));
const leaderboardFixture = JSON.parse(readFileSync(join(FIXTURES, 'leaderboard.json'), 'utf-8'));

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModelRecord {
  id: string;
  name: string;
  org: string;
  license: 'open' | 'prop';
  color: string;
  elo_rating: number;
  ci: number;
  win_rate: number;
  total_votes: number;
}

interface Prompt {
  id: number;
  text: string;
  category: string;
}

interface ResponseRecord {
  prompt_id: number;
  model_id: string;
  content: string;
}

interface EloState {
  [modelId: string]: number;
}

// ─── In-memory state ─────────────────────────────────────────────────────────

const eloState: EloState = {};
for (const m of modelsFixture) {
  eloState[m.id] = m.elo_rating;
}

let voteCounter = 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomDelay(min: number, max: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min)) + min));
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function computeElo(ratingA: number, ratingB: number, winner: 'a' | 'b' | 'tie', K = 32) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  const scoreA = winner === 'a' ? 1 : winner === 'tie' ? 0.5 : 0;
  const scoreB = 1 - scoreA;
  const newA = ratingA + K * (scoreA - expectedA);
  const newB = ratingB + K * (scoreB - expectedB);
  return {
    newA: Math.round(newA),
    newB: Math.round(newB),
    deltaA: Math.round(newA - ratingA),
    deltaB: Math.round(newB - ratingB),
  };
}

function findResponse(promptId: number, modelId: string): ResponseRecord | null {
  return responsesFixture.find(r => r.prompt_id === promptId && r.model_id === modelId) ?? null;
}

function findAnyResponse(promptId: number, modelId: string, excludeModelId?: string): ResponseRecord | null {
  // Try exact match first
  const exact = findResponse(promptId, modelId);
  if (exact) return exact;
  // Fall back to any response for this prompt
  const any = responsesFixture.find(r => r.prompt_id === promptId && r.model_id !== excludeModelId);
  return any ?? null;
}

function getModel(id: string): ModelRecord | undefined {
  return modelsFixture.find(m => m.id === id);
}

// ─── Server ──────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// CORS for local dev
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (_req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// Simulate error middleware
function checkSimulateError(req: express.Request, res: express.Response): boolean {
  if (req.query['simulate_error'] === 'true') {
    res.status(500).json({ error: 'Simulated server error', code: 'SIMULATED_ERROR' });
    return true;
  }
  return false;
}

// ─── 1. GET /api/arena/models ─────────────────────────────────────────────────

app.get('/api/arena/models', async (req, res) => {
  if (checkSimulateError(req, res)) return;
  const models = modelsFixture.map(m => ({
    id: m.id,
    name: m.name,
    org: m.org,
    license: m.license,
    color: m.color,
  }));
  res.json(models);
});

// ─── 2. GET /api/arena/prompts ────────────────────────────────────────────────

app.get('/api/arena/prompts', async (req, res) => {
  if (checkSimulateError(req, res)) return;
  const category = req.query['category'] as string | undefined;
  let result = promptsFixture;
  if (category) {
    result = promptsFixture.filter(p => p.category === category);
  }
  res.json(result);
});

// ─── 3. GET /api/arena/pair ───────────────────────────────────────────────────

app.get('/api/arena/pair', async (req, res) => {
  if (checkSimulateError(req, res)) return;
  await randomDelay(800, 1500);

  const modelAId = req.query['model_a'] as string | undefined;
  const modelBId = req.query['model_b'] as string | undefined;
  const promptIdParam = req.query['prompt_id'] as string | undefined;

  // Pick models
  let modelA: ModelRecord;
  let modelB: ModelRecord;

  if (modelAId && modelBId) {
    const ma = getModel(modelAId);
    const mb = getModel(modelBId);
    if (!ma || !mb) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }
    modelA = ma;
    modelB = mb;
  } else {
    const shuffled = [...modelsFixture].sort(() => Math.random() - 0.5);
    modelA = shuffled[0];
    modelB = shuffled[1];
  }

  // Pick prompt
  const prompt: Prompt = promptIdParam
    ? (promptsFixture.find(p => p.id === Number(promptIdParam)) ?? randomFrom(promptsFixture))
    : randomFrom(promptsFixture);

  // Coin-flip A/B position
  const flip = Math.random() > 0.5;
  const displayA = flip ? modelA : modelB;
  const displayB = flip ? modelB : modelA;

  // Find responses
  const rawA = findAnyResponse(prompt.id, displayA.id, displayB.id);
  const rawB = findAnyResponse(prompt.id, displayB.id, displayA.id);

  const responseA = rawA ?? {
    prompt_id: prompt.id,
    model_id: displayA.id,
    content: `[Phản hồi mẫu từ ${displayA.name} cho câu hỏi số ${prompt.id}]`,
  };
  const responseB = rawB ?? {
    prompt_id: prompt.id,
    model_id: displayB.id,
    content: `[Phản hồi mẫu từ ${displayB.name} cho câu hỏi số ${prompt.id}]`,
  };

  res.json({
    prompt,
    response_a: { id: 1, prompt_id: prompt.id, model_id: displayA.id, content: responseA.content, turn_number: 1 },
    response_b: { id: 2, prompt_id: prompt.id, model_id: displayB.id, content: responseB.content, turn_number: 1 },
    model_a: { id: displayA.id, name: displayA.name, org: displayA.org, license: displayA.license, color: displayA.color },
    model_b: { id: displayB.id, name: displayB.name, org: displayB.org, license: displayB.license, color: displayB.color },
  });
});

// ─── 4. GET /api/arena/response ───────────────────────────────────────────────

app.get('/api/arena/response', async (req, res) => {
  if (checkSimulateError(req, res)) return;
  await randomDelay(500, 1000);

  const modelId = req.query['model_id'] as string | undefined;
  const promptIdParam = req.query['prompt_id'] as string | undefined;

  if (!modelId || !promptIdParam) {
    res.status(400).json({ error: 'model_id and prompt_id are required' });
    return;
  }

  const promptId = Number(promptIdParam);
  const model = getModel(modelId);
  if (!model) {
    res.status(404).json({ error: 'Model not found' });
    return;
  }

  const found = findResponse(promptId, modelId);
  const content = found
    ? found.content
    : `[Phản hồi mẫu từ ${model.name} cho câu hỏi số ${promptId}]`;

  res.json({
    response: {
      id: Math.floor(Math.random() * 10000),
      prompt_id: promptId,
      model_id: modelId,
      content,
      turn_number: 1,
    },
    model,
  });
});

// ─── 5. POST /api/arena/vote ──────────────────────────────────────────────────

app.post('/api/arena/vote', async (req, res) => {
  if (checkSimulateError(req, res)) return;

  const { model_a_id, model_b_id, choice, mode } = req.body as {
    model_a_id: string;
    model_b_id: string;
    choice: string;
    mode?: string;
  };

  if (!model_a_id || !model_b_id || !choice) {
    res.status(400).json({ error: 'model_a_id, model_b_id, and choice are required' });
    return;
  }

  // Map FE choice values to Elo winner
  const winner = choice === 'a' ? 'a' : choice === 'b' ? 'b' : 'tie' as 'a' | 'b' | 'tie';
  const ratingA = eloState[model_a_id] ?? 1300;
  const ratingB = eloState[model_b_id] ?? 1300;
  const { newA, newB, deltaA, deltaB } = computeElo(ratingA, ratingB, winner);

  eloState[model_a_id] = newA;
  eloState[model_b_id] = newB;

  const voteId = ++voteCounter;

  const modelA = getModel(model_a_id);
  const modelB = getModel(model_b_id);

  // Only return elo_reveal in battle mode
  const isBattleMode = mode === 'battle';
  const eloReveal = isBattleMode ? {
    model_a_name: modelA?.name ?? model_a_id,
    model_a_org: modelA?.org ?? '',
    model_a_elo: newA,
    model_a_delta: deltaA,
    model_b_name: modelB?.name ?? model_b_id,
    model_b_org: modelB?.org ?? '',
    model_b_elo: newB,
    model_b_delta: deltaB,
  } : null;

  res.json({ vote_id: voteId, elo_reveal: eloReveal });
});

// ─── 6. GET /api/leaderboard/ ─────────────────────────────────────────────────

app.get('/api/leaderboard/', async (req, res) => {
  if (checkSimulateError(req, res)) return;
  const license = req.query['license'] as string | undefined;

  let rankings = leaderboardFixture.rankings.map((entry: ModelRecord & { rank: number }) => ({
    ...entry,
    elo_rating: eloState[entry.model_id] ?? entry.elo_rating,
  }));

  // Re-sort by current elo
  rankings.sort((a: ModelRecord & { rank: number }, b: ModelRecord & { rank: number }) => b.elo_rating - a.elo_rating);
  rankings = rankings.map((entry: ModelRecord & { rank: number }, idx: number) => ({ ...entry, rank: idx + 1 }));

  if (license) {
    rankings = rankings.filter((e: ModelRecord & { rank: number }) => e.license === license);
  }

  res.json(rankings);
});

// ─── 7. GET /api/leaderboard/stats/:type ─────────────────────────────────────

app.get('/api/leaderboard/stats/:type', async (req, res) => {
  if (checkSimulateError(req, res)) return;
  const { type } = req.params;

  // Map model IDs to short display names for matrix labels
  const idToName: Record<string, string> = {};
  for (const m of modelsFixture) {
    idToName[m.id] = m.name;
  }

  if (type === 'win-fraction') {
    const wf = leaderboardFixture.win_fraction_matrix;
    res.json({ models: wf.models.map((id: string) => idToName[id] || id), matrix: wf.data });
  } else if (type === 'battle-count') {
    const bc = leaderboardFixture.battle_count_matrix;
    res.json({ models: bc.models.map((id: string) => idToName[id] || id), matrix: bc.data });
  } else if (type === 'avg-win-rate') {
    // Transform to match FE expected shape: { model, avg_win_rate, color }
    const transformed = leaderboardFixture.avg_win_rate.map((item: { model_id: string; name: string; color: string; win_rate: number }) => ({
      model: item.name,
      avg_win_rate: item.win_rate,
      color: item.color,
    }));
    res.json(transformed);
  } else {
    res.status(404).json({ error: `Unknown stat type: ${type}. Valid: win-fraction, battle-count, avg-win-rate` });
  }
});

// ─── 8. GET /api/arena/history ────────────────────────────────────────────────

app.get('/api/arena/history', async (req, res) => {
  if (checkSimulateError(req, res)) return;

  const history = [
    {
      id: 1,
      mode: 'battle',
      prompt_text: 'Viết một đoạn thơ ngắn theo phong cách lục bát về tình yêu quê hương.',
      choice: 'a',
      model_a_name: 'GPT-5.4',
      model_b_name: 'Claude Sonnet',
      model_a_color: '#10a37f',
      model_b_color: '#d97706',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 2,
      mode: 'battle',
      prompt_text: 'Giải thích vì sao cầu vồng thường xuất hiện sau cơn mưa.',
      choice: 'b',
      model_a_name: 'DeepSeek R1',
      model_b_name: 'Gemini 3.1 Pro',
      model_a_color: '#4f8ef7',
      model_b_color: '#4285f4',
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 3,
      mode: 'direct',
      prompt_text: 'Tóm tắt tác phẩm Truyện Kiều của Nguyễn Du.',
      choice: 'good',
      model_a_name: 'Claude Sonnet',
      model_b_name: null,
      model_a_color: '#d97706',
      model_b_color: null,
      created_at: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: 4,
      mode: 'battle',
      prompt_text: 'Viết hàm Python sắp xếp danh sách bằng merge sort với type hints.',
      choice: 'tie',
      model_a_name: 'GPT-5 Mini',
      model_b_name: 'Grok 3 Fast',
      model_a_color: '#10a37f',
      model_b_color: '#1d9bf0',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 5,
      mode: 'battle',
      prompt_text: 'So sánh async/await và Promise trong JavaScript.',
      choice: 'a',
      model_a_name: 'Gemini 2.5 Flash',
      model_b_name: 'Llama 3 70B',
      model_a_color: '#4285f4',
      model_b_color: '#0668e1',
      created_at: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  res.json(history);
});

// ─── 9. POST /api/auth/register ──────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  if (checkSimulateError(req, res)) return;
  const { email } = req.body as { email?: string };
  const token = `mock-jwt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  res.status(201).json({ user_id: 1, email: email ?? 'user@example.com', token });
});

// ─── 10. POST /api/auth/login ─────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  if (checkSimulateError(req, res)) return;
  const { email } = req.body as { email?: string };
  const token = `mock-jwt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  res.json({ user_id: 1, email: email ?? 'user@example.com', token });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`[mock] Server running at http://localhost:${PORT}`);
  console.log(`[mock] Endpoints:`);
  console.log(`  GET  /api/arena/models`);
  console.log(`  GET  /api/arena/prompts[?category=]`);
  console.log(`  GET  /api/arena/pair[?model_a=&model_b=&prompt_id=]`);
  console.log(`  GET  /api/arena/response?model_id=&prompt_id=`);
  console.log(`  POST /api/arena/vote`);
  console.log(`  GET  /api/leaderboard/[?license=]`);
  console.log(`  GET  /api/leaderboard/stats/:type`);
  console.log(`  GET  /api/arena/history`);
  console.log(`  POST /api/auth/register`);
  console.log(`  POST /api/auth/login`);
  console.log(`[mock] Add ?simulate_error=true to any endpoint to get a 500`);
});
