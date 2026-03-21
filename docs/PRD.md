# Product PRD: AIV Open Data Portal

**Author:** AIV (AI for Vietnam)
**Status:** Active
**Target Launch:** April 5, 2026
**Last Updated:** March 21, 2026

---

## 1. Executive Summary

The AIV Open Data Portal is the first Vietnamese AI evaluation platform combining two complementary surfaces: automated benchmark leaderboards and human preference voting. The Benchmark Leaderboard gives researchers and enterprise decision-makers a trusted, reproducible comparison of how 12+ models perform on six Vietnamese-native benchmarks — covering knowledge, reasoning, commonsense, instruction-following, coding, and pedagogy. The Arena gives Vietnamese speakers a blind pairwise evaluation experience that produces Elo-based rankings driven by real human preference. Together, these two features establish the Open Data Portal as the definitive reference for Vietnamese AI model quality, filling a gap that every global platform — Arena.ai, Scale AI SEAL, artificialanalysis.ai — has left unaddressed.

---

## 2. Problem Statement

Two interconnected problems make it impossible for Vietnamese researchers, enterprises, and AI practitioners to make informed decisions about AI model quality:

**The benchmark problem:** Existing global benchmarks do not capture Vietnamese nuance. SEA-HELM's Vietnamese slice confirms basic capability but does not reflect culture, idioms, politeness registers, local knowledge, or multi-turn behavior. Results are fragmented across different prompts, settings, and reporting standards, creating slow evaluation cycles and unreliable model selection signals. There is no standard way to compare model performance in Vietnamese across core capabilities.

**The human signal problem:** There is no trusted, large-scale way to evaluate how generative AI models perform in Vietnamese through human judgment. Global arenas (Arena.ai, Scale AI SEAL, Vellum) are English-centric — Arena.ai supports seven languages but not Vietnamese. Vietnamese speakers have no way to systematically compare models on accuracy, fluency, cultural nuance, or tone. Without a Vietnamese-first evaluation platform, model developers lack signal on Vietnamese performance, enterprises make uninformed build-vs-buy decisions, and the Vietnamese AI community has no shared reference point for model quality.

---

## 3. Target Users & Personas

### Persona 1: AI/ML Practitioner / Researcher
- **Mindset:** Needs a trusted, reproducible view of how models perform in Vietnamese without running evaluations themselves.
- **Goal:** Quickly see rankings across Vietnamese benchmarks, understand what each benchmark measures, and share citable results with clear methodology. Also wants to compare two LLMs on a Vietnamese prompt without knowing which model is which, so evaluation is unbiased.

### Persona 2: Enterprise AI Decision-Maker (PM / CTO)
- **Mindset:** Evaluating which LLM to integrate into a Vietnamese-language product. Needs a trustworthy signal to justify a vendor or model choice. Cares about cost-performance tradeoff.
- **Goal:** Compare models on both Vietnamese benchmark performance and cost/infra metrics to find the best value. Understand which model is "good enough" for Vietnamese language tasks and what it will cost to run at scale — without running their own evaluations.

### Persona 3: Vietnamese Power User / Domain Expert
- **Mindset:** Cares about Vietnam-first quality including naturalness, tone, idioms, local context, and safety. Will contribute if the workflow is lightweight and recognition is clear.
- **Goal:** Participate in arena matchups with clear rubrics. Vote on blind head-to-head model outputs so rankings reflect real Vietnamese preferences, not only automated tests. Flag low-quality or unsafe behavior to improve evaluation standards.

---

## 4. Strategic Context

### Competitive Landscape

