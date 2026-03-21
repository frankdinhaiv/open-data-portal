# ViGen Arena — Battle Mode PRD

## 1. Executive Summary

Vietnamese GenAI models are multiplying — but no one in Vietnam has a trusted, community-driven way to compare them head-to-head on Vietnamese text tasks. Battle Mode is the core evaluation experience in ViGen Arena: users submit a Vietnamese prompt, receive blind responses from two anonymous models, and vote for the better one. Votes feed an Elo rating system that produces a transparent, statistically rigorous Vietnamese LLM leaderboard — giving researchers, developers, and the Vietnamese AI community a credible benchmark that doesn't exist today.

---

## 2. Problem Statement (G1)

### G1 Statement
Vietnamese AI practitioners, researchers, and developers have no community-driven, statistically valid way to compare the quality of large language models on Vietnamese text tasks — forcing them to rely on English-centric benchmarks (MMLU, MT-Bench), vendor self-reported scores, or personal anecdote.

### Sub-G1s
- English benchmarks don't test Vietnamese fluency, cultural context, or tonal accuracy
- Vendor-published benchmarks are self-selected and lack independent verification
- No open Vietnamese human-preference dataset exists for RLHF or evaluation research
- Individual model trials are time-consuming and lack the sample size for statistical confidence

### Who has this problem?
- **Vietnamese AI researchers** comparing models for NLP papers and fine-tuning
- **Vietnamese developers** choosing which model API to integrate into products
- **Vietnamese university students & educators** in AI/CS programs evaluating model capabilities
- **Model vendors (VinAI, Viettel AI, FPT)** who need independent validation to prove quality

### Why is it painful?
- **User impact:** Developers ship products built on models they picked from English benchmarks — then get bad Vietnamese outputs in production. Researchers can't publish reproducible Vietnamese model comparisons.
- **Business impact:** Without a credible Vietnamese benchmark, the Vietnamese AI ecosystem lacks a trust layer. Model vendors can't differentiate on quality, slowing adoption and investment.

### G1 Evidence — Why is this important?
- **Market gap:** Arena.ai (formerly Chatbot Arena / LMSYS) runs the largest English-language Arena with 2M+ votes but has no Vietnamese-specific evaluation track. No Vietnamese equivalent exists.
- **Demand signal:** VinAI's PhởGPT launch (2024) generated 50K+ social media discussions about "which Vietnamese model is best" — no credible answer emerged. [VERIFY: exact social media volume]
- **Academic need:** Vietnamese NLP researchers at VNU, HUST, and UIT routinely cite the absence of Vietnamese human-eval benchmarks as a limitation in published papers. [VERIFY: specific paper citations]
- **Competitive context:** Arena.ai, Artificial Analysis, and Open LLM Leaderboard serve global/English audiences. None offer Vietnamese-specific pairwise human evaluation.
- **Regulatory signal:** Vietnam's draft AI strategy (2025) emphasizes domestic AI capability benchmarking. A community-driven Arena positions ViGen as a reference platform. [VERIFY: specific policy document]

---

## 3. Target Users & Personas (G2)

### Persona 1: Minh — Vietnamese AI Developer
**User Mindset:**
- Pragmatic: Needs to pick a model API for a Vietnamese chatbot product shipping in 6 weeks
- Skeptical of vendor claims: Wants independent, community-validated data before committing

**User Story:** As a Vietnamese AI developer, I want to compare how different LLMs handle Vietnamese prompts in a blind test so that I can pick the best model for my product with confidence.

**User Goal:**
- Compare 3-5 candidate models on representative Vietnamese tasks (customer support, content generation, reasoning)
- See aggregate community ratings — not just personal impression from 5 test prompts

### Persona 2: Lan — NLP Researcher (VNU)
**User Mindset:**
- Rigor-first: Wants statistical significance, not vibes
- Publication-driven: Needs citable results for conference papers

**User Story:** As a Vietnamese NLP researcher, I want access to pairwise human preference data with Elo ratings and confidence intervals so that I can include community-validated Vietnamese benchmarks in my papers.

**User Goal:**
- Access leaderboard with Elo scores, bootstrap confidence intervals, and battle counts
- Download raw preference data for custom analysis (P2 — Open Preference Dataset)

