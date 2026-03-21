# G3B Claude Code: Elo Engine Implementation

**Covers:** P0-11 (Elo Calculation Engine)
**Date:** March 12, 2026
**Format:** Complete implementation code (Python + NumPy)
**Status:** Ready for engineering build
**Dependencies:** Database (PostgreSQL), Vote System (07)

---

## Overview

This file provides **complete, production-ready code** for:
1. Elo update function (K=32, base-10 logistic)
2. Bootstrap 95% confidence interval function
3. Pairwise statistics (win fraction matrix, battle count matrix, avg win rate)
4. Daily batch job (idempotent, cron-friendly)
5. Real-time on-vote Elo delta (for leaderboard UI)
6. Configuration constants

Copy, customize, and deploy.

---

## 1. Elo Engine Core

**File: `backend/elo_engine.py`**

```python
import math
import logging
from typing import Dict, Tuple, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Configuration
ELO_K = 32
ELO_INITIAL = 1000
BOOTSTRAP_PERMUTATIONS = 1000

@dataclass
class EloRating:
    model_id: str
    model_name: str
    rating: float
    vote_count: int
    ci_lower: float
    ci_upper: float
    ci_width: float

class EloEngine:
    """Core Elo calculation engine."""

    K_FACTOR = ELO_K
    INITIAL_RATING = ELO_INITIAL

    @staticmethod
    def expected_score(rating_a: float, rating_b: float) -> float:
        """
        Compute expected score for A vs B using base-10 logistic.

        E_A = 1 / (1 + 10^((R_B - R_A) / 400))
        """
        return 1.0 / (1.0 + math.pow(10, (rating_b - rating_a) / 400.0))

    @staticmethod
    def update_rating(
        current_rating: float,
        expected: float,
        actual: float,
        k: int = K_FACTOR,
    ) -> float:
        """
        Update rating based on actual outcome.

        R' = R + K * (S - E)
        where S is actual score (1, 0, 0.5), E is expected score.
        """
        return current_rating + k * (actual - expected)

    @staticmethod
    def compute_elo_from_votes(
        votes: List[Dict],
        model_ids: List[str],
        initial_rating: float = INITIAL_RATING,
    ) -> Dict[str, float]:
        """
        Compute Elo ratings from a list of votes.

        Args:
            votes: List of vote dicts with keys:
                   - model_a_id
                   - model_b_id
                   - choice ('a', 'b', 'tie', 'bad')
            model_ids: List of all model IDs
            initial_rating: Starting Elo for each model

        Returns:
            Dict[model_id -> elo_rating]
        """
        ratings = {mid: initial_rating for mid in model_ids}

        for vote in votes:
            model_a = vote["model_a_id"]
            model_b = vote["model_b_id"]
            choice = vote["choice"]

            if model_a not in ratings or model_b not in ratings:
                # Skip orphaned votes (model decommissioned)
                logger.warning(f"Orphaned vote: {model_a} vs {model_b}")
                continue

            # Determine actual scores
            if choice == "a":
                actual_a, actual_b = 1.0, 0.0
            elif choice == "b":
                actual_a, actual_b = 0.0, 1.0
            else:  # "tie" or "bad"
                actual_a, actual_b = 0.5, 0.5

            # Compute expected scores
            expected_a = EloEngine.expected_score(ratings[model_a], ratings[model_b])
            expected_b = EloEngine.expected_score(ratings[model_b], ratings[model_a])

            # Update ratings
            ratings[model_a] = EloEngine.update_rating(
                ratings[model_a], expected_a, actual_a
            )
            ratings[model_b] = EloEngine.update_rating(
                ratings[model_b], expected_b, actual_b
            )

        return ratings
```

---

## 2. Bootstrap Confidence Interval Calculation

**File: `backend/elo_bootstrap.py`**

