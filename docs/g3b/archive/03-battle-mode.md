# G3B: Battle Mode — Blind Pairwise Evaluation

**Covers:** P0-1 (Battle Mode), P0-12 (Multi-Turn)
**Date:** March 12, 2026
**Status:** G3B Design Review
**Depends on:** Core Layout, Authentication, Response Serving
**Visual ref:** [arena-prototype.html](../arena-prototype.html)

---

## 1. What This Feature Does

Battle Mode is the core evaluation experience. Two anonymous AI models respond to the same Vietnamese prompt. The user reads both responses and votes on which is better — without knowing which model produced which response. This eliminates brand bias and produces trustworthy human preference data.

After voting, the user sees which models they compared and how the Elo ratings changed.

---

## 2. User Flow

```
┌─────────────────────────────────────────────────────────┐
│  User opens Arena (Battle mode default)                 │
│  ↓                                                      │
│  Welcome screen: prompt categories + text input         │
│  ↓                                                      │
│  User types or selects a Vietnamese prompt              │
│  ↓                                                      │
│  System picks 2 random models (hidden from user)        │
│  ↓                                                      │
│  Two responses appear: "Mô hình A" / "Mô hình B"       │
│  ↓                                                      │
│  ┌──── User decides ────┐                               │
│  │                      │                               │
│  ▼                      ▼                               │
│  VOTE                   FOLLOW-UP (multi-turn)          │
│  ↓                      ↓                               │
│  4 choices:             New message sent                │
│  A better               Both models respond again       │
│  B better               (same history)                  │
│  Tie                    Back to decision point ↑        │
│  Both bad                                               │
│  ↓                                                      │
│  Cards highlight (winner green, loser red)              │
│  ↓                                                      │
│  Elo Reveal: model names + scores + deltas              │
│  ↓                                                      │
│  "Cuộc trò chuyện mới" → reset                         │
└─────────────────────────────────────────────────────────┘
```

### Flow Details

**Step 1 — Welcome.** User sees Battle mode welcome with category chips (Kiến thức, Sáng tạo, Suy luận, Lập trình, Văn hóa VN, Nghề nghiệp) and a text input. Tapping a category chip fills in a suggested prompt. User can also type freely.

**Step 2 — Submit prompt.** System randomly selects 2 different models from the 12-model roster. Which model is displayed as "A" vs "B" is also randomized (position-bias control). System serves pre-computed responses from DB.

**Step 3 — Read & decide.** Two response cards appear side-by-side (stacked on mobile). Headers show "Mô hình A" and "Mô hình B" — no model names. User reads both and either votes or sends a follow-up.

**Step 4a — Vote.** Vote bar appears at bottom with 4 buttons:
- 👈 **A tốt hơn** — Model A wins
- 👉 **B tốt hơn** — Model B wins
- 🤝 **Hòa** — Tie (both good)
- 👎 **Cả hai đều tệ** — Both bad

**Step 4b — Follow-up (multi-turn).** User types another message. Both models receive the same conversation history and respond. Previous turns remain visible (scroll up). User can vote after any turn. Turn counter shows "Lượt 2", "Lượt 3", etc.

**Step 5 — Vote result.** After voting:
- Winner card: green border, green gradient, 🏆 **Thắng** badge
- Loser card: red border, red gradient, faded to 0.75 opacity, **Thua** badge
- Tie: both green, 🤝 **Hòa** badge
- Both bad: both red, faded, 👎 **Tệ** badge
- Transition: 300ms smooth animation

**Step 6 — Elo Reveal.** Panel slides up showing:
- Model A: actual name, organization, Elo score, delta (e.g., "+12" in green or "-12" in red)
- "VS" divider
- Model B: same info
- Winner gets 🏆 crown icon
- Numbers animate (count up effect)

**Step 7 — Reset.** "Cuộc trò chuyện mới" button clears everything. Returns to welcome screen. Guest battle counter decrements (3 free, then auth gate).

---

## 3. Wireframes

### Desktop (≥1024px)