### Persona 3: Thảo — CS Undergraduate (Curious Evaluator)
**User Mindset:**
- Curiosity-driven: Wants to play with AI models and see "which one is smarter"
- Low commitment: Will leave if the experience takes more than 2 minutes per interaction

**User Story:** As a CS student, I want a fun, quick way to pit AI models against each other on Vietnamese questions so that I can learn which models handle Vietnamese well.

**User Goal:**
- Submit a prompt and get two responses within seconds
- Vote in under 10 seconds after reading responses
- See instant feedback (Elo reveal) that makes voting feel rewarding

---

## 4. Strategic Context

- **Business goals (OKRs):** Q2 2026 OKR: "Launch ViGen Arena and collect 10,000 human preference votes in first 60 days." Battle Mode is the primary vote collection mechanism — it gates the entire OKR.
- **Past G10 learnings:** First ViGen Arena product (not applicable — this is v1). Lessons from AIV Open Data Portal launch applied: community platforms require low friction and immediate reward loops to drive adoption.
- **Market opportunity:** Vietnam has 40M+ internet users, a growing AI developer community, and no localized GenAI evaluation platform. Arena.ai's 2M+ global votes prove the pairwise evaluation model works — but Vietnamese text is unserved.
- **Competitive landscape:**

| Feature | Arena.ai | Artificial Analysis | Open LLM Leaderboard | ViGen Arena (Battle Mode) |
|---------|----------|--------------------|-----------------------|---------------------------|
| Blind pairwise evaluation | ✅ | ❌ (benchmark only) | ❌ (auto-eval only) | ✅ |
| Vietnamese-specific prompts | ❌ | ❌ | ❌ | ✅ |
| Elo rating system | ✅ | ❌ | ❌ | ✅ |
| Bootstrap confidence intervals | ✅ | ❌ | ❌ | ✅ |
| Community-driven voting | ✅ | ❌ | ❌ | ✅ |
| Multi-turn conversations | ✅ | ❌ | ❌ | ✅ (up to 5 turns) |
| Open preference dataset | ✅ | ❌ | ✅ (auto only) | P2 |

- **Why now?** Vietnamese GenAI is at an inflection point: VinAI, Viettel AI, and FPT all launched Vietnamese models in 2024-2025. The community needs an independent benchmark before vendor lock-in sets in. Launching during this window positions ViGen Arena as the de facto Vietnamese evaluation standard.

---

## 5. Solution Ideation & Prioritization (G2)

### G2 Ideas Considered
| Feature | Description | Priority | Selected? | Why |
|---------|-------------|----------|-----------|-----|
| Blind pairwise battle | User submits prompt, gets 2 anonymous responses, votes for better one | P0 | Yes | Core evaluation mechanism — proven by Arena.ai at 2M+ votes |
| Multi-turn follow-up | Allow up to 5 conversation turns before voting | P0 | Yes | Single-turn is insufficient for assessing conversational quality |
| Elo rating system | Track model strength using K=32 logistic Elo with bootstrap CIs | P0 | Yes | Industry-standard ranking methodology |
| Pre-computed responses | Serve responses from database, not live inference | P0 | Yes | Eliminates latency variance, reduces cost, enables fair comparison |
| Guest access with gate | 3 free battles before requiring sign-up | P0 | Yes | Reduces friction for first-time users while building registered base |
| Live model inference | Call model APIs in real-time per prompt | P3 | No | Expensive, introduces latency bias, infrastructure complexity |
| Category-filtered battles | Let users pick "Coding" or "Creative" before battling | P1 | No | Categories are leaderboard filters (P1-2), not battle-time selectors |
| Prompt quality scoring | Rate prompt quality to weight votes | P2 | No | Adds friction to voting; defer until vote volume justifies |
| Smart model router | Route prompts to models with fewest battles for faster convergence | P3 | No | Premature optimization; random pairing sufficient for v1 |

### Selected G2
Moving **blind pairwise battle + multi-turn follow-up + Elo rating + pre-computed responses + guest gate** to G3a. This set delivers the core evaluation loop that makes ViGen Arena useful from day one, without over-engineering infrastructure or adding friction.

---

