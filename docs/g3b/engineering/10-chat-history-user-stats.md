# G3B: Chat History & User Stats

Covers: P0-5 (Conversation History), User Story ("I want to see my vote count and contribution history")
Date: March 12, 2026
Status: G3B Design Review
Depends on: 00-data-model-api.md (Conversation, Vote entities), 01-authentication.md (Guest/Auth session), 02-core-layout.md (Sidebar structure)
Visual ref: ../prototype/arena-prototype.html

## 1. What This Feature Does

Provides users with a persistent record of their Arena activity — past conversations, votes cast, and contribution stats. Chat history lives in the left sidebar, allowing users to revisit past battles. User stats surface in the topbar and (for authenticated users) in a lightweight profile summary. This feature drives retention by making participation feel cumulative and visible.

## 2. User Flow

### Viewing Conversation History
1. User opens ViGen Arena
2. Left sidebar shows conversation history grouped by date:
   - **Hôm Nay** (Today)
   - **Hôm Qua** (Yesterday)
   - **Tuần Trước** (Last Week)
   - **Tháng Trước** (Last Month)
   - **Cũ Hơn** (Older) — collapsed by default
3. Each conversation entry shows: first prompt text (truncated to ~60 chars), mode icon (⚔️/⚖️/💬), vote result badge if voted (🏆 A / 🏆 B / 🤝 Hòa / 👎 Tệ / ⭐ 4.2)
4. User clicks a conversation → main area loads full conversation (all turns, responses, vote, Elo reveal if applicable)
5. Past conversations are **read-only after vote** — user cannot re-vote or modify. They can view the full exchange and the model identities (already revealed)

### Searching Conversation History
1. User clicks search box at top of sidebar (placeholder: "Tìm kiếm...")
2. User types search query
3. Sidebar filters conversations in real-time (substring match, case-insensitive, matches against prompt text)
4. Matching conversations displayed; non-matching hidden
5. Clear search (X button or empty field) → full history restored

### Deleting a Conversation
1. User hovers over conversation entry in sidebar
2. "Xóa" button appears (icon or text, right-aligned)
3. User clicks "Xóa"
4. Confirmation toast: "Đã xóa cuộc trò chuyện" (with 5-second undo option)
5. Conversation removed from sidebar; underlying data soft-deleted in backend (not permanently purged)
6. If user clicks "Hoàn tác" within 5 seconds, conversation restored

### Viewing User Stats (Authenticated)
1. Topbar displays vote counter: "🗳️ [N] phiếu" (visible only to authenticated users)
2. Counter increments in real-time after each successful vote (no page refresh needed)
3. User clicks their avatar/name in topbar → dropdown menu shows:
   - Total votes cast (all-time)
   - Vote breakdown: Battle [N] | SBS [N] | Direct [N]
   - Member since: [date]
   - "Đăng Xuất" (Logout)

### Guest History Behavior
1. Guest users see conversation history from current session only (stored in localStorage)
2. History persists across page refreshes (localStorage)
3. After sign-up: guest history migrated to account (per 01-authentication.md)
4. If guest clears localStorage: history lost until they sign up and recover backend-stored data

## 3. Key Behaviors

### History List Rules

| Scenario | Behavior |
|----------|----------|
| No conversations yet | Sidebar shows empty state: "Chưa có cuộc trò chuyện nào" + suggested prompt link |
| 100+ conversations | Show most recent 100; older conversations accessible via "Tải thêm" (Load More) button at bottom |
| Conversation in progress (not yet voted) | Shows in sidebar with "Đang diễn ra" (In Progress) label; no vote badge |
| Conversation from different mode | Mode icon (⚔️/⚖️/💬) distinguishes Battle/SBS/Direct |
| Search with no results | "Không tìm thấy" message in sidebar; search field stays active |

### Vote Result Badges

| Mode | Vote Outcome | Badge Display |
|------|-------------|---------------|
| Battle | A wins | 🏆 A |
| Battle | B wins | 🏆 B |
| Battle | Tie | 🤝 Hòa |
| Battle | Both bad | 👎 Tệ |
| SBS | A wins | 🏆 [Model A Name] |
| SBS | B wins | 🏆 [Model B Name] |
| SBS | Tie / Both bad | 🤝 Hòa / 👎 Tệ |
| Direct | Star rating given | ⭐ [N]/5 |
| Any | Not yet voted | — (no badge) |

### Read-Only Past Conversations

