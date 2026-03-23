"""Auth endpoints — signup, login, JWT validation."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import (
    CurrentUser,
    create_access_token,
    hash_password,
    require_auth,
    verify_password,
)
from app.models.schemas import (
    AuthResponse,
    LoginRequest,
    SignupRequest,
    UserProfile,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
async def signup(
    req: SignupRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user account.

    If guest_session_id is provided, links all guest conversations to the new user.
    """
    # Check if email already exists
    result = await db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": req.email},
    )
    if result.fetchone():
        raise HTTPException(409, "Email already registered")

    # Check if username already exists
    result = await db.execute(
        text("SELECT id FROM users WHERE username = :username"),
        {"username": req.username},
    )
    if result.fetchone():
        raise HTTPException(409, "Username already taken")

    user_id = str(uuid.uuid4())
    password_hash = hash_password(req.password)

    await db.execute(
        text("""
            INSERT INTO users (id, username, email, password_hash, created_at)
            VALUES (:id, :username, :email, :password_hash, NOW())
        """),
        {
            "id": user_id,
            "username": req.username,
            "email": req.email,
            "password_hash": password_hash,
        },
    )

    # Link guest conversations if provided
    if req.guest_session_id:
        await db.execute(
            text("""
                UPDATE conversations
                SET user_id = :user_id
                WHERE user_id = :guest_id
            """),
            {"user_id": user_id, "guest_id": req.guest_session_id},
        )

    await db.commit()

    token = create_access_token(user_id, req.username)
    return AuthResponse(
        access_token=token,
        user_id=user_id,
        username=req.username,
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    req: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user and return JWT."""
    result = await db.execute(
        text("SELECT id, username, password_hash FROM users WHERE email = :email"),
        {"email": req.email},
    )
    user = result.mappings().fetchone()
    if not user:
        raise HTTPException(401, "Invalid email or password")

    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")

    token = create_access_token(user["id"], user["username"])
    return AuthResponse(
        access_token=token,
        user_id=user["id"],
        username=user["username"],
    )


@router.get("/me", response_model=UserProfile)
async def get_profile(
    user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's profile and stats."""
    result = await db.execute(
        text("SELECT id, username, email, created_at FROM users WHERE id = :id"),
        {"id": user.user_id},
    )
    row = result.mappings().fetchone()
    if not row:
        raise HTTPException(404, "User not found")

    # Count votes
    votes_result = await db.execute(
        text("SELECT COUNT(*) as cnt FROM votes WHERE user_id = :id"),
        {"id": user.user_id},
    )
    total_votes = votes_result.mappings().fetchone()["cnt"]

    # Count conversations
    convs_result = await db.execute(
        text("SELECT COUNT(*) as cnt FROM conversations WHERE user_id = :id"),
        {"id": user.user_id},
    )
    total_conversations = convs_result.mappings().fetchone()["cnt"]

    return UserProfile(
        user_id=row["id"],
        username=row["username"],
        email=row["email"],
        total_votes=total_votes,
        total_conversations=total_conversations,
        created_at=row["created_at"],
    )
