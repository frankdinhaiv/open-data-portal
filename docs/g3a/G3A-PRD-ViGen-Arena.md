# G3A PRD: ViGen Arena — Vietnamese GenAI Human Evaluation Platform

**Author:** Frank — AIV (AI for Vietnam)
**Date:** March 8, 2026
**Status:** Draft
**Workstream:** PM2: Arena & Human Preference Ranking
**Target Launch:** April 5, 2026
**Dev/Test/Deploy Complete:** March 31, 2026

---

## Problem Statement

There is no trusted, large-scale way to evaluate how well generative AI models perform in Vietnamese. Global benchmarks and arenas (Arena.ai, Scale AI SEAL, Vellum) are English-centric — Arena.ai supports English, German, Spanish, Russian, Japanese, Chinese, and French but not Vietnamese. Vietnamese speakers have no way to systematically compare models on accuracy, fluency, cultural nuance, or tone — forcing enterprises and researchers to rely on anecdotal testing. Without a Vietnamese-first evaluation platform, model developers lack signal on Vietnamese performance, enterprises make uninformed build-vs-buy decisions, and the Vietnamese AI community has no shared reference point for model quality.

---

## Goals

1. **Establish the first Vietnamese GenAI Arena** with blind pairwise human evaluation, producing an Elo-based ranking trusted by researchers and enterprises.
2. **Collect 10,000+ human preference votes** within the first 60 days of launch, building a statistically significant Vietnamese preference dataset.
3. **Rank 12+ models** (mix of proprietary frontier and open-source leaders) on Vietnamese text tasks across knowledge, reasoning, creative writing, code, and cultural understanding.
4. **Drive community adoption** — 2,000+ registered voters and 500+ weekly active evaluators by Day 60.
5. **Produce a public leaderboard** that becomes the go-to reference for Vietnamese AI model quality, cited by NIC, Meta, and enterprise partners.
6. **Complete high-fidelity design** — Start Monday March 9, delivered by Friday March 13. This unblocks frontend development in Week 2.

---

## Non-Goals

1. **Multi-modal evaluation (image, audio, video)** — Text-only at launch. Multi-modal is a future phase; the current Arena supports text input and text output only.
2. **Real-time LLM inference** — v1 uses pre-computed responses served from a database, not live API calls. This reduces cost, controls latency, and enables curation of response pairs. Live inference is Phase 2.
3. **Gamified data collection (Open Data Portal)** — The gamified crowdsourcing platform is a separate, deprioritized workstream. Arena is evaluation, not data collection.
4. **Automated benchmark integration in the Arena UI** — The 6 automated benchmarks (SEA-HELM-VN, Vi-MMLU, etc.) feed into the Benchmark Leaderboard, which is a separate product surface. The Arena leaderboard reflects human votes only.
5. **Vietnamese Intelligence Index (VIX)** — Composite score combining Arena Elo + Benchmark scores is deferred to post-launch. Timeline is too aggressive to ship a well-calibrated composite metric at MVP.
6. **Monetization** — No paid tiers, API access fees, or sponsorship at launch. Revenue model is a future consideration.

---

## User Stories

### AI/ML Practitioner / Researcher

- As a **Vietnamese AI researcher**, I want to compare two LLMs on a Vietnamese prompt without knowing which model is which, so that my evaluation is unbiased.
- As a **researcher**, I want to see the Elo ranking and confidence intervals for all evaluated models, so that I can cite trustworthy results in my papers.
- As a **researcher**, I want to see all models ranked together regardless of license type, so that I can compare the full landscape of Vietnamese AI model quality.

### Enterprise AI Decision-Maker (PM / CTO)

- As a **product manager** evaluating LLMs for a Vietnamese chatbot, I want to compare specific models side-by-side on prompts relevant to my domain, so that I can make an informed vendor decision.
- As a **CTO**, I want to see how open-source models (DeepSeek, Llama, Qwen) rank against proprietary models (GPT-5, Claude, Gemini) on Vietnamese tasks, so that I can assess the build-vs-buy tradeoff.

### Vietnamese Power User / Domain Expert

- As a **Vietnamese language enthusiast**, I want to evaluate AI responses on cultural nuance (poetry, proverbs, tone), so that I can contribute to improving AI's understanding of Vietnamese.
- As a **community member**, I want to see my vote count and contribution history, so that I feel my participation matters.
- As a **voter**, I want suggested prompts in Vietnamese that test interesting edge cases, so that I don't have to think of prompts from scratch.

---

## Requirements

### P0 — Must-Have (MVP Launch — April 5)

Scope is minimized to the critical voting loop + leaderboard. Everything else is post-launch.

