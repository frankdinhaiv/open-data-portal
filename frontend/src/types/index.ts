export interface Model {
  id: string
  name: string
  provider: string
  display_name: string
  // Legacy fields for backward compat with existing components
  org: string
  license: 'open' | 'prop'
  color: string
}

export interface Prompt {
  id: number
  text: string
  category: string
}

export interface ResponseItem {
  model_id: string
  model_display_name: string
  position: 'a' | 'b' | 'single'
  content: string
  latency_ms: number | null
  token_count: number | null
  turn_number: number
}

/** Legacy pair structure — adapted from conversation responses */
export interface PairData {
  conversation_id: string
  prompt: Prompt
  response_a: ResponseItem
  response_b: ResponseItem
  model_a: Model
  model_b: Model
}

export interface EloReveal {
  model_a: string
  model_a_display_name: string
  model_b: string
  model_b_display_name: string
  elo_change_a: number | null
  elo_change_b: number | null
}

export interface VoteResponse {
  conversation_id: string
  choice: string
  model_a: string
  model_a_display_name: string
  model_b: string
  model_b_display_name: string
  elo_change_a: number | null
  elo_change_b: number | null
}

export interface DirectRatingResponse {
  conversation_id: string
  model_id: string
  rating: number
}

export interface LeaderboardEntry {
  rank: number
  model_id: string
  display_name: string
  provider: string
  elo_rating: number
  total_battles: number
  win_rate: number
  ci_lower: number | null
  ci_upper: number | null
  // Legacy fields used by LeaderboardTable
  name: string
  org: string
  license: string
  color: string
  ci: number
  total_votes: number
}

export interface PairwiseStat {
  model_a: string
  model_b: string
  wins_a: number
  wins_b: number
  ties: number
  total: number
  win_rate_a: number
}

export interface HistoryEntry {
  conversation_id: string
  mode: string
  first_prompt: string
  model_a: string | null
  model_b: string | null
  model_id: string | null
  voted: boolean
  created_at: string
  // Legacy fields
  id: number
  prompt_text: string
}

export interface ChatMessage {
  id?: number
  role: 'user' | 'system' | 'dual' | 'direct'
  content: string
  type?: 'text' | 'dual' | 'direct' | 'vote-result'
  responseA?: string
  responseB?: string
  modelA?: Model
  modelB?: Model
  pairData?: PairData
  voteResult?: string | null
  streaming?: boolean
}

export interface ConversationCreateResponse {
  conversation_id: string
  mode: string
  model_a: string | null
  model_b: string | null
  model_id: string | null
}

export interface StreamChunk {
  position: 'a' | 'b' | 'single'
  content: string
  done: boolean
  error: string | null
}

export interface EloSnapshot {
  model_id: string
  elo_rating: number
  total_battles: number
  snapshot_at: string
}

export type ArenaMode = 'battle' | 'sbs' | 'direct'
export type ViewType = 'arena' | 'leaderboard'
export type VoteChoice = 'model_a' | 'model_b' | 'tie' | 'both_bad'
