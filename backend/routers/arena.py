from fastapi import APIRouter, Depends, Query, Header
from typing import Optional
import random
import aiosqlite
from database import get_db
from models.schemas import VoteCreate, VoteOut, PromptOut, PairOut, ModelOut, ResponseOut
from services.elo import elo_update
from services.auth_service import decode_token

router = APIRouter(prefix="/api/arena", tags=["arena"])


@router.get("/prompts")
async def get_prompts(category: Optional[str] = None, db: aiosqlite.Connection = Depends(get_db)):
    if category:
        cursor = await db.execute("SELECT id, text, category FROM prompts WHERE category = ?", (category,))
    else:
        cursor = await db.execute("SELECT id, text, category FROM prompts")
    rows = await cursor.fetchall()
    return [{"id": r[0], "text": r[1], "category": r[2]} for r in rows]


@router.get("/pair")
async def get_pair(
    prompt_id: Optional[int] = None,
    model_a: Optional[str] = None,
    model_b: Optional[str] = None,
    db: aiosqlite.Connection = Depends(get_db),
):
    # If specific models requested (SBS mode), find a prompt both have responses for
    if model_a and model_b:
        cursor = await db.execute(
            """SELECT p.id, p.text, p.category FROM prompts p
               WHERE EXISTS (SELECT 1 FROM responses r WHERE r.prompt_id = p.id AND r.model_id = ? AND r.turn_number = 1)
               AND EXISTS (SELECT 1 FROM responses r WHERE r.prompt_id = p.id AND r.model_id = ? AND r.turn_number = 1)
               ORDER BY RANDOM() LIMIT 1""",
            (model_a, model_b),
        )
        prompt_row = await cursor.fetchone()
        if not prompt_row:
            return {"error": f"Không tìm thấy prompt có cả hai mô hình này"}

        pid = prompt_row[0]
        cur_a = await db.execute(
            "SELECT r.id, r.prompt_id, r.model_id, r.content, r.turn_number, m.name, m.org, m.license, m.color "
            "FROM responses r JOIN models m ON r.model_id = m.id "
            "WHERE r.prompt_id = ? AND r.model_id = ? AND r.turn_number = 1",
            (pid, model_a),
        )
        cur_b = await db.execute(
            "SELECT r.id, r.prompt_id, r.model_id, r.content, r.turn_number, m.name, m.org, m.license, m.color "
            "FROM responses r JOIN models m ON r.model_id = m.id "
            "WHERE r.prompt_id = ? AND r.model_id = ? AND r.turn_number = 1",
            (pid, model_b),
        )
        resp_a = await cur_a.fetchone()
        resp_b = await cur_b.fetchone()
        if not resp_a or not resp_b:
            return {"error": "Không tìm thấy phản hồi cho mô hình đã chọn"}
    else:
        # Random pair (Battle mode)
        if prompt_id:
            cursor = await db.execute("SELECT id, text, category FROM prompts WHERE id = ?", (prompt_id,))
        else:
            cursor = await db.execute("SELECT id, text, category FROM prompts ORDER BY RANDOM() LIMIT 1")
        prompt_row = await cursor.fetchone()
        if not prompt_row:
            return {"error": "No prompts available"}

        pid = prompt_row[0]
        cursor = await db.execute(
            "SELECT r.id, r.prompt_id, r.model_id, r.content, r.turn_number, m.name, m.org, m.license, m.color "
            "FROM responses r JOIN models m ON r.model_id = m.id "
            "WHERE r.prompt_id = ? AND r.turn_number = 1",
            (pid,),
        )
        responses = await cursor.fetchall()
        if len(responses) < 2:
            return {"error": "Not enough responses for this prompt"}

        random.shuffle(responses)
        resp_a, resp_b = responses[0], responses[1]

    return {
        "prompt": {"id": prompt_row[0], "text": prompt_row[1], "category": prompt_row[2]},
        "response_a": {
            "id": resp_a[0], "prompt_id": resp_a[1], "model_id": resp_a[2],
            "content": resp_a[3], "turn_number": resp_a[4],
        },
        "response_b": {
            "id": resp_b[0], "prompt_id": resp_b[1], "model_id": resp_b[2],
            "content": resp_b[3], "turn_number": resp_b[4],
        },
        "model_a": {"id": resp_a[2], "name": resp_a[5], "org": resp_a[6], "license": resp_a[7], "color": resp_a[8]},
        "model_b": {"id": resp_b[2], "name": resp_b[5], "org": resp_b[6], "license": resp_b[7], "color": resp_b[8]},
    }


@router.get("/response")
async def get_response(model_id: str, prompt_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT r.id, r.prompt_id, r.model_id, r.content, r.turn_number, m.name, m.org, m.license, m.color "
        "FROM responses r JOIN models m ON r.model_id = m.id "
        "WHERE r.model_id = ? AND r.prompt_id = ? AND r.turn_number = 1",
        (model_id, prompt_id),
    )
    row = await cursor.fetchone()
    if not row:
        return {"error": "No response found"}
    return {
        "response": {
            "id": row[0], "prompt_id": row[1], "model_id": row[2],
            "content": row[3], "turn_number": row[4],
        },
        "model": {"id": row[2], "name": row[5], "org": row[6], "license": row[7], "color": row[8]},
    }


