import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET() {
  try {
    const { data: tokens, error } = await supabaseServer
      .from('oauth_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tokens:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tokens', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ tokens: tokens || [] });
  } catch (error) {
    console.error('Exception in check-tokens:', error);
    return NextResponse.json(
      { error: 'Server error', details: String(error) },
      { status: 500 }
    );
  }
}
