/**
 * API Client — conversation-based endpoints matching backend/app/routers/*.
 *
 * Backend endpoints:
 *   GET  /api/models                          → model list
 *   GET  /api/prompts                         → seed prompts
 *   POST /api/conversations                   → create conversation (triggers LLM)
 *   GET  /api/conversations/{id}/responses     → poll for responses
 *   GET  /api/conversations/{id}/stream        → SSE streaming
 *   POST /api/conversations/{id}/turns         → multi-turn follow-up
 *   POST /api/conversations/{id}/votes         → submit pairwise vote
 *   POST /api/conversations/{id}/ratings       → submit direct rating
 *   GET  /api/leaderboard                     → Elo rankings
 *   GET  /api/leaderboard/pairwise            → head-to-head stats
 *   POST /api/auth/signup                     → register
 *   POST /api/auth/login                      → login
 *   GET  /api/auth/me                         → user profile
 *   GET  /api/users/me/history                → conversation history
 */

import type {
  ConversationCreateResponse,
  ResponseItem,
  VoteResponse,
  DirectRatingResponse,
  StreamChunk,
} from '../types'

const BASE = '/api'

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('arena_token')
  if (token) headers['Authorization'] = `Bearer ${token}`
  // Guest session from localStorage
  const guestSession = localStorage.getItem('arena_session')
  if (guestSession) headers['X-Guest-Session'] = guestSession
  return headers
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export async function fetchModels() {
  const res = await fetch(`${BASE}/models`)
  const data = await handleResponse<{ models: Array<Record<string, unknown>> }>(res)
  return data.models
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

export async function fetchPrompts(category?: string) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  params.set('limit', '3')
  const qs = params.toString()
  const res = await fetch(`${BASE}/prompts?${qs}`)
  const data = await handleResponse<{ prompts: Array<{ id: number; text: string; category: string }> }>(res)
  return data.prompts
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

/**
 * Create a new conversation — triggers LLM API calls on the backend.
 * Returns immediately with conversation_id; poll /responses or /stream for content.
 */
export async function createConversation(
  mode: 'battle' | 'sbs' | 'direct',
  prompt: string,
  opts?: { model_a?: string; model_b?: string; model_id?: string },
): Promise<ConversationCreateResponse> {
  const res = await fetch(`${BASE}/conversations`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      mode,
      prompt,
      model_a: opts?.model_a || null,
      model_b: opts?.model_b || null,
      model_id: opts?.model_id || null,
    }),
  })
  return handleResponse<ConversationCreateResponse>(res)
}

/**
 * Poll for responses on a conversation turn.
 * Returns responses once LLM generation completes, or empty array if still generating.
 */
export async function fetchResponses(
  conversationId: string,
  turnNumber?: number,
): Promise<ResponseItem[]> {
  const params = turnNumber ? `?turn_number=${turnNumber}` : ''
  const res = await fetch(`${BASE}/conversations/${conversationId}/responses${params}`, {
    headers: getHeaders(),
  })
  const data = await handleResponse<{ responses: ResponseItem[] }>(res)
  return data.responses
}

/**
 * Poll for responses with retry — waits for LLM generation to complete.
 * Retries every intervalMs until responses arrive or maxWaitMs is exceeded.
 */
export async function pollResponses(
  conversationId: string,
  turnNumber?: number,
  maxWaitMs = 35000,
  intervalMs = 1000,
): Promise<ResponseItem[]> {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const responses = await fetchResponses(conversationId, turnNumber)
    if (responses.length > 0 && responses.every(r => r.content)) {
      return responses
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  throw new Error('LLM response timeout — try again')
}

/**
 * Subscribe to SSE streaming for a conversation.
 * Calls onChunk for each chunk, onDone when complete.
 */
export function streamResponses(
  conversationId: string,
  onChunk: (chunk: StreamChunk) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): () => void {
  const headers = getHeaders()
  const url = `${BASE}/conversations/${conversationId}/stream`

  const eventSource = new EventSource(url)

  eventSource.onmessage = (event) => {
    try {
      const chunk: StreamChunk = JSON.parse(event.data)
      onChunk(chunk)
      if (chunk.done) {
        eventSource.close()
        onDone()
      }
    } catch {
      // ignore parse errors
    }
  }

  eventSource.onerror = () => {
    eventSource.close()
    onError(new Error('Stream disconnected'))
  }

  // Return cleanup function
  return () => eventSource.close()
}

/**
 * Append a multi-turn follow-up to an existing conversation.
 */
export async function appendTurn(
  conversationId: string,
  prompt: string,
): Promise<{ turn_number: number }> {
  const res = await fetch(`${BASE}/conversations/${conversationId}/turns`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ prompt }),
  })
  return handleResponse<{ turn_number: number }>(res)
}

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

