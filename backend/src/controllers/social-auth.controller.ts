import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';
import * as meta from '../services/social/meta.service';
import * as linkedin from '../services/social/linkedin.service';
import * as tiktok from '../services/social/tiktok.service';
import { SocialPlatform } from '@prisma/client';

// In-memory state store for OAuth CSRF protection
// ponytail: in-memory map, move to Redis if multi-instance
const oauthStates = new Map<string, { contactId: number; platform: SocialPlatform; expiresAt: number }>();

// Cleanup expired states every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of oauthStates) {
    if (val.expiresAt < now) oauthStates.delete(key);
  }
}, 600_000).unref();

/**
 * GET /api/social/auth/:platform
 * Redirect user to platform OAuth flow
 */
export const startOAuth = async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform?.toUpperCase() as SocialPlatform;
    const contactId = parseInt(req.query.contactId as string);

    if (!contactId || isNaN(contactId)) {
      return res.status(400).json({ success: false, message: 'contactId richiesto' });
    }

    if (!Object.values(SocialPlatform).includes(platform)) {
      return res.status(400).json({ success: false, message: 'Piattaforma non supportata' });
    }

    // Verify contact exists
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contatto non trovato' });
    }

    const state = crypto.randomBytes(16).toString('hex');
    oauthStates.set(state, { contactId, platform, expiresAt: Date.now() + 600_000 }); // 10 min

    let authUrl: string;
    switch (platform) {
      case 'INSTAGRAM':
      case 'FACEBOOK':
        authUrl = meta.getMetaAuthUrl(platform, state);
        break;
      case 'LINKEDIN':
        authUrl = linkedin.getLinkedInAuthUrl(state);
        break;
      case 'TIKTOK':
        authUrl = tiktok.getTikTokAuthUrl(state);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Piattaforma non supportata' });
    }

    return res.json({ success: true, data: { authUrl } });
  } catch (error: any) {
    console.error('[social-auth]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * GET /api/social/auth/:platform/callback
 * Handle OAuth callback, store tokens
 */
export const handleOAuthCallback = async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform?.toUpperCase() as SocialPlatform;
    const { code, state, error: oauthError } = req.query;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';

    if (oauthError) {
      return res.redirect(`${frontendUrl}/social?error=${encodeURIComponent(oauthError as string)}`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/social?error=missing_params`);
    }

    // Validate state
    const stateData = oauthStates.get(state as string);
    if (!stateData || stateData.expiresAt < Date.now() || stateData.platform !== platform) {
      return res.redirect(`${frontendUrl}/social?error=invalid_state`);
    }
    oauthStates.delete(state as string);

    const { contactId } = stateData;

    // Helper: upsert a single social account
    const upsertAccount = async (data: {
      platform: SocialPlatform;
      platformId: string;
      platformName: string;
      accessToken: string;
      refreshToken?: string;
      expiresIn: number;
      profilePicUrl?: string;
      metadata?: any;
    }) => {
      const tokenExpiresAt = new Date(Date.now() + data.expiresIn * 1000);
      await prisma.socialAccount.upsert({
        where: { platform_platformId: { platform: data.platform, platformId: data.platformId } },
        create: {
          contactId,
          platform: data.platform,
          platformId: data.platformId,
          platformName: data.platformName,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          tokenExpiresAt,
          profilePicUrl: data.profilePicUrl,
          metadata: data.metadata,
        },
        update: {
          contactId,
          platformName: data.platformName,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          tokenExpiresAt,
          profilePicUrl: data.profilePicUrl,
          metadata: data.metadata,
          isActive: true,
        },
      });
    };

    // Meta (Facebook + Instagram): connect ALL managed pages and their IG business accounts
    if (platform === 'INSTAGRAM' || platform === 'FACEBOOK') {
      const tokens = await meta.exchangeMetaCode(code as string, platform);
      const pages = await meta.getMetaPages(tokens.accessToken);
      if (!pages.length) {
        return res.redirect(`${frontendUrl}/social/${contactId}/accounts?error=no_pages`);
      }

      let connected = 0;
      for (const page of pages) {
        // Facebook page account
        const fbPic = await meta.getMetaProfilePic('FACEBOOK', page.id, page.accessToken);
        await upsertAccount({
          platform: 'FACEBOOK', platformId: page.id, platformName: page.name,
          accessToken: page.accessToken, expiresIn: tokens.expiresIn, profilePicUrl: fbPic,
          metadata: { pageId: page.id },
        });
        connected++;

        // Instagram business account (if the page has one linked)
        if (page.instagramAccountId) {
          const ig = await meta.getMetaInstagramProfile(page.instagramAccountId, page.accessToken);
          await upsertAccount({
            platform: 'INSTAGRAM', platformId: page.instagramAccountId,
            platformName: ig.username || page.name, accessToken: page.accessToken, expiresIn: tokens.expiresIn,
            profilePicUrl: ig.profilePicUrl,
            metadata: { instagramAccountId: page.instagramAccountId, pageId: page.id },
          });
          connected++;
        }
      }
      return res.redirect(`${frontendUrl}/social/${contactId}/accounts?success=true&platform=${platform.toLowerCase()}&count=${connected}`);
    }

    // LinkedIn: import the user's managed organization pages (like Meta imports pages).
    // Falls back to the personal profile if no pages are found.
    if (platform === 'LINKEDIN') {
      const tokens = await linkedin.exchangeLinkedInCode(code as string);

      const orgs = await linkedin.getLinkedInOrganizations(tokens.accessToken);
      if (orgs.length) {
        let connected = 0;
        for (const org of orgs) {
          const logo = await linkedin.getLinkedInOrgLogo(tokens.accessToken, org.id);
          await upsertAccount({
            platform: 'LINKEDIN',
            platformId: org.id,
            platformName: org.name,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            profilePicUrl: logo,
            metadata: { organizationId: org.id, isOrganization: true },
          });
          connected++;
        }
        return res.redirect(`${frontendUrl}/social/${contactId}/accounts?success=true&platform=linkedin&count=${connected}`);
      }

      // Fallback: personal profile
      const profile = await linkedin.getLinkedInProfile(tokens.accessToken);
      await upsertAccount({
        platform: 'LINKEDIN',
        platformId: profile.id,
        platformName: profile.name,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        profilePicUrl: profile.profilePicUrl,
        metadata: { isOrganization: false },
      });
      return res.redirect(`${frontendUrl}/social/${contactId}/accounts?success=true&platform=linkedin&count=1`);
    }

    // TikTok: single account
    if (platform === 'TIKTOK') {
      const tokens = await tiktok.exchangeTikTokCode(code as string);
      const profile = await tiktok.getTikTokProfile(tokens.accessToken);
      await upsertAccount({
        platform: 'TIKTOK',
        platformId: profile.id || tokens.openId,
        platformName: profile.name,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        profilePicUrl: profile.profilePicUrl,
      });
      return res.redirect(`${frontendUrl}/social/${contactId}/accounts?success=true&platform=tiktok`);
    }

    return res.redirect(`${frontendUrl}/social?error=unsupported_platform`);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    return res.redirect(`${frontendUrl}/social?error=oauth_failed`);
  }
};

/**
 * POST /api/social/auth/meta/data-deletion
 * Meta "Data Deletion Request Callback" — Meta calls this endpoint (public, no auth)
 * with a signed_request when a user asks to delete their data from the app.
 * We verify the HMAC signature, then return the confirmation JSON Meta expects.
 */
export const metaDataDeletion = async (req: Request, res: Response) => {
  try {
    const signedRequest: string =
      req.body?.signed_request || req.body?.signedRequest || '';

    if (!signedRequest) {
      return res.status(400).json({ error: 'signed_request mancante' });
    }

    const parts = signedRequest.split('.');
    if (parts.length !== 2) {
      return res.status(400).json({ error: 'signed_request non valido' });
    }

    const [encodedSig, payload] = parts;
    const secret = process.env.META_APP_SECRET || '';

    // Facebook signed_request = <base64url(HMAC-SHA256(payload, secret))>.<base64url(payload)>
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    if (expectedSig !== encodedSig) {
      return res.status(400).json({ error: 'firma non valida' });
    }

    // Decode the payload (base64url → JSON)
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const data = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));

    const userId = data.user_id || 'unknown';
    const confirmationCode = crypto.randomBytes(20).toString('hex');

    // Log for manual processing (mapping Meta user_id → our data is handled by support)
    console.log(`[meta][data-deletion] richiesta eliminazione dati — user_id=${userId} confirmation_code=${confirmationCode}`);

    return res.json({
      url: `https://studiomismo.com/data-deletion?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error: any) {
    console.error('[meta][data-deletion]', error.message);
    return res.status(400).json({ error: 'errore durante l\'elaborazione' });
  }
};
