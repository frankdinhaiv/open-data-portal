# Core Layout

## Overview

Shared navigation, sidebar, topbar, and responsive behavior for the Open Data Portal. All interactive text is Vietnamese. This spec covers layout structure and behavior — not visual design (hi-fi mockups are design team's responsibility).

## App Architecture

Two main regions: persistent **Topbar** across the top, and below it a **Sidebar** (left) alongside the **Main Content Area** (right). On mobile, sidebar collapses into a slide-out drawer with bottom navigation.

## Topbar

| Position | Element | Notes |
|----------|---------|-------|
| Left | ViGen Arena logo + home link | |
| Center | Vote counter ("Bạn đã bình chọn: N lần") | Authenticated users only; real-time update |
| Right | Tabs: "Đấu Trường" \| "Bảng Xếp Hạng" | Arena \| Leaderboard navigation |
| Right | User avatar or "Đăng Nhập" button | Auth state dependent |
| Right | Hamburger icon | Mobile/tablet only |

## Sidebar

### Search Bar
- Placeholder: "Tìm kiếm..."
- Filters conversation history by prompt text (client-side substring match, case-insensitive)

### Mode Selector
- "Đấu Trường" (Battle Mode)
- "Song Song" (Side-by-Side Mode)
- "Trực Tiếp" (Direct Rating Mode)
- Selected mode highlighted; persisted in localStorage (`vigen_selected_mode`)
- Switching mode clears current battle and resets to welcome screen

### Conversation History
- Grouped by date: "Hôm Nay", "Hôm Qua", "Tuần Trước", "Tháng Trước"
- Each entry: truncated prompt (50 chars) + timestamp
- Click to review conversation; hover shows full prompt tooltip
- Delete icon on hover ("Xóa"); removes from history
- Max 100 conversations displayed (oldest archived)

### Suggested Prompts (Welcome Screen)
- Displayed on first visit or "Mới" button click
- Exactly 3 random prompts from seed dataset via API (`/api/prompts?random=true&count=3`)
- Prompt cards: text only (no category chips — categories are leaderboard-only in P1-2)
- Click to initiate battle with that prompt
- Randomized on every page load (not hard-coded)

## Responsive Behavior

| Breakpoint | Sidebar | Topbar | Main Area | Bottom Nav |
|------------|---------|--------|-----------|-----------|
| Desktop (≥ 1024px) | Visible, fixed ~300px | Full width, all elements | Fills remaining space | None |
| Tablet (768-1023px) | Hidden, collapsible drawer | Compact: logo + hamburger + right nav | Expands when sidebar closed | None |
| Mobile (< 768px) | Hidden, hamburger drawer | Minimal: logo + hamburger | Full width | 4 icons: Trang Chủ, Bảng Xếp Hạng, Lịch Sử, Tài Khoản |

### Mobile Bottom Navigation
- Home (Trang Chủ), Leaderboard (Bảng Xếp Hạng), History (Lịch Sử), User/Login (Tài Khoản)
- Hamburger opens slide-out drawer with mode selector + search

### Tablet Drawer
- Opens from left on hamburger click
- Shows mode selector + search + conversation history
- Semi-transparent overlay behind drawer
- Closes on outside click or navigation

## Vietnamese UI Labels

| Location | Label | Context |
|----------|-------|---------|
| Topbar Tabs | Đấu Trường \| Bảng Xếp Hạng | Arena \| Leaderboard |
| Mode Selector | Đấu Trường, Song Song, Trực Tiếp | Battle modes |
| Search | Tìm kiếm... | Conversation search |
| History Groups | Hôm Nay, Hôm Qua, Tuần Trước, Tháng Trước | Date grouping |
| Delete | Xóa | Hover-reveal button |
| Battle Voting | Thắng, Thua, Hòa | Win, Lose, Draw |
| Direct Rating | Đánh Giá: [1-10] | Rating label |
| Welcome | Mới | Refresh prompts button |
| Auth Modal | Đăng Nhập Bằng Google, Đăng Ký, Tiếp Tục Là Khách | Login, signup, guest |
| Guest Topbar | Đăng Nhập | Login button |
| Auth Topbar | [User Name], Đăng Xuất | User menu, logout |
| Vote Counter | Bạn đã bình chọn: [N] lần | Auth only |
| Gate Message | Vui lòng đăng ký để tiếp tục bình chọn | 4th battle gate |

## Theme & Styling

- Typography: Inter font family, system fallback
- Color: Light elegant (white/gray background, blue accent, light gray borders)
- Spacing: 8px grid
- Buttons: Rounded corners (4-8px), hover shadow
- Icons: Material Design or custom, 24px baseline
- Dark Mode: Not in scope (P1+)

## Design Decisions

- **Vietnamese-first UI** — All interactive text in Vietnamese, English for logos only. Product market decision.
- **Three battle modes as first-class sidebar navigation** — Mode is a top-level UX concept, not buried in settings.
- **No category chips on chat screens at P0** — Categories deferred to leaderboard filtering in P1-2. Auto-classification approach TBD by engineering.
- **3 random suggested prompts per page load via API** — Randomization is live to ensure diversity; hard-coding rejected.
- **Conversation history capped at 100 items** — Practical limit for sidebar performance; pagination deferred to P1+.
- **Mode persisted in localStorage** — User preference maintained across sessions without auth.
- **Light theme only at P0** — Dark mode deferred to P1+.
- **Mobile breakpoint at 768px** — Sidebar replaced by bottom nav + hamburger drawer.
- **Conversation search is client-side substring match** — Server-side search with filters deferred to P1+.

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| All conversations deleted | Empty state: "Chưa có cuộc trò chuyện nào"; welcome screen shows |
| Mode switch mid-conversation | Current conversation discarded; resets to welcome |
| Search with no results | "Không tìm thấy"; user can clear search |
| History exceeds 100 items | Oldest archived; new always visible |
| Navigate to leaderboard during pending vote | Vote continues in background; leaderboard loads |
| Mobile hamburger → conversation tap | Drawer closes; conversation loads |

## Out of Scope

- Dark mode (P1+)
- Conversation history pagination (P1+)
- Search by category/date range (P1+)
- User profile customization (P1+)
- Conversation sharing/export (P1+)
- Mobile app (web-responsive only)