| Competitor | Strength | Gap |
|------------|----------|-----|
| **llm-stats.com** | Community-first; arenas, playground, API access; strong composite scoring | No Vietnamese language coverage |
| **artificialanalysis.ai** | Best-in-class cost/performance tradeoff charts; independent, rigorous methodology | English-centric; no Vietnamese benchmarks |
| **Vellum.ai** | Clean leaderboard UX; task-specific views; open-source filter | No Vietnamese language coverage |
| **Scale AI (SEAL)** | Research-grade methodology; task-specific leaderboards | English-centric; no Vietnamese-native benchmarks |
| **Arena.ai (LMSYS)** | 6M+ votes; 323 ranked models; blind pairwise gold standard | Supports 7 languages — Vietnamese is not one of them |

None of these platforms offer Vietnamese-native benchmarks, Vietnamese cultural evaluation criteria, or a Vietnamese human preference voting corpus.

### Why Now

Three forces make April 2026 the right moment:

1. **Market gap is confirmed.** No platform provides Vietnamese-first AI evaluation. Vietnamese enterprises selecting LLMs for production use have no trusted reference — they rely on anecdotal testing or English-language benchmarks that do not predict Vietnamese user experience.
2. **NIC and Meta partnership.** AIV has institutional backing that creates a credible launch moment and a path to becoming the official Vietnamese AI evaluation standard cited by government and international partners.
3. **AI adoption is accelerating in Vietnam.** The window to establish the reference platform closes as larger players internationalize. First-mover in Vietnamese evaluation is a durable moat.

---

## 5. Solution Ideation & Prioritization

Two features were selected for the April 5 launch: **Benchmark Leaderboard** and **Arena**. These were chosen because they address both sides of the evaluation problem — automated signals and human signals — and they are mutually reinforcing: benchmark scores give researchers a starting point; arena votes validate those results with real Vietnamese preference data.

Feature specs live in:
- `features/benchmark-leaderboard/SPEC.md`
- `features/arena/SPEC.md`

### Benchmark Leaderboard: Priority Table

| Priority | Feature |
|----------|---------|
| **P0** | Benchmark leaderboard table (sortable, filterable, 6 ViGen benchmarks), model cost & infra stats, methodology tooltips, last-updated timestamp, mobile-responsive design |
| **P1** | Per-benchmark deep dive pages, Composite Vietnamese Intelligence Index (VIX), filter by model type, confidence intervals/sample size, model submission form |
| **P2** | Embed/share snapshots, dark mode, English language toggle, public API access |
| **P3** | Hugging Face auto-sync, email alerts for leaderboard changes, blog/changelog section |

### Arena: Priority Table

| Priority | Feature |
|----------|---------|
| **P0** | Battle Mode (blind pairwise), Side-by-Side Mode, Direct Chat Mode, Arena Leaderboard with Elo + statistical views, Vietnamese-first UI, guest voting + sign-up gate, user authentication integration, vote persistence, response pair serving, mobile-responsive design, Elo calculation engine, multi-turn support across all three modes |
| **P1** | Anti-gaming (rate limiting, duplicate detection), category leaderboards, style control toggle, suggested prompt rotation, rank spread column, share battle result, preliminary badge for low-vote models |
| **P2** | VIX composite score, live LLM inference, VNeID verification, model submission portal, vote quality scoring, public API, English toggle, embed widget, multi-modal arena, open preference dataset |
| **P3** | Smart model router, native mobile app |

---

## 6. Solution Overview

### Vision

Build the trusted source of truth for Vietnamese AI model quality, where anyone can discover, compare, and understand which models perform best for real Vietnamese use cases. Become the go-to platform for evaluating Vietnamese AI — combining rigorous automated benchmarks, transparent methodology, and human preference voting — so researchers, builders, and the Vietnamese community can confidently choose and improve models for Vietnam.

### System Architecture

