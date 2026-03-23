"""Suggested prompts endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import PromptCategory, PromptItem, PromptListResponse

router = APIRouter(prefix="/api/prompts", tags=["prompts"])


@router.get("", response_model=PromptListResponse)
async def get_prompts(
    category: PromptCategory | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Get suggested Vietnamese prompts, optionally filtered by category.

    Returns a random sample of `limit` prompts.
    """
    if category:
        result = await db.execute(
            text("""
                SELECT id, text, category FROM prompts
                WHERE category = :category
                ORDER BY RAND()
                LIMIT :limit
            """),
            {"category": category.value, "limit": limit},
        )
    else:
        result = await db.execute(
            text("""
                SELECT id, text, category FROM prompts
                ORDER BY RAND()
                LIMIT :limit
            """),
            {"limit": limit},
        )

    rows = result.mappings().fetchall()
    return PromptListResponse(
        prompts=[
            PromptItem(id=r["id"], text=r["text"], category=r["category"])
            for r in rows
        ]
    )
