# G3B: Direct Chat Mode

Covers: P0-3 | Date: March 12, 2026 | Status: G3B Design Review
Depends on: Model Registry, Pre-computed Responses, Rating Engine, Quality Tag Taxonomy | Visual ref: ../prototype/arena-prototype.html

## 1. What This Feature Does

Direct Chat Mode is single-model evaluation. Users select one model from the registry and engage in an open-ended multi-turn conversation. After any turn, users can rate the response on a 1–5 star scale and optionally tag response quality (accurate, natural, culturally appropriate, creative, helpful). Unlike Battle Mode and Side-by-Side, there is no pairwise voting or Elo comparison; ratings feed a quality feedback engine for model improvement. Multiple ratings per conversation are supported (one per turn).

## 2. User Flow

**Welcome/Entry:**
1. User navigates to Direct Chat Mode tab or section
2. Screen displays: one model dropdown (searchable, shows model name + organization) and prompt input field
3. User selects a model from the dropdown
4. System initializes conversation thread (empty state)

**Chat Initiation:**
5. User enters initial prompt in shared input field
6. User clicks "Gửi" button (or hits Enter)
7. System retrieves pre-computed response from selected model for submitted prompt
8. Response card renders at full width with MODEL NAME VISIBLE (org attribution below)
9. Response text and token count display below response
10. Turn counter shows "1/∞" (no turn limit in Direct Chat; unlike Battle/SBS)

**Multi-Turn Conversation:**
11. User reads response. User can:
    - Rate response (step 12)
    - Add quality tags (step 13)
    - Continue conversation without rating (step 15)
    - Combine any of the above in any order
12. User clicks star icon to open 1–5 star rating interface
13. User selects number of stars (filled stars visual feedback)
14. User can optionally add quality tags by clicking tag buttons: "Chính xác" (accurate), "Tự nhiên" (natural), "Phù hợp văn hóa" (culturally appropriate), "Sáng tạo" (creative), "Hữu ích" (helpful)
15. User selects multiple tags (checkboxes; max 5 tags selectable)
16. User submits rating + tags by clicking "Lưu đánh giá" button
17. Rating confirmation appears briefly: "Cảm ơn đánh giá của bạn!" with star count and tags displayed

**Continuing After Rating:**
18. User submits follow-up prompt in same input field (input NOT disabled after rating)
19. System appends user message to conversation history, re-submits to same model, retrieves pre-computed response
20. New response card appears in thread (conversation history scrollable above)
21. Turn counter increments (2/∞, 3/∞, etc.)
22. User can rate this turn independently (or not rate)
23. User can continue chatting indefinitely (no turn limit)

**Multiple Ratings Per Conversation:**
24. Each turn can be independently rated and tagged
25. If user rates turn 1, then turn 3, both ratings are recorded with turn number
26. Previous ratings remain visible in conversation thread (star count + tags displayed below response)
27. User can re-rate a turn by clicking the star icon on a previously rated response (updates rating, replaces old rating)

**End Conversation:**
28. User clicks "Cuộc trò chuyện mới" button (similar to Battle/SBS)
29. Page clears conversation history and all ratings
30. Model selection is NOT retained (user must re-select for new conversation)
31. Prompt input field cleared
32. Page returns to step 2 (model selection dropdown + empty state)

## 3. Key Behaviors

**Single-Model Selection:**
- One model selected per conversation (no randomization, no position bias)
- Model name and org always visible throughout conversation

**Rating Independence:**
- Rating one turn does NOT affect other turns
- Each turn rated separately; no cross-turn weighting or comparison
- Ratings feed quality feedback engine (not Elo, not leaderboard ranking)

**Quality Tags (Optional):**
- Users can rate WITHOUT tags (stars only)
- Users can add tags AFTER rating (or at same time)
- Max 5 tags per turn; each tag is a boolean (selected or not)
- Tag options: Chính xác, Tự nhiên, Phù hợp văn hóa, Sáng tạo, Hữu ích
- Tags are metadata for model improvement (aggregated feedback, not individual scoring)

**No Turn Limit:**
- Unlike Battle Mode (5 turns) and Side-by-Side (5 turns), Direct Chat allows unlimited turns
- Conversation can run until user manually ends with "Cuộc trò chuyện mới"
- Conversation history scrollable for easy navigation in long threads

