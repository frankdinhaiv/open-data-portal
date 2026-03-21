# G3B: Authentication & Guest Session Flow

Covers: P0-6 (Guest Voting + Sign-Up Gate), P0-7 (User Authentication)
Date: March 12, 2026
Status: G3B Design Review
Depends on: 00-data-model-api.md (User, Conversation, Vote entities)
Visual ref: ../prototype/arena-prototype.html

## 1. What This Feature Does

Governs how guests interact with ViGen Arena before authentication, when the sign-up gate triggers, how authentication works, and how guest conversations are preserved and linked to accounts. This spec defines the session lifecycle and data continuity rules — not the visual design of auth UI (design team owns that).

## 2. User Flow

### Phase 1: Guest Entry (Battles 1-3)
1. User lands on ViGen Arena homepage
2. System generates a `guest_sessionId` (UUID) and stores it in localStorage
3. User initiates first battle (requests prompt or uses suggested random prompt)
4. Backend creates Conversation with `guest_sessionId` (no user_id yet)
5. Responses fetched and displayed
6. User submits vote (pairwise win/loss/draw or direct 1-10)
7. Vote stored with `guest_sessionId` and `conversation_id`
8. Conversation and vote persisted in localStorage and backend
9. Battles 2 and 3 follow same pattern — all tied to same `guest_sessionId`

### Phase 2: Sign-Up Gate (Battle 4)
1. User initiates 4th battle
2. Frontend detects `battleCount >= 4`
3. Sign-up modal displays with two options:
   - "Đăng Nhập Bằng Google" (Google social login)
   - Email/password form with "Đăng Ký" button
4. User selects option or can dismiss modal to continue as guest (no 4th battle penalty)
5. Modal persists until user authenticates or dismisses

### Phase 3: Authentication → Account Creation
1. **Google OAuth Flow:**
   - User clicks "Đăng Nhập Bằng Google"
   - Google consent screen (standard OAuth)
   - Returns email, name, profile_picture_url
   - User account created or retrieved

2. **Email/Password Flow:**
   - User enters email and password
   - System validates: email format, password >= 8 chars
   - Account created with email/password hash
   - User logged in immediately

3. **Post-Authentication:**
   - System looks up all Conversations with matching `guest_sessionId`
   - Migrates conversations to new user_id
   - Migrates all Votes with `guest_sessionId` → user_id
   - localStorage cleared (guest data removed)
   - User redirected to conversation history view with newly linked battles visible

### Phase 4: Authenticated User (Ongoing)
1. User stays logged in across page refreshes (session token in secure cookie or localStorage)
2. All new Conversations created with `user_id` (no `guest_sessionId`)
3. All Votes stamped with `user_id`
4. User can view full history: pre-signup guest battles + authenticated battles
5. Logout clears session token; user reverts to guest mode on next visit

## 3. Key Behaviors

### Session Management

| Scenario | Token Storage | Persistence | Recovery |
|----------|---------------|-------------|----------|
| Guest (pre-auth) | localStorage `guest_sessionId` | Survives page refresh | Lost if localStorage cleared |
| Authenticated | Secure httpOnly cookie + optional localStorage token | Survives page refresh + browser restart | Session expires after 30 days (optional P1+ refresh) |
| Logout | Token deleted | Not persisted | New guest_sessionId generated on next visit |
| Multiple tabs | Each tab has independent localStorage sessionId | Separate vote streams per tab | No merging; treated as independent sessions |

### Sign-Up Modal Behavior

| Trigger | Condition | Behavior |
|---------|-----------|----------|
| 4th battle attempt | `battleCount == 4` AND `guest_sessionId` exists | Modal displays; block battle initiation until user auth or dismiss |
| Modal dismiss | User clicks outside modal or "Tiếp Tục Là Khách" | Modal closes; user can continue as guest (no 4th battle penalty) |
| Already authenticated | User has valid session token | Skip modal entirely |
| Signup success | OAuth/email auth succeeds | Close modal; redirect to history; localStorage cleared |

### Guest Data Linking

| Action | Precondition | Effect |
|--------|-----------|--------|
| Guest votes | `guest_sessionId` exists, no `user_id` | Vote stored with `guest_sessionId`; persisted to localStorage + backend |
| User signs up | Email matches user DB OR new account created | All guest Conversations updated: `guest_sessionId` → `user_id`; all Votes updated: `guest_sessionId` → `user_id` |
| localStorage cleared before signup | User's guest data exists in backend | Guest votes inaccessible; not recovered on signup; new user starts fresh |
| Signup with different email | User has guest votes under email A, signs up with email B | No collision; email A votes remain unlinked; email B account starts fresh |