| Element | Visible | Interactive |
|---------|---------|-------------|
| Prompt text (all turns) | ✅ | Read-only |
| Response cards (all turns) | ✅ | Read-only |
| Vote color feedback | ✅ (same green/red scheme) | Read-only |
| Model identities (post-reveal) | ✅ | Read-only |
| Elo deltas | ✅ | Read-only |
| Vote buttons | ❌ Hidden | — |
| Follow-up input | ❌ Hidden | — |
| "Cuộc trò chuyện mới" button | ✅ | Starts new conversation |

### User Stats Counter

| User State | Counter Behavior |
|------------|------------------|
| Guest | Counter not displayed |
| Authenticated, 0 votes | "🗳️ 0 phiếu" |
| Authenticated, votes cast | "🗳️ [N] phiếu" — increments in real-time |
| After logout | Counter hidden; resets to guest view |

## 4. Vietnamese UI Labels

| Element | Vietnamese | Context |
|---------|-----------|---------|
| Search placeholder | Tìm kiếm... | Sidebar search box |
| Date groups | Hôm Nay, Hôm Qua, Tuần Trước, Tháng Trước, Cũ Hơn | History grouping |
| Empty state | Chưa có cuộc trò chuyện nào | No conversations |
| Delete button | Xóa | Hover-reveal on conversation |
| Delete confirmation | Đã xóa cuộc trò chuyện | Toast message |
| Undo | Hoàn tác | Undo delete (5s window) |
| Load more | Tải thêm | Pagination at 100+ items |
| In progress | Đang diễn ra | Unfinished conversation |
| No search results | Không tìm thấy | Search empty state |
| Vote counter | 🗳️ [N] phiếu | Topbar (authenticated) |
| Stats: total | Tổng phiếu bình chọn: [N] | Dropdown menu |
| Stats: breakdown | Đấu Trường: [N] · Song Song: [N] · Trực Tiếp: [N] | Dropdown menu |
| Stats: member since | Thành viên từ: [ngày/tháng/năm] | Dropdown menu |

## 5. Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User deletes all conversations | Sidebar shows empty state; welcome screen with suggested prompts |
| User deletes conversation then clicks undo | Conversation restored to sidebar in original position |
| Undo timer expires (5s) | Soft-delete finalized; conversation no longer recoverable via UI |
| User searches while conversations are loading | Search applied to loaded items; results update as more items load |
| Guest with 3 battles clears localStorage | History lost in sidebar; backend retains data; recoverable on sign-up |
| User views Battle history → model names visible | Model identities always shown in history (reveal already happened during vote) |
| User on mobile taps conversation in drawer | Drawer closes; conversation loads in main area |
| Vote counter reaches 10,000+ | Display as "🗳️ 10,000+ phiếu" (comma-formatted) |

## 6. Acceptance Criteria

### Chat History
- [ ] Sidebar displays conversation history grouped by date (Hôm Nay, Hôm Qua, Tuần Trước, Tháng Trước, Cũ Hơn)
- [ ] Each entry shows: truncated prompt (~60 chars), mode icon (⚔️/⚖️/💬), vote result badge
- [ ] Clicking conversation loads full read-only view (all turns, responses, vote colors, model names, Elo deltas)
- [ ] Vote buttons and follow-up input hidden on past conversations
- [ ] "Cuộc trò chuyện mới" button visible on past conversation view
- [ ] Search filters history by prompt substring (real-time, case-insensitive)
- [ ] Search empty state shows "Không tìm thấy"
- [ ] Delete button appears on hover; click triggers soft-delete with 5s undo toast
- [ ] Empty history shows "Chưa có cuộc trò chuyện nào"
- [ ] 100+ conversations show "Tải thêm" button for pagination
- [ ] Guest history stored in localStorage; migrated to account on sign-up

### User Stats
- [ ] Topbar vote counter ("🗳️ [N] phiếu") visible for authenticated users only
- [ ] Counter increments in real-time after vote submission
- [ ] Avatar dropdown shows: total votes, breakdown by mode, member since date, logout
- [ ] Counter hidden for guest users
- [ ] Numbers formatted with commas (1,000+)

## 7. Out of Scope

- Conversation sharing / export (P1+)
- Search by date range or category filter (P1+; substring only for P0)
- Conversation pagination with infinite scroll (P1+; "Load More" button for P0)
- User profile page with detailed analytics (P1+)
- Contribution streak / gamification badges (P1+)
- Conversation pinning or favorites (P1+)
