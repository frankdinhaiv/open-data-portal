# Design: Infrastructure & Performance for Live Demo (April 5)

**Date:** 2026-03-21
**Status:** Approved
**Author:** Frank + Claude

---

## Context

On April 5, the Open Data Portal launches at an AI Day event. The presenter will do a live on-stage demo of both the Benchmark Leaderboard and the Arena. All ~500 audience members will access the Arena from their phones simultaneously, voting on model battles. The leaderboard must update in near-real-time so the audience sees their collective votes shifting rankings on their screens.

### Key Constraints
- 500+ concurrent mobile users on venue WiFi (congested, flaky)
- Write-heavy burst: all users submitting votes simultaneously
- Leaderboard must feel live — updates within 5 seconds of votes
- Presenter uses the same app on a big screen (not a special dashboard)
- Engineering deadline: G8 Mar 27 (6 days from spec date)
- Single EC2 instance is acceptable for this user count

## Production Architecture (Existing)

| Layer | Technology |
|-------|-----------|
| Frontend | ReactJS, Tailwind CSS, Shadcn/ui |
| Backend API | Python FastAPI (async) |
| Database | MySQL on AWS EC2 |
| Auth | Existing system (Google + email/password, JWT) |
| Elo Engine | Python batch job (daily cron) |
| LLM Inference | Live API calls to providers (OpenAI, Google, Anthropic, Meta, xAI, DeepSeek, Qwen) — API keys managed centrally by Sonny |
| Response Store | MySQL + S3 |
| Deployment | Docker on EC2, Cloudflare CDN — single-instance |
| Monitoring | Sentry (error tracking + performance) |

## Design

### System Architecture

```
User Phone (500+)          Presenter Screen (same app)
     │                          │
     ▼                          ▼
  Cloudflare CDN ──── Static React App (Tailwind/Shadcn)
     │                          │
     ▼                          ▼
  FastAPI (Docker/EC2) ◄──── WebSocket connection
     │         │
     ▼         ▼
  Redis     Redis Pub/Sub
  (vote queue)  (leaderboard updates)
     │
     ▼
  Elo Worker (micro-batch, every 2-5s)
     │
     ▼
  MySQL (AWS EC2)
```

### New Components

| Addition | Purpose |
|----------|---------|
| Redis (co-located on EC2) | Absorb vote bursts, broadcast leaderboard updates |
| WebSocket endpoint | Live leaderboard push to all connected clients |
| Elo micro-batch worker | Near-real-time ranking updates (every 2-5 seconds) |
| EVENT_MODE config flag | Toggle between daily batch and live demo mode |
| Load test script | Validate 500 concurrent users before event |
| Auto-reconnect on client | Handle flaky venue WiFi gracefully |

**Note:** Redis is co-located on the same EC2 instance (not ElastiCache). For a 2-hour event with 500 users, this eliminates one moving part, one network hop, and one AWS service that can misconfigure.

### Vote Submission Pipeline

**Goal:** < 100ms response time for vote submission under 500 concurrent users.

1. User taps vote button → `POST /api/votes`
2. FastAPI validates request → pushes vote to Redis queue → returns `202 Accepted` immediately
3. Redis queue absorbs the burst — decouples user experience from MySQL write speed
4. Vote worker (async Python process) drains queue in micro-batches every 2 seconds:
   - Batch inserts votes into MySQL (single transaction — up to 500 rows per cycle)
   - Triggers Elo recalculation on the new batch
   - Publishes updated leaderboard to Redis Pub/Sub

**Dedup check must be async:** The dedup check (one vote per voterId + conversationId + turnNumber + mode) must query Redis (in-memory set), NOT MySQL. A synchronous MySQL read in the fast path would break the 100ms target under 500 concurrent connections.

**Why batch, not per-vote Elo:**
- 500 individual Elo recalculations per second would overload MySQL
- Batching every 2 seconds: up to 500 votes per batch → one Elo pass → one leaderboard update
- Users see rankings move within 2-5 seconds of voting — feels live

### Guest Voting at the Event

Most audience members will scan a QR code and vote without creating an account. The guest voting path is critical for demo success:

- **Entry:** QR code on stage screen → Arena URL → 3 free battles without signing up → sign-up modal on 4th battle
- **All guest votes count for the leaderboard.** There is no distinction between guest votes and authenticated votes in Elo calculation. Every vote feeds the ranking regardless of login status.
- **Guest dedup:** By `guest_sessionId` stored in Redis (in-memory set). No MySQL query on the fast path.
- **Guest vote storage:** Vote pushed to Redis queue with `guest_sessionId`. Worker inserts to MySQL with session reference. Votes retroactively linked to account if user signs up.
- **3 free battles is unchanged for the event** — same rule as normal operation. Most audience members will vote 1-3 times; power users will sign up and continue.