### Session Persistence Rules

| Event | Before Page Refresh | After Page Refresh | Logic |
|-------|-------|----------|-------|
| Guest battle voted | guest_sessionId in localStorage | guest_sessionId persists | localStorage key = `vigen_guest_sessionId` |
| User authenticated | Session token (cookie + localStorage) | Session token valid | Token checked on app load; if valid, skip login |
| Guest data sent to backend | Conversation + Vote saved | Can retrieve via guest_sessionId | Guest data linkable on signup |
| User logs out | Session token deleted | No token | User reverts to guest mode |

## 4. Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Guest votes battles 1-3, clears localStorage, then tries 4th battle | New guest_sessionId generated; previous 3 battles lost; sign-up modal shows for 4th battle |
| User votes as guest, signs up, then clears localStorage | Account remains authenticated; can still view pre-signup battles via user_id query; localStorage clearing doesn't affect backend state |
| User signs up with email A, then tries to sign up again with email A | Login flow triggered instead; system detects existing account; user authenticates with password or Google |
| User has multiple tabs open as guest, votes in tab A, then switches to tab B | Tab B has separate localStorage sessionId; votes in tab A do NOT sync to tab B; no cross-tab merging |
| OAuth popup blocked | User sees error message; can retry or fall back to email/password |
| Sign-up with weak password (< 8 chars) | Form validation error displayed; user must enter >= 8 chars |
| Guest votes 3 battles, signs up, system fails to migrate guest votes | Error logged; user account created but votes orphaned; recovery via support (P1+ feature) |
| User logs out from authenticated session, then closes browser tab | New tab shows guest mode; new guest_sessionId generated |

## 5. Authentication Methods

### Google OAuth
- **Flow:** User clicks "Đăng Nhập Bằng Google" → Google consent screen → redirect to Arena with auth code → backend exchanges code for user info
- **Data returned:** email, name, picture_url
- **Account resolution:** If email exists, login; if new, create account
- **Profile picture:** Set from Google picture_url

### Email/Password
- **Sign-up:** User enters email + password (>= 8 chars) + confirms password
- **Storage:** Password hashed with bcrypt (or equivalent)
- **Validation:** Email format validated; password strength enforced client-side + server-side
- **Login:** Email + password matched against hash; session token issued

## 6. Acceptance Criteria

- [ ] Guest sessionId is a UUID generated client-side on first visit
- [ ] Guest sessionId persisted in localStorage under key `vigen_guest_sessionId`
- [ ] Conversation entities include `guest_sessionId` field (nullable)
- [ ] Vote entities include `guest_sessionId` field (nullable)
- [ ] Sign-up modal triggers on 4th battle attempt when `guest_sessionId` exists and no `user_id`
- [ ] Modal displays Google OAuth button labeled "Đăng Nhập Bằng Google"
- [ ] Modal displays email/password form with "Đăng Ký" button
- [ ] Modal allows dismiss without authentication (user can continue as guest)
- [ ] On signup success: all guest Conversations linked to new user_id via migration query
- [ ] On signup success: all guest Votes linked to new user_id via migration query
- [ ] On signup success: localStorage cleared after linking completes
- [ ] Google OAuth returns email, name, profile_picture_url and creates or retrieves account
- [ ] Email/password signup validates password >= 8 chars client-side + server-side
- [ ] Session token issued after auth; stored in httpOnly cookie
- [ ] Session token checked on page load; user remains logged in across refreshes
- [ ] Logout clears session token; user reverts to guest mode
- [ ] Multiple tabs maintain independent guest_sessionIds (no cross-tab sync)
- [ ] API endpoints check user_id or guest_sessionId to authorize vote access
- [ ] Guest vote history accessible post-signup via user_id query
- [ ] Email uniqueness enforced; duplicate signup attempts trigger login flow

## 7. Out of Scope

- Two-factor authentication (P1+)
- Password reset flow (P1+)
- Social login beyond Google (P1+; other providers as needed)
- Account deletion/GDPR data export (P1+)
- Session refresh tokens (P1+; simple 30-day expiry acceptable for G3B)
- Email verification (P1+; assume verified on signup for G3B)
