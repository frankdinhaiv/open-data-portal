# G3B: Battle Mode

Covers: P0-1 | Date: March 12, 2026 | Status: G3B Design Review
Depends on: Model Registry, Pre-computed Responses, Elo Engine, Guest Session Manager | Visual ref: ../prototype/arena-prototype.html

## 1. What This Feature Does

Battle Mode is the core blind pairwise evaluation mode in ViGen Arena. Users submit a prompt and receive anonymous responses from two randomly selected models. After reviewing one or multiple turns of conversation, users vote to select the winner, triggering an Elo score update and model leaderboard progression. Position randomization (A/B swap) mitigates position bias in voting patterns.

## 2. User Flow

**Welcome/Entry:**
1. User lands on Battle Mode home screen
2. Screen displays: input field and 3 randomized suggested prompts in card layout
3. User enters custom prompt or clicks a suggested prompt

**Battle Initiation:**
4. System selects 2 random models from active model registry (without replacement)
5. System randomizes position assignment (50/50 chance Model A appears on left or right; Model B on opposite side)
6. System retrieves pre-computed responses for submitted prompt
7. Dual response cards render with model names hidden (labeled "Mô hình A" and "Mô hình B")
8. Response text and token count display below each card header
9. Multi-turn indicator appears if battle supports follow-ups (e.g., conversation count: 1/5)

**Interaction (Single or Multi-Turn):**
10. User reads responses. If satisfied, proceeds to voting (step 13). If wants follow-up, proceeds to step 11.
11. User submits follow-up prompt in shared input field at bottom
12. System appends user message to conversation history, re-submits to same 2 models, retrieves pre-computed responses
13. Both models' new responses appear as new cards in thread (scrollable history above)
14. Turn counter increments visibly (now shows 2/5, etc.)
15. User can vote or continue follow-ups until turn limit reached

**Voting:**
16. User clicks one of 4 vote buttons: "A tốt hơn" / "B tốt hơn" / "Hòa" / "Cả hai đều tệ"
17. Cards immediately highlight: winner green + 🏆 Thắng, loser red + Thua, tie both green + 🤝 Hòa, both bad both red + 👎 Tệ
18. Vote buttons disappear; input field disabled
19. Vote bar briefly flashes with selected result
20. After 1.5-second delay, Elo reveal panel slides up from bottom with:
    - Model A name, organization, current Elo, delta (+/- points)
    - Model B name, organization, current Elo, delta (+/- points)
    - Winner crowned with 👑 icon (or "Hòa" / "Cả hai tệ" label)
21. "Cuộc trò chuyện mới" button appears below reveal panel

**Reset to New Battle:**
22. User clicks "Cuộc trò chuyện mới"
23. Page clears, returns to step 2 (welcome screen with new suggested prompts)
24. All conversation history, vote, and Elo reveal removed from DOM

**Guest Authentication Gate:**
25. System tracks anonymous battle count in localStorage
26. After 3 completed battles without authentication, auth modal appears before battle 4
27. User must sign in (or create account) to continue
28. After auth, battle count resets; user can continue battling

## 3. Key Behaviors

**Position Randomization:**
- Each battle, A/B position is re-randomized independently of previous battles
- Randomization happens server-side before response retrieval to prevent client-side bias attacks
- Model identity remains hidden until Elo reveal

**Multi-Turn Management:**
- Conversation history persists in-session only (cleared on "Cuộc trò chuyện mới")
- Each turn, both Model A and Model B receive identical conversation context
- Turn limit enforced (default 5 turns max per battle); UI shows "Bạn đã đạt giới hạn tối đa"
- Follow-up input field disabled when limit reached

**Vote Immutability:**
- Once vote submitted, buttons locked and cards locked to highlight state
- User cannot change vote mid-battle (prevents decision reversal mid-reveal)
- Vote recorded with timestamp, model IDs, and full conversation history

