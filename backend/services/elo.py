import math
import random
from config import ELO_K


def elo_expected(r_a: float, r_b: float) -> float:
    return 1.0 / (1.0 + math.pow(10, (r_b - r_a) / 400))


def elo_update(r_a: float, r_b: float, score_a: float) -> dict:
    e_a = elo_expected(r_a, r_b)
    e_b = elo_expected(r_b, r_a)
    delta_a = round(ELO_K * (score_a - e_a))
    delta_b = round(ELO_K * ((1 - score_a) - e_b))
    return {
        "new_a": r_a + delta_a,
        "new_b": r_b + delta_b,
        "delta_a": delta_a,
        "delta_b": delta_b,
    }


def bootstrap_elo(votes: list, model_ids: list, n_permutations: int = 1000) -> dict:
    """Compute bootstrap Elo CIs by shuffling vote sequence."""
    from config import ELO_INITIAL

    results = {mid: [] for mid in model_ids}

    for _ in range(n_permutations):
        ratings = {mid: ELO_INITIAL for mid in model_ids}
        shuffled = votes.copy()
        random.shuffle(shuffled)

        for v in shuffled:
            a, b, choice = v["model_a_id"], v["model_b_id"], v["choice"]
            if a not in ratings or b not in ratings:
                continue
            if choice == "a":
                score = 1.0
            elif choice == "b":
                score = 0.0
            else:
                score = 0.5

            update = elo_update(ratings[a], ratings[b], score)
            ratings[a] = update["new_a"]
            ratings[b] = update["new_b"]

        for mid in model_ids:
            results[mid].append(ratings[mid])

    cis = {}
    for mid in model_ids:
        sorted_ratings = sorted(results[mid])
        n = len(sorted_ratings)
        if n == 0:
            cis[mid] = {"elo": ELO_INITIAL, "ci_lower": ELO_INITIAL, "ci_upper": ELO_INITIAL}
            continue
        idx_low = int(0.025 * n)
        idx_high = int(0.975 * n)
        median_elo = sorted_ratings[n // 2]
        cis[mid] = {
            "elo": median_elo,
            "ci_lower": sorted_ratings[idx_low],
            "ci_upper": sorted_ratings[idx_high],
        }

    return cis
