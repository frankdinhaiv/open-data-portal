"""Leaderboard data — Elo rankings + pairwise stats."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import (
    LeaderboardEntry,
    LeaderboardResponse,
    PairwiseResponse,
    PairwiseStat,
)
from app.services.model_registry import get_model

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    category: str | None = Query(default=None, description="Filter by prompt category"),
    db: AsyncSession = Depends(get_db),
):
    """Get Elo leaderboard rankings.

    Supports 4 tabs on the frontend:
    - Overall (no filter)
    - By category (knowledge, reasoning, cultural, creative, coding, instruction)
    """
    if category:
        # Category-filtered leaderboard: recalculate from votes on that category
        result = await db.execute(
            text("""
                SELECT m.id, m.elo_rating, m.total_battles,
                    COALESCE(
                        (SELECT COUNT(*) FROM votes v
                         JOIN conversations c ON c.id = v.conversation_id
                         JOIN turns t ON t.conversation_id = c.id AND t.turn_number = v.turn_number
                         JOIN prompts p ON p.text = t.user_prompt
                         WHERE p.category = :category
                         AND (v.model_a_id = m.id OR v.model_b_id = m.id)
                         AND (
                            (v.choice = 'model_a' AND v.model_a_id = m.id) OR
                            (v.choice = 'model_b' AND v.model_b_id = m.id)
                         )
                        ), 0
                    ) as wins
                FROM models m
                WHERE m.is_active = 1
                ORDER BY m.elo_rating DESC
            """),
            {"category": category},
        )
    else:
        result = await db.execute(
            text("""
                SELECT id, elo_rating, total_battles
                FROM models
                WHERE is_active = 1
                ORDER BY elo_rating DESC
            """),
        )

    rows = result.mappings().fetchall()

    # Get total vote count
    total_result = await db.execute(text("SELECT COUNT(*) as cnt FROM votes"))
    total_votes = total_result.mappings().fetchone()["cnt"]

    entries = []
    for rank, row in enumerate(rows, 1):
        model_def = get_model(row["id"])
        total = row["total_battles"] or 0
        wins = row.get("wins", 0)
        win_rate = (wins / total * 100) if total > 0 else 0.0

        entries.append(LeaderboardEntry(
            rank=rank,
            model_id=row["id"],
            display_name=model_def.display_name if model_def else row["id"],
            provider=model_def.provider if model_def else "unknown",
            elo_rating=row["elo_rating"],
            total_battles=total,
            win_rate=round(win_rate, 1),
        ))

    return LeaderboardResponse(
        entries=entries,
        total_votes=total_votes,
    )


@router.get("/pairwise", response_model=PairwiseResponse)
async def get_pairwise_stats(
    db: AsyncSession = Depends(get_db),
):
    """Get head-to-head pairwise statistics for all model pairs."""
    result = await db.execute(
        text("""
            SELECT model_a_id, model_b_id, wins_a, wins_b, ties, total
            FROM pairwise_stats
            ORDER BY total DESC
        """),
    )
    rows = result.mappings().fetchall()

    stats = []
    for row in rows:
        total = row["total"] or 1
        stats.append(PairwiseStat(
            model_a=row["model_a_id"],
            model_b=row["model_b_id"],
            wins_a=row["wins_a"],
            wins_b=row["wins_b"],
            ties=row["ties"],
            total=row["total"],
            win_rate_a=round(row["wins_a"] / total * 100, 1),
        ))

    return PairwiseResponse(stats=stats)
