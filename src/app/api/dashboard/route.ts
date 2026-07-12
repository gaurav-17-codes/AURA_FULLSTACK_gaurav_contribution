import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Phase 1: Use demo user ID
    const demoUserId = '00000000-0000-0000-0000-000000000001';
    const tenantId = demoUserId; // Phase 1: user.id is tenant_id

    // Get today's date range
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);

    // Fetch all tasks (not just today - for Phase 1 demo)
    const { data: tasks, error: tasksError } = await supabaseServer
      .from('tasks')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: true });

    // Fetch events for next 7 days
    const { data: events, error: eventsError } = await supabaseServer
      .from('events')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('start_time', startOfDay)
      .lte('start_time', nextWeek.toISOString())
      .order('start_time', { ascending: true });

    // Fetch recent messages (flagged or not)
    const { data: messages, error: messagesError } = await supabaseServer
      .from('messages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch recent documents
    const { data: documents, error: documentsError } = await supabaseServer
      .from('documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('last_modified', { ascending: false })
      .limit(10);

    // Fetch recent sync jobs
    const { data: syncJobs, error: syncError } = await supabaseServer
      .from('sync_jobs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (tasksError || eventsError || messagesError || documentsError || syncError) {
      console.error('Dashboard fetch errors:', {
        tasksError,
        eventsError,
        messagesError,
        documentsError,
        syncError,
      });
    }

    return NextResponse.json({
      tasks: tasks || [],
      events: events || [],
      messages: messages || [],
      documents: documents || [],
      syncJobs: syncJobs || [],
      stats: {
        totalTasks: tasks?.length || 0,
        totalEvents: events?.length || 0,
        totalMessages: messages?.length || 0,
        totalDocuments: documents?.length || 0,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
