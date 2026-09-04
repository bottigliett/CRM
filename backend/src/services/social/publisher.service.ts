import prisma from '../../config/database';
import { SocialPlatform } from '@prisma/client';
import * as meta from './meta.service';
import * as linkedin from './linkedin.service';
import * as tiktok from './tiktok.service';
import { getSignedR2Url, downloadFromR2, uploadToR2 } from './r2.service';
import { uniquifyVideo } from './video-uniquifier.service';
import { convertToMp4 } from './video-processing.service';
import { uploadToTikTok } from './browser/tiktok-browser.service';
import { uploadToInstagram } from './browser/instagram-browser.service';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

/**
 * Publish a post to all its target accounts.
 * Called by the BullMQ worker when scheduledAt <= now.
 */
export async function publishPost(postId: number): Promise<void> {
  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    include: {
      targets: { include: { socialAccount: true } },
      hashtags: true,
    },
  });

  if (!post) throw new Error(`Post ${postId} not found`);

  // Guard: a post without target accounts can never publish — mark FAILED instead of "published"
  if (!post.targets.length) {
    await prisma.socialPost.update({ where: { id: postId }, data: { status: 'FAILED' } });
    throw new Error(`Post ${postId} has no target accounts`);
  }

  // Use mediaUrls from post (new inline upload path) or fall back to empty
  let mediaUrls: string[] = (post.mediaUrls as string[] | null) || [];

  // Video uniquification: re-encode video with randomized fingerprint before publishing
  const postMeta = (post.metadata as any) || {};
  if (postMeta.uniquifyMedia && mediaUrls.length > 0) {
    mediaUrls = await uniquifyMediaUrls(mediaUrls, post.contactId);
  }

  // Get platform-specific content overrides
  const platformContent = (post.platformContent as Record<string, string> | null) || {};

  // Append hashtags to the caption (they are stored separately and must go in the description)
  const hashtagStr = (post.hashtags || []).map(h => h.hashtag).filter(Boolean).join(' ');
  const withHashtags = (text: string) => (text && hashtagStr ? `${text}\n\n${hashtagStr}` : (text || hashtagStr));

  // Pre-flight validation: verify every target is ready BEFORE publishing anything.
  // All-or-nothing: if any target would fail, nothing goes out on any channel.
  const preflightErrors: string[] = [];
  for (const target of post.targets) {
    const account = target.socialAccount;
    const accountMeta = (account.metadata as any) || {};
    const browserOnly = accountMeta.browserOnly === true;
    const platformMediaOverride = (postMeta.platformMedia as any)?.[account.platform];
    const targetMedia = platformMediaOverride?.mediaUrls?.length ? platformMediaOverride.mediaUrls : mediaUrls;
    if (!browserOnly && !account.accessToken) {
      preflightErrors.push(`${account.platform}: account non collegato (nessun token)`);
    }
    if (account.platform === 'INSTAGRAM' || account.platform === 'TIKTOK') {
      if (!targetMedia.length) preflightErrors.push(`${account.platform}: nessun media caricato`);
    }
  }
  if (preflightErrors.length) {
    await prisma.socialPostTarget.updateMany({
      where: { postId },
      data: { status: 'FAILED', errorMessage: preflightErrors[0] },
    });
    await prisma.socialPost.update({ where: { id: postId }, data: { status: 'FAILED' } });
    if (post.targets[0]) {
      await prisma.publishLog.create({
        data: { postId, socialAccountId: post.targets[0].socialAccountId, action: 'FAIL', message: `Pre-flight fallito: ${preflightErrors.join('; ')}` },
      });
    }
    throw new Error(`Pre-flight failed: ${preflightErrors.join('; ')}`);
  }

  let allSuccess = true;
  const publishedTargets: Array<{ targetId: number; account: any; platform: SocialPlatform; platformPostId: string }> = [];

  for (const target of post.targets) {
    const account = target.socialAccount;
    // On retry, skip targets that already published successfully (avoid duplicates).
    if (target.status === 'PUBLISHED') continue;
    const content = withHashtags(platformContent[account.platform.toLowerCase()] || post.content);

    // Per-platform media override: different video/cover per social (e.g. IG vs FB reel)
    const platformMediaOverride = (postMeta.platformMedia as any)?.[account.platform];
    const targetMediaUrls = platformMediaOverride?.mediaUrls?.length ? platformMediaOverride.mediaUrls : mediaUrls;

    try {
      await prisma.socialPostTarget.update({
        where: { id: target.id },
        data: { status: 'PUBLISHING' },
      });

      const accountMeta = (account.metadata as any) || {};
      const browserOnly = accountMeta.browserOnly === true;
      const browserFallback = accountMeta.browserFallback === true;
      let platformPostId: string | undefined;
      let published = false;

      // --- API publish (skip if browserOnly or no token) ---
      if (!browserOnly && account.accessToken) {
        try {
          switch (account.platform) {
            case SocialPlatform.FACEBOOK: {
              const result = await meta.publishToFacebook(
                account.accessToken,
                account.platformId,
                content,
                targetMediaUrls.length ? targetMediaUrls : undefined
              );
              platformPostId = result.id;
              break;
            }
            case SocialPlatform.INSTAGRAM: {
              const igAccountId = accountMeta.instagramAccountId || account.platformId;
              const coverUrl = (postMeta.platformMedia as any)?.[account.platform]?.coverImageUrl || (post.coverImageUrl as string | null) || undefined;
              const result = await meta.publishToInstagram(
                account.accessToken,
                igAccountId,
                content,
                targetMediaUrls,
                post.postType,
                coverUrl
              );
              platformPostId = result.id;
              break;
            }
            case SocialPlatform.LINKEDIN: {
              const isOrg = (account.metadata as any)?.isOrganization === true;
              const authorUrn = isOrg
                ? `urn:li:organization:${account.platformId}`
                : `urn:li:person:${account.platformId}`;
              const result = await linkedin.publishToLinkedIn(
                account.accessToken,
                authorUrn,
                content,
                targetMediaUrls.length ? targetMediaUrls : undefined
              );
              platformPostId = result.id;
              break;
            }
            case SocialPlatform.TIKTOK: {
              if (!targetMediaUrls.length) throw new Error('TikTok requires a video');
              const videoUrl = targetMediaUrls[0];
              const videoBuffer = await downloadFromR2(videoUrl);
              // TikTok only accepts MP4 (H.264); convert .mov/.webm/... before upload.
              const ext = path.extname(videoUrl.split('?')[0]) || '.mp4';
              const mp4Buffer = await convertToMp4(videoBuffer, ext);
              const result = await tiktok.publishToTikTok(
                account.accessToken,
                mp4Buffer,
                content
              );
              platformPostId = result.id;
              break;
            }
            default:
              throw new Error(`Unsupported platform: ${account.platform}`);
          }
          published = true;
        } catch (apiErr: any) {
          if (!browserFallback) throw apiErr;
          console.log(`[publisher] API failed for ${account.platform}, falling back to browser: ${apiErr.message}`);
        }
      }

      // --- Browser fallback (or browserOnly, or no token) ---
      if (!published && (browserOnly || browserFallback || !account.accessToken)) {
        if (!targetMediaUrls.length) throw new Error('Browser publish requires at least one media file');

        // Download ALL media files to temp files (carousel = multiple images)
        const tmpFiles: string[] = [];
        for (const url of targetMediaUrls) {
          const ext = path.extname(url).split('?')[0] || '.png';
          const tmpFile = path.join(os.tmpdir(), `browser-pub-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
          const buffer = await downloadFromR2(url);
          await fs.writeFile(tmpFile, buffer);
          tmpFiles.push(tmpFile);
        }

        try {
          let result: { ok: boolean; error?: string };
          switch (account.platform) {
            case SocialPlatform.TIKTOK:
              result = await uploadToTikTok(account.id, tmpFiles[0], content);
              break;
            case SocialPlatform.INSTAGRAM:
              result = await uploadToInstagram(account.id, tmpFiles, content);
              break;
            default:
              throw new Error(`Browser publish not supported for ${account.platform}`);
          }
          if (!result.ok) throw new Error(result.error || 'Browser publish failed');
          platformPostId = `browser-${Date.now()}`;
          published = true;
        } finally {
          for (const f of tmpFiles) await fs.unlink(f).catch(() => {});
        }
      }

      if (!published) throw new Error('No publish method succeeded');

      await prisma.socialPostTarget.update({
        where: { id: target.id },
        data: { status: 'PUBLISHED', platformPostId, publishedAt: new Date() },
      });

      await prisma.publishLog.create({
        data: {
          postId,
          socialAccountId: account.id,
          action: 'SUCCESS',
          message: `Published as ${platformPostId}`,
        },
      });

      publishedTargets.push({ targetId: target.id, account, platform: account.platform, platformPostId: platformPostId! });
    } catch (err: any) {
      allSuccess = false;
      await prisma.socialPostTarget.update({
        where: { id: target.id },
        data: { status: 'FAILED', errorMessage: err.message },
      });
      await prisma.publishLog.create({
        data: {
          postId,
          socialAccountId: account.id,
          action: 'FAIL',
          message: err.message,
        },
      });

      // All-or-nothing: remove any post already published on the other channels,
      // so a partial publish never stays live. Then stop on first failure.
      await rollbackPublishedTargets(postId, publishedTargets);
      break;
    }
  }

  // If a target failed, mark any remaining (not yet attempted) targets as FAILED
  // so no channel is left stuck in PUBLISHING and no partial publish is ambiguous.
  if (!allSuccess) {
    await prisma.socialPostTarget.updateMany({
      where: { postId, status: 'PUBLISHING' },
      data: { status: 'FAILED', errorMessage: 'Non pubblicato: un altro canale è fallito' },
    });
  }

  // Update post status
  await prisma.socialPost.update({
    where: { id: postId },
    data: {
      status: allSuccess ? 'PUBLISHED' : 'FAILED',
      publishedAt: allSuccess ? new Date() : undefined,
    },
  });

  // Update linked idea status to "Pubblicato"
  if (allSuccess) {
    try {
      const linkedIdea = await prisma.socialPost.findFirst({
        where: { promotedToId: postId, stage: 'IDEA' },
      });
      if (linkedIdea) {
        await prisma.socialPost.update({
          where: { id: linkedIdea.id },
          data: { ideaStatus: 'Pubblicato' },
        });
      }
    } catch (_) { /* best-effort */ }
  }

  // Enqueue metrics collection at 24h, 48h, 7d — only for API-published posts
  if (allSuccess) {
    try {
      const { postMetricsQueue } = await import('../../queues');
      const delays = [
        { checkpoint: '24h', delay: 24 * 3600_000 },
        { checkpoint: '48h', delay: 48 * 3600_000 },
        { checkpoint: '7d', delay: 7 * 24 * 3600_000 },
      ];
      for (const { checkpoint, delay } of delays) {
        await postMetricsQueue.add('collect', { postId, checkpoint }, {
          delay,
          jobId: `metrics-${postId}-${checkpoint}`,
        });
      }
    } catch (err: any) {
      console.error(`[publisher] Failed to enqueue metrics for post ${postId}:`, err.message);
    }
  }
}

// --- All-or-nothing rollback helper ---

/**
 * Remove already-published posts on the OTHER channels when a later channel
 * fails, so a partially-published post never stays live anywhere. Best-effort:
 * if the platform delete fails, the leftover is logged loudly for manual cleanup.
 */
async function rollbackPublishedTargets(
  postId: number,
  published: Array<{ targetId: number; account: any; platform: SocialPlatform; platformPostId: string }>
): Promise<void> {
  for (const p of published) {
    try {
      if (p.platform === SocialPlatform.FACEBOOK && p.account.accessToken) {
        await meta.deleteFacebookPost(p.account.accessToken, p.platformPostId);
      } else if (p.platform === SocialPlatform.INSTAGRAM && p.account.accessToken) {
        await meta.deleteInstagramMedia(p.account.accessToken, p.platformPostId);
      } else if (p.platform === SocialPlatform.LINKEDIN && p.account.accessToken) {
        await linkedin.deleteLinkedInPost(p.account.accessToken, p.platformPostId);
      } else {
        console.error(`[publisher] ⚠️ Rollback non supportato per ${p.platform} (${p.platformPostId}) — rimozione manuale necessaria`);
      }

      await prisma.socialPostTarget.update({
        where: { id: p.targetId },
        data: { status: 'FAILED', errorMessage: 'Rimosso: un altro canale è fallito', platformPostId: null, publishedAt: null },
      });
      await prisma.publishLog.create({
        data: { postId, socialAccountId: p.account.id, action: 'ROLLBACK', message: `Rimosso ${p.platform} ${p.platformPostId} (un altro canale è fallito)` },
      });
    } catch (rbErr: any) {
      console.error(`[publisher] ⚠️ ROLLBACK FALLITO per ${p.platform} ${p.platformPostId}: ${rbErr.message}`);
      await prisma.publishLog.create({
        data: { postId, socialAccountId: p.account.id, action: 'FAIL', message: `⚠️ Rollback fallito: ${p.platform} ${p.platformPostId} potrebbe essere ancora online (${rbErr.message})` },
      });
    }
  }
}

// --- Video uniquification helper ---

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.avi', '.mkv']);

async function uniquifyMediaUrls(urls: string[], contactId: number): Promise<string[]> {
  const result: string[] = [];
  for (const url of urls) {
    const ext = path.extname(url).split('?')[0].toLowerCase();
    if (!VIDEO_EXTS.has(ext)) {
      result.push(url);
      continue;
    }
    try {
      const tmpIn = path.join(os.tmpdir(), `uniq-in-${Date.now()}${ext}`);
      const tmpOut = path.join(os.tmpdir(), `uniq-out-${Date.now()}${ext}`);
      const buffer = await downloadFromR2(url);
      await fs.writeFile(tmpIn, buffer);
      await uniquifyVideo(tmpIn, tmpOut);
      const outBuffer = await fs.readFile(tmpOut);
      const { url: newUrl } = await uploadToR2(outBuffer, contactId, `uniquified${ext}`, 'video/mp4', 'uniquified');
      result.push(newUrl);
      // Cleanup temp files
      await fs.unlink(tmpIn).catch(() => {});
      await fs.unlink(tmpOut).catch(() => {});
      console.log(`[publisher] Uniquified video: ${url} -> ${newUrl}`);
    } catch (err: any) {
      console.error(`[publisher] Uniquification failed for ${url}, using original:`, err.message);
      result.push(url);
    }
  }
  return result;
}
