-- AURA Phase 1 - Canonical Schema Migration
-- Creates: Tasks, Events, Messages, Documents, OAuth Tokens, Sync Jobs
-- Multi-tenant ready with tenant_id columns from day one

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector for embeddings (Week 3/4)
CREATE EXTENSION IF NOT EXISTS vector;

-----------------------------------------------------------
-- CANONICAL TABLES (Core Data Model)
-----------------------------------------------------------

-- Tasks (from Notion, Linear, etc.)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    title TEXT NOT NULL,
    status TEXT,
    due_date TIMESTAMPTZ,
    source TEXT NOT NULL, -- 'notion', 'linear', etc.
    source_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, source, source_id)
);

-- Events (from Google Calendar, Outlook, etc.)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    title TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    attendees JSONB DEFAULT '[]'::jsonb,
    source TEXT NOT NULL, -- 'google_calendar', 'outlook', etc.
    source_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, source, source_id)
);

-- Messages (from Gmail, Slack, etc.)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    sender TEXT NOT NULL,
    subject TEXT,
    snippet TEXT,
    flagged BOOLEAN DEFAULT FALSE,
    source TEXT NOT NULL, -- 'gmail', 'slack', etc.
    source_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, source, source_id)
);

-- Documents (from Notion, Google Drive, etc.)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    last_modified TIMESTAMPTZ,
    source TEXT NOT NULL, -- 'notion', 'google_drive', etc.
    source_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, source, source_id)
);

-----------------------------------------------------------
-- OAUTH & SYNC INFRASTRUCTURE
-----------------------------------------------------------

-- OAuth Tokens (secure storage)
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL, -- 'google', 'notion', 'microsoft', etc.
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Sync Jobs (health tracking)
CREATE TABLE IF NOT EXISTS public.sync_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    connector TEXT NOT NULL, -- 'google', 'notion', etc.
    status TEXT NOT NULL, -- 'running', 'completed', 'failed'
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    items_synced INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-----------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-----------------------------------------------------------

-- Canonical tables - query by tenant and source
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON public.tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON public.events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(start_time);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON public.messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_flagged ON public.messages(flagged);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);

-- OAuth and sync
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON public.oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_tenant_id ON public.sync_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON public.sync_jobs(status);

-----------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) - Phase 1: Permissive for demo
-----------------------------------------------------------

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

-- Phase 1: Allow all operations (demo mode)
-- Phase 5: Replace with proper tenant-scoped policies

CREATE POLICY "Allow all for demo" ON public.tasks FOR ALL USING (true);
CREATE POLICY "Allow all for demo" ON public.events FOR ALL USING (true);
CREATE POLICY "Allow all for demo" ON public.messages FOR ALL USING (true);
CREATE POLICY "Allow all for demo" ON public.documents FOR ALL USING (true);
CREATE POLICY "Allow all for demo" ON public.oauth_tokens FOR ALL USING (true);
CREATE POLICY "Allow all for demo" ON public.sync_jobs FOR ALL USING (true);

-----------------------------------------------------------
-- TRIGGERS FOR UPDATED_AT
-----------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_tokens_updated_at BEFORE UPDATE ON public.oauth_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-----------------------------------------------------------
-- COMMENTS FOR DOCUMENTATION
-----------------------------------------------------------

COMMENT ON TABLE public.tasks IS 'Canonical task model - maps from Notion, Linear, etc.';
COMMENT ON TABLE public.events IS 'Canonical event model - maps from Google Calendar, Outlook, etc.';
COMMENT ON TABLE public.messages IS 'Canonical message model - maps from Gmail, Slack, etc.';
COMMENT ON TABLE public.documents IS 'Canonical document model - maps from Notion, Google Drive, etc.';
COMMENT ON TABLE public.oauth_tokens IS 'Secure OAuth token storage for all integrations';
COMMENT ON TABLE public.sync_jobs IS 'Sync health tracking - visible failures, not silent';

COMMENT ON COLUMN public.tasks.tenant_id IS 'Multi-tenant column - Phase 1: single tenant, Phase 5: multi-tenant';
COMMENT ON COLUMN public.events.tenant_id IS 'Multi-tenant column - Phase 1: single tenant, Phase 5: multi-tenant';
COMMENT ON COLUMN public.messages.tenant_id IS 'Multi-tenant column - Phase 1: single tenant, Phase 5: multi-tenant';
COMMENT ON COLUMN public.documents.tenant_id IS 'Multi-tenant column - Phase 1: single tenant, Phase 5: multi-tenant';
