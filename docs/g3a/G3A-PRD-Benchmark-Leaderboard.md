# G3A PRD: Benchmark Leaderboard — Vietnamese AI Model Evaluation Platform

**Author:** Trang Tran — AIV (AI for Vietnam)
**Source:** [Google Slides Deck](https://docs.google.com/presentation/d/1Vy4V17pnRMwvdihzC82JviaMCwX7pFq9Qel2iB6q6Nk/edit)
**Status:** Active
**Workstream:** PM1: Benchmark Leaderboards and Model Pages
**Target Launch:** April 5, 2026

---

## G1 — Problem Statement

A richer Vietnamese benchmark leaderboard is needed because:

1. **Existing benchmarks don't capture Vietnamese nuance.** SEA-HELM's Vietnamese slice confirms basic capability, but doesn't fully reflect culture, idioms, politeness, local knowledge, or multi-turn behavior — so scores don't reliably predict real user experience.
2. **Results are fragmented and inconsistent.** Different prompts, settings, and reporting cause slow evaluation cycles and risky model selection for Vietnamese user experiences.
3. **No standard comparison exists.** There is no standard way to compare model performance in Vietnamese across core capabilities (knowledge, reasoning, instruction-following, coding).

---

## Vision (G3a)

Build the trusted source of truth for Vietnamese AI model quality, where anyone can discover, compare, and understand which models perform best for real Vietnamese use cases.

Become the go-to platform for evaluating Vietnamese AI, combining rigorous benchmarks, transparent methodology, and accessible model insights so researchers, builders, and the community can confidently choose and improve models for Vietnam.

---

## User Personas

### Persona 1: AI/ML Practitioner/Researcher
- **Mindset:** Needs a trusted, reproducible view of how models perform in Vietnamese without having to run evaluations.
- **User Story:** As a researcher or engineer, I want a credible LLM leaderboard tailored to Vietnamese language so I can compare models, cite results, and decide what to explore next.
- **Goal:** Quickly see rankings across Vietnamese benchmarks and understand what each benchmark measures. Share and cite results with clear methodology notes.

### Persona 2: Enterprise AI Decision-maker (e.g. PM)
- **Mindset:** Evaluating which LLM to integrate into a Vietnamese-language product. Needs a trustworthy signal to justify a vendor or model choice. Cares about cost-performance tradeoff.
- **User Story:** As a product lead or CTO at a Vietnamese tech company, I want to see how models rank on Vietnamese-specific tasks alongside their cost and availability, so I can make a confident build-vs-buy decision without running my own evaluations.
- **Goal:** Compare models on both Vietnamese benchmark performance and cost/infra metrics to find the best value. Quickly understand which model is "good enough" for Vietnamese language tasks and what it will cost to run at scale.

### Persona 3: Vietnamese Power User / Domain Expert
- **Mindset:** Cares about Vietnam-first quality, including naturalness, tone, idioms, local context, and safety. Will contribute if the workflow is lightweight and recognition is clear.
- **User Story:** As a Vietnamese speaker or domain expert, I want to vote on blind head-to-head model outputs so the rankings reflect real Vietnamese preferences, not only automated tests.
- **Goal:** Participate in arena matchups with clear rubrics (helpfulness, correctness, Vietnamese naturalness, safety). Flag low-quality or unsafe behavior to improve evaluation standards.

---

## ViGen Benchmarks (6 Total)

| Benchmark | First Release | Primary Metric | Core Competency Measured |
|-----------|--------------|----------------|--------------------------|
| SEA-HELM-VN | 2026 | Varies by task (see metrics appendix) | Multilingual reasoning, regional knowledge, safety alignment, cultural grounding |
| Vi-MMLU | 2026 | Accuracy (%) | Knowledge breadth, domain reasoning, test-taking robustness |
| Vi-HellaSwag | 2026 | Accuracy (%) | Commonsense reasoning, situational plausibility, everyday logic |
| Vi-MT-Bench | 2026 | LLM-judge score (1–10), Pairwise win-rate, Elo rating | Multi-turn reasoning and safety, instruction-following, conversational coherence |
| Vi-HumanEval-X | 2026 | Pass@k | Code synthesis, functional correctness, algorithmic reasoning |
| DeepEduBench | 2026 | Test: 14k | Knowledge competency, pedagogical capability, assessment skills, safety & policy compliance |

### SOTA Benchmarks (Reference)

| Benchmark | First Release | Sample Size | Primary Metric | Core Competency |
|-----------|--------------|-------------|----------------|-----------------|
| SEA-HELM | 2025 | ~5k–20k | Varies by task | Multilingual reasoning, regional knowledge, safety alignment |
| MMLU | 2021 | val/test: 1.5k/14k | Accuracy (%) | Knowledge breadth, domain reasoning |
| HellaSwag | 2019 | val/test: 10k/10k | Accuracy (%) | Commonsense reasoning, everyday logic |
| MT-Bench | 2023 | val/test: 2k/3k | LLM-judge score (1–10), Elo rating | Multi-turn reasoning, instruction-following |
| HumanEval | 2021 | test: 164 | Pass@k (k=1,10) | Code synthesis, functional correctness |

---

## G2 — Ideas and Prioritization

### P0 (Must Have)

| Feature | Description |
|---------|-------------|
| **Benchmark Leaderboard Table** | Sortable, filterable table showing all models ranked by score on each of the 6 Vietnamese benchmarks. Default sort by composite score. |
| **Last Updated** | Visible timestamp on when each model's score (or the entire leaderboard table) was last updated. |
| **Model Cost & Infra Stats** | Input/output token price, context window, provider, license type, availability (API/open weights). |
| **Benchmark Score Display with Methodology Tooltips** | Each score cell shows numeric score with hover tooltip explaining what that benchmark tests. |
| **Mobile-Responsive Design** | Table and site layout fully usable on mobile devices. |

### P1 (Should Have)

| Feature | Description |
|---------|-------------|
| **Per-Benchmark Deep Dive Page** | Dedicated page for each benchmark with description, methodology, dataset source, example questions, and full model rankings. |
| **Composite Vietnamese Intelligence Index (VIX)** | Single aggregate score across all 6 benchmarks, configurable by benchmark category weights. |
| **Filter by Model Type** | Filter by open-source vs proprietary, by provider, or by modality. |
| **Benchmark Score Confidence Intervals / Sample Size** | Show sample count and ± error margin on scores where applicable. |
| **Submit / Suggest a Model Form** | Simple form for teams or researchers to request a new model be evaluated. |

### P2 (Nice to Have)

| Feature | Description | Status |
|---------|-------------|--------|
| **Embed / Share a Snapshot** | Shareable link or embed code for filtered/sorted leaderboard views. | Deferred |
| **Dark Mode** | Full site dark mode toggle. | Build |
| **English Language Toggle** | Full UI available in Vietnamese or English. | Build |
| **API Access to Leaderboard Data** | Public read-only REST API returning benchmark data in JSON. | Deferred |

### P3 (Deferred)

| Feature | Description |
|---------|-------------|
| Integration with Hugging Face | Auto-sync model metadata from Hugging Face APIs. |
| Email Alerts for Leaderboard Changes | Notify users when scores update or new models enter top N. |
| Blog / Changelog Section | Lightweight blog for benchmark updates and methodology changes. |

---

## G3b — What We're Building

### Methodology Layer
- Per-Benchmark Deep Dive Pages (dedicated page per benchmark with description, methodology, dataset source, example questions, rankings)
- Benchmark Score Confidence Intervals / Sample Size
- Composite Vietnamese Intelligence Index (VIX)

### Model Discovery and Filtering
- Filter by Model Type (open-source vs proprietary, by provider)
- Submit / Suggest a Model Form

### Community Tab (April 5 Launch)
**Decision: Option 4** — "Community Coming Soon" placeholder tab + Top Voters table embedded in Arena leaderboard (not standalone).

Rationale: Costs almost nothing to implement, keeps the door open for a real community page later, avoids a standalone Top Voters table with no context.

---

## Workstreams

| Workstream | Mission | Key Features | Primary Personas |
|------------|---------|--------------|------------------|
| **PM1: Benchmark Leaderboards and Model Pages** | Make Vietnamese benchmark results easy to find, understand, and trust | Overall leaderboard, per-benchmark leaderboards, model scorecards, benchmark detail pages, compare view, filtering, search, shareable permalinks, "last updated" banners | Model Evaluator, Model Chooser |
| **PM2: Arena and Human Preference Ranking** | Build an arena that produces credible Vietnamese preference signals | Arena matchups, voting rubric, blind evaluation UX, voter feedback, confidence indicators, arena leaderboard, anti-spam checks | Arena Voter, Model Chooser |
| **PM3: Data Platform and Operations** | Keep the platform accurate, current, and scalable | Data ingestion pipelines, data QA, versioning, audit logs, admin console, model onboarding workflow | Internal ops |
| **PM4: Growth** | Drive adoption, retention, and credibility | Landing pages, onboarding, trust/methodology pages, content calendar, analytics events | All personas |

---

## G10 — Competitive Analysis

### Competitors Evaluated
1. **llm-stats.com** — Community-first benchmarking hub with arenas, playground, and API access
2. **artificialanalysis.ai** — Independent analysis focused on quality, performance/speed, and price
3. **Vellum.ai** — Clean leaderboard UX with task-specific views
4. **Scale AI** — Research-grade leaderboard (SEAL)

### Feature Comparison Summary

| Feature | Scale AI | Vellum.ai | ArtificialAnalysis | llm-stats |
|---------|----------|-----------|---------------------|-----------|
| Global leaderboard | ✅ | ✅ | ✅ | ✅ |
| Task/benchmark-specific leaderboards | ✅ | ✅ | ✅ | ✅ |
| Composite score/index | ◐ | ◐ | ✅ | ◐ |
| Open-source-only leaderboard | — | ✅ | ◐ | ✅ |
| Multi-modality beyond text | — | — | ✅ | ✅ |
| Context window displayed | — | ✅ | ✅ | ✅ |
| Token pricing shown | — | ✅ | ✅ | ✅ |
| Speed/latency metrics | — | ✅ | ✅ | ◐/✅ |
| Cost-performance tradeoff charts | — | ◐ | ✅ | ◐ |
| Side-by-side model comparison | — | ◐ | ✅ | ✅ |
| Interactive playground | — | — | — | ✅ |
| Community integration | — | ✅ | — | ◐ |

Legend: ✅ built-in, ◐ partial/adjacent, — not a focus

---

## Appendix: Benchmark Metrics Detail

### MMLU & HellaSwag
- Accuracy over multiple-choice questions: # correct / N total
- Model chooses highest-likelihood option
- Large test size → stable ranking

### MT-Bench
- LLM-As-Judge Score: Judge (usually GPT-4) assigns 1–10 quality score per answer
- Pairwise Win Rate: comparison against baseline

### HumanEval
- Pass@k: probability that at least one of k generated code samples passes all tests
- Usually Pass@1, Pass@10
- Only 164 problems → high variance, large confidence intervals

### SEA-HELM Metrics by Task

| Task | Metric |
|------|--------|
| Translation | MetricX-24 score |
| Summarization | ROUGE-L |
| Natural Language Inference | Normalized balanced accuracy |
| Causal Reasoning | Normalized balanced accuracy |
| Sentiment Analysis | Normalized balanced accuracy |
| Question Answering | F-1 or Normalized balanced accuracy |
| Metaphor Understanding | Normalized balanced accuracy |
| Syntactic Understanding | Normalized balanced accuracy |
| Pragmatic Understanding | Normalized balanced accuracy |
| Toxic Detection | Normalized balanced accuracy |
| Cultural Alignment | Normalized balanced accuracy |
| General Knowledge | Normalized balanced accuracy |

---

## References

- SEA-HELM leaderboard: https://leaderboard.sea-lion.ai/
- Elo ratings beyond arena-style evaluations: https://cohere.com/blog/elo-ratings-beyond-arena-style-evaluations
- H2O LLM Eval: https://github.com/h2oai/h2o-LLM-eval
- LLM Evaluation Benchmarking (Zylos AI): https://zylos.ai/research/2026-01-16-llm-evaluation-benchmarking
- LLM as Judge (LangChain): https://blog.langchain.com/introducing-align-evals/
- MMLU benchmark: https://llm-stats.com/benchmarks/mmlu
- Lo-fi mockup: https://chatgpt.com/canvas/shared/69a7c08b9b2c8191b286720e4bc39c18
