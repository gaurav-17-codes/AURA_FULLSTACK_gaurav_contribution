# AURA - Architecture & Design Document

**Phase 1 (Month 1)** - Foundation Architecture

---

## 1. System Overview

AURA is a unified productivity platform that integrates multiple external tools (Google Workspace, Notion, Slack, Linear, Microsoft 365) into a single "Today" view. Phase 1 focuses on proving the core architecture with one integration (Google) done properly.

###

 1.1 Design Principles

1. **Integrate, don't replace** - Every connected tool remains the system of record; AURA is a read-only lens
2. **Pluggable connector interface** - Adding Slack in Phase 2 never touches Google's code
3. **One canonical data model** - Everything maps to Task/Event/Message/Document
4. **Async sync from day one** - No inline API calls; everything goes through the queue
5. **Multi-tenant ready** - Every table has `tenant_id` even though Phase 1 is single-tenant

---

## 2. Tech Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Frontend** | Next.js 16 + TypeScript | Server-side rendering, API routes, TypeScript safety |
| **Backend** | Next.js API Routes | Unified codebase, no separate backend server |
| **Database** | Supabase (Postgres) | Managed Postgres + Auth + pgvector for Week 4 embeddings |
| **Queue** | BullMQ + Redis | Battle-tested async job queue, retry logic, observability |
| **AI (Week 4)** | FastAPI + LangGraph | Python AI ecosystem, LangChain for agents |
| **Integrations** | Google Workspace API, Notion API | Official SDKs |
| **Local Dev** | Docker | Redis + (future) worker containers |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  NEXT.JS FRONTEND                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │   Dashboard (Today View)                              │  │
│  │   - Task List Widget                                  │  │
│  │   - Calendar Widget                                   │  │
│  │   - Messages Widget                                   │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS API ROUTES (Backend)                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  /api/auth/*          - Login, Signup, Logout       │    │
│  │  /api/connectors/*    - OAuth + Sync endpoints      │    │
│  │  /api/dashboard       - Unified data API            │    │
│  │  /api/health          - System health check         │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
             ▼                            ▼
┌────────────────────────┐    ┌──────────────────────────────┐
│   CONNECTOR LAYER      │    │   BULLMQ JOB QUEUE (Redis)   │
│  ┌──────────────────┐  │    │  ┌────────────────────────┐  │
│  │ GoogleConnector  │  │───▶│  │  Sync Jobs             │  │
│  │ NotionConnector  │  │    │  │  - google-sync         │  │
│  │ (Future: Slack)  │  │    │  │  - notion-sync         │  │
│  └──────────────────┘  │    │  └────────────────────────┘  │
└────────────┬───────────┘    └──────────┬───────────────────┘
             │                           │
             ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    SYNC WORKER                               │
│  1. Pick job from queue                                      │
│  2. Call connector.fetch(userId)                             │
│  3. Call connector.mapToCanonical(rawData, tenantId)         │
│  4. Persist to Supabase canonical tables                     │
│  5. Update sync_jobs status                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               SUPABASE (Postgres)                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  CANONICAL TABLES                                     │  │
│  │  - tasks         (from Notion, Linear)                │  │
│  │  - events        (from Google Calendar, Outlook)      │  │
│  │  - messages      (from Gmail, Slack)                  │  │
│  │  - documents     (from Notion, Google Drive)          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  INFRASTRUCTURE TABLES                                │  │
│  │  - oauth_tokens  (encrypted token storage)            │  │
│  │  - sync_jobs     (sync health tracking)               │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL APIs                                   │
│  - Google Calendar API                                       │
│  - Gmail API                                                 │
│  - Notion API                                                │
│  - (Future: Slack, Linear, Microsoft 365)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Data Flow - OAuth & First Sync

### 4.1 OAuth Flow (One-Time Setup)

```
1. User clicks "Connect Google" in UI
2. Frontend → GET /api/connectors/google/authorize
3. API generates OAuth URL with:
   - client_id, redirect_uri, scopes
   - state parameter (userId for callback)
4. User redirected to Google consent screen
5. User grants permissions
6. Google redirects back to /api/connectors/google/callback?code=xxx&state=userId
7. Backend exchanges code for access_token + refresh_token
8. Tokens stored securely in oauth_tokens table
9. User redirected to dashboard
```

### 4.2 Sync Flow (Recurring)

```
1. User clicks "Sync" OR cron job triggers
2. POST /api/connectors/google/sync
3. API adds job to BullMQ queue: { userId, tenantId, connector: 'google' }
4. API responds immediately: { success: true, itemsSynced: 0 }
5. Worker picks up job from Redis queue
6. Worker:
   a. Fetches oauth_tokens for userId
   b. Calls Google Calendar API (next 7 days)
   c. Calls Gmail API (starred messages)
   d. Maps raw responses to canonical format:
      - Google Calendar event → Event
      - Gmail message → Message
   e. Upserts to events and messages tables
   f. Updates sync_jobs table: status='completed', items_synced=8
7. Dashboard refreshes and shows new data
```

---

## 5. Canonical Data Model

Every external source maps into exactly **4 object types**. This contract is fixed in Phase 1 and never redesigned.

### 5.1 Task

```typescript
{
  id: UUID,
  tenant_id: UUID,
  title: string,
  status: string | null,
  due_date: timestamp | null,
  source: 'notion' | 'linear' | 'asana',
  source_id: string,  // External ID for deduplication
  created_at: timestamp,
  updated_at: timestamp
}
```

**Example Sources**: Notion database row, Linear issue, Asana task

### 5.2 Event

```typescript
{
  id: UUID,
  tenant_id: UUID,
  title: string,
  start_time: timestamp,
  end_time: timestamp | null,
  attendees: JSONB,  // [{ email, name }]
  source: 'google_calendar' | 'outlook',
  source_id: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

**Example Sources**: Google Calendar event, Outlook event

### 5.3 Message

```typescript
{
  id: UUID,
  tenant_id: UUID,
  sender: string,
  subject: string | null,
  snippet: string,
  flagged: boolean,
  source: 'gmail' | 'slack',
  source_id: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

**Example Sources**: Gmail message, Slack DM

### 5.4 Document

```typescript
{
  id: UUID,
  tenant_id: UUID,
  title: string,
  url: string | null,
  last_modified: timestamp | null,
  source: 'notion' | 'google_drive',
  source_id: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

**Example Sources**: Notion page, Google Drive file

---

## 6. Connector Interface (Pluggable Design)

Every integration implements the same interface:

```typescript
interface ConnectorInterface {
  // OAuth authorization
  authorize(userId: string): Promise<{ authUrl: string }>;
  
  // OAuth callback handler
  handleCallback(code: string, userId: string): Promise<void>;
  
  // Fetch raw data from external API
  fetch(userId: string): Promise<any>;
  
  // Map raw data to canonical format
  mapToCanonical(rawData: any, tenantId: string): Promise<CanonicalData>;
  
  // Trigger sync (adds job to queue)
  sync(userId: string, tenantId: string): Promise<SyncResult>;
  
  // Optional health check
  healthCheck?(userId: string): Promise<{ status: 'healthy' | 'unhealthy' }>;
}
```

**Key Insight**: Adding Slack in Phase 2 means:
1. Create `src/lib/connectors/slack.ts` implementing this interface
2. Add `POST /api/connectors/slack/sync` route
3. **Zero changes to Google or Notion connectors**

---

## 7. Async Sync Strategy

### 7.1 Why Async?

- **Scalability**: Phase 2 adds 4 more connectors; inline API calls would block requests
- **Reliability**: Retry logic, dead-letter queues, failure tracking
- **Observability**: `sync_jobs` table shows when syncs ran, how many items, failures

### 7.2 BullMQ Queue Architecture

```typescript
// Queue definition
const syncQueue = new Queue('sync', { connection: redis });

// Add job (from API route)
await syncQueue.add('google-sync', {
  userId: '00000000-0000-0000-0000-000000000001',
  tenantId: '00000000-0000-0000-0000-000000000001',
  connector: 'google'
});

// Worker processes job
const syncWorker = new Worker('sync', async (job) => {
  const { userId, tenantId, connector } = job.data;
  // ... fetch, map, persist logic
}, { connection: redis, concurrency: 5 });
```

### 7.3 Retry & Failure Handling

- **Automatic Retries**: BullMQ retries failed jobs (default: 3 attempts)
- **Exponential Backoff**: 1min, 5min, 15min delays
- **Failure Visibility**: `sync_jobs` table tracks errors:
  ```sql
  status='failed', error_message='No OAuth tokens found for user'
  ```

---

## 8. Multi-Tenancy Hooks

Phase 1 is **single-tenant** (KALNET only), but architecture is multi-tenant ready:

### 8.1 Database Design

Every canonical table has `tenant_id`:
```sql
CREATE TABLE public.events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,  -- Phase 1: always same value
                               -- Phase 5: different per org
    ...
);
```

### 8.2 Row-Level Security (RLS)

Phase 1: Permissive policies (demo mode)
```sql
CREATE POLICY "Allow all for demo" ON public.events FOR ALL USING (true);
```

Phase 5: Tenant-scoped policies
```sql
CREATE POLICY "Users see own tenant data" ON public.events
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### 8.3 Migration Path

Phase 1 → Phase 5:
1. Add tenant selection to auth flow
2. Update RLS policies
3. Add tenant management UI
4. **No schema changes** - `tenant_id` already exists

---

## 9. Security Considerations

### 9.1 OAuth Token Storage

**Phase 1**: Plain text in `oauth_tokens` table (acceptable for demo)

**Phase 5**: Encrypted at rest
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Encrypt tokens with AES-256
INSERT INTO oauth_tokens (access_token) 
VALUES (pgp_sym_encrypt('token', 'encryption_key'));
```

### 9.2 API Security

- **HTTPS only** in production
- **CORS** configured for frontend domain only
- **Rate limiting** (Phase 5): Redis-based per-user limits

### 9.3 Supabase RLS

All tables have RLS enabled, even with permissive policies in Phase 1

---

## 10. Performance Considerations

### 10.1 Database Indexes

```sql
-- Query patterns: filter by tenant, filter by date
CREATE INDEX idx_events_tenant_id ON public.events(tenant_id);
CREATE INDEX idx_events_start_time ON public.events(start_time);
```

### 10.2 Sync Optimization

- **Incremental sync** (Phase 2): Use `updated_at` to fetch only changed items
- **Batch processing**: Insert 100 events at once, not 100 individual inserts
- **Concurrency**: Worker processes 5 sync jobs simultaneously

### 10.3 Frontend

- **Server-side rendering**: Initial page load shows data immediately
- **Optimistic UI updates**: Show "Syncing..." immediately, update after

---

## 11. Observability

### 11.1 Sync Health Monitoring

`sync_jobs` table tracks every sync:
```sql
SELECT 
  connector,
  status,
  COUNT(*) as count,
  AVG(items_synced) as avg_items
FROM sync_jobs
WHERE started_at > NOW() - INTERVAL '24 hours'
GROUP BY connector, status;
```

### 11.2 Logs

- **Worker logs**: Console logs show fetch progress, items synced
- **API logs**: Next.js automatically logs all API requests

### 11.3 Health Check Endpoint

```typescript
GET /api/health
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "google": "healthy"
  }
}
```

---

## 12. Week 3 & 4 Extensions

### 12.1 Week 3 - Frontend Dashboard

```
src/app/dashboard/page.tsx
├── TaskListWidget      → reads from tasks table
├── CalendarWidget      → reads from events table
└── MessagesWidget      → reads from messages table
```

### 12.2 Week 4 - AI Digest Agent

```
FastAPI Service (Python)
├── LangGraph agent reads from canonical tables
├── Generates daily digest: "Top 3 priorities + meeting prep"
├── Stores in new digest_summaries table
└── Next.js dashboard displays digest
```

---

## 13. Phase 2 Extensions

Adding Slack, Notion, Linear, Microsoft 365:

1. **New Connector**: Implement `ConnectorInterface`
2. **New API Routes**: `/api/connectors/slack/*`
3. **Worker Already Supports It**: Same queue, same worker
4. **Frontend Shows It**: Same dashboard, same widgets

**No changes to**:
- Database schema
- Queue architecture
- Existing connectors

---

## 14. Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Task List  │  │  Calendar   │  │  Messages   │          │
│  │  Widget     │  │  Widget     │  │  Widget     │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         └────────────────┼────────────────┘                  │
│                          │ (reads from)                      │
└──────────────────────────┼───────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   CANONICAL TABLES                           │
│  [tasks] [events] [messages] [documents]                     │
│                          ▲                                   │
│                          │ (writes to)                       │
└──────────────────────────┼───────────────────────────────────┘
                           │
                     ┌─────┴─────┐
                     │   WORKER  │
                     └─────┬─────┘
                           │ (processes)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     BULLMQ QUEUE                             │
│  [google-sync] [notion-sync] [future: slack-sync]            │
│                          ▲                                   │
│                          │ (enqueues)                        │
└──────────────────────────┼───────────────────────────────────┘
                           │
                     ┌─────┴─────┐
                     │ CONNECTOR │
                     │ INTERFACE │
                     └─────┬─────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   Google    │ │   Notion    │ │   Slack     │
    │  Connector  │ │  Connector  │ │ (Phase 2)   │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           ▼               ▼               ▼
    ┌──────────────────────────────────────────────┐
    │          EXTERNAL APIs                        │
    │  Google Calendar · Gmail · Notion · Slack    │
    └──────────────────────────────────────────────┘
```

---

## 15. Deployment (Phase 5)

### 15.1 Production Stack

- **Frontend**: Vercel (Next.js optimal host)
- **Database**: Supabase (managed Postgres)
- **Queue/Worker**: Railway or Render (Docker container)
- **Redis**: Upstash or Redis Cloud

### 15.2 Environment Variables

Phase 1 → Production = **config change only**

```env
# .env (local)
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_SUPABASE_URL=https://local.supabase.co

# .env.production (Vercel)
REDIS_URL=redis://upstash.com/xxxxx
NEXT_PUBLIC_SUPABASE_URL=https://prod.supabase.co
```

---

## 16. Open Questions / Assumptions

1. **Sync Frequency**: Phase 1 uses manual "Sync" button. Phase 2 adds cron jobs (every 15 min)?
2. **Token Refresh**: Google tokens expire in 1 hour. Refresh logic needed in Phase 2?
3. **Webhooks vs Polling**: Phase 1 is polling. Phase 3 adds Google Calendar webhooks?
4. **Embeddings Storage**: Week 4 AI digest needs embeddings. Store in new `embeddings` column?

---

**Document Version**: 1.0  
**Last Updated**: July 2026  
**Reviewed By**: Pending CTO approval  
**Status**: Phase 1 - Week 2 Complete
