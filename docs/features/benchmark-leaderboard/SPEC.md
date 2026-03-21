# Benchmark Leaderboard

## Overview

Rankings of AI models on 6 Vietnamese-specific benchmarks: SEA-HELM-VN, Vi-MMLU, Vi-HellaSwag, Vi-MT-Bench, Vi-HumanEval-X, and DeepEduBench. Provides the trusted source of truth for Vietnamese AI model quality through automated evaluation.

**Source PRD:** `docs/g3a/G3A-PRD-Benchmark-Leaderboard.md`
**Target Launch:** April 5, 2026
**Workstream:** PM1 — Benchmark Leaderboards and Model Pages

---

## User Stories

### Researcher / AI-ML Practitioner
As a researcher or engineer, I want to view model rankings across all 6 Vietnamese benchmarks with clear methodology notes, so I can compare models, cite reproducible results, and decide what to explore or evaluate next — without having to run evaluations myself.

### Enterprise AI Decision-maker
As a product lead or CTO at a Vietnamese tech company, I want to see how models rank on Vietnamese-specific tasks alongside their cost and infrastructure stats, so I can make a confident build-vs-buy decision and justify a model choice to my team.

### Vietnamese Power User / Domain Expert
As a Vietnamese speaker or domain expert, I want to understand how benchmarks were designed and what they measure, so I can trust the rankings and flag gaps where automated scores don't reflect real Vietnamese language quality.

---

## Functional Requirements

### Leaderboard Table

**Priority: P0**

- Sortable table displaying all evaluated models ranked across the 6 Vietnamese benchmarks
- Default sort: composite score (descending)
- Per-column sort by individual benchmark score
- Last updated timestamp visible at the table level and per model row where applicable
- Model cost and infrastructure stats displayed per row:
  - Input token price
  - Output token price
  - Context window size
  - Provider name
  - License type (open-source vs proprietary)
  - Availability (API / open weights)
- Each benchmark score cell includes a hover tooltip explaining what that benchmark tests and its primary metric
- Mobile-responsive layout (P0): table remains usable on mobile — horizontal scroll or condensed view

### Per-Benchmark Deep Dive Pages

**Priority: P1**

Dedicated page for each of the 6 benchmarks containing:

- Benchmark name and description
- Methodology: how scores are calculated, evaluation protocol
- Dataset source and provenance
- Example questions or task prompts (illustrative)
- Full model rankings on that benchmark
- Sample size and confidence intervals where applicable (see Open Questions)

### Vietnamese Intelligence Index (VIX)

**Priority: P1**

- Single composite score aggregating performance across all 6 benchmarks
- Default weights: equal weighting across benchmarks
- Configurable by benchmark category weights (UI control TBD)
- VIX displayed as the default sort column in the main leaderboard table

### Model Filtering

**Priority: P1**

Filters available on the main leaderboard table:

- Open-source vs. proprietary
- By provider (e.g., OpenAI, Anthropic, Google, Vietnamese-origin providers)

**Submit / Suggest a Model form** — simple form for researchers or teams to request evaluation of a new model. Fields TBD (model name, provider, HuggingFace URL or equivalent, contact email).

### Community Tab

**Priority: P1 (April 5 launch)**

- "Coming Soon" placeholder tab in the main navigation — signals future community features without committing to a full page
- Top Voters table embedded within the Arena leaderboard (not a standalone page)
- Decision rationale (from PRD): Option 4 selected — minimal implementation cost, keeps the door open for a real community page post-launch, avoids an isolated Top Voters table with no surrounding context

### Benchmark Details

The 6 ViGen benchmarks and their key attributes:

| Benchmark | What It Measures | Primary Metric | Sample Size |
|-----------|-----------------|----------------|-------------|
| SEA-HELM-VN | Multilingual reasoning, regional knowledge, safety alignment, cultural grounding | Varies by task (see appendix) | TBD |
| Vi-MMLU | Knowledge breadth, domain reasoning, test-taking robustness | Accuracy (%) | TBD |
| Vi-HellaSwag | Commonsense reasoning, situational plausibility, everyday logic | Accuracy (%) | TBD |
| Vi-MT-Bench | Multi-turn reasoning and safety, instruction-following, conversational coherence | LLM-judge score (1–10), Pairwise win-rate, Elo rating | TBD |
| Vi-HumanEval-X | Code synthesis, functional correctness, algorithmic reasoning | Pass@k | TBD |
| DeepEduBench | Knowledge competency, pedagogical capability, assessment skills, safety & policy compliance | Test: 14k | 14,000 |

All 6 benchmarks have a 2026 first release date. Sample sizes for SEA-HELM-VN, Vi-MMLU, Vi-HellaSwag, Vi-MT-Bench, and Vi-HumanEval-X are pending data from the team (flagged as open question).

**SEA-HELM-VN metrics by task (from appendix):**

| Task | Metric |
|------|--------|
| Translation | MetricX-24 score |
| Summarization | ROUGE-L |
| NLI, Causal Reasoning, Sentiment, Metaphor, Syntactic, Pragmatic, Toxic Detection, Cultural Alignment, General Knowledge, Question Answering | Normalized balanced accuracy (or F-1 for QA) |

---

## Design Decisions

This section is intentionally thin — no engineering tier specs exist for this feature yet. Decisions will be added as the feature is built.

Key product decisions from the PRD:

| Decision | Priority | Status |
|----------|----------|--------|
| Mobile-responsive design | P0 | Build |
| Dark mode | P2 | Build |
| English language toggle | P2 | Build |
| Embed / share a snapshot | P2 | Deferred |
| API access to leaderboard data | P2 | Deferred |
| Hugging Face integration | P3 | Not built |
| Email alerts for leaderboard changes | P3 | Not built |

---

## UI/UX

- Figma: https://www.figma.com/design/s58LWGpASUoNlHMT51CghO/ViGen-Product-Release-R1
- Lo-fi mockup: https://chatgpt.com/canvas/shared/69a7c08b9b2c8191b286720e4bc39c18

---

## Edge Cases & Constraints

- Benchmark data currently lacks categories — flagged by Lộc, Mar 20. Category-based filtering and VIX weight configuration depend on this being resolved.
- JSON data structure for benchmark scores not yet defined — Lộc asked Trang, Mar 17. Leaderboard table rendering is blocked on this schema.
- Some benchmarks may have incomplete model coverage at launch — table must handle missing scores gracefully (e.g., "—" placeholder, no ranking distortion).
- Vi-HumanEval-X has high variance by design (small problem set, analogous to HumanEval's 164 problems) — confidence intervals will be wide; display must not overstate precision.

---

## Open Questions

- What is the JSON data structure for benchmark scores? (Lộc/Trang, Mar 17)
- How to handle missing category data in benchmark detail pages?
- Mobile-responsive table design for 6+ benchmark columns — horizontal scroll, column pinning, or condensed card view?
- Which benchmarks have enough samples to show ± confidence interval margins at launch?
- VIX weight configuration UI — slider per benchmark, preset weight profiles, or both?

---

_Note: This spec is intentionally thinner than the Arena spec. It will grow as the feature is built._
