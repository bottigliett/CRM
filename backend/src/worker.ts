/**
 * Social Media Worker — separate process
 * Run: ts-node src/worker.ts
 *
 * Handles: scheduled publishing, analytics collection, token refresh, report generation
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { Worker } from 'bullmq';
import prisma from './config/database';
import { publishPost } from './services/social/publisher.service';
import { collectAllAnalytics, collectRecentPostMetrics } from './services/social/analytics-collector.service';
import {
  connection,
  publishQueue,
  analyticsQueue,
  tokenRefreshQueue,
  postMetricsQueue,
  sessionHealthQueue,
  transcriptionQueue,
  briefRefreshQueue,
} from './queues';

// === Workers ===

// ponytail: concurrency 2 — browser publishing is CPU/memory heavy
const publishWorker = new Worker('social-publish', async (job) => {
  const { postId } = job.data;
  console.log(`[publish] Publishing post ${postId}`);
  await publishPost(postId);
}, {
  connection,
  concurrency: 2,
});

publishWorker.on('failed', (job, err) => {
  console.error(`[publish] Job ${job?.id} failed:`, err.message);
});

const analyticsWorker = new Worker('social-analytics', async () => {
  console.log('[analytics] Collecting daily analytics...');
  const result = await collectAllAnalytics();
  console.log(`[analytics] Done: ${result.success} success, ${result.failed} failed`);
}, {
  connection,
  concurrency: 1,
});

// === Post Metrics Worker ===
const postMetricsWorker = new Worker('social-post-metrics', async (job) => {
  // Batch mode: collect metrics for all recent posts
  if (job.data.batch) {
    console.log('[post-metrics] Running batch collection for recent posts...');
    const result = await collectRecentPostMetrics();
    console.log(`[post-metrics] Batch done: ${result.success} success, ${result.failed} failed`);
    return;
  }

  const { postId, checkpoint } = job.data as { postId: number; checkpoint: string };
  console.log(`[post-metrics] Collecting ${checkpoint} metrics for post ${postId}`);

  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    include: { targets: { include: { socialAccount: true } } },
  });

  if (!post || post.status !== 'PUBLISHED') return;

  for (const target of post.targets) {
    if (!target.platformPostId) continue;
    const account = target.socialAccount;
    if (!account.accessToken) continue; // Skip browser-only accounts

    try {
      let metrics: any = {};

      switch (account.platform) {
        case 'INSTAGRAM': {
          const meta = await import('./services/social/meta.service');
          metrics = await meta.getInstagramMediaInsights(account.accessToken!, target.platformPostId);
          break;
        }
        case 'FACEBOOK': {
          const meta = await import('./services/social/meta.service');
          metrics = await meta.getFacebookPostInsights(account.accessToken!, target.platformPostId);
          break;
        }
        case 'LINKEDIN': {
          const li = await import('./services/social/linkedin.service');
          const stats = await li.getLinkedInShareStats(account.accessToken!, target.platformPostId);
          metrics = { likes: stats.likes, comments: stats.comments, shares: stats.shares, impressions: stats.impressions, linkClicks: stats.clicks };
          break;
        }
        case 'TIKTOK': {
          const tt = await import('./services/social/tiktok.service');
          const stats = await tt.getTikTokVideoStats(account.accessToken!, target.platformPostId);
          metrics = { likes: stats.likes, comments: stats.comments, shares: stats.shares, videoViews: stats.views };
          break;
        }
        default:
          continue;
      }

      await prisma.socialPostMetrics.upsert({
        where: {
          postId_socialAccountId_checkpoint: {
            postId,
            socialAccountId: target.socialAccountId,
            checkpoint,
          },
        },
        create: {
          postId,
          socialAccountId: target.socialAccountId,
          checkpoint,
          likes: metrics.likes ?? null,
          comments: metrics.comments ?? null,
          shares: metrics.shares ?? null,
          saves: metrics.saves ?? null,
          reach: metrics.reach ?? null,
          impressions: metrics.impressions ?? null,
          videoViews: metrics.videoViews ?? null,
          rawData: metrics,
        },
        update: {
          likes: metrics.likes ?? null,
          comments: metrics.comments ?? null,
          shares: metrics.shares ?? null,
          saves: metrics.saves ?? null,
          reach: metrics.reach ?? null,
          impressions: metrics.impressions ?? null,
          videoViews: metrics.videoViews ?? null,
          rawData: metrics,
          collectedAt: new Date(),
        },
      });
      console.log(`[post-metrics] Saved ${checkpoint} metrics for post ${postId} / account ${account.id}`);
    } catch (err: any) {
      console.error(`[post-metrics] Failed for target ${target.id}:`, err.message);
    }
  }
}, {
  connection,
  concurrency: 3,
});

postMetricsWorker.on('failed', (job, err) => {
  console.error(`[post-metrics] Job ${job?.id} failed:`, err.message);
});

const tokenRefreshWorker = new Worker('social-token-refresh', async () => {
  console.log('[token-refresh] Checking expiring tokens...');
  const sevenDaysFromNow = new Date(Date.now() + 7 * 86400_000);

  const expiring = await prisma.socialAccount.findMany({
    where: {
      isActive: true,
      tokenExpiresAt: { lte: sevenDaysFromNow },
    },
  });

  console.log(`[token-refresh] Found ${expiring.length} expiring tokens`);

  for (const account of expiring) {
    if (!account.accessToken) continue; // Skip browser-only accounts
    try {
      let newToken: string;
      let newRefresh: string | undefined;
      let expiresIn: number;

      switch (account.platform) {
        case 'INSTAGRAM':
        case 'FACEBOOK': {
          const meta = await import('./services/social/meta.service');
          const result = await meta.refreshMetaToken(account.accessToken!);
          newToken = result.accessToken;
          expiresIn = result.expiresIn;
          break;
        }
        case 'LINKEDIN': {
          if (!account.refreshToken) continue;
          const linkedin = await import('./services/social/linkedin.service');
          const result = await linkedin.refreshLinkedInToken(account.refreshToken);
          newToken = result.accessToken;
          newRefresh = result.refreshToken;
          expiresIn = result.expiresIn;
          break;
        }
        case 'TIKTOK': {
          if (!account.refreshToken) continue;
          const tiktok = await import('./services/social/tiktok.service');
          const result = await tiktok.refreshTikTokToken(account.refreshToken);
          newToken = result.accessToken;
          newRefresh = result.refreshToken;
          expiresIn = result.expiresIn;
          break;
        }
        default:
          continue;
      }

      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessToken: newToken,
          ...(newRefresh && { refreshToken: newRefresh }),
          tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        },
      });
      console.log(`[token-refresh] Refreshed token for ${account.platform} account ${account.id}`);
    } catch (err: any) {
      console.error(`[token-refresh] Failed for account ${account.id}:`, err.message);
      // Create notification for admin
      // ponytail: direct DB insert, proper notification service when volume matters
      await prisma.notification.create({
        data: {
          userId: 1, // ponytail: hardcoded admin, use configurable admin list when needed
          type: 'SYSTEM',
          title: 'Token social in scadenza',
          message: `Il token ${account.platform} per ${account.platformName} non è stato rinnovato: ${err.message}`,
          link: account.contactId ? `/social/${account.contactId}/accounts` : '/social/accounts',
        },
      });
    }
  }
}, {
  connection,
  concurrency: 1,
});

// === Transcription Worker ===
// Local Whisper transcription for reels/videos (CPU heavy → concurrency 1)

const transcriptionWorker = new Worker('social-transcription', async (job) => {
  const { postId } = job.data;
  console.log(`[transcription] Transcribing post ${postId}`);
  const { transcribePostMedia } = await import('./services/social/transcription.service');
  await transcribePostMedia(postId);
}, {
  connection,
  concurrency: 1,
});

transcriptionWorker.on('failed', (job, err) => {
  console.error(`[transcription] Job ${job?.id} failed:`, err.message);
});

// === Brief Refresh Worker ===
// Rebuilds a client's AI knowledge block (actors/themes/trends/best-times) in the brief

const briefRefreshWorker = new Worker('social-brief-refresh', async (job) => {
  if (job.data.batch) {
    console.log('[brief-refresh] Batch refresh for all clients...');
    const { refreshClientBrief } = await import('./services/social/ai.service');
    const contacts = await prisma.contact.findMany({
      where: { socialPosts: { some: {} } },
      select: { id: true },
    });
    for (const c of contacts) {
      try {
        await refreshClientBrief(c.id);
        console.log(`[brief-refresh] Client ${c.id} brief updated`);
      } catch (err: any) {
        console.error(`[brief-refresh] Client ${c.id} failed:`, err.message);
      }
    }
    return;
  }

  const { contactId } = job.data as { contactId: number };
  console.log(`[brief-refresh] Refreshing brief for client ${contactId}`);
  const { refreshClientBrief } = await import('./services/social/ai.service');
  await refreshClientBrief(contactId);
}, {
  connection,
  concurrency: 2,
});

briefRefreshWorker.on('failed', (job, err) => {
  console.error(`[brief-refresh] Job ${job?.id} failed:`, err.message);
});

// === Session Health Worker ===
// ponytail: sequential checks (concurrency 1), Chromium is heavy

const sessionHealthWorker = new Worker('social-session-health', async () => {
  console.log('[session-health] Checking browser sessions...');
  const { getSessionStatus, checkSessionHealth } = await import('./services/social/browser/browser-session.service');

  // Find accounts that use browser (browserOnly or browserFallback)
  const accounts = await prisma.socialAccount.findMany({
    where: { isActive: true },
    include: { contact: { select: { id: true, name: true } } },
  });

  const browserAccounts = accounts.filter(a => {
    const meta = (a.metadata as any) || {};
    return meta.browserOnly || meta.browserFallback || !a.accessToken;
  });

  if (!browserAccounts.length) return;
  console.log(`[session-health] Checking ${browserAccounts.length} browser accounts`);

  for (const account of browserAccounts) {
    const status = await getSessionStatus(account.id, account.platform);
    if (!status.hasSavedProfile) {
      // No profile at all — alert
      await createSessionAlert(account, 'NO_SESSION', 'Nessuna sessione browser salvata');
      continue;
    }

    // Deep check — actually open the browser and see if logged in
    const healthy = await checkSessionHealth(account.id, account.platform);
    if (!healthy) {
      await createSessionAlert(account, 'SESSION_EXPIRED', 'Sessione browser scaduta — necessario re-login');

      // Check if there are scheduled posts that would fail
      const scheduledPosts = await prisma.socialPost.findMany({
        where: {
          status: 'SCHEDULED',
          targets: { some: { socialAccountId: account.id } },
        },
        select: { id: true, scheduledAt: true },
      });
      if (scheduledPosts.length > 0) {
        await createSessionAlert(
          account,
          'POSTS_AT_RISK',
          `${scheduledPosts.length} post programmati a rischio — sessione ${account.platform} scaduta`
        );
      }
    } else {
      console.log(`[session-health] ${account.platform} account ${account.id} (${account.platformName}): OK`);
    }
  }
}, {
  connection,
  concurrency: 1,
});

sessionHealthWorker.on('failed', (job, err) => {
  console.error(`[session-health] Job ${job?.id} failed:`, err.message);
});

async function createSessionAlert(
  account: { id: number; platform: string; platformName: string; contactId: number | null; contact?: { name: string } | null },
  type: string,
  message: string
) {
  console.warn(`[session-health] ALERT ${type}: ${message} (account ${account.id} - ${account.platformName})`);
  // ponytail: hardcoded admin user id 1, configurable when multi-admin
  await prisma.notification.create({
    data: {
      userId: 1,
      type: 'SYSTEM',
      title: `Sessione Social: ${account.platformName}`,
      message: `${message} — Cliente: ${account.contact?.name || account.contactId || 'Non assegnato'}`,
      link: account.contactId ? `/social/${account.contactId}?tab=accounts` : '/social/accounts',
    },
  });
}

// === Scheduler: check for posts to publish ===

async function checkScheduledPosts() {
  const now = new Date();
  const posts = await prisma.socialPost.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
    },
    select: { id: true },
  });

  for (const post of posts) {
    await publishQueue.add('publish', { postId: post.id }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60_000 },
      jobId: `publish-${post.id}`, // Prevent duplicates
    });
  }

  if (posts.length) {
    console.log(`[scheduler] Enqueued ${posts.length} posts for publishing`);
  }
}

// === Cron setup ===

async function setupCrons() {
  // Check for scheduled posts every minute
  setInterval(checkScheduledPosts, 60_000);

  // Daily analytics at 03:00
  await analyticsQueue.upsertJobScheduler('analytics-daily', { pattern: '0 3 * * *' }, { name: 'collect', data: {} });

  // Daily batch post-metrics at 04:00 — refresh metrics for all posts published in last 30 days
  await postMetricsQueue.upsertJobScheduler('post-metrics-batch', { pattern: '0 4 * * *' }, { name: 'batch', data: { batch: true } });

  // Token refresh every 6 hours
  await tokenRefreshQueue.upsertJobScheduler('token-refresh-6h', { pattern: '0 */6 * * *' }, { name: 'refresh', data: {} });

  // Browser session health check every 12 hours
  await sessionHealthQueue.upsertJobScheduler('session-health-12h', { pattern: '0 */12 * * *' }, { name: 'check', data: {} });

  // Weekly brief refresh — Monday 03:30 rebuilds AI knowledge (actors/themes/trends/best-times) for all clients
  await briefRefreshQueue.upsertJobScheduler('brief-refresh-weekly', { pattern: '30 3 * * 1' }, { name: 'batch', data: { batch: true } });

  console.log('[worker] Cron jobs configured');
}

// === Startup ===

async function start() {
  console.log('[worker] Social media worker starting...');
  await setupCrons();
  // Run initial check
  await checkScheduledPosts();
  console.log('[worker] Ready and processing jobs');
}

start().catch(err => {
  console.error('[worker] Fatal error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[worker] Shutting down...');
  await publishWorker.close();
  await analyticsWorker.close();
  await postMetricsWorker.close();
  await tokenRefreshWorker.close();
  await sessionHealthWorker.close();
  await transcriptionWorker.close();
  await briefRefreshWorker.close();
  await connection.quit();
  process.exit(0);
});