## 6. Solution Overview — Vision & Architecture (G3a)

### G3a Vision
Battle Mode presents a minimal, engaging pairwise evaluation experience. A user lands on the Arena, types a Vietnamese prompt (or picks a suggested one), and instantly sees two anonymized responses side by side. They read, optionally ask follow-ups for up to 5 turns, then vote: A is better, B is better, tie, or both are bad. The moment they vote, cards highlight with color feedback (green winner, red loser), model identities are revealed with an animated Elo count-up, and a single button resets them into a new battle. The entire loop — prompt, read, vote, reveal — takes under 2 minutes.

Behind the scenes, responses are pre-computed and stored in a database, eliminating latency variance and ensuring fair comparison. Each vote triggers an Elo update (K=32, base-10 logistic) that feeds the public leaderboard. Bootstrap confidence intervals (1,000 permutations) quantify ranking uncertainty. Guest users get 3 free battles before an auth modal asks them to sign up — converting casual evaluators into registered community members whose votes are linked to persistent profiles.

### G3a Narrative / Story

**Minh the Developer:**
Minh opens ViGen Arena on his laptop during lunch. He types: "Giải thích microservices cho người mới bắt đầu" (Explain microservices for beginners). Two response cards appear side by side — "Mô hình A" and "Mô hình B." Model A gives a structured explanation with analogies. Model B is accurate but dry. Minh clicks "A tốt hơn." Model A's card turns green with 🏆, Model B fades red. An Elo reveal panel slides up: "Claude Sonnet — Elo 1,087 (+12)" vs "Qwen 3.5 — Elo 1,024 (−12)." Minh clicks "Cuộc trò chuyện mới" and tries another prompt. After 3 battles, he checks the leaderboard — the top 3 models are clear. He now has data to back his API choice.

**Thảo the Student:**
Thảo finds ViGen Arena through a university AI club post. She clicks a suggested prompt: "So sánh văn hóa Tết của Việt Nam với Tết Trung Quốc." She reads both responses, notices Model B captures Vietnamese Tết traditions more authentically, and clicks "B tốt hơn." After her 3rd battle, a sign-up modal appears. She registers with Google, and her 3 guest votes are linked to her new account. She keeps voting during her commute home.

### G3a Logic/Flow Diagrams

```
Battle Mode Flow:
┌────────────────┐
│ Welcome Screen │──→ User types prompt OR clicks suggested prompt
└────────────────┘
        │
        ▼
┌────────────────────────────┐
│ System: Select 2 random    │
│ models, randomize A/B      │
│ position, fetch pre-        │
│ computed responses          │
└────────────────────────────┘
        │
        ▼
┌────────────────────────────┐     ┌─────────────────┐
│ Display: "Mô hình A" and  │────▶│ User reads both │
│ "Mô hình B" responses     │     │ responses       │
└────────────────────────────┘     └─────────────────┘
        │                                    │
        │                          ┌─────────┴──────────┐
        │                          ▼                     ▼
        │                    [Follow-up?]          [Ready to vote]
        │                          │                     │
        │                          ▼                     │
        │                    Submit follow-up             │
        │                    (up to 5 turns)              │
        │                          │                     │
        │                          └──────→──────────────┘
        │                                                │
        ▼                                                ▼
┌────────────────────────────────────────────────────────────┐
│ Vote: "A tốt hơn" │ "B tốt hơn" │ "Hòa" │ "Cả hai tệ"  │
└────────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────┐
│ Visual feedback:                       │
│ Winner → green border + 🏆 Thắng      │
│ Loser  → red + faded + Thua           │
│ Tie    → both green + 🤝 Hòa          │
│ Both bad → both red + 👎 Tệ           │
└────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────┐
│ Elo Reveal Panel (animated count-up): │
│ Model A name, org, Elo, delta         │
│ Model B name, org, Elo, delta         │
│ Winner crowned with 👑                │
└────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│ "Cuộc trò chuyện mới"  │──→ Reset to Welcome Screen
└─────────────────────────┘

Guest Gate:
Guest completes battle #3 → localStorage counter = 3
Guest starts battle #4 → Auth modal appears
Guest signs in / registers → localStorage votes migrate to account
Guest continues battling
```

