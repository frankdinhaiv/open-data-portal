"""Chat history sidebar endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import CurrentUser, get_current_user
from app.models.schemas import HistoryItem, HistoryResponse

router = APIRouter(prefix="/api/users", tags=["history"])


@router.get("/me/history", response_model=HistoryResponse)
async def get_history(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's conversation history for the sidebar.

    Returns paginated list of conversations with first prompt preview.
    """
    offset = (page - 1) * per_page

    # Total count
    count_result = await db.execute(
        text("SELECT COUNT(*) as cnt FROM conversations WHERE user_id = :uid"),
        {"uid": user.user_id},
    )
    total = count_result.mappings().fetchone()["cnt"]

    # Fetch conversations with first prompt
    result = await db.execute(
        text("""
            SELECT
                c.id,
                c.mode,
                c.model_a_id,
                c.model_b_id,
                c.model_id,
                c.created_at,
                t.prompt as first_prompt,
                (SELECT COUNT(*) FROM votes v WHERE v.conversation_id = c.id) > 0 as voted
            FROM conversations c
            LEFT JOIN turns t ON t.conversation_id = c.id AND t.turn_number = 1
            WHERE c.user_id = :uid
            ORDER BY c.created_at DESC
            LIMIT :limit OFFSET :offset
        """),
        {"uid": user.user_id, "limit": per_page, "offset": offset},
    )
    rows = result.mappings().fetchall()

    conversations = []
    for r in rows:
        first_prompt = r["first_prompt"] or ""
        # Truncate for sidebar preview
        if len(first_prompt) > 80:
            first_prompt = first_prompt[:77] + "..."

        conversations.append(HistoryItem(
            conversation_id=r["id"],
            mode=r["mode"],
            first_prompt=first_prompt,
            model_a=r["model_a_id"],
            model_b=r["model_b_id"],
            model_id=r["model_id"],
            voted=bool(r["voted"]),
            created_at=r["created_at"],
        ))

    return HistoryResponse(
        conversations=conversations,
        total=total,
        page=page,
        per_page=per_page,
    )
