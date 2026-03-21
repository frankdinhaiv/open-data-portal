# Arena UI Prototype — Approach Document

**Date:** March 8, 2026
**Author:** Hung / AIV
**Status:** Draft
**Type:** UI Prototype (frontend-only, mock data)
**Tech:** Self-contained HTML/CSS/JS single file

---

## 1. Objective

Build a clickable UI prototype of the Vietnamese GenAI Arena to validate the core voting experience, navigation flow, and leaderboard display — before investing in backend infrastructure. Mock LLM responses allow fast iteration on UX without API costs or latency.

**What this prototype IS:**
- A functional frontend that simulates the full Arena experience
- Usable for stakeholder reviews, user testing, and design validation
- A reference for engineering when building the real thing

**What this prototype IS NOT:**
- Not connected to real LLMs (all responses are pre-written mocks)
- Not calculating real Elo scores (display only)
- Not handling auth, persistence, or anti-spam

---

## 2. Three Battle Modes

### Mode 1: Battle (Blind Pairwise) — Core Experience

The signature Arena interaction. Modeled directly on Arena.ai's blind battle.

**Flow:**
1. User lands on Arena → sees prompt input area
2. User types a Vietnamese prompt (or picks from suggested prompts)
3. Two anonymous responses appear side-by-side ("Model A" / "Model B")
4. User votes: **A is better** | **B is better** | **Tie** | **Both bad**
5. After voting → model identities revealed + Elo impact shown
6. "New Battle" button resets for next round

**Key UX decisions:**
- Responses stream in simultaneously (simulated typing effect for realism)
- No model names, logos, or hints visible before voting
- Vote buttons are prominent — this is THE action we want
- Post-vote reveal is a "moment of delight" — show model names with brief stats
- Track vote count in session (e.g., "You've judged 5 battles today")

**Mock data needed:**
- 10-15 pre-written prompt/response pairs covering diverse Vietnamese topics
- Each pair has two responses of varying quality (clear winner, close call, both good, both bad)
- Topics: general knowledge, Vietnamese culture, creative writing, code, reasoning

### Mode 2: Side-by-Side (Choose Models)

User picks two specific models to compare head-to-head.

**Flow:**
1. User selects Model A from dropdown (e.g., "GPT-4o")
2. User selects Model B from dropdown (e.g., "Gemini 2.5 Pro")
3. User types a prompt
4. Both responses appear side-by-side (model names visible)
5. User votes: **A is better** | **B is better** | **Tie** | **Both bad**
6. Vote recorded, user can change models or prompt

**Key UX decisions:**
- Model dropdown shows name + current Elo rank + provider badge
- Allow "Random" option for model selection
- Responses labeled with model names (no blindness in this mode)
- Still collect preference votes — feeds into ranking data

**Mock data needed:**
- 8-10 model entries with names, Elo scores, provider info
- Pre-written responses mapped to specific model pairs

### Mode 3: Direct Chat (Single Model)

User interacts with one model and rates the response quality.

**Flow:**
1. User selects a model from dropdown (or "Random")
2. User types a prompt
3. Single response appears
4. User rates: ⭐ 1-5 stars or 👍/👎
5. Optional: tag response qualities (accurate, fluent, culturally appropriate, etc.)
6. User can continue chatting (multi-turn) or switch models

**Key UX decisions:**
- Simpler interface — single response pane, not split view
- Quality tags help collect structured feedback beyond just good/bad
- Multi-turn support (conversation history visible)
- "Try another model with same prompt" shortcut for quick comparison

**Mock data needed:**
- Reuse response pool from Battle mode, mapped per model
- 3-5 multi-turn conversation examples

---

## 3. Arena Leaderboard

Persistent view accessible from all modes — the "scoreboard."

**Sections:**

### Main Leaderboard Table
| Rank | Model | Elo Rating | 95% CI | Votes | Organization | License |
|------|-------|-----------|--------|-------|-------------|---------|
| 1 | GPT-4o | 1285 | +12/-11 | 8,234 | OpenAI | Proprietary |
| 2 | Claude 3.5 Sonnet | 1271 | +9/-10 | 7,891 | Anthropic | Proprietary |
| ... | ... | ... | ... | ... | ... | ... |

**Features:**
- Sortable by any column
- Filter: All / Open Source / Proprietary
- Filter: By provider (OpenAI, Google, Anthropic, Meta, Vietnamese models)
- Search by model name
- "Vietnamese Intelligence Index" (VIX) composite score column
- Last updated timestamp
- Category tabs: Overall | Reasoning | Creative | Code | Cultural

### Model Detail Card (click any row)
- Elo history chart (line graph over time)
- Win rate vs. top 5 competitors
- Category breakdown (radar chart)
- Sample battles this model was in

---

## 4. Navigation & Layout

