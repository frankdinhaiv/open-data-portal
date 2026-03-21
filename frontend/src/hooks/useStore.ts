import { create } from 'zustand'
import type { ArenaMode, ViewType, ChatMessage, PairData, Model, LeaderboardEntry } from '../types'

function getSessionId(): string {
  let sid = localStorage.getItem('arena_session')
  if (!sid) {
    sid = crypto.randomUUID()
    localStorage.setItem('arena_session', sid)
  }
  return sid
}

interface AppState {
  // View
  view: ViewType
  setView: (v: ViewType) => void

  // Arena
  mode: ArenaMode
  setMode: (m: ArenaMode) => void
  messages: ChatMessage[]
  addMessage: (msg: ChatMessage) => void
  clearMessages: () => void
  turnCount: number
  incrementTurn: () => void
  resetTurn: () => void
  currentPair: PairData | null
  setCurrentPair: (p: PairData | null) => void
  totalVotes: number
  incrementVotes: () => void
  showVoteBar: boolean
  setShowVoteBar: (v: boolean) => void
  showEloReveal: boolean
  setShowEloReveal: (v: boolean) => void
  eloRevealData: Record<string, unknown> | null
  setEloRevealData: (d: Record<string, unknown> | null) => void
  isLoading: boolean
  setIsLoading: (v: boolean) => void

  // Auth
  isLoggedIn: boolean
  userId: number | null
  userEmail: string | null
  displayName: string | null
  guestBattles: number
  sessionId: string
  showAuthModal: boolean
  setShowAuthModal: (v: boolean) => void
  loginUser: (userId: number, email: string, displayName: string | null, token: string) => void
  logoutUser: () => void
  incrementGuestBattles: () => void

  // Leaderboard
  leaderboard: LeaderboardEntry[]
  setLeaderboard: (data: LeaderboardEntry[]) => void
  licenseFilter: string
  setLicenseFilter: (f: string) => void

  // Models (for SBS/Direct dropdowns)
  models: Model[]
  setModels: (m: Model[]) => void
  selectedModelA: string
  selectedModelB: string
  selectedModelDirect: string
  setSelectedModelA: (id: string) => void
  setSelectedModelB: (id: string) => void
  setSelectedModelDirect: (id: string) => void
}

export const useStore = create<AppState>((set) => ({
  view: 'arena',
  setView: (v) => set({ view: v }),

  mode: 'battle',
  setMode: (m) => set({ mode: m }),
  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [], showVoteBar: false, showEloReveal: false, eloRevealData: null }),
  turnCount: 0,
  incrementTurn: () => set((s) => ({ turnCount: s.turnCount + 1 })),
  resetTurn: () => set({ turnCount: 0 }),
  currentPair: null,
  setCurrentPair: (p) => set({ currentPair: p }),
  totalVotes: 0,
  incrementVotes: () => set((s) => ({ totalVotes: s.totalVotes + 1 })),
  showVoteBar: false,
  setShowVoteBar: (v) => set({ showVoteBar: v }),
  showEloReveal: false,
  setShowEloReveal: (v) => set({ showEloReveal: v }),
  eloRevealData: null,
  setEloRevealData: (d) => set({ eloRevealData: d }),
  isLoading: false,
  setIsLoading: (v) => set({ isLoading: v }),

  isLoggedIn: !!localStorage.getItem('arena_token'),
  userId: localStorage.getItem('arena_user_id') ? Number(localStorage.getItem('arena_user_id')) : null,
  userEmail: localStorage.getItem('arena_email'),
  displayName: localStorage.getItem('arena_name'),
  guestBattles: 0,
  sessionId: getSessionId(),
  showAuthModal: false,
  setShowAuthModal: (v) => set({ showAuthModal: v }),
  loginUser: (userId, email, displayName, token) => {
    localStorage.setItem('arena_token', token)
    localStorage.setItem('arena_user_id', String(userId))
    localStorage.setItem('arena_email', email)
    if (displayName) localStorage.setItem('arena_name', displayName)
    set({ isLoggedIn: true, userId, userEmail: email, displayName })
  },
  logoutUser: () => {
    localStorage.removeItem('arena_token')
    localStorage.removeItem('arena_user_id')
    localStorage.removeItem('arena_email')
    localStorage.removeItem('arena_name')
    set({ isLoggedIn: false, userId: null, userEmail: null, displayName: null })
  },
  incrementGuestBattles: () => set((s) => ({ guestBattles: s.guestBattles + 1 })),

  leaderboard: [],
  setLeaderboard: (data) => set({ leaderboard: data }),
  licenseFilter: 'all',
  setLicenseFilter: (f) => set({ licenseFilter: f }),

  models: [],
  setModels: (m) => set({ models: m }),
  selectedModelA: '',
  selectedModelB: '',
  selectedModelDirect: '',
  setSelectedModelA: (id) => set({ selectedModelA: id }),
  setSelectedModelB: (id) => set({ selectedModelB: id }),
  setSelectedModelDirect: (id) => set({ selectedModelDirect: id }),
}))
