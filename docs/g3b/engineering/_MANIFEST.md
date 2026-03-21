# ViGen Arena — G3B Engineering Specs

**Created:** March 12, 2026
**Format:** Behavior-only specs for engineering review (no implementation details — those go in g3b-claude-code/)
**Language:** English (flow descriptions), Vietnamese (UI copy only)

## Spec Index

| # | File | Covers | Summary |
|---|------|--------|---------|
| 00 | 00-data-model-api.md | P0-8, P0-9 | DB entities, API surface, seed data strategy |
| 01 | 01-authentication.md | P0-6, P0-7 | Auth integration (already built), guest gate, data linking |
| 02 | 02-core-layout.md | P0-5, P0-10 | App shell, sidebar, topbar, responsive, Vietnamese UI |
| 03 | 03-battle-mode.md | P0-1, P0-12 | Blind pairwise + multi-turn + vote colors + Elo reveal |
| 04 | 04-side-by-side-mode.md | P0-2, P0-12 | Named model comparison + multi-turn |
| 05 | 05-direct-chat-mode.md | P0-3, P0-12 | Single model + star rating + quality tags |
| 06 | 06-vote-system.md | P0-8 | Vote persistence, deduplication, guest attribution |
| 07 | 07-elo-engine.md | P0-11 | Elo calculation (K=32), bootstrap CIs, daily batch |
| 08 | 08-leaderboard.md | P0-4 | Sortable table + 4 statistical views |
| 09 | 09-response-serving.md | P0-9 | Pre-computed response pairs, random assignment |
| 10 | 10-chat-history-user-stats.md | P0-5 | Conversation history, search, user contribution stats |

## Cross-Reference Map

```
User lands → Core Layout (02) → Mode selection
  ↓
Battle (03) / SBS (04) / Direct (05) → Response Serving (09) delivers pairs
  ↓
Vote System (06) ← stores votes (guest or authenticated)
  ↓ (daily batch)
Elo Engine (07) ← computes rankings + CIs
  ↓
Leaderboard (08) ← displays rankings + 4 statistical views

Parallel:
  Auth Integration (01) ← guest gate, session management, data linking
  Chat History (10) ← sidebar history, search, user stats
  Data Model (00) ← shared entities used by all specs
```

## Key Design Decisions

1. **Auth is integration-only** — Google OAuth + email/password already built. Spec 01 covers Arena UI integration points and guest gate only.
2. **No category chips on chat screens** — Categories are leaderboard-only filters (P1-2). Auto-classification approach TBD by engineering.
3. **Pre-computed responses** — No live inference at P0. Minimum 30 prompt/response sets at launch.
4. **Guest gate at battle 4** — 3 free battles, auth modal on 4th. Guest votes retroactively linked on sign-up.
5. **Read-only past conversations** — Users can view but not re-vote on past battles.

## Status

All 11 specs ready for G3B engineering review.