### Live Leaderboard via WebSocket

**Goal:** All 500+ screens update simultaneously when rankings change.

1. FastAPI WebSocket endpoint: `ws://api/leaderboard/live`
2. On connect: server sends current leaderboard snapshot (full rankings)
3. On Elo recalc: vote worker publishes new rankings to Redis Pub/Sub → FastAPI broadcasts to all connected WebSocket clients
4. Client receives update: React app animates rank changes (rows slide up/down, Elo numbers tick, delta badges flash)

**Connection management:**
- Heartbeat ping every 15 seconds to detect stale connections
- Auto-reconnect on drop with exponential backoff (critical for flaky venue WiFi)
- Fallback: if WebSocket fails, client polls `/api/leaderboard` every 10 seconds

**Bandwidth per update:**
- Leaderboard payload for 12 models: ~2-3 KB JSON
- At one update every 2-5 seconds: ~1 KB/s per client
- 500 clients: ~500 KB/s outbound — trivial for EC2

### Infrastructure Sizing

**EC2 Instance:**
- Minimum: `t3.xlarge` (4 vCPU, 16 GB RAM) for FastAPI + vote worker + Redis
- MySQL: Existing EC2 instance — ensure at least 4 GB RAM for InnoDB buffer pool

**OS & Process Configuration (Critical):**
- `ulimit -n 65536` — raise file descriptor limit (default 1024 will drop WebSocket connections past ~500)
- Uvicorn: `--workers 1 --limit-concurrency 700` — single worker for WebSocket compatibility, concurrency ceiling above target
- Docker: `restart: unless-stopped` — auto-restart on crash or OOM kill

**MySQL Connection Pool Budget:**
- FastAPI API workers: 20 connections
- Vote batch worker: 10 connections
- WebSocket-related queries: 5 connections
- Total: 35 connections (set MySQL `max_connections >= 50` for headroom)

### Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Vote submission latency | < 100ms (p95) | Instant feedback on mobile |
| Leaderboard update delay | < 5 seconds from vote | Fast enough to feel live |
| WebSocket broadcast latency | < 200ms | All screens update near-simultaneously |
| Concurrent WebSocket connections | 600 (500 + buffer) | Safety margin |
| Vote batch size | Up to 500 rows per 2-second cycle | Single transaction drain |
| Uptime during 2-hour event | 100% | No restarts, no maintenance window |

### Event Mode Toggle

Config flag `EVENT_MODE=true` that switches:
- Elo recalc: daily cron → micro-batch every 2-5 seconds
- WebSocket endpoint: enabled
- Rate limiting: session-based limits relaxed (200 votes/session/hour vs production 100)
- Guest gate: unchanged at 3 free battles (same as normal operation)

After event: flip to `EVENT_MODE=false` → daily cron, WebSocket disabled, standard session-based rate limits restored.

### Graceful Degradation

| Failure | Fallback |
|---------|----------|
| Redis goes down | FastAPI falls back to direct MySQL writes (slower but works) |
| WebSocket drops | Client auto-reconnects with exponential backoff + falls back to 10s polling |
| Vote worker falls behind | Redis queue absorbs burst. Redis `maxmemory-policy` set to `noeviction`; if queue is full, API returns 503 (not silent drop) |
| MySQL hits max connections | Vote worker retries with exponential backoff; API returns 503 |
| FastAPI process crash/OOM | Docker `restart: unless-stopped` auto-restarts within 30 seconds |
| Venue WiFi congested | Cloudflare CDN serves all static assets — only API calls go through WiFi to EC2 |
| Venue WiFi total failure | Presenter's screen freezes. Mitigation: presenter can switch to mobile hotspot as backup connectivity. No special "demo reset" mode needed — app resumes when connectivity returns. |

### Monitoring with Sentry

Sentry is the existing monitoring tool. Configure for demo day:

**Backend (Python SDK):**
- Track all vote submission errors (failed Redis push, MySQL write failures)
- Performance monitoring: transaction traces on `/api/votes` and WebSocket broadcast
- Alert on error rate spike (> 5% of requests in 1-minute window)

**Frontend (JavaScript SDK):**
- Track WebSocket disconnection events
- Track vote submission failures (non-2xx responses)
- Performance monitoring: measure vote-to-leaderboard-update round trip time

**Demo-day Sentry dashboard:**
- Have Sentry open on a laptop backstage during the demo
- Watch for: error rate spikes, latency degradation, WebSocket connection count
- Designated team member monitors Sentry during the 2-hour event

### Demo-Day Specifics