### G3a Key Dependencies
- **Pre-computed response database:** Responses for 30 seed prompts × 12 models must be generated and loaded before launch
- **Auth system (existing):** Google OAuth, email/password, 2FA, password reset, profile page already built — Battle Mode integrates via auth modal and topbar
- **Elo engine:** Requires functional Elo calculation on each vote + daily batch bootstrap CI recomputation
- **Response matching service:** Must handle prompt→response pairing with position randomization and Levenshtein fallback for near-match prompts
- **Leaderboard:** Battle Mode produces data; leaderboard consumes it. Both must be functional at launch.

### G3a Low-Fi Mockups
1. Welcome screen — prompt input + 3 suggested prompt cards
2. Battle screen — dual response cards, side by side (desktop) or stacked (mobile)
3. Vote bar — 4 buttons with Vietnamese labels
4. Vote result — color-coded cards with winner/loser badges
5. Elo reveal panel — model names, Elo scores, deltas, crown
6. Auth modal — appears after 3rd guest battle

### G3a Evaluation Measures
- **Primary metric:** Total human preference votes collected → target 10,000 in 60 days
- **Method:** Direct count from vote database, segmented by authenticated vs guest
- **Timeline:** G10 at 60 days post-G9

---

## 7. Design Specification — What Makes the Cutline (G3b)

### What we're building (cutline)
- ✅ Blind pairwise evaluation (two anonymous model responses per prompt)
- ✅ 4 vote options: A wins, B wins, Tie, Both bad
- ✅ Color-coded vote feedback (green/red with emoji badges)
- ✅ Animated Elo reveal with model identity, score, and delta
- ✅ Multi-turn follow-up (up to 5 turns per battle)
- ✅ 3 randomized suggested prompts on welcome screen
- ✅ Position randomization (50/50 A/B assignment per battle)
- ✅ Pre-computed response serving (no live inference)
- ✅ Guest gate at battle #4 with auth modal
- ✅ Guest vote migration to account on sign-up
- ✅ Skeleton loaders while responses load
- ✅ Vietnamese UI labels throughout
- ✅ Responsive layout: side-by-side (desktop), stacked (mobile)
- ❌ Category selection before battle (categories are leaderboard-only, P1-2)
- ❌ Live model inference (P3)
- ❌ Prompt quality scoring (P2)
- ❌ Smart model router (P3)
- ❌ Vote analytics per user (P2)
- ❌ Social sharing of battle results (P2)
- ❌ Follow-up after vote reveal (P2)

### Hi-Fi Mocks
- [Figma: Battle Mode — Welcome Screen — TBD]
- [Figma: Battle Mode — Dual Response Panel — TBD]
- [Figma: Battle Mode — Vote Result + Elo Reveal — TBD]
- [Figma: Battle Mode — Auth Modal (Guest Gate) — TBD]
- [Figma: Battle Mode — Mobile Layout — TBD]

