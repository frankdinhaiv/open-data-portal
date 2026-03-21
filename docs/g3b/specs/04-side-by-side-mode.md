# G3B: Side-by-Side Mode

Covers: P0-2 | Date: March 12, 2026 | Status: G3B Design Review
Depends on: Model Registry, Pre-computed Responses, Elo Engine, Vote Tracker | Visual ref: ../prototype/arena-prototype.html

## 1. What This Feature Does

Side-by-Side Mode allows users to explicitly select two models from the registry and compare their responses to the same prompt. Unlike Battle Mode's blind pairwise evaluation, models are visible by name and organization. Users vote on the same 4-point scale, triggering Elo updates. This mode is ideal for direct model comparison and skill evaluation by teams or individuals with model preferences.

## 2. User Flow

**Welcome/Entry:**
1. User navigates to Side-by-Side Mode tab or section
2. Screen displays: two dropdown menus labeled "Mô hình A" and "Mô hình B", and shared prompt input field
3. User selects first model from searchable dropdown (shows model name + organization)
4. User selects second model from second dropdown (shows model name + organization)

**Validation:**
5. System validates that Model A ≠ Model B
6. If same model selected for both, second dropdown input field highlights red with error "Chọn 2 mô hình khác nhau"
7. User cannot submit prompt until 2 different models selected

**Comparison Initiation:**
8. User enters prompt in shared input field
9. User clicks "So sánh" button (or hits Enter)
10. System retrieves pre-computed responses from both models for submitted prompt
11. Dual response cards render side-by-side with MODEL NAMES VISIBLE (full org attribution below each name)
12. Response text and token count display below each card
13. Multi-turn indicator appears (e.g., 1/5)

**Interaction (Single or Multi-Turn):**
14. User reads responses. If satisfied, proceeds to voting. If wants follow-up, proceeds to step 15.
15. User submits follow-up prompt in shared input field
16. System appends user message to conversation history, re-submits to same 2 models, retrieves pre-computed responses
17. Both models' new responses appear as new cards in thread (conversation history scrollable above)
18. Turn counter increments visibly (2/5, etc.)
19. User can vote or continue follow-ups until turn limit reached

**Voting:**
20. User clicks one of 4 vote buttons: "[Model A name] tốt hơn" / "[Model B name] tốt hơn" / "Hòa" / "Cả hai đều tệ"
21. Vote buttons automatically reflect selected model names (not generic "A tốt hơn")
22. Cards immediately highlight: winner green + 🏆 Thắng, loser red + Thua, tie both green + 🤝 Hòa, both bad both red + 👎 Tệ
23. Vote buttons disappear; input field disabled
24. Confirmation message appears briefly: "🏆 [Model Name] thắng!" or "🤝 Hòa" or "👎 Cả hai đều tệ"
25. NO Elo reveal panel (models already visible; users know the score implications)
26. Two action buttons appear below confirmation:
    - "💬 Tiếp tục hội thoại" — continue multi-turn conversation with same model pair (visible only if turn limit not reached)
    - "⚖️ So sánh tiếp" — reset to new comparison (always visible)

**Continue Conversation (Multi-Turn):**
27. User clicks "Tiếp tục hội thoại"
28. Vote buttons and confirmation message dismissed; input field re-focused
29. User submits follow-up prompt to same model pair
30. Both models receive identical conversation context; new responses appear as new cards
31. Turn counter increments (e.g., 2/5, 3/5)
32. At turn limit (5), "Tiếp tục hội thoại" button no longer appears; only "So sánh tiếp" available

**Reset to New Comparison:**
33. User clicks "So sánh tiếp"
34. Page clears conversation history and vote state
35. Model selections persist (remembers last Model A and Model B for convenience)
36. Prompt input field cleared; user can submit same or different prompt
37. All conversation history and vote cards removed from DOM

## 3. Key Behaviors

**Model Selection Memory:**
- System remembers last model pair selected in localStorage under user session
- On subsequent visits (within same session), dropdowns default to last selected models
- User can override selections at any time

**Model Name in Vote Buttons:**
- Vote button text dynamically updates based on selected models
- Example: if user selects Claude 3.5 Sonnet and GPT-4, buttons read "Claude 3.5 Sonnet tốt hơn", "GPT-4 tốt hơn", "Hòa", "Cả hai đều tệ"
- No position-based naming (always actual model names, never "A" / "B")

