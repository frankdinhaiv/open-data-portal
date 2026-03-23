"""Battle, Side-by-Side, and Direct Chat endpoints."""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import CurrentUser, get_current_user
from app.models.schemas import (
    ConversationDetail,
    ConversationMode,
    CreateConversationRequest,
    CreateConversationResponse,
    ResponseItem,
    TurnDetail,
    TurnRequest,
)
from app.services.llm_client import llm_client
from app.services.model_registry import get_model, select_pair

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/conversations", tags=["arena"])


@router.post("", response_model=CreateConversationResponse)
async def create_conversation(
    req: CreateConversationRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new conversation and start generating responses.

    For battle mode: server picks two random models.
    For SBS mode: client specifies models or server picks.
    For direct mode: client specifies one model.
    """
    conversation_id = str(uuid.uuid4())

    if req.mode == ConversationMode.BATTLE:
        model_a_def, model_b_def = select_pair()
        model_a = model_a_def.id
        model_b = model_b_def.id
        model_id = None
    elif req.mode == ConversationMode.SIDE_BY_SIDE:
        model_a = req.model_a
        model_b = req.model_b
        if not model_a or not model_b:
            model_a_def, model_b_def = select_pair()
            model_a = model_a_def.id
            model_b = model_b_def.id
        model_id = None
    elif req.mode == ConversationMode.DIRECT:
        if not req.model_id:
            raise HTTPException(400, "model_id required for direct mode")
        model_a = None
        model_b = None
        model_id = req.model_id
    else:
        raise HTTPException(400, f"Invalid mode: {req.mode}")

    # Insert conversation record
    await db.execute(
        text("""
            INSERT INTO conversations
                (id, mode, user_id, model_a_id, model_b_id, model_id, created_at)
            VALUES
                (:id, :mode, :user_id, :model_a, :model_b, :model_id, NOW())
        """),
        {
            "id": conversation_id,
            "mode": req.mode.value,
            "user_id": user.user_id,
            "model_a": model_a,
            "model_b": model_b,
            "model_id": model_id,
        },
    )

    # Insert first turn
    await db.execute(
        text("""
            INSERT INTO turns
                (conversation_id, turn_number, prompt, created_at)
            VALUES
                (:conv_id, 1, :prompt, NOW())
        """),
        {"conv_id": conversation_id, "prompt": req.prompt},
    )
    await db.commit()

    # Kick off LLM generation in the background
    if req.mode in (ConversationMode.BATTLE, ConversationMode.SIDE_BY_SIDE):
        asyncio.create_task(
            _generate_pair_responses(conversation_id, 1, req.prompt, model_a, model_b)
        )
    else:
        asyncio.create_task(
            _generate_single_response(conversation_id, 1, req.prompt, model_id)
        )

    return CreateConversationResponse(
        conversation_id=conversation_id,
        mode=req.mode,
        model_a=model_a if req.mode != ConversationMode.DIRECT else None,
        model_b=model_b if req.mode != ConversationMode.DIRECT else None,
        model_id=model_id,
    )


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full conversation history."""
    result = await db.execute(
        text("SELECT * FROM conversations WHERE id = :id"),
        {"id": conversation_id},
    )
    conv = result.mappings().fetchone()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    # Get turns
    turns_result = await db.execute(
        text("""
            SELECT turn_number, prompt FROM turns
            WHERE conversation_id = :conv_id
            ORDER BY turn_number
        """),
        {"conv_id": conversation_id},
    )
    turns = []
    for turn_row in turns_result.mappings().fetchall():
        # Get responses for this turn
        resp_result = await db.execute(
            text("""
                SELECT model_id, position, content, latency_ms, token_count
                FROM responses
                WHERE conversation_id = :conv_id AND turn_number = :turn
                ORDER BY position
            """),
            {"conv_id": conversation_id, "turn": turn_row["turn_number"]},
        )
        responses = []
        for r in resp_result.mappings().fetchall():
            model_def = get_model(r["model_id"])
            responses.append(ResponseItem(
                model_id=r["model_id"],
                model_display_name=model_def.display_name if model_def else r["model_id"],
                position=r["position"],
                content=r["content"],
                latency_ms=r["latency_ms"],
                token_count=r["token_count"],
                turn_number=turn_row["turn_number"],
            ))

        # Get vote for this turn (if any)
        vote_result = await db.execute(
            text("""
                SELECT choice FROM votes
                WHERE conversation_id = :conv_id AND turn_number = :turn
                LIMIT 1
            """),
            {"conv_id": conversation_id, "turn": turn_row["turn_number"]},
        )
        vote_row = vote_result.mappings().fetchone()

        turns.append(TurnDetail(
            turn_number=turn_row["turn_number"],
            prompt=turn_row["prompt"],
            responses=responses,
            vote=vote_row["choice"] if vote_row else None,
        ))

    return ConversationDetail(
        conversation_id=conversation_id,
        mode=conv["mode"],
        model_a=conv["model_a_id"],
        model_b=conv["model_b_id"],
        model_id=conv["model_id"],
        turns=turns,
        created_at=conv["created_at"],
    )


@router.get("/{conversation_id}/responses")
async def get_responses(
    conversation_id: str,
    turn: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
):
    """Get responses for a specific turn — used for polling."""
    result = await db.execute(
        text("""
            SELECT model_id, position, content, latency_ms, token_count
            FROM responses
            WHERE conversation_id = :conv_id AND turn_number = :turn
            ORDER BY position
        """),
        {"conv_id": conversation_id, "turn": turn},
    )
    rows = result.mappings().fetchall()
    responses = []
    for r in rows:
        model_def = get_model(r["model_id"])
        responses.append(ResponseItem(
            model_id=r["model_id"],
            model_display_name=model_def.display_name if model_def else r["model_id"],
            position=r["position"],
            content=r["content"],
            latency_ms=r["latency_ms"],
            token_count=r["token_count"],
            turn_number=turn,
        ))
    return {"responses": responses}


@router.get("/{conversation_id}/stream")
async def stream_responses(
    conversation_id: str,
    turn: int = Query(default=1, ge=1),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SSE endpoint for streaming LLM responses to the frontend."""
    if not settings.ENABLE_STREAMING:
        raise HTTPException(400, "Streaming is disabled")

    # Get conversation details
    result = await db.execute(
        text("SELECT * FROM conversations WHERE id = :id"),
        {"id": conversation_id},
    )
    conv = result.mappings().fetchone()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    # Get the prompt for this turn
    turn_result = await db.execute(
        text("""
            SELECT prompt FROM turns
            WHERE conversation_id = :conv_id AND turn_number = :turn
        """),
        {"conv_id": conversation_id, "turn": turn},
    )
    turn_row = turn_result.mappings().fetchone()
    if not turn_row:
        raise HTTPException(404, "Turn not found")

    prompt = turn_row["prompt"]

    # Build conversation history from previous turns
    history = await _build_history(db, conversation_id, turn)

    async def event_generator():
        if conv["mode"] in ("battle", "sbs"):
            model_a = conv["model_a_id"]
            model_b = conv["model_b_id"]

            # Stream both models concurrently
            async def stream_model(model_id: str, position: str):
                try:
                    gen = await llm_client.generate(
                        model_id, prompt, history, stream=True
                    )
                    async for chunk in gen:
                        data = json.dumps({"position": position, "content": chunk, "done": False})
                        yield f"data: {data}\n\n"
                    data = json.dumps({"position": position, "content": "", "done": True})
                    yield f"data: {data}\n\n"
                except Exception as e:
                    data = json.dumps({"position": position, "content": "", "done": True, "error": str(e)})
                    yield f"data: {data}\n\n"

            # Interleave streams from both models
            queue: asyncio.Queue = asyncio.Queue()

            async def feed(model_id, position):
                try:
                    gen = await llm_client.generate(model_id, prompt, history, stream=True)
                    async for chunk in gen:
                        await queue.put(
                            f"data: {json.dumps({'position': position, 'content': chunk, 'done': False})}\n\n"
                        )
                    await queue.put(
                        f"data: {json.dumps({'position': position, 'content': '', 'done': True})}\n\n"
                    )
                except Exception as e:
                    await queue.put(
                        f"data: {json.dumps({'position': position, 'content': '', 'done': True, 'error': str(e)})}\n\n"
                    )

            async def sentinel():
                await asyncio.gather(
                    feed(model_a, "a"),
                    feed(model_b, "b"),
                )
                await queue.put(None)  # Signal done

            task = asyncio.create_task(sentinel())

            while True:
                item = await queue.get()
                if item is None:
                    break
                yield item

        else:
            # Direct mode — single model
            model_id = conv["model_id"]
            try:
                gen = await llm_client.generate(model_id, prompt, history, stream=True)
                async for chunk in gen:
                    data = json.dumps({"position": "single", "content": chunk, "done": False})
                    yield f"data: {data}\n\n"
                data = json.dumps({"position": "single", "content": "", "done": True})
                yield f"data: {data}\n\n"
            except Exception as e:
                data = json.dumps({"position": "single", "content": "", "done": True, "error": str(e)})
                yield f"data: {data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{conversation_id}/turns")
async def append_turn(
    conversation_id: str,
    req: TurnRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Append a multi-turn follow-up to an existing conversation."""
    # Verify conversation exists
    result = await db.execute(
        text("SELECT * FROM conversations WHERE id = :id"),
        {"id": conversation_id},
    )
    conv = result.mappings().fetchone()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    # Get next turn number
    turn_result = await db.execute(
        text("""
            SELECT MAX(turn_number) as max_turn FROM turns
            WHERE conversation_id = :conv_id
        """),
        {"conv_id": conversation_id},
    )
    max_turn = turn_result.mappings().fetchone()["max_turn"] or 0
    next_turn = max_turn + 1

    # Insert the new turn
    await db.execute(
        text("""
            INSERT INTO turns (conversation_id, turn_number, prompt, created_at)
            VALUES (:conv_id, :turn, :prompt, NOW())
        """),
        {"conv_id": conversation_id, "turn": next_turn, "prompt": req.prompt},
    )
    await db.commit()

    # Kick off generation
    mode = conv["mode"]
    if mode in ("battle", "sbs"):
        asyncio.create_task(
            _generate_pair_responses(
                conversation_id, next_turn, req.prompt,
                conv["model_a_id"], conv["model_b_id"],
            )
        )
    else:
        asyncio.create_task(
            _generate_single_response(
                conversation_id, next_turn, req.prompt, conv["model_id"]
            )
        )

    return {"conversation_id": conversation_id, "turn_number": next_turn}


# ---------------------------------------------------------------------------
# Background generation helpers
# ---------------------------------------------------------------------------


async def _build_history(
    db: AsyncSession, conversation_id: str, up_to_turn: int
) -> list[dict]:
    """Build conversation history from previous turns for multi-turn context."""
    if up_to_turn <= 1:
        return []

    history = []
    result = await db.execute(
        text("""
            SELECT t.turn_number, t.prompt, r.content, r.position
            FROM turns t
            LEFT JOIN responses r ON r.conversation_id = t.conversation_id
                AND r.turn_number = t.turn_number
            WHERE t.conversation_id = :conv_id AND t.turn_number < :turn
            ORDER BY t.turn_number, r.position
        """),
        {"conv_id": conversation_id, "turn": up_to_turn},
    )
    rows = result.mappings().fetchall()

    current_turn = None
    for row in rows:
        if row["turn_number"] != current_turn:
            current_turn = row["turn_number"]
            history.append({"role": "user", "content": row["prompt"]})
        if row["content"]:
            history.append({"role": "assistant", "content": row["content"]})

    return history


async def _generate_pair_responses(
    conversation_id: str,
    turn_number: int,
    prompt: str,
    model_a: str,
    model_b: str,
) -> None:
    """Generate responses from two models concurrently and store them."""
    async def gen_one(model_id: str, position: str):
        start = time.time()
        try:
            content = await llm_client.generate(
                model_id, prompt, stream=False
            )
            latency_ms = int((time.time() - start) * 1000)
            token_count = len(content.split())  # Rough estimate
            await _store_response(
                conversation_id, turn_number, model_id, position,
                content, latency_ms, token_count,
            )
        except Exception as e:
            logger.error("Generation failed for %s: %s", model_id, e)
            await _store_response(
                conversation_id, turn_number, model_id, position,
                f"[Error: {str(e)}]", 0, 0,
            )

    await asyncio.gather(
        gen_one(model_a, "a"),
        gen_one(model_b, "b"),
    )


async def _generate_single_response(
    conversation_id: str,
    turn_number: int,
    prompt: str,
    model_id: str,
) -> None:
    """Generate a response from a single model and store it."""
    start = time.time()
    try:
        content = await llm_client.generate(model_id, prompt, stream=False)
        latency_ms = int((time.time() - start) * 1000)
        token_count = len(content.split())
        await _store_response(
            conversation_id, turn_number, model_id, "single",
            content, latency_ms, token_count,
        )
    except Exception as e:
        logger.error("Generation failed for %s: %s", model_id, e)
        await _store_response(
            conversation_id, turn_number, model_id, "single",
            f"[Error: {str(e)}]", 0, 0,
        )


async def _store_response(
    conversation_id: str,
    turn_number: int,
    model_id: str,
    position: str,
    content: str,
    latency_ms: int,
    token_count: int,
) -> None:
    """Insert a generated response into the database."""
    async with async_session_factory() as session:
        async with session.begin():
            await session.execute(
                text("""
                    INSERT INTO responses
                        (id, conversation_id, turn_number, model_id, position,
                         content, latency_ms, token_count, created_at)
                    VALUES
                        (:id, :conv_id, :turn, :model_id, :position,
                         :content, :latency_ms, :token_count, NOW())
                """),
                {
                    "id": str(uuid.uuid4()),
                    "conv_id": conversation_id,
                    "turn": turn_number,
                    "model_id": model_id,
                    "position": position,
                    "content": content,
                    "latency_ms": latency_ms,
                    "token_count": token_count,
                },
            )


# Need this import for _store_response
from app.database import async_session_factory