| Layer | Technology |
|-------|-----------|
| **Frontend** | ReactJS, Tailwind CSS, Shadcn/ui — Vietnamese-first, light elegant theme, responsive |
| **Backend API** | Python FastAPI (async) — vote submission, pair serving, user auth |
| **Database** | MySQL on AWS EC2 — users, prompts, responses, votes, elo_snapshots, benchmark scores |
| **Auth** | Existing system (already built) — Google social login + email/password, JWT |
| **Elo Engine** | Python batch job (daily cron) — K=32, base-10 logistic, bootstrap CIs (1,000 permutations) |
| **Response Store** | MySQL + S3 — pre-computed response pairs for Arena MVP |
| **Deployment** | Docker on EC2, Cloudflare CDN — single-instance MVP, horizontally scalable |
| **Monitoring** | Datadog or Grafana — uptime, latency, vote throughput |

---

## 7. Design Specification — Cutline

### In Scope for April 5 Launch (P0)

**Arena:**
- Three evaluation modes: Battle (blind pairwise), Side-by-Side (known models), Direct Chat (single model, star rating)
- Arena Leaderboard with Elo scores, confidence intervals, win rates, and statistical diagnostic views
- Vietnamese-first UI with prompt categories in Vietnamese
- Guest voting (3 battles before sign-up gate)
- Multi-turn conversations across all three modes
- Vote persistence with retroactive guest attribution

**Benchmark Leaderboard:**
- Sortable, filterable leaderboard table across 6 ViGen benchmarks
- Model cost and infra stats (token price, context window, provider, license, availability)
- Methodology tooltips on each benchmark score
- Last-updated timestamp
- Mobile-responsive design

**Platform:**
- User authentication (Google + email/password, integration only — auth already built)
- "Community Coming Soon" placeholder tab (no standalone community page at launch)

### Deferred (Post-Launch)

- Vietnamese Intelligence Index (VIX) composite score — requires validated methodology
- Live LLM inference — pre-computed responses only at launch
- Category leaderboards — requires prompt auto-classification backend
- Anti-gaming beyond basic rate limiting
- Per-benchmark deep dive pages
- English language toggle
- Any monetization

---

## 8. Success Metrics

### Pre-Launch Targets (by April 5)

| Metric | Target |
|--------|--------|
| Models ranked on Arena leaderboard | >= 12 |
| Prompt/response sets seeded | >= 30 |
| ViGen benchmark datasets loaded | 6 |
| Design and dev complete | March 31 |

### Leading Indicators (First 30 Days)

| Metric | Target |
|--------|--------|
| Registered voters | >= 1,000 |
| Total votes collected | >= 5,000 |
| Votes per session (avg) | >= 3 |
| Battle mode usage share | >= 60% |
| Mobile vote share | >= 40% |
| Page load time (P95) | <= 3s |

### Lagging Indicators (60-90 Days)

| Metric | Target |
|--------|--------|
| Total Arena votes | >= 10,000 |
| Registered voters | >= 2,000 |
| Weekly active voters | >= 500 |
| Voter retention (Week 4+) | >= 30% |
| Models ranked with CI < +/-15 | >= 10 of 12 |
| External citations / press mentions | >= 5 |
| Partner references (NIC, Meta) | >= 2 |
| Community NPS | >= 40 |

---

## 9. Estimation & Timeline

### Gate Schedule

| Gate | Date | Purpose |
|------|------|---------|
| **G5** | March 19, 2026 | Engineering review — architecture, data flow, edge cases locked |
| **G6** | March 24-25, 2026 | Design review — high-fidelity design delivered, frontend unblocked |
| **G8** | March 27, 2026 | Milestone review — build progress checkpoint |
| **Beta** | April 1-4, 2026 | Internal + partner beta testing; final fixes only |
| **Launch** | April 5, 2026 | Public launch |

### Build Schedule

| Week | Dates | Focus |
|------|-------|-------|
| W1 | Mar 9-13 | PRD sign-off, architecture, infra setup, begin response pair curation (target: 30 sets), high-fidelity design start |
| W2 | Mar 16-20 | Battle Mode + vote submission API + response pair serving; Arena Leaderboard; continue curation (target: 50+ sets) |
| W3 | Mar 23-27 | Side-by-Side + Direct modes; Elo batch job integration; mobile responsive pass; Vietnamese copy review |
| W4 | Mar 28-31 | QA, bug fixes, deployment to staging — all dev complete by March 31 |