| # | Requirement | Acceptance Criteria |
|---|------------|-------------------|
| P0-1 | **Battle Mode (Blind Pairwise)** | User submits a text prompt → two anonymous responses appear side-by-side → user can send follow-up prompts (multi-turn) or vote at any turn (A better / B better / Both good / Both bad) → response cards visually highlighted with vote result (winner: green border + 🏆 label, loser: red border + faded, tie: green + 🤝, both bad: red + 👎) → model identities revealed with Elo delta → "New Battle" resets. |
| P0-2 | **Side-by-Side Mode** | User selects two models from dropdown → submits prompt → both responses appear with model names visible → user can continue the conversation (multi-turn) or vote at any turn → response cards highlighted with vote result colors (same scheme as Battle mode) → contextual confirmation message with winner name → two action buttons: "Tiếp tục hội thoại" (continue multi-turn after vote, hidden at turn limit) and "So sánh tiếp" (new comparison, retains model selections) → vote recorded. |
| P0-3 | **Direct Chat Mode** | User selects one model → submits prompt → single response appears → user can continue the conversation (multi-turn) → user rates 1-5 stars + optional quality tags (accurate, natural, culturally appropriate, creative, helpful) at any turn. |
| P0-4 | **Arena Leaderboard** | Sortable table displaying: Rank, Model Name, Elo Score, ±CI (bootstrap), Vote Count, Average Win Rate, Organization, License Type (Open/Prop badge). Sort state persists in localStorage. Updated daily. Includes four statistical views (see Appendix E for full methodology): **(a) Win Fraction Matrix** — M×M heatmap where cell (i,j) = fraction of non-tied battles in which model i defeated model j. Ties ("Tie" and "Both Bad") excluded. Position-bias corrected: `win_rate[i,j] = (a_win[i,j] + b_win[j,i]) / (battles[i,j] + battles[j,i])`. Color scale: blue (→1.0, row wins) → white (0.5, even) → red (→0.0, row loses); diagonal = 0 (no self-battles). Primary use: detecting transitivity violations (A>B, B>C, C>A). **(b) Battle Count Matrix** — Symmetric N×N heatmap showing total non-tied battles per pair. Color scale: yellow (high count) → dark-purple (low count). Pairs with <50 battles should be treated as unreliable. SE of win rate scales as 1/√n; halving CI width requires ~4× battles. **(c) Average Win Rate** — Each model's mean win rate against all other models: `avg_win_rate[i] = mean(win_rate[i,j] for all j≠i)`. Uniform sampling: beating the weakest model counts equally as beating the strongest (non-parametric, no logistic link assumption). Under Elo, divergence from Elo ranking can signal: sampling imbalance, intransitivity, link function mismatch, or order-dependent SGD noise. **(d) Confidence Intervals** — Bootstrap Elo: shuffle battle sequence into 1,000 random permutations, run Elo on each, take 2.5th/97.5th percentiles → 95% CI. CIs capture combined sampling uncertainty + order-sensitivity. Displayed as ±CI in the table and as dot-and-whisker plot. Non-overlapping CIs → statistically significant ranking difference; overlapping CIs → models may be indistinguishable. **Diagnostic reading order:** Battle Count (data quality) → Win Fraction (pairwise signal) → Avg Win Rate (sanity check) → CIs (significance). |
| P0-5 | **Vietnamese-First UI** | All UI text in Vietnamese. Prompt categories in Vietnamese spanning knowledge, culture, reasoning, creative, coding, and professional domains. Left sidebar shows conversation history with real-time search/filter capability (no inline prompt suggestions — history-first navigation). |
| P0-6 | **Guest Voting + Sign-Up Gate** | Allow anonymous users up to 3 battles without signing in. On the 4th battle attempt, prompt sign-up (modal with Google login or email/password). This mirrors Arena.ai's onboarding — reduces friction for first-time voters while driving account creation. Guest votes are stored with session ID and attributed to the account once they sign up. |
| P0-7 | **User Authentication (Integration)** | Google social login + email/password sign-up. Auth system already built — integrate existing auth into the Arena UI. Session persistence so votes are attributed to accounts. |
| P0-8 | **Vote Persistence** | Every vote is stored with: voter ID (or session ID for guests), prompt hash, response pair IDs, vote choice, timestamp, mode. No data loss on page refresh or disconnect. Guest votes retroactively linked to account on sign-up. |
| P0-9 | **Response Pair Serving** | Backend serves pre-computed response pairs. Each prompt has 2+ model responses. Pair assignment is randomized. Minimum 30 prompt/response sets at launch. |
| P0-10 | **Mobile-Responsive Design** | All three modes + leaderboard usable on 375px+ viewport. Touch-friendly vote buttons. |
| P0-11 | **Elo Calculation Engine** | Daily batch job computing ratings using the Elo rating system. **Core formulas:** Expected score: `E_A = 1/(1+10^((R_B−R_A)/400))`. Update: `R′_A = R_A + K×(S_A−E_A)`, where S=1 (win), 0.5 (draw), 0 (loss). **K-factor: K=32** (matches USCF standard for players below 2100; balances responsiveness and stability for our early-stage dataset). Initial rating anchor: 1000. **Statistical interpretation:** Elo's update rule is equivalent to stochastic gradient descent (SGD) on the Bradley-Terry log-likelihood with fixed learning rate K (Olesker-Taylor, NeurIPS 2024; Tang et al., 2025). **Confidence intervals:** Bootstrap Elo — shuffle the full battle sequence into 1,000 random permutations, run Elo on each, take 2.5th/97.5th percentile as 95% CI. CIs capture combined sampling uncertainty and order-sensitivity. Computational cost: O(M×N) per permutation; at our scale (<100K battles) runs in seconds. **Key assumption:** LLM weights are static (frozen at deployment), so Elo's temporal adaptability addresses a non-existent problem — but we accept this trade-off for real-time update capability, intuitive K-factor tuning, and simpler implementation vs. batch BT MLE. **Future consideration:** If order-dependence becomes problematic at scale (>500K battles), evaluate migration to BT MLE with sandwich CIs. |
| P0-12 | **Multi-Turn Arena** | All three modes support multi-turn conversations. User can send follow-up prompts after the initial response. In Battle and SBS modes, both models receive the same conversation history. Vote can be cast at any turn. Conversation context (full turn history) stored with each vote record. |

