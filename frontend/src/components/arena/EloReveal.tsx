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
    <div className="py-4 animate-scale-in shrink-0">
      <div className="flex items-center justify-center gap-8 py-3">
        <div className="text-center">
          <div className="text-sm font-bold text-white">{data.model_a_name}</div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{data.model_a_org}</div>
          <div className="text-xl font-extrabold mt-1 text-[#B2CCFF]" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(data.model_a_elo)}
          </div>
          <div className={`text-xs font-semibold mt-0.5 ${data.model_a_delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.model_a_delta >= 0 ? '+' : ''}{data.model_a_delta}
          </div>
          {data.choice === 'a' && (
            <div className="text-xs text-[#FFB200] font-bold mt-1">Chiến thắng</div>
          )}
        </div>

        <div className="text-xs font-bold uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>VS</div>

        <div className="text-center">
          <div className="text-sm font-bold text-white">{data.model_b_name}</div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{data.model_b_org}</div>
          <div className="text-xl font-extrabold mt-1 text-[#FFB200]" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(data.model_b_elo)}
          </div>
          <div className={`text-xs font-semibold mt-0.5 ${data.model_b_delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.model_b_delta >= 0 ? '+' : ''}{data.model_b_delta}
          </div>
          {data.choice === 'b' && (
            <div className="text-xs text-[#FFB200] font-bold mt-1">Chiến thắng</div>
          )}
        </div>
      </div>

      <div className="flex justify-center mt-3">
        <button
          onClick={handleNewBattle}
          className="px-6 py-2 rounded-lg text-sm font-semibold text-white border border-white bg-transparent cursor-pointer hover:bg-white/10 transition-all"
        >
          Trận mới
        </button>
      </div>
    </div>
  )
}