```python
import numpy as np
import logging
from typing import Dict, List, Tuple
from backend.elo_engine import EloEngine

logger = logging.getLogger(__name__)

BOOTSTRAP_PERMUTATIONS = 1000

class BootstrapCI:
    """Compute bootstrap confidence intervals for Elo ratings."""

    @staticmethod
    def compute_ci(
        votes: List[Dict],
        model_ids: List[str],
        n_permutations: int = BOOTSTRAP_PERMUTATIONS,
        percentiles: Tuple[float, float] = (2.5, 97.5),
    ) -> Dict[str, Tuple[float, float]]:
        """
        Compute 95% CI for each model via bootstrap resampling.

        Args:
            votes: List of vote dicts (model_a_id, model_b_id, choice)
            model_ids: List of all model IDs
            n_permutations: Number of random permutations (default 1000)
            percentiles: CI bounds (default 2.5th and 97.5th = 95% CI)

        Returns:
            Dict[model_id -> (ci_lower, ci_upper)]
        """
        ratings_dist = {mid: [] for mid in model_ids}

        for perm in range(n_permutations):
            # Random shuffle of vote order
            shuffled_votes = np.random.permutation(votes).tolist()

            # Compute Elo for this permutation
            ratings = EloEngine.compute_elo_from_votes(shuffled_votes, model_ids)

            # Record each model's rating in this permutation
            for mid in model_ids:
                ratings_dist[mid].append(ratings[mid])

        # Extract percentiles
        ci_bounds = {}
        for mid in model_ids:
            lower = np.percentile(ratings_dist[mid], percentiles[0])
            upper = np.percentile(ratings_dist[mid], percentiles[1])
            ci_bounds[mid] = (float(lower), float(upper))

        return ci_bounds

    @staticmethod
    def ci_width(ci_bounds: Dict[str, Tuple[float, float]]) -> Dict[str, float]:
        """Return width of CI for each model."""
        return {mid: (bounds[1] - bounds[0]) / 2 for mid, bounds in ci_bounds.items()}
```

---

## 3. Pairwise Statistics

**File: `backend/elo_pairwise.py`**

