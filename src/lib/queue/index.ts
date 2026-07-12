// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import { Queue, Worker, QueueEvents, ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';

// Redis connection
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Cast to ConnectionOptions to fix type compatibility
const connectionOptions = connection as unknown as ConnectionOptions;

// Sync queue for all connectors
export const syncQueue = new Queue('sync', {
  connection: connectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
    },
  },
});

// Queue events for monitoring
export const syncQueueEvents = new QueueEvents('sync', { connection: connectionOptions });

// Health check function
export async function getQueueHealth() {
  try {
    const jobCounts = await syncQueue.getJobCounts();
    const workers = await syncQueue.getWorkers();
    
    return {
      status: 'healthy',
      jobCounts,
      activeWorkers: workers.length,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: (error as Error).message,
    };
  }
}

// Export queue for use in other files
export { connection };
