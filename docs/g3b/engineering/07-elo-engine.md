# G3B: Elo Engine

Covers: P0-11 | Date: March 12, 2026 | Status: G3B Design Review
Depends on: Vote System (06), Data Model (00) | Visual ref: leaderboard-stats.html

## 1. What This Feature Does

The Elo engine computes model rankings from battle votes using Elo rating algorithm (K=32, base-10 logistic). It produces daily snapshots with 95% confidence intervals via bootstrap resampling, position-bias-corrected pairwise statistics, and real-time UI Elo updates. Leaderboard is seeded by internal team votes before public launch.

## 2. Core Algorithm

**Elo Formula:**
- Expected score (base-10 logistic): `E_A = 1 / (1 + 10^((R_B - R_A) / 400))`
- Rating update: `R'_A = R_A + K * (S_A - E_A)`
- K-factor: 32 (fixed)
- Initial rating: 1000
- Tie votes: S = 0.5 (treated as draw)
- "Both bad" votes: S = 0.5 (treated as draw)

**Bootstrap Confidence Intervals:**
- 1,000 random permutations of battle sequence
- Recompute Elo on each permutation
- Extract 2.5th and 97.5th percentile → 95% CI bounds
- Non-overlapping CIs indicate statistically significant differences

## 3. User Flow

**Leaderboard Initial State:**
1. Before public launch, data team runs internal team votes (50+ battles per model pair)
2. Batch job computes initial Elo + CIs from team votes
3. Leaderboard goes live with populated rankings (not empty)
4. Public votes accumulate; daily batch recomputes all ratings

**Daily Batch Job:**
1. Runs at 2 AM UTC (off-peak)
2. Reads all votes from past 24h
3. Recomputes Elo ratings for all 12 models
4. Recalculates bootstrap CIs (1,000 permutations per model)
5. Computes pairwise stats matrix (position-corrected win rates)
6. Writes snapshots to `elo_snapshots` table
7. Reconciles optimistic UI Elo with server truth

**Real-Time Elo Update:**
1. On vote submission, system calculates Elo delta using K=32 formula
2. UI optimistically updates leaderboard (Elo + vote count)
3. On next daily batch or page refresh, server-side snapshot becomes truth
4. Idempotent: if batch job encounters already-processed votes, skips them

## 4. Pairwise Statistics

**Win Fraction Matrix:**
- M×M symmetric matrix (M = number of models)
- Cell[i,j] = position-bias-corrected win rate of model i vs j
- Formula: (wins_ij - 0.5*ties_ij) / (wins_ij + losses_ij + ties_ij)
- Ties excluded from denominator in v1
- Detects order/position bias (A vs B ≠ B vs A without correction)

**Battle Count Matrix:**
- Symmetric N×N, shows battle count per pair
- Pairs with <50 battles flagged as "unreliable" in UI
- Used to prioritize future matchups

## 5. Key Behaviors

- Transitivity violations detected: if E_A > E_B > E_C but E_A < E_C in pairwise, flag for audit
- Orphaned votes (models decommissioned) skipped, logged
- Rating drift cap: single vote cannot shift Elo >32 points (K-factor safety)
- Migration trigger: if >500K cumulative battles and order-sensitivity becomes problematic → evaluate Bradley-Terry MLE

## 6. Acceptance Criteria

- [ ] Daily batch computes Elo + 95% CI within 5 minutes for 12 models
- [ ] Bootstrap permutations (1K) complete within P99 5 seconds per model
- [ ] Pairwise stats accurate (position-bias corrected)
- [ ] Idempotent: re-running batch on same vote data produces identical output
- [ ] Real-time UI Elo updates within 500ms; batch reconciles on next day
- [ ] Leaderboard seeded with 50+ internal team battles per pair before launch
- [ ] Transitivity violations logged; audit trail maintained
- [ ] CI width decreases monotonically with more battles (validates bootstrap logic)

## 7. Out of Scope

- Real-time streaming Elo (batch-only in v1)
- Bradley-Terry MLE (evaluate at 500K+ battles)
- Swiss-system tournament scheduling
- Glicko-2, TrueSkill, or other variants
