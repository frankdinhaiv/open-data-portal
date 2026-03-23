"""Elo rating algorithm — K=32, base-10 logistic, initial 1000."""

from __future__ import annotations

K_FACTOR = 32
INITIAL_RATING = 1000.0


def expected_score(rating_a: float, rating_b: float) -> float:
    """Calculate expected score for player A using base-10 logistic."""
    return 1.0 / (1.0 + 10.0 ** ((rating_b - rating_a) / 400.0))


def calculate_elo(
    rating_a: float,
    rating_b: float,
    result: float,
    k: int = K_FACTOR,
) -> tuple[float, float]:
    """Compute new Elo ratings for both players.

    Args:
        rating_a: Current rating of model A.
        rating_b: Current rating of model B.
        result: Outcome from A's perspective.
            1.0 = A wins, 0.0 = B wins, 0.5 = tie or both-bad.
        k: K-factor (sensitivity). Default 32.

    Returns:
        (new_rating_a, new_rating_b)
    """
    e_a = expected_score(rating_a, rating_b)
    e_b = 1.0 - e_a

    new_a = rating_a + k * (result - e_a)
    new_b = rating_b + k * ((1.0 - result) - e_b)

    return round(new_a, 2), round(new_b, 2)


def result_from_choice(choice: str) -> float:
    """Map a VoteChoice string to a numeric result for Elo calculation.

    "model_a" -> 1.0 (A wins)
    "model_b" -> 0.0 (B wins)
    "tie"     -> 0.5
    "both_bad"-> 0.5
    """
    mapping = {
        "model_a": 1.0,
        "model_b": 0.0,
        "tie": 0.5,
        "both_bad": 0.5,
    }
    return mapping.get(choice, 0.5)