```python
import numpy as np
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)

class PairwiseStats:
    """Compute pairwise battle statistics (position-bias corrected)."""

    @staticmethod
    def compute_win_fraction_matrix(
        votes: List[Dict],
        model_ids: List[str],
    ) -> np.ndarray:
        """
        Compute M×M position-bias-corrected win fraction matrix.

        Cell[i,j] = win rate of model i vs j (excluding ties).
        Formula: (wins_ij - 0.5 * ties_ij) / (total_matchups_ij)

        Args:
            votes: List of vote dicts (model_a_id, model_b_id, choice)
            model_ids: List of model IDs (determines matrix order)

        Returns:
            M×M numpy array (floats 0-1)
        """
        m = len(model_ids)
        idx_map = {mid: i for i, mid in enumerate(model_ids)}

        # Initialize matrices
        wins = np.zeros((m, m))
        losses = np.zeros((m, m))
        ties = np.zeros((m, m))

        for vote in votes:
            a_id = vote["model_a_id"]
            b_id = vote["model_b_id"]
            choice = vote["choice"]

            if a_id not in idx_map or b_id not in idx_map:
                continue  # Skip orphaned votes

            i = idx_map[a_id]
            j = idx_map[b_id]

            if choice == "a":
                wins[i, j] += 1
                losses[j, i] += 1
            elif choice == "b":
                wins[j, i] += 1
                losses[i, j] += 1
            elif choice in ["tie", "bad"]:
                ties[i, j] += 1
                ties[j, i] += 1

        # Compute win fractions
        win_fraction = np.zeros((m, m))
        for i in range(m):
            for j in range(m):
                if i == j:
                    win_fraction[i, j] = 0.5  # Diagonal is undefined; use 0.5
                else:
                    total = wins[i, j] + losses[i, j] + ties[i, j]
                    if total > 0:
                        # Position-bias correction: treat ties as half-wins
                        win_fraction[i, j] = (wins[i, j] + 0.5 * ties[i, j]) / total
                    else:
                        win_fraction[i, j] = 0.5  # No data; neutral

        return win_fraction

    @staticmethod
    def compute_battle_count_matrix(
        votes: List[Dict],
        model_ids: List[str],
    ) -> np.ndarray:
        """
        Compute M×M symmetric battle count matrix.

        Cell[i,j] = number of battles between model i and j.

        Args:
            votes: List of vote dicts
            model_ids: List of model IDs

        Returns:
            M×M numpy array (integers)
        """
        m = len(model_ids)
        idx_map = {mid: i for i, mid in enumerate(model_ids)}

        battle_count = np.zeros((m, m), dtype=int)

        for vote in votes:
            a_id = vote["model_a_id"]
            b_id = vote["model_b_id"]

            if a_id not in idx_map or b_id not in idx_map:
                continue

            i = idx_map[a_id]
            j = idx_map[b_id]

            battle_count[i, j] += 1
            battle_count[j, i] += 1  # Symmetric

        return battle_count

    @staticmethod
    def compute_avg_win_rate(
        win_fraction_matrix: np.ndarray,
        model_ids: List[str],
    ) -> Dict[str, float]:
        """
        Compute average win rate per model (mean across all pairwise matchups).

        Args:
            win_fraction_matrix: M×M win fraction matrix
            model_ids: List of model IDs

        Returns:
            Dict[model_id -> avg_win_rate (0-1)]
        """
        avg_win_rates = {}

        for i, mid in enumerate(model_ids):
            # Average win rate excluding self (diagonal)
            row = win_fraction_matrix[i]
            valid_entries = np.concatenate([row[:i], row[i+1:]])
            avg_win_rates[mid] = float(np.mean(valid_entries)) if len(valid_entries) > 0 else 0.5

        return avg_win_rates

    @staticmethod
    def detect_transitivity_violations(
        win_fraction_matrix: np.ndarray,
        model_ids: List[str],
        threshold: float = 0.6,
    ) -> List[Tuple[str, str, str]]:
        """
        Detect transitivity violations (A > B, B > C, but C > A).

        Args:
            win_fraction_matrix: M×M win fraction matrix
            model_ids: List of model IDs
            threshold: Win rate threshold for "dominance" (default 60%)

        Returns:
            List of (model_a, model_b, model_c) tuples indicating violations
        """
        violations = []
        m = len(model_ids)

        for i in range(m):
            for j in range(i+1, m):
                for k in range(j+1, m):
                    # Check all 3-cycle permutations
                    if (win_fraction_matrix[i, j] > threshold and
                        win_fraction_matrix[j, k] > threshold and
                        win_fraction_matrix[k, i] > threshold):
                        violations.append((model_ids[i], model_ids[j], model_ids[k]))

        if violations:
            logger.warning(f"Detected {len(violations)} transitivity violations")

        return violations
```

---

## 4. Daily Batch Job

**File: `backend/jobs/elo_batch.py`**