/**
 * Submit a pairwise vote (battle or SBS mode).
 * Returns model identities + Elo reveal data.
 */
export async function submitVote(
  conversationId: string,
  choice: 'model_a' | 'model_b' | 'tie' | 'both_bad',
  turnNumber = 1,
): Promise<VoteResponse> {
  const res = await fetch(`${BASE}/conversations/${conversationId}/votes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ choice, turn_number: turnNumber }),
  })
  return handleResponse<VoteResponse>(res)
}

/**
 * Submit a direct rating (direct chat mode).
 */
export async function submitRating(
  conversationId: string,
  rating: number,
  turnNumber = 1,
): Promise<DirectRatingResponse> {
  const res = await fetch(`${BASE}/conversations/${conversationId}/ratings`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ rating, turn_number: turnNumber }),
  })
  return handleResponse<DirectRatingResponse>(res)
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export async function fetchLeaderboard(category?: string) {
  const params = category && category !== 'all' ? `?category=${category}` : ''
  const res = await fetch(`${BASE}/leaderboard${params}`)
  return handleResponse<{ entries: Array<Record<string, unknown>>; total_votes: number }>(res)
}

export async function fetchPairwiseStats() {
  const res = await fetch(`${BASE}/leaderboard/pairwise`)
  return handleResponse<{ stats: Array<Record<string, unknown>> }>(res)
}

/**
 * Legacy: fetchStats — used by StatCharts for win-fraction, battle-count, avg-win-rate.
 * Maps to the pairwise endpoint or leaderboard depending on stat type.
 */
export async function fetchStats(statType: string) {
  if (statType === 'win-fraction' || statType === 'battle-count') {
    const data = await fetchPairwiseStats()
    return data.stats
  }
  if (statType === 'avg-win-rate') {
    const data = await fetchLeaderboard()
    return data.entries
  }
  return []
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function register(
  username: string,
  email: string,
  password: string,
  guestSessionId?: string,
) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email,
      password,
      guest_session_id: guestSessionId || localStorage.getItem('arena_session'),
    }),
  })
  return handleResponse<{ access_token: string; user_id: string; username: string }>(res)
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handleResponse<{ access_token: string; user_id: string; username: string }>(res)
}

export async function fetchProfile() {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: getHeaders(),
  })
  return handleResponse<{ user_id: string; username: string; email: string; total_votes: number }>(res)
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export async function fetchHistory(page = 1, perPage = 20) {
  const res = await fetch(`${BASE}/users/me/history?page=${page}&per_page=${perPage}`, {
    headers: getHeaders(),
  })
  return handleResponse<{ conversations: Array<Record<string, unknown>>; total: number }>(res)
}

// ---------------------------------------------------------------------------
// Legacy wrappers — backward compatibility for existing components
// ---------------------------------------------------------------------------

/**
 * Legacy: fetchPair — creates a conversation and polls for responses.
 * Used by ArenaPage until it's refactored to use the conversation flow directly.
 */
export async function fetchPair(
  promptId?: number,
  modelA?: string,
  modelB?: string,
): Promise<Record<string, unknown>> {
  // Get a prompt to use
  const prompts = await fetchPrompts()
  const prompt = prompts.find(p => p.id === promptId) || prompts[0]
  if (!prompt) return { error: 'No prompts available' }

  // Create conversation
  const mode = (modelA && modelB) ? 'sbs' : 'battle'
  const conv = await createConversation(mode, prompt.text, {
    model_a: modelA,
    model_b: modelB,
  })

  // Poll for responses
  const responses = await pollResponses(conv.conversation_id)

  const respA = responses.find(r => r.position === 'a')
  const respB = responses.find(r => r.position === 'b')

  return {
    conversation_id: conv.conversation_id,
    prompt: { id: prompt.id, text: prompt.text, category: prompt.category },
    response_a: respA || { content: '', model_id: conv.model_a },
    response_b: respB || { content: '', model_id: conv.model_b },
    model_a: { id: conv.model_a, name: respA?.model_display_name || conv.model_a },
    model_b: { id: conv.model_b, name: respB?.model_display_name || conv.model_b },
  }
}

/**
 * Legacy: fetchResponse — creates a direct conversation and polls for response.
 */
export async function fetchResponse(
  modelId: string,
  promptId: number,
): Promise<Record<string, unknown>> {
  const prompts = await fetchPrompts()
  const prompt = prompts.find(p => p.id === promptId) || prompts[0]
  if (!prompt) return { error: 'No prompts available' }

  const conv = await createConversation('direct', prompt.text, { model_id: modelId })
  const responses = await pollResponses(conv.conversation_id)

  const resp = responses.find(r => r.position === 'single') || responses[0]

  return {
    conversation_id: conv.conversation_id,
    response: resp || { content: '', model_id: modelId },
    model: { id: modelId, name: resp?.model_display_name || modelId },
  }
}
