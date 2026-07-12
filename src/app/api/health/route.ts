import { NextResponse } from 'next/server';
import { getQueueHealth } from '@/lib/queue';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Check database connection
    const { error: dbError } = await supabaseServer
      .from('sync_jobs')
      .select('id')
      .limit(1);

    const dbHealthy = !dbError;

    // Check queue health
    const queueHealth = await getQueueHealth();

    return NextResponse.json({
      status: dbHealthy && queueHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      components: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        queue: queueHealth.status,
        queueDetails: queueHealth,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
