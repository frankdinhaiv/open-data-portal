from fastapi import APIRouter, Depends, Query
from typing import Optional
import aiosqlite
from database import get_db
from services.elo import bootstrap_elo
from config import BOOTSTRAP_PERMUTATIONS

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.post("/recompute")
async def recompute_elo(db: aiosqlite.Connection = Depends(get_db)):
    """Recompute Elo ratings with bootstrap CIs from all votes."""
    # Get all models
    cursor = await db.execute("SELECT id FROM models")
    model_ids = [r[0] for r in await cursor.fetchall()]

    # Get all non-tied battle/sbs votes
    cursor = await db.execute(
        "SELECT model_a_id, model_b_id, choice FROM votes WHERE mode IN ('battle', 'sbs') AND choice IN ('a', 'b', 'tie')"
    )
    rows = await cursor.fetchall()
    votes = [{"model_a_id": r[0], "model_b_id": r[1], "choice": r[2]} for r in rows]

    if not votes:
        return {"status": "no votes to compute"}

    cis = bootstrap_elo(votes, model_ids, BOOTSTRAP_PERMUTATIONS)

    # Count wins and total votes per model
    for mid in model_ids:
        cnt = await db.execute("SELECT COUNT(*) FROM votes WHERE model_a_id = ? OR model_b_id = ?", (mid, mid))
        total = (await cnt.fetchone())[0]
        wins = await db.execute(
            "SELECT COUNT(*) FROM votes WHERE (model_a_id = ? AND choice = 'a') OR (model_b_id = ? AND choice = 'b')",
            (mid, mid),
        )
        w = (await wins.fetchone())[0]
        wr = w / total if total else 0.5

        await db.execute(
            "INSERT INTO elo_snapshots (model_id, elo_rating, ci_lower, ci_upper, win_rate, total_votes) VALUES (?, ?, ?, ?, ?, ?)",
            (mid, cis[mid]["elo"], cis[mid]["ci_lower"], cis[mid]["ci_upper"], wr, total),
        )
    await db.commit()
    return {"status": "recomputed", "models": len(model_ids), "votes": len(votes)}


@router.get("/")
async def get_leaderboard(license: Optional[str] = Query(None), db: aiosqlite.Connection = Depends(get_db)):
    query = """
        SELECT m.id, m.name, m.org, m.license, m.color,
               e.elo_rating, e.ci_lower, e.ci_upper, e.win_rate, e.total_votes
        FROM models m
        LEFT JOIN (
            SELECT model_id, elo_rating, ci_lower, ci_upper, win_rate, total_votes,
                   ROW_NUMBER() OVER (PARTITION BY model_id ORDER BY computed_at DESC) as rn
            FROM elo_snapshots
        ) e ON m.id = e.model_id AND e.rn = 1
    """
    params = []
    if license and license in ("open", "prop"):
        query += " WHERE m.license = ?"
        params.append(license)

    query += " ORDER BY COALESCE(e.elo_rating, 0) DESC"

    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()

    result = []
    for i, r in enumerate(rows):
        elo = r[5] or 1000
        ci_lower = r[6] or elo
        ci_upper = r[7] or elo
        ci = round((ci_upper - ci_lower) / 2)
        result.append({
            "rank": i + 1,
            "model_id": r[0],
            "name": r[1],
            "org": r[2],
            "license": r[3],
            "color": r[4],
            "elo_rating": round(elo),
            "ci": ci,
            "win_rate": round((r[8] or 0.5) * 100),
            "total_votes": r[9] or 0,
        })
    return result


@router.get("/stats/{stat_type}")
async def get_stats(stat_type: str, db: aiosqlite.Connection = Depends(get_db)):
    # Get all models sorted by Elo
    cursor = await db.execute("""
        SELECT m.id, m.name FROM models m
        LEFT JOIN (
            SELECT model_id, elo_rating,
                   ROW_NUMBER() OVER (PARTITION BY model_id ORDER BY computed_at DESC) as rn
            FROM elo_snapshots
        ) e ON m.id = e.model_id AND e.rn = 1
        ORDER BY COALESCE(e.elo_rating, 0) DESC
    """)
    models = await cursor.fetchall()
    model_ids = [m[0] for m in models]
    model_names = [m[1] for m in models]
    n = len(model_ids)

    # Get all non-tied battle/sbs votes
    cursor = await db.execute("""
        SELECT model_a_id, model_b_id, choice FROM votes
        WHERE mode IN ('battle', 'sbs') AND choice IN ('a', 'b')
    """)
    votes = await cursor.fetchall()

    # Build pairwise matrices
    idx = {mid: i for i, mid in enumerate(model_ids)}
    wins = [[0] * n for _ in range(n)]
    counts = [[0] * n for _ in range(n)]

    for v in votes:
        a_id, b_id, choice = v[0], v[1], v[2]
        if a_id not in idx or b_id not in idx:
            continue
        i, j = idx[a_id], idx[b_id]
        counts[i][j] += 1
        counts[j][i] += 1
        if choice == "a":
            wins[i][j] += 1
        else:
            wins[j][i] += 1

    if stat_type == "win-fraction":
        matrix = [[0.0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                if i != j and counts[i][j] > 0:
                    matrix[i][j] = round(wins[i][j] / counts[i][j], 3)
        return {"models": model_names, "matrix": matrix}

    elif stat_type == "battle-count":
        return {"models": model_names, "matrix": counts}

    elif stat_type == "avg-win-rate":
        avg_rates = []
        for i in range(n):
            rates = []
            for j in range(n):
                if i != j and counts[i][j] > 0:
                    rates.append(wins[i][j] / counts[i][j])
            avg = sum(rates) / len(rates) if rates else 0.5
            avg_rates.append({"model": model_names[i], "avg_win_rate": round(avg, 3)})
        return avg_rates

    elif stat_type == "confidence-intervals":
        cursor = await db.execute("""
            SELECT m.id, m.name, m.color, e.elo_rating, e.ci_lower, e.ci_upper
            FROM models m
            LEFT JOIN (
                SELECT model_id, elo_rating, ci_lower, ci_upper,
                       ROW_NUMBER() OVER (PARTITION BY model_id ORDER BY computed_at DESC) as rn
                FROM elo_snapshots
            ) e ON m.id = e.model_id AND e.rn = 1
            ORDER BY COALESCE(e.elo_rating, 0) DESC
        """)
        rows = await cursor.fetchall()
        return [
            {
                "model": r[1],
                "color": r[2],
                "elo": r[3] or 1000,
                "ci_lower": r[4] or (r[3] or 1000),
                "ci_upper": r[5] or (r[3] or 1000),
            }
            for r in rows
        ]

    return {"error": "Unknown stat type"}
