import { NextRequest, NextResponse } from 'next/server';
import { GoogleConnector } from '@/lib/connectors/google';

export async function POST(request: NextRequest) {
  try {
    // Use the same demo UUID
    const demoUserId = '00000000-0000-0000-0000-000000000001';

    const connector = new GoogleConnector();
    const result = await connector.sync(demoUserId, demoUserId); // Using user.id as tenant_id for Phase 1

    return NextResponse.json(result);
  } catch (error) {
    console.error('Google sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Google data' },
      { status: 500 }
    );
  }
}
