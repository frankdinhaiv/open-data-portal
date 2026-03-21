# Authentication

## Overview

Auth backend is pre-existing (Google OAuth + email/password). This spec covers Arena UI integration points and guest-to-account migration only — not auth rebuild.

## Guest Flow

### Phase 1: Guest Entry (Battles 1-3)
1. User lands on Arena homepage
2. System generates `guest_sessionId` (UUID) stored in localStorage (`vigen_guest_sessionId`)
3. User initiates battles — all conversations and votes tied to `guest_sessionId`
4. Data persisted in both localStorage and backend

### Phase 2: Sign-Up Gate (Battle 4)
1. Frontend detects `battleCount >= 4` with `guest_sessionId` present
2. Sign-up modal displays:
   - "Đăng Nhập Bằng Google" (Google OAuth)
   - Email/password form with "Đăng Ký" button
3. User can dismiss modal ("Tiếp Tục Là Khách") — can browse but cannot start new battles

### Phase 3: Authentication
- **Google OAuth:** Consent screen → returns email, name, picture_url → account created or retrieved
- **Email/Password:** Email + password (>= 8 chars) → bcrypt hash → session token issued
- **Post-auth:** Guest conversations and votes migrated to new `user_id`, localStorage cleared

### Phase 4: Authenticated User
- Session token in httpOnly cookie, persists across refreshes
- All new conversations/votes stamped with `user_id`
- Full history visible: pre-signup guest battles + authenticated battles
- Logout clears token, user reverts to guest mode

## Vote Migration

Guest votes linked to accounts on signup via `guest_sessionId` from localStorage:
1. System looks up all Conversations matching `guest_sessionId`
2. Migrates conversations: `guest_sessionId` → `user_id`
3. Migrates all votes: `guest_sessionId` → `user_id`
4. localStorage cleared after migration completes

Migration is **session-keyed** (by `guest_sessionId`), not **identity-keyed** (by email). This prevents linking unintended votes from different sessions.

## Session Management

| Scenario | Token Storage | Persistence |
|----------|---------------|-------------|
| Guest (pre-auth) | localStorage `guest_sessionId` | Survives page refresh; lost if localStorage cleared |
| Authenticated | httpOnly cookie | Survives refresh + browser restart; expires 30 days |
| Logout | Token deleted | New guest_sessionId on next visit |
| Multiple tabs | Independent localStorage sessionId per tab | No cross-tab sync |

## Sign-Up Modal Behavior

| Trigger | Behavior |
|---------|----------|
| 4th battle attempt (guest) | Modal displays; blocks battle until auth or dismiss |
| Modal dismiss | Closes; user can browse but not start new battles |
| Already authenticated | Skip modal entirely |
| Signup success | Close modal; redirect to history; localStorage cleared |

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Guest clears localStorage before signup | Previous guest votes lost; new sessionId generated; fresh start |
| Duplicate email signup | Login flow triggered instead; existing account detected |
| OAuth popup blocked | Error message; fallback to email/password |
| Migration fails during signup | Account created but votes orphaned; recovery via support (P1+) |
| Multiple tabs as guest | Independent sessions; votes don't sync cross-tab |

## Design Decisions

- **Auth is integration-only** — No rebuild of existing auth backend. Scope limited to Arena UI entry points and guest migration.
- **Guest data stored in backend with `guest_sessionId`** — Not only localStorage. Ensures votes are recoverable even if browser retains the sessionId.
- **Guest gate triggers at 4th battle attempt** — 3 free battles chosen as the value threshold before requiring signup.
- **"Continue as Guest" explicitly allowed** — Dismissed users can browse but not start new battles. Re-triggers on each subsequent battle attempt.
- **Vote migration uses `guest_sessionId`, not email matching** — Session-keyed prevents linking unintended votes to an account.
- **JWT stored in httpOnly cookie** — Not localStorage, for security. Session persistence is cookie-based.
- **No session refresh tokens at P0** — Simple 30-day expiry accepted. Refresh token complexity deferred to P1+.

## Out of Scope

- Two-factor authentication (P1+)
- Password reset flow (P1+)
- Social login beyond Google (P1+)
- Account deletion / GDPR data export (P1+)
- Email verification (P1+)
