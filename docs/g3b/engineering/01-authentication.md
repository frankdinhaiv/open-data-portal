# G3B: Auth Integration & Guest Gate

Covers: P0-6 (Guest Voting + Sign-Up Gate), P0-7 (User Authentication — Integration Only)
Date: March 12, 2026
Status: G3B Design Review
Depends on: 00-data-model-api.md (User, Conversation, Vote entities)
Visual ref: ../prototype/arena-prototype.html

## 1. What This Feature Does

Integrates the **existing** authentication system (Google OAuth + email/password — already built and deployed) into the Arena UI. This spec does NOT cover auth implementation — the auth backend, login flows, JWT issuance, password hashing, and Google OAuth are all complete. This spec covers: (a) where auth surfaces in the Arena UI, (b) the guest-to-authenticated transition (guest gate), and (c) how guest data links to accounts after sign-up.

**Already built (no new development):**
- Google OAuth login flow
- Email/password registration and login
- Password validation and hashing
- JWT session token issuance and verification
- User account creation and retrieval
- Two-factor authentication (2FA)
- Password reset flow
- Profile page

**New for Arena (this spec):**
- Guest session tracking (localStorage)
- Sign-up gate trigger on 4th battle
- Guest vote → account migration
- Auth modal placement in Arena UI

## 2. User Flow

### Phase 1: Guest Entry (Battles 1-3)
1. User lands on ViGen Arena
2. System generates `guest_sessionId` (UUID) and stores in localStorage key `vigen_guest_sessionId`
3. User initiates battles — all conversations and votes stored with `guest_sessionId` (no `user_id`)
4. Guest data persisted to both localStorage and backend
5. Battles 2-3 follow same pattern, all tied to same `guest_sessionId`

### Phase 2: Sign-Up Gate (4th Battle Attempt)
1. User initiates 4th battle
2. Frontend checks `battleCount >= 4` AND `guest_sessionId` exists (no `user_id`)
3. Auth modal appears, blocking battle initiation
4. Modal options:
   - "Đăng Nhập Bằng Google" — triggers existing Google OAuth flow
   - Email/password form with "Đăng Ký" — triggers existing email auth flow
   - "Tiếp Tục Là Khách" — dismisses modal, user can browse but cannot start 4th battle
5. If user dismisses: modal closes, no 4th battle allowed, modal re-triggers on next attempt

### Phase 3: Post-Authentication (Guest → Account Linking)
1. Existing auth system returns session token (JWT)
2. Arena frontend stores token (httpOnly cookie)
3. Arena backend runs migration:
   - All Conversations with matching `guest_sessionId` → updated to `user_id`
   - All Votes with matching `guest_sessionId` → updated to `user_id`
4. localStorage `guest_sessionId` cleared
5. User redirected to conversation view — pre-signup battles now visible in history

### Phase 4: Authenticated User (Ongoing)
1. Session token checked on page load — if valid, user stays logged in
2. All new Conversations and Votes stamped with `user_id`
3. Topbar shows user name + avatar (from Google profile or default)
4. Logout clears session token; user reverts to guest mode

## 3. Key Behaviors

### Guest Gate Rules

| Trigger | Condition | Behavior |
|---------|-----------|----------|
| 4th battle attempt | `battleCount >= 4` AND no `user_id` | Auth modal blocks battle; user must authenticate or dismiss |
| Modal dismiss | User clicks "Tiếp Tục Là Khách" | Modal closes; user can browse/view history but cannot start new battle |
| Re-trigger | Dismissed user tries another battle | Modal re-appears |
| Already authenticated | Valid session token exists | Gate skipped entirely |

### Guest Data Linking

| Scenario | Behavior |
|----------|----------|
| Guest signs up → guest votes exist in backend | All guest Conversations + Votes migrated to new `user_id` |
| Guest clears localStorage before signup | `guest_sessionId` lost; backend data orphaned; new account starts fresh |
| Guest signs up with email A, had guest session B | Migration uses `guest_sessionId` from current localStorage, not email matching |

### Session Persistence

| Event | Behavior |
|-------|----------|
| Page refresh (guest) | `guest_sessionId` persists in localStorage |
| Page refresh (authenticated) | Session token in cookie; user stays logged in |
| Logout | Token cleared; new `guest_sessionId` generated on next visit |
| Multiple tabs (guest) | Each tab shares same localStorage `guest_sessionId` |

## 4. Auth Integration Points in Arena UI

| Location | Element | Behavior |
|----------|---------|----------|
| Topbar (guest) | "Đăng Nhập" button (top-right) | Opens auth modal |
| Topbar (authenticated) | User name + avatar (top-right) | Dropdown: Hồ Sơ (Profile), Đăng Xuất (Logout) |
| Profile menu item | "Hồ Sơ" in dropdown | Navigates to existing profile page (already built) |
| 4th battle gate | Auth modal (overlay) | Blocks battle; shows Google + email options |
| Vote counter | "Bạn đã bình chọn: [N] lần" | Visible only when authenticated |

## 5. Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| OAuth popup blocked by browser | Error toast "Không thể mở cửa sổ đăng nhập"; user can retry or use email/password |
| Existing account detected on signup | Login flow triggered; no duplicate account created |
| Guest migration fails (server error) | Account created; votes orphaned; error logged; user sees success but missing history (support recovery P1+) |
| User logs out, closes browser, returns | New `guest_sessionId`; fresh guest session; previous authenticated data accessible on re-login |
| Token expired | Auto-redirect to guest mode; auth modal on next battle attempt |

## 6. Acceptance Criteria

- [ ] Guest `guest_sessionId` (UUID) generated on first visit; stored in localStorage `vigen_guest_sessionId`
- [ ] All guest Conversations and Votes stored with `guest_sessionId`
- [ ] Auth modal triggers on 4th battle attempt (battleCount >= 4, no user_id)
- [ ] Auth modal shows "Đăng Nhập Bằng Google" button triggering existing OAuth flow
- [ ] Auth modal shows email/password form triggering existing auth flow
- [ ] "Tiếp Tục Là Khách" dismisses modal; blocks new battles; re-triggers on next attempt
- [ ] On auth success: guest Conversations + Votes migrated to user_id
- [ ] On auth success: localStorage `guest_sessionId` cleared
- [ ] Topbar shows "Đăng Nhập" for guests, user name + avatar for authenticated users
- [ ] Session persists across page refresh (cookie-based JWT)
- [ ] Logout clears session; user reverts to guest mode

## 7. Already Built (Integration Only)

These features exist and work. Arena just needs to connect to them — no new development:
- Auth backend (Google OAuth, email/password, JWT)
- Two-factor authentication (2FA)
- Password reset flow
- Profile page
- Email verification

## 8. Out of Scope

- Social login beyond Google (P1+)
- Account deletion / data export (P1+)
- Session refresh tokens (P1+; simple expiry acceptable for P0)
