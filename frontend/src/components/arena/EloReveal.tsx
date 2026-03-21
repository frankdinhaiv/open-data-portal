import { useStore } from '../../hooks/useStore'

export function EloReveal() {
  const { eloRevealData, clearMessages, resetTurn } = useStore()
  if (!eloRevealData) return null

  const data = eloRevealData as {
    model_a_name: string; model_a_org: string; model_a_elo: number; model_a_delta: number
    model_b_name: string; model_b_org: string; model_b_elo: number; model_b_delta: number
    choice: string
  }

  function handleNewBattle() {
    clearMessages()
    resetTurn()
  }

  return (
    <div className="px-6 py-4 bg-[var(--bg-card)] border-t border-[var(--border)] animate-scale-in shrink-0">
      <div className="flex items-center justify-center gap-8 py-3 max-md:flex-col max-md:gap-4">
        <div className="text-center">
          <div className="text-sm font-bold">{data.model_a_name}</div>
          <div className="text-[0.7rem] text-[var(--text-muted)]">{data.model_a_org}</div>
          <div className="text-xl font-extrabold mt-1 text-[var(--accent)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(data.model_a_elo)}
          </div>
          <div className={`text-xs font-semibold mt-0.5 ${data.model_a_delta >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
            {data.model_a_delta >= 0 ? '+' : ''}{data.model_a_delta}
          </div>
          {data.choice === 'a' && (
            <div className="text-xs text-[var(--gold)] font-bold mt-1">🏆 Chiến thắng</div>
          )}
        </div>

        <div className="text-xs font-bold text-[var(--text-dim)] uppercase">VS</div>

        <div className="text-center">
          <div className="text-sm font-bold">{data.model_b_name}</div>
          <div className="text-[0.7rem] text-[var(--text-muted)]">{data.model_b_org}</div>
          <div className="text-xl font-extrabold mt-1 text-[var(--orange)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(data.model_b_elo)}
          </div>
          <div className={`text-xs font-semibold mt-0.5 ${data.model_b_delta >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
            {data.model_b_delta >= 0 ? '+' : ''}{data.model_b_delta}
          </div>
          {data.choice === 'b' && (
            <div className="text-xs text-[var(--gold)] font-bold mt-1">🏆 Chiến thắng</div>
          )}
        </div>
      </div>

      <div className="flex justify-center mt-3">
        <button
          onClick={handleNewBattle}
          className="px-6 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--accent-hover)] hover:shadow-lg transition-all"
        >
          ⚔️ Trận mới
        </button>
      </div>
    </div>
  )
}