**Response Rendering:**
- Responses pre-computed (not live generation)
- Token count displayed below each response for transparency
- Long responses auto-truncate with "Xem thêm" expand button (max 600px height before expand)

**Rating Persistence:**
- Star rating and tags saved immediately on "Lưu đánh giá" submission
- Previous ratings visible in conversation thread (star icons + tag labels displayed below response)
- If user re-rates, old rating replaced (no history of rating changes preserved)

**No Conversation Carry-over:**
- On "Cuộc trò chuyện mới", all history cleared (no archive feature)
- Ratings recorded to backend (for quality feedback) but conversation not accessible in UI after clear

## 4. Edge Cases

**Scenario: User rates before all responses load**
- Response card shows skeleton loader until text fully renders
- Star rating interface unavailable until response fully loaded (buttons greyed out)
- User receives inline message "Đợi phản hồi..." if they attempt to rate mid-load

**Scenario: User rates, then rates again before submission**
- If user clicks star icon, reopens rating interface, selects different stars, then clicks "Lưu đánh giá" again
- Second submission replaces first (no double-rating; only latest rating persists)
- UI briefly shows "Cảm ơn đánh giá của bạn!" (no "update" messaging; treated as normal submission)

**Scenario: User selects tags, then clears all tags before submitting**
- "Lưu đánh giá" button remains active with empty tag set
- User can submit star rating with no tags (valid state)
- Rating recorded with 0 tags; previous tag selection replaced

**Scenario: Pre-computed response missing for selected model**
- System checks response cache on prompt submit; if missing, shows "Phản hồi không khả dụng. Vui lòng thử lại hoặc chọn mô hình khác."
- Chat not initiated; user prompted to retry or select different model

**Scenario: Model retired between selection and chat**
- System validates model availability on first prompt submit
- If model no longer active, error message "Mô hình này không còn khả dụng. Vui lòng chọn mô hình khác."
- Chat not initiated; user returned to model selection screen

**Scenario: User submits empty follow-up**
- Input field requires min 3 characters
- Submit button disabled for empty input; user sees "Nhập ít nhất 3 ký tự"

**Scenario: User navigates away mid-conversation**
- localStorage holds conversation history + ratings
- On page reload, conversation reconstructed if user returns within 30 minutes
- All previous ratings and tags remain visible
- If >30 minutes, session invalidated; conversation lost on reload

**Scenario: User selects 6 tags (exceeds limit of 5)**
- 6th tag click ignored or prevented (visual feedback: tag disabled or tooltip "Tối đa 5 thẻ")
- User must deselect one tag before 6th selectable

## 5. Acceptance Criteria

- [ ] Model dropdown renders with searchable list (fuzzy match on name + org)
- [ ] Model selection initiates conversation thread (empty state until first response)
- [ ] Submitting prompt calls Pre-computed Responses API with selected model ID
- [ ] Response card displays with model name and org fully visible
- [ ] Response text and token counts display without truncation (expandable for >600px)
- [ ] Star rating interface appears via icon below response; 1–5 stars selectable
- [ ] Quality tag buttons display all 5 options; max 5 tags selectable per turn
- [ ] "Lưu đánh giá" button saves star rating + selected tags with turn number
- [ ] Rating confirmation message appears: "Cảm ơn đánh giá của bạn!" with star count + tags
- [ ] Follow-up input field remains active after rating (NOT disabled)
- [ ] Follow-up prompt appends to conversation history; new response appears in thread
- [ ] Turn counter increments without limit (1/∞, 2/∞, etc.)
- [ ] Previous ratings visible in thread (star icons + tag labels displayed below response)
- [ ] User can re-rate turn independently (updates rating, replaces old rating)
- [ ] "Cuộc trò chuyện mới" button clears all history and ratings; requires new model selection
- [ ] Skeleton loaders appear while responses load; rating interface disabled until response ready
- [ ] Empty follow-up input blocked with "Nhập ít nhất 3 ký tự" error
- [ ] Conversation state persists in localStorage with 30-minute TTL

## 6. Out of Scope

- Live model inference (responses are pre-computed)
- Detailed quality feedback analytics or per-tag leaderboards
- Conversation history archive or export
- Sharing conversations between users
- Model-specific rating weighting or custom quality rubrics
- Voice input or rich media attachments
- Real-time collaborative chat (single-user per session only)
