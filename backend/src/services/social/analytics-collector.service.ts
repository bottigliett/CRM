import prisma from '../../config/database';
import { SocialPlatform } from '@prisma/client';
import * as meta from './meta.service';
import * as linkedin from './linkedin.service';
import * as tiktok from './tiktok.service';

/**
 * Collect daily analytics for all active social accounts.
 * Called by the BullMQ worker on nightly cron.
 */
export async function collectAllAnalytics(): Promise<{ success: number; failed: number }> {
  const accounts = await prisma.socialAccount.findMany({
    where: { isActive: true },
  });

  let success = 0;
  let failed = 0;

  for (const account of accounts) {
    if (!account.accessToken) continue; // Skip browser-only accounts (no API token)
    try {
      await collectAccountAnalytics(account as typeof account & { accessToken: string });
      success++;
    } catch (err) {
      console.error(`Analytics collection failed for account ${account.id} (${account.platform}):`, err);
      failed++;
    }
  }

  return { success, failed };
}

async function collectAccountAnalytics(account: {
  id: number;
  platform: SocialPlatform;
  accessToken: string;
  platformId: string;
  metadata: any;
}): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const since = Math.floor(yesterday.getTime() / 1000);
  const until = Math.floor(today.getTime() / 1000);

  let metrics: Partial<{
    followers: number;
    followersGrowth: number;
    reach: number;
    impressions: number;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    videoViews: number;
    linkClicks: number;
    profileViews: number;
    rawData: any;
  }> = {};

  switch (account.platform) {
    case SocialPlatform.INSTAGRAM: {
      const igId = account.metadata?.instagramAccountId || account.platformId;
      const insights = await meta.getInstagramInsights(account.accessToken, igId, since, until);
      metrics = parseMetaInsights(insights);
      // IG insights API deprecated follower_count metric — fetch via account fields
      try {
        const fc = await meta.getInstagramFollowerCount(account.accessToken, igId);
        if (fc != null) metrics.followers = fc;
      } catch { /* non-critical */ }
      break;
    }
    case SocialPlatform.FACEBOOK: {
      const insights = await meta.getFacebookPageInsights(account.accessToken, account.platformId, since, until);
      metrics = parseMetaInsights(insights);
      break;
    }
    case SocialPlatform.LINKEDIN: {
      const orgId = account.metadata?.organizationId || account.platformId;
      const data = await linkedin.getLinkedInAnalytics(account.accessToken, orgId, since * 1000, until * 1000);
      metrics = parseLinkedInAnalytics(data);
      break;
    }
    case SocialPlatform.TIKTOK: {
      const videos = await tiktok.getTikTokVideoList(account.accessToken);
      metrics = parseTikTokAnalytics(videos);
      break;
    }
  }

  await prisma.socialAnalyticsDaily.upsert({
    where: {
      socialAccountId_date: {
        socialAccountId: account.id,
        date: yesterday,
      },
    },
    create: {
      socialAccountId: account.id,
      date: yesterday,
      ...metrics,
    },
    update: metrics,
  });

  await prisma.socialAccount.update({
    where: { id: account.id },
    data: { lastSyncAt: new Date() },
  });
}

function parseMetaInsights(insights: any[]): any {
  const result: any = { rawData: insights };
  if (!Array.isArray(insights)) return result;

  for (const metric of insights) {
    const value = metric.values?.[0]?.value ?? null;
    switch (metric.name) {
      case 'impressions':
      case 'page_impressions':
        result.impressions = value; break;
      case 'reach':
        result.reach = value; break;
      case 'follower_count':
      case 'page_fans':
        result.followers = value; break;
      case 'profile_views':
      case 'page_views_total':
        result.profileViews = value; break;
      case 'page_engaged_users':
      case 'page_post_engagements':
        result.engagement = value; break;
    }
  }
  return result;
}