```
┌──────────────────────────────────────────────┐
│  🇻🇳 Vietnamese GenAI Arena        [VN|EN]   │
├──────────────────────────────────────────────┤
│  [⚔️ Battle]  [🔀 Side-by-Side]  [💬 Direct]  │
│  [🏆 Leaderboard]                             │
├──────────────────────────────────────────────┤
│                                              │
│              Active Mode View                │
│                                              │
│                                              │
├──────────────────────────────────────────────┤
│  Battles today: 42,391 | Your votes: 5      │
│  Powered by AIV · Vietnamese-first AI eval   │
└──────────────────────────────────────────────┘
```

**Design principles:**
- Vietnamese-first: all default UI text in Vietnamese, EN toggle available
- Clean, minimal — let the responses be the focus
- Mobile-responsive (many Vietnamese users are mobile-first)
- Dark mode default (matches developer/researcher audience expectation)
- ViGen branding: logo, colors, tagline

---

## 5. Suggested Vietnamese Prompts

Pre-loaded prompt suggestions to lower the barrier to first vote:

| Category | Example Prompt |
|----------|---------------|
| General | "Giải thích blockchain cho học sinh lớp 10" |
| Cultural | "Viết bài thơ lục bát về mùa xuân Hà Nội" |
| Reasoning | "Tại sao kinh tế Việt Nam tăng trưởng nhanh trong 10 năm qua?" |
| Creative | "Sáng tác một câu chuyện ngắn về Sài Gòn năm 2050" |
| Code | "Viết hàm Python sắp xếp danh sách tên tiếng Việt theo bảng chữ cái" |
| Tone test | "Viết email xin nghỉ phép gửi sếp, giọng lịch sự" |

---

## 6. Mock Data Strategy

Since this is UI-only, we need realistic mock data:

**Approach:** Pre-write 15-20 prompt/response sets with varying quality levels.

Each set includes:
- 1 Vietnamese prompt
- 2-4 responses (attributed to different mock models)
- Quality tags (which is better, why)
- Category label

**Mock model roster (8-10 models):**
- GPT-4o, GPT-4o-mini
- Claude 3.5 Sonnet, Claude 3 Haiku
- Gemini 2.5 Pro, Gemini 2.5 Flash
- Llama 3.1 70B
- Vistral (Vietnamese fine-tune)
- PhoGPT
- Qwen 2.5 72B

**Elo scores:** Pre-assigned, static. Reflect plausible rankings for Vietnamese performance.

---

## 7. What We're Validating

| Question | How we test it |
|----------|---------------|
| Is the blind voting flow intuitive? | Battle mode — can users vote without instructions? |
| Does the post-vote reveal feel rewarding? | Watch for reactions at identity reveal |
| Is the leaderboard scannable? | Can users find "best open-source model for Vietnamese" in <10 sec? |
| Do suggested prompts drive engagement? | Track which prompts get clicked |
| Is the Side-by-Side mode useful? | Do users choose it, or default to Battle? |
| Does Direct mode add value? | Or is it just a chatbot wrapper? |
| Mobile experience? | Test on phone-width viewport |

---

## 8. Build Plan

| Step | What | Output |
|------|------|--------|
| 1 | Write mock prompt/response data (JSON) | Embedded data in HTML |
| 2 | Build Battle mode (core flow) | Prompt → dual response → vote → reveal |
| 3 | Build Side-by-Side mode | Model selectors + comparison view |
| 4 | Build Direct mode | Single model chat + rating |
| 5 | Build Leaderboard view | Table + filters + model cards |
| 6 | Add navigation, branding, responsive | Full prototype polished |
| 7 | Vietnamese language pass | All UI strings in Vietnamese |
| 8 | Stakeholder review | Share HTML file for feedback |

**Estimated effort:** 1-2 sessions to build the full prototype.

---

## 9. Differences from Arena.ai

| Aspect | Arena.ai | ViGen Arena (ours) |
|--------|----------|-------------------|
| Language focus | English-first, 7 languages | Vietnamese-first |
| Prompt suggestions | Generic | Vietnamese-cultural (thơ, tục ngữ, tone) |
| Cultural eval | None | Tone, politeness, regional dialect awareness |
| Scoring | Elo + Bradley-Terry | Same, plus VIX composite |
| Benchmarks | Human votes only | Human votes + 6 automated benchmarks |
| Community | Global | Vietnamese practitioners, researchers, students |
| Branding | Neutral/academic | Vietnamese identity (Ngựa Sắt Con mascot) |

---

## 10. Open Questions

1. **Voting rubric:** Should we guide voters on *what* to evaluate (accuracy vs. fluency vs. cultural fit)? Or keep it simple like Arena.ai (just "which is better")?
2. **Vietnamese-specific eval criteria:** Should we add optional tags like "tự nhiên" (natural), "chính xác" (accurate), "phù hợp văn hóa" (culturally appropriate)?
3. **Model anonymity in Battle mode:** Do we reveal both models, or only the winner? Arena.ai reveals both.
4. **Anti-gaming for prototype:** Not needed for mock, but worth noting the approach for production (rate limiting, VNeID verification, vote quality scoring).
5. **Branding:** Use ViGen Arena branding in prototype, or keep it generic for now?

---

*Next step: Review this approach → then build the HTML prototype.*
