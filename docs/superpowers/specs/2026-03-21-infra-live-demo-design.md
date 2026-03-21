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
| Monitoring | Datadog or Grafana |

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
| Redis (queue + Pub/Sub) | Absorb vote bursts, broadcast leaderboard updates |
| WebSocket endpoint | Live leaderboard push to all connected clients |
| Elo micro-batch worker | Near-real-time ranking updates (every 2-5 seconds) |
| EVENT_MODE config flag | Toggle between daily batch and live demo mode |
| Load test script | Validate 500 concurrent users before event |
| Auto-reconnect on client | Handle flaky venue WiFi gracefully |

### Vote Submission Pipeline

**Goal:** < 100ms response time for vote submission under 500 concurrent users.

1. User taps vote button → `POST /api/votes`
2. FastAPI validates (auth/guest, dedup check) → pushes vote to Redis queue → returns `202 Accepted` immediately
3. Redis queue absorbs the burst — decouples user experience from MySQL write speed
4. Vote worker (async Python process) drains queue in micro-batches every 2 seconds:
   - Batch inserts votes into MySQL (single transaction)
   - Triggers Elo recalculation on the new batch
   - Publishes updated leaderboard to Redis Pub/Sub

**Why batch, not per-vote Elo:**
- 500 individual Elo recalculations per second would overload MySQL
- Batching every 2 seconds: ~50-100 votes per batch → one Elo pass → one leaderboard update
- Users see rankings move within 2-5 seconds of voting — feels live

### Live Leaderboard via WebSocket

**Goal:** All 500+ screens update simultaneously when rankings change.

1. FastAPI WebSocket endpoint: `ws://api/leaderboard/live`
2. On connect: server sends current leaderboard snapshot (full rankings)
3. On Elo recalc: vote worker publishes new rankings to Redis Pub/Sub → FastAPI broadcasts to all connected WebSocket clients
4. Client receives update: React app animates rank changes (rows slide up/down, Elo numbers tick, delta badges flash)

**Connection management:**
- Heartbeat ping every 15 seconds to detect stale connections
- Auto-reconnect on drop (critical for flaky venue WiFi)
- Fallback: if WebSocket fails, client polls `/api/leaderboard` every 10 seconds

**Bandwidth per update:**
- Leaderboard payload for 12 models: ~2-3 KB JSON
- At one update every 2-5 seconds: ~1 KB/s per client
- 500 clients: ~500 KB/s outbound — trivial for EC2

### Infrastructure Sizing

**EC2 Instance:**
- Minimum: `t3.xlarge` (4 vCPU, 16 GB RAM) for combined FastAPI + vote worker
- Redis: `cache.t3.small` on ElastiCache (or co-located on EC2 for simplicity)
- MySQL: Existing EC2 instance — ensure at least 4 GB RAM allocated to InnoDB buffer pool

### Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Vote submission latency | < 100ms (p95) | Instant feedback on mobile |
| Leaderboard update delay | < 5 seconds from vote | Fast enough to feel live |
| WebSocket broadcast latency | < 200ms | All screens update near-simultaneously |
| Concurrent WebSocket connections | 600 (500 + buffer) | Safety margin |
| MySQL write throughput | 50-100 batch inserts/sec | Vote worker drains queue in 2s batches |
| Uptime during 2-hour event | 100% | No restarts, no maintenance window |

### Event Mode Toggle

Config flag `EVENT_MODE=true` that switches:
- Elo recalc: daily cron → micro-batch every 2-5 seconds
- WebSocket endpoint: enabled
- Rate limiting: relaxed (venue WiFi shares IP across all attendees)

After event: flip to `EVENT_MODE=false` → daily cron, no WebSocket overhead.

### Graceful Degradation

| Failure | Fallback |
|---------|----------|
| Redis goes down | FastAPI falls back to direct MySQL writes (slower but works) |
| WebSocket drops | Client auto-reconnects + falls back to 10s polling |
| Vote worker falls behind | Redis queue absorbs (safe up to ~50K queued votes) |
| MySQL hits max connections | Vote worker retries with exponential backoff |
| Venue WiFi congested | Cloudflare CDN serves all static assets — only API calls go through WiFi to EC2 |

### Demo-Day Specifics

**Network:**
- 500 phones on venue WiFi = congested. Expect packet loss and high latency.
- Cloudflare CDN critical — static assets (JS/CSS/images) must NOT hit EC2
- QR code on stage screen linking to Arena URL for easy mobile access

**Pre-demo checklist:**
- [ ] Load test with 500 simulated concurrent voters (Locust or k6)
- [ ] Verify Redis queue doesn't grow unbounded under sustained load
- [ ] Test WebSocket reconnection on mobile (simulate network drop)
- [ ] Verify MySQL connection pool handles worker + API + WebSocket connections
- [ ] Warm Cloudflare CDN cache for all static assets
- [ ] DNS for domain (vieteval.ai) propagated and verified
- [ ] Run end-to-end: vote on phone → see leaderboard update on second device within 5s
- [ ] Test on 3G/slow connection (simulates congested venue WiFi)

### What NOT to Build

- No horizontal auto-scaling (single instance handles 500 users)
- No read replicas (one MySQL instance handles this volume)
- No separate staging environment (production IS the demo)
- No custom presenter dashboard (same app for everyone)
- No persistent WebSocket connections post-event (EVENT_MODE toggles off)
