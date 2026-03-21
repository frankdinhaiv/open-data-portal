# G3B: Vote System

Covers: P0-8 | Date: March 12, 2026 | Status: G3B Design Review
Depends on: Arena Core, Conversation Store | Visual ref: ../prototype/arena-prototype.html

## 1. What This Feature Does

The vote system captures and stores all user judgments across battle mode, SBS mode, and direct rating mode. It handles guest session persistence, real-time deduplication, offline queueing, and retroactive account linking. Votes are the atomic unit of leaderboard computation.

## 2. User Flow

**Battle Mode Vote:**
1. User sees two responses (Model A, Model B)
2. User selects: "A is better" | "B is better" | "Tie" | "Both bad"
3. System records: voter ID, conversation ID, turn number, choice, timestamp
4. Vote stored immediately; Elo refreshes in UI within 500ms
5. Next prompt loads

**Direct Rating Mode:**
1. User sees single response
2. User selects 1–5 star rating
3. System shows optional tag buttons: "Accurate" | "Clear" | "Creative" | "Unhelpful"
4. User can multi-select tags (optional)
5. Vote recorded: voter ID, conversation ID, model, turn, stars, tags, timestamp
6. UI confirms: "Cảm ơn đánh giá của bạn" (Thank you for your rating)

**Guest → Registered Flow:**
1. Guest votes stored with guest session ID (localStorage-keyed)
2. On signup/login, system queries: all votes with matching guest session ID
3. System retroactively links those votes to new account ID
4. No duplicate votes created; old guest session ID marked inactive
5. User sees: "Bạn có X bình chọn từ phiên khách" (You have X votes from guest session)

## 3. Key Behaviors

**Vote Recording:**
- One vote per conversation per turn (deduplication check: if user re-votes same turn, replace old vote)
- Vote payload: `{voterId, conversationId, turnNumber, mode, choice, modelPair, timestamp, userAgent}`
- Guest votes: voterId = "guest:{sessionId}"
- Registered votes: voterId = user account ID

**Offline Queueing:**
- Before sending to server, vote queued to localStorage: `votes_queue:[{...}, {...}]`
- On vote:submit event, attempt POST to `/api/votes`
- If offline (timeout or 5xx), keep in queue, retry on next action
- On reconnect: batch-send all queued votes, clear queue on success
- Queue persists across page refreshes
- Maximum queue size: 1,000 votes (safeguard)

**Data Deduplication:**
- Constraint: `unique(voterId, conversationId, turnNumber, mode)`
- If user votes same conversation/turn twice in same mode, second vote overwrites first
- Notification to user: "Bình chọn đã được cập nhật" (Vote updated)
- Overwrites are logged (for audit trail)

**Vote Attributes:**
- `mode`: "battle" | "sbs" | "direct"
- `choice`:
  - Battle: "a" | "b" | "tie" | "bad"
  - Direct: integer 1–5 (star rating)
  - SBS: "a" | "b" | "tie" | "bad"
- `modelPair`: [modelIdA, modelIdB] (null for direct mode)
- `tags`: array of string tags (direct mode only, optional)

**Real-Time Feedback:**
- After vote submission, Elo UI updates within 500ms (using optimistic local calculation)
- Server-side Elo is source of truth; UI Elo reconciles on next daily batch or on page refresh
- Vote count increments immediately in leaderboard
- User sees toast: "Bình chọn đã được ghi nhận" (Vote recorded)

## 4. Edge Cases

**Double-Click Vote:**
- JavaScript: vote button disabled for 1 second post-click (prevents accidental double-submit)
- Server-side deduplication: if duplicate arrives within 5 seconds, return success (idempotent)

**Offline Then Online:**
- Queue may contain votes from hours ago
- Server accepts votes with past timestamps (does not reject based on staleness)
- Batch send includes timestamp metadata for audit trail

**Session Expiry During Vote:**
- If guest session expires mid-vote, system saves vote to ephemeral session, prompts login
- After login, system links votes retroactively

**Model Pair Mismatch:**
- If user votes for model pair that no longer exists in roster (model decommissioned), vote still recorded
- Elo engine skips votes with missing models (marked as orphaned)
- Audit log flags this for manual review

**Bad/Tie Semantics:**
- "Both bad" = neither response was usable (score treated as draw in Elo)
- "Tie" = both equally good (also draw in Elo)
- Both compress to `S = 0.5` in Elo formula

## 5. Acceptance Criteria

- [ ] Vote payload stored within 300ms of submission (P99 latency)
- [ ] Offline queue persists to localStorage; on reconnect, all queued votes batch-synced without error
- [ ] One vote per (voterId, conversationId, turnNumber, mode); second vote in same context overwrites first
- [ ] Guest session votes retroactively linked to account on signup (no duplicates, no data loss)
- [ ] Vote records include: voterId, conversationId, turnNumber, mode, choice, modelPair, userAgent, timestamp
- [ ] Real-time Elo UI updates within 500ms of vote; server-side reconciliation on next batch
- [ ] Vote button disabled for 1s post-click (double-click protection)
- [ ] Toast confirmation: "Bình chọn đã được ghi nhận" (Vietnamese)
- [ ] No votes rejected due to age/staleness (all timestamps accepted)
- [ ] Orphaned votes (missing models) flagged but not lost; audit trail maintained

## 6. Out of Scope

- Vote analytics dashboards (separate feature)
- Vote reversal by user (immutable once submitted)
- Weighted voting by user authority/expertise (v1 treats all votes equally)
- Real-time vote streaming to leaderboard (batch updates only)
- Custom vote tags beyond Arena.ai defaults (v1 fixed set)
