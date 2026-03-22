import type { Model, VoteChoice } from '../../types'
import { ResponsePanel } from './ResponsePanel'
import type { PanelVisualState } from './ResponsePanel'

interface Props {
  responseA: string
  responseB: string
  modelA: Model
  modelB: Model
  isBattle: boolean
  /** The final vote result (after voting) */
  voteResult?: VoteChoice | null
  /** The currently hovered/selecting vote choice (before voting) */
  selectingChoice?: VoteChoice | null
}

/**
 * Derive the visual state for panel A and B based on selecting or voted choice.
 *
 * Selecting states (hover, before vote is submitted):
 * - 'a' selecting: A=winner, B=default
 * - 'b' selecting: A=default, B=winner
 * - 'tie' selecting: A=tie-good, B=tie-good
 * - 'bad' selecting: A=tie-bad, B=tie-bad
 *
 * Voted states (after vote is submitted, vote bar disappears):
 * - 'a' voted: A=winner, B=default (no dimming per Figma)
 * - 'b' voted: A=default, B=winner
 * - 'tie' voted: A=tie-good, B=tie-good
 * - 'bad' voted: A=tie-bad, B=tie-bad
 */
function deriveVisualStates(
  selectingChoice: VoteChoice | null | undefined,
  voteResult: VoteChoice | null | undefined,
): { stateA: PanelVisualState; stateB: PanelVisualState; revealModels: boolean } {
  // Voted takes priority
  const choice = voteResult || selectingChoice

  if (!choice) {
    return { stateA: 'default', stateB: 'default', revealModels: false }
  }

  const isVoted = !!voteResult
  const revealModels = isVoted

  switch (choice) {
    case 'a':
      return {
        stateA: 'winner',
        stateB: 'default',
        revealModels,
      }
    case 'b':
      return {
        stateA: 'default',
        stateB: 'winner',
        revealModels,
      }
    case 'tie':
      return {
        stateA: 'tie-good',
        stateB: 'tie-good',
        revealModels,
      }
    case 'bad':
      return {
        stateA: 'tie-bad',
        stateB: 'tie-bad',
        revealModels,
      }
    default:
      return { stateA: 'default', stateB: 'default', revealModels: false }
  }
}

export function DualResponsePanel({
  responseA,
  responseB,
  modelA,
  modelB,
  isBattle,
  voteResult,
  selectingChoice,
}: Props) {
  const { stateA, stateB, revealModels } = deriveVisualStates(selectingChoice, voteResult)

  return (
    <div className="flex gap-2.5 animate-slide-up relative">
      {/* Response A */}
      <div
        className="flex-1 transition-opacity duration-300"
        style={{ opacity: 1 }}
      >
        <ResponsePanel
          content={responseA}
          model={modelA}
          isBattle={isBattle}
          label="Model A"
          visualState={stateA}
          revealModel={revealModels}
        />
      </div>

      {/* Response B */}
      <div
        className="flex-1 transition-opacity duration-300"
        style={{ opacity: 1 }}
      >
        <ResponsePanel
          content={responseB}
          model={modelB}
          isBattle={isBattle}
          label="Model B"
          visualState={stateB}
          revealModel={revealModels}
        />
      </div>
    </div>
  )
}
