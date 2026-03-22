# ViGen Arena — Frontend Build Progress

## Status: Screen 1 (SBS Welcome) — ~95% Figma Match
**Date:** 2026-03-22
**Branch:** `aiv-open-data-portal`
**Worktree:** `.worktrees/aiv-open-data-portal/frontend/`

---

## What's Done

### Screen 1: Side-by-side Welcome (`2:10661`) — DONE
All layers matched 1:1 against Figma CSS:

| Layer | Figma Node | Status |
|-------|-----------|--------|
| Top-nav | `2:10740` | ✅ Logo 141×70, nav 16px/24px gap, CSS gradient glow, buttons 16px SemiBold rounded-55 |
| Nav bar active glow | `2:10759` | ✅ CSS gradient `blur(4px)` + `matrix(1,0,0,-1,0,0)`, not SVG |
| Sidebar (expanded) | `2:10666` | ✅ px-8, nav 40px/gap-4/rounded-6, icon 24×24, history 14px/gap-16 |
| Sidebar (collapsed) | `2:13204` | ✅ 56px wide, icon-only buttons, main content responds |
| Trong Dong | `2:10662` | ✅ 1126×1126, left:314 top:-118, opacity:0.25, radial mask |
| Mode selector | `2:10694` | ✅ 209×40, 14px SemiBold, model avatars 24×24 rounded-12 |
| Heading | `2:10711` | ✅ Space Grotesk 48px gold gradient |
| Subtitle | `2:10712` | ✅ 20px Regular, opacity 0.75 |
| ChatInput | `2:10714` | ✅ 600×104, CSS gradient glow, shadow-lg, gap-16 |
| Prompt cards | `2:10726` | ✅ 317×92, pl-8 pr-16 py-16, dashed #B2CCFF |
| Footer | `2:10739` | ✅ gradient-to-top, 1200px content, 12 gold dots, 62px cityscape |
| Gradient divider | `2:10692` | ✅ 1px gradient (transparent→#5281DD→transparent) |

### Design System
- Fonts: Be Vietnam Pro (400,500,600,700) + Space Grotesk (400)
- Background: #002266
- Glass effect: rgba(255,255,255,0.1) bg + border + backdrop-blur
- Gold gradient: linear-gradient(95.63deg, #FFB200, #FFDE92)
- All CSS custom properties in `index.css`

### Accessibility (6 fixes applied)
- `lang="vi"` on HTML
- `<main>` landmark
- `aria-hidden` on decorative images
- `min-h-[44px]` touch targets on topbar
- Footer text contrast increased
- Model avatar alt text

### Infrastructure
- TypeScript compiles clean (`npx tsc --noEmit`)
- Vite build passes
- Fallback mock data (7 models, 5 history items) — works without backend
- Sidebar collapsed state in Zustand store
- Page title: "ViGen Arena — Đấu trường AI Việt Nam"

---

## What's NOT Committed Yet
All changes are unstaged. 20 files modified, 6 new components, 25+ downloaded assets.

---

## Next Steps

### Priority 1: Commit Screen 1
- [ ] Review the full diff one more time
- [ ] Commit all Screen 1 work

### Priority 2: Screen 2 — Side-by-side Compare (`2:11663`)
Components already built but NOT visually verified:
- [ ] `CompareView.tsx` — composite layout
- [ ] `ResponsePanel.tsx` — glass card with model name + response text + action buttons
- [ ] `UserMessage.tsx` — right-aligned gradient bubble
- [ ] `VoteBar.tsx` — 4 vote buttons (model A tốt hơn / Hoà / Cả hai đều tệ / model B tốt hơn)
- [ ] `DualResponsePanel.tsx` — two ResponsePanels side by side

**Figma reference:** `2:11663` (ViGen - Arena / Side-by-side / Compare)
**Key CSS to extract:**
- Response card: backdrop-blur-4, bg overlay rgba(255,255,255,0.1), border rgba(255,255,255,0.1)
- User message: gradient #2970FF → #194399, rounded-16
- Vote buttons: border solid white, rounded-8, 14px SemiBold

### Priority 3: Screen 3 — Battle Compare (`2:11789`)
Same layout as Screen 2 but with anonymous labels:
- [ ] Response panels show "Model A" / "Model B" instead of real names
- [ ] Vote buttons: "Bên trái tốt hơn" / "Bên phải tốt hơn"
- [ ] Mode selector shows "Đấu trường AI" only (no model dropdowns)

**Figma reference:** `2:11789` (ViGen - Arena / Battle / Compare)

### Priority 4: Remaining Screens
- [ ] Vote state screens (`2:12228` — `2:13079`) — selecting/voted states
- [ ] Direct Chat mode (`2:11901`, `2:12112`)
- [ ] Error state (`2:12011`)
- [ ] Leaderboard (`2:10766`)
- [ ] CTA page (`2:13315`)

### Priority 5: Polish
- [ ] Mode dropdown menu with descriptions (visible in collapsed nav Figma `2:13199`)
- [ ] Mobile responsive breakpoints
- [ ] Connect to real backend API
- [ ] Remove sample/mock data

---

## Figma File
- **URL:** https://www.figma.com/design/71W6Fr51bo2z1HUB53RBZj/Arena
- **File key:** `71W6Fr51bo2z1HUB53RBZj`
- **17 screens** total on Page 1 (`0:1`)

## How to Run
```bash
cd .worktrees/aiv-open-data-portal/frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

## Key Files
```
frontend/src/
├── App.tsx                          # Layout shell + Trong Dong
├── index.css                        # Design system tokens
├── hooks/useStore.ts                # Zustand state
├── components/
│   ├── layout/
│   │   ├── Topbar.tsx               # Fixed top nav
│   │   ├── Sidebar.tsx              # Collapsible sidebar
│   │   ├── Footer.tsx               # Scrollable footer
│   │   └── ModeSelector.tsx         # SBS/Battle/Direct mode bar
│   ├── arena/
│   │   ├── WelcomeScreen.tsx        # Welcome state (heading + input + cards)
│   │   ├── ChatInput.tsx            # Glass input with gradient glow
│   │   ├── PromptCard.tsx           # Suggestion card
│   │   ├── CompareView.tsx          # Post-submit compare layout
│   │   ├── ResponsePanel.tsx        # Model response card
│   │   ├── UserMessage.tsx          # User message bubble
│   │   ├── VoteBar.tsx              # Vote buttons
│   │   ├── DualResponsePanel.tsx    # Two panels + vote badges
│   │   └── EloReveal.tsx            # Elo score reveal
│   └── auth/AuthModal.tsx           # Dark-themed auth modal
├── pages/
│   ├── ArenaPage.tsx                # Arena page with mode switching
│   └── LeaderboardPage.tsx          # Leaderboard (not yet redesigned)
└── assets/                          # Downloaded from Figma MCP
    ├── icons/      (25 SVGs)
    ├── logos/      (vigen-logo.svg, vigen-tagline.svg)
    ├── backgrounds/ (bottom-bg.svg)
    ├── decorative/  (trong-dong.svg, prompt-icon.png, chatbox-glow.svg)
    └── models/      (gpt.png, deepseek.png)
```