### Hard Dependencies

- High-fidelity design delivered by March 13 — blocks frontend Week 2
- 30+ response pairs ready by March 20 — blocks Battle Mode testing
- Auth integration into Arena UI complete by March 20 — auth system already built, just needs Arena hookup
- All development and testing complete by March 31 — April 1-4 is beta buffer only

---

## 10. User Stories & Requirements

Detail lives in feature specs (`features/benchmark-leaderboard/SPEC.md`, `features/arena/SPEC.md`). Product-level epics:

**Epic 1 — Evaluate:** A user can submit a Vietnamese prompt and receive AI-generated responses for evaluation.

**Epic 2 — Compare:** A user can compare models side-by-side, blind or with known identities, and cast a preference vote.

**Epic 3 — Rank:** The platform surfaces ranked model performance — both Elo-based (Arena) and benchmark-based (Leaderboard) — with confidence indicators and transparent methodology.

**Epic 4 — Discover:** A user can filter and sort models by benchmark, cost, provider, license type, and performance characteristics to find the right model for their use case.

**Epic 5 — Contribute:** A Vietnamese power user can participate in evaluation without signing in for the first three battles, with a lightweight path to account creation that attributes their prior votes.

**Epic 6 — Trust:** Every ranking surface shows when data was last updated, how many votes or samples support each score, and links to methodology documentation.

---

## 11. Out of Scope

The following are explicitly excluded from the April 5 launch and from the immediate post-launch roadmap unless otherwise noted:

- **Multi-modal evaluation** (image, audio, video) — text only at launch
- **Real-time LLM inference** — pre-computed responses only; live API calls are Phase 2
- **Gamified data collection (Open Data Portal crowdsourcing)** — separate, deprioritized workstream
- **Vietnamese Intelligence Index (VIX)** — composite score combining Arena Elo + Benchmark scores deferred; timeline too aggressive to ship a well-calibrated composite metric at MVP
- **Monetization** — no paid tiers, API access fees, or sponsorship at launch
- **Model submission portal** — community-requested model evaluation is post-launch
- **Email alerts, blog/changelog section** — P3
- **Hugging Face auto-sync** — P3
- **Smart model router** — requires >100K votes to be statistically meaningful
- **Native mobile app** — evaluate after web traffic data shows mobile share >50%
- **VNeID verification** — optional Vietnam National ID weighting is P2
- **Open preference dataset** — requires privacy review before publication

---

## 12. Gating Timeline & Delivery Tracking

### Gate Checklist

| Gate | Date | Criteria | Status |
|------|------|----------|--------|
| **G5 — Eng Review** | Mar 19 | Architecture locked, data flow documented, edge cases resolved, infra provisioned | — |
| **G6 — Design Review** | Mar 24-25 | High-fidelity design delivered for all Arena modes + Leaderboard; component specs and responsive breakpoints complete | — |
| **G8 — Build Milestone** | Mar 27 | Battle Mode, Side-by-Side, Direct, Leaderboard all functional in staging; 30+ response pairs loaded; Elo engine running | — |
| **G9 — QA Complete** | Mar 31 | All P0 acceptance criteria passing; mobile pass complete; Vietnamese copy reviewed; no P0 bugs open | — |
| **Beta** | Apr 1-4 | Internal + partner testing; final fixes only; no new feature work | — |
| **Launch** | Apr 5 | Public launch — platform live at production domain | — |

---

## 13. Evaluation Plan

The G1 problems are solved if, within 90 days of launch:

**For the benchmark problem:**
- 6 ViGen benchmarks are publicly accessible with transparent methodology and reproducible scores
- Researchers can compare 12+ models on Vietnamese tasks without running evaluations themselves
- At least 2 external citations or references to ViGen benchmark results appear in research or enterprise contexts

