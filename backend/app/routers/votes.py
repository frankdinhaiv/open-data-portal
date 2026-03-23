"""Vote submission + reveal endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import CurrentUser, get_current_user
from app.models.schemas import (
    DirectRatingRequest,
    DirectRatingResponse,
    VoteChoice,
    VoteRequest,
    VoteResponse,
)
from app.services.model_registry import get_model
from app.services.vote_worker import enqueue_vote

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/conversations", tags=["votes"])


@router.post("/{conversation_id}/votes", response_model=VoteResponse)
async def submit_vote(
    conversation_id: str,
    req: VoteRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a vote for a battle/SBS conversation.

    Pipeline: validate -> Redis queue -> vote_worker drains -> MySQL + Elo.
    Response immediately reveals model identities (battle mode reveal).
    """
    # Verify conversation exists and is a battle/SBS
    result = await db.execute(
        text("SELECT * FROM conversations WHERE id = :id"),
        {"id": conversation_id},
    )
    conv = result.mappings().fetchone()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    if conv["mode"] not in ("battle", "sbs"):
        raise HTTPException(400, "Votes are only for battle/SBS modes")

    model_a = conv["model_a_id"]
    model_b = conv["model_b_id"]

    # Enqueue vote to Redis for async processing
    try:
        await enqueue_vote({
            "conversation_id": conversation_id,
            "turn_number": req.turn_number,
            "user_id": user.user_id,
            "model_a_id": model_a,
            "model_b_id": model_b,
            "choice": req.choice.value,
        })
    except ValueError as e:
        raise HTTPException(409, str(e))

    # Reveal model identities
    model_a_def = get_model(model_a)
    model_b_def = get_model(model_b)

    return VoteResponse(
        conversation_id=conversation_id,
        choice=req.choice,
        model_a=model_a,
        model_a_display_name=model_a_def.display_name if model_a_def else model_a,
        model_b=model_b,
        model_b_display_name=model_b_def.display_name if model_b_def else model_b,
    )


@router.post("/{conversation_id}/ratings", response_model=DirectRatingResponse)
async def submit_direct_rating(
    conversation_id: str,
    req: DirectRatingRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a 1-5 rating for a direct chat conversation."""
    # Verify conversation exists and is direct mode
    result = await db.execute(
        text("SELECT * FROM conversations WHERE id = :id"),
        {"id": conversation_id},
    )
    conv = result.mappings().fetchone()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    if conv["mode"] != "direct":
        raise HTTPException(400, "Ratings are only for direct chat mode")

    model_id = conv["model_id"]

    # Insert direct rating
    await db.execute(
        text("""
            INSERT INTO direct_ratings
                (conversation_id, turn_number, user_id, model_id, rating, created_at)
            VALUES
                (:conv_id, :turn, :user_id, :model_id, :rating, NOW())
        """),
        {
            "conv_id": conversation_id,
            "turn": req.turn_number,
            "user_id": user.user_id,
            "model_id": model_id,
            "rating": req.rating,
        },
    )
    await db.commit()

    return DirectRatingResponse(
        conversation_id=conversation_id,
        model_id=model_id,
        rating=req.rating,
    )
