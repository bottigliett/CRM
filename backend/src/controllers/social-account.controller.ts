import { Request, Response } from 'express';
import prisma from '../config/database';
import * as meta from '../services/social/meta.service';
import * as linkedin from '../services/social/linkedin.service';
import * as tiktok from '../services/social/tiktok.service';

/**
 * GET /api/social/accounts
 */
export const getAccounts = async (req: Request, res: Response) => {
  try {
    const contactId = req.query.contactId ? parseInt(req.query.contactId as string) : undefined;

    const accounts = await prisma.socialAccount.findMany({
      where: {
        ...(contactId && { contactId }),
        isActive: true,
      },
      include: {
        contact: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Strip tokens from response
    const safe = accounts.map(({ accessToken, refreshToken, ...rest }) => rest);

    return res.json({ success: true, data: safe });
  } catch (error: any) {
    console.error('[social-account]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * DELETE /api/social/accounts/:id
 */
export const disconnectAccount = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.socialAccount.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({ success: true, message: 'Account disconnesso' });
  } catch (error: any) {
    console.error('[social-account]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * POST /api/social/accounts/:id/refresh
 */
export const refreshAccountToken = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const account = await prisma.socialAccount.findUnique({ where: { id } });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account non trovato' });
    }
    if (!account.accessToken) {
      return res.status(400).json({ success: false, message: 'Account browser-only, nessun token da rinnovare' });
    }

    let newAccessToken: string;
    let newRefreshToken: string | undefined;
    let expiresIn: number;

    switch (account.platform) {
      case 'INSTAGRAM':
      case 'FACEBOOK': {
        const result = await meta.refreshMetaToken(account.accessToken);
        newAccessToken = result.accessToken;
        expiresIn = result.expiresIn;
        break;
      }
      case 'LINKEDIN': {
        if (!account.refreshToken) throw new Error('No refresh token available');
        const result = await linkedin.refreshLinkedInToken(account.refreshToken);
        newAccessToken = result.accessToken;
        newRefreshToken = result.refreshToken;
        expiresIn = result.expiresIn;
        break;
      }
      case 'TIKTOK': {
        if (!account.refreshToken) throw new Error('No refresh token available');
        const result = await tiktok.refreshTikTokToken(account.refreshToken);
        newAccessToken = result.accessToken;
        newRefreshToken = result.refreshToken;
        expiresIn = result.expiresIn;
        break;
      }
      default:
        return res.status(400).json({ success: false, message: 'Piattaforma non supportata' });
    }

    await prisma.socialAccount.update({
      where: { id },
      data: {
        accessToken: newAccessToken,
        ...(newRefreshToken && { refreshToken: newRefreshToken }),
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });

    return res.json({ success: true, message: 'Token aggiornato' });
  } catch (error: any) {
    console.error('[social-account]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * PATCH /api/social/accounts/:id — update account metadata (browserFallback, browserOnly, etc.)
 */
export const updateAccount = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { metadata } = req.body;

    const account = await prisma.socialAccount.findUnique({ where: { id } });
    if (!account) return res.status(404).json({ success: false, message: 'Account non trovato' });

    // Merge new metadata with existing
    const existing = (account.metadata as Record<string, any>) || {};
    const merged = { ...existing, ...metadata };

    await prisma.socialAccount.update({
      where: { id },
      data: { metadata: merged },
    });

    return res.json({ success: true, data: { metadata: merged } });
  } catch (error: any) {
    console.error('[social-account]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/** Reassign an account to a different client (agency: import all profiles, then assign each to its client). */
export const moveAccount = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    // contactId can be null to unassign the account back to the global pool
    const contactId = req.body.contactId ? parseInt(req.body.contactId) : null;
    if (!id) return res.status(400).json({ success: false, message: 'id richiesto' });

    const account = await prisma.socialAccount.update({ where: { id }, data: { contactId } });
    return res.json({ success: true, data: account });
  } catch (error: any) {
    console.error('[social-account]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};