### Copy & Logic Refinements
- Vote button labels: "A tốt hơn" / "B tốt hơn" / "Hòa" / "Cả hai đều tệ"
- Winner badge: "🏆 Thắng" (green)
- Loser badge: "Thua" (red, faded)
- Tie badge: "🤝 Hòa" (both green)
- Both bad badge: "👎 Tệ" (both red)
- Suggested prompt label: "Thử một gợi ý" (Try a suggestion)
- Follow-up placeholder: "Nhập câu hỏi tiếp theo..." (Enter follow-up question...)
- Turn limit message: "Bạn đã đạt giới hạn 5 lượt. Hãy bỏ phiếu!" (You've reached the 5-turn limit. Vote!)
- New battle button: "Cuộc trò chuyện mới" (New conversation)
- Auth modal headline: "Đăng ký để tiếp tục đánh giá" (Sign up to continue evaluating)
- Empty prompt error: "Nhập ít nhất 3 ký tự" (Enter at least 3 characters)
- Response unavailable: "Phản hồi không khả dụng cho lời nhắc này. Hãy thử một lời nhắc khác." (Response unavailable for this prompt. Try another.)

---

## 8. Success Metrics & Evaluation Plan (G3a/G10)

### Primary Metric
- **Metric:** Total human preference votes collected via Battle Mode
- **Current:** 0 (new product)
- **Target:** 10,000 votes in first 60 days
- **Timeline:** Measure at G10 (60 days post-G9)

### Secondary Metrics
- Registered users: 0 → 2,000 in 60 days
- Weekly active evaluators: 0 → 500 by week 8
- Average battles per session: Target ≥ 3
- Vote completion rate (started battle → submitted vote): Target ≥ 80%
- Guest-to-registered conversion rate (at gate): Target ≥ 40%

### Guardrail Metrics
- **Page load time:** Battle welcome screen must render in < 2 seconds
- **Response delivery time:** Both responses must appear within 500ms of prompt submission (pre-computed)
- **Bounce rate:** Welcome screen bounce should not exceed 40%
- **Auth modal abandonment:** Users who see the auth gate and leave entirely should not exceed 30%

### G10 Evaluation Plan
- **When:** 60 days after G9 production launch
- **Who:** PM (Frank) + Engineering lead
- **Method:** Direct analytics — vote count, user registration, session depth, funnel analysis (prompt → response → vote → new battle)
- **Review:** Compare against 10,000-vote target. Analyze: which prompts get most battles, which models generate most disagreement, where users drop off in the funnel, guest-to-registered conversion rate
- **Outcome:** Present at in-person gating meeting. If vote target met → proceed with P1 features (categories, side-by-side improvements). If not → diagnose whether bottleneck is acquisition (users not finding Arena), activation (users not starting battles), or retention (users not returning).

---

## 9. Estimation & Timeline (G4)

| Gate | Estimated Duration | Target Date | Notes |
|------|-------------------|-------------|-------|
| G1 | — | Feb 2026 | Problem validated via market research |
| G2 | — | Feb 2026 | Feature set prioritized |
| G3a | 1 week | Mar 9–13, 2026 | PRD finalized, flows documented |
| G3b | 1 week | Mar 9–13, 2026 | Engineering + Claude Code specs |
| G5 (Build) | 2 weeks | Mar 16–27, 2026 | Claude Code implementation |
| G6 (QA) | 3 days | Mar 28–31, 2026 | Automated + manual testing |
| G7 (Internal Test) | — | Mar 28–31, 2026 | Combined with QA |
| G9 (Release) | 1 day | Apr 5, 2026 | Public launch |
| G10 | — | Jun 5, 2026 | 60-day post-launch evaluation |

### Resources Required
- 1 PM (Frank) — PRD, specs, QA acceptance
- Claude Code — Primary implementation (frontend + backend)
- 1 Engineer — Review Claude Code output, infrastructure, deployment
- Pre-computed responses: 30 prompts × 12 models = 360 response records (seed data)
- Infrastructure: EC2 instance + MySQL + Cloudflare CDN (Docker deployment)

---

## 10. User Stories & Requirements

### Epic Hypothesis
We believe that launching a blind pairwise battle mode with Elo-based ranking will collect 10,000 Vietnamese human preference votes in 60 days because (a) no Vietnamese-specific GenAI evaluation platform exists, (b) the Arena.ai model has proven community-driven pairwise evaluation drives high engagement, and (c) a 2-minute vote loop with instant Elo reward feedback is compelling enough to drive repeat sessions. We'll measure success by total vote count, registered user count, and votes per session at G10.

### User Stories

**Story 1: Submit a prompt and receive blind responses**
As a Vietnamese AI evaluator, I want to type a Vietnamese prompt and see two anonymous model responses side by side so that I can compare their quality without bias.

**Acceptance Criteria:**
- [ ] Welcome screen displays prompt input field and 3 randomized suggested prompts
- [ ] Submitting a prompt returns two pre-computed responses from randomly selected models
- [ ] Models are labeled "Mô hình A" and "Mô hình B" — identities are hidden
- [ ] Position assignment (A left / B right) is randomized 50/50 per battle
- [ ] Response cards show full text with token count displayed
- [ ] Long responses truncate at 600px height with "Xem thêm" (Show more) expand button
- [ ] Skeleton loaders appear while responses load; vote buttons disabled until both responses render

**Story 2: Ask follow-up questions before voting**
As an evaluator, I want to ask follow-up questions to both models before voting so that I can assess conversational quality, not just single-turn performance.

**Acceptance Criteria:**
- [ ] Follow-up input field appears below response cards after initial responses load
- [ ] Submitting a follow-up sends the same message to both models, returning pre-computed follow-up responses
- [ ] Conversation history persists visually — previous turns scroll above current responses
- [ ] Turn counter displays "Lượt X/5" (Turn X/5)
- [ ] After 5 turns, follow-up input is disabled with message: "Bạn đã đạt giới hạn 5 lượt. Hãy bỏ phiếu!"
- [ ] User can vote at any turn (not required to use all 5)

**Story 3: Vote and see the result**
As an evaluator, I want to pick a winner (or declare a tie/both bad) and immediately see which models I was comparing so that my vote feels impactful and the reveal is rewarding.

**Acceptance Criteria:**
- [ ] 4 vote buttons: "A tốt hơn", "B tốt hơn", "Hòa", "Cả hai đều tệ"
- [ ] On vote: winner card → green border + 🏆 Thắng; loser → red + faded + Thua; tie → both green + 🤝 Hòa; both bad → both red + 👎 Tệ
- [ ] Vote buttons disappear after voting; input field disabled
- [ ] After 1.5-second delay, Elo reveal panel slides up with: model name, organization, current Elo, delta (+/−)
- [ ] Winner crowned with 👑; tie shows "Hòa"; both bad shows "Cả hai tệ"
- [ ] Vote is immutable once submitted — no undo
- [ ] "Cuộc trò chuyện mới" button appears below reveal panel → clicking resets to welcome screen

**Story 4: Continue battling as a guest (up to 3)**
As a first-time visitor, I want to try Battle Mode without creating an account so that I can experience the platform before committing.

**Acceptance Criteria:**
- [ ] Guest users can start and complete up to 3 battles without authentication
- [ ] Battle count tracked in localStorage (keyed by guest session UUID)
- [ ] Guest votes stored in localStorage and queued for server sync
- [ ] On starting battle #4, auth modal appears: "Đăng ký để tiếp tục đánh giá"
- [ ] Auth modal offers: Google sign-in, email/password registration
- [ ] Battle cannot proceed until user authenticates

**Story 5: Sign up and preserve guest history**
As a guest who just signed up, I want my first 3 votes to count under my new account so that my contribution isn't lost.

**Acceptance Criteria:**
- [ ] On successful authentication, all localStorage guest votes are sent to server via migration endpoint
- [ ] Server links guest votes to new user account
- [ ] Guest session UUID is retired; new auth token used for subsequent votes
- [ ] Vote counter in topbar reflects total votes (including migrated guest votes)
- [ ] localStorage guest data is cleared after successful migration

### Edge Cases & Constraints
- **Same model collision:** If random selection picks the same model twice, re-roll (up to 3 attempts). If 3 attempts fail: show "Không đủ mô hình để tiếp tục. Vui lòng thử lại." and return to welcome screen.
- **Pre-computed response missing:** If no response exists for the submitted prompt + selected model pair, abort battle with "Phản hồi không khả dụng cho lời nhắc này. Hãy thử một lời nhắc khác."
- **Mid-battle page refresh:** Reconstruct from localStorage if within 30-minute TTL. If expired, invalidate session — partial votes are not saved.
- **Empty follow-up:** Input requires minimum 3 characters (Vietnamese or English). Submit button disabled below threshold.
- **Rapid voting (spam):** Rate limit: max 1 vote per 3 seconds per session. Reject duplicate vote submissions for the same conversation.
- **User votes before responses load:** Vote buttons are disabled (greyed out) with inline message "Đợi phản hồi..." until both response cards are fully rendered.

---

## 11. Out of Scope

**Not included in this release (from G2 prioritization):**
- **Category-filtered battles** (P1-2) — Categories appear on the leaderboard page as filter tabs. Auto-classification approach (LLM classifier vs keyword rules) TBD by engineering team.
- **Follow-up after vote reveal** (P2) — Asking additional questions after models are revealed. Deferred to avoid biasing future votes.
- **Open preference dataset** (P2) — Exporting anonymized vote data for research. Requires privacy review.
- **Preliminary badge system** (P1) — Visual badges indicating low battle-count models with unreliable Elo. Simple data maturity feature.
- **Smart model router** (P3) — Intelligent pairing to accelerate Elo convergence. Random is sufficient for v1 volume.
- **Live model inference** (P3) — Real-time API calls. Pre-computed is simpler, cheaper, fairer.
- **Social sharing** (P2) — Share battle results on social media.
- **Native mobile app** (P3) — Responsive web is sufficient for v1.

**Future consideration:**
- Position-bias analysis tooling (detect if users systematically prefer A or B by position)
- Vietnamese prompt difficulty classification for stratified evaluation
- Model-specific evaluation slices (e.g., "How does GPT-5 do specifically on coding tasks?")

---

## 12. Gating Timeline & Delivery Tracking (G5→G9)

| Gating Stage | Completed / Anticipated Date | Slack or In-Person? | Notes |
|-------------|------------------------------|---------------------|-------|
| G1 | Feb 2026 | Slack | Problem validated via market gap analysis |
| G2 | Feb 2026 | Slack | Feature set prioritized (P0-P3) |
| G3a | Mar 9–13, 2026 | In-Person | PRD finalized |
| G3b | Mar 9–13, 2026 | Slack | Engineering + Claude Code specs |
| G4 | Mar 13, 2026 | Slack | Estimation approved |
| G5 | Mar 16–27, 2026 | Slack (daily) | Build phase — Claude Code + engineer review |
| G6 | Mar 28–31, 2026 | Slack | QA — automated + manual |
| G7 | Mar 28–31, 2026 | Slack | Combined with G6 (small team) |
| G8 | — | — | Skipped (public beta = launch) |
| G9 | Apr 5, 2026 | In-Person | Public launch |
| G10 | Jun 5, 2026 | In-Person | 60-day post-launch evaluation |

---

## 13. Evaluation Plan (G10)

- **Initiate:** 60 days after G9 (target: Jun 5, 2026)
- **Conductor:** PM (Frank) + Engineering lead
- **Review:** Total votes vs 10,000 target. Registered users vs 2,000 target. Funnel: welcome → prompt → vote → new battle. Guest conversion rate. Most/least voted models. Prompt distribution across categories (organic, pre-classification). Model pairs with highest disagreement (signals genuine quality differences vs random).
- **Present:** In-person gating meeting, Jun 2026
- **Outcome:** Did we collect 10,000 votes and establish a credible Vietnamese LLM leaderboard? If yes → G1 solved for v1. Proceed with P1 features (categories, badges, side-by-side improvements). If no → diagnose: acquisition (not enough users?), activation (users don't start battles?), or retention (users don't come back?). Define next G2 accordingly.

---

## 14. Dependencies & Risks

### Dependencies
- **Pre-computed responses:** 30 prompts × 12 models = 360 response records must be generated before launch. Requires API access or manual generation for each model.
- **Auth system (existing):** Google OAuth, email/password, 2FA, password reset, profile page — all already built. Battle Mode integrates but does not build auth.
- **Elo engine:** Must be functional for vote processing. Batch bootstrap CI job must run daily.
- **Infrastructure:** EC2 + MySQL + Docker + Cloudflare CDN must be provisioned and configured.
- **Seed prompts:** 30 Vietnamese prompts across 6 categories must be curated for quality and cultural relevance.
- **Model registry:** 12 model entries with metadata (name, organization, description) must be seeded.

### Risks & Mitigations
- **Risk:** Not enough users find ViGen Arena → vote target missed
  - **Mitigation:** Launch promotion via Vietnamese AI communities (Facebook groups, university partnerships, VinAI/FPT developer channels). Track weekly acquisition funnel.
- **Risk:** Pre-computed responses feel stale (users submit prompts not in the seed set)
  - **Mitigation:** Levenshtein fallback matching for near-match prompts. Clear messaging when no match found. Plan to expand prompt set weekly based on user submissions.
- **Risk:** Position bias (users systematically prefer Model A regardless of quality)
  - **Mitigation:** Position randomized 50/50. Post-launch analysis of `win_rate[i,j] = (a_win[i,j] + b_win[j,i]) / (battles[i,j] + battles[j,i])` to detect and correct position bias.
- **Risk:** Guest gate (3 battles) is too aggressive — users leave instead of signing up
  - **Mitigation:** Monitor auth modal abandonment rate. If > 30%, consider raising gate to 5 battles in week 2.
- **Risk:** Vietnamese responses from some models are low quality (English mixed in, poor grammar)
  - **Mitigation:** QA all 360 pre-computed responses before launch. Flag models with consistently poor Vietnamese output for potential exclusion from v1.

---

## 15. Open Questions

- Should the guest gate be 3 or 5 battles? (Current: 3. Monitor abandonment rate post-launch.)
- How often should we add new seed prompts? (Recommendation: weekly, based on most-submitted user prompts.)
- Should we display response token counts to users, or is that too technical? (Current: yes, shown below each response card.)
- What is the minimum number of battles per model pair before Elo scores are considered reliable? (Recommendation: 30 battles minimum for display; flag as "Preliminary" below that.)
- Should "Cả hai đều tệ" votes affect Elo? (Current: yes, both models lose equal Elo. Revisit if this creates perverse incentives.)
- How do we handle prompt-response pairs for multi-turn follow-ups that aren't in the pre-computed set? (Current: follow-ups must match pre-computed conversation trees. If no match, disable follow-up with message.)

---

## Appendix A: Technical Architecture Reference

For implementation details, see the G3B Claude Code specs:
- `../g3b-claude-code/04-battle-mode.md` — Component architecture, Zustand store, Tailwind styling
- `../g3b-claude-code/07-vote-system.md` — Vote persistence, deduplication, guest migration
- `../g3b-claude-code/08-elo-engine.md` — Elo calculation, bootstrap CIs, batch job
- `../g3b-claude-code/10-response-serving.md` — Response matching, position randomization, fallback logic

## Appendix B: Vietnamese UI Label Reference

| Key | Vietnamese | English (Reference Only) |
|-----|-----------|--------------------------|
| vote_a | A tốt hơn | A is better |
| vote_b | B tốt hơn | B is better |
| vote_tie | Hòa | Tie |
| vote_bad | Cả hai đều tệ | Both are bad |
| winner_badge | 🏆 Thắng | Winner |
| loser_badge | Thua | Loser |
| tie_badge | 🤝 Hòa | Tie |
| bad_badge | 👎 Tệ | Bad |
| new_battle | Cuộc trò chuyện mới | New conversation |
| model_a | Mô hình A | Model A |
| model_b | Mô hình B | Model B |
| try_suggestion | Thử một gợi ý | Try a suggestion |
| follow_up_placeholder | Nhập câu hỏi tiếp theo... | Enter follow-up... |
| turn_counter | Lượt X/5 | Turn X/5 |
| turn_limit | Bạn đã đạt giới hạn 5 lượt. Hãy bỏ phiếu! | You've reached the 5-turn limit. Vote! |
| auth_gate | Đăng ký để tiếp tục đánh giá | Sign up to continue evaluating |
| empty_prompt | Nhập ít nhất 3 ký tự | Enter at least 3 characters |
| loading | Đợi phản hồi... | Waiting for response... |
| no_response | Phản hồi không khả dụng. Hãy thử lời nhắc khác. | Response unavailable. Try another prompt. |

## Appendix C: Models at Launch (v1)

| # | Model | Organization | Type |
|---|-------|-------------|------|
| 1 | Claude Opus 4 | Anthropic | Proprietary |
| 2 | Claude Sonnet 4 | Anthropic | Proprietary |
| 3 | GPT-5 | OpenAI | Proprietary |
| 4 | Gemini 3 Pro | Google | Proprietary |
| 5 | Gemini 3 Flash | Google | Proprietary |
| 6 | Grok 4 | xAI | Proprietary |
| 7 | DeepSeek V3.2 | DeepSeek | Open-source |
| 8 | Llama 4 Maverick | Meta | Open-source |
| 9 | Qwen 3.5 | Alibaba | Open-source |
| 10 | GLM-5 | Zhipu AI | Open-source |
| 11 | Kimi K2.5 | Moonshot AI | Open-source |
| 12 | Mistral Large 2 | Mistral AI | Open-source |