**Response Rendering:**
- Responses pre-computed (not live generation) to ensure fairness and speed
- Token count displayed below each response for transparency
- Long responses auto-truncate with "Xem thêm" expand button (max 600px height before expand)

**Suggested Prompts:**
- Randomly selected from pool (not hard-coded) on each welcome screen load
- Selection is random across all available prompts (no category filtering at P0)
- 3 suggestions displayed; clicking one auto-populates input field and submits

**Guest Persistence:**
- Conversation history and vote counts stored in localStorage under session ID
- localStorage conversation synced to server on auth (linked to user account)
- If user clears browser cache, guest battle count resets and must re-authenticate

## 4. Edge Cases

**Scenario: User votes before all responses load**
- Response cards show skeleton loaders until text fully renders
- Vote buttons disabled until both responses fully loaded (visual indicator: buttons greyed out)
- User receives inline message "Đợi phản hồi..." if they attempt to vote mid-load

**Scenario: User refreshes page mid-battle**
- localStorage holds conversation state; on page reload, conversation reconstructed if user returns within 30 minutes
- If >30 minutes, session invalidated; user must start new battle
- Partial vote not saved (vote only saved on full submit)

**Scenario: Model list changes between response retrieval and vote**
- Elo reveal shows model names and scores from time of vote (snapshot taken at vote submission)
- If model was retired or renamed before reveal, reveal still displays historical data

**Scenario: Same model selected by randomizer twice (collision)**
- System filters to prevent same model appearing as both A and B
- If collision occurs, system re-rolls one model (up to 3 attempts before fallback)
- Fallback: if no 2 unique models available, battle aborted with message "Không đủ mô hình để tiếp tục. Vui lòng thử lại."

**Scenario: User submits empty follow-up**
- Input field requires min 3 characters (Vietnamese or English)
- Submit button disabled for empty input; user sees "Nhập ít nhất 3 ký tự"

**Scenario: Pre-computed response missing for submitted prompt**
- System checks response cache on submit; if missing, shows "Phản hồi không khả dụng cho lời nhắc này. Hãy thử một lời nhắc khác."
- Battle aborted; user returned to welcome screen

## 5. Acceptance Criteria

- [ ] Welcome screen renders 3 randomized suggested prompts on load (no category chips at P0; categories are leaderboard-only in P1-2)
- [ ] Submitting prompt calls Model Registry to select 2 unique random models
- [ ] Position assignment randomizes A/B placement 50/50 with no bias toward left/right
- [ ] Both response cards render with "Mô hình A" / "Mô hình B" labels (model names hidden)
- [ ] Response text and token counts display without truncation or overflow (expandable for >600px)
- [ ] Follow-up input field submits new prompts and appends to conversation thread
- [ ] Turn counter increments per follow-up; UI shows "Turn X/5"
- [ ] Vote buttons ("A tốt hơn", "B tốt hơn", "Hòa", "Cả hai đều tệ") submit vote and trigger highlight colors (green/red/neutral as per spec)
- [ ] Elo reveal panel slides up with model names, orgs, Elo scores, deltas, and winner crown
- [ ] "Cuộc trò chuyện mới" button clears all state and returns to welcome screen
- [ ] Guest session tracks battle count in localStorage; auth modal appears after 3rd battle
- [ ] Conversation state persists in localStorage with 30-minute TTL
- [ ] Skeleton loaders appear while responses load; vote buttons disabled until all responses ready
- [ ] Turn limit enforced (5 max); follow-up button disabled at limit with "Bạn đã đạt giới hạn tối đa"

## 6. Out of Scope

- Live model inference (responses are pre-computed)
- Detailed vote analytics or leaderboard filtering by prompt category
- Custom conversation history export or sharing between users
- A/B testing within Battle Mode (position randomization is hard-coded, not A/B testable)
- Notification system or email digest of Elo changes
- Mobile-specific gesture controls (standard click/tap behavior only)