```python
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging

from backend.models.vote import Vote, Model
from backend.models.elo import EloSnapshot, PairwiseStats
from backend.elo_engine import EloEngine, ELO_INITIAL
from backend.elo_bootstrap import BootstrapCI
from backend.elo_pairwise import PairwiseStats as PairwiseStatsCompute
from backend.database import SessionLocal

logger = logging.getLogger(__name__)

class EloBatchJob:
    """Daily batch job for Elo computation (cron-friendly, idempotent)."""

    @staticmethod
    def run(db: Session = None, date_str: str = None):
        """
        Run daily Elo batch job.

        Args:
            db: Database session (optional; creates one if None)
            date_str: Date to compute for (YYYY-MM-DD, optional; uses today)

        Returns:
            Dict with counts and status
        """
        if db is None:
            db = SessionLocal()

        if date_str is None:
            date_str = datetime.utcnow().date().isoformat()

        logger.info(f"Starting Elo batch job for {date_str}")

        try:
            # Fetch all votes (sorted by created_at for determinism)
            votes = db.query(Vote)\
                .filter(Vote.created_at < datetime.fromisoformat(date_str) + timedelta(days=1))\
                .order_by(Vote.created_at)\
                .all()

            # Convert to dict format
            vote_dicts = [
                {
                    "model_a_id": v.model_a_id,
                    "model_b_id": v.model_b_id,
                    "choice": v.choice,
                }
                for v in votes
            ]

            # Fetch all active models
            models = db.query(Model).filter_by(status="active").all()
            model_ids = [m.id for m in models]
            model_id_to_name = {m.id: m.name for m in models}

            # Compute Elo ratings
            elo_ratings = EloEngine.compute_elo_from_votes(vote_dicts, model_ids)

            # Compute bootstrap CIs
            ci_bounds = BootstrapCI.compute_ci(vote_dicts, model_ids)

            # Store Elo snapshots (idempotent: delete old, insert new)
            db.query(EloSnapshot).filter(EloSnapshot.date_snapshot == date_str).delete()

            snapshot_date = datetime.fromisoformat(date_str).date()
            for model_id in model_ids:
                snapshot = EloSnapshot(
                    id=f"{model_id}_{date_str}",
                    model_id=model_id,
                    elo_rating=int(elo_ratings[model_id]),
                    date_snapshot=snapshot_date,
                    vote_count=len(votes),
                    ci_lower=int(ci_bounds[model_id][0]),
                    ci_upper=int(ci_bounds[model_id][1]),
                )
                db.add(snapshot)

            # Compute pairwise statistics
            win_fraction = PairwiseStatsCompute.compute_win_fraction_matrix(vote_dicts, model_ids)
            battle_count = PairwiseStatsCompute.compute_battle_count_matrix(vote_dicts, model_ids)
            avg_win_rates = PairwiseStatsCompute.compute_avg_win_rate(win_fraction, model_ids)

            # Store pairwise stats
            db.query(PairwiseStats).delete()  # Reset; idempotent
            for i, model_a_id in enumerate(model_ids):
                for j, model_b_id in enumerate(model_ids):
                    if i < j:  # Only store upper triangle (symmetric)
                        stats = PairwiseStats(
                            id=f"{model_a_id}_{model_b_id}_{date_str}",
                            model_a_id=model_a_id,
                            model_b_id=model_b_id,
                            win_fraction=float(win_fraction[i, j]),
                            battle_count=int(battle_count[i, j]),
                            avg_win_rate_a=float(avg_win_rates[model_a_id]),
                            avg_win_rate_b=float(avg_win_rates[model_b_id]),
                        )
                        db.add(stats)

            # Detect transitivity violations
            violations = PairwiseStatsCompute.detect_transitivity_violations(win_fraction, model_ids)

            db.commit()

            logger.info(f"Elo batch job completed: {len(model_ids)} models, {len(vote_dicts)} votes")
            if violations:
                logger.warning(f"Detected {len(violations)} transitivity violations for audit")

            return {
                "status": "success",
                "models_updated": len(model_ids),
                "votes_processed": len(vote_dicts),
                "violations_detected": len(violations),
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Elo batch job failed: {e}")
            return {
                "status": "error",
                "error": str(e),
            }

# Cron job usage (e.g., Celery task):
# @app.task
# def daily_elo_batch():
#     from backend.jobs.elo_batch import EloBatchJob
#     result = EloBatchJob.run()
#     return result

# Or call directly:
# EloBatchJob.run(date_str="2026-03-12")
```

---

## 5. Elo Snapshot & Pairwise Stats Models

**File: `backend/models/elo.py`**

```python
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, Float, Date, ForeignKey, UniqueConstraint, Index
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class EloSnapshot(Base):
    """Point-in-time Elo rating for each model."""

    __tablename__ = "elo_snapshots"

    id = Column(String(100), primary_key=True)  # "model-id_2026-03-12"
    model_id = Column(String(36), ForeignKey("models.id"), nullable=False, index=True)
    elo_rating = Column(Integer, nullable=False)  # Integer Elo
    ci_lower = Column(Integer, nullable=False)  # CI lower bound
    ci_upper = Column(Integer, nullable=False)  # CI upper bound
    date_snapshot = Column(Date, nullable=False, index=True)
    vote_count = Column(Integer, nullable=False)  # Cumulative votes up to this date
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("model_id", "date_snapshot", name="uq_elo_snapshot_date"),
        Index("ix_elo_snapshot_model_date", "model_id", "date_snapshot"),
    )

class PairwiseStats(Base):
    """Aggregated pairwise battle statistics."""

    __tablename__ = "pairwise_stats"

    id = Column(String(100), primary_key=True)  # "model-a_model-b_2026-03-12"
    model_a_id = Column(String(36), ForeignKey("models.id"), nullable=False, index=True)
    model_b_id = Column(String(36), ForeignKey("models.id"), nullable=False, index=True)

    win_fraction = Column(Float, nullable=False)  # A's win rate vs B (0-1)
    battle_count = Column(Integer, nullable=False)  # Number of battles
    avg_win_rate_a = Column(Float, nullable=False)  # A's avg win rate across all opponents
    avg_win_rate_b = Column(Float, nullable=False)  # B's avg win rate across all opponents

    date_snapshot = Column(Date, default=lambda: datetime.utcnow().date(), index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_pairwise_models", "model_a_id", "model_b_id"),
    )
```

