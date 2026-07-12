import { NextRequest, NextResponse } from 'next/server';
import { GoogleConnector } from '@/lib/connectors/google';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // For demo/testing purposes, we'll use a consistent demo UUID
    // In production, this would come from authenticated session
    const demoUserId = '00000000-0000-0000-0000-000000000001';

    const connector = new GoogleConnector();
    const { authUrl } = await connector.authorize(demoUserId);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Google authorize error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google authorization' },
      { status: 500 }
    );
  }
}
