"""WebSocket endpoint for live leaderboard updates (EVENT_MODE)."""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import text

from app.config import settings
from app.database import async_session_factory
from app.redis_client import pubsub_redis
from app.services.model_registry import get_model

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

LEADERBOARD_CHANNEL = "arena:leaderboard_update"

# Connected WebSocket clients
_clients: set[WebSocket] = set()


@router.websocket("/api/leaderboard/live")
async def leaderboard_live(ws: WebSocket):
    """WebSocket endpoint that pushes leaderboard updates in real time.

    Only active when EVENT_MODE is enabled. Clients receive a full
    leaderboard snapshot on each update.
    """
    if not settings.EVENT_MODE:
        await ws.close(code=4000, reason="EVENT_MODE not enabled")
        return

    await ws.accept()
    _clients.add(ws)
    logger.info("WebSocket client connected (%d total)", len(_clients))

    try:
        # Send initial snapshot
        snapshot = await _get_leaderboard_snapshot()
        await ws.send_json(snapshot)

        # Keep connection alive — actual updates come from the broadcast task
        while True:
            # Wait for pings or client messages (keepalive)
            try:
                data = await asyncio.wait_for(ws.receive_text(), timeout=30)
                # Client can send "ping" for keepalive
                if data == "ping":
                    await ws.send_text("pong")
            except asyncio.TimeoutError:
                # Send keepalive ping
                await ws.send_text("ping")
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("WebSocket error: %s", e)
    finally:
        _clients.discard(ws)
        logger.info("WebSocket client disconnected (%d remaining)", len(_clients))


async def start_broadcast_listener():
    """Subscribe to Redis Pub/Sub and broadcast leaderboard updates to all WebSocket clients.

    Should be started as a background task during app startup.
    """
    if not settings.EVENT_MODE or not pubsub_redis:
        return

    pubsub = pubsub_redis.pubsub()
    await pubsub.subscribe(LEADERBOARD_CHANNEL)
    logger.info("Leaderboard broadcast listener started")

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue

            if not _clients:
                continue

            # Fetch fresh leaderboard data
            snapshot = await _get_leaderboard_snapshot()

            # Broadcast to all connected clients
            disconnected = set()
            for client in _clients:
                try:
                    await client.send_json(snapshot)
                except Exception:
                    disconnected.add(client)

            _clients.difference_update(disconnected)
    except asyncio.CancelledError:
        pass
    finally:
        await pubsub.unsubscribe(LEADERBOARD_CHANNEL)
        await pubsub.aclose()


async def _get_leaderboard_snapshot() -> dict:
    """Fetch current leaderboard state from MySQL."""
    async with async_session_factory() as session:
        result = await session.execute(
            text("""
                SELECT id, elo_rating, total_battles
                FROM models
                WHERE is_active = 1
                ORDER BY elo_rating DESC
            """)
        )
        rows = result.mappings().fetchall()

        total_result = await session.execute(
            text("SELECT COUNT(*) as cnt FROM votes")
        )
        total_votes = total_result.mappings().fetchone()["cnt"]

    entries = []
    for rank, row in enumerate(rows, 1):
        model_def = get_model(row["id"])
        total = row["total_battles"] or 0
        entries.append({
            "rank": rank,
            "model_id": row["id"],
            "display_name": model_def.display_name if model_def else row["id"],
            "provider": model_def.provider if model_def else "unknown",
            "elo_rating": row["elo_rating"],
            "total_battles": total,
            "win_rate": 0.0,
        })

    return {
        "type": "leaderboard_update",
        "entries": entries,
        "total_votes": total_votes,
    }
