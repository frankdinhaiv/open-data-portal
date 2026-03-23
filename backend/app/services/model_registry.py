"""Model definitions, pair selection, and balanced distribution."""

from __future__ import annotations

import random
from dataclasses import dataclass


@dataclass(frozen=True)
class ModelDef:
    id: str
    name: str
    provider: str
    display_name: str
    api_type: str  # "haimaker", "openai", "anthropic", "google"
    is_active: bool = True


# ---------------------------------------------------------------------------
# 12 confirmed models
# ---------------------------------------------------------------------------

MODELS: list[ModelDef] = [
    ModelDef(
        id="deepseek/deepseek-r1",
        name="deepseek-r1",
        provider="deepseek",
        display_name="DeepSeek R1",
        api_type="haimaker",
    ),
    ModelDef(
        id="google/gemini-2.5-flash",
        name="gemini-2.5-flash",
        provider="google",
        display_name="Gemini 2.5 Flash",
        api_type="google",
    ),
    ModelDef(
        id="google/gemini-3.1-pro-preview",
        name="gemini-3.1-pro-preview",
        provider="google",
        display_name="Gemini 3.1 Pro Preview",
        api_type="google",
    ),
    ModelDef(
        id="meta-llama/llama-3-70b-instruct",
        name="llama-3-70b-instruct",
        provider="meta-llama",
        display_name="Llama 3 70B Instruct",
        api_type="haimaker",
    ),
    ModelDef(
        id="openai/gpt-4o-mini-transcribe-2025-12-15",
        name="gpt-4o-mini",
        provider="openai",
        display_name="GPT-4o Mini",
        api_type="haimaker",
    ),
    ModelDef(
        id="openai/gpt-5-mini",
        name="gpt-5-mini",
        provider="openai",
        display_name="GPT-5 Mini",
        api_type="openai",
    ),
    ModelDef(
        id="openai/gpt-5.4-pro-2026-03-05",
        name="gpt-5.4",
        provider="openai",
        display_name="GPT-5.4 Pro",
        api_type="haimaker",
    ),
    ModelDef(
        id="qwen/qwen-vl-plus",
        name="qwen-vl-plus",
        provider="qwen",
        display_name="Qwen VL Plus",
        api_type="haimaker",
    ),
    ModelDef(
        id="xai/grok-3-mini-fast-beta",
        name="grok-3-mini",
        provider="xai",
        display_name="Grok 3 Mini",
        api_type="haimaker",
    ),
    ModelDef(
        id="xai/grok-3-fast-latest",
        name="grok-3-fast-latest",
        provider="xai",
        display_name="Grok 3 Fast",
        api_type="haimaker",
    ),
    ModelDef(
        id="anthropic/claude-sonnet-4-6",
        name="claude-sonnet-4-6",
        provider="anthropic",
        display_name="Claude Sonnet 4.6",
        api_type="anthropic",
    ),
    ModelDef(
        id="mistral/mistral-large",
        name="mistral-large",
        provider="mistral",
        display_name="Mistral Large",
        api_type="haimaker",
    ),
]

# Lookup by id
MODEL_MAP: dict[str, ModelDef] = {m.id: m for m in MODELS}


def get_active_models() -> list[ModelDef]:
    """Return only active models."""
    return [m for m in MODELS if m.is_active]


def get_model(model_id: str) -> ModelDef | None:
    """Lookup a single model by id."""
    return MODEL_MAP.get(model_id)


# ---------------------------------------------------------------------------
# Pair selection — balanced distribution
# ---------------------------------------------------------------------------

# Track how many times each pair has been selected this session.
# In production this would be backed by Redis counters.
_pair_counts: dict[tuple[str, str], int] = {}


def select_pair() -> tuple[ModelDef, ModelDef]:
    """Pick two distinct active models with balanced distribution.

    Strategy: generate all possible pairs, weight inversely by how often
    each pair has been used, then sample. This ensures under-represented
    pairs get picked more often.
    """
    active = get_active_models()
    if len(active) < 2:
        raise ValueError("Need at least 2 active models to form a pair")

    pairs: list[tuple[ModelDef, ModelDef]] = []
    for i, a in enumerate(active):
        for b in active[i + 1 :]:
            pairs.append((a, b))

    # Inverse-frequency weighting
    max_count = max(_pair_counts.values(), default=0) + 1
    weights = []
    for a, b in pairs:
        key = tuple(sorted([a.id, b.id]))
        count = _pair_counts.get(key, 0)
        weights.append(max_count - count + 1)

    chosen = random.choices(pairs, weights=weights, k=1)[0]

    # Record and randomize position (A/B)
    key = tuple(sorted([chosen[0].id, chosen[1].id]))
    _pair_counts[key] = _pair_counts.get(key, 0) + 1

    if random.random() < 0.5:
        return chosen[1], chosen[0]
    return chosen


def reset_pair_counts() -> None:
    """Reset pair distribution counters (e.g., at start of event)."""
    _pair_counts.clear()
