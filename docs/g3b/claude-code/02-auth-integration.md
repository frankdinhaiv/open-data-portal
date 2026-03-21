# ViGen Arena: Auth Integration Spec

**G3B Implementation Spec — Auth System Frontend Integration**

Date: 2026-03-12
Status: Ready for implementation
Language: TypeScript (React), Python (FastAPI)
Theme: Light elegant (white/gray, blue accent)

---

## 1. Guest Session Management

### localStorage Keys & Persistence

Guest sessions are identified by a unique `guest_sessionId` stored in localStorage. Battles are counted to trigger the auth modal on the 4th attempt.

**localStorage schema:**
```json
{
  "vigen_guest_session_id": "uuid-string",
  "vigen_guest_battle_count": 0,
  "vigen_guest_created_at": "ISO8601-timestamp"
}
```

### Guest Session Manager Hook

```typescript
// lib/hooks/useGuestSession.ts

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const GUEST_SESSION_KEY = 'vigen_guest_session_id';
const GUEST_BATTLE_COUNT_KEY = 'vigen_guest_battle_count';
const GUEST_CREATED_AT_KEY = 'vigen_guest_created_at';

export function useGuestSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [battleCount, setBattleCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize or retrieve guest session
  useEffect(() => {
    const storedSessionId = localStorage.getItem(GUEST_SESSION_KEY);

    if (storedSessionId) {
      // Session exists, load it
      setSessionId(storedSessionId);
      const count = parseInt(localStorage.getItem(GUEST_BATTLE_COUNT_KEY) || '0', 10);
      setBattleCount(count);
    } else {
      // Create new guest session
      const newSessionId = uuidv4();
      const now = new Date().toISOString();

      localStorage.setItem(GUEST_SESSION_KEY, newSessionId);
      localStorage.setItem(GUEST_BATTLE_COUNT_KEY, '0');
      localStorage.setItem(GUEST_CREATED_AT_KEY, now);

      setSessionId(newSessionId);
      setBattleCount(0);
    }

    setIsInitialized(true);
  }, []);

  // Increment battle count (called after each completed battle)
  const incrementBattleCount = () => {
    const newCount = battleCount + 1;
    setBattleCount(newCount);
    localStorage.setItem(GUEST_BATTLE_COUNT_KEY, newCount.toString());
    return newCount;
  };

  // Clear guest session (called after successful login)
  const clearGuestSession = () => {
    localStorage.removeItem(GUEST_SESSION_KEY);
    localStorage.removeItem(GUEST_BATTLE_COUNT_KEY);
    localStorage.removeItem(GUEST_CREATED_AT_KEY);
    setSessionId(null);
    setBattleCount(0);
  };

  // Check if auth modal should show (4th battle)
  const shouldShowAuthModal = battleCount >= 3; // 0-indexed, so 3 = 4th battle

  return {
    sessionId,
    battleCount,
    incrementBattleCount,
    clearGuestSession,
    shouldShowAuthModal,
    isInitialized,
  };
}
```

---

## 2. Auth Modal Component

Modal appears after guest's 4th battle attempt. Options: Google OAuth, email/password, or continue as guest.

```typescript
// components/AuthModal.tsx

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess?: () => void;
}

export function AuthModal({ isOpen, onOpenChange, onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'options' | 'email'>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      onOpenChange(false);
      onAuthSuccess?.();
    } catch (err) {
      setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      onOpenChange(false);
      onAuthSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        {mode === 'options' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Đăng Nhập ViGen Arena
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Để tiếp tục tham gia cuộc bình chọn, vui lòng đăng nhập hoặc tạo tài khoản.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 font-medium"
                variant="outline"
              >
                {isLoading ? 'Đang xử lý...' : 'Đăng Nhập Bằng Google'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">Hoặc</span>
                </div>
              </div>

              <Button
                onClick={() => setMode('email')}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 font-medium"
              >
                Đăng Nhập Bằng Email
              </Button>

              <Button
                onClick={handleDismiss}
                variant="outline"
                className="w-full text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                Tiếp Tục Là Khách
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Đăng Nhập Bằng Email
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Nhập email và mật khẩu của bạn.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full border-gray-300"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full border-gray-300"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode('options')}
                  disabled={isLoading}
                  className="flex-1 text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  Quay lại
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700 font-medium"
                >
                  {isLoading ? 'Đang xử lý...' : 'Đăng Nhập'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 3. Topbar Auth Integration

Displays "Đăng Nhập" button for guests, avatar dropdown for authenticated users.

```typescript
// components/Topbar.tsx