**Network:**
- 500 phones on venue WiFi = congested. Expect packet loss and high latency.
- Cloudflare CDN critical — static assets (JS/CSS/images) must NOT hit EC2
- QR code on stage screen linking to Arena URL for easy mobile access
- Backup: presenter has mobile hotspot as failover if venue WiFi dies

**Pre-demo checklist:**
- [ ] Load test with 500 simulated concurrent voters AND 600 WebSocket connections held open (Locust or k6)
- [ ] Verify Redis queue doesn't grow unbounded under sustained load
- [ ] Test WebSocket reconnection on mobile (simulate network drop)
- [ ] Verify MySQL connection pool (35 budget) handles worker + API + WebSocket simultaneously
- [ ] Verify `ulimit -n 65536` and Uvicorn `--limit-concurrency 700` are set in Docker config
- [ ] Verify Docker `restart: unless-stopped` — kill container and confirm auto-restart within 30s
- [ ] Warm Cloudflare CDN cache for all static assets
- [ ] DNS for domain (vieteval.ai) propagated and verified
- [ ] Run end-to-end: vote on phone → see leaderboard update on second device within 5s
- [ ] Test on 3G/slow connection (simulates congested venue WiFi)
- [ ] Test guest flow from cold mobile device (unauthenticated, QR code entry, no prior session)
- [ ] Dry run EVENT_MODE toggle: flip to true, run 5 minutes, flip to false, verify daily cron resumes
- [ ] Sentry alerts configured and backstage laptop ready
- [ ] Redis `maxmemory-policy` set to `noeviction`

### LLM API Rate Limits (Critical)

**The system uses live inference, not pre-computed responses.** Every battle requires 2 simultaneous LLM API calls (one per model). Every follow-up turn is 2 more calls.

**Peak burst estimate:**
- 500 users × 2 models = 1,000 API calls in the first wave
- If each user does 2-3 turns: 2,000-3,000 calls in the first few minutes
- Over 2-hour event: ~5,000-10,000 total LLM API calls

**12 Arena models (confirmed by Katie, Mar 19):**
- `deepseek/deepseek-r1`
- `google/gemini-2.5-flash`
- `google/gemini-3.1-pro-preview`
- `meta-llama/llama-3-70b-instruct`
- `openai/gpt-4o-mini`
- `openai/gpt-5-mini`
- `openai/gpt-5.4`
- `qwen/qwen-vl-plus`
- `xai/grok-3-mini`
- `xai/grok-3-fast-latest`
- `anthropic/[TBD]`
- `[TBD — Katie requested 2 more from Sonny]`

**Rate limit risks per provider:**

| Provider | Typical RPM Limit (Tier 1-2) | Calls Needed (500 users, 2 turns avg) | Risk |
|----------|------------------------------|---------------------------------------|------|
| OpenAI (3 models) | 500-5,000 RPM | ~500 calls in burst | Medium — may hit limit with 3 models sharing one key |
| Google (2 models) | 1,000-2,000 RPM | ~330 calls in burst | Low-Medium |
| Anthropic (1 model) | 1,000-4,000 RPM | ~170 calls in burst | Low |
| xAI (2 models) | Varies | ~330 calls in burst | Unknown — verify |
| DeepSeek (1 model) | Varies | ~170 calls in burst | Unknown — verify |
| Qwen (1 model) | Varies | ~170 calls in burst | Unknown — verify |
| Meta/Llama (1 model) | Hosted provider limits | ~170 calls in burst | Depends on hosting |

**Mitigations:**
1. **Pre-event rate limit audit:** Test each API key with a burst of 100 concurrent requests. Verify the tier/quota is sufficient. Request quota increases from providers if needed (OpenAI and Google allow this with 24-48hr notice).
2. **Response caching layer:** Cache LLM responses in Redis by (prompt_hash + model_id). If the same prompt is sent to the same model twice, serve from cache. During the demo, many users will use suggested prompts — high cache hit rate expected.
3. **Request queuing per provider:** If a provider returns 429 (rate limit), queue the request and retry with exponential backoff. Show "Đang tải..." (Loading) to the user instead of an error.
4. **Fallback model rotation:** If one model's API is rate-limited or down, automatically swap it out of the random pair selection. The battle continues with a different model instead of failing.
5. **Timeout handling:** Set 30-second timeout per LLM call. If a model is slow, show a timeout message and offer "Thử lại" (Retry) or auto-select a different model pair.

**Pre-demo checklist additions:**
- [ ] Burst test each of the 12 API keys with 100 concurrent requests
- [ ] Verify provider tier/quota supports expected call volume
- [ ] Request quota increases from OpenAI and Google if on low tier
- [ ] Test response caching: same suggested prompt should return cached response on second call
- [ ] Verify fallback model rotation works when one provider returns 429