@router.post("/vote")
async def submit_vote(vote: VoteCreate, session_id: Optional[str] = Query(None), authorization: Optional[str] = Header(None), db: aiosqlite.Connection = Depends(get_db)):
    # Extract voter_id from token if logged in
    voter_id = None
    if authorization and authorization.startswith("Bearer "):
        payload = decode_token(authorization.split(" ")[1])
        if payload:
            voter_id = payload.get("user_id")

    cursor = await db.execute(
        """INSERT INTO votes (voter_id, session_id, mode, prompt_text, prompt_id, model_a_id, model_b_id,
           response_a_id, response_b_id, choice, quality_tags, conversation_history, turn_number)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            voter_id, session_id, vote.mode, vote.prompt_text, vote.prompt_id,
            vote.model_a_id, vote.model_b_id, vote.response_a_id, vote.response_b_id,
            vote.choice, vote.quality_tags, vote.conversation_history, vote.turn_number,
        ),
    )
    await db.commit()
    vote_id = cursor.lastrowid

    # Compute and persist Elo update
    elo_data = None
    if vote.model_b_id and vote.choice in ("a", "b", "tie", "bad"):
        from config import ELO_INITIAL

        # Get current Elo (fallback to 1000 if no snapshot yet)
        cursor_a = await db.execute(
            "SELECT elo_rating FROM elo_snapshots WHERE model_id = ? ORDER BY computed_at DESC LIMIT 1",
            (vote.model_a_id,),
        )
        cursor_b = await db.execute(
            "SELECT elo_rating FROM elo_snapshots WHERE model_id = ? ORDER BY computed_at DESC LIMIT 1",
            (vote.model_b_id,),
        )
        row_a = await cursor_a.fetchone()
        row_b = await cursor_b.fetchone()
        elo_a = row_a[0] if row_a else ELO_INITIAL
        elo_b = row_b[0] if row_b else ELO_INITIAL

        score = 1.0 if vote.choice == "a" else (0.0 if vote.choice == "b" else 0.5)
        result = elo_update(elo_a, elo_b, score)

        # Count total votes per model
        cnt_a = await db.execute("SELECT COUNT(*) FROM votes WHERE model_a_id = ? OR model_b_id = ?", (vote.model_a_id, vote.model_a_id))
        cnt_b = await db.execute("SELECT COUNT(*) FROM votes WHERE model_a_id = ? OR model_b_id = ?", (vote.model_b_id, vote.model_b_id))
        total_a = (await cnt_a.fetchone())[0]
        total_b = (await cnt_b.fetchone())[0]

        # Count wins per model
        wins_a = await db.execute(
            "SELECT COUNT(*) FROM votes WHERE (model_a_id = ? AND choice = 'a') OR (model_b_id = ? AND choice = 'b')",
            (vote.model_a_id, vote.model_a_id),
        )
        wins_b = await db.execute(
            "SELECT COUNT(*) FROM votes WHERE (model_a_id = ? AND choice = 'a') OR (model_b_id = ? AND choice = 'b')",
            (vote.model_b_id, vote.model_b_id),
        )
        w_a = (await wins_a.fetchone())[0]
        w_b = (await wins_b.fetchone())[0]
        wr_a = w_a / total_a if total_a else 0.5
        wr_b = w_b / total_b if total_b else 0.5

        # Save new Elo snapshots
        await db.execute(
            "INSERT INTO elo_snapshots (model_id, elo_rating, ci_lower, ci_upper, win_rate, total_votes) VALUES (?, ?, ?, ?, ?, ?)",
            (vote.model_a_id, result["new_a"], result["new_a"], result["new_a"], wr_a, total_a),
        )
        await db.execute(
            "INSERT INTO elo_snapshots (model_id, elo_rating, ci_lower, ci_upper, win_rate, total_votes) VALUES (?, ?, ?, ?, ?, ?)",
            (vote.model_b_id, result["new_b"], result["new_b"], result["new_b"], wr_b, total_b),
        )
        await db.commit()

        # Get model names for reveal
        cur_ma = await db.execute("SELECT name, org FROM models WHERE id = ?", (vote.model_a_id,))
        cur_mb = await db.execute("SELECT name, org FROM models WHERE id = ?", (vote.model_b_id,))
        ma = await cur_ma.fetchone()
        mb = await cur_mb.fetchone()
        elo_data = {
            "model_a_name": ma[0], "model_a_org": ma[1],
            "model_a_elo": result["new_a"], "model_a_delta": result["delta_a"],
            "model_b_name": mb[0], "model_b_org": mb[1],
            "model_b_elo": result["new_b"], "model_b_delta": result["delta_b"],
        }

    return {"vote_id": vote_id, "elo_reveal": elo_data}


@router.get("/models")
async def get_models(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id, name, org, license, color FROM models ORDER BY name")
    rows = await cursor.fetchall()
    return [{"id": r[0], "name": r[1], "org": r[2], "license": r[3], "color": r[4]} for r in rows]


@router.get("/history")
async def get_history(user_id: Optional[int] = None, limit: int = 50, db: aiosqlite.Connection = Depends(get_db)):
    """Get vote history for a user account."""
    if not user_id:
        return []
    cursor = await db.execute(
        """SELECT v.id, v.mode, v.prompt_text, v.choice,
                  ma.name as model_a_name, mb.name as model_b_name,
                  ma.color as model_a_color, mb.color as model_b_color,
                  v.created_at
           FROM votes v
           LEFT JOIN models ma ON v.model_a_id = ma.id
           LEFT JOIN models mb ON v.model_b_id = mb.id
           WHERE v.voter_id = ?
           ORDER BY v.created_at DESC
           LIMIT ?""",
        (user_id, limit),
    )
    rows = await cursor.fetchall()
    return [
        {
            "id": r[0],
            "mode": r[1],
            "prompt_text": r[2],
            "choice": r[3],
            "model_a_name": r[4],
            "model_b_name": r[5],
            "model_a_color": r[6],
            "model_b_color": r[7],
            "created_at": r[8],
        }
        for r in rows
    ]
