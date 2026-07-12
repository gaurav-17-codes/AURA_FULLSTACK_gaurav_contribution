# AURA - Unified Productivity Platform

**Phase 1 (Month 1)** - Foundation Build

> The one workspace that replaces checking six.

## Overview

AURA integrates Google Workspace (Calendar + Gmail) and Notion into a single unified "Today" view, with real OAuth flows, a canonical data model, async sync queue, and foundation for AI features in Week 4.

---

## Tech Stack

- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (Postgres + Auth + pgvector)
- **Queue**: BullMQ + Redis
- **Integrations**: Google Workspace API, Notion API
- **AI (Week 4)**: FastAPI + LangGraph
- **Local Dev**: Docker

---

## Prerequisites

Before running the project, ensure you have:

1. **Node.js** v20 or higher
2. **Docker Desktop** installed and running
3. **Credentials** for:
   - Google OAuth (Client ID + Secret)
   - Notion Integration Token + Database ID
   - Supabase Project (URL + Anon Key + Service Role Key)

---

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd aura
npm install
```

### 2. Configure Environment Variables

Copy `.env.local` and fill in your credentials:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/connectors/google/callback

# Notion
NOTION_TOKEN=your_notion_token_here
NOTION_DATABASE_ID=your_notion_database_id_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Redis
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=development
```

### 3. Run Database Migrations

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and run the migration from `supabase/migrations/001_initial_schema.sql`

This creates:
- `tasks`, `events`, `messages`, `documents` (canonical tables)
- `oauth_tokens` (encrypted token storage)
- `sync_jobs` (sync health tracking)
- Indexes, RLS policies, and triggers

### 4. Start Redis with Docker

```bash
npm run docker:up
```

This starts Redis in a Docker container.

### 5. Start the Queue Worker

In a separate terminal:

```bash
npm run worker
```

This starts the BullMQ worker that processes sync jobs.

### 6. Start the Next.js Dev Server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**

---

## Project Structure

```
aura/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── auth/              # Login, signup, logout
│   │       ├── connectors/         # Google & Notion connectors
│   │       ├── dashboard/          # Dashboard data API
│   │       └── health/             # Health check endpoint
│   ├── lib/
│   │   ├── supabase/              # Supabase clients & types
│   │   ├── connectors/            # Connector interface & implementations
│   │   │   ├── base.ts            # Base connector interface
│   │   │   ├── google.ts          # Google Workspace connector
│   │   │   └── notion.ts          # Notion connector
│   │   └── queue/                 # BullMQ queue & worker
│   │       ├── index.ts           # Queue setup
│   │       └── worker.ts          # Sync worker
├── supabase/
│   └── migrations/                # Database schema migrations
├── docker-compose.yml             # Redis + Worker setup
├── .env.local                     # Environment variables (DO NOT COMMIT)
└── README.md
```

---

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Google Connector
- `GET /api/connectors/google/authorize` - Get OAuth URL
- `GET /api/connectors/google/callback` - OAuth callback
- `POST /api/connectors/google/sync` - Trigger sync

### Notion Connector
- `POST /api/connectors/notion/sync` - Trigger sync

### Dashboard
- `GET /api/dashboard` - Fetch today's tasks, events, messages, documents

### Health
- `GET /api/health` - System health check

---

## Connector Interface

All connectors (Google, Notion, and future ones like Slack, Linear, Microsoft 365) implement the same interface:

```typescript
interface ConnectorInterface {
  authorize(userId: string): Promise<{ authUrl: string }>;
  handleCallback(code: string, userId: string): Promise<void>;
  fetch(userId: string): Promise<any>;
  mapToCanonical(rawData: any, tenantId: string): Promise<CanonicalData>;
  sync(userId: string, tenantId: string): Promise<SyncResult>;
  healthCheck?(userId: string): Promise<{ status: 'healthy' | 'unhealthy' }>;
}
```

**Adding a new connector in Phase 2 never touches existing connector code.**

---

## Canonical Data Model

Every external source maps into exactly **4 object types**:

| Object | Core Fields | Example Source |
|--------|-------------|----------------|
| **Task** | title, status, due_date, source, source_id | Notion database |
| **Event** | title, start_time, end_time, attendees, source | Google Calendar |
| **Message** | sender, subject, snippet, flagged, source | Gmail |
| **Document** | title, url, last_modified, source | Notion page |

---

## Async Sync Pipeline

All syncs run through BullMQ queue:

1. User triggers sync via API
2. Job added to Redis queue
3. Worker picks up job
4. Worker calls connector's `fetch()` → `mapToCanonical()`
5. Worker persists canonical data to Postgres
6. Sync job status updated (completed/failed)

**Sync failures are visible, never silent** — tracked in `sync_jobs` table.

---

## Multi-Tenancy Hooks

Phase 1 is single-tenant (KALNET only), but every table has `tenant_id` from day one:

- `tasks.tenant_id`
- `events.tenant_id`
- `messages.tenant_id`
- `documents.tenant_id`
- `sync_jobs.tenant_id`

**Phase 5's multi-tenant leap = config change, not a rewrite.**

---

## Running Tests

```bash
npm run test        # Run tests (to be added)
npm run lint        # Lint code
```

---

## Docker Commands

```bash
npm run docker:up       # Start Redis
npm run docker:down     # Stop Redis
npm run docker:logs     # View Redis logs
```

---

## Phase 1 Definition of Done

✅ A real user can log in and see live Calendar + Gmail + Notion data unified in one dashboard

✅ Connector interface is documented well enough that Slack, Linear, Microsoft 365 can be added in Phase 2 without touching Phase 1 code

✅ Demo environment works end-to-end; switching to production is a configuration change only

✅ Sync is trustworthy — no lost, duplicated, or silently dropped tasks or messages; failures are visible

✅ Architecture handoff + recorded demo ready for next cohort

---

## Week-by-Week Breakdown

### Week 1 — Prerequisites (COMPLETED)
- OAuth 2.0 flow learning
- Google API basics
- Canonical schema design
- Setup credentials

### Week 2 — Core Skeleton (CURRENT)
- ✅ Supabase Auth
- ✅ Database schema migration
- ✅ Google Calendar + Gmail connector
- ✅ Async job queue
- ✅ Notion connector

### Week 3 — Dashboard + Frontend
- Build Next.js dashboard shell
- Single "Today" view (task list + calendar widgets)
- Embeddings pipeline for AI

### Week 4 — AI v0 & Demo
- Daily AI digest agent
- Basic prioritization scorer
- Semantic search v0
- Internal demo + architecture handoff

---

## Troubleshooting

### Redis connection failed
- Ensure Docker Desktop is running
- Run `npm run docker:up`

### Supabase errors
- Verify credentials in `.env.local`
- Check migration was run in Supabase SQL Editor

### Google OAuth not working
- Verify redirect URI matches in Google Cloud Console
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Notion sync failing
- Verify integration token is valid
- Check database is shared with the integration

---

## Team AURA

**Full Stack**: 5 Engineers
- 2× Integration/Backend Engineer
- 2× Frontend Engineer
- 1× Platform/Auth Engineer

**AI/ML**: 6 Engineers
- 2× NLP/Digest Engineer
- 2× Prioritization/Ranking Engineer
- 1× Search & Embeddings Engineer
- 1× Prompt-Eval & QA

---

## Next Steps

1. Complete Week 3 — Dashboard frontend
2. Complete Week 4 — AI digest agent
3. Internal demo
4. Phase 2 — Slack, Linear, Microsoft 365 connectors

---

## License

Internal & Confidential — KALNET