**Removed from MVP (moved to P1):** Anti-gaming beyond basic rate limiting, response pair balancing algorithm, hourly Elo updates.

**Already built (integration only):** Google login + email/password auth, 2FA, password reset, profile page, email verification — all existing. Just need Arena UI integration.

### P1 — Post-Launch Sprint 1 (April 6-19)

| # | Requirement | Acceptance Criteria |
|---|------------|-------------------|
| P1-1 | **Anti-Gaming** | Rate limiting: max 100 votes/user/day. Duplicate vote detection. IP-based throttling for unauthenticated users. |
| P1-2 | **Category Leaderboards** | Filter leaderboard by category: Overall, Reasoning, Creative Writing, Coding, Cultural, Math. Each category has independent Elo ranking. Categories appear as tabs on the leaderboard page only (not on the chat/battle screen). Prompt categorization via auto-classifier — engineering to propose approach (LLM classifier vs. keyword rules). **[Partially implemented in prototype]** — 7 category filter tabs (Tổng hợp, Kiến thức, Sáng tạo, Lập trình, Văn hóa VN, Toán học, Nghề nghiệp) with simulated per-category Elo offsets. Full implementation requires prompt auto-classification backend. |
| P1-3 | **Style Control Toggle** | Option to normalize for response length/verbosity, reducing bias toward longer responses. |
| P1-4 | **Suggested Prompt Rotation** | Dynamic prompt suggestions based on what categories need more votes. |
| P1-5 | **Rank Spread Column** | Show confidence range for each model's rank (e.g., "1 → 4") in the leaderboard table. |
| P1-6 | **Share Battle Result** | After voting, user can share the battle result as a link or image. |
| P1-7 | **Preliminary Badge** | Models with fewer than 100 votes display a "Sơ bộ" (Preliminary) badge on the leaderboard. Badge removed once vote threshold is met. Prevents users from over-interpreting unstable rankings. |

### P2 — Future Considerations

| # | Requirement | Acceptance Criteria |
|---|------------|-------------------|
| P2-1 | **Vietnamese Intelligence Index (VIX)** | Composite score combining Arena Elo + Benchmark scores. Displayed as additional column. Methodology documented and validated. |
| P2-2 | **Live LLM Inference** | Replace pre-computed responses with real-time API calls. Requires LiteLLM routing, latency management, cost controls. |
| P2-3 | **VNeID Verification** | Optional Vietnam National ID verification. Verified votes weighted higher. |
| P2-4 | **Model Submission Portal** | Allow model developers to submit their models for evaluation. |
| P2-5 | **Vote Quality Scoring** | Internal metric tracking voter consistency. Used to weight votes. |
| P2-6 | **API Access** | Public API for leaderboard data. Rate-limited, free tier. |
| P2-7 | **English Language Toggle** | Full UI and leaderboard in English for international researchers. |
| P2-8 | **Embed Widget** | Embeddable leaderboard snapshot for blogs, papers, and partner websites. |
| P2-9 | **Multi-Modal Arena** | Extend to vision, code execution, and document comprehension. |
| P2-10 | **Follow-Up After Vote Reveal** | After voting and model reveal, sample a new model pair. Pass the winning response as context to both new models, enabling chained comparison across pairs. |
| P2-11 | **Open Preference Dataset** | Publish anonymized conversation + vote data as a public research dataset. Enables independent verification, reproducibility, and academic citation. Privacy review required before release. |

### P3 — Long-Term / Not Planned

| # | Requirement | Acceptance Criteria |
|---|------------|-------------------|
| P3-1 | **Smart Model Router (Arena Max equivalent)** | Route user prompts to the best-performing model based on accumulated vote data and category strengths. Requires significant vote volume (>100K) to be statistically meaningful. |
| P3-2 | **Native Mobile App** | Dedicated Android/iOS app (Arena.ai has Android on Play Store). Evaluate after web traffic data shows mobile share >50%. |

---

## Success Metrics

### Leading Indicators (First 30 Days)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Total registered voters | ≥ 1,000 | User sign-ups |
| Total votes collected | ≥ 5,000 | Vote records in DB |
| Votes per session (avg) | ≥ 3 | Votes / unique sessions |
| Battle mode usage share | ≥ 60% | Mode selection events |
| History search usage rate | ≥ 20% | Sessions with history search / total sessions |
| Mobile vote share | ≥ 40% | Votes from <768px viewport |
| Page load time (P95) | ≤ 3s | Performance monitoring |

### Lagging Indicators (60-90 Days)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Total votes | ≥ 10,000 | Cumulative vote count |
| Weekly active voters | ≥ 500 | Unique voters per week |
| Voter retention (Week 4+) | ≥ 30% | % of Week 1 voters still active at Week 4 |
| Models ranked with CI < ±15 | ≥ 10 of 12 | Statistical significance per model |
| External citations / press mentions | ≥ 5 | Media monitoring, Google Scholar |
| Partner references (NIC, Meta) | ≥ 2 | Partner meeting notes, official comms |
| Community NPS | ≥ 40 | In-app survey |

### Data Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Inter-rater agreement (Cohen's κ) | ≥ 0.4 | Agreement between voters on same pairs |
| Average time per vote | 15-120s | Votes < 5s flagged as low quality |
| Vote distribution balance | No model < 4% of battles | Pair assignment audit |
| Spam/abuse rate | < 2% | Flagged votes / total votes |

---