```
┌──────────────────────────────────────────────────────────┐
│ ViGen Arena          🗳️ 1,234 phiếu          [Avatar ▾] │
├────────────┬─────────────────────────────────────────────┤
│ 🔍 Tìm... │                                             │
│            │  ⚔️  Đấu Trường AI                         │
│ Hôm nay   │  So sánh 2 mô hình ẩn danh                 │
│  ├ Chat 1  │                                             │
│  ├ Chat 2  │  [Kiến thức] [Sáng tạo] [Suy luận]        │
│            │  [Lập trình] [Văn hóa] [Nghề nghiệp]      │
│ Hôm qua   │                                             │
│  ├ Chat 3  │  ┌──────────────────────────────────────┐  │
│            │  │ Nhập câu hỏi tiếng Việt...        [➤]│  │
│ ────────── │  └──────────────────────────────────────┘  │
│ ⚔️ Battle  │                                             │
│ ⚖️ SBS     │                                             │
│ 💬 Direct  │                                             │
└────────────┴─────────────────────────────────────────────┘
```

### Active Battle — Turn 1

```
┌────────────┬─────────────────────────────────────────────┐
│  Sidebar   │                                             │
│            │  [User] Giải thích blockchain cho lớp 10    │
│            │                                             │
│            │  ┌──────────────┐  ┌──────────────┐        │
│            │  │ 🔵 Mô hình A │  │ 🟠 Mô hình B │        │
│            │  │              │  │              │        │
│            │  │ Blockchain   │  │ Blockchain   │        │
│            │  │ là một sổ    │  │ giống như     │        │
│            │  │ cái ghi chép │  │ cuốn sổ cái  │        │
│            │  │ ...          │  │ ...          │        │
│            │  └──────────────┘  └──────────────┘        │
│            │                                             │
│            │  ┌──────────────────────────────────────┐  │
│            │  │👈 A tốt hơn│🤝 Hòa│👎 Tệ│B tốt hơn 👉│  │
│            │  └──────────────────────────────────────┘  │
│            │  ┌──────────────────────────────────────┐  │
│            │  │ Nhập tin nhắn tiếp theo...        [➤]│  │
│            │  └──────────────────────────────────────┘  │
└────────────┴─────────────────────────────────────────────┘
```

### Post-Vote (A wins)

```
│            │  ┌──────────────┐  ┌──────────────┐        │
│            │  │ 🔵 Mô hình A │  │ 🟠 Mô hình B │        │
│            │  │ 🏆 Thắng     │  │ Thua         │        │
│            │  │ ▓▓▓▓▓▓▓▓▓▓▓ │  │ ░░░░░░░░░░░ │        │
│            │  │ (green bg)   │  │ (red, faded) │        │
│            │  └──────────────┘  └──────────────┘        │
│            │                                             │
│            │  ┌──────────────────────────────────────┐  │
│            │  │ Claude Opus    VS     GPT-5          │  │
│            │  │ Anthropic             OpenAI         │  │
│            │  │ 1012 (+12) 🏆         988 (-12)     │  │
│            │  └──────────────────────────────────────┘  │
│            │                                             │
│            │       [⚔️ Cuộc trò chuyện mới]             │
```

### Mobile (375px)

```
┌──────────────────────┐
│ ViGen   🗳️ 234  [≡] │
├──────────────────────┤
│                      │
│ [User] Giải thích    │
│ blockchain cho lớp 10│
│                      │
│ ┌──────────────────┐ │
│ │ 🔵 Mô hình A     │ │
│ │ Blockchain là... │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ 🟠 Mô hình B     │ │
│ │ Blockchain giống..│ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ 👈 A   🤝   👎   B 👉│ │
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │ Nhập tin nhắn... │ │
│ └──────────────────┘ │
│                      │
│ [⚔️] [⚖️] [💬] [📊]  │
└──────────────────────┘
```

---

## 4. Key Behaviors

### Model Pair Selection
- System picks 2 different models at random from the active roster
- Position (A vs B) is randomized per battle — same model won't always be "A"
- Over time, all model pairs should get roughly equal battle counts (balancing algorithm is P1, basic randomization is P0)

### Multi-Turn Rules
- User can send unlimited follow-ups before voting
- Both models receive identical conversation history
- Vote can be cast after any turn (not forced to the first turn)
- Once voted, conversation is locked — no more follow-ups
- Turn counter visible: "Lượt 1", "Lượt 2", etc.