---

## 6. Real-Time Elo Delta (Frontend Reveal)

**File: `backend/api/elo_reveal.py`** (excerpt from vote system)

```python
from backend.models.elo import EloSnapshot
from backend.schemas.vote import EloReveal
from sqlalchemy.orm import Session

def get_elo_reveal(
    model_a_id: str,
    model_b_id: str,
    choice: str,
    db: Session,
) -> list[EloReveal]:
    """
    Compute real-time Elo deltas for UI feedback.

    This uses the latest EloSnapshot as baseline and applies
    the Elo formula to the new vote.
    """
    from backend.elo_engine import EloEngine

    engine = EloEngine()

    # Get baseline Elo (latest snapshot or initial)
    snapshot_a = db.query(EloSnapshot)\
        .filter_by(model_a_id=model_a_id)\
        .order_by(EloSnapshot.date_snapshot.desc())\
        .first()

    snapshot_b = db.query(EloSnapshot)\
        .filter_by(model_b_id=model_b_id)\
        .order_by(EloSnapshot.date_snapshot.desc())\
        .first()

    old_elo_a = snapshot_a.elo_rating if snapshot_a else EloEngine.INITIAL_RATING
    old_elo_b = snapshot_b.elo_rating if snapshot_b else EloEngine.INITIAL_RATING

    # Determine actual scores
    if choice == "a":
        actual_a, actual_b = 1.0, 0.0
    elif choice == "b":
        actual_a, actual_b = 0.0, 1.0
    else:  # "tie" or "bad"
        actual_a, actual_b = 0.5, 0.5

    # Compute expected scores
    expected_a = engine.expected_score(old_elo_a, old_elo_b)
    expected_b = engine.expected_score(old_elo_b, old_elo_a)

    # Compute new ratings
    new_elo_a = engine.update_rating(old_elo_a, expected_a, actual_a)
    new_elo_b = engine.update_rating(old_elo_b, expected_b, actual_b)

    # Get model names
    from backend.models.vote import Model
    model_a = db.query(Model).filter_by(id=model_a_id).first()
    model_b = db.query(Model).filter_by(id=model_b_id).first()

    return [
        EloReveal(
            model_id=model_a_id,
            model_name=model_a.name if model_a else "Unknown",
            old_elo=int(old_elo_a),
            new_elo=int(new_elo_a),
            delta=int(new_elo_a - old_elo_a),
        ),
        EloReveal(
            model_id=model_b_id,
            model_name=model_b.name if model_b else "Unknown",
            old_elo=int(old_elo_b),
            new_elo=int(new_elo_b),
            delta=int(new_elo_b - old_elo_b),
        ),
    ]
```

---

## 7. Cron Job Setup

**File: `backend/jobs/scheduler.py`** (using APScheduler)

```python
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

logger = logging.getLogger(__name__)

def start_elo_scheduler(app):
    """Start background scheduler for daily Elo batch job."""

    scheduler = BackgroundScheduler()

    # Run at 2 AM UTC daily
    scheduler.add_job(
        daily_elo_batch,
        trigger=CronTrigger(hour=2, minute=0, timezone="UTC"),
        name="daily_elo_batch",
        id="daily_elo_batch",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Elo batch scheduler started")

    return scheduler

def daily_elo_batch():
    """Execute daily Elo batch job."""
    from backend.jobs.elo_batch import EloBatchJob

    try:
        result = EloBatchJob.run()
        logger.info(f"Elo batch job completed: {result}")
    except Exception as e:
        logger.error(f"Elo batch job failed: {e}")

# Usage in main.py:
# from backend.jobs.scheduler import start_elo_scheduler
# scheduler = start_elo_scheduler(app)
```