## Architecture Overview

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | ReactJS, Tailwind CSS, Shadcn/ui | Vietnamese-first, light elegant theme (white/gray palette, blue accent), responsive. Component library via Shadcn/ui for consistent UI. Deployed on EC2 via Docker with Cloudflare CDN. |
| **Backend API** | Python FastAPI, async | Handles vote submission, pair serving, user auth. Stateless, horizontally scalable. |
| **Database** | MySQL (AWS EC2) | Tables: users, prompts, responses, votes, elo_snapshots. |
| **Auth** | Existing system (already built) | Google social login + email/password. JWT sessions. Integration into Arena UI only — no new auth development needed. |
| **Elo Engine** | Python batch job (cron) | Elo rating system (K=32, base-10 logistic, initial=1000). Bootstrap Elo CIs: 1,000 permutation shuffles → 2.5th/97.5th percentile → 95% CI. Runs daily. Writes to elo_snapshots table. Also computes model-free leaderboard stats: pairwise win fraction matrix, battle count matrix, per-model average win rate (all ties excluded). |
| **Response Store** | MySQL + S3 | Pre-computed response pairs. Prompt → model → response mapping. |
| **Deployment** | Docker on EC2 | Containerized frontend + backend. Single-instance MVP, horizontally scalable post-launch. |
| **Monitoring** | Datadog or Grafana | Uptime, latency, error rates, vote throughput. Alerts on anomalies. |
| **CDN / Edge** | Cloudflare | Static asset caching, DDoS protection, edge routing for Vietnam-based users. |

---

## Competitive Positioning

*Verified March 8, 2026 — see Appendix D for full fact-check.*

