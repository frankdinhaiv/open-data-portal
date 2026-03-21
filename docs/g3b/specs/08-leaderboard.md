# G3B: Leaderboard

Covers: P0-4 | Date: March 12, 2026 | Status: G3B Design Review
Depends on: Elo Engine (07), Vote System (06) | Visual ref: arena-leaderboard-mockup.html

## 1. What This Feature Does

The leaderboard displays model rankings and 4 statistical views for deeper comparison. Main table shows Rank, Model Name, Elo Score, ±CI, Vote Count, Avg Win Rate, Organization. Four tabs provide win-fraction heatmap, battle-count matrix, average win rates, and bootstrap confidence intervals. Updated daily. Seeded by internal team votes.

## 2. Main Table

**Columns (sortable):**
- Rank (computed from Elo, descending)
- Model Name (full name, links to model detail page in v2)
- Elo Score (integer, e.g., 1087)
- ±CI (confidence interval width; displayed as "±45" if CI = [1042, 1132])
- Vote Count (total battles for this model)
- Avg Win Rate (mean win rate across all pairwise matchups; excludes ties)
- Organization (affiliation; blank if internal/research)
- License Type (badge: "Open" green or "Prop" purple — indicates open-source vs proprietary)

**Default sort:** Elo descending. User can click any column header to sort ascending/descending. Sort state (column + direction) persisted to localStorage (`vigen_lb_sort`) and restored on page reload.

**Updated:** Daily at 2 AM UTC (synchronized with batch job).

## 2b. Category Filter Tabs

Above the main table, a horizontal row of pill-shaped tabs allows filtering by prompt category. Each category maintains independent Elo rankings computed from votes cast on prompts in that category.

**Tabs (7 total):**
| Tab | Vietnamese Label | Icon | Description |
|-----|-----------------|------|-------------|
| Overall | Tổng hợp | 🏆 | All votes, default view |
| Knowledge | Kiến thức | 📚 | Factual explanations |
| Creative | Sáng tạo | ✍️ | Poetry, stories, creative text |
| Reasoning | Suy luận | 🧠 | Analysis, argumentation |
| Coding | Lập trình | 💻 | Code generation from Vietnamese specs |
| Culture | Văn hóa VN | 🇻🇳 | Proverbs, food, traditions, tone |
| Professional | Nghề nghiệp | 💼 | Emails, reports, business Vietnamese |

**Behavior:**
- Default tab: "Tổng hợp" (Overall) — shows aggregate Elo across all categories
- Clicking a category tab filters the table to show category-specific Elo scores
- Active tab highlighted with accent color fill; inactive tabs show border-only style
- Rankings may differ significantly by category (e.g., coding-focused models rank higher in Lập trình)
- Category assignment: prompts auto-classified by LLM classifier or keyword rules (engineering to propose approach)
- Statistical views (heatmaps, charts) below the table also update to reflect the selected category

## 3. Statistical Views (Tabs)

**Tab 1: "Bảng Xếp Hạng" (Ranking Table)**
- Main table view (default)
- All rows sortable

**Tab 2: "Ma Trận Thắng" (Win Fraction Matrix)**
- M×M heatmap (M = 12 models)
- Cell[i,j] = position-bias-corrected win rate of Model i vs j
- Color scale: blue (0%) → white (50%) → red (100%)
- Rows/columns sorted by Elo (descending)
- Detects transitivity violations (A > B, B > C, but C > A)

**Tab 3: "Số Trận" (Battle Count Matrix)**
- Symmetric N×N heatmap
- Cell[i,j] = number of battles between models i and j
- Color scale: yellow (few) → dark purple (many)
- Pairs <50 battles flagged as "unreliable" with tooltip
- Guides prioritization for future battles

**Tab 4: "Tỉ Lệ Thắng" (Average Win Rate)**
- Horizontal bar chart, sorted descending by mean win rate
- X-axis: 0–100% win rate
- Each model shows: name + mean pairwise win rate
- Non-parametric (median-based)

**Tab 5: "Khoảng Tin Cậy" (Confidence Intervals)**
- Dot-and-whisker plot
- Each dot = point estimate (Elo)
- Whiskers = 95% CI (bootstrap)
- Sorted by Elo (descending)
- Non-overlapping whiskers = statistically significant difference

## 4. Diagnostic Reading Order

1. Battle Count Matrix → identify data gaps (pairs <50 battles)
2. Win Fraction Matrix → spot transitivity issues, order effects
3. Average Win Rate → rank by mean pairwise win rate
4. Confidence Intervals → assess statistical significance of differences

## 5. Leaderboard Seeding

**Before public launch:**
- Data team runs 50+ internal team votes per model pair (6 pairs × 50 ≈ 300 total battles)
- Batch job computes initial Elo + CIs
- Leaderboard goes live with populated data
- Public votes accumulate; daily batch recomputes all ratings

## 6. Acceptance Criteria

- [ ] Table renders within 2 seconds (P99 latency)
- [ ] All columns sortable (including License); sort state persists to localStorage on page refresh
- [ ] License badge column renders "Open" (green) or "Prop" (purple) per model
- [ ] Category filter tabs render above table: Tổng hợp, Kiến thức, Sáng tạo, Suy luận, Lập trình, Văn hóa VN, Nghề nghiệp
- [ ] Clicking a category tab updates table with category-specific Elo rankings
- [ ] "Tổng hợp" tab is active by default; active tab visually highlighted
- [ ] Statistical views (heatmaps, charts) update when category tab changes
- [ ] Win fraction heatmap matches pairwise stats from Elo engine (within rounding)
- [ ] Battle count matrix shows symmetric data (i→j = j→i)
- [ ] Average win rate bars sum to >100% (non-zero-sum due to ties/bads)
- [ ] Confidence intervals match 95% bootstrap bounds from batch job
- [ ] All UI labels in Vietnamese; no English except model names
- [ ] Leaderboard updated daily by 2 AM UTC
- [ ] Seeding complete: 50+ battles per model pair before public launch

## 7. Out of Scope

- Model detail pages (v2)
- Custom filtering by organization (category filtering is included via tabs)
- Export to CSV/JSON (future)
- Real-time leaderboard updates (batch-only)
