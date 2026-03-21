const BASE = '/api'

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('arena_token')
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function fetchPrompts(category?: string) {
  const url = category ? `${BASE}/arena/prompts?category=${category}` : `${BASE}/arena/prompts`
  const res = await fetch(url)
  return res.json()
}

export async function fetchPair(promptId?: number, modelA?: string, modelB?: string) {
  const params = new URLSearchParams()
  if (promptId) params.set('prompt_id', String(promptId))
  if (modelA) params.set('model_a', modelA)
  if (modelB) params.set('model_b', modelB)
  const qs = params.toString()
  const url = qs ? `${BASE}/arena/pair?${qs}` : `${BASE}/arena/pair`
  const res = await fetch(url)
  return res.json()
}

export async function fetchResponse(modelId: string, promptId: number) {
  const res = await fetch(`${BASE}/arena/response?model_id=${modelId}&prompt_id=${promptId}`)
  return res.json()
}

export async function fetchModels() {
  const res = await fetch(`${BASE}/arena/models`)
  return res.json()
}

export async function submitVote(vote: Record<string, unknown>, sessionId?: string) {
  const url = sessionId ? `${BASE}/arena/vote?session_id=${sessionId}` : `${BASE}/arena/vote`
  const res = await fetch(url, { method: 'POST', headers: getHeaders(), body: JSON.stringify(vote) })
  return res.json()
}

export async function fetchLeaderboard(license?: string) {
  const url = license && license !== 'all' ? `${BASE}/leaderboard/?license=${license}` : `${BASE}/leaderboard/`
  const res = await fetch(url)
  return res.json()
}

export async function fetchStats(statType: string) {
  const res = await fetch(`${BASE}/leaderboard/stats/${statType}`)
  return res.json()
}

export async function fetchHistory(userId: number) {
  const res = await fetch(`${BASE}/arena/history?user_id=${userId}`)
  return res.json()
}

export async function register(email: string, password: string, displayName?: string) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name: displayName }),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Registration failed')
  return res.json()
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Login failed')
  return res.json()
}
