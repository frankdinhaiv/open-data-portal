# Battle Mode

## Overview

The core Arena experience: blind pairwise evaluation where users submit Vietnamese prompts, receive responses from two anonymous models, and vote for the better one. Model identities are hidden until after the vote to prevent brand bias. Votes feed the Elo rating system that produces the Arena leaderboard.

Battle Mode is the primary vote collection mechanism — it gates the Q2 2026 OKR of 10,000 human preference votes in 60 days.

## User Flow

### 1. Entry
- User lands on Arena homepage or selects "Đấu Trường" mode
- Welcome screen shows 3 random suggested prompts (Vietnamese, randomized on each load)
- User either clicks a suggested prompt or types their own

### 2. Battle Initiation
- Backend selects random model pair from 12 active models
- Position randomized server-side (coin flip: which model is A vs B)
- Pre-computed responses served from database (no live inference)
- Two anonymous response cards displayed side-by-side
- Model identities hidden — cards labeled "Mô hình A" and "Mô hình B" only

### 3. Multi-Turn Conversation (Optional)
- User can send follow-up prompts (up to 5 turns total)
- Both models receive identical conversation history
- User can vote at any turn — voting is not restricted to the last turn
- Turn counter shows progress (e.g., "2/5")

### 4. Voting
- Four options: "A tốt hơn" (A wins) | "B tốt hơn" (B wins) | "Hòa" (Tie) | "Cả hai đều tệ" (Both bad)
- Vote is **immutable** once submitted — no changes allowed
- Vote stored with: voter ID (or guest_sessionId), conversation ID, turn number, choice, timestamp

### 5. Elo Reveal
- After vote, 1.5-second animated delay before reveal
- Model identities displayed with organization attribution
- Elo delta shown: how much each model's rating changed from this vote
- Winner card: green border + 🏆. Loser: red border + faded. Tie: green + 🤝. Both bad: red + 👎

### 6. Next Action
- "Trận Mới" (New Battle) button resets to fresh prompt + new random model pair
- Previous battle moves to conversation history in sidebar

## Functional Requirements

### Prompt Handling
- Suggested prompts: exactly 3, randomized from seed dataset via API
- No category chips at P0 — prompts span all categories randomly
- User-typed prompts fuzzy-matched to closest seed prompt (Levenshtein < 10%)
- Minimum 30 seed prompts across categories at launch

### Response Display
- Two response cards side-by-side (desktop) or stacked (mobile)
- Model names hidden — "Mô hình A" and "Mô hình B" labels only
- Response text rendered with markdown support
- Token count displayed per response

### Voting Mechanics
- Four-point scale: A wins / B wins / Tie / Both bad
- Vote buttons disabled for 1 second after click (double-click protection)
- Optimistic Elo update in UI within 500ms; server batch reconciles nightly
- Offline votes queued in localStorage; batched on reconnect

### Multi-Turn Rules
- Maximum 5 turns per battle (hard cap)
- Both models receive identical conversation context
- User can vote at any turn (not restricted to final turn)
- Each follow-up uses same model pair (no mid-conversation model switching)

### Guest Gate
- 3 free battles without authentication
- Battle count tracked in localStorage
- 4th battle triggers sign-up modal
- Guest votes retroactively linked to account on signup via guest_sessionId

### Model Pair Selection
- Random pair from 12 active models
- Balanced distribution: no pair shown >1.5× any other in first 100 battles per category
- Position (A/B) randomized server-side per battle

## Design Decisions

- **Blind pairwise evaluation** — Model identities hidden until after vote. Prevents brand bias and produces scientifically credible preference data.
- **Position randomization is server-side** — Prevents client-side manipulation of which model appears on which side. Position logged in vote record for statistical correction.
- **Vote is immutable once submitted** — No undo, no re-vote. Protects data integrity and prevents decision reversal after seeing model identities.
- **Pre-computed responses only (no live inference)** — Ensures fairness (same prompt always gets same responses for all users), eliminates latency variance, reduces cost.
- **Elo reveal with 1.5-second delay** — Makes the reveal feel meaningful and rewarding, reinforcing the "game" metaphor that drives repeat engagement.
- **"Both bad" treated as draw in Elo (S = 0.5)** — Neither model deserved the win; equivalent to a tie for ranking purposes.
- **Turn limit of 5 per battle** — Hard cap prevents unbounded multi-turn complexity in pre-computed response trees.
- **Conversation state in localStorage with 30-minute TTL** — Short enough to expire stale sessions; long enough to survive page refresh mid-battle.
- **Guest gate at 3 completed battles** — Lets users experience value before requiring signup. Mirrors Arena.ai's onboarding pattern.
- **Suggested prompts randomized across all categories at P0** — No category filtering at battle time; categories are leaderboard-only filters.

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User refreshes page mid-battle | Conversation state restored from localStorage (within 30-min TTL) |
| User tries 4th battle as guest | Sign-up modal blocks; can dismiss to browse but not start new battle |
| Network drops during vote | Vote queued in localStorage; submitted on reconnect |
| No seed prompt matches user input (Levenshtein > 10%) | "No match" error; user prompted to try different wording |
| Model pair exhausted (all responses for pair already seen) | Backend selects different pair; logged for analytics |
| User submits empty prompt | Client-side validation prevents submission |
| User on mobile (< 768px) | Response cards stacked vertically; vote buttons full-width |
