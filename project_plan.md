# ThreadScope — Threads Intelligence Platform
## Claude Code Initial Project Prompt

---

## 0.1 Project Status Dashboard

| Phase | Description | Status | Progress |
|-------|-------------|--------|----------|
| Phase 1 | Foundation | **Complete** | 11/11 items |
| Phase 2 | Analytics & Trends | **Complete** | 10/10 items |
| Phase 3 | Discovery & Competition | **Complete** | 10/10 items |
| Phase 4 | Polish & Launch | **In Progress** | 3/10 items |
| Phase 5 | Vercel Migration | Not started | 0/8 items |

**Key remaining Phase 4 items:**
- Playwright E2E tests
- Dark mode
- Responsive design pass
- Redis caching optimization
- Cross-browser extension testing
- Railway production deployment
- Extension store publishing

---

## 0.2 Completed Work Log

### Batch 0 — Initial Build (Phases 1–3)
- Turborepo monorepo scaffold (`apps/api`, `apps/web`, `apps/extension`, `packages/shared`, `packages/ui`, `packages/eslint-config`)
- Prisma schema with full data model (20+ models, enums, indexes)
- Authentication system: register, login, JWT access/refresh tokens, API keys
- `ThreadsApiClient`: typed wrapper for `graph.threads.net` with token management, rate limiting, pagination
- Next.js 14 dashboard shell: App Router layout, sidebar, routing, auth pages (`output: 'standalone'`)
- `next.config.js` rewrites for API proxy
- WXT browser extension scaffold with threads.net page detection
- Express + tRPC API server with REST extension endpoints
- BullMQ worker with scheduled jobs (analytics sync, snapshots, trend collection, alerts)
- Docker Compose for local development (TimescaleDB + Redis)
- Dockerfiles for API (port 4000) and Web (port 3000, standalone)

### Batch 1 — CI & Fixes
- GitHub Actions CI workflow (lint, type-check, test, build)
- Project README
- Initial Prisma migration (`20260210000000_init`)
- TypeScript error fixes across API package

### Batch 2 — Testing & Webhooks
- Vitest test suite: 94 tests across `packages/shared` and `apps/api`
- Threads webhook extraction and processing (mentions, replies, publishes)
- CI test job integration

---

## 0.3 Remaining Work & Railway Deployment Runbook

### Part A — Pre-Deployment Checklist

Before deploying to Railway, verify the following:

**1. Database migration strategy**
The API Dockerfile runs `prisma generate` at build time but does **not** run `prisma migrate deploy` on startup. You have two options:
- **Option A (recommended):** Add a Railway deploy command or pre-start script that runs `npx prisma migrate deploy` before starting the server
- **Option B:** Run migrations manually via `railway run npx prisma migrate deploy` after each deploy that includes schema changes

**2. CORS origins are configurable**
Already handled — `CORS_ORIGINS` env var accepts a comma-separated list of allowed origins (see `apps/api/src/middleware/cors.ts`). Set this to your production domain(s) in Railway.

**3. All environment variables documented**
See the full list below in Part B, Step 4. Cross-reference with `.env.example` in the repo root.

### Part B — Railway Deployment Guide

