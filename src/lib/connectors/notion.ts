import { Client } from '@notionhq/client';
import { supabaseServer } from '@/lib/supabase/server';
import { 
  ConnectorInterface, 
  CanonicalData, 
  SyncResult,
  CanonicalTask,
  CanonicalDocument
} from './base';
import { syncQueue } from '@/lib/queue';

export class NotionConnector implements ConnectorInterface {
  private notion: Client;

  constructor() {
    this.notion = new Client({
      auth: process.env.NOTION_TOKEN,
    });
  }

  async authorize(userId: string): Promise<{ authUrl: string }> {
    // For Phase 1, using internal integration token (no OAuth flow needed)
    // Phase 2 can implement OAuth: https://developers.notion.com/docs/authorization
    return { authUrl: '' };
  }

  async handleCallback(code: string, userId: string): Promise<void> {
    // Not needed for Phase 1 (using internal integration)
    // Phase 2: implement OAuth token exchange
  }

  async fetch(userId: string): Promise<any> {
    const databaseId = process.env.NOTION_DATABASE_ID!;

    // Query database
    const response = await this.notion.databases.query({
      database_id: databaseId,
      filter: {
        or: [
          {
            property: 'Status',
            status: {
              does_not_equal: 'Done',
            },
          },
        ],
      },
    });

    // Fetch recent pages (documents)
    const searchResponse = await this.notion.search({
      filter: {
        property: 'object',
        value: 'page',
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
      page_size: 20,
    });

    return {
      databaseItems: response.results,
      pages: searchResponse.results,
    };
  }

  async mapToCanonical(rawData: any, tenantId: string): Promise<CanonicalData> {
    const tasks: CanonicalTask[] = rawData.databaseItems.map((item: any) => {
      // Extract title from properties
      let title = 'Untitled';
      if (item.properties.Name?.title?.[0]?.plain_text) {
        title = item.properties.Name.title[0].plain_text;
      } else if (item.properties.Title?.title?.[0]?.plain_text) {
        title = item.properties.Title.title[0].plain_text;
      }

      // Extract status
      let status = null;
      if (item.properties.Status?.status?.name) {
        status = item.properties.Status.status.name;
      } else if (item.properties.Status?.select?.name) {
        status = item.properties.Status.select.name;
      }

      // Extract due date
      let dueDate = null;
      if (item.properties['Due Date']?.date?.start) {
        dueDate = item.properties['Due Date'].date.start;
      } else if (item.properties.Date?.date?.start) {
        dueDate = item.properties.Date.date.start;
      }

      return {
        title,
        status,
        due_date: dueDate,
        source: 'notion',
        source_id: item.id,
      };
    });

    const documents: CanonicalDocument[] = rawData.pages.map((page: any) => {
      // Extract title
      let title = 'Untitled';
      if (page.properties?.title?.title?.[0]?.plain_text) {
        title = page.properties.title.title[0].plain_text;
      } else if (page.properties?.Name?.title?.[0]?.plain_text) {
        title = page.properties.Name.title[0].plain_text;
      }

      return {
        title,
        url: page.url,
        last_modified: page.last_edited_time,
        source: 'notion',
        source_id: page.id,
      };
    });

    return {
      tasks,
      events: [],
      messages: [],
      documents,
    };
  }

  async sync(userId: string, tenantId: string): Promise<SyncResult> {
    // Add sync job to queue
    await syncQueue.add('notion-sync', {
      userId,
      tenantId,
      connector: 'notion',
    });

    return {
      success: true,
      itemsSynced: 0, // Will be updated by queue worker
    };
  }

  async healthCheck(userId: string): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
    try {
      // Test API connection by fetching user info
      const response = await this.notion.users.me({});
      
      if (response) {
        return { status: 'healthy' };
      }

      return { status: 'unhealthy', message: 'Unable to connect to Notion API' };
    } catch (error) {
      return { status: 'unhealthy', message: (error as Error).message };
    }
  }
}