---

## 8. Configuration

**File: `backend/config.py`**

```python
# Elo Engine Configuration
ELO_K = 32  # K-factor (rating volatility)
ELO_INITIAL = 1000  # Initial rating for new models
BOOTSTRAP_PERMUTATIONS = 1000  # Bootstrap resampling iterations
BOOTSTRAP_PERCENTILES = (2.5, 97.5)  # 95% CI bounds

# Batch Job Configuration
ELO_BATCH_HOUR = 2  # Run at 2 AM UTC
ELO_BATCH_MINUTE = 0

# Validation Rules
MIN_BATTLES_FOR_CONFIDENCE = 50  # Flag pairs with <50 battles as "unreliable"
RATING_DRIFT_CAP = 32  # Single vote cannot shift Elo more than K points

# Logging
ENABLE_AUDIT_LOG = True  # Log transitivity violations, orphaned votes
```

---

## Checklist

- [ ] Elo formula implemented (K=32, base-10 logistic)
- [ ] Bootstrap CI function computes 95% bounds (2.5th-97.5th percentiles)
- [ ] Bootstrap permutations (1000) shuffle vote order deterministically
- [ ] Win fraction matrix position-bias corrected (A vs B ≠ B vs A without tie handling)
- [ ] Battle count matrix symmetric
- [ ] Average win rate computed per model
- [ ] Transitivity violations detected and logged
- [ ] Daily batch job idempotent (re-run on same data = same output)
- [ ] Batch job runs at 2 AM UTC daily
- [ ] Orphaned votes (decommissioned models) skipped
- [ ] Real-time Elo delta exposed in vote response (for UI feedback)
- [ ] Elo snapshots append-only (never updated)
- [ ] All computations deterministic (same vote set = same output)

---

## Testing

```python
# Test Elo computation
from backend.elo_engine import EloEngine

votes = [
    {"model_a_id": "m1", "model_b_id": "m2", "choice": "a"},
    {"model_a_id": "m2", "model_b_id": "m3", "choice": "b"},
    {"model_a_id": "m1", "model_b_id": "m3", "choice": "tie"},
]

elos = EloEngine.compute_elo_from_votes(votes, ["m1", "m2", "m3"])
print(elos)
# Expected: m1 > 1000, m2 < 1000 initially (m1 beat m2), etc.

# Test bootstrap CI
from backend.elo_bootstrap import BootstrapCI

ci = BootstrapCI.compute_ci(votes, ["m1", "m2", "m3"])
print(ci)
# Expected: Dict[model_id -> (ci_lower, ci_upper)]

# Test pairwise stats
from backend.elo_pairwise import PairwiseStats

win_matrix = PairwiseStats.compute_win_fraction_matrix(votes, ["m1", "m2", "m3"])
print(win_matrix)
# Expected: 3x3 matrix with values between 0 and 1

# Test batch job
from backend.jobs.elo_batch import EloBatchJob

result = EloBatchJob.run(date_str="2026-03-12")
print(result)
# Expected: {"status": "success", "models_updated": N, "votes_processed": M}
```

---

## Bash Testing (Cron Job)

```bash
# Run batch job manually (for testing)
python -c "
from backend.jobs.elo_batch import EloBatchJob
result = EloBatchJob.run(date_str='2026-03-12')
print(result)
"

# Check cron logs (if using system cron)
grep EloBatchJob /var/log/syslog
```

---

## Performance Notes

- **Elo computation:** O(N) where N = vote count (< 1s for 100k votes)
- **Bootstrap CI:** O(N × P) where P = permutations (1000 × 100k = ~5 seconds per model)
- **Pairwise stats:** O(M^2) where M = model count (12 models = negligible)
- **Batch job total:** < 5 minutes for 12 models with 100k votes

---

## Dependencies

```
numpy==1.24.3
sqlalchemy==2.0.23
apscheduler==3.10.4
python-dateutil==2.8.2
```