#### Step 1: Create Railway Project
1. Go to [railway.app](https://railway.app) and create a new project
2. Name it `threadscope`

#### Step 2: Add PostgreSQL Service
1. Click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway will auto-generate `DATABASE_URL` — note the variable reference: `${{Postgres.DATABASE_URL}}`

> **Note:** We're using plain PostgreSQL for now. The Prisma schema only requires `pg_trgm`, not any TimescaleDB-specific features. TimescaleDB (`timescale/timescaledb-ha:pg16` deployed as a Docker image on Railway) is an option to revisit later if time-series query performance becomes a bottleneck.

#### Step 3: Add Redis Service
1. Click **"+ New"** → **"Database"** → **"Redis"**
2. Railway will auto-generate `REDIS_URL` — note the variable reference: `${{Redis.REDIS_URL}}`

#### Step 4: Add API Service
1. Click **"+ New"** → **"GitHub Repo"** → select the `threadscope` repo
2. **Settings:**
   - Root directory: `/`
   - Dockerfile path: `apps/api/Dockerfile`
   - Healthcheck path: `/health`
3. **Environment variables:**
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   PORT=4000
   NODE_ENV=production
   JWT_SECRET=<generate-random-64-char-string>
   JWT_REFRESH_SECRET=<generate-random-64-char-string>
   ENCRYPTION_KEY=<generate-random-32-char-string>
   THREADS_APP_ID=<from-meta-developer-dashboard>
   THREADS_APP_SECRET=<from-meta-developer-dashboard>
   THREADS_OAUTH_REDIRECT_URI=https://<your-api-domain>/auth/threads/callback
   THREADS_WEBHOOK_VERIFY_TOKEN=<generate-random-string>
   CORS_ORIGINS=https://<your-web-domain>,chrome-extension://<extension-id>
   EXTENSION_ID=<chrome-extension-id-if-known>
   ```
4. **Networking:** Generate a public domain (e.g., `api-threadscope.up.railway.app`) or add custom domain `api.threadscope.com`

#### Step 5: Add Worker Service
1. Click **"+ New"** → **"GitHub Repo"** → select the `threadscope` repo (same repo)
2. **Settings:**
   - Root directory: `/`
   - Dockerfile path: `apps/api/Dockerfile`
   - **Custom start command:** `node dist/worker.js`
   - No public domain needed (internal only)
3. **Environment variables:**
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   NODE_ENV=production
   JWT_SECRET=<same-as-api>
   JWT_REFRESH_SECRET=<same-as-api>
   ENCRYPTION_KEY=<same-as-api>
   THREADS_APP_ID=<same-as-api>
   THREADS_APP_SECRET=<same-as-api>
   WORKER_CONCURRENCY=5
   ```

#### Step 6: Add Web Service
1. Click **"+ New"** → **"GitHub Repo"** → select the `threadscope` repo (same repo)
2. **Settings:**
   - Root directory: `/`
   - Dockerfile path: `apps/web/Dockerfile`
   - Healthcheck path: `/api/health`
3. **Environment variables:**
   ```
   API_URL=http://api.railway.internal:4000
   NEXTAUTH_URL=https://<your-web-domain>
   NEXTAUTH_SECRET=<generate-random-64-char-string>
   NEXT_PUBLIC_APP_URL=https://<your-web-domain>
   NEXT_PUBLIC_API_URL=https://<your-api-domain>
   ```
4. **Networking:** Generate a public domain or add custom domain `app.threadscope.com`

#### Step 7: Private Networking
Railway automatically enables private networking between services in the same project. The Web service reaches the API via `http://api.railway.internal:4000` (set in `API_URL`). No additional configuration needed — just make sure the API service's internal hostname resolves (check Railway service settings).

#### Step 8: Custom Domains (Optional)
1. In each service's settings, add your custom domain
2. Update DNS: CNAME record pointing to Railway's provided target
3. Railway handles TLS certificates automatically
4. After setting domains, update environment variables:
   - API: `THREADS_OAUTH_REDIRECT_URI`, `CORS_ORIGINS`
   - Web: `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`

#### Step 9: Run Initial Prisma Migration
```bash
# Option A: Using Railway CLI
railway link  # Link to your project
railway run --service api npx prisma migrate deploy

# Option B: From Railway dashboard
# Use the API service's shell and run:
npx prisma migrate deploy
```

#### Step 10: Test Health Endpoints
```bash
# API health
curl https://<your-api-domain>/health
# Expected: {"status":"ok","uptime":<seconds>,"database":"connected"}

# Web app
curl https://<your-web-domain>
# Expected: HTML response (Next.js app)
```

#### Step 11: Connect Threads OAuth
1. Go to [Meta Developer Dashboard](https://developers.facebook.com)
2. Open your Threads app (or create one)
3. Under **Threads API** → **Settings**, add your redirect URI:
   `https://<your-api-domain>/auth/threads/callback`
4. Ensure the app has the required scopes: `threads_basic`, `threads_content_publish`, `threads_manage_insights`, `threads_manage_replies`, `threads_keyword_search`, `threads_read_replies`
5. Copy the App ID and App Secret into the Railway env vars (`THREADS_APP_ID`, `THREADS_APP_SECRET`)
6. Test the OAuth flow: log in to the web app → Settings → Connections → Connect Threads

### Part C — Testing the Deployed System

After deployment, verify the system works for each user role:

**1. Unauthenticated User**
- Visit the web app URL
- Verify you see login/register pages
- Confirm no dashboard access without authentication
- Try accessing `/analytics` or `/trends` directly — should redirect to login

**2. Registered User (No Threads Connection)**
- Register a new account via email/password
- Log in and verify you reach the dashboard
- Confirm "Connect Threads" prompt is visible
- Explore settings pages (account, API keys, connections)
- Generate an API key for extension testing

**3. Connected User (Threads OAuth Linked)**
- Go to Settings → Connections → Connect Threads Account
- Complete the OAuth flow with a Threads account
- Verify the initial analytics sync triggers (check worker logs)
- Confirm the dashboard populates with account metrics
- Test trend explorer: add a tracked keyword, verify data appears
- Test creator discovery: search for a keyword, browse results

**4. Extension User**
- Install the browser extension (load unpacked from `apps/extension/.output/`)
- Open the extension popup → enter the API key generated in step 2
- Browse `threads.net` and verify:
  - Post insight overlays appear on posts
  - Creator quick cards appear on profiles
  - The floating widget is visible

**5. API Consumer**
- Use the API key to call extension REST endpoints:
  ```bash
  # Validate API key
  curl -H "X-API-Key: <your-key>" https://<your-api-domain>/api/v1/ext/me

  # Look up a post
  curl -H "X-API-Key: <your-key>" https://<your-api-domain>/api/v1/ext/creator/<username>

  # Check notifications
  curl -H "X-API-Key: <your-key>" https://<your-api-domain>/api/v1/ext/notifications
  ```

---

## 1. Project Overview

Build **ThreadScope**, a full-stack intelligence and analytics platform purpose-built for Meta's Threads. It provides creators, brands, marketers, and agencies with deep insight into what's happening on Threads — who's growing, what topics are trending, which content strategies work, and how to optimize their presence on the platform.

ThreadScope consists of two integrated products:

1. **ThreadScope Web Application** — A SaaS dashboard where authenticated users connect their Threads account, analyze their own performance, discover trending topics and creators, monitor competitors, research audiences, track keyword trends over time, and optimize their content strategy with data-driven recommendations.

2. **ThreadScope Browser Extension** — A cross-browser extension (Chrome, Edge, Firefox, Safari) that overlays intelligence onto the Threads web experience (threads.net), showing engagement analytics, creator metrics, and trend context inline as users browse.

Both products share a common backend API, authentication system, and data layer.

### 1.1 Why Threads

- **400M+ monthly active users** (as of late 2025), growing rapidly
- **Official API is comprehensive and expanding fast** — keyword search, public profile access, analytics, webhooks, polls, topic tags, location tagging, click metrics — all through the official Threads API (`graph.threads.net`)
- **Virtually no dedicated analytics tools exist** — only 1-2 niche products; general social media management tools treat Threads as an afterthought
- **Meta is actively investing** — new API features shipping every 2-3 weeks since the June 2024 launch
- **Competitive intelligence gap** — unlike X/Twitter (saturated with analytics tools), Threads is a greenfield opportunity

### 1.2 What Makes ThreadScope Different from Generic Social Media Tools

| Dimension | Generic Tools (Hootsuite, Sprout, etc.) | ThreadScope |
|-----------|----------------------------------------|-------------|
| Threads depth | Basic posting + vanity metrics | Deep analytics, trend intelligence, creator discovery, content strategy |
| API coverage | Minimal Threads endpoints | Full Threads API surface including keyword search, topic tags, click metrics, polls, webhooks |
| Trend analysis | Cross-platform dashboards | Threads-native trend detection with keyword tracking over time |
| Creator discovery | Not available for Threads | Search public posts by keyword, rank creators by engagement in any niche |
| Competitive intel | Manual profile comparison | Automated competitor tracking with engagement benchmarking |
| Content optimization | Generic best-time-to-post | Threads-specific format analysis (text vs. image vs. carousel vs. poll), topic tag performance, link click tracking |

---

## 2. Threads API — Capabilities & Constraints

**CRITICAL:** ThreadScope is built on the **official Threads API** (`graph.threads.net`). Every feature must map to real, documented API capabilities. This section is the source of truth for what the API can and cannot do.

### 2.1 API Base URL & Authentication

```
Base URL: https://graph.threads.net/v1.0/
Auth: OAuth 2.0 via Instagram authorization flow
Scopes:
  - threads_basic            — Read profile info, user's own threads
  - threads_content_publish  — Publish posts on behalf of user
  - threads_manage_insights  — Access analytics/insights
  - threads_manage_replies   — Manage replies
  - threads_keyword_search   — Search public posts by keyword
  - threads_read_replies     — Read reply trees

Token Types:
  - Short-lived: ~1 hour (from OAuth redirect)
  - Long-lived: ~60 days (exchange via /access_token?grant_type=th_exchange_token)
  - Refresh: Before expiry via /refresh_access_token
```

### 2.2 API Endpoints — What We CAN Do (Official)

**User Profile (Own Account):**
```
GET /me?fields=id,username,threads_profile_picture_url,threads_biography,is_verified
GET /me/threads  — List user's own threads (since/until, limit up to 100, cursor pagination)
GET /me/replies   — List user's own replies
```

**Public Profiles & Posts (Discovery):**
```
GET /{threads-user-id}?fields=id,username,threads_profile_picture_url,threads_biography,is_verified
  — Access public profile information for any user

GET /keyword_search?q={keyword}&access_token={token}
  — Search public posts by keyword
  — Supports: since/until (Unix timestamps) for date range filtering
  — Supports: media_type filter (TEXT, IMAGE, VIDEO, CAROUSEL)
  — Returns: id, text, timestamp, media_type, permalink, username, etc.
  — Rate limited (stricter than other endpoints)
  — Cursor-based pagination
```

**Media/Thread Details:**
```
GET /{threads-media-id}?fields=id,media_product_type,media_type,media_url,
    permalink,owner,username,text,timestamp,shortcode,thumbnail_url,
    children,is_quote_post,has_replies,root_post,replied_to,
    is_reply,hide_status,reply_audience,topic_tag,link_attachment_url
```

**Insights — Media Level (Own Posts):**
```
GET /{threads-media-id}/insights?metric=views,likes,replies,reposts,quotes,shares,clicks
  — views: number of times post was viewed
  — likes: number of likes
  — replies: number of replies
  — reposts: number of reposts
  — quotes: number of quote posts
  — shares: number of shares (added Dec 2024)
  — clicks: number of link clicks (added Jul 2025)
  — All metrics are lifetime totals (except views which can be daily)
```

**Insights — User/Account Level (Own Account):**
```
GET /me/threads_insights?metric=views,likes,replies,reposts,quotes,followers_count,
    follower_demographics
  — since/until parameters (Unix timestamps, data available from April 13, 2024 / 1712991600)
  — follower_demographics requires: min 100 followers, breakdown param (country|city|age|gender)
  — views returns daily totals; others return period totals
```

**Publishing:**
```
POST /{user-id}/threads  — Create media container
  media_type: TEXT | IMAGE | VIDEO | CAROUSEL
  text: post text (500 char limit for text-only)
  image_url / video_url: media URLs
  reply_to_id: for threaded replies
  reply_control: everyone | accounts_you_follow | mentioned_only | parent_post_author_only | followers_only
  poll (added Jul 2025): { options: [...], duration: seconds }
  topic_tag: string
  link_attachment_url: URL to attach
  location_id: for location tagging (added Jul 2025)

POST /{user-id}/threads_publish?creation_id={container-id}  — Publish

Rate limits: 250 posts per 24 hours, 1000 replies per 24 hours
```

**Reply Management:**
```
GET /{threads-media-id}/replies  — Get reply tree
GET /{threads-media-id}/conversation  — Get full conversation
POST /{threads-reply-id}?hide=true  — Hide reply
```

**Webhooks (Real-time):**
```
Supported webhook events:
  - mentions    — When user is mentioned (added Jul 2025)
  - replies     — When someone replies to user's post
  - publish     — When user publishes (added Aug 2025)
  - delete      — When user deletes a post (added Aug 2025)
```

**Embedding:**
```
GET /oembed_thread?url={thread-url}  — Generate embed code
  App-level rate limit: 5 million requests per 24 hours
```

### 2.3 API Constraints — What We CANNOT Do

```
❌ Cannot read another user's follower/following lists
❌ Cannot access DMs or private conversations
❌ Cannot get insights/analytics for other users' posts (only public engagement counts via search)
❌ Cannot get historical data before April 13, 2024
❌ follower_demographics requires 100+ followers
❌ Cannot get exact follower count for other users (only own account)
❌ Keyword search has stricter rate limits than other endpoints
❌ Cannot access any data from private/restricted accounts
❌ No streaming/firehose API — must poll or use webhooks for real-time
```

### 2.4 Data Enrichment Strategy

Since the API has gaps (e.g., can't get other users' analytics), ThreadScope enriches data through:

1. **Keyword Search Aggregation** — Periodically search tracked keywords, aggregate public post data, compute engagement metrics from visible likes/replies/reposts on public posts
2. **Public Post Observation** — When viewing a public post via `GET /{media-id}`, the response includes engagement counts (likes, replies, reposts) that are publicly visible — this is our proxy for "analytics" on competitor posts
3. **User-Connected Accounts** — Users connect their own Threads account via OAuth to get full analytics on their own content
4. **Webhook-Driven Updates** — Real-time notifications for mentions, replies, and publishes keep data fresh without polling
5. **Historical Snapshots** — Periodically snapshot public engagement data to build trend lines over time (our own time-series, not from the API)

---

## 3. Technology Stack

### 3.1 Frontend — Web Application
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui component library
- **Charts/Visualizations:** Recharts for time-series and engagement charts, D3.js for advanced visualizations (network graphs, topic clusters, heatmaps)
- **State Management:** Zustand for client state, TanStack Query (React Query) for server state/caching
- **Forms:** React Hook Form + Zod for validation
- **Tables:** TanStack Table for sortable, filterable, paginated data tables
- **Authentication UI:** NextAuth.js (Auth.js v5) — Threads/Instagram OAuth provider + email/password fallback
- **Real-time:** Server-Sent Events (SSE) for long-running report progress; webhook event stream for live notifications

### 3.2 Frontend — Browser Extension
- **Build Tool:** WXT (Web Extension Tools) — unified cross-browser extension framework
- **UI Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS (scoped via Shadow DOM to avoid threads.net style conflicts)
- **Target Browsers:** Chrome (Manifest V3), Edge (Manifest V3), Firefox (Manifest V2/V3), Safari (Xcode Web Extension converter)
- **Communication:** Chrome Messaging API / `browser.runtime` for content ↔ background communication; REST calls to ThreadScope API from background service worker
- **DOM Parsing:** MutationObserver for Threads' React SPA navigation on threads.net

### 3.3 Backend API
- **Runtime:** Node.js 20+ with Express.js
- **Language:** TypeScript
- **API Style:** tRPC for web app (end-to-end type safety), REST endpoints for extension compatibility
- **Authentication:** JWT access tokens (15 min) + HTTP-only refresh tokens (7 days); API keys for extension
- **Threads API Client:** Custom typed client wrapping `graph.threads.net` with token management, rate limit handling, automatic retry, and cursor pagination helpers
- **Rate Limiting:** express-rate-limit + Redis-backed sliding window
- **Job Queue:** BullMQ (Redis-backed) for async report generation, scheduled data collection, trend computation
- **Caching:** Redis for API response caching (respect rate limits), session storage, and computed metrics cache

### 3.4 Database & Data Layer
- **Primary Database:** PostgreSQL 16 via Prisma ORM
- **Time-Series Data:** TimescaleDB extension for engagement snapshots, trend data, keyword volume tracking
- **Search:** PostgreSQL full-text search (pg_trgm + tsvector) for internal post/creator search
- **File/Export Storage:** S3-compatible object storage for generated report exports (CSV, PDF)

### 3.5 Infrastructure & DevOps
- **Monorepo:** Turborepo with pnpm workspaces
- **Deployment (Phase 1 — Railway):** All services in a single Railway project using private networking:
  - Next.js web app (standalone Docker)
  - Express/tRPC API server
  - BullMQ workers (same Dockerfile, different entrypoint)
  - PostgreSQL (TimescaleDB extension)
  - Redis
- **Deployment (Future — Vercel migration):** Move Next.js frontend to Vercel for edge caching. API/workers/data remain on Railway. Prepared from day one:
  - Next.js with `output: 'standalone'`
  - API calls via configurable `API_URL` env var
  - `next.config.js` rewrites proxy `/api/trpc/*` to API server
  - No Vercel-specific packages until migration
- **CI/CD:** GitHub Actions — lint, type-check, test, build; Railway auto-deploys
- **Monitoring:** Sentry for errors, Railway built-in logging + Axiom/Betterstack
- **Testing:** Vitest (unit), Playwright (E2E), Jest (extension)

---

## 4. Monorepo Structure

```
threadscope/
├── apps/
│   ├── web/                          # Next.js web application
│   │   ├── Dockerfile                # Standalone build for Railway
│   │   ├── railway.toml
│   │   ├── next.config.js            # standalone output + API rewrites
│   │   ├── app/                      # App Router
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   ├── callback/         # OAuth callback from Threads/Instagram
│   │   │   │   └── forgot-password/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx        # Dashboard shell
│   │   │   │   ├── page.tsx          # Dashboard home — overview metrics
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── page.tsx      # Own account analytics (requires connected Threads)
│   │   │   │   │   ├── posts/        # Post-level performance breakdown
│   │   │   │   │   ├── audience/     # Follower demographics
│   │   │   │   │   └── links/        # Link click analytics
│   │   │   │   ├── trends/
│   │   │   │   │   ├── page.tsx      # Keyword/topic trend explorer
│   │   │   │   │   ├── [keyword]/    # Deep dive on specific keyword trend
│   │   │   │   │   └── topics/       # Topic tag analysis
│   │   │   │   ├── discover/
│   │   │   │   │   ├── page.tsx      # Creator/account discovery
│   │   │   │   │   ├── creators/     # Search and rank creators by niche
│   │   │   │   │   └── posts/        # Discover high-performing public posts
│   │   │   │   ├── competitors/
│   │   │   │   │   ├── page.tsx      # Competitor monitoring dashboard
│   │   │   │   │   └── [id]/         # Individual competitor deep dive
│   │   │   │   ├── compose/
│   │   │   │   │   ├── page.tsx      # Smart compose — AI-assisted post creation
│   │   │   │   │   ├── schedule/     # Post scheduling queue
│   │   │   │   │   └── drafts/       # Draft management
│   │   │   │   ├── reports/
│   │   │   │   │   ├── page.tsx      # Report builder + history
│   │   │   │   │   └── [id]/         # Individual report
│   │   │   │   ├── alerts/
│   │   │   │   │   └── page.tsx      # Alert management
│   │   │   │   └── settings/
│   │   │   │       ├── page.tsx      # Account settings
│   │   │   │       ├── billing/
│   │   │   │       ├── connections/   # Threads account connection management
│   │   │   │       ├── api-keys/
│   │   │   │       └── notifications/
│   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   ├── webhooks/         # Threads webhook receiver
│   │   │   │   │   └── threads/
│   │   │   │   ├── health/
│   │   │   │   └── trpc/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui primitives
│   │   │   ├── analytics/            # Engagement charts, metrics cards, sparklines
│   │   │   ├── trends/               # Trend charts, keyword volume graphs, topic clouds
│   │   │   ├── discover/             # Creator cards, post cards, search/filter
│   │   │   ├── competitors/          # Comparison tables, benchmark charts
│   │   │   ├── compose/              # Post editor, preview, scheduling
│   │   │   ├── charts/               # Reusable chart wrappers (Recharts/D3)
│   │   │   ├── filters/              # Date range picker, keyword input, metric selectors
│   │   │   └── layout/               # Sidebar, header, nav
│   │   ├── lib/
│   │   │   ├── threads-client.ts     # Client-side Threads API helpers
│   │   │   └── utils.ts
│   │   ├── styles/
│   │   └── public/
│   │
│   ├── extension/                    # Cross-browser extension (WXT)
│   │   ├── wxt.config.ts
│   │   ├── entrypoints/
│   │   │   ├── background.ts         # Service worker — auth, API calls, caching
│   │   │   ├── content.ts            # Content script — threads.net DOM parsing + overlay
│   │   │   ├── popup/                # Extension popup (mini dashboard)
│   │   │   │   ├── App.tsx
│   │   │   │   └── main.tsx
│   │   │   └── options/              # Extension options page
│   │   │       ├── App.tsx
│   │   │       └── main.tsx
│   │   ├── components/
│   │   │   ├── overlay/
│   │   │   │   ├── OverlayRoot.tsx   # Shadow DOM container
│   │   │   │   ├── PostInsights.tsx  # Inline engagement metrics on posts
│   │   │   │   ├── CreatorCard.tsx   # Quick creator profile + metrics
│   │   │   │   ├── TrendBadge.tsx    # Topic/keyword trend indicator
│   │   │   │   └── QuickActions.tsx  # Track, save, add to report
│   │   │   ├── popup/
│   │   │   └── shared/
│   │   ├── lib/
│   │   │   ├── api.ts               # ThreadScope API client
│   │   │   ├── auth.ts              # Token management
│   │   │   ├── parsers/
│   │   │   │   ├── threads-feed.ts   # Feed/timeline post parser
│   │   │   │   ├── threads-post.ts   # Individual post detail parser
│   │   │   │   ├── threads-profile.ts # Profile page parser
│   │   │   │   └── threads-search.ts  # Search results parser
│   │   │   ├── observer.ts           # MutationObserver for SPA navigation
│   │   │   ├── storage.ts
│   │   │   └── messaging.ts
│   │   ├── assets/
│   │   └── public/icons/
│   │
│   └── api/                          # Backend API server
│       ├── Dockerfile
│       ├── railway.toml
│       ├── src/
│       │   ├── server.ts             # Express/tRPC server entry
│       │   ├── worker.ts             # BullMQ worker entry
│       │   ├── router/               # tRPC routers
│       │   │   ├── auth.ts
│       │   │   ├── analytics.ts      # Own-account analytics
│       │   │   ├── trends.ts         # Keyword/topic trend data
│       │   │   ├── discover.ts       # Creator/post discovery
│       │   │   ├── competitors.ts    # Competitor tracking
│       │   │   ├── compose.ts        # Publishing & scheduling
│       │   │   ├── reports.ts        # Report generation
│       │   │   ├── alerts.ts         # Alert management
│       │   │   ├── webhooks.ts       # Webhook processing
│       │   │   └── extension.ts      # Extension-specific endpoints
│       │   ├── services/
│       │   │   ├── threads-api.service.ts     # Core Threads API client (graph.threads.net)
│       │   │   ├── analytics.service.ts       # Own-account analytics computation
│       │   │   ├── trend.service.ts           # Keyword volume tracking, trend detection
│       │   │   ├── discovery.service.ts       # Creator ranking, post discovery
│       │   │   ├── competitor.service.ts      # Competitor monitoring & benchmarking
│       │   │   ├── compose.service.ts         # Post creation, scheduling
│       │   │   ├── report.service.ts          # Report generation
│       │   │   ├── alert.service.ts           # Alert evaluation & notification
│       │   │   ├── snapshot.service.ts        # Periodic engagement data snapshots
│       │   │   └── export.service.ts          # CSV/PDF generation
│       │   ├── jobs/
│       │   │   ├── trend-collection.job.ts    # Scheduled keyword search data pulls
│       │   │   ├── competitor-snapshot.job.ts  # Periodic competitor data collection
│       │   │   ├── engagement-snapshot.job.ts  # Snapshot engagement for tracked posts/creators
│       │   │   ├── report-generation.job.ts
│       │   │   ├── alert-evaluation.job.ts
│       │   │   └── token-refresh.job.ts       # Refresh long-lived tokens before expiry
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   ├── cors.ts
│       │   │   ├── rate-limit.ts
│       │   │   └── validate.ts
│       │   ├── lib/
│       │   │   ├── db.ts             # Prisma client
│       │   │   ├── redis.ts
│       │   │   ├── queue.ts          # BullMQ setup
│       │   │   ├── threads-client.ts # Typed Threads API HTTP client
│       │   │   └── s3.ts
│       │   └── types/
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── packages/
│   ├── shared/                       # Shared types, constants, utilities
│   │   ├── types/
│   │   │   ├── threads-api.ts        # Threads API request/response types
│   │   │   ├── analytics.ts
│   │   │   ├── trends.ts
│   │   │   ├── discovery.ts
│   │   │   ├── competitors.ts
│   │   │   ├── compose.ts
│   │   │   ├── reports.ts
│   │   │   └── alerts.ts
│   │   ├── constants/
│   │   │   ├── threads.ts            # API URLs, scopes, rate limits, media types
│   │   │   ├── metrics.ts            # Metric definitions and labels
│   │   │   └── topic-tags.ts         # Known topic tags
│   │   ├── utils/
│   │   │   ├── formatting.ts         # Number abbreviation, date formatting
│   │   │   ├── engagement.ts         # Engagement rate calculation helpers
│   │   │   └── validation.ts         # Shared Zod schemas
│   │   └── index.ts
│   │
│   ├── ui/                           # Shared UI components (web + extension)
│   │   ├── components/
│   │   │   ├── EngagementRate.tsx     # Engagement rate display with visual indicator
│   │   │   ├── MetricCard.tsx        # Stat card with sparkline
│   │   │   ├── VerifiedBadge.tsx     # Threads verified badge
│   │   │   ├── PostPreview.tsx       # Compact post preview (text + metrics)
│   │   │   ├── CreatorAvatar.tsx     # Profile pic + username + verified
│   │   │   ├── TrendDirection.tsx    # Up/down/flat trend arrow with percentage
│   │   │   ├── MediaTypeBadge.tsx    # TEXT / IMAGE / VIDEO / CAROUSEL badge
│   │   │   └── TimeAgo.tsx           # Relative time display
│   │   └── index.ts
│   │
│   └── eslint-config/
│
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 5. Database Schema (Prisma)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pg_trgm]
}

// ==================== AUTH & USERS ====================

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String?
  name            String?
  avatarUrl       String?
  emailVerified   DateTime?
  plan            Plan      @default(FREE)
  stripeCustomerId String?  @unique
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  accounts        Account[]
  sessions        Session[]
  apiKeys         ApiKey[]
  threadsConnection ThreadsConnection?
  trackedKeywords TrackedKeyword[]
  trackedCreators TrackedCreator[]
  trackedPosts    TrackedPost[]
  competitors     Competitor[]
  reports         Report[]
  alerts          Alert[]
  scheduledPosts  ScheduledPost[]
  exportJobs      ExportJob[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String    // "threads", "google", "credentials"
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ApiKey {
  id          String   @id @default(cuid())
  userId      String
  name        String
  keyHash     String   @unique   // SHA-256 hashed
  keyPrefix   String             // First 8 chars for identification
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum Plan {
  FREE
  STARTER
  PRO
  ENTERPRISE
}

// ==================== THREADS CONNECTION ====================

// User connects their Threads account via OAuth for own-account analytics
model ThreadsConnection {
  id                 String   @id @default(cuid())
  userId             String   @unique
  threadsUserId      String   @unique  // Threads user ID from API
  username           String
  profilePictureUrl  String?
  biography          String?
  isVerified         Boolean  @default(false)
  accessToken        String              // Encrypted, long-lived token
  tokenExpiresAt     DateTime
  scopes             String[]
  lastSyncAt         DateTime?
  connectedAt        DateTime @default(now())
  updatedAt          DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ==================== OWN-ACCOUNT ANALYTICS ====================

// Snapshot of user's account-level metrics over time
model AccountInsightsSnapshot {
  id                 String   @id @default(cuid())
  threadsUserId      String
  date               DateTime @db.Date   // One snapshot per day
  views              Int?
  likes              Int?
  replies            Int?
  reposts            Int?
  quotes             Int?
  followersCount     Int?
  // Demographics snapshot (JSON for flexibility)
  followersByCountry Json?    // { "US": 1200, "UK": 500, ... }
  followersByCity    Json?
  followersByAge     Json?    // { "18-24": 300, "25-34": 500, ... }
  followersByGender  Json?    // { "M": 600, "F": 400, ... }

  @@unique([threadsUserId, date])
  @@index([threadsUserId, date(sort: Desc)])
}

// User's own post analytics (full insights from API)
model PostInsight {
  id              String   @id @default(cuid())
  threadsMediaId  String   @unique  // Threads media ID
  threadsUserId   String             // Owner's Threads user ID
  text            String?
  mediaType       MediaType
  permalink       String?
  topicTag        String?
  publishedAt     DateTime
  // Lifetime metrics (updated periodically)
  views           Int      @default(0)
  likes           Int      @default(0)
  replies         Int      @default(0)
  reposts         Int      @default(0)
  quotes          Int      @default(0)
  shares          Int      @default(0)
  clicks          Int      @default(0)   // Link clicks
  // Computed
  engagementRate  Float?                  // (likes+replies+reposts+quotes) / views
  lastSyncAt      DateTime @default(now())
  createdAt       DateTime @default(now())

  snapshots PostInsightSnapshot[]

  @@index([threadsUserId, publishedAt(sort: Desc)])
  @@index([topicTag])
  @@index([engagementRate(sort: Desc)])
}

// Time-series snapshots of post engagement (for growth curves)
model PostInsightSnapshot {
  id             String   @id @default(cuid())
  postInsightId  String
  views          Int
  likes          Int
  replies        Int
  reposts        Int
  quotes         Int
  shares         Int
  clicks         Int
  capturedAt     DateTime @default(now())

  postInsight PostInsight @relation(fields: [postInsightId], references: [id], onDelete: Cascade)

  @@index([postInsightId, capturedAt(sort: Desc)])
}

enum MediaType {
  TEXT
  IMAGE
  VIDEO
  CAROUSEL
}

// ==================== TREND TRACKING ====================

// Keywords the user is actively tracking for trend analysis
model TrackedKeyword {
  id          String           @id @default(cuid())
  userId      String
  keyword     String
  isActive    Boolean          @default(true)
  createdAt   DateTime         @default(now())

  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  dataPoints  KeywordTrendData[]
  alerts      Alert[]

  @@unique([userId, keyword])
  @@index([userId, isActive])
}

// Aggregated keyword search results over time (computed from periodic API searches)
model KeywordTrendData {
  id               String   @id @default(cuid())
  trackedKeywordId String
  date             DateTime @db.Date
  postCount        Int                // Number of public posts found
  totalLikes       Int      @default(0)
  totalReplies     Int      @default(0)
  totalReposts     Int      @default(0)
  avgEngagement    Float?             // Average engagement per post
  topPostId        String?            // Highest-engagement post ID
  topCreatorId     String?            // Most active creator for this keyword
  sampleSize       Int      @default(0) // How many posts were sampled

  trackedKeyword TrackedKeyword @relation(fields: [trackedKeywordId], references: [id], onDelete: Cascade)

  @@unique([trackedKeywordId, date])
  @@index([trackedKeywordId, date(sort: Desc)])
}

// ==================== CREATOR / ACCOUNT DISCOVERY ====================

// Public Threads creators we've observed (from search results, competitor tracking, etc.)
model Creator {
  id                 String   @id @default(cuid())
  threadsUserId      String   @unique
  username           String
  profilePictureUrl  String?
  biography          String?
  isVerified         Boolean  @default(false)
  // Computed metrics (from observing their public posts)
  observedPostCount  Int      @default(0)
  avgLikes           Float?
  avgReplies         Float?
  avgReposts         Float?
  avgEngagement      Float?             // Avg engagement rate across observed posts
  primaryTopics      String[]           // Most common topic tags
  postFrequency      String?            // "DAILY", "SEVERAL_DAILY", "WEEKLY", "IRREGULAR"
  lastPostAt         DateTime?
  firstSeenAt        DateTime @default(now())
  lastSeenAt         DateTime @default(now())
  updatedAt          DateTime @updatedAt

  snapshots    CreatorSnapshot[]
  trackedBy    TrackedCreator[]
  competitors  Competitor[]
  publicPosts  PublicPost[]
}

// Time-series snapshots of creator metrics
model CreatorSnapshot {
  id               String   @id @default(cuid())
  creatorId        String
  observedPosts    Int
  avgLikes         Float?
  avgReplies       Float?
  avgReposts       Float?
  avgEngagement    Float?
  capturedAt       DateTime @default(now())

  creator Creator @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  @@index([creatorId, capturedAt(sort: Desc)])
}

model TrackedCreator {
  id        String   @id @default(cuid())
  userId    String
  creatorId String
  notes     String?
  tags      String[]
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  creator Creator @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  @@unique([userId, creatorId])
}

// ==================== PUBLIC POSTS ====================

// Public posts discovered through keyword search or competitor/creator tracking
model PublicPost {
  id              String    @id @default(cuid())
  threadsMediaId  String    @unique
  creatorId       String?
  username        String
  text            String?
  mediaType       MediaType
  permalink       String?
  topicTag        String?
  publishedAt     DateTime
  // Public engagement counts (visible on the post)
  likes           Int       @default(0)
  replies         Int       @default(0)
  reposts         Int       @default(0)
  isQuotePost     Boolean   @default(false)
  // Tracking
  discoveredVia   String?   // "keyword_search", "creator_tracking", "competitor_monitoring"
  discoveryKeyword String?  // Which keyword search found this
  firstSeenAt     DateTime  @default(now())
  lastSeenAt      DateTime  @default(now())

  creator  Creator?   @relation(fields: [creatorId], references: [id])
  trackedBy TrackedPost[]
  snapshots PublicPostSnapshot[]

  @@index([username])
  @@index([publishedAt(sort: Desc)])
  @@index([topicTag])
  @@index([discoveryKeyword])
}

// Engagement snapshots for tracked public posts
model PublicPostSnapshot {
  id           String   @id @default(cuid())
  publicPostId String
  likes        Int
  replies      Int
  reposts      Int
  capturedAt   DateTime @default(now())

  publicPost PublicPost @relation(fields: [publicPostId], references: [id], onDelete: Cascade)

  @@index([publicPostId, capturedAt(sort: Desc)])
}

model TrackedPost {
  id           String   @id @default(cuid())
  userId       String
  publicPostId String
  notes        String?
  createdAt    DateTime @default(now())

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  publicPost PublicPost @relation(fields: [publicPostId], references: [id], onDelete: Cascade)

  @@unique([userId, publicPostId])
}

// ==================== COMPETITORS ====================

model Competitor {
  id        String   @id @default(cuid())
  userId    String
  creatorId String
  label     String?            // Custom label ("Main Competitor", "Industry Leader")
  notes     String?
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  creator Creator @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  @@unique([userId, creatorId])
}

// ==================== COMPOSE & SCHEDULING ====================

model ScheduledPost {
  id            String          @id @default(cuid())
  userId        String
  text          String
  mediaType     MediaType       @default(TEXT)
  mediaUrls     String[]
  replyToId     String?
  replyControl  String?
  topicTag      String?
  pollOptions   String[]
  pollDuration  Int?            // seconds
  linkUrl       String?
  scheduledFor  DateTime
  status        ScheduleStatus  @default(PENDING)
  threadsMediaId String?        // Set after successful publish
  errorMessage  String?
  createdAt     DateTime        @default(now())
  publishedAt   DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, scheduledFor])
  @@index([status, scheduledFor])
}

enum ScheduleStatus {
  PENDING
  PUBLISHING
  PUBLISHED
  FAILED
  CANCELLED
}

// ==================== REPORTS ====================

model Report {
  id             String       @id @default(cuid())
  userId         String
  name           String
  type           ReportType
  parameters     Json         // Report configuration
  status         ReportStatus @default(QUEUED)
  resultSummary  Json?
  resultData     Json?        // Full result payload
  resultCount    Int?
  processingTime Int?         // ms
  errorMessage   String?
  createdAt      DateTime     @default(now())
  completedAt    DateTime?

  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  exportJobs ExportJob[]

  @@index([userId, createdAt(sort: Desc)])
}

enum ReportType {
  ACCOUNT_PERFORMANCE     // Own account performance over time period
  POST_PERFORMANCE        // Own post-level analytics
  KEYWORD_TREND           // Trend data for tracked keywords
  CREATOR_DISCOVERY       // Find top creators for a keyword/topic
  COMPETITOR_BENCHMARK    // Compare own metrics vs. competitors
  CONTENT_ANALYSIS        // What content types/topics perform best
  AUDIENCE_INSIGHTS       // Follower demographics and growth
  TOPIC_LANDSCAPE         // Overview of a topic/niche on Threads
}

enum ReportStatus {
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

// ==================== ALERTS ====================

model Alert {
  id               String     @id @default(cuid())
  userId           String
  trackedKeywordId String?
  type             AlertType
  condition        Json       // { "threshold": 100, "metric": "postCount", "direction": "above" }
  channels         String[]   // ["email", "push", "extension"]
  isActive         Boolean    @default(true)
  lastTriggered    DateTime?
  triggerCount     Int        @default(0)
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  trackedKeyword TrackedKeyword? @relation(fields: [trackedKeywordId], references: [id])
}

enum AlertType {
  KEYWORD_SPIKE        // Keyword mentions spike above threshold
  KEYWORD_TREND_CHANGE // Keyword trend direction changes (up/down)
  MENTION_ALERT        // User is mentioned (via webhook)
  COMPETITOR_POST      // Tracked competitor posts (from snapshot)
  ENGAGEMENT_MILESTONE // Own post hits engagement threshold
  FOLLOWER_MILESTONE   // Own account hits follower milestone
}

// ==================== EXPORTS ====================

model ExportJob {
  id         String       @id @default(cuid())
  userId     String
  reportId   String
  format     ExportFormat
  status     ReportStatus @default(QUEUED)
  fileUrl    String?
  fileSize   Int?
  createdAt  DateTime     @default(now())
  expiresAt  DateTime?

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  report Report @relation(fields: [reportId], references: [id], onDelete: Cascade)
}

enum ExportFormat {
  CSV
  XLSX
  PDF
  JSON
}
```

---

## 6. Feature Specifications

### 6.1 Authentication & Threads Connection

**App Authentication:** Standard email/password + Google OAuth via NextAuth.js.

**Threads Account Connection:** Users connect their Threads account to unlock own-account analytics. Flow:
1. User clicks "Connect Threads Account"
2. Redirect to Instagram OAuth: `https://api.instagram.com/oauth/authorize?client_id={app-id}&redirect_uri={uri}&scope=threads_basic,threads_content_publish,threads_manage_insights,threads_manage_replies,threads_keyword_search,threads_read_replies&response_type=code`
3. Exchange code for short-lived token → exchange for long-lived token (60 days)
4. Store encrypted token in `ThreadsConnection`
5. BullMQ job schedules token refresh before expiry
6. Initial sync pulls profile info + recent posts + insights

**Plan-Based Feature Gating:**

| Feature                   | Free  | Starter ($19/mo) | Pro ($49/mo) | Enterprise |
|---------------------------|-------|-------------------|--------------|------------|
| Connected Threads accounts | 1     | 3                 | 10           | Unlimited  |
| Tracked keywords          | 3     | 25                | 100          | Unlimited  |
| Tracked creators          | 5     | 50                | 500          | Unlimited  |
| Competitors               | 2     | 10                | 50           | Unlimited  |
| Scheduled posts           | 10/mo | 100/mo            | 1,000/mo     | Unlimited  |
| Reports per month         | 5     | 50                | 500          | Unlimited  |
| Data history retention    | 30 days | 6 months         | 2 years      | Unlimited  |
| Post insights sync freq   | Daily | Every 4 hours     | Hourly       | Real-time (webhooks) |
| Keyword trend collection  | Daily | Every 6 hours     | Hourly       | Hourly     |
| Export formats            | CSV   | CSV, JSON         | All          | All + API  |
| Browser extension         | Basic | Full              | Full         | Full       |
| API access                | —     | —                 | Read-only    | Full       |

### 6.2 Own-Account Analytics (Requires Connected Threads)

The core analytics dashboard for users who have connected their Threads account.

**Overview Dashboard:**
- Follower count + growth trend sparkline (daily snapshots)
- Total views, likes, replies, reposts, quotes, shares for selected date range
- Engagement rate trend (rolling 7-day and 30-day)
- Best performing post of the period (by engagement rate)
- Posting frequency chart (posts per day/week)
- Quick comparison: this week vs. last week for all key metrics

**Post Performance:**
- Paginated table of all posts with sortable columns: date, text preview, media type, views, likes, replies, reposts, quotes, shares, clicks, engagement rate
- Click any post to expand full detail + engagement growth curve (from snapshots)
- Filter by: date range, media type (TEXT/IMAGE/VIDEO/CAROUSEL), topic tag, min engagement
- Content format breakdown: bar chart showing avg engagement by media type
- Best time to post: heatmap of engagement by day-of-week × hour-of-day

**Audience Insights (requires 100+ followers):**
- Follower demographics: country, city, age bracket, gender — each as pie/bar chart
- Follower growth over time (daily from snapshots)
- Geographic distribution map

**Link Performance (for posts with URLs):**
- Click-through rate per post
- Top performing links by clicks
- Link click trend over time

### 6.3 Trend Explorer

The trend engine — ThreadScope's core differentiator. Built on the keyword search API.

**How it works:**
1. User adds keywords to track (e.g., "AI agents", "startup funding", "react native")
2. BullMQ job runs periodic keyword searches via `GET /keyword_search?q={keyword}&since={timestamp}&until={timestamp}`
3. For each batch of results, aggregate: post count, total engagement, avg engagement, top posts, most active creators
4. Store as `KeywordTrendData` (one row per keyword per day/period)
5. Over time, this builds trend lines showing keyword volume and engagement

**Trend Dashboard:**
- Line chart: keyword mention volume over time (daily/weekly resolution)
- Multi-keyword overlay: compare up to 5 keywords on same chart
- Engagement quality indicator: is engagement going up even if volume is flat?
- Top posts for each keyword in the selected period
- Top creators driving conversation for each keyword
- Topic tag distribution: which topic tags are being used with this keyword
- Media type breakdown: are people posting text, images, or video about this topic?

**Topic Landscape:**
- Enter a broad topic → ThreadScope searches multiple related keywords
- Visualization: topic cluster showing related keywords and their relative volumes
- Emerging vs. declining subtopics
- Key voices: who's driving each subtopic

### 6.4 Creator Discovery

Find and analyze public Threads creators in any niche.

**Search & Filter:**
- Search by keyword → find creators who post about that topic (aggregated from keyword_search results)
- Filter by: minimum engagement rate, minimum post count, verified status, posting frequency
- Sort by: avg engagement, post frequency, total observed engagement

**Creator Profile (Public Data):**
- Username, profile picture, bio, verified status
- Observed post history (posts we've captured from searches)
- Engagement metrics computed from public data: avg likes, avg replies, avg reposts per post
- Activity chart: posting frequency over time
- Topic focus: what topics/keywords they post about most
- Best performing posts (by visible engagement)
- Content style analysis: % text-only vs. image vs. video vs. carousel

### 6.5 Competitor Monitoring

Track other Threads accounts and benchmark against your own performance.

**Setup:** Add competitors by Threads username → ThreadScope looks them up, starts tracking.

**Competitor Dashboard:**
- Side-by-side comparison table: you vs. each competitor across key metrics
- Engagement rate benchmark: your avg vs. competitor avg (from public post data)
- Posting frequency comparison
- Content mix comparison (what % of each competitor's posts are text vs. image vs. video)
- Topic overlap analysis: which keywords/topics do you and competitors both post about?
- Alert when competitor posts about a keyword you're tracking

### 6.6 Smart Compose & Scheduling

Publish and schedule posts to Threads directly from ThreadScope.

**Compose:**
- Rich post editor with character count (500 max for text)
- Media attachment: image, video, or carousel (up to 20 items)
- Poll creation: options + duration
- Topic tag selector (suggest from trending/tracked)
- Reply control: everyone / followers / mentioned only
- Link attachment with preview
- Location tagging
- Post preview (mimics Threads UI)
- "Best time to post" suggestion based on own analytics

**Scheduling:**
- Date/time picker for future publishing
- Queue view: see all scheduled posts in chronological order
- Edit or cancel pending posts
- After publish: track performance in real-time via post insights

**Publishing Flow (API):**
```
1. POST /{user-id}/threads → Create container (returns creation_id)
2. Poll GET /{creation_id}?fields=status until status=FINISHED
3. POST /{user-id}/threads_publish?creation_id={id} → Publish
4. Store resulting media_id → begin tracking insights
```

### 6.7 Reports

Pre-built and custom report types:

1. **Account Performance** — Full analytics summary for own account over a date range
2. **Post Performance** — Detailed breakdown of all posts with metrics, sorted by engagement
3. **Keyword Trend** — Volume and engagement data for tracked keywords over time
4. **Creator Discovery** — Top creators for a keyword/topic with engagement metrics
5. **Competitor Benchmark** — Your performance vs. competitors across all tracked metrics
6. **Content Analysis** — What content types, posting times, topic tags correlate with high engagement
7. **Audience Insights** — Follower demographics and growth analysis
8. **Topic Landscape** — Overview of a topic/niche: volume, key voices, subtopics, trend direction

Reports are generated asynchronously via BullMQ with SSE progress streaming.

### 6.8 Alerts

- **Keyword Spike** — Keyword mention volume exceeds threshold (e.g., "AI agents" gets 2x normal volume)
- **Keyword Trend Change** — A tracked keyword's trend reverses (rising → falling or vice versa)
- **Mention Alert** — User is mentioned on Threads (via webhook)
- **Competitor Post** — A tracked competitor publishes a new post
- **Engagement Milestone** — Own post passes engagement threshold (e.g., 1000 views)
- **Follower Milestone** — Own account hits follower milestone (e.g., 10K)

Delivery channels: email, push notification, in-extension badge.

### 6.9 Browser Extension

**Content Script (threads.net):**
- Detect page type via URL pattern:
  - `threads.net` — Home feed
  - `threads.net/@{username}` — Profile page
  - `threads.net/@{username}/post/{id}` — Individual post
  - `threads.net/search?q={query}` — Search results
  - `threads.net/topic/{tag}` — Topic page
- Use MutationObserver to detect SPA navigation and content loading
- Parse DOM for post data (text, engagement counts, username, media type)

**Overlay Panels:**

1. **Post Insights Overlay** (on individual posts in feed or post detail):
   - If own post: show full analytics (views, likes, replies, reposts, quotes, shares, clicks, engagement rate)
   - If public post: show tracked metrics if we have data, otherwise show "Track this post" action
   - Quick engagement rate calculation from visible counts

2. **Creator Quick Card** (hovering on profile or clicking username):
   - If tracked: show avg engagement, post frequency, topic focus, trend direction
   - If not tracked: show "Add to tracked creators" action

3. **Search Enhancement** (on search results pages):
   - Show keyword trend indicator ("📈 Trending up 45% this week")
   - Aggregate stats for the search results ("Avg engagement: 234 likes per post")

4. **Floating Widget** (persistent):
   - Notification badge for alerts
   - Quick compose shortcut
   - Quick link to dashboard

**Extension Popup:**
- If not logged in: login/API key form
- If logged in: mini dashboard — today's views, follower change, active alerts, upcoming scheduled posts

---

## 7. API Endpoint Design

### 7.1 tRPC Routers (Web App)

```typescript
// auth.router
auth.register           // POST: email, password
auth.login              // POST: email, password → JWT + refresh token
auth.refreshToken       // POST: refresh token → new JWT
auth.getApiKeys         // GET: list API keys
auth.createApiKey       // POST: name → key (shown once)
auth.deleteApiKey       // DELETE: keyId
auth.connectThreads     // GET: → OAuth URL redirect
auth.threadsCallback    // GET: code → exchange for token, save connection
auth.disconnectThreads  // POST: → revoke token, delete connection

// analytics.router (requires connected Threads account)
analytics.getOverview        // GET: dateRange → overview metrics
analytics.getPostPerformance // GET: dateRange, filters, pagination → post list with metrics
analytics.getPostDetail      // GET: postInsightId → full post detail + engagement curve
analytics.getAudienceInsights // GET: → demographics data
analytics.getLinkPerformance // GET: dateRange → link click data
analytics.getBestTimes       // GET: → day×hour engagement heatmap
analytics.getFormatBreakdown // GET: → engagement by media type
analytics.syncNow            // POST: → trigger immediate data sync

// trends.router
trends.getTrackedKeywords    // GET: → user's tracked keywords with latest data
trends.addKeyword            // POST: keyword → create TrackedKeyword + initial data pull
trends.removeKeyword         // DELETE: keywordId
trends.getKeywordTrend       // GET: keywordId, dateRange → time-series data
trends.compareKeywords       // GET: keywordIds[], dateRange → multi-keyword overlay data
trends.getTopPosts           // GET: keyword, dateRange → highest engagement posts
trends.getTopCreators        // GET: keyword, dateRange → most active/engaged creators
trends.getTopicLandscape     // GET: keyword → related subtopics, volume, key voices
trends.searchPublicPosts     // GET: keyword, dateRange, mediaType? → live keyword search results

// discover.router
discover.searchCreators      // GET: keyword, filters → ranked creator list
discover.getCreatorProfile   // GET: creatorId → full public profile + metrics
discover.getCreatorPosts     // GET: creatorId, pagination → their observed posts
discover.trackCreator        // POST: creatorId
discover.untrackCreator      // DELETE: creatorId
discover.listTrackedCreators // GET: → user's tracked creators with latest metrics

// competitors.router
competitors.add              // POST: username → look up + create Competitor
competitors.remove           // DELETE: competitorId
competitors.list             // GET: → user's competitors with metrics
competitors.getBenchmark     // GET: dateRange → you vs. competitors comparison data
competitors.getDetail        // GET: competitorId → individual competitor deep dive

// compose.router
compose.createPost           // POST: text, mediaType, mediaUrls?, poll?, topicTag?, etc. → publish immediately
compose.schedulePost         // POST: same + scheduledFor → create ScheduledPost
compose.listScheduled        // GET: → upcoming scheduled posts
compose.updateScheduled      // PATCH: scheduledPostId → update content or time
compose.cancelScheduled      // DELETE: scheduledPostId
compose.getDrafts            // GET: → drafts (stored client-side or in DB)
compose.getBestTimeToPost    // GET: → recommended posting times

// reports.router
reports.create               // POST: type, parameters → report (QUEUED)
reports.get                  // GET: reportId → report with data
reports.list                 // GET: paginated, filterable
reports.cancel               // POST: reportId
reports.delete               // DELETE: reportId
reports.getProgress          // GET (SSE): reportId → real-time progress
reports.export               // POST: reportId, format → export job

// alerts.router
alerts.create                // POST: type, condition, channels
alerts.list                  // GET: user's alerts
alerts.update                // PATCH: alertId
alerts.delete                // DELETE: alertId
alerts.toggle                // PATCH: alertId, isActive
alerts.getHistory            // GET: alertId → past trigger events
```

### 7.2 REST Endpoints (Extension)

Prefixed with `/api/v1/ext/`, authenticated via `X-API-Key` header.

```
GET    /api/v1/ext/me                            → Validate key + user info + plan
GET    /api/v1/ext/post/:threadsMediaId           → Post data + analytics if available
POST   /api/v1/ext/post/batch                     → Batch lookup for multiple posts
POST   /api/v1/ext/post/ingest                    → Extension pushes parsed post data
GET    /api/v1/ext/creator/:username              → Creator metrics if tracked
GET    /api/v1/ext/keyword/:keyword/trend         → Quick trend summary for keyword
GET    /api/v1/ext/notifications                  → Pending alerts/notifications
POST   /api/v1/ext/track/creator                  → Track a creator
POST   /api/v1/ext/track/post                     → Track a post
GET    /api/v1/ext/scheduled                      → Upcoming scheduled posts
```

---

## 8. Threads API Client (Core Service)

The typed Threads API client is a critical piece of infrastructure. It wraps `graph.threads.net` with:

```typescript
// apps/api/src/lib/threads-client.ts

class ThreadsApiClient {
  private baseUrl = 'https://graph.threads.net/v1.0';

  constructor(private accessToken: string) {}

  // Token management
  static async exchangeForLongLived(shortLivedToken: string, clientSecret: string): Promise<TokenResponse>;
  static async refreshToken(token: string): Promise<TokenResponse>;

  // Profile
  async getMyProfile(fields?: string[]): Promise<ThreadsProfile>;
  async getPublicProfile(userId: string, fields?: string[]): Promise<ThreadsProfile>;

  // Threads (own)
  async getMyThreads(params?: { since?: number; until?: number; limit?: number; after?: string }): Promise<PaginatedResponse<ThreadsMedia>>;
  async getMyReplies(params?: PaginationParams): Promise<PaginatedResponse<ThreadsMedia>>;

  // Media details
  async getMedia(mediaId: string, fields?: string[]): Promise<ThreadsMedia>;
  async getMediaInsights(mediaId: string, metrics: string[]): Promise<MediaInsights>;

  // User insights
  async getUserInsights(params: { metric: string[]; since?: number; until?: number }): Promise<UserInsights>;

  // Search
  async keywordSearch(params: {
    q: string;
    since?: number;
    until?: number;
    media_type?: MediaType;
    after?: string;
  }): Promise<PaginatedResponse<ThreadsMedia>>;

  // Publishing
  async createContainer(params: CreateContainerParams): Promise<{ id: string }>;
  async getContainerStatus(containerId: string): Promise<ContainerStatus>;
  async publish(userId: string, creationId: string): Promise<{ id: string }>;

  // Replies
  async getReplies(mediaId: string): Promise<PaginatedResponse<ThreadsMedia>>;
  async getConversation(mediaId: string): Promise<PaginatedResponse<ThreadsMedia>>;
  async hideReply(replyId: string, hide: boolean): Promise<void>;

  // Rate limit handling
  private async request<T>(endpoint: string, options?: RequestOptions): Promise<T>;
  // Implements: retry with exponential backoff, rate limit detection, cursor pagination helper
}

// Auto-paginate helper
async function* paginateAll<T>(
  fetcher: (cursor?: string) => Promise<PaginatedResponse<T>>
): AsyncGenerator<T> { /* yields all items across pages */ }
```

---

## 9. Scheduled Jobs (BullMQ)

| Job | Schedule | Description |
|-----|----------|-------------|
| `sync-own-analytics` | Per plan (hourly–daily) | Sync connected user's posts + insights from Threads API |
| `account-snapshot` | Daily at 2am UTC | Snapshot account-level metrics (followers, views, etc.) |
| `keyword-trend-collection` | Per plan (hourly–daily) | Run keyword searches for all active tracked keywords, aggregate results |
| `competitor-snapshot` | Every 6 hours | Fetch latest public posts for all tracked competitors, snapshot engagement |
| `engagement-snapshot` | Every 4 hours | Snapshot engagement for tracked public posts (price history equivalent) |
| `scheduled-post-publisher` | Every minute | Check for posts due to publish, execute publishing flow |
| `alert-evaluation` | After each data collection job | Evaluate alert conditions against fresh data |
| `token-refresh` | Daily | Check all connected accounts, refresh tokens expiring within 7 days |
| `report-generation` | On demand (queued) | Process queued reports asynchronously |
| `data-cleanup` | Daily at 3am UTC | Remove expired data per plan retention limits |

---

## 10. Railway Deployment Architecture

### 10.1 Railway Project Layout

```
Railway Project: threadscope
├── Service: web            # Next.js frontend
│   ├── Port: 3000
│   ├── Public: app.threadscope.com
│   ├── Private: web.railway.internal
│   └── Health: /api/health
│
├── Service: api            # Express + tRPC + REST
│   ├── Port: 4000
│   ├── Public: api.threadscope.com
│   ├── Private: api.railway.internal
│   └── Health: /health
│
├── Service: worker         # BullMQ job processor
│   ├── Entrypoint: worker.ts
│   └── No public domain
│
├── PostgreSQL (TimescaleDB)
│   └── ${{Postgres.DATABASE_URL}}
│
└── Redis
    └── ${{Redis.REDIS_URL}}
```

### 10.2 Docker Compose (Local Development)

```yaml
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb-ha:pg16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: threadscope
      POSTGRES_PASSWORD: localdev
      POSTGRES_DB: threadscope
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://threadscope:localdev@postgres:5432/threadscope
      REDIS_URL: redis://redis:6379
      JWT_SECRET: local-dev-jwt-secret-min-32-characters-long
      JWT_REFRESH_SECRET: local-dev-refresh-secret-min-32-characters
      PORT: 4000
      NODE_ENV: development
      THREADS_APP_ID: ${THREADS_APP_ID}
      THREADS_APP_SECRET: ${THREADS_APP_SECRET}
    depends_on:
      - postgres
      - redis

  worker:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    command: ["node", "dist/worker.js"]
    environment:
      DATABASE_URL: postgresql://threadscope:localdev@postgres:5432/threadscope
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
      THREADS_APP_ID: ${THREADS_APP_ID}
      THREADS_APP_SECRET: ${THREADS_APP_SECRET}
    depends_on:
      - postgres
      - redis

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:3000"
    environment:
      API_URL: http://api:4000
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: local-dev-nextauth-secret
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

### 10.3 Environment Variables

**Railway shared:**
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=<generate>
JWT_REFRESH_SECRET=<generate>
NODE_ENV=production
THREADS_APP_ID=<from-meta-developer-dashboard>
THREADS_APP_SECRET=<from-meta-developer-dashboard>
```

**Web service:**
```env
API_URL=http://api.railway.internal:4000
NEXTAUTH_URL=https://app.threadscope.com
NEXTAUTH_SECRET=<generate>
NEXT_PUBLIC_APP_URL=https://app.threadscope.com
NEXT_PUBLIC_API_URL=https://api.threadscope.com
```

**API service:**
```env
PORT=4000
CORS_ORIGINS=https://app.threadscope.com,chrome-extension://*
THREADS_OAUTH_REDIRECT_URI=https://api.threadscope.com/auth/threads/callback
ENCRYPTION_KEY=<for-encrypting-stored-tokens>
```

**Worker service:**
```env
WORKER_CONCURRENCY=5
```

---

## 11. Implementation Phases

### Phase 1 — Foundation (Weeks 1–3)
1. Initialize Turborepo monorepo with all workspace packages
2. Create Dockerfiles for web + API; create `docker-compose.yml` with TimescaleDB + Redis
3. Set up Prisma schema with all models, run migrations
4. Build authentication system (register, login, JWT, refresh tokens, API keys)
5. Build Threads OAuth connection flow (redirect → callback → token exchange → store)
6. Implement `ThreadsApiClient` with token management, rate limiting, pagination
7. Create Next.js web app shell: layout, sidebar, routing, auth pages (`output: 'standalone'`)
8. Configure `next.config.js` rewrites for API proxy
9. Build basic dashboard home page with connected account summary
10. Set up WXT browser extension scaffold with authentication
11. Deploy all services to Railway

### Phase 2 — Analytics & Trends (Weeks 4–6)
1. Build own-account analytics sync (BullMQ job: pull posts + insights + account metrics)
2. Build analytics dashboard: overview, post performance table, audience insights
3. Implement `AccountInsightsSnapshot` and `PostInsightSnapshot` collection
4. Build engagement charts (time-series, heatmap, format breakdown) with Recharts
5. Implement keyword search integration (`GET /keyword_search`)
6. Build tracked keyword CRUD + BullMQ trend collection job
7. Build trend explorer dashboard: keyword volume chart, multi-keyword comparison, top posts/creators
8. Build `Creator` and `PublicPost` models' data pipeline
9. Extension: content script with threads.net DOM parser + MutationObserver
10. Extension: post insights overlay (own-post analytics inline)

### Phase 3 — Discovery & Competition (Weeks 7–9)
1. Creator discovery: search by keyword, rank by engagement, filter/sort
2. Creator profile pages with observed metrics and activity charts
3. Tracked creator management (CRUD + snapshot jobs)
4. Competitor monitoring: add by username, benchmark dashboard, comparison tables
5. Smart compose: post editor with media, polls, topic tags, link attachment, preview
6. Post scheduling: queue, BullMQ publisher job, queue management UI
7. Alert system: creation, evaluation engine, email/push/extension delivery
8. Webhook receiver: `/api/webhooks/threads` for mentions, replies, publishes
9. Extension: creator quick card, search enhancement overlay, floating widget
10. Extension popup: mini dashboard with alerts + scheduled posts

### Phase 4 — Polish & Launch (Weeks 10–12)
1. ✅ Report builder: all 8 report types, async generation, SSE progress, export (CSV/PDF/XLSX)
2. ⬜ Dark mode
3. ⬜ Responsive design pass
4. ⬜ Performance: Redis caching for trend data and API responses, query optimization, lazy loading
5. ⬜ Extension options page with full configuration
6. ⬜ Cross-browser testing: Chrome, Edge, Firefox, Safari
7. ✅ Security audit (token encryption, API key hashing, rate limiting, CORS)
8. ⬜ Playwright E2E tests for critical flows
9. ⬜ Railway production hardening: health checks, custom domains, private networking
10. ⬜ Publish extension to Chrome Web Store + addons.mozilla.org

### Phase 5 — Vercel Migration (Future)
1. Move Next.js frontend to Vercel
2. Update `API_URL` to Railway public endpoint
3. Enable Vercel Edge Middleware for auth
4. Enable Vercel Image Optimization
5. Update CORS for `*.vercel.app` preview URLs
6. Configure custom domains split (Vercel for web, Railway for API)
7. Test SSE or implement polling fallback
8. Remove web service from Railway

---

## 12. Security

1. **Token Storage:** Threads access tokens encrypted at rest (AES-256-GCM) with `ENCRYPTION_KEY` env var. Never logged, never exposed in API responses.
2. **API Key Security:** SHA-256 + salt hashed before storage. Shown once on creation. First 8 chars stored as `keyPrefix` for identification.
3. **OAuth Security:** `state` parameter for CSRF protection in OAuth flow. Redirect URI strictly validated.
4. **Rate Limiting:** Tiered by plan (60–2000 req/min to our API). Separate rate limiting on Threads API calls to stay within Meta's limits.
5. **Input Validation:** Zod validation on all inputs. Prisma parameterized queries prevent SQL injection.
6. **Extension Security:** CSP in manifest, no `eval()`, API calls only from background service worker.
7. **CORS:** Strict origin whitelist. Extension identified via custom `X-Extension-Version` header.
8. **Webhook Verification:** Verify webhook signatures from Meta to prevent spoofing.
9. **Data Privacy:** Only store publicly available data for non-connected accounts. Provide data deletion on account removal.

---

## 13. Vercel Migration Checklist (Future)

1. Remove `output: 'standalone'` from `next.config.js`
2. Update `API_URL` to Railway public API URL
3. Verify rewrites proxy correctly
4. Add Vercel Edge Middleware for auth
5. Enable Vercel Image Optimization
6. Update CORS on Railway API for `*.vercel.app`
7. Configure custom domains (Vercel for web, Railway for API)
8. Test SSE or implement polling fallback
9. Update CI/CD split
10. Remove web service from Railway

---

**Begin by initializing the Turborepo monorepo, installing all dependencies, creating Dockerfiles and docker-compose.yml (with TimescaleDB), setting up the Prisma schema with the complete data model, and building the authentication system including the Threads OAuth connection flow. Implement the typed `ThreadsApiClient` wrapping `graph.threads.net` with token management, rate limit handling, and cursor pagination. Configure Next.js with `output: 'standalone'` and API rewrites. Build the dashboard shell and the connected account overview page. Scaffold the WXT browser extension with threads.net page detection. Target Railway deployment by end of Phase 1.**
