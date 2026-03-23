"""Redis async connection for vote queue, cache, pub/sub."""

import redis.asyncio as aioredis

from app.config import settings

# Main connection pool — used for vote queue, cache, dedup sets
redis_pool: aioredis.Redis | None = None

# Separate connection for pub/sub (leaderboard live updates)
pubsub_redis: aioredis.Redis | None = None


async def init_redis() -> None:
    """Initialize Redis connection pools."""
    global redis_pool, pubsub_redis
    redis_pool = aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        max_connections=20,
    )
    pubsub_redis = aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        max_connections=5,
    )


async def close_redis() -> None:
    """Gracefully close Redis connections."""
    global redis_pool, pubsub_redis
    if redis_pool:
        await redis_pool.aclose()
        redis_pool = None
    if pubsub_redis:
        await pubsub_redis.aclose()
        pubsub_redis = None


async def get_redis() -> aioredis.Redis:
    """FastAPI dependency — returns the main Redis pool."""
    if redis_pool is None:
        raise RuntimeError("Redis not initialized. Call init_redis() first.")
    return redis_pool


async def check_redis_health() -> bool:
    """Ping Redis to verify connectivity."""
    try:
        if redis_pool:
            await redis_pool.ping()
            return True
        return False
    except Exception:
        return False
