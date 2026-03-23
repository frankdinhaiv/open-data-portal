"""JWT validation middleware and guest session handling."""

from __future__ import annotations

import time
import uuid
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

# Optional bearer — allows unauthenticated (guest) access
optional_bearer = HTTPBearer(auto_error=False)


def create_access_token(user_id: str, username: str) -> str:
    """Create a JWT access token."""
    payload = {
        "sub": user_id,
        "username": username,
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400 * settings.JWT_EXPIRY_DAYS,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        return jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    import bcrypt
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its bcrypt hash."""
    import bcrypt
    return bcrypt.checkpw(password.encode(), hashed.encode())


class CurrentUser:
    """Represents the current authenticated user or guest."""

    def __init__(
        self,
        user_id: str,
        username: str | None = None,
        is_guest: bool = False,
    ):
        self.user_id = user_id
        self.username = username
        self.is_guest = is_guest


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer),
) -> CurrentUser:
    """Extract the current user from JWT or create a guest session.

    - If a valid JWT is provided, return the authenticated user.
    - If no token, check for X-Guest-Session header.
    - If neither, generate a guest session ID from the request.
    """
    if credentials and credentials.credentials:
        payload = decode_token(credentials.credentials)
        return CurrentUser(
            user_id=payload["sub"],
            username=payload.get("username"),
            is_guest=False,
        )

    # Guest session — must come from frontend's vigen_guest_sessionId via header
    guest_id = request.headers.get("X-Guest-Session")
    if not guest_id:
        # No session header and no JWT — generate a random guest ID
        # (frontend should always send X-Guest-Session, but fallback safely)
        guest_id = f"guest_{uuid.uuid4().hex[:16]}"

    return CurrentUser(user_id=guest_id, is_guest=True)


async def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
) -> CurrentUser:
    """Require a valid JWT — rejects guests."""
    payload = decode_token(credentials.credentials)
    return CurrentUser(
        user_id=payload["sub"],
        username=payload.get("username"),
        is_guest=False,
    )