### Vote Color Feedback
| User choice | Card A | Card B |
|-------------|--------|--------|
| A tốt hơn | 🏆 Green, full opacity | Red, 0.75 opacity |
| B tốt hơn | Red, 0.75 opacity | 🏆 Green, full opacity |
| Hòa | 🤝 Green, full opacity | 🤝 Green, full opacity |
| Cả hai đều tệ | 👎 Red, 0.7 opacity | 👎 Red, 0.7 opacity |

### Elo Reveal
- Shows only after voting (not during conversation)
- Displays: model name, organization, current Elo score, delta from this battle
- Winner gets crown icon
- "Cuộc trò chuyện mới" button appears below

### Guest Behavior
- First 3 battles: no login required
- 4th battle attempt: auth modal blocks until login/signup
- Guest votes are stored and attributed to account after signup

---

## 5. Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User submits empty prompt | Validation: "Vui lòng nhập câu hỏi" — input highlighted red |
| User submits very long prompt (>2000 chars) | Truncate at 2000 with warning |
| Response takes too long (>30s) | Show timeout message, offer retry |
| User refreshes mid-conversation | Conversation restored from session state |
| User clicks back button during battle | Confirm dialog: "Rời khỏi? Cuộc trò chuyện chưa lưu." |
| No pre-computed response exists for prompt | Fallback: show closest matching prompt response, or "Chưa có dữ liệu" |
| Same user votes twice on same turn | Prevented — vote button disabled after first vote |
| Network drops during vote submission | Queue locally, retry on reconnect, confirm when saved |
| Very long AI response | Scrollable card with max-height, response fully readable |
| Guest limit reached mid-conversation | Save current state → show auth modal → resume after login |

---

## 6. Acceptance Criteria

### Core Flow
- [ ] AC-1: User can type a Vietnamese prompt and receive 2 anonymous responses side-by-side
- [ ] AC-2: Model identities are hidden — cards show "Mô hình A" / "Mô hình B" only
- [ ] AC-3: 4 vote buttons visible: A tốt hơn, B tốt hơn, Hòa, Cả hai đều tệ
- [ ] AC-4: After voting, winner card turns green with 🏆 badge, loser turns red with faded opacity
- [ ] AC-5: After voting, Elo reveal panel shows both model names, orgs, Elo scores, and deltas
- [ ] AC-6: "Cuộc trò chuyện mới" button resets to welcome screen

### Multi-Turn
- [ ] AC-7: User can send follow-up messages after first response
- [ ] AC-8: Both models respond to the same conversation history
- [ ] AC-9: Previous turns remain visible (scrollable)
- [ ] AC-10: Vote can be cast at any turn, not just the first
- [ ] AC-11: After voting, chat input is disabled (no more follow-ups)
- [ ] AC-12: Turn counter displays correctly ("Lượt 1", "Lượt 2", ...)

### Position Bias Control
- [ ] AC-13: Model assigned to position A vs B is randomized per battle
- [ ] AC-14: Same model appears as "A" and "B" roughly equally over many battles

### Responsiveness
- [ ] AC-15: On mobile (375px), response cards stack vertically
- [ ] AC-16: Vote buttons are full-width and touch-friendly (≥44px height) on mobile
- [ ] AC-17: All text remains readable on mobile — no horizontal overflow

### Guest Gate
- [ ] AC-18: First 3 battles work without login
- [ ] AC-19: 4th battle attempt triggers auth modal
- [ ] AC-20: Guest votes are preserved and linked to account after signup

### Error Handling
- [ ] AC-21: Empty prompt submission is blocked with Vietnamese validation message
- [ ] AC-22: Network failure during vote shows retry option, vote is not lost
- [ ] AC-23: Page refresh during conversation restores state

### Data Integrity
- [ ] AC-24: Each vote is stored with: voter ID, conversation ID, turn number, choice, mode, model pair, timestamp
- [ ] AC-25: Duplicate votes on the same turn are prevented

---

## 7. Out of Scope (P1+)

- Anti-gaming / spam detection (P1-1)
- Category-specific Elo rankings (P1-2)
- Style control for response length normalization (P1-3)
- Sharing battle results as link/image (P1-6)
- Live inference (P2-2)
- Pair balancing algorithm to ensure even model coverage (P1)
