import { Request, Response } from 'express';
import prisma from '../config/database';
import { SocialPlatform } from '@prisma/client';
import * as browserSession from '../services/social/browser/browser-session.service';

/**
 * POST /api/social/accounts/browser-connect
 * Create a browser-only account (no OAuth) and open Chromium for manual login.
 * Body: { contactId, platform, accountName }
 */
export async function browserConnect(req: Request, res: Response) {
  try {
    const { contactId, platform, accountName } = req.body;
    if (!contactId || !platform) {
      return res.status(400).json({ success: false, message: 'contactId e platform sono richiesti' });
    }

    const platformUpper = platform.toUpperCase() as SocialPlatform;
    if (!Object.values(SocialPlatform).includes(platformUpper)) {
      return res.status(400).json({ success: false, message: 'Piattaforma non supportata' });
    }

    const name = accountName || `${platform} (browser)`;
    // Use a unique placeholder platformId for browser-only accounts
    const platformId = `browser-${contactId}-${platformUpper}-${Date.now()}`;

    const account = await prisma.socialAccount.create({
      data: {
        contactId: Number(contactId),
        platform: platformUpper,
        platformId,
        platformName: name,
        // No accessToken — browser-only
        metadata: { browserOnly: true },
      },
    });

    // Open headed browser for manual login
    const result = await browserSession.openLoginBrowser(account.id, platformUpper);

    return res.json({ success: true, data: { accountId: account.id, url: result.url } });
  } catch (error: any) {
    console.error('[social-browser]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
}

/** POST /api/social/accounts/:id/browser-login — open headed browser for manual login */
export async function browserLogin(req: Request, res: Response) {
  try {
    const accountId = Number(req.params.id);
    const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    const result = await browserSession.openLoginBrowser(accountId, account.platform);
    res.json({ success: true, data: { url: result.url } });
  } catch (error: any) {
    console.error('[social-browser]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
}

/**
 * GET /api/social/accounts/auth-overview
 * Admin overview: all accounts with their connection method + health status
 */
export async function authOverview(req: Request, res: Response) {
  try {
    const accounts = await prisma.socialAccount.findMany({
      where: { isActive: true },
      include: { contact: { select: { id: true, name: true } } },
      orderBy: [{ contactId: 'asc' }, { platform: 'asc' }],
    });

    const results = await Promise.all(accounts.map(async (acc) => {
      const meta = (acc.metadata as any) || {};
      const status = await browserSession.getSessionStatus(acc.id, acc.platform);
      const isExpiring = acc.tokenExpiresAt && new Date(acc.tokenExpiresAt) < new Date(Date.now() + 7 * 86400_000);
      const isExpired = acc.tokenExpiresAt && new Date(acc.tokenExpiresAt) < new Date();

      // Count scheduled posts for this account
      const scheduledCount = await prisma.socialPostTarget.count({
        where: {
          socialAccountId: acc.id,
          status: 'SCHEDULED',
        },
      });

      return {
        id: acc.id,
        contactId: acc.contactId,
        contactName: acc.contact?.name || `#${acc.contactId}`,
        platform: acc.platform,
        platformName: acc.platformName,
        hasToken: !!acc.accessToken,
        tokenExpiring: !!isExpiring,
        tokenExpired: !!isExpired,
        tokenExpiresAt: acc.tokenExpiresAt,
        browserOnly: meta.browserOnly === true,
        browserFallback: meta.browserFallback === true,
        hasBrowserSession: status.hasSavedProfile,
        browserActive: status.active,
        scheduledPosts: scheduledCount,
        // Risk level
        risk: !acc.accessToken && !status.hasSavedProfile ? 'critical'
          : (isExpired && !status.hasSavedProfile) ? 'critical'
          : (isExpiring || (!acc.accessToken && status.hasSavedProfile)) ? 'warning'
          : 'ok',
      };
    }));

    return res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('[social-browser]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
}

/** GET /api/social/accounts/:id/browser-status — check if saved browser session exists */
export async function browserStatus(req: Request, res: Response) {
  try {
    const accountId = Number(req.params.id);
    const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    const status = await browserSession.getSessionStatus(accountId, account.platform);
    res.json({ success: true, data: status });
  } catch (error: any) {
    console.error('[social-browser]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
}

/** DELETE /api/social/accounts/:id/browser-session — delete saved browser profile */
export async function browserDeleteSession(req: Request, res: Response) {
  try {
    const accountId = Number(req.params.id);
    const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    await browserSession.deleteSession(accountId, account.platform);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[social-browser]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
}
