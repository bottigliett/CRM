import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * GET /api/social/analytics/overview
 * Cross-client + cross-platform aggregate: best platform / best client comparison.
 */
export const getAnalyticsOverview = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, platform } = req.query;

    const accounts = await prisma.socialAccount.findMany({
      where: { isActive: true, ...(platform && { platform: platform as any }) },
      select: { id: true, platform: true, platformName: true, contactId: true, contact: { select: { name: true } } },
    });

    const accountIds = accounts.map(a => a.id);
    if (!accountIds.length) {
      return res.json({ success: true, data: { byPlatform: [], byClient: [] } });
    }

    const where: any = { socialAccountId: { in: accountIds } };
    if (startDate) where.date = { ...where.date, gte: new Date(startDate as string) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate as string) };

    const analytics = await prisma.socialAnalyticsDaily.findMany({ where, orderBy: { date: 'asc' } });

    // Per-account aggregates: reach/engagement/impressions are sums, followers is latest snapshot
    const perAccount = new Map<number, { followers: number; growth: number; reach: number; engagement: number; impressions: number }>();
    const latest: Record<number, number> = {};
    const earliest: Record<number, number> = {};
    const latestDate: Record<number, Date> = {};
    const earliestDate: Record<number, Date> = {};

    for (const a of analytics) {
      let e = perAccount.get(a.socialAccountId);
      if (!e) { e = { followers: 0, growth: 0, reach: 0, engagement: 0, impressions: 0 }; perAccount.set(a.socialAccountId, e); }
      e.reach += a.reach ?? 0;
      e.engagement += a.engagement ?? 0;
      e.impressions += a.impressions ?? 0;
      if (!latestDate[a.socialAccountId] || a.date > latestDate[a.socialAccountId]) {
        latestDate[a.socialAccountId] = a.date; latest[a.socialAccountId] = a.followers ?? 0;
      }
      if (!earliestDate[a.socialAccountId] || a.date < earliestDate[a.socialAccountId]) {
        earliestDate[a.socialAccountId] = a.date; earliest[a.socialAccountId] = a.followers ?? 0;
      }
    }
    for (const id of accountIds) {
      const e = perAccount.get(id);
      if (!e) continue;
      e.followers = latest[id] ?? 0;
      e.growth = (latest[id] ?? 0) - (earliest[id] ?? 0);
    }

    const byPlatformMap: Record<string, any> = {};
    const byClientMap: Record<number, any> = {};

    for (const acc of accounts) {
      const e = perAccount.get(acc.id) || { followers: 0, growth: 0, reach: 0, engagement: 0, impressions: 0 };

      if (!byPlatformMap[acc.platform]) {
        byPlatformMap[acc.platform] = { platform: acc.platform, platformName: acc.platformName, followers: 0, growth: 0, reach: 0, engagement: 0, impressions: 0, accountCount: 0 };
      }
      const p = byPlatformMap[acc.platform];
      p.followers += e.followers; p.growth += e.growth; p.reach += e.reach; p.engagement += e.engagement; p.impressions += e.impressions; p.accountCount += 1;

      if (!byClientMap[acc.contactId]) {
        byClientMap[acc.contactId] = { contactId: acc.contactId, name: acc.contact?.name || `#${acc.contactId}`, followers: 0, growth: 0, reach: 0, engagement: 0, impressions: 0, accounts: [] };
      }
      const c = byClientMap[acc.contactId];
      c.followers += e.followers; c.growth += e.growth; c.reach += e.reach; c.engagement += e.engagement; c.impressions += e.impressions;
      c.accounts.push({ id: acc.id, platform: acc.platform, platformName: acc.platformName });
    }

    return res.json({ success: true, data: { byPlatform: Object.values(byPlatformMap), byClient: Object.values(byClientMap) } });
  } catch (error: any) {
    console.error('[social-analytics]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * GET /api/social/analytics/:contactId
 */
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.contactId);
    const { startDate, endDate, platform } = req.query;

    const accounts = await prisma.socialAccount.findMany({
      where: {
        contactId,
        isActive: true,
        ...(platform && { platform: platform as any }),
      },
      select: { id: true, platform: true, platformName: true },
    });

    if (!accounts.length) {
      return res.json({ success: true, data: { accounts: [], analytics: [] } });
    }

    const accountIds = accounts.map(a => a.id);

    const where: any = {
      socialAccountId: { in: accountIds },
    };
    if (startDate) where.date = { ...where.date, gte: new Date(startDate as string) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate as string) };

    const analytics = await prisma.socialAnalyticsDaily.findMany({
      where,
      orderBy: { date: 'asc' },
      include: { socialAccount: { select: { id: true, platform: true, platformName: true } } },
    });

    // Compute summary KPIs
    const latestByAccount = new Map<number, typeof analytics[0]>();
    const earliestByAccount = new Map<number, typeof analytics[0]>();
    for (const a of analytics) {
      if (!latestByAccount.has(a.socialAccountId) || a.date > latestByAccount.get(a.socialAccountId)!.date) {
        latestByAccount.set(a.socialAccountId, a);
      }
      if (!earliestByAccount.has(a.socialAccountId) || a.date < earliestByAccount.get(a.socialAccountId)!.date) {
        earliestByAccount.set(a.socialAccountId, a);
      }
    }

    const summary = accounts.map(acc => {
      const latest = latestByAccount.get(acc.id);
      const earliest = earliestByAccount.get(acc.id);
      return {
        ...acc,
        followers: latest?.followers ?? null,
        followersGrowth: (latest?.followers ?? 0) - (earliest?.followers ?? 0),
        totalReach: analytics.filter(a => a.socialAccountId === acc.id).reduce((s, a) => s + (a.reach ?? 0), 0),
        totalImpressions: analytics.filter(a => a.socialAccountId === acc.id).reduce((s, a) => s + (a.impressions ?? 0), 0),
        totalEngagement: analytics.filter(a => a.socialAccountId === acc.id).reduce((s, a) => s + (a.engagement ?? 0), 0),
      };
    });

    return res.json({ success: true, data: { accounts, summary, analytics } });
  } catch (error: any) {
    console.error('[social-analytics]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * GET /api/social/analytics/:contactId/compare
 * Compare metrics across platforms
 */
export const compareAnalytics = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.contactId);
    const { startDate, endDate } = req.query;

    const accounts = await prisma.socialAccount.findMany({
      where: { contactId, isActive: true },
      select: { id: true, platform: true, platformName: true },
    });

    const accountIds = accounts.map(a => a.id);

    const where: any = { socialAccountId: { in: accountIds } };
    if (startDate) where.date = { ...where.date, gte: new Date(startDate as string) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate as string) };

    const analytics = await prisma.socialAnalyticsDaily.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    // Group by platform
    const byPlatform: Record<string, any[]> = {};
    for (const a of analytics) {
      const acc = accounts.find(ac => ac.id === a.socialAccountId);
      if (!acc) continue;
      if (!byPlatform[acc.platform]) byPlatform[acc.platform] = [];
      byPlatform[acc.platform].push(a);
    }

    return res.json({ success: true, data: { accounts, byPlatform } });
  } catch (error: any) {
    console.error('[social-analytics]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * GET /api/social/analytics/:contactId/posts
 * Published posts with their metrics for analytics drill-down
 */
export const getPostAnalytics = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.contactId);
    const { platform } = req.query;

    const where: any = { contactId, status: 'PUBLISHED', stage: 'PRODUCTION' };

    const posts = await prisma.socialPost.findMany({
      where,
      include: {
        targets: { include: { socialAccount: { select: { id: true, platform: true, platformName: true } } } },
        postMetrics: {
          orderBy: { collectedAt: 'desc' },
        },
        hashtags: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });

    // Filter by platform if requested
    const filtered = platform
      ? posts.filter(p => p.targets.some(t => t.socialAccount.platform === platform))
      : posts;

    // Compute aggregated metrics per post (latest checkpoint per account)
    const result = filtered.map(p => {
      const latestMetrics = new Map<string, typeof p.postMetrics[0]>();
      for (const m of p.postMetrics) {
        const key = `${m.socialAccountId}`;
        if (!latestMetrics.has(key) || m.collectedAt > latestMetrics.get(key)!.collectedAt) {
          latestMetrics.set(key, m);
        }
      }
      const metrics = Array.from(latestMetrics.values());
      return {
        id: p.id,
        content: p.content,
        postType: p.postType,
        publishedAt: p.publishedAt,
        platforms: p.targets.map(t => t.socialAccount.platform),
        hashtags: p.hashtags.map(h => h.hashtag),
        metrics: {
          likes: metrics.reduce((s, m) => s + (m.likes ?? 0), 0),
          comments: metrics.reduce((s, m) => s + (m.comments ?? 0), 0),
          shares: metrics.reduce((s, m) => s + (m.shares ?? 0), 0),
          saves: metrics.reduce((s, m) => s + (m.saves ?? 0), 0),
          reach: metrics.reduce((s, m) => s + (m.reach ?? 0), 0),
          impressions: metrics.reduce((s, m) => s + (m.impressions ?? 0), 0),
          engagement: metrics.reduce((s, m) => s + (m.engagement ?? 0), 0),
        },
      };
    });

    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[social-analytics]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * GET /api/social/analytics/:contactId/benchmark
 * Best posting times, top formats, top hashtags
 */
export const getBenchmark = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.contactId);

    // Top hashtags by frequency
    const topHashtags = await prisma.socialPostHashtag.groupBy({
      by: ['hashtag'],
      where: { post: { contactId, status: 'PUBLISHED' } },
      _count: { hashtag: true },
      orderBy: { _count: { hashtag: 'desc' } },
      take: 10,
    });

    // Best performing posts
    const publishedPosts = await prisma.socialPost.findMany({
      where: { contactId, status: 'PUBLISHED' },
      include: {
        targets: { include: { socialAccount: { select: { platform: true } } } },
        media: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });

    // Post type distribution
    const postTypeStats = await prisma.socialPost.groupBy({
      by: ['postType'],
      where: { contactId, status: 'PUBLISHED' },
      _count: { postType: true },
    });

    // Posting time distribution (hour of day)
    const postsByHour: Record<number, number> = {};
    for (const p of publishedPosts) {
      if (p.publishedAt) {
        const hour = p.publishedAt.getHours();
        postsByHour[hour] = (postsByHour[hour] || 0) + 1;
      }
    }

    return res.json({
      success: true,
      data: {
        topHashtags: topHashtags.map(h => ({ hashtag: h.hashtag, count: h._count.hashtag })),
        postTypeStats: postTypeStats.map(s => ({ type: s.postType, count: s._count.postType })),
        postsByHour,
        recentPostCount: publishedPosts.length,
      },
    });
  } catch (error: any) {
    console.error('[social-analytics]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};
