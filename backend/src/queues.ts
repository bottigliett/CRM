import dotenv from 'dotenv';
import path from 'path';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';

dotenv.config({ path: path.join(__dirname, '../.env') });

export const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Note: BullMQ 6 rejects ':' in queue names, so use '-' instead.
export const publishQueue = new Queue('social-publish', { connection });
export const analyticsQueue = new Queue('social-analytics', { connection });
export const tokenRefreshQueue = new Queue('social-token-refresh', { connection });
export const reportQueue = new Queue('social-report', { connection });
export const postMetricsQueue = new Queue('social-post-metrics', { connection });
export const sessionHealthQueue = new Queue('social-session-health', { connection });
export const transcriptionQueue = new Queue('social-transcription', { connection });
export const briefRefreshQueue = new Queue('social-brief-refresh', { connection });
