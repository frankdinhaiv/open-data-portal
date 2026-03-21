export interface Model {
  id: string
  name: string
  org: string
  license: 'open' | 'prop'
  color: string
}

export interface Prompt {
  id: number
  text: string
  category: string
}

export interface Response {
  id: number
  prompt_id: number
  model_id: string
  content: string
  turn_number: number
}

export interface PairData {
  prompt: Prompt
  response_a: Response
  response_b: Response
  model_a: Model
  model_b: Model
}

export interface VoteCreate {
  mode: 'battle' | 'sbs' | 'direct'
  prompt_text: string
  prompt_id?: number
  model_a_id: string
  model_b_id?: string
  response_a_id?: number
  response_b_id?: number
  choice: string
  quality_tags?: string
  conversation_history?: string
  turn_number: number
}

export interface EloReveal {
  model_a_name: string
  model_a_org: string
  model_a_elo: number
  model_a_delta: number
  model_b_name: string
  model_b_org: string
  model_b_elo: number
  model_b_delta: number
}

export interface VoteResponse {
  vote_id: number
  elo_reveal: EloReveal | null
}

export interface LeaderboardEntry {
  rank: number
  model_id: string
  name: string
  org: string
  license: string
  color: string
  elo_rating: number
  ci: number
  win_rate: number
  total_votes: number
}

export interface ChatMessage {
  role: 'user' | 'system'
  content: string
  type?: 'text' | 'dual' | 'direct' | 'vote-result'
  responseA?: string
  responseB?: string
  modelA?: Model
  modelB?: Model
  pairData?: PairData
}

export interface HistoryEntry {
  id: number
  mode: string
  prompt_text: string
  choice: string
  model_a_name: string
  model_b_name: string | null
  model_a_color: string
  model_b_color: string | null
  created_at: string
}

export type ArenaMode = 'battle' | 'sbs' | 'direct'
export type ViewType = 'arena' | 'leaderboard'
export type VoteChoice = 'a' | 'b' | 'tie' | 'bad'