import { useAuth } from '@/lib/hooks/useAuth';
import { useGuestSession } from '@/lib/hooks/useGuestSession';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react';

interface TopbarProps {
  voteCount: number;
  onAuthClick?: () => void;
}

export function Topbar({ voteCount, onAuthClick }: TopbarProps) {
  const { isLoggedIn, displayName, userId, logout } = useAuth();
  const { sessionId } = useGuestSession();

  const handleLogout = async () => {
    await logout();
  };

  const getAvatarFallback = () => {
    if (!displayName) return 'U';
    return displayName
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo placeholder */}
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-900">ViGen Arena</h1>
        </div>

        {/* Vote counter (center, authenticated only) */}
        {isLoggedIn && (
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <span>🗳️</span>
            <span>{voteCount} phiếu</span>
          </div>
        )}

        {/* Auth area (right) */}
        <div>
          {!isLoggedIn ? (
            <Button
              onClick={onAuthClick}
              className="bg-blue-600 text-white hover:bg-blue-700 font-medium"
            >
              Đăng Nhập
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full hover:bg-gray-100 p-1 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`} />
                    <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-gray-900 hidden sm:inline">
                    {displayName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem disabled className="text-xs text-gray-500">
                  {displayName}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/profile" className="flex items-center gap-2 cursor-pointer">
                    <UserIcon className="h-4 w-4" />
                    Hồ Sơ
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Đăng Xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
```

---

## 4. Guest → Account Data Migration

Backend endpoint and SQL query to link guest session data to authenticated user account.

```python
# backend/routes/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import update
from sqlalchemy.orm import Session
from datetime import datetime
import jwt

from database import get_db
from models import User, Conversation, Vote
from schemas import LinkSessionRequest
from config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LinkSessionRequest(BaseModel):
    guest_session_id: str

@router.post("/link-session")
async def link_guest_session(
    request: LinkSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Link all guest session data (conversations, votes) to authenticated user.

    Called after user logs in, before dismissing auth modal.
    Idempotent: safe to call multiple times for same user.
    """

    guest_session_id = request.guest_session_id

    if not guest_session_id or not current_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request: missing guest_session_id or user not authenticated",
        )

    try:
        # Update all conversations from guest session to user
        db.execute(
            update(Conversation).where(
                Conversation.guest_session_id == guest_session_id
            ).values(
                user_id=current_user.id,
                guest_session_id=None,
                updated_at=datetime.utcnow(),
            )
        )

        # Update all votes from guest session to user
        db.execute(
            update(Vote).where(
                Vote.guest_session_id == guest_session_id
            ).values(
                user_id=current_user.id,
                guest_session_id=None,
                updated_at=datetime.utcnow(),
            )
        )

        db.commit()

        return {
            "status": "success",
            "message": "Guest session linked to account",
            "user_id": current_user.id,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to link guest session: {str(e)}",
        )
```

**SQL migration (for reference):**
```sql
-- Migrate guest session data to authenticated user
UPDATE conversations
SET user_id = $1, guest_session_id = NULL, updated_at = NOW()
WHERE guest_session_id = $2;

UPDATE votes
SET user_id = $1, guest_session_id = NULL, updated_at = NOW()
WHERE guest_session_id = $2;
```

---

## 5. Zustand Auth State Slice

```typescript
// lib/store/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthState {
  // Auth state
  isLoggedIn: boolean;
  userId: string | null;
  userEmail: string | null;
  displayName: string | null;

  // Guest tracking
  guestSessionId: string | null;
  guestBattleCount: number;

  // UI state
  showAuthModal: boolean;

  // Actions
  setLoggedIn: (state: boolean) => void;
  setUser: (user: { id: string; email: string; displayName: string }) => void;
  clearUser: () => void;

  setGuestSession: (sessionId: string) => void;
  clearGuestSession: () => void;
  incrementGuestBattles: () => void;

  setShowAuthModal: (show: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      isLoggedIn: false,
      userId: null,
      userEmail: null,
      displayName: null,
      guestSessionId: null,
      guestBattleCount: 0,
      showAuthModal: false,

      // Auth actions
      setLoggedIn: (state) => set({ isLoggedIn: state }),

      setUser: (user) =>
        set({
          isLoggedIn: true,
          userId: user.id,
          userEmail: user.email,
          displayName: user.displayName,
        }),

      clearUser: () =>
        set({
          isLoggedIn: false,
          userId: null,
          userEmail: null,
          displayName: null,
        }),

      // Guest session actions
      setGuestSession: (sessionId) =>
        set({
          guestSessionId: sessionId,
          guestBattleCount: 0,
        }),

      clearGuestSession: () =>
        set({
          guestSessionId: null,
          guestBattleCount: 0,
        }),

      incrementGuestBattles: () =>
        set((state) => ({
          guestBattleCount: state.guestBattleCount + 1,
        })),

      // UI actions
      setShowAuthModal: (show) => set({ showAuthModal: show }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        userId: state.userId,
        userEmail: state.userEmail,
        displayName: state.displayName,
        isLoggedIn: state.isLoggedIn,
        guestSessionId: state.guestSessionId,
        guestBattleCount: state.guestBattleCount,
      }),
    }
  )
);
```

---

## 6. useAuth Hook

```typescript
// lib/hooks/useAuth.ts

import { useCallback } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { apiClient } from '@/lib/api/client';

export function useAuth() {
  const {
    isLoggedIn,
    userId,
    userEmail,
    displayName,
    guestSessionId,
    guestBattleCount,
    setLoggedIn,
    setUser,
    clearUser,
    setGuestSession,
    clearGuestSession,
    incrementGuestBattles,
  } = useAuthStore();

  // Check if user is authenticated (restore from token)
  const checkAuth = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/auth/me');
      setUser(response.data);
    } catch (err) {
      clearUser();
    }
  }, [setUser, clearUser]);

  // Login with email/password
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await apiClient.post('/api/auth/login', {
          email,
          password,
        });

        const { access_token, user } = response.data;

        // Store token in localStorage
        localStorage.setItem('auth_token', access_token);

        // Update store
        setUser({
          id: user.id,
          email: user.email,
          displayName: user.display_name || user.email.split('@')[0],
        });

        // Link guest session if exists
        if (guestSessionId) {
          try {
            await apiClient.post('/api/auth/link-session', {
              guest_session_id: guestSessionId,
            });
            clearGuestSession();
          } catch (err) {
            console.warn('Failed to link guest session, continuing anyway', err);
          }
        }

        return response.data;
      } catch (err) {
        throw err;
      }
    },
    [guestSessionId, setUser, clearGuestSession]
  );

  // Login with Google OAuth
  const loginWithGoogle = useCallback(async () => {
    try {
      // Trigger OAuth flow (assumes backend has /api/auth/google endpoint)
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        '/api/auth/google',
        'google-login',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }

      // Poll for completion (backend redirects to /api/auth/google/callback with token)
      return new Promise((resolve, reject) => {
        const pollInterval = setInterval(async () => {
          try {
            const response = await apiClient.get('/api/auth/me');
            clearInterval(pollInterval);
            popup?.close();

            setUser({
              id: response.data.id,
              email: response.data.email,
              displayName: response.data.display_name || response.data.email.split('@')[0],
            });

            // Link guest session if exists
            if (guestSessionId) {
              try {
                await apiClient.post('/api/auth/link-session', {
                  guest_session_id: guestSessionId,
                });
                clearGuestSession();
              } catch (err) {
                console.warn('Failed to link guest session, continuing anyway', err);
              }
            }

            resolve(response.data);
          } catch (err) {
            // Not logged in yet, continue polling
          }
        }, 500);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          popup?.close();
          reject(new Error('Google login timed out'));
        }, 5 * 60 * 1000);
      });
    } catch (err) {
      throw err;
    }
  }, [guestSessionId, setUser, clearGuestSession]);

  // Register with email/password
  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      try {
        const response = await apiClient.post('/api/auth/register', {
          email,
          password,
          display_name: displayName,
        });

        const { access_token, user } = response.data;

        localStorage.setItem('auth_token', access_token);

        setUser({
          id: user.id,
          email: user.email,
          displayName: user.display_name,
        });

        // Link guest session if exists
        if (guestSessionId) {
          try {
            await apiClient.post('/api/auth/link-session', {
              guest_session_id: guestSessionId,
            });
            clearGuestSession();
          } catch (err) {
            console.warn('Failed to link guest session, continuing anyway', err);
          }
        }

        return response.data;
      } catch (err) {
        throw err;
      }
    },
    [guestSessionId, setUser, clearGuestSession]
  );

  // Logout
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (err) {
      console.warn('Logout failed, clearing local state anyway', err);
    }

    localStorage.removeItem('auth_token');
    clearUser();
  }, [clearUser]);

  // Link guest session to account (called after login/register)
  const linkGuestSession = useCallback(async () => {
    if (!guestSessionId || !isLoggedIn) return;

    try {
      await apiClient.post('/api/auth/link-session', {
        guest_session_id: guestSessionId,
      });
      clearGuestSession();
    } catch (err) {
      console.error('Failed to link guest session:', err);
      throw err;
    }
  }, [guestSessionId, isLoggedIn, clearGuestSession]);

  return {
    // State
    isLoggedIn,
    userId,
    userEmail,
    displayName,
    guestSessionId,
    guestBattleCount,

    // Actions
    checkAuth,
    login,
    loginWithGoogle,
    register,
    logout,
    linkGuestSession,
    incrementGuestBattles,
  };
}
```

---

## 7. Auth Guard Middleware (FastAPI)

```python
# backend/middleware/auth.py

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import jwt

from database import get_db
from models import User
from config import settings

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    JWT-based auth guard for protected endpoints.

    Usage: @router.get("/protected")
           def protected_route(current_user: User = Depends(get_current_user)):
    """

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization credentials",
        )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"],
        )
        user_id: str = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
            )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except jwt.DecodeError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return user


def get_current_user_optional(
    credentials: HTTPAuthCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Optional auth guard. Returns user if authenticated, None otherwise.
    """

    if not credentials:
        return None

    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


def get_guest_session_id(request: Request) -> str | None:
    """
    Extract guest_session_id from request headers.

    Client should pass: X-Guest-Session-Id: <uuid>
    """
    return request.headers.get("X-Guest-Session-Id")
```

---

## 8. Edge Cases & Error Handling

### localStorage Cleared

```typescript
// lib/hooks/useAuth.ts - checkAuth addition

const checkAuth = useCallback(async () => {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    clearUser();
    return;
  }

  try {
    const response = await apiClient.get('/api/auth/me');
    setUser(response.data);
  } catch (err) {
    // Token invalid or expired
    localStorage.removeItem('auth_token');
    clearUser();
  }
}, [setUser, clearUser]);
```

### Token Expired

Handled by `useAuth.checkAuth()` → clears user state and localStorage token.

### Popup Blocked

```typescript
// Handled in loginWithGoogle
const popup = window.open(...);
if (!popup) {
  throw new Error('Popup blocked. Please allow popups for this site.');
}
```

### Duplicate Email Registration

```python
# backend/routes/auth.py

@router.post("/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please log in or use a different email.",
        )

    # ... create user
```

### Linking Same Session Twice

```python
# backend/routes/auth.py - link-session idempotent

@router.post("/link-session")
async def link_guest_session(...):
    """Idempotent: safe to call multiple times"""

    # If guest_session_id already linked to this user, no-op
    existing = db.query(Conversation).filter(
        (Conversation.guest_session_id == guest_session_id) &
        (Conversation.user_id == current_user.id)
    ).first()

    if existing:
        return {"status": "success", "message": "Already linked"}

    # ... link as normal
```

### Guest Session Persists Across Browsers

localStorage is per-browser, so guest data doesn't sync across devices. This is intentional (privacy).

---

## 9. API Client Setup

```typescript
// lib/api/client.ts

import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (expired token)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
```

---

## 10. Implementation Checklist

- [ ] Install dependencies: `npm install zustand axios uuid`
- [ ] Create `lib/hooks/useAuth.ts` (useAuth hook)
- [ ] Create `lib/hooks/useGuestSession.ts` (guest session manager)
- [ ] Create `lib/store/authStore.ts` (Zustand store)
- [ ] Create `lib/api/client.ts` (axios instance with interceptors)
- [ ] Create `lib/middleware/auth.ts` (FastAPI guards)
- [ ] Create `components/AuthModal.tsx` (modal component)
- [ ] Create `components/Topbar.tsx` (topbar with auth UI)
- [ ] Backend: Create `/api/auth/link-session` endpoint
- [ ] Backend: Add JWT guards to protected routes
- [ ] Test: Guest session creation & persistence
- [ ] Test: Auth modal triggers on 4th battle
- [ ] Test: Google OAuth flow
- [ ] Test: Email/password login
- [ ] Test: Guest→account data migration
- [ ] Test: Logout clears state
- [ ] Test: Token refresh on expired token
