from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
import aiosqlite
from database import get_db
from models.schemas import AuthRegister, AuthLogin, AuthResponse, UserOut
from services.auth_service import hash_password, verify_password, create_token, decode_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


async def get_current_user(authorization: Optional[str] = Header(None), db: aiosqlite.Connection = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    if not payload:
        return None
    cursor = await db.execute("SELECT id, email, display_name FROM users WHERE id = ?", (payload["user_id"],))
    row = await cursor.fetchone()
    if not row:
        return None
    return {"id": row[0], "email": row[1], "display_name": row[2]}


@router.post("/register", response_model=AuthResponse)
async def register(data: AuthRegister, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id FROM users WHERE email = ?", (data.email,))
    if await cursor.fetchone():
        raise HTTPException(400, "Email already registered")

    pw_hash = hash_password(data.password)
    display = data.display_name or data.email.split("@")[0]
    cursor = await db.execute(
        "INSERT INTO users (email, password_hash, display_name, auth_provider) VALUES (?, ?, ?, 'email')",
        (data.email, pw_hash, display),
    )
    await db.commit()
    user_id = cursor.lastrowid
    token = create_token(user_id, data.email)
    return AuthResponse(token=token, user_id=user_id, email=data.email, display_name=display)


@router.post("/login", response_model=AuthResponse)
async def login(data: AuthLogin, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id, email, password_hash, display_name FROM users WHERE email = ?", (data.email,))
    row = await cursor.fetchone()
    if not row or not verify_password(data.password, row[2]):
        raise HTTPException(401, "Invalid credentials")

    token = create_token(row[0], row[1])
    return AuthResponse(token=token, user_id=row[0], email=row[1], display_name=row[3])


@router.get("/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(401, "Not authenticated")
    return UserOut(**user)


@router.post("/link-session")
async def link_session(session_id: str, user=Depends(get_current_user), db: aiosqlite.Connection = Depends(get_db)):
    if not user:
        raise HTTPException(401, "Not authenticated")
    await db.execute("UPDATE votes SET voter_id = ? WHERE session_id = ? AND voter_id IS NULL", (user["id"], session_id))
    await db.commit()
    return {"linked": True}
