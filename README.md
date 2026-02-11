# ThreadScope

Analytics, scheduling, and competitive intelligence platform for Meta Threads.

## Architecture

```
threadscope/
├── apps/
│   ├── api/          # Express + tRPC API server & BullMQ workers
│   ├── web/          # Next.js dashboard
│   └── extension/    # WXT browser extension
├── packages/
│   ├── shared/       # Shared types, validation schemas, constants
│   └── ui/           # Shared UI components
├── docker-compose.yml
└── turbo.json
```

**Tech stack:** TypeScript, Express, tRPC v11, Prisma (PostgreSQL + TimescaleDB), BullMQ (Redis), Next.js 14, Tailwind CSS, WXT

## Prerequisites

- Node.js >= 20
- pnpm 9
- Docker & Docker Compose (for PostgreSQL + Redis)
- A [Meta Threads API](https://developers.facebook.com/docs/threads) app (for OAuth)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure

```bash
docker compose up -d postgres redis
```

### 3. Configure environment

```bash
cp apps/api/.env.example apps/api/.env   # if .env.example exists, otherwise create manually
```

Required environment variables for `apps/api/.env`:

```env
DATABASE_URL=postgresql://threadscope:localdev@localhost:5432/threadscope
REDIS_URL=redis://localhost:6379
JWT_SECRET=<min-32-character-secret>
JWT_REFRESH_SECRET=<min-32-character-secret>
ENCRYPTION_KEY=<exactly-32-character-key>
THREADS_APP_ID=<your-threads-app-id>
THREADS_APP_SECRET=<your-threads-app-secret>
THREADS_OAUTH_REDIRECT_URI=http://localhost:4000/auth/threads/callback
```

For `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Set up the database

```bash
pnpm db:generate          # Generate Prisma client
pnpm db:migrate           # Run migrations
```

### 5. Start development

```bash
pnpm dev                  # Starts API, web app, and extension in parallel
```

| Service   | URL                        |
|-----------|----------------------------|
| API       | http://localhost:4000       |
| Web       | http://localhost:3000       |
| tRPC      | http://localhost:4000/trpc  |
| Health    | http://localhost:4000/health|

## Key Commands

```bash
pnpm build              # Build all packages
pnpm type-check         # TypeScript check across all packages
pnpm lint               # Lint all packages
pnpm db:studio          # Open Prisma Studio (database GUI)
pnpm db:migrate         # Run database migrations
```

## Docker (Full Stack)

```bash
docker compose up --build
```

This starts PostgreSQL, Redis, API server, worker, and web app.

## Project Structure

### API (`apps/api`)
- **Express server** with REST auth routes and tRPC API
- **BullMQ workers** for analytics sync, report generation, scheduled posts, data cleanup, and alert evaluation
- **Prisma ORM** with 20 models across analytics, content, and social data domains

### Web (`apps/web`)
- **Next.js 14** dashboard with app router
- Pages: analytics, compose, competitors, trends, discover, reports, alerts, settings

### Extension (`apps/extension`)
- **WXT** browser extension for Threads.net overlay
- Shows inline analytics on posts and creator profiles

### Shared (`packages/shared`)
- Validation schemas (Zod), engagement calculations, plan limits, type definitions