function parseLinkedInAnalytics(elements: any[]): any {
  if (!Array.isArray(elements) || !elements.length) return {};
  const el = elements[0];
  return {
    impressions: el.totalShareStatistics?.impressionCount,
    engagement: el.totalShareStatistics?.engagementCount,
    likes: el.totalShareStatistics?.likeCount,
    comments: el.totalShareStatistics?.commentCount,
    shares: el.totalShareStatistics?.shareCount,
    linkClicks: el.totalShareStatistics?.clickCount,
    rawData: el,
  };
}

function parseTikTokAnalytics(videos: any[]): any {
  if (!Array.isArray(videos) || !videos.length) return {};
  // Aggregate last 24h of video stats (rough approximation)
  const totals = videos.reduce((acc, v) => ({
    likes: acc.likes + (v.like_count || 0),
    comments: acc.comments + (v.comment_count || 0),
    shares: acc.shares + (v.share_count || 0),
    videoViews: acc.videoViews + (v.view_count || 0),
  }), { likes: 0, comments: 0, shares: 0, videoViews: 0 });

  return { ...totals, rawData: videos.slice(0, 5) };
}

/**
 * Batch-collect metrics for all posts published in the last 30 days.
 * Called by the daily 04:00 cron via the post-metrics worker.
 */
export async function collectRecentPostMetrics(): Promise<{ success: number; failed: number }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);

  const targets = await prisma.socialPostTarget.findMany({
    where: {
      platformPostId: { not: null },
      post: { status: 'PUBLISHED', publishedAt: { gte: thirtyDaysAgo } },
    },
    include: { socialAccount: true, post: true },
  });

  let success = 0;
  let failed = 0;

  for (const target of targets) {
    const account = target.socialAccount;
    if (!account.accessToken || !target.platformPostId) continue;

    try {
      let metrics: any = {};

      switch (account.platform) {
        case SocialPlatform.INSTAGRAM:
          metrics = await meta.getInstagramMediaInsights(account.accessToken!, target.platformPostId);
          break;
        case SocialPlatform.FACEBOOK:
          metrics = await meta.getFacebookPostInsights(account.accessToken!, target.platformPostId);
          break;
        case SocialPlatform.LINKEDIN:
          const liStats = await linkedin.getLinkedInShareStats(account.accessToken!, target.platformPostId);
          metrics = { likes: liStats.likes, comments: liStats.comments, shares: liStats.shares, impressions: liStats.impressions };
          break;
        case SocialPlatform.TIKTOK:
          const ttStats = await tiktok.getTikTokVideoStats(account.accessToken!, target.platformPostId);
          metrics = { likes: ttStats.likes, comments: ttStats.comments, shares: ttStats.shares, videoViews: ttStats.views };
          break;
        default:
          continue;
      }

      await prisma.socialPostMetrics.upsert({
        where: {
          postId_socialAccountId_checkpoint: {
            postId: target.postId,
            socialAccountId: target.socialAccountId,
            checkpoint: 'daily',
          },
        },
        create: {
          postId: target.postId,
          socialAccountId: target.socialAccountId,
          checkpoint: 'daily',
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
      success++;
    } catch (err: any) {
      const msg = String(err?.message || '');
      // Detect posts removed/archived directly on the platform (Meta returns a
      // "not found"-style error) and reflect it in Mismo instead of keeping PUBLISHED.
      const isRemoved = /does not exist|not exist|invalid media|media id|object with id|unsupported get request|alias.*not exist/i.test(msg);
      if (isRemoved && account.platform === SocialPlatform.INSTAGRAM) {
        await prisma.socialPostTarget.update({
          where: { id: target.id },
          data: { status: 'ARCHIVED', errorMessage: 'Rimosso su Instagram' },
        });
        const remaining = await prisma.socialPostTarget.count({
          where: { postId: target.postId, status: { not: 'ARCHIVED' } },
        });
        if (remaining === 0) {
          await prisma.socialPost.update({
            where: { id: target.postId },
            data: { status: 'ARCHIVED' },
          });
        }
        console.log(`[post-metrics-batch] Post ${target.postId} marcato ARCHIVED (rimosso su Instagram)`);
      } else {
        console.error(`[post-metrics-batch] Failed for target ${target.id}:`, err);
      }
      failed++;
    }
  }

  return { success, failed };
}
