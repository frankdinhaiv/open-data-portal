# G3B: Core Layout & Vietnamese-First UI

Covers: P0-5 (Vietnamese-First UI), P0-10 (Mobile-Responsive Design)
Date: March 12, 2026
Status: G3B Design Review
Depends on: 00-data-model-api.md (Conversation, Prompt, Model entities), 01-authentication.md (User session + guest sessionId)
Visual ref: ../prototype/arena-prototype.html

## 1. What This Feature Does

Defines the app shell structure, navigation patterns, sidebar layout, topbar elements, and responsive behavior across desktop, tablet, and mobile. All interactive text (buttons, labels, messages) is Vietnamese. This spec establishes LAYOUT STRUCTURE and BEHAVIOR RULES — not visual design (hi-fi mockups are design team's responsibility).

## 2. App Architecture

The app has two main regions: a persistent **Topbar** across the top, and below it a **Sidebar** (left) alongside the **Main Content Area** (right). On mobile, the sidebar collapses into a slide-out drawer with a bottom navigation bar.

### Topbar
- **Left:** ViGen Arena logo + link to home
- **Center:** Vote counter (e.g., "Bạn đã bình chọn: 127 lần") — visible only if authenticated
- **Right:** 
  - Tabs: "Đấu Trường" (Arena) | "Bảng Xếp Hạng" (Leaderboard)
  - User avatar (authenticated) or "Đăng Nhập" button (guest)
  - Hamburger icon (mobile/tablet only)

### Sidebar (Desktop)
- **Search bar:** "Tìm kiếm..." placeholder, filters conversation history by prompt text
- **Mode selector:**
  - "Đấu Trường" (Battle Mode)
  - "Song Song" (Side-by-Side Mode)
  - "Trực Tiếp" (Direct Rating Mode)
- **Conversation history:**
  - Grouped by date ("Hôm Nay", "Hôm Qua", "Tuần Trước", "Tháng Trước")
  - Each conversation shows truncated prompt (50 chars) + timestamp
  - Click to review conversation
  - Hover shows full prompt in tooltip
  - Delete icon (hover-reveal) removes from history

### Main Content Area (Desktop)
- **Battle Mode:** Side-by-side responses + voting UI (pairwise win/loss/draw buttons)
- **SBS Mode:** Responses displayed vertically + voting UI
- **Direct Rating Mode:** Single response + 1-10 rating scale
- **Leaderboard:** Table of models sorted by Elo; expandable rows showing head-to-head matchups
- **Conversation History:** Grid/list of past battles with prompts, responses, user's vote, and timestamp

### Suggested Prompts (Welcome Screen)
- When user first visits or clicks "Mới" button
- Display exactly 3 random prompts from seed dataset
- Each prompt card shows: prompt text only (no category chips — categories are leaderboard-only filters)
- Click any prompt to initiate battle with that prompt
- Randomization occurs on every page load (not hard-coded)
- Card formatting: light background, hover shadow, clickable

## 3. Vietnamese UI Labels

| Location | Label (Vietnamese) | Context |
|----------|-------------------|---------|
| Topbar Mode Tabs | Đấu Trường \| Bảng Xếp Hạng | Navigation between Arena and Leaderboard |
| Sidebar Mode Selector | Đấu Trường, Song Song, Trực Tiếp | Select battle mode |
| Sidebar Search | Tìm kiếm... | Placeholder in conversation search box |
| Sidebar History Groups | Hôm Nay, Hôm Qua, Tuần Trước, Tháng Trước | Date grouping |
| Conversation Action | Xóa | Delete button (hover-reveal) |
| Battle Voting | Thắng, Thua, Hòa | Win, Lose, Draw buttons |
| Direct Rating | Đánh Giá: [1-10] | Rating label |
| Welcome Button | Mới | Refresh to see new suggested prompts |
| Auth Modal | Đăng Nhập Bằng Google, Đăng Ký, Tiếp Tục Là Khách | Google login, sign up, continue as guest |
| Topbar Guest | Đăng Nhập | Login button for guest users |
| Topbar Auth | [User Name], Đăng Xuất | Authenticated user menu, logout |
| Vote Counter | Bạn đã bình chọn: [N] lần | Authenticated user only |
| ~~Prompt Categories~~ | *(Removed from P0 — categories are leaderboard-only filters in P1-2. Auto-classification approach TBD by engineering.)* | — |
| Error Message (4th battle) | Vui lòng đăng ký để tiếp tục bình chọn | Gate message before sign-up modal |

## 4. Navigation & Interaction Flow

### Mode Switching
- User selects mode from topbar dropdown ("Đấu Trường", "Song Song", "Trực Tiếp")
- Selected mode highlighted/active state
- Clicking mode clears current battle and resets to welcome/prompt selector
- If user is on the leaderboard view, selecting a mode navigates back to the arena view automatically
- Mode choice persisted in localStorage (`vigen_selected_mode`)

### Conversation History Navigation
- User clicks past conversation in sidebar
- Main area loads that conversation (prompts, responses, user's vote, timestamp)
- Conversation marked as "current" in sidebar (highlight/bold)
- User can vote again on same conversation (creates new vote, doesn't overwrite old)

### Leaderboard Navigation
- User clicks "Bảng Xếp Hạng" tab in topbar
- Main area shows Elo rankings table
- Columns: Rank, Model Name, Elo Rating, Matches, Win %, Draw %
- Rows clickable → expand to show head-to-head stats against other models
- Sorting: default by Elo (descending); user can click columns to re-sort

### Responsive Behavior

| Breakpoint | Sidebar | Topbar | Main Area | Bottom Nav |
|------------|---------|--------|-----------|-----------|
| Desktop | Visible (fixed) | Full width | Expands to fill | None |
| Tablet (768px+) | Collapsible drawer | Full width | Expands when sidebar closed | None |
| Mobile (<768px) | Hidden by default | Compact (logo + hamburger only) | Full width | Bottom nav with icons |

### Mobile/Tablet (Bottom Navigation)
- Bottom nav bar appears with 4 icons:
  - Home (Trang Chủ)
  - Leaderboard (Bảng Xếp Hạng)
  - History (Lịch Sử)
  - User / Login (Tài Khoản)
- Clicking each icon navigates to that section
- No sidebar visible; hamburger opens slide-out drawer with mode selector + search

### Tablet Sidebar Drawer
- Hamburger icon in topbar opens slide-out drawer from left
- Drawer shows: mode selector + search + conversation history
- Drawer overlays main content (semi-transparent overlay behind drawer)
- Clicking outside drawer or on a conversation closes drawer and navigates

## 5. Responsive Breakpoints

| Device | Width | Sidebar | Topbar Layout | Notes |
|--------|-------|---------|---------------|-------|
| Desktop | >= 1024px | Visible, fixed width (~300px) | Full, all elements visible | Baseline layout |
| Tablet | 768px - 1023px | Hidden by default, collapsible drawer | Compact: logo + hamburger + right nav | Drawer on hamburger click |
| Mobile | < 768px | Hidden, hamburger drawer | Minimal: logo + hamburger | Bottom nav + drawer |

## 6. Key Behaviors

### Conversation History
- Max 100 conversations displayed (oldest archived)
- Search filters by prompt text (client-side, substring match)
- Delete removes from history (no recovery)
- Hovering on conversation shows "Xóa" button
- Clicking conversation loads it in main area (non-destructive; doesn't create new conversation)

### Mode Persistence
- Selected mode stored in localStorage
- On page reload, user returns to last selected mode
- Mode applies globally (same mode used for all future battles until changed)

### Vote Counter (Authenticated Users)
- Increments after each successful vote submission
- Displays "Bạn đã bình chọn: [N] lần"
- Updates in real-time (no page refresh needed)
- Visible only to authenticated users

### Suggested Prompts
- Displayed on welcome screen or when user clicks "Mới" button
- Exactly 3 random prompts from seed dataset (fixed count, not variable)
- Randomization happens on every load (not hard-coded; backend `/api/prompts?random=true&count=3`)
- Each prompt card clickable → initiates battle with that prompt
- Prompt cards show text only (no category chips — categories are leaderboard-only filters)

### Topbar Avatar / User Menu
- Authenticated users see: [User Name] + avatar image
- Clicking name/avatar opens dropdown menu with "Đăng Xuất" option
- Logout clears session; user reverts to guest mode
- Guest users see: "Đăng Nhập" button → opens sign-up modal

## 7. Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User deletes all conversation history | Sidebar shows empty state ("Chưa có cuộc trò chuyện nào"); welcome screen displays suggested prompts |
| User switches from battle mode to SBS mid-conversation | Current conversation discarded; main area resets to welcome; mode changed in sidebar |
| User searches for prompt with no results | Search results empty; sidebar shows "Không tìm thấy"; user can clear search or try new query |
| Sidebar conversation list exceeds 100 items | Oldest conversations archived; new conversations always visible; pagination optional (P1+) |
| User navigates to leaderboard while vote pending | Vote submission continues in background; leaderboard loads while request completes |
| Mobile user taps hamburger, then taps conversation | Drawer closes; conversation loads; main area updates |
| User on tablet switches to portrait mode while drawer open | Drawer may re-layout or remain open depending on design; behavior documented |
| Unauthenticated user views vote counter | Vote counter not displayed; only appears after login |
| User clears localStorage while on app | guest_sessionId lost; next battle generates new sessionId; conversation history lost until signup |

## 8. Theme & Styling

- **Typography:** Inter font family, system fallback
- **Color Palette:** Light elegant (white/gray background, blue accent for active states, borders in light gray)
- **Spacing:** Consistent 8px grid (margins, padding)
- **Buttons:** Rounded corners (4-8px), hover shadow on desktop
- **Icons:** Material Design or custom, 24px baseline
- **Dark Mode:** Not in G3B scope; light theme only

## 9. Acceptance Criteria

- [ ] Topbar contains logo, vote counter (authenticated only), navigation tabs, user avatar/login button
- [ ] Sidebar displays conversation history grouped by date (Hôm Nay, Hôm Qua, Tuần Trước, Tháng Trước)
- [ ] Sidebar search filters history by prompt text (substring match, case-insensitive)
- [ ] Sidebar mode selector shows three options (Đấu Trường, Song Song, Trực Tiếp)
- [ ] Selected mode highlighted and persisted in localStorage
- [ ] Main area loads conversation history when past conversation clicked
- [ ] Suggested prompts display exactly 3 random prompts on welcome screen (no category chips)
- [ ] Suggested prompts randomized on every load via `/api/prompts?random=true&count=3`
- [ ] Suggested prompt cards clickable; initiate battle with selected prompt
- [ ] Mode selector navigates back to arena view when user is on leaderboard
- [ ] Leaderboard shows Elo rankings, win %, draw %, expandable head-to-head matchups
- [ ] Conversation history shows delete button on hover; delete removes from sidebar
- [ ] Vote counter increments after successful vote submission (authenticated only)
- [ ] Topbar avatar menu includes Đăng Xuất option
- [ ] Logout clears session token; user reverts to guest mode
- [ ] Mobile layout (< 768px) hides sidebar, shows bottom nav with 4 sections
- [ ] Tablet layout (768px-1023px) shows hamburger to reveal collapsible drawer
- [ ] Drawer overlay semi-transparent; closes on outside click or navigation
- [ ] All Vietnamese labels match spec; no English UI copy (except logos)
- [ ] Theme is light elegant (white/gray, blue accent, Inter font)
- [ ] Responsive behavior tested at 320px (mobile), 768px (tablet), 1024px (desktop) breakpoints

## 10. Out of Scope

- Dark mode (P1+)
- Pagination of conversation history (P1+)
- Search filters by category / date range (P1+; substring search only for G3B)
- User profile customization (P1+)
- Conversation sharing / export (P1+)
- Mobile app (web-responsive only for G3B)