**Multi-Turn Management:**
- Same 2 models receive identical conversation context across all turns
- Turn limit enforced (default 5 turns max); UI shows "Bạn đã đạt giới hạn tối đa"
- Follow-up input field disabled when limit reached

**Vote Immutability:**
- Once vote submitted, buttons locked and cards locked to highlight state
- User cannot change vote mid-comparison
- Vote recorded with timestamp, model IDs, and full conversation history

**Response Rendering:**
- Responses pre-computed (not live generation)
- Token count displayed below each response for transparency
- Long responses auto-truncate with "Xem thêm" expand button (max 600px height before expand)
- Model names and org always visible (never hidden)

**Dropdown Searchability:**
- Both model dropdown menus support text search (fuzzy match on model name + org)
- Example: typing "GPT" filters to GPT-4, GPT-4o, GPT-4 Turbo, etc.
- Dropdown shows max 8 results per search; user scrolls to see more

## 4. Edge Cases

**Scenario: User selects same model for A and B**
- Second dropdown highlights red on submission attempt
- Error message "Chọn 2 mô hình khác nhau" displayed inline
- "So sánh" button remains disabled until 2 different models selected

**Scenario: User votes before all responses load**
- Response cards show skeleton loaders until text fully renders
- Vote buttons disabled until both responses fully loaded (buttons greyed out)
- User receives inline message "Đợi phản hồi..." if they attempt to vote mid-load

**Scenario: Pre-computed response missing for selected model pair**
- System checks response cache on submit; if missing, shows "Phản hồi không khả dụng cho cặp mô hình này. Hãy chọn mô hình khác."
- Comparison aborted; user returned to model selection screen (dropdowns pre-filled with last selection)

**Scenario: Model retired between last selection and new comparison**
- System validates model availability on vote submission
- If model no longer active, error message "Mô hình này không còn khả dụng. Vui lòng chọn mô hình khác."
- Vote not recorded; user prompted to restart comparison

**Scenario: User submits empty follow-up**
- Input field requires min 3 characters
- Submit button disabled for empty input; user sees "Nhập ít nhất 3 ký tự"

**Scenario: User refreshes page mid-comparison**
- localStorage holds conversation state and model selections
- On page reload, conversation reconstructed if user returns within 30 minutes
- Model selections persist and pre-fill dropdowns
- If >30 minutes, session invalidated; user must restart comparison with same or different models

## 5. Acceptance Criteria

- [ ] Two model dropdowns render with searchable lists (fuzzy match on name + org)
- [ ] Validation prevents selecting same model for both A and B (red highlight + error message)
- [ ] Submitting prompt calls Pre-computed Responses API with both model IDs
- [ ] Response cards display with model names and org fully visible (not anonymized)
- [ ] Response text and token counts display without truncation (expandable for >600px)
- [ ] Follow-up input field submits new prompts and appends to conversation thread
- [ ] Turn counter increments per follow-up; UI shows "Turn X/5"
- [ ] Vote buttons text updates dynamically to show selected model names (e.g., "[Model A name] tốt hơn")
- [ ] Vote submission triggers highlight colors and confirmation message (no Elo reveal panel)
- [ ] After vote, "Tiếp tục hội thoại" button appears (if turn limit not reached) alongside "So sánh tiếp"
- [ ] "Tiếp tục hội thoại" dismisses vote UI and re-focuses input for follow-up prompt to same model pair
- [ ] "Tiếp tục hội thoại" hidden at turn limit (5); only "So sánh tiếp" available
- [ ] Model pair selection persists in localStorage (pre-fills dropdowns on next visit)
- [ ] "So sánh tiếp" button clears conversation and vote state while retaining model selections
- [ ] Skeleton loaders appear while responses load; vote buttons disabled until all responses ready
- [ ] Turn limit enforced (5 max); follow-up button disabled at limit with "Bạn đã đạt giới hạn tối đa"
- [ ] Empty follow-up input blocked with "Nhập ít nhất 3 ký tự" error

## 6. Out of Scope

- Live model inference (responses are pre-computed)
- Model comparison analytics or detailed vote breakdowns
- Custom model subsets or "favorites" for quick access (all 12 models always available)
- Conversation history export or sharing between users
- Rating or reviewing models outside of vote submission
- Mobile-optimized dropdown layouts (standard dropdown behavior only)