| Capability | Arena.ai (formerly LMSYS) | ViGen Arena (Ours) |
|-----------|--------------------------|-------------------|
| Language | English-first; supports EN, DE, ES, RU, JA, ZH, FR — **no Vietnamese** | **Vietnamese-first** |
| Arena (blind pairwise) | ✅ ~5.4M text votes + 573K vision votes (≈6M combined) | ✅ Building |
| Models ranked | 323 text models, 89 vision, 50 text-to-image | 12 models (MVP) |
| Ranking system | Bradley-Terry MLE via logistic regression (displayed on Elo-like scale: β×400+1000). CIs: sandwich estimator (Huber-White) since July 2025, replacing bootstrap BT. Order-invariant, statistically principled. | Elo rating system (K=32, base-10 logistic). CIs: Bootstrap Elo (1,000 permutation shuffles). Trade-off: order-dependent but O(1) per-battle updates (real-time capable), intuitive K-factor tuning, simpler implementation. At our scale (<100K battles), order-sensitivity is manageable. |
| Battle modes | Battle (blind) ✅, Side-by-Side (votes don't count toward leaderboard), Direct (no voting) | All 3 modes; SBS and Direct votes count |
| Automated benchmarks | ❌ Human votes only | ✅ 6 Vietnamese-native benchmarks (separate surface) |
| Cultural evaluation | ❌ None | ✅ Tone, proverbs, regional dialect, politeness |
| Style Control | ✅ Normalizes for length/verbosity | Post-launch (P1) |
| Categories | 8 base + 23 occupational subcategories | Post-launch (P1) |
| Funding / Scale | $150M Series A (Jan 2026), $1.7B valuation, UC Berkeley origin | AIV initiative with NIC + Meta partnership |
| Revenue | ~$30M ARR (enterprise AI evaluations service) | No monetization at launch |
| Video Arena | ✅ Launched Jan 2026, 15 video models | Not planned |
| Arena Max (model router) | ✅ Routes prompts to best model based on 5M+ votes | Not planned |

**Core differentiator:** We are the only platform evaluating AI models specifically for Vietnamese language, culture, and context. Arena.ai is the closest analog but has zero Vietnamese coverage. Their massive scale (323 models, 6M votes) is a moat globally — but irrelevant for Vietnamese evaluation.

---

## Timeline

**Hard deadline: April 5, 2026 (Launch Day)**
**All dev + testing + deployment complete by: March 31, 2026**

### Phase 1: MVP (March 9 – April 5)

| Week | Dates | Milestone | Owner |
|------|-------|-----------|-------|
| **W1** | **Mar 9-13** | **High-fidelity design: all 3 modes + leaderboard.** Start Mon, deliver Fri. Includes component specs, responsive breakpoints, interaction states. | **Design** |
| W1 | Mar 9-13 | Finalize PRD, sign off architecture. Set up infra (DB, auth integration, API skeleton). | Frank, Engineering |
| W1 | Mar 9-13 | Begin response pair curation — target 30 prompts × 2-4 responses each | Data + Content |
| **W2** | **Mar 16-20** | Build Battle Mode (core voting loop) + vote submission API + response pair serving | **Engineering** |
| W2 | Mar 16-20 | Implement Arena Leaderboard (table, sort, filter, Elo display) | Engineering |
| W2 | Mar 16-20 | Continue response pair curation — target 50+ total prompt sets | Data + Content |
| **W3** | **Mar 23-27** | Build Side-by-Side + Direct modes. Integrate Elo batch job. | **Engineering** |
| W3 | Mar 23-27 | Mobile responsive pass. Vietnamese copy review. | Engineering + Marcom |
| **W4** | **Mar 28-31** | **QA + bug fixes + deployment to staging.** All dev complete by March 31. | **Engineering + QA** |
| Launch | **Apr 1-4** | Internal + partner beta testing. Final fixes only. | All |
| **🚀** | **Apr 5** | **Public launch** | **All** |

### Phase 2: Post-Launch (April 6 – May 2026)

| Sprint | Dates | Focus |
|--------|-------|-------|
| Sprint 1 | Apr 6-19 | Anti-gaming, category leaderboards, style control |
| Sprint 2 | Apr 20 - May 3 | Share battle results, rank spread column, suggested prompt rotation |
| Sprint 3 | May 4-17 | VIX composite score, VNeID verification, vote quality scoring |

### Hard Dependencies

- **High-fidelity design must be delivered by March 13** — blocks frontend development in Week 2.
- **Response pair curation must hit 30+ sets by March 20** — blocks Battle Mode testing.
- **Auth integration into Arena UI must be complete by March 20** — auth system already built, just needs Arena UI hookup. Blocks authenticated voting.
- **All development and testing complete by March 31** — April 1-4 is beta testing buffer only.

---

## Open Questions

| # | Question | Owner | Impact |
|---|----------|-------|--------|
| 1 | **Voting rubric:** Should we guide voters on evaluation criteria (accuracy vs. fluency vs. cultural fit), or keep it simple ("which is better")? Arena.ai uses simple preference — and SBS/Direct votes don't even count toward their leaderboard. Do ours? | **Frank + Research** | Affects vote UX and data schema |
| 2 | **Live inference timeline:** When do we switch from pre-computed responses to live API calls? This determines cost model and model onboarding process. | **Engineering + Finance** | Affects architecture and burn rate |
| 3 | **Vietnamese-specific eval categories:** Should cultural categories (proverbs, tone, regional dialect) be first-class Arena categories or just leaderboard filters? | **Frank + Content** | Affects prompt curation and Elo segmentation |
| 4 | **Model onboarding process:** How do we onboard new models post-launch? Direct API integration, partner submission portal, or community request? | **Frank + Engineering** | Affects model expansion velocity |
| 5 | **Data privacy compliance:** What data do we store per vote under Vietnam's emerging data privacy regulations? Do we need explicit consent for preference data? | **Legal (Nhi)** | Affects data schema and onboarding flow |
| 6 | **Response pair generation at scale:** Who generates the pre-computed responses? Do we run each model ourselves, or partner with providers? Cost and logistics TBD. | **Engineering + Finance** | Affects launch timeline and model count |

---

## Appendix

### A. Model Roster (v1 Launch — 12 Models)

| Model | Organization | License | Notes |
|-------|-------------|---------|-------|
| Claude Opus 4.6 | Anthropic | Proprietary | #1 on Arena.ai (1504 Elo). Top reasoning and instruction-following. |
| GPT-5 | OpenAI | Proprietary | OpenAI flagship. Strong coding, reasoning, creative writing. |
| Gemini 3 Pro | Google | Proprietary | #2 on Arena.ai (1485 Elo). Google's latest frontier model. |
| Gemini 3 Flash | Google | Proprietary | Speed-optimized. Cost-efficient for high-volume tasks. |
| Claude Sonnet 4.6 | Anthropic | Proprietary | Strong balance of quality and speed. Top 5 on Arena.ai. |
| Grok 4 | xAI | Proprietary | xAI's latest. Arena.ai #4 (1493 Elo, preliminary). Trending. |
| DeepSeek V3.2 | DeepSeek | Open Source | 685B total / 37B active (MoE). Beats GPT-5 on reasoning benchmarks. MIT license. |
| Llama 4 Maverick | Meta | Open Source | 400B total / 17B active. Outperforms GPT-4o on image understanding and coding. |
| Qwen 3.5 | Alibaba | Open Source | 235B / 22B active (MoE). 262K native context. SOTA on math, coding, science. |
| GLM-5 | Zhipu AI | Open Source | #1 open-source on Arena.ai (1451 Elo). Strong multilingual. |
| Kimi K2.5 | Moonshot AI | Open Source | Arena.ai newcomer. Strong reasoning. Trending rapidly in 2026. |
| Mistral Large 2 | Mistral AI | Open Source | European open-source leader. Strong multilingual and instruction-following. |

### B. Prompt Categories (v1)

| Category | Description | Example |
|----------|------------|---------|
| Kiến thức (Knowledge) | Factual explanations | "Giải thích blockchain cho học sinh lớp 10" |
| Sáng tạo (Creative) | Poetry, stories, creative text | "Viết bài thơ lục bát về mùa xuân Hà Nội" |
| Suy luận (Reasoning) | Analysis, argumentation | "Tại sao kinh tế VN tăng trưởng nhanh?" |
| Lập trình (Coding) | Code generation from Vietnamese specs | "Viết hàm Python sắp xếp tên tiếng Việt" |
| Văn hóa VN (Culture) | Proverbs, food, traditions, tone | "So sánh phở Hà Nội và phở Sài Gòn" |
| Nghề nghiệp (Professional) | Emails, reports, business Vietnamese | "Viết email xin nghỉ phép gửi sếp" |

### C. Related Documents

- **[G3B Engineering Specs](../g3b/engineering/)** — 11 behavior specs for engineering review:
  - [00 — Data Model & API Foundation](../g3b/engineering/00-data-model-api.md) — DB entities, API surface, seed data
  - [01 — Auth Integration & Guest Gate](../g3b/engineering/01-authentication.md) — Existing auth integration, guest gate, data linking
  - [02 — Core Layout & Vietnamese UI](../g3b/engineering/02-core-layout.md) — App shell, sidebar, topbar, responsive
  - [03 — Battle Mode](../g3b/engineering/03-battle-mode.md) — Blind pairwise + multi-turn + vote colors + Elo reveal
  - [04 — Side-by-Side Mode](../g3b/engineering/04-side-by-side-mode.md) — Named model comparison + multi-turn + continue after vote
  - [05 — Direct Chat Mode](../g3b/engineering/05-direct-chat-mode.md) — Single model + star rating + quality tags
  - [06 — Vote System](../g3b/engineering/06-vote-system.md) — Vote persistence, deduplication, guest attribution
  - [07 — Elo Engine](../g3b/engineering/07-elo-engine.md) — Elo calculation, bootstrap CIs, batch job
  - [08 — Leaderboard](../g3b/engineering/08-leaderboard.md) — Table + 4 statistical views + license badges + category tabs
  - [09 — Response Serving](../g3b/engineering/09-response-serving.md) — Pre-computed response pairs
  - [10 — Chat History & User Stats](../g3b/engineering/10-chat-history-user-stats.md) — Conversation history, search, contribution stats
- **[G3B Claude Code Specs](../g3b/claude-code/)** — Implementation specs for Claude Code (pending)
- [ViGen Arena Application](../../vigen-arena/) — Full-stack application (React + TypeScript + Vite frontend, Python FastAPI backend, SQLite DB)
- [Arena UI Prototype](../prototype/arena-prototype.html) — Interactive HTML prototype (all 3 modes + leaderboard)
- [Arena Approach Document](../prototype/arena-ui-prototype-approach.md) — Prototype scope and validation plan
- [Open Data Portal Project Doc](../../memory/projects/open-data-portal.md) — Parent project with benchmarks, architecture, GTM
- [Competitive Analysis (G10)](../../memory/projects/open-data-portal.md#competitive-landscape) — Full competitive matrix

### D. Arena.ai Competitive Fact-Check (Verified March 8, 2026)

| Claim | Status | Notes |
|-------|--------|-------|
| Rebranded from LMSYS Jan 2026 | ✅ Verified | Jan 28, 2026 official rebrand |
| $150M Series A | ✅ Verified | Jan 6, 2026, $1.7B post-money valuation. Lead: Felicis + UC Investments. |
| 6M+ votes | ⚠️ Clarified | ~5.4M text + 573K vision ≈ 6M combined |
| Languages: no Vietnamese | ✅ Verified | Supports EN, DE, ES, RU, JA, ZH, FR. No Vietnamese. |
| UC Berkeley affiliation | ✅ Verified | Sky Computing Lab, EECS. Founded by PhD students Wei-Lin Chiang and Anastasios Angelopoulos. |
| Bradley-Terry ranking | ✅ Verified | Uses Bradley-Terry (not pure Elo). Displayed on Elo-like scale for readability. |
| 3 battle modes | ✅ Verified | Battle (blind, votes count), SBS (known, votes do NOT count toward leaderboard), Direct (no voting). |
| 8+ categories | ✅ Verified | 8 base categories + 23 occupational subcategories. |
| Style Control | ✅ Verified | Normalizes for length, markdown, lists, bold. |
| Preliminary badge | ✅ Verified | For low-vote/new models. ~1,000+ votes needed for stable ranking. |
| 323 text models ranked | ✅ Verified | Plus 89 vision, 50 text-to-image. |
| $30M ARR | ✅ Verified | Enterprise AI evaluations service, launched Sep 2025. |
| Video Arena | ✅ Verified | Launched Jan 2026 with 15 frontier video models. |
| Arena Max (model router) | ✅ Verified | Routes prompts to best model based on 5M+ vote data. |

**Sources:** arena.ai/blog/series-a, arena.ai/faq, arena.ai/blog/lmarena-is-now-arena, arena.ai/blog/arena-expert, arena.ai/blog/policy

### E. Elo Methodology & Leaderboard Plot Reference

#### Why Elo (Not Bradley-Terry) for ViGen Arena

Arena.ai transitioned from Elo to BT MLE in December 2023 for six reasons: static models don't need temporal adaptability, centralized data makes batch MLE feasible, K-factor tuning is arbitrary for static players, Elo is order-dependent, Elo lacks native CIs, and Bootstrap Elo CIs are over-wide. These are valid concerns at Arena's scale (6M+ battles, 400+ models).

**ViGen's context is different.** At our target scale (<100K battles, 12 models at launch), the practical advantages of Elo outweigh BT's statistical rigor:

| Factor | Elo advantage | BT advantage |
|--------|--------------|--------------|
| Real-time updates | O(1) per battle — can update leaderboard live | Requires full refit (all battles) |
| Small dataset (<500 battles) | Works reliably with sparse pairwise data | MLE unreliable with few observations |
| Implementation complexity | Simple update rule, no optimizer needed | Requires logistic regression solver (L-BFGS) |
| Explainability | K-factor and expected score are intuitive | "Maximum likelihood estimation" is opaque to voters |
| CI method | Bootstrap Elo captures both sampling and order variance | Sandwich/bootstrap BT give tighter, cleaner CIs |
| Order-dependence risk | Manageable at <100K battles | Non-issue (order-invariant by construction) |

**Migration trigger:** If ViGen reaches >500K total battles and order-sensitivity becomes measurable (Bootstrap Elo CI width >2× what BT bootstrap would produce), evaluate migration to BT MLE with sandwich CIs.

#### Elo as SGD on the Bradley-Terry Log-Likelihood

The Elo update `R′_A = R_A + K(S_A − E_A)` is mathematically equivalent to one step of stochastic gradient descent on the BT negative log-likelihood with fixed learning rate K (Olesker-Taylor, NeurIPS 2024). Key implications:

- **Convergence:** Time-averaged Elo ratings converge to BT parameters, but with fixed K they perpetually oscillate around the optimum (never converge in total variation)
- **No-regret:** Elo provides formal no-regret guarantees even under model misspecification — a property BT MLE does not inherently have (Tang et al., 2025)
- **K=32 rationale:** Matches USCF standard for players rated below 2100. Higher K → faster convergence but more volatility; lower K → stability but slow to reflect true strength. K=32 is well-suited for our early-stage dataset where rapid convergence matters more than stability

#### Leaderboard Plot Specifications

**Plot 1 — Win Fraction Matrix (Heatmap)**

- **Data:** `win_rate[i,j] = (a_win[i,j] + b_win[j,i]) / (battles[i,j] + battles[j,i])` — pools wins from both display positions to neutralize position bias
- **Ties:** Excluded ("Tie" and "Both Bad" stripped before computation)
- **Sort:** Rows/columns sorted by Elo rating (strongest top-left)
- **Color scale:** Diverging — blue (→1.0, row model dominates) → white (0.5, even) → red (→0.0, row model loses). Diagonal cells = 0 (no self-battles)
- **Primary diagnostic use:** Detecting transitivity violations invisible in aggregate rankings
- **Model dependency:** None — cell values are entirely model-free. Only sort order changes between Elo and BT
- **Limitation:** Cannot display ties (20–30% of battles); unwieldy beyond ~30 models

**Plot 2 — Battle Count Matrix (Heatmap)**

- **Data:** Symmetric N×N grid, `counts[i,j] = counts[j,i]` (ties excluded)
- **Color scale:** Sequential — yellow (high count) → dark-purple (low count)
- **Statistical guidance:** SE of win rate ∝ 1/√n. Pairs with <50 battles → unreliable win rate estimates. To halve CI width → need ~4× battles
- **Reading order:** Read this plot FIRST. If a cell has <50 battles, treat the corresponding win rate and ranking as unreliable
- **Model dependency:** None — raw counts are independent of scoring system

**Plot 3 — Average Win Rate (Bar Chart)**

- **Data:** `avg_win_rate[i] = mean(win_rate[i,j] for all j≠i)` — arithmetic mean of pairwise win rates
- **"Uniform sampling" meaning:** Every opponent weighted equally. Beating the weakest model counts as much as beating the strongest — a deliberate non-parametric alternative that makes no logistic link assumption
- **Display:** Horizontal bars sorted descending by avg win rate
- **Divergence from Elo ranking signals:** (1) sampling imbalance, (2) intransitivity, (3) link function mismatch, (4) order-dependent SGD noise (Elo-specific, not present in BT)
- **Compression effect:** Avg win rate saturates near 1.0 for dominant models, compressing top-tier differences that Elo better preserves
- **Model dependency:** None — calculation is model-free

**Plot 4 — Confidence Interval Dot-and-Whisker**

- **Method:** Bootstrap Elo (Arena's original 2023 approach)
  1. Shuffle full battle sequence into 1,000 random permutations
  2. Run Elo (K=32, initial=1000) on each permutation
  3. Record final ratings per model
  4. 2.5th and 97.5th percentiles → 95% CI
- **What CIs measure:** Combined sampling uncertainty + order-sensitivity (mixed signal — partly true statistical uncertainty, partly algorithmic variance from SGD order effects). CIs are systematically wider than BT CIs for the same data
- **Display:** Dot (point estimate) with horizontal whiskers (CI bounds). Models sorted descending by Elo score
- **Interpretation:** Non-overlapping CIs → statistically significant difference. Overlapping CIs → models may be indistinguishable (but note: overlapping marginal CIs don't automatically mean tied — formal pairwise test requires the covariance structure)
- **Computational cost:** O(M×N) per permutation. At our scale: runs in seconds
- **Model dependency:** YES — this is the only plot that depends on the scoring model

#### Diagnostic Workflow — Reading All Four Plots

```
Step 1: Battle Count Matrix → assess data quality (≥50 battles per pair?)
Step 2: Win Fraction Heatmap → inspect raw pairwise signal (anomalies? cycles?)
Step 3: Avg Win Rate Bar Chart → non-parametric sanity check (matches Elo order?)
Step 4: CI Dot-and-Whisker → determine statistical significance (which differences are real?)
```

#### Key References

| Source | Relevance |
|--------|-----------|
| Elo, A.E. (1978). *The Rating of Chessplayers, Past and Present.* Arco. | Original Elo formulation |
| Olesker-Taylor (NeurIPS 2024). "An Analysis of Elo Rating Systems via Markov Chains." | SGD interpretation, convergence guarantees |
| Tang et al. (arXiv:2502.10985, 2025). | No-regret guarantees under misspecification |
| Chiang et al. (ICML 2024, arXiv:2403.04132). | BT MLE formalization, active sampling, bootstrap/sandwich CIs |
| Ameli et al. (ICLR 2025, arXiv:2412.18407). | Factored tie model, rank spreads, Thurstonian covariance |
| Zheng et al. (NeurIPS 2023, arXiv:2306.05685). | Original Arena launch, Elo methodology |
| lmsys.org/blog/2023-12-07-leaderboard/ | Arena's Elo→BT transition rationale |
| github.com/lmarena/arena-rank | Open-sourced BT pipeline reference |

### F. Arena.ai vs ViGen Arena — Feature Comparison

*Last updated: March 12, 2026. Sources: arena.ai/how-it-works, arena.ai/faq, arena.ai/blog/arena-category, arena.ai/blog/arena-expert, Play Store listing.*

#### Modes

| Feature | Arena.ai | ViGen Arena (P0) | Delta |
|---------|----------|-----------------|-------|
| Battle (blind pairwise) | ✅ Votes count toward leaderboard | ✅ Same | Parity |
| Side-by-Side (named) | ✅ Votes do NOT count toward leaderboard | ✅ Votes DO count | ViGen differs — deliberate design choice |
| Direct Chat | ✅ No voting/rating | ✅ 1-5 star rating + quality tags | ViGen adds star rating |
| Arena Max (smart router) | ✅ Routes prompt to best model based on 5M+ votes | ❌ P3-1 | Gap — long-term |
| Follow-up after vote reveal | ✅ New model pair sampled, winner context passed | ❌ P2-10 | Gap — future |

#### Categories & Filtering

| Feature | Arena.ai | ViGen Arena (P0) | Delta |
|---------|----------|-----------------|-------|
| Category chips on battle screen | ✅ 8 base categories | ❌ Removed from P0 | Categories are leaderboard-only (P1-2) |
| Occupational subcategories | ✅ 23 subcategories | ❌ P1-2 | Gap — post-launch |
| Category leaderboards (independent Elo per category) | ✅ | ❌ P1-2 | Gap — post-launch |
| Style Control (length/verbosity normalization) | ✅ On leaderboard | ❌ P1-3 | Gap — post-launch |

#### Leaderboard

| Feature | Arena.ai | ViGen Arena (P0) | Delta |
|---------|----------|-----------------|-------|
| Main ranking table | ✅ Bradley-Terry MLE | ✅ Elo (K=32) | Different methodology, parity on UX |
| Win Fraction Matrix | ✅ | ✅ | Parity |
| Battle Count Matrix | ✅ | ✅ | Parity |
| Average Win Rate bar chart | ✅ | ✅ | Parity |
| Confidence Interval plot | ✅ Sandwich CIs (BT) | ✅ Bootstrap Elo CIs | Different method, parity on UX |
| Preliminary badge (low-vote models) | ✅ ~1,000+ votes needed | ❌ P1-7 | Gap — post-launch |
| Rank Spread column | ✅ | ❌ P1-5 | Gap — post-launch |

#### Specialized Arenas

| Feature | Arena.ai | ViGen Arena (P0) | Delta |
|---------|----------|-----------------|-------|
| Text Arena | ✅ 323 models | ✅ 12 models | Scale gap (expected at launch) |
| Vision Arena | ✅ 89 models | ❌ Not planned | Out of scope (Non-Goal #1) |
| Video Arena | ✅ 15 models (Jan 2026) | ❌ Not planned | Out of scope |
| Text-to-Image Arena | ✅ 50 models | ❌ Not planned | Out of scope |
| Copilot Arena (code) | ✅ | ❌ Not planned | Out of scope |
| WebDev Arena | ✅ | ❌ Not planned | Out of scope |

#### Auth & User

| Feature | Arena.ai | ViGen Arena (P0) | Delta |
|---------|----------|-----------------|-------|
| Guest voting (anonymous) | ✅ Limited battles before sign-up gate | ✅ 3 battles → auth modal | Parity |
| Google login | ✅ | ✅ (already built) | Parity |
| Email/password | [VERIFY] | ✅ (already built) | ViGen adds |
| 2FA | [VERIFY] | ✅ (already built) | ViGen adds |
| Profile page | [VERIFY] | ✅ (already built) | ViGen adds |
| User vote count / contribution stats | Minimal | ✅ Vote count + mode breakdown + history | ViGen adds |

#### UI / UX

| Feature | Arena.ai | ViGen Arena (P0) | Delta |
|---------|----------|-----------------|-------|
| Conversation history + search | ✅ (added in rebrand) | ✅ P0 sidebar + search | Parity |
| Suggested prompts | ✅ | ✅ Exactly 3 random prompt cards (text only, no category chips) | Parity |
| Mobile responsive | ✅ + native Android app | ✅ Responsive web only | Gap — no native app (P3-2) |
| Share battle result | ✅ Link/image share | ❌ P1-6 | Gap — post-launch |
| Vote color feedback (winner/loser highlight) | ❌ Not visible | ✅ Green/red/faded + emoji | ViGen adds |
| Multi-turn in all modes | ✅ | ✅ P0-12 | Parity |
| Theme | ✅ Dark default | ✅ Light elegant | Different default |

#### Data & Research

| Feature | Arena.ai | ViGen Arena (P0) | Delta |
|---------|----------|-----------------|-------|
| Open preference dataset | ✅ 140K+ public conversations | ❌ P2-11 | Gap — future |
| API access | ✅ | ❌ P2-6 | Gap — future |

#### Summary

**ViGen has parity or exceeds Arena.ai on:** core voting loop (3 modes), multi-turn, guest gate, leaderboard with 4 statistical views, conversation history + search, suggested prompts, vote color feedback, star rating in Direct mode, SBS votes counting toward leaderboard, user contribution stats, 2FA, profile page.

**Deliberate out-of-scope for v1:** multi-modal arenas (vision, video, image, code, WebDev), Arena Max router, native mobile app, open dataset, API access.

**P1 gaps (post-launch sprint):** category leaderboards, style control, share battle result, rank spread, preliminary badge.

**P2-P3 gaps (future):** follow-up after vote reveal, open preference dataset, API, VIX composite, smart model router, native mobile app.
