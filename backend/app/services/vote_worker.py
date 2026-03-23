"""Redis queue consumer — batch MySQL inserts + Elo micro-batch + Pub/Sub."""

from __future__ import annotations

import asyncio
import json
import logging
import time

from sqlalchemy import text

from app.config import settings
from app.database import async_session_factory
from app.redis_client import redis_pool, pubsub_redis
from app.services.elo import calculate_elo, result_from_choice

logger = logging.getLogger(__name__)

VOTE_QUEUE_KEY = "arena:vote_queue"
DRAIN_INTERVAL_SECONDS = 2
LEADERBOARD_CHANNEL = "arena:leaderboard_update"


class VoteWorker:
    """Background worker that drains the Redis vote queue every 2 seconds.

    Pipeline:
    1. LRANGE + LTRIM atomic drain from Redis list
    2. Batch INSERT votes into MySQL
    3. Recalculate Elo for affected models
    4. Publish leaderboard update via Redis Pub/Sub
    """

    def __init__(self) -> None:
        self._running = False
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        """Start the background drain loop."""
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("VoteWorker started (drain interval: %ds)", DRAIN_INTERVAL_SECONDS)

    async def stop(self) -> None:
        """Stop the worker gracefully, draining remaining items."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        # Final drain
        await self._drain_queue()
        logger.info("VoteWorker stopped")

    async def _run_loop(self) -> None:
        while self._running:
            try:
                await self._drain_queue()
            except Exception:
                logger.exception("VoteWorker drain error")
            await asyncio.sleep(DRAIN_INTERVAL_SECONDS)

    async def _drain_queue(self) -> None:
        """Atomically drain all pending votes from Redis and process them."""
        if not redis_pool:
            return

        # Atomic drain: LRANGE + LTRIM in a pipeline to prevent vote loss
        # LTRIM keeps elements from len..0 (i.e., nothing), effectively clearing
        # only the elements we just read. New items pushed between LRANGE and LTRIM
        # are preserved because LTRIM removes by index, not by deleting the key.
        queue_len = await redis_pool.llen(VOTE_QUEUE_KEY)
        if queue_len == 0:
            return

        pipe = redis_pool.pipeline()
        pipe.lrange(VOTE_QUEUE_KEY, 0, queue_len - 1)
        pipe.ltrim(VOTE_QUEUE_KEY, queue_len, -1)
        results = await pipe.execute()

        raw_votes: list[str] = results[0]
        if not raw_votes:
            return

        votes = []
        for raw in raw_votes:
            try:
                votes.append(json.loads(raw))
            except json.JSONDecodeError:
                logger.warning("Skipping malformed vote: %s", raw[:100])

        if not votes:
            return

        logger.info("Processing %d votes", len(votes))

        # Batch insert into MySQL
        await self._batch_insert_votes(votes)

        # Elo recalculation (if realtime or event mode)
        if settings.EVENT_MODE or settings.ELO_MODE == "realtime":
            await self._recalc_elo(votes)

        # Publish leaderboard update
        await self._publish_leaderboard_update()

    async def _batch_insert_votes(self, votes: list[dict]) -> None:
        """Insert votes into MySQL in a single transaction."""
        async with async_session_factory() as session:
            async with session.begin():
                for vote in votes:
                    await session.execute(
                        text("""
                            INSERT INTO votes
                                (conversation_id, turn_number, user_id,
                                 model_a_id, model_b_id, choice, created_at)
                            VALUES
                                (:conversation_id, :turn_number, :user_id,
                                 :model_a_id, :model_b_id, :choice, NOW())
                        """),
                        {
                            "conversation_id": vote["conversation_id"],
                            "turn_number": vote.get("turn_number", 1),
                            "user_id": vote.get("user_id"),
                            "model_a_id": vote["model_a_id"],
                            "model_b_id": vote["model_b_id"],
                            "choice": vote["choice"],
                        },
                    )

                    # Update pairwise stats
                    # Determine the winner model ID from the positional choice,
                    # then map to the sorted pair key for consistent storage.
                    pair_key = tuple(sorted([vote["model_a_id"], vote["model_b_id"]]))
                    choice = vote["choice"]
                    is_tie = choice in ("tie", "both_bad")

                    if is_tie:
                        pk_wins_a, pk_wins_b, pk_ties = 0, 0, 1
                    elif choice == "model_a":
                        # User picked position A → winner is model_a_id
                        winner = vote["model_a_id"]
                        pk_wins_a = 1 if winner == pair_key[0] else 0
                        pk_wins_b = 1 if winner == pair_key[1] else 0
                        pk_ties = 0
                    elif choice == "model_b":
                        # User picked position B → winner is model_b_id
                        winner = vote["model_b_id"]
                        pk_wins_a = 1 if winner == pair_key[0] else 0
                        pk_wins_b = 1 if winner == pair_key[1] else 0
                        pk_ties = 0
                    else:
                        pk_wins_a, pk_wins_b, pk_ties = 0, 0, 0

                    await session.execute(
                        text("""
                            INSERT INTO pairwise_stats
                                (model_a_id, model_b_id, wins_a, wins_b, ties, total)
                            VALUES
                                (:model_a, :model_b,
                                 :wins_a, :wins_b, :ties, 1)
                            ON DUPLICATE KEY UPDATE
                                wins_a = wins_a + :wins_a,
                                wins_b = wins_b + :wins_b,
                                ties = ties + :ties,
                                total = total + 1
                        """),
                        {
                            "model_a": pair_key[0],
                            "model_b": pair_key[1],
                            "wins_a": pk_wins_a,
                            "wins_b": pk_wins_b,
                            "ties": pk_ties,
                        },
                    )

    async def _recalc_elo(self, votes: list[dict]) -> None:
        """Micro-batch Elo recalculation for the models involved in these votes."""
        async with async_session_factory() as session:
            async with session.begin():
                for vote in votes:
                    model_a = vote["model_a_id"]
                    model_b = vote["model_b_id"]

                    # Get current ratings
                    result_a = await session.execute(
                        text("SELECT elo_rating FROM models WHERE id = :id"),
                        {"id": model_a},
                    )
                    result_b = await session.execute(
                        text("SELECT elo_rating FROM models WHERE id = :id"),
                        {"id": model_b},
                    )
                    row_a = result_a.fetchone()
                    row_b = result_b.fetchone()

                    rating_a = row_a[0] if row_a else 1000.0
                    rating_b = row_b[0] if row_b else 1000.0

                    # Calculate new ratings
                    outcome = result_from_choice(vote["choice"])
                    new_a, new_b = calculate_elo(rating_a, rating_b, outcome)

                    # Update models table
                    await session.execute(
                        text("""
                            UPDATE models
                            SET elo_rating = :rating,
                                total_battles = total_battles + 1
                            WHERE id = :id
                        """),
                        {"rating": new_a, "id": model_a},
                    )
                    await session.execute(
                        text("""
                            UPDATE models
                            SET elo_rating = :rating,
                                total_battles = total_battles + 1
                            WHERE id = :id
                        """),
                        {"rating": new_b, "id": model_b},
                    )

                    # Record Elo snapshot with actual battle counts
                    for mid, rating in [(model_a, new_a), (model_b, new_b)]:
                        battles_result = await session.execute(
                            text("SELECT total_battles FROM models WHERE id = :id"),
                            {"id": mid},
                        )
                        battles_row = battles_result.fetchone()
                        total_battles = battles_row[0] if battles_row else 0

                        await session.execute(
                            text("""
                                INSERT INTO elo_snapshots
                                    (model_id, elo_rating, total_battles, snapshot_at)
                                VALUES (:id, :rating, :battles, NOW())
                            """),
                            {"id": mid, "rating": rating, "battles": total_battles},
                        )

    async def _publish_leaderboard_update(self) -> None:
        """Notify all WebSocket listeners that the leaderboard changed."""
        if not pubsub_redis:
            return
        try:
            await pubsub_redis.publish(
                LEADERBOARD_CHANNEL,
                json.dumps({"type": "leaderboard_update", "timestamp": time.time()}),
            )
        except Exception:
            logger.warning("Failed to publish leaderboard update")


# Singleton
vote_worker = VoteWorker()


async def enqueue_vote(vote_data: dict) -> None:
    """Push a vote onto the Redis queue for async processing.

    Args:
        vote_data: Dict with keys: conversation_id, turn_number, user_id,
                   model_a_id, model_b_id, choice.
    """
    if not redis_pool:
        raise RuntimeError("Redis not initialized")

    # Dedup check — prevent double-votes
    dedup_key = (
        f"arena:dedup:{vote_data['conversation_id']}:"
        f"{vote_data.get('turn_number', 1)}:{vote_data.get('user_id', 'anon')}"
    )
    was_set = await redis_pool.set(dedup_key, "1", nx=True, ex=3600)
    if not was_set:
        raise ValueError("Duplicate vote — already voted on this turn")

    await redis_pool.rpush(VOTE_QUEUE_KEY, json.dumps(vote_data))
