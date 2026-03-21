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
- Rate limiting: **disabled for IP-based limits** (venue WiFi shares a single external IP across all 500 attendees — IP-based limiting would 429 everyone). Switch to session-based limiting with high ceiling (100 votes/session/hour).
- Guest gate: unchanged at 3 free battles (same as normal operation)

After event: flip to `EVENT_MODE=false` → daily cron, IP-based rate limiting restored.

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

### What NOT to Build

- No horizontal auto-scaling (single instance handles 500 users)
- No read replicas (one MySQL instance handles this volume)
- No separate staging environment (production IS the demo)
- No custom presenter dashboard (same app for everyone)
- No persistent WebSocket connections post-event (EVENT_MODE toggles off)
- No ElastiCache (Redis co-located on EC2 — simpler for deadline)
