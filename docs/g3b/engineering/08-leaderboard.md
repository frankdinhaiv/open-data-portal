# G3B: Leaderboard

Covers: P0-4 | Date: March 12, 2026 | Status: G3B Design Review
Depends on: Elo Engine (07), Vote System (06) | Visual ref: ../prototype/arena-prototype.html

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
- License Type (badge: "Open" with green styling for open-source models, "Prop" with purple styling for proprietary models)

**Default sort:** Elo descending. User can click any column header to sort ascending/descending.

**Sort persistence:** Current sort column and direction saved to localStorage under key `vigen_lb_sort`. On page reload, leaderboard restores last sort state.

**Updated:** Daily at 2 AM UTC (synchronized with batch job).

## 2b. Category Filter Tabs

**Location:** Horizontal tab bar above the main leaderboard table.

**Tabs (7 total):**
- 🏆 Tổng hợp (Overall) — default, shows aggregate Elo across all categories
- 📚 Kiến thức (Knowledge)
- 🎨 Sáng tạo (Creative)
- 💻 Lập trình (Coding)
- 🇻🇳 Văn hóa VN (Culture)
- 🧮 Toán học (Math)
- 💼 Nghề nghiệp (Professional)

**Behavior:**
- Clicking a category tab filters the leaderboard to show per-category Elo ratings
- Per-category Elo computed from votes on prompts in that category only
- Rankings may differ across categories (a model strong in coding may rank lower in creative)
- Active tab highlighted with accent color; inactive tabs show muted styling
- Category selection does NOT persist to localStorage (resets to "Tổng hợp" on page reload)

**Note:** This is a P1-2 feature partially implemented in the prototype. Full per-category Elo requires prompt auto-classification (engineering to propose approach: LLM classifier vs. keyword rules). Prototype uses simulated per-category offsets for demonstration.

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
- [ ] All columns sortable; sort state persists in localStorage under key `vigen_lb_sort`
- [ ] License Type column displays badge per model ("Open" green / "Prop" purple)
- [ ] Category filter tabs (7) render above table; clicking filters to per-category Elo
- [ ] "Tổng hợp" tab active by default; category selection resets on page reload
- [ ] Win fraction heatmap matches pairwise stats from Elo engine (within rounding)
- [ ] Battle count matrix shows symmetric data (i→j = j→i)
- [ ] Average win rate bars sum to >100% (non-zero-sum due to ties/bads)
- [ ] Confidence intervals match 95% bootstrap bounds from batch job
- [ ] All UI labels in Vietnamese; no English except model names
- [ ] Leaderboard updated daily by 2 AM UTC
- [ ] Seeding complete: 50+ battles per model pair before public launch

## 7. Out of Scope

- Model detail pages (v2)
- Custom filtering by organization (category tabs are partially implemented)
- Export to CSV/JSON (future)
- Real-time leaderboard updates (batch-only)