**For the human signal problem:**
- 10,000+ human preference votes establish a statistically significant Vietnamese preference corpus
- At least 10 of 12 models are ranked with Elo confidence intervals of +/-15 or less
- NIC and/or Meta formally reference the Open Data Portal as a Vietnamese AI evaluation resource
- Community NPS >= 40 confirms platform credibility among Vietnamese AI practitioners

**Falsification criteria — the launch failed if:**
- Total votes remain below 5,000 at Day 60
- Inter-rater agreement (Cohen's kappa) falls below 0.4 (indicating voters are not meaningfully distinguishing model quality)
- No external partner references platform results within 90 days

---

## 14. Dependencies & Risks

### Dependencies

| Dependency | Owner | Required By |
|------------|-------|------------|
| API keys / access for 12 LLMs (pre-computing responses) | Engineering + Finance | Mar 20 |
| Production domain (vieteval.ai or equivalent) | Frank | Mar 27 |
| 6 ViGen benchmark datasets (data categories, scores per model) | Data / Research | Mar 27 |
| High-fidelity design (Arena modes + Leaderboard) | Design | Mar 13 |
| Response pair curation — 30 prompt/response sets | Data + Content | Mar 20 |
| Auth system integration into Arena UI | Engineering | Mar 20 |
| Legal review of vote data storage under Vietnam data privacy regulations | Legal (Nhi) | Mar 27 |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Response pair curation falls short of 30 sets by launch | Medium | High — blocks Battle Mode testing | Begin curation Week 1; assign dedicated resource |
| Design delivery slips past March 13 | Medium | High — blocks frontend Week 2 | Hard gate; escalate day 1 if delayed |
| Benchmark data incomplete for 1+ ViGen categories | Medium | Medium — reduces leaderboard credibility | Ship with available data; mark incomplete benchmarks as "coming soon" |
| Low initial voter turnout | Medium | High — insufficient data to establish credible rankings | Pre-seed votes through internal team; partner with NIC and Meta for launch amplification |
| Vietnam data privacy compliance unclear | Low | High — may require consent flow redesign | Legal review complete before G8; build consent modal as precaution |
| LLM API costs for pre-computing responses exceed budget | Low | Medium | Cap response pairs at 50 for MVP; negotiate provider credits |
| Production domain not secured in time | Low | High — launch blocked | Parallel track: secure domain by Mar 13 or identify fallback subdomain |

---

## 15. Open Questions

| # | Question | Owner | Impact |
|---|----------|-------|--------|
| 1 | **Voting rubric:** Guide voters on criteria (accuracy, fluency, cultural fit) or keep it simple ("which is better")? SBS and Direct votes — do they count toward leaderboard Elo? | Frank + Research | Vote UX and data schema |
| 2 | **Live inference timeline:** When does pre-computed responses -> live API calls? Determines cost model and model onboarding velocity. | Engineering + Finance | Architecture, burn rate |
| 3 | **Vietnamese-specific eval categories:** Should cultural categories (proverbs, tone, regional dialect) be first-class Arena categories or only leaderboard filters? | Frank + Content | Prompt curation, Elo segmentation |
| 4 | **Model onboarding post-launch:** Direct API integration, partner submission portal, or community request queue? | Frank + Engineering | Model expansion velocity |
| 5 | **Data privacy compliance:** What vote data do we store under Vietnam's emerging data privacy regulations? Explicit consent required for preference data? | Legal (Nhi) | Data schema, onboarding flow |
| 6 | **Response pair generation at scale:** Who generates pre-computed responses — do we run each model ourselves or partner with providers? | Engineering + Finance | Launch timeline, model count |
| 7 | **Benchmark data ownership:** For the 6 ViGen benchmarks, who owns dataset curation, scoring runs, and ongoing updates post-launch? | Research / Data | Benchmark credibility, maintenance burden |
