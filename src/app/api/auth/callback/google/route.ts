import { NextRequest, NextResponse } from 'next/server';
import { GoogleConnector } from '@/lib/connectors/google';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId passed in state
    const error = searchParams.get('error');

    console.log('[Google Callback] Received:', { code: code?.substring(0, 20), state, error });

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard?error=${error}`, request.url)
      );
    }

    if (!code || !state) {
      console.error('[Google Callback] Missing code or state');
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    console.log('[Google Callback] Calling handleCallback...');
    const connector = new GoogleConnector();
    await connector.handleCallback(code, state);
    console.log('[Google Callback] Token saved successfully');

    // Redirect to dashboard with success message
    return NextResponse.redirect(
      new URL('/dashboard?connected=google', request.url)
    );
  } catch (error) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=google_auth_failed', request.url)
    );
  }
}