### Application Rate Limiting (Critical)

**Problem:** All 500 venue attendees share the same external IP address through venue WiFi/portable routers. IP-based rate limiting will treat 500 people as one abusive user.

**Affected endpoints:**
- `POST /api/votes` — vote submission
- `POST /api/auth/signup` — account creation
- `POST /api/auth/login` — authentication
- `GET /api/arena/next-battle` — battle initiation (triggers 2 LLM calls)
- `ws://api/leaderboard/live` — WebSocket connections

**Fix:** Remove IP-based rate limiting entirely — both for the event and production. Users behind shared networks (university WiFi, corporate NAT, mobile carriers, co-working spaces) will always share IPs. IP-based limiting is the wrong abstraction for this product.

**Use session-based rate limiting everywhere:**
- Rate limit by `guest_sessionId` or `user_id` (from JWT), never by IP
- **Session limits (production):** 100 votes/session/hour, 10 signups/session/hour, 60 battle initiations/session/hour
- **Session limits (EVENT_MODE):** Relaxed — 200 votes/session/hour, same signup/battle limits
- **WebSocket:** No rate limit on connection (one per client is natural)
- **Anti-abuse:** For bot detection, use behavioral signals (vote timing patterns, user-agent fingerprint) instead of IP blocking

### Demo Risk Register

| # | Risk | Likelihood | Impact | Category | Mitigation |
|---|------|-----------|--------|----------|------------|
| 1 | University WiFi can't handle 500 devices | **High** | Critical | Network | Do NOT use university WiFi. Deploy 3-5 portable WiFi routers with 4G/5G SIMs spread across the hall (~100-150 devices each). Display SSID names on stage screen. |
| 2 | Portable routers saturate under load | **Medium** | Critical | Network | 3-5 routers for redundancy. Pre-load React app as PWA (only API calls need network after first load). Fallback: presenter continues demo from own device if audience connectivity collapses. |
| 3 | QR code → page load too slow on congested network | **Medium** | High | Network/UX | Cloudflare CDN caches all static assets. Landing page must load < 2 seconds on 3G. Minimize initial JS bundle. |
| 4 | LLM API rate limits hit during burst | **High** | Critical | LLM | Response caching in Redis, per-provider request queuing with retry, fallback model rotation, pre-event quota verification. |
| 5 | Rate limiting blocks legitimate users | **Medium** | Critical | Rate Limit | Session-based limiting everywhere (never IP-based). Relaxed limits during EVENT_MODE. |
| 6 | Presenter's screen freezes mid-demo | **Low** | Critical | Demo flow | Presenter on wired ethernet or dedicated hotspot (NOT audience WiFi). Backup laptop pre-loaded. Rehearse full flow twice before event. |
| 7 | Pre-computed responses not seeded / LLM responses too slow | **Medium** | Critical | Data/LLM | Response cache warms from suggested prompts. Set 30s timeout per LLM call with retry. |
| 8 | API keys for 12 models not ready or expired | **Medium** | Critical | Data | Burst test all 12 keys 48 hours before event. Sonny manages keys centrally — verify with him. |
| 9 | Google OAuth fails (venue network blocks OAuth popup) | **Medium** | Medium | Auth | Guest voting works without OAuth. Most audience won't hit the 4th battle gate. |
| 10 | Audience doesn't understand how to vote | **Low** | High | UX | Presenter walks through "how to vote" on screen before opening to audience. Test with 3-5 non-technical people before event. |
| 11 | Audience loses interest before leaderboard updates | **Low** | Medium | Engagement | Live vote counter on screen ("342 votes so far!"). Presenter narrates ranking changes. |
| 12 | EC2 instance crashes during demo | **Low** | Critical | Infra | Docker `restart: unless-stopped`. Sentry monitoring backstage. |
| 13 | Domain (vieteval.ai) DNS not propagated | **Low** | Critical | Ops | Verify 72 hours before. Fallback: vigen.ztolabs.dev as backup URL. |
| 14 | Power outage / projector failure | **Low** | Critical | Venue | Confirm power outlets. Bring power strips. Test projector connection (HDMI/USB-C) before event. |
| 15 | One LLM provider goes down entirely | **Low** | Medium | LLM | Fallback model rotation removes downed model from pair selection. Arena continues with 11 models. |

### What NOT to Build

- No horizontal auto-scaling (single instance handles 500 users)
- No read replicas (one MySQL instance handles this volume)
- No separate staging environment (production IS the demo)
- No custom presenter dashboard (same app for everyone)
- No persistent WebSocket connections post-event (EVENT_MODE toggles off)
- No ElastiCache (Redis co-located on EC2 — simpler for deadline)
