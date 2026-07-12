// Load environment variables
import dotenv from 'dotenv';
dotenv.config(); // Loads from .env by default

import { Worker, Job, ConnectionOptions } from 'bullmq';
import { connection } from './index';
import { GoogleConnector } from '@/lib/connectors/google';
import { NotionConnector } from '@/lib/connectors/notion';
import { supabaseServer } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/database.types';

interface SyncJobData {
  userId: string;
  tenantId: string;
  connector: 'google' | 'notion';
}

// Sync worker that processes all connector jobs
export const syncWorker = new Worker<SyncJobData>(
  'sync',
  async (job: Job<SyncJobData>) => {
    const { userId, tenantId, connector } = job.data;

    console.log(`[Sync Worker] Processing ${connector} sync for user ${userId}`);

    // Create sync job record
    const { data: syncJob } = await (supabaseServer
      .from('sync_jobs')
      .insert({
        tenant_id: tenantId,
        connector,
        status: 'running',
        started_at: new Date().toISOString(),
      } as any)
      .select()
      .single() as any);

    try {
      let connectorInstance;
      
      // Select connector based on type
      switch (connector) {
        case 'google':
          connectorInstance = new GoogleConnector();
          break;
        case 'notion':
          connectorInstance = new NotionConnector();
          break;
        default:
          throw new Error(`Unknown connector: ${connector}`);
      }

      // Fetch raw data
      const rawData = await connectorInstance.fetch(userId);

      // Map to canonical format
      const canonicalData = await connectorInstance.mapToCanonical(rawData, tenantId);

      // Persist to database
      let itemsSynced = 0;

      // Insert tasks — delete old ones first to remove stale/deleted tasks
      if (canonicalData.tasks.length > 0) {
        const sources = [...new Set(canonicalData.tasks.map(t => t.source))];

        // Delete existing tasks from this source to avoid stale data
        for (const source of sources) {
          await (supabaseServer as any)
            .from('tasks')
            .delete()
            .eq('tenant_id', tenantId)
            .eq('source', source);
        }

        const tasksToInsert = canonicalData.tasks.map(task => ({
          ...task,
          tenant_id: tenantId,
        }));

        const { error } = await (supabaseServer
          .from('tasks')
          .insert(tasksToInsert as any) as any);

        if (error) {
          console.error('[Sync Worker] Error inserting tasks:', error);
        } else {
          itemsSynced += canonicalData.tasks.length;
        }
      }

      // Insert events
      if (canonicalData.events.length > 0) {
        const eventsToInsert = canonicalData.events.map(event => ({
          ...event,
          tenant_id: tenantId,
        }));

        const { error } = await (supabaseServer
          .from('events')
          .upsert(eventsToInsert as any, {
            onConflict: 'tenant_id,source,source_id',
          }) as any);

        if (error) {
          console.error('[Sync Worker] Error inserting events:', error);
        } else {
          itemsSynced += canonicalData.events.length;
        }
      }

      // Insert messages
      if (canonicalData.messages.length > 0) {
        const messagesToInsert = canonicalData.messages.map(message => ({
          ...message,
          tenant_id: tenantId,
        }));

        const { error } = await (supabaseServer
          .from('messages')
          .upsert(messagesToInsert as any, {
            onConflict: 'tenant_id,source,source_id',
          }) as any);

        if (error) {
          console.error('[Sync Worker] Error inserting messages:', error);
        } else {
          itemsSynced += canonicalData.messages.length;
        }
      }

      // Insert documents
      if (canonicalData.documents.length > 0) {
        const documentsToInsert = canonicalData.documents.map(document => ({
          ...document,
          tenant_id: tenantId,
        }));

        const { error } = await (supabaseServer
          .from('documents')
          .upsert(documentsToInsert as any, {
            onConflict: 'tenant_id,source,source_id',
          }) as any);

        if (error) {
          console.error('[Sync Worker] Error inserting documents:', error);
        } else {
          itemsSynced += canonicalData.documents.length;
        }
      }

      // Update sync job as completed
      await (supabaseServer as any)
        .from('sync_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          items_synced: itemsSynced,
        })
        .eq('id', syncJob!.id);

      console.log(`[Sync Worker] Completed ${connector} sync: ${itemsSynced} items synced`);

      return { success: true, itemsSynced };
    } catch (error) {
      console.error(`[Sync Worker] Error during ${connector} sync:`, error);

      // Update sync job as failed
      await (supabaseServer as any)
        .from('sync_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: (error as Error).message,
        })
        .eq('id', syncJob!.id);

      throw error; // Re-throw for BullMQ retry mechanism
    }
  },
  {
    connection: connection as unknown as ConnectionOptions,
    concurrency: 5, // Process up to 5 sync jobs concurrently
  }
);

// Worker event handlers
syncWorker.on('completed', (job) => {
  console.log(`[Sync Worker] Job ${job.id} completed successfully`);
});

syncWorker.on('failed', (job, err) => {
  console.error(`[Sync Worker] Job ${job?.id} failed:`, err.message);
});

syncWorker.on('error', (err) => {
  console.error('[Sync Worker] Worker error:', err);
});

console.log('[Sync Worker] Started and ready to process sync jobs');
