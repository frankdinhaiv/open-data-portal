"""HaiMaker client + direct API fallback (async httpx, SSE streaming)."""

from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import AsyncGenerator

import httpx
from httpx_sse import aconnect_sse

from app.config import settings
from app.services.model_registry import get_model

logger = logging.getLogger(__name__)

# Timeout for a single LLM call
LLM_TIMEOUT = 15.0
# Max retries before giving up
MAX_RETRIES = 1


class LLMClient:
    """Unified async LLM client — HaiMaker primary, direct API fallback."""

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None
        self._redis = None  # set externally after init

    async def startup(self) -> None:
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(LLM_TIMEOUT))

    async def shutdown(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    def set_redis(self, redis_conn) -> None:
        """Inject Redis for EVENT_MODE caching."""
        self._redis = redis_conn

    # ------------------------------------------------------------------
    # Cache helpers (EVENT_MODE only)
    # ------------------------------------------------------------------

    def _cache_key(self, model_id: str, prompt: str, history: list | None) -> str:
        payload = json.dumps(
            {"model": model_id, "prompt": prompt, "history": history or []},
            sort_keys=True,
        )
        return f"llm:cache:{hashlib.sha256(payload.encode()).hexdigest()}"

    async def _get_cached(self, key: str) -> str | None:
        if not settings.EVENT_MODE or not self._redis:
            return None
        try:
            return await self._redis.get(key)
        except Exception:
            return None

    async def _set_cached(self, key: str, value: str) -> None:
        if not settings.EVENT_MODE or not self._redis:
            return
        try:
            await self._redis.set(key, value, ex=3600)  # 1 hour TTL
        except Exception:
            pass

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate(
        self,
        model_id: str,
        prompt: str,
        conversation_history: list[dict] | None = None,
        stream: bool = True,
    ) -> AsyncGenerator[str, None] | str:
        """Generate a response from the given model.

        Args:
            model_id: Full model id (e.g. "openai/gpt-4o-mini").
            prompt: User prompt text.
            conversation_history: Optional list of {"role": ..., "content": ...}.
            stream: If True, returns an async generator of text chunks.

        Returns:
            AsyncGenerator of text chunks (stream=True) or full string.
        """
        model_def = get_model(model_id)
        if not model_def:
            raise ValueError(f"Unknown model: {model_id}")

        # Check cache first
        cache_key = self._cache_key(model_id, prompt, conversation_history)
        cached = await self._get_cached(cache_key)
        if cached:
            if stream:
                async def _cached_stream():
                    yield cached
                return _cached_stream()
            return cached

        # Build messages
        messages = list(conversation_history or [])
        messages.append({"role": "user", "content": prompt})

        # Try HaiMaker first, then direct API fallback
        for attempt in range(MAX_RETRIES + 1):
            try:
                if stream:
                    return self._stream_with_cache(
                        model_def, messages, cache_key
                    )
                else:
                    result = await self._generate_sync(model_def, messages)
                    await self._set_cached(cache_key, result)
                    return result
            except httpx.HTTPStatusError as e:
                if e.response.status_code >= 400 and e.response.status_code < 500:
                    logger.warning(
                        "Client error %d for %s, not retrying",
                        e.response.status_code,
                        model_id,
                    )
                    raise
                if attempt < MAX_RETRIES:
                    logger.warning("Retrying %s (attempt %d)", model_id, attempt + 1)
                    continue
                raise
            except (httpx.TimeoutException, httpx.ConnectError) as e:
                if attempt < MAX_RETRIES:
                    logger.warning("Timeout/connect error for %s, retrying", model_id)
                    continue
                raise

    # ------------------------------------------------------------------
    # Streaming wrapper that caches the full response
    # ------------------------------------------------------------------

    async def _stream_with_cache(
        self, model_def, messages: list[dict], cache_key: str
    ) -> AsyncGenerator[str, None]:
        full_response = []
        async for chunk in self._stream_response(model_def, messages):
            full_response.append(chunk)
            yield chunk
        combined = "".join(full_response)
        await self._set_cached(cache_key, combined)

    # ------------------------------------------------------------------
    # HaiMaker
    # ------------------------------------------------------------------

    async def _call_haimaker(
        self, model_def, messages: list[dict], stream: bool = False
    ) -> httpx.Response:
        """Call HaiMaker API."""
        assert self._client is not None
        return await self._client.post(
            f"{settings.HAIMAKER_API_URL}/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.HAIMAKER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": model_def.id,
                "messages": messages,
                "stream": stream,
                "max_tokens": 2048,
            },
        )

    # ------------------------------------------------------------------
    # Direct API fallbacks
    # ------------------------------------------------------------------

    async def _call_openai(
        self, model_def, messages: list[dict], stream: bool = False
    ) -> httpx.Response:
        assert self._client is not None
        return await self._client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": model_def.name,
                "messages": messages,
                "stream": stream,
                "max_tokens": 2048,
            },
        )

    async def _call_anthropic(
        self, model_def, messages: list[dict], stream: bool = False
    ) -> httpx.Response:
        assert self._client is not None
        # Anthropic uses a different message format — extract system if present
        system_msg = ""
        user_messages = []
        for m in messages:
            if m["role"] == "system":
                system_msg = m["content"]
            else:
                user_messages.append(m)

        body: dict = {
            "model": model_def.name,
            "messages": user_messages,
            "max_tokens": 2048,
            "stream": stream,
        }
        if system_msg:
            body["system"] = system_msg

        return await self._client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json=body,
        )

    async def _call_google(
        self, model_def, messages: list[dict], stream: bool = False
    ) -> httpx.Response:
        assert self._client is not None
        # Convert to Google Gemini format
        contents = []
        for m in messages:
            role = "user" if m["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": m["content"]}]})

        endpoint = "streamGenerateContent" if stream else "generateContent"
        return await self._client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model_def.name}:{endpoint}",
            params={"key": settings.GOOGLE_API_KEY},
            headers={"Content-Type": "application/json"},
            json={
                "contents": contents,
                "generationConfig": {"maxOutputTokens": 2048},
            },
        )

    # ------------------------------------------------------------------
    # Dispatch
    # ------------------------------------------------------------------

    def _get_caller(self, model_def):
        """Return the appropriate API caller for a model."""
        dispatch = {
            "openai": self._call_openai,
            "anthropic": self._call_anthropic,
            "google": self._call_google,
            "haimaker": self._call_haimaker,
        }
        return dispatch.get(model_def.api_type, self._call_haimaker)

    def _get_fallback_caller(self, model_def):
        """Return a fallback caller (HaiMaker for direct APIs, direct for HaiMaker)."""
        if model_def.api_type == "haimaker":
            return None  # No fallback for HaiMaker-only models
        return self._call_haimaker

    # ------------------------------------------------------------------
    # Non-streaming response
    # ------------------------------------------------------------------

    async def _generate_sync(self, model_def, messages: list[dict]) -> str:
        caller = self._get_caller(model_def)
        fallback = self._get_fallback_caller(model_def)

        try:
            resp = await caller(model_def, messages, stream=False)
            resp.raise_for_status()
            return self._extract_content(model_def.api_type, resp.json())
        except Exception as e:
            if fallback and fallback != caller:
                logger.warning("Falling back to HaiMaker for %s: %s", model_def.id, e)
                resp = await fallback(model_def, messages, stream=False)
                resp.raise_for_status()
                return self._extract_content("haimaker", resp.json())
            raise

    # ------------------------------------------------------------------
    # Streaming response
    # ------------------------------------------------------------------

    async def _stream_response(
        self, model_def, messages: list[dict]
    ) -> AsyncGenerator[str, None]:
        caller = self._get_caller(model_def)
        fallback = self._get_fallback_caller(model_def)

        try:
            async for chunk in self._stream_from_caller(
                caller, model_def, messages
            ):
                yield chunk
        except Exception as e:
            if fallback and fallback != caller:
                logger.warning(
                    "Stream fallback to HaiMaker for %s: %s", model_def.id, e
                )
                async for chunk in self._stream_from_caller(
                    fallback, model_def, messages
                ):
                    yield chunk
            else:
                raise

    async def _stream_from_caller(
        self, caller, model_def, messages: list[dict]
    ) -> AsyncGenerator[str, None]:
        """Stream SSE chunks from a caller using httpx-sse."""
        assert self._client is not None

        # For Anthropic and Google, streaming uses different SSE formats.
        # HaiMaker and OpenAI use standard OpenAI SSE format.
        if model_def.api_type == "anthropic":
            async for chunk in self._stream_anthropic(model_def, messages):
                yield chunk
            return

        if model_def.api_type == "google":
            async for chunk in self._stream_google(model_def, messages):
                yield chunk
            return

        # OpenAI-compatible SSE (HaiMaker, OpenAI)
        if caller == self._call_haimaker:
            url = f"{settings.HAIMAKER_API_URL}/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {settings.HAIMAKER_API_KEY}",
                "Content-Type": "application/json",
            }
        else:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            }

        body = {
            "model": model_def.id if caller == self._call_haimaker else model_def.name,
            "messages": messages,
            "stream": True,
            "max_tokens": 2048,
        }

        async with aconnect_sse(
            self._client, "POST", url, headers=headers, json=body
        ) as event_source:
            async for sse in event_source.aiter_sse():
                if sse.data == "[DONE]":
                    break
                try:
                    data = json.loads(sse.data)
                    delta = data["choices"][0].get("delta", {})
                    content = delta.get("content", "")
                    if content:
                        yield content
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue

    async def _stream_anthropic(
        self, model_def, messages: list[dict]
    ) -> AsyncGenerator[str, None]:
        """Stream from Anthropic Messages API."""
        assert self._client is not None
        system_msg = ""
        user_messages = []
        for m in messages:
            if m["role"] == "system":
                system_msg = m["content"]
            else:
                user_messages.append(m)

        body: dict = {
            "model": model_def.name,
            "messages": user_messages,
            "max_tokens": 2048,
            "stream": True,
        }
        if system_msg:
            body["system"] = system_msg

        async with aconnect_sse(
            self._client,
            "POST",
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json=body,
        ) as event_source:
            async for sse in event_source.aiter_sse():
                try:
                    data = json.loads(sse.data)
                    if data.get("type") == "content_block_delta":
                        text = data.get("delta", {}).get("text", "")
                        if text:
                            yield text
                except (json.JSONDecodeError, KeyError):
                    continue

    async def _stream_google(
        self, model_def, messages: list[dict]
    ) -> AsyncGenerator[str, None]:
        """Stream from Google Gemini API (JSON stream, not SSE)."""
        assert self._client is not None
        contents = []
        for m in messages:
            role = "user" if m["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": m["content"]}]})

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_def.name}:streamGenerateContent"
        )
        async with self._client.stream(
            "POST",
            url,
            params={"key": settings.GOOGLE_API_KEY, "alt": "sse"},
            headers={"Content-Type": "application/json"},
            json={
                "contents": contents,
                "generationConfig": {"maxOutputTokens": 2048},
            },
        ) as resp:
            resp.raise_for_status()
            buffer = ""
            async for raw_chunk in resp.aiter_text():
                buffer += raw_chunk
                # Google streams JSON objects separated by newlines
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if not line or line.startswith("data: "):
                        line = line.removeprefix("data: ").strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            for part in parts:
                                text = part.get("text", "")
                                if text:
                                    yield text
                    except json.JSONDecodeError:
                        continue

    # ------------------------------------------------------------------
    # Content extraction (non-streaming)
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_content(api_type: str, data: dict) -> str:
        """Extract text content from various API response formats."""
        if api_type in ("openai", "haimaker"):
            return data["choices"][0]["message"]["content"]
        elif api_type == "anthropic":
            # Anthropic Messages API
            blocks = data.get("content", [])
            return "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
        elif api_type == "google":
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                return "".join(p.get("text", "") for p in parts)
            return ""
        return str(data)


# Singleton
llm_client = LLMClient()
