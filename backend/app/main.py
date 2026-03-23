"""FastAPI application — CORS, startup/shutdown, router registration."""

from __future__ import annotations

import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import check_db_health, dispose_engine
from app.models.schemas import HealthResponse
from app.redis_client import check_redis_health, close_redis, init_redis
from app.services.llm_client import llm_client
from app.services.vote_worker import vote_worker

# Routers
from app.routers import arena, auth, history, leaderboard, prompts, votes
from app.ws.leaderboard import router as ws_router, start_broadcast_listener

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AIV Arena",
    description="Vietnamese AI Evaluation Platform — Battle, Compare, and Rank LLMs",
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

_cors_origins = [
    o.strip()
    for o in settings.CORS_ORIGINS.split(",")
    if o.strip()
] if settings.CORS_ORIGINS else ["http://localhost:5173", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["X-Guest-Session", "*"],
)

# ---------------------------------------------------------------------------
# Register routers
# ---------------------------------------------------------------------------

app.include_router(arena.router)
app.include_router(votes.router)
app.include_router(leaderboard.router)
app.include_router(prompts.router)
app.include_router(auth.router)
app.include_router(history.router)
app.include_router(ws_router)

# ---------------------------------------------------------------------------
# Lifecycle events
# ---------------------------------------------------------------------------

_broadcast_task: asyncio.Task | None = None


@app.on_event("startup")
async def startup():
    logger.info("Starting AIV Arena backend...")
    logger.info("EVENT_MODE=%s  ELO_MODE=%s  STREAMING=%s",
                settings.EVENT_MODE, settings.ELO_MODE, settings.ENABLE_STREAMING)

    # Initialize Redis
    await init_redis()

    # Initialize LLM client
    await llm_client.startup()
    from app.redis_client import redis_pool
    llm_client.set_redis(redis_pool)

    # Start vote worker
    await vote_worker.start()

    # Start WebSocket broadcast listener (EVENT_MODE only)
    global _broadcast_task
    if settings.EVENT_MODE:
        _broadcast_task = asyncio.create_task(start_broadcast_listener())

    logger.info("AIV Arena backend started successfully")


@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down AIV Arena backend...")

    # Stop broadcast listener
    global _broadcast_task
    if _broadcast_task:
        _broadcast_task.cancel()
        try:
            await _broadcast_task
        except asyncio.CancelledError:
            pass

    # Stop vote worker (drains remaining queue)
    await vote_worker.stop()

    # Shutdown LLM client
    await llm_client.shutdown()

    # Close Redis
    await close_redis()

    # Close DB pool
    await dispose_engine()

    logger.info("AIV Arena backend shut down cleanly")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health", response_model=HealthResponse, tags=["health"])
async def health():
    db_ok = await check_db_health()
    redis_ok = await check_redis_health()
    status = "healthy" if (db_ok and redis_ok) else "degraded"
    return HealthResponse(
        status=status,
        database=db_ok,
        redis=redis_ok,
    )


@app.get("/api/models", tags=["models"])
async def list_models():
    """Return the list of active models."""
    from app.services.model_registry import get_active_models
    models = get_active_models()
    return {
        "models": [
            {
                "id": m.id,
                "name": m.name,
                "provider": m.provider,
                "display_name": m.display_name,
            }
            for m in models
        ]
    }
