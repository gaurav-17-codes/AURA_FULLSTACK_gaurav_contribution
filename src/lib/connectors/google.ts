import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { supabaseServer } from '@/lib/supabase/server';
import { 
  ConnectorInterface, 
  CanonicalData, 
  SyncResult,
  CanonicalEvent,
  CanonicalMessage
} from './base';
import { syncQueue } from '@/lib/queue';

export class GoogleConnector implements ConnectorInterface {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  async authorize(userId: string): Promise<{ authUrl: string }> {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/gmail.readonly',
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // Pass userId in state for callback
      prompt: 'consent', // Force consent to get refresh token
    });

    return { authUrl };
  }

  async handleCallback(code: string, userId: string): Promise<void> {
    console.log('[Google handleCallback] Getting token with code...');
    const { tokens } = await this.oauth2Client.getToken(code);
    console.log('[Google handleCallback] Got tokens:', { 
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date 
    });

    // Store tokens securely in database
    console.log('[Google handleCallback] Inserting into Supabase...');
    const { data, error } = await supabaseServer.from('oauth_tokens').upsert({
      user_id: userId,
      provider: 'google',
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token || null,
      expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    } as any);

    if (error) {
      console.error('[Google handleCallback] Supabase error:', error);
      throw error;
    }

    console.log('[Google handleCallback] Successfully saved token to Supabase');
  }

  async fetch(userId: string): Promise<any> {
    // Get stored tokens (get the most recent one if multiple exist)
    console.log(`[Google fetch] Looking for tokens for user: ${userId}`);
    const { data: tokenData, error } = await supabaseServer
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .order('created_at', { ascending: false })
      .limit(1);

    console.log(`[Google fetch] Token query result:`, { 
      hasData: !!tokenData && tokenData.length > 0, 
      error: error?.message,
      count: tokenData?.length || 0
    });

    if (error || !tokenData || tokenData.length === 0) {
      throw new Error('No Google OAuth tokens found for user');
    }

    const token = tokenData[0] as any;

    // Set credentials
    this.oauth2Client.setCredentials({
      access_token: token.access_token,
      refresh_token: token.refresh_token || undefined,
    });

    // Fetch Calendar events
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7); // Get events for next 7 days

    console.log(`[Google fetch] Fetching calendar events from ${now.toISOString()} to ${nextWeek.toISOString()}`);

    const calendarResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: nextWeek.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    console.log(`[Google fetch] Fetched ${calendarResponse.data.items?.length || 0} calendar events`);

    // Fetch Gmail messages (starred OR important/recent)
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    
    // Try to fetch starred messages first
    let gmailResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:starred',
      maxResults: 10,
    });

    // If no starred messages, fetch recent important/unread messages
    if (!gmailResponse.data.messages || gmailResponse.data.messages.length === 0) {
      console.log(`[Google fetch] No starred messages, fetching recent important messages instead`);
      gmailResponse = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:important OR is:unread',
        maxResults: 10,
      });
    }

    // If still nothing, fetch just recent messages from inbox
    if (!gmailResponse.data.messages || gmailResponse.data.messages.length === 0) {
      console.log(`[Google fetch] No important messages, fetching recent inbox messages`);
      gmailResponse = await gmail.users.messages.list({
        userId: 'me',
        q: 'in:inbox',
        maxResults: 10,
      });
    }

    console.log(`[Google fetch] Fetched ${gmailResponse.data.messages?.length || 0} messages`);

    // Fetch full message details
    const messages = [];
    if (gmailResponse.data.messages) {
      for (const msg of gmailResponse.data.messages) {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
        });
        messages.push(fullMessage.data);
      }
    }

    console.log(`[Google fetch] Returning data: ${calendarResponse.data.items?.length || 0} events, ${messages.length} messages`);

    return {
      calendarEvents: calendarResponse.data.items || [],
      gmailMessages: messages,
    };
  }

  async mapToCanonical(rawData: any, tenantId: string): Promise<CanonicalData> {
    const events: CanonicalEvent[] = rawData.calendarEvents.map((event: any) => ({
      title: event.summary || 'Untitled Event',
      start_time: event.start?.dateTime || event.start?.date,
      end_time: event.end?.dateTime || event.end?.date,
      attendees: event.attendees || [],
      source: 'google_calendar',
      source_id: event.id,
    }));

    const messages: CanonicalMessage[] = rawData.gmailMessages.map((msg: any) => {
      const headers = msg.payload?.headers || [];
      const getHeader = (name: string) => 
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      // Check if message is starred
      const isStarred = msg.labelIds?.includes('STARRED') || false;

      return {
        sender: getHeader('from'),
        subject: getHeader('subject'),
        snippet: msg.snippet || '',
        flagged: isStarred,
        source: 'gmail',
        source_id: msg.id,
      };
    });

    return {
      tasks: [],
      events,
      messages,
      documents: [],
    };
  }

  async sync(userId: string, tenantId: string): Promise<SyncResult> {
    // Add sync job to queue instead of running inline
    await syncQueue.add('google-sync', {
      userId,
      tenantId,
      connector: 'google',
    });

    return {
      success: true,
      itemsSynced: 0, // Will be updated by queue worker
    };
  }

  async healthCheck(userId: string): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
    try {
      const { data: tokenData } = await supabaseServer
        .from('oauth_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!tokenData || tokenData.length === 0) {
        return { status: 'unhealthy', message: 'No OAuth tokens found' };
      }

      const token = tokenData[0] as any;

      // Check if token is expired
      if (token.expires_at && new Date(token.expires_at) < new Date()) {
        return { status: 'unhealthy', message: 'Access token expired' };
      }

      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', message: (error as Error).message };
    }
  }
}
