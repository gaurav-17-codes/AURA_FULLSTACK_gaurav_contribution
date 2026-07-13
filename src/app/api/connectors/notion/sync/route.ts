import { NextRequest, NextResponse } from 'next/server';
import '@/lib/queue/worker';
import { NotionConnector } from '@/lib/connectors/notion';

export async function POST(request: NextRequest) {
  try {
    // Use the same demo UUID
    const demoUserId = '00000000-0000-0000-0000-000000000001';

    const connector = new NotionConnector();
    const result = await connector.sync(demoUserId, demoUserId); // Using user.id as tenant_id for Phase 1

    return NextResponse.json(result);
  } catch (error) {
    console.error('Notion sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Notion data' },
      { status: 500 }
    );
  }
}
