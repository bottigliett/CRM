import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { uploadToR2 } from '../services/social/r2.service';
import { isVideoMime } from '../services/social/transcription.service';
import { extractVideoThumbnail } from '../services/social/video-processing.service';
import path from 'path';

/** Enqueue a background transcription job when any uploaded media is a video/reel. */
async function enqueueTranscriptionIfVideo(postId: number, mediaFiles: Express.Multer.File[], platformFiles: Record<string, { media?: Express.Multer.File; cover?: Express.Multer.File }> = {}): Promise<void> {
  const hasVideo = mediaFiles.some(f => isVideoMime(f.mimetype))
    || Object.values(platformFiles).some(f => (f.media && isVideoMime(f.media.mimetype)) || (f.cover && isVideoMime(f.cover.mimetype)));
  if (!hasVideo) return;
  try {
    const { transcriptionQueue } = await import('../queues');
    await transcriptionQueue.add('transcribe', { postId }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 30_000 },
      jobId: `transcribe-${postId}`,
    });
    console.log(`[transcription] Enqueued transcription for post ${postId}`);
  } catch (_) { /* worker not running */ }
}

/** Normalize multer .fields() / .array() into media files + optional cover */
function getUploadedFiles(req: Request): { media: Express.Multer.File[]; cover?: Express.Multer.File } {
  const raw = req.files;
  if (!raw) return { media: [] };
  if (Array.isArray(raw)) return { media: raw };
  const map = raw as { [field: string]: Express.Multer.File[] };
  return {
    media: map.files || [],
    cover: map.coverFile?.[0],
  };
}

const PLATFORM_FILE_FIELDS: Record<string, string> = {
  ig: 'INSTAGRAM',
  fb: 'FACEBOOK',
  in: 'LINKEDIN',
  tt: 'TIKTOK',
};

/** Extract per-platform override media (e.g. igMedia/igCover) from multipart fields */
function getPlatformMediaFiles(req: Request): Record<string, { media?: Express.Multer.File; cover?: Express.Multer.File }> {
  const raw = req.files as { [field: string]: Express.Multer.File[] } | undefined;
  if (!raw || Array.isArray(raw)) return {};
  const out: Record<string, { media?: Express.Multer.File; cover?: Express.Multer.File }> = {};
  for (const [code, platform] of Object.entries(PLATFORM_FILE_FIELDS)) {
    const media = raw[`${code}Media`]?.[0];
    const cover = raw[`${code}Cover`]?.[0];
    if (media || cover) out[platform] = { media, cover };
  }
  return out;
}

/** Upload per-platform override files to R2 and return metadata.platformMedia */
async function uploadPlatformMedia(req: Request, contactId: number): Promise<Record<string, { mediaUrls?: string[]; coverImageUrl?: string }> | undefined> {
  const files = getPlatformMediaFiles(req);
  const platforms = Object.keys(files);
  if (!platforms.length) return undefined;
  const result: Record<string, { mediaUrls?: string[]; coverImageUrl?: string }> = {};
  for (const platform of platforms) {
    const f = files[platform];
    const entry: { mediaUrls?: string[]; coverImageUrl?: string } = {};
    if (f.media) {
      const { url } = await uploadToR2(f.media.buffer, contactId, f.media.originalname, f.media.mimetype);
      entry.mediaUrls = [url];
    }
    if (f.cover) {
      const { url } = await uploadToR2(f.cover.buffer, contactId, f.cover.originalname, f.cover.mimetype);
      entry.coverImageUrl = url;
    }
    result[platform] = entry;
  }
  return result;
}

/**
 * GET /api/social/posts
 */
export const getPosts = async (req: Request, res: Response) => {
  try {
    const { contactId, status, stage, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit as string) || 20));

    const where: any = {};
    if (contactId) where.contactId = parseInt(contactId as string);
    if (status) where.status = status;
    // Default to PRODUCTION to not break existing callers
    where.stage = (stage as string) || 'PRODUCTION';

    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
          targets: { include: { socialAccount: { select: { id: true, platform: true, platformName: true } } } },
          media: { include: { media: true }, orderBy: { position: 'asc' } },
          hashtags: true,
          postMetrics: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.socialPost.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        posts,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error: any) {
    console.error('[social-post]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * GET /api/social/posts/:id
 */
export const getPostById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const post = await prisma.socialPost.findUnique({
      where: { id },
      include: {
        contact: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        targets: { include: { socialAccount: { select: { id: true, platform: true, platformName: true, profilePicUrl: true } } } },
        media: { include: { media: true }, orderBy: { position: 'asc' } },
        hashtags: true,
        publishLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!post) return res.status(404).json({ success: false, message: 'Post non trovato' });

    return res.json({ success: true, data: post });
  } catch (error: any) {
    console.error('[social-post]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * POST /api/social/posts
 * Accepts multipart/form-data (files[] + JSON fields) or JSON body
 */
export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    // Parse body — multipart sends strings, JSON sends native types
    const contactId = parseInt(req.body.contactId);
    const content = req.body.content;
    const platformContent = typeof req.body.platformContent === 'string'
      ? JSON.parse(req.body.platformContent) : req.body.platformContent;
    const postType = req.body.postType || 'POST';
    const targetAccountIds: number[] = typeof req.body.targetAccountIds === 'string'
      ? JSON.parse(req.body.targetAccountIds) : (req.body.targetAccountIds || []);
    const hashtags: string[] = typeof req.body.hashtags === 'string'
      ? JSON.parse(req.body.hashtags) : (req.body.hashtags || []);
    const scheduledAt = req.body.scheduledAt;
    const templateId = req.body.templateId ? parseInt(req.body.templateId) : undefined;
    let coverImageUrl = req.body.coverImageUrl;
    const shareToFeed = req.body.shareToFeed !== undefined
      ? req.body.shareToFeed === 'true' || req.body.shareToFeed === true : true;
    const publishNowFlag = req.body.publishNow === 'true' || req.body.publishNow === true;
    const accountSchedules: Record<string, string> = req.body.accountSchedules
      ? (typeof req.body.accountSchedules === 'string' ? JSON.parse(req.body.accountSchedules) : req.body.accountSchedules)
      : {};

    // Idea fields
    const stage = req.body.stage || 'PRODUCTION';
    const ideaCategory = req.body.ideaCategory;
    const ideaPhase = req.body.ideaPhase;
    const ideaStatus = req.body.ideaStatus;
    const ideaScript = req.body.ideaScript;
    const ideaCaption = req.body.ideaCaption;
    const ideaObiettivo = req.body.ideaObiettivo;
    const ideaCreativita = req.body.ideaCreativita;
    const ideaNotes = req.body.ideaNotes;

    if (!contactId || !content) {
      return res.status(400).json({ success: false, message: 'contactId e content sono obbligatori' });
    }

    // Upload inline files to R2 (coverFile → coverImageUrl)
    const { media: mediaFiles, cover: coverFile } = getUploadedFiles(req);
    let mediaUrls: string[] | undefined;
    if (mediaFiles.length) {
      mediaUrls = await Promise.all(mediaFiles.map(async (file) => {
        const { url } = await uploadToR2(file.buffer, contactId, file.originalname, file.mimetype);
        return url;
      }));
    }
    if (coverFile) {
      const { url } = await uploadToR2(coverFile.buffer, contactId, coverFile.originalname, coverFile.mimetype);
      coverImageUrl = url;
    } else if (mediaFiles.length) {
      // Auto-generate a cover frame for videos (reels) when no cover was uploaded,
      // so the calendar preview shows a real thumbnail instead of a gray box.
      const firstVideo = mediaFiles.find(f => isVideoMime(f.mimetype));
      if (firstVideo) {
        try {
          const ext = path.extname(firstVideo.originalname || '') || '.mp4';
          const thumb = await extractVideoThumbnail(firstVideo.buffer, ext);
          if (thumb) {
            const { url } = await uploadToR2(thumb, contactId, `cover-${Date.now()}.jpg`, 'image/jpeg');
            coverImageUrl = url;
          }
        } catch (err: any) {
          console.warn('[social-post] cover frame generation failed:', err?.message || err);
        }
      }
    }

    // Also accept pre-existing mediaUrls from body (for editing/duplicating)
    if (!mediaUrls && req.body.mediaUrls) {
      mediaUrls = typeof req.body.mediaUrls === 'string'
        ? JSON.parse(req.body.mediaUrls) : req.body.mediaUrls;
    }

    // Per-platform media overrides (different video/cover per social)
    const platformMedia = await uploadPlatformMedia(req, contactId);

    // PRODUCTION + per-account schedules → one post per schedule group (same content, different times/platforms)
    const scheduleIds = Object.keys(accountSchedules).map(Number);
    if (stage === 'PRODUCTION' && (scheduleIds.length > 0 || publishNowFlag)) {
      const accountIds = scheduleIds.length ? scheduleIds : targetAccountIds;
      if (!accountIds.length) {
        return res.status(400).json({ success: false, message: 'Seleziona almeno un account' });
      }

      const groups: Record<string, number[]> = {};
      if (publishNowFlag) {
        groups['NOW'] = accountIds;
      } else {
        for (const [accId, dt] of Object.entries(accountSchedules)) {
          if (!dt) return res.status(400).json({ success: false, message: 'Ogni account deve avere una data di pubblicazione' });
          if (!groups[dt]) groups[dt] = [];
          groups[dt].push(Number(accId));
        }
      }

      const createdPosts: any[] = [];
      for (const [schedKey, accIds] of Object.entries(groups)) {
        const isNow = schedKey === 'NOW';
        const post = await prisma.socialPost.create({
          data: {
            contactId,
            content,
            platformContent: platformContent || undefined,
            postType,
            stage: 'PRODUCTION',
            createdById: req.user!.userId,
            mediaUrls: mediaUrls || undefined,
            coverImageUrl: coverImageUrl || undefined,
            metadata: platformMedia ? { platformMedia } : undefined,
            shareToFeed,
            scheduledAt: isNow ? undefined : new Date(schedKey),
            status: isNow ? 'PUBLISHING' : 'SCHEDULED',
            templateId: templateId || undefined,
            targets: {
              create: accIds.map(accountId => ({
                socialAccountId: accountId,
                status: isNow ? 'PUBLISHING' as const : 'SCHEDULED' as const,
              })),
            },
            hashtags: hashtags.length ? {
              create: hashtags.map((h: string) => ({ hashtag: h.startsWith('#') ? h : `#${h}` })),
            } : undefined,
          },
          include: {
            targets: { include: { socialAccount: { select: { id: true, platform: true, platformName: true } } } },
            hashtags: true,
          },
        });
        createdPosts.push(post);

        if (isNow) {
          try {
            const { publishQueue } = await import('../queues');
            await publishQueue.add('publish', { postId: post.id });
          } catch (_) { /* worker not running */ }
        }

        await enqueueTranscriptionIfVideo(post.id, mediaFiles, getPlatformMediaFiles(req));
      }

      return res.status(201).json({ success: true, data: createdPosts.length === 1 ? createdPosts[0] : createdPosts });
    }

    const post = await prisma.socialPost.create({
      data: {
        contactId,
        content,
        platformContent: platformContent || undefined,
        postType,
        stage,
        ideaCategory: ideaCategory || undefined,
        ideaPhase: ideaPhase || undefined,
        ideaStatus: ideaStatus || undefined,
        ideaScript: ideaScript || undefined,
        ideaCaption: ideaCaption || undefined,
        ideaObiettivo: ideaObiettivo || undefined,
        ideaCreativita: ideaCreativita || undefined,
        ideaNotes: ideaNotes || undefined,
        createdById: req.user!.userId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        templateId: templateId || undefined,
        mediaUrls: mediaUrls || undefined,
        coverImageUrl: coverImageUrl || undefined,
        metadata: platformMedia ? { platformMedia } : undefined,
        shareToFeed,
        targets: targetAccountIds.length ? {
          create: targetAccountIds.map((accountId: number) => ({
            socialAccountId: accountId,
            status: 'DRAFT' as const,
          })),
        } : undefined,
        hashtags: hashtags.length ? {
          create: hashtags.map((h: string) => ({ hashtag: h.startsWith('#') ? h : `#${h}` })),
        } : undefined,
      },
      include: {
        targets: { include: { socialAccount: { select: { id: true, platform: true, platformName: true } } } },
        hashtags: true,
      },
    });

    await enqueueTranscriptionIfVideo(post.id, mediaFiles, getPlatformMediaFiles(req));

    return res.status(201).json({ success: true, data: post });
  } catch (error: any) {
    console.error('[social-post]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * PUT /api/social/posts/:id
 * Accepts multipart/form-data or JSON
 */
export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const content = req.body.content;
    const platformContent = typeof req.body.platformContent === 'string'
      ? JSON.parse(req.body.platformContent) : req.body.platformContent;
    const postType = req.body.postType;
    const targetAccountIds: number[] | undefined = req.body.targetAccountIds
      ? (typeof req.body.targetAccountIds === 'string' ? JSON.parse(req.body.targetAccountIds) : req.body.targetAccountIds)
      : undefined;
    const hashtags: string[] | undefined = req.body.hashtags
      ? (typeof req.body.hashtags === 'string' ? JSON.parse(req.body.hashtags) : req.body.hashtags)
      : undefined;
    const scheduledAt = req.body.scheduledAt;
    const coverImageUrl = req.body.coverImageUrl;
    const shareToFeed = req.body.shareToFeed;

    // Idea fields
    const ideaCategory = req.body.ideaCategory;
    const ideaPhase = req.body.ideaPhase;
    const ideaStatus = req.body.ideaStatus;
    const ideaScript = req.body.ideaScript;
    const ideaCaption = req.body.ideaCaption;
    const ideaObiettivo = req.body.ideaObiettivo;
    const ideaCreativita = req.body.ideaCreativita;
    const ideaNotes = req.body.ideaNotes;

    const existing = await prisma.socialPost.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Post non trovato' });

    // Ideas are always editable; production posts only when DRAFT/PENDING_APPROVAL
    if (existing.stage !== 'IDEA' && !['DRAFT', 'PENDING_APPROVAL'].includes(existing.status)) {
      return res.status(400).json({ success: false, message: 'Solo bozze e post in attesa possono essere modificati' });
    }

    // Update targets if provided
    if (targetAccountIds) {
      await prisma.socialPostTarget.deleteMany({ where: { postId: id } });
      await prisma.socialPostTarget.createMany({
        data: targetAccountIds.map((accountId: number) => ({ postId: id, socialAccountId: accountId, status: 'DRAFT' as const })),
      });
    }

    // Upload new files if present
    const { media: mediaFiles, cover: coverUpload } = getUploadedFiles(req);
    let mediaUrls: string[] | undefined;
    let resolvedCover = coverImageUrl;
    if (mediaFiles.length) {
      mediaUrls = await Promise.all(mediaFiles.map(async (file) => {
        const { url } = await uploadToR2(file.buffer, existing.contactId, file.originalname, file.mimetype);
        return url;
      }));
    } else if (req.body.mediaUrls) {
      mediaUrls = typeof req.body.mediaUrls === 'string' ? JSON.parse(req.body.mediaUrls) : req.body.mediaUrls;
    }
    if (coverUpload) {
      const { url } = await uploadToR2(coverUpload.buffer, existing.contactId, coverUpload.originalname, coverUpload.mimetype);
      resolvedCover = url;
    }

    // Update hashtags if provided
    if (hashtags) {
      await prisma.socialPostHashtag.deleteMany({ where: { postId: id } });
      await prisma.socialPostHashtag.createMany({
        data: hashtags.map((h: string) => ({ postId: id, hashtag: h.startsWith('#') ? h : `#${h}` })),
      });
    }

    const post = await prisma.socialPost.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(platformContent !== undefined && { platformContent }),
        ...(postType && { postType }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
        ...(mediaUrls && { mediaUrls }),
        ...((resolvedCover !== undefined || coverUpload) && { coverImageUrl: resolvedCover || null }),
        ...(shareToFeed !== undefined && { shareToFeed: shareToFeed === 'true' || shareToFeed === true }),
        ...(ideaCategory !== undefined && { ideaCategory }),
        ...(ideaPhase !== undefined && { ideaPhase }),
        ...(ideaStatus !== undefined && { ideaStatus }),
        ...(ideaScript !== undefined && { ideaScript }),
        ...(ideaCaption !== undefined && { ideaCaption }),
        ...(ideaObiettivo !== undefined && { ideaObiettivo }),
        ...(ideaCreativita !== undefined && { ideaCreativita }),
        ...(ideaNotes !== undefined && { ideaNotes }),
      },
      include: {
        targets: { include: { socialAccount: { select: { id: true, platform: true, platformName: true } } } },
        hashtags: true,
      },
    });

    // Re-transcribe if new video media was uploaded
    if (mediaFiles.some(f => isVideoMime(f.mimetype))) {
      await enqueueTranscriptionIfVideo(id, mediaFiles);
    }

    return res.json({ success: true, data: post });
  } catch (error: any) {
    console.error('[social-post]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * DELETE /api/social/posts/:id
 */
export const deletePost = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const existing = await prisma.socialPost.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Post non trovato' });

    if (['PUBLISHING', 'PUBLISHED'].includes(existing.status)) {
      return res.status(400).json({ success: false, message: 'Non puoi eliminare un post pubblicato o in pubblicazione' });
    }

    await prisma.socialPost.delete({ where: { id } });
    return res.json({ success: true, message: 'Post eliminato' });
  } catch (error: any) {
    console.error('[social-post]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * POST /api/social/posts/:id/approve
 */
export const approvePost = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const post = await prisma.socialPost.findUnique({ where: { id } });

    if (!post) return res.status(404).json({ success: false, message: 'Post non trovato' });
    if (post.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ success: false, message: 'Il post non è in attesa di approvazione' });
    }

    const updated = await prisma.socialPost.update({
      where: { id },
      data: {
        status: post.scheduledAt ? 'SCHEDULED' : 'APPROVED',
        approvedById: req.user!.userId,
        approvedAt: new Date(),
      },
    });

    // Also update all targets
    if (post.scheduledAt) {
      await prisma.socialPostTarget.updateMany({
        where: { postId: id },
        data: { status: 'SCHEDULED' },
      });
    }

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[social-post]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * POST /api/social/posts/:id/schedule
 */
export const schedulePost = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { scheduledAt } = req.body;

    if (!scheduledAt) return res.status(400).json({ success: false, message: 'scheduledAt richiesto' });

    const post = await prisma.socialPost.findUnique({
      where: { id },
      include: { contact: { include: { socialClientConfig: true } } },
    });

    if (!post) return res.status(404).json({ success: false, message: 'Post non trovato' });
    if (!['DRAFT', 'APPROVED'].includes(post.status)) {
      return res.status(400).json({ success: false, message: 'Solo bozze o approvati possono essere programmati' });
    }

    const needsApproval = post.contact?.socialClientConfig?.requireApproval;
    const newStatus = needsApproval && post.status === 'DRAFT' ? 'PENDING_APPROVAL' : 'SCHEDULED';

    const updated = await prisma.socialPost.update({
      where: { id },
      data: { scheduledAt: new Date(scheduledAt), status: newStatus },
    });

    if (newStatus === 'SCHEDULED') {
      await prisma.socialPostTarget.updateMany({
        where: { postId: id },
        data: { status: 'SCHEDULED' },
      });
    }

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[social-post]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * POST /api/social/posts/:id/publish
 * Immediate publish (bypasses scheduler)
 */
export const publishNow = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const post = await prisma.socialPost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ success: false, message: 'Post non trovato' });

    // Import and use publisher service
    const { publishPost } = await import('../services/social/publisher.service');

    await prisma.socialPost.update({
      where: { id },
      data: { status: 'PUBLISHING' },
    });

    // Fire and forget — or await if you want synchronous feedback
    publishPost(id).catch(err => {
      console.error(`Publish failed for post ${id}:`, err);
    });

    return res.json({ success: true, message: 'Pubblicazione avviata' });
  } catch (error: any) {
    console.error('[social-post]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * POST /api/social/posts/:id/retry
 * Riprova a pubblicare un post fallito: rimette in coda solo i target non ancora
 * pubblicati (i target PUBLISHED vengono saltati, niente duplicati).
 */
export const retryPost = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const post = await prisma.socialPost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ success: false, message: 'Post non trovato' });

    // Reset failed targets back to SCHEDULED (PUBLISHED targets stay as-is)
    await prisma.socialPostTarget.updateMany({
      where: { postId: id, status: 'FAILED' },
      data: { status: 'SCHEDULED', errorMessage: null },
    });
    await prisma.socialPost.update({ where: { id }, data: { status: 'PUBLISHING' } });

    const { publishQueue } = await import('../queues');
    await publishQueue.add('publish', { postId: id });

    return res.json({ success: true, message: 'Ripubblicazione avviata' });
  } catch (error: any) {
    console.error('[social-post]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * POST /api/social/posts/:id/duplicate
 */
export const duplicatePost = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { targetContactId } = req.body || {};

    const original = await prisma.socialPost.findUnique({
      where: { id },
      include: {
        targets: true,
        hashtags: true,
      },
    });

    if (!original) return res.status(404).json({ success: false, message: 'Post non trovato' });

    const isCrossClient = targetContactId && targetContactId !== original.contactId;

    const duplicate = await prisma.socialPost.create({
      data: {
        contactId: isCrossClient ? targetContactId : original.contactId,
        content: original.content,
        platformContent: original.platformContent || undefined,
        postType: original.postType,
        // Keep the same stage/date and all idea fields, so the duplicate stays in
        // the same place (Idee vs Pubblicazione) with the same scheduling day.
        stage: original.stage,
        scheduledAt: original.scheduledAt,
        ideaCategory: original.ideaCategory,
        ideaPhase: original.ideaPhase,
        ideaStatus: original.ideaStatus,
        ideaScript: original.ideaScript,
        ideaCaption: original.ideaCaption,
        ideaObiettivo: original.ideaObiettivo,
        ideaCreativita: original.ideaCreativita,
        ideaNotes: original.ideaNotes,
        createdById: req.user!.userId,
        templateId: original.templateId,
        mediaUrls: original.mediaUrls || undefined,
        coverImageUrl: original.coverImageUrl,
        shareToFeed: original.shareToFeed,
        // Don't copy targets when transferring to a different client (different accounts)
        targets: isCrossClient ? undefined : {
          create: original.targets.map(t => ({ socialAccountId: t.socialAccountId, status: 'DRAFT' as const })),
        },
        hashtags: {
          create: original.hashtags.map(h => ({ hashtag: h.hashtag })),
        },
      },
    });

    return res.status(201).json({ success: true, data: duplicate });
  } catch (error: any) {
    console.error('[social-post]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/** Bulk-duplicate an idea to multiple clients (same content, different graphics later). */
export const duplicatePostBulk = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { targetContactIds } = req.body || {};

    if (!Array.isArray(targetContactIds) || !targetContactIds.length) {
      return res.status(400).json({ success: false, message: 'targetContactIds richiesto' });
    }

    const original = await prisma.socialPost.findUnique({
      where: { id },
      include: { hashtags: true },
    });
    if (!original) return res.status(404).json({ success: false, message: 'Post non trovato' });

    const created = [];
    for (const rawId of targetContactIds) {
      const targetId = parseInt(String(rawId));
      if (!targetId || targetId === original.contactId) continue;
      const dup = await prisma.socialPost.create({
        data: {
          contactId: targetId,
          content: original.content,
          platformContent: original.platformContent || undefined,
          postType: original.postType,
          stage: original.stage,
          createdById: req.user!.userId,
          mediaUrls: original.mediaUrls || undefined,
          coverImageUrl: original.coverImageUrl,
          shareToFeed: original.shareToFeed,
          ideaCategory: original.ideaCategory,
          ideaPhase: original.ideaPhase,
          ideaStatus: original.ideaStatus || 'Idea',
          ideaScript: original.ideaScript,
          ideaCaption: original.ideaCaption,
          ideaObiettivo: original.ideaObiettivo,
          ideaCreativita: original.ideaCreativita,
          ideaNotes: original.ideaNotes,
          hashtags: original.hashtags.length
            ? { create: original.hashtags.map(h => ({ hashtag: h.hashtag })) }
            : undefined,
        },
      });
      created.push(dup);
    }

    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    console.error('[social-post]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * POST /api/social/posts/:id/promote
 * Promote an IDEA to a PRODUCTION post
 */
export const promoteIdea = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const idea = await prisma.socialPost.findUnique({
      where: { id },
      include: { hashtags: true },
    });

    if (!idea) return res.status(404).json({ success: false, message: 'Idea non trovata' });
    if (idea.stage !== 'IDEA') return res.status(400).json({ success: false, message: 'Solo le idee possono essere programmate' });

    // Parse body fields sent from the ScheduleDialog
    const content = req.body.content || idea.ideaCaption || idea.content;
    const hashtags: string[] = req.body.hashtags
      ? (typeof req.body.hashtags === 'string' ? JSON.parse(req.body.hashtags) : req.body.hashtags)
      : idea.hashtags.map(h => h.hashtag);
    const postType = req.body.postType || idea.postType;
    const platformContent = req.body.platformContent
      ? (typeof req.body.platformContent === 'string' ? JSON.parse(req.body.platformContent) : req.body.platformContent)
      : undefined;
    const coverImageUrl = req.body.coverImageUrl || undefined;
    const shareToFeed = req.body.shareToFeed !== undefined
      ? req.body.shareToFeed === 'true' || req.body.shareToFeed === true : true;
    const publishNowFlag = req.body.publishNow === 'true' || req.body.publishNow === true;

    // Per-account schedules: JSON { accountId: "2026-08-15T10:00", ... }
    const accountSchedules: Record<string, string> = req.body.accountSchedules
      ? (typeof req.body.accountSchedules === 'string' ? JSON.parse(req.body.accountSchedules) : req.body.accountSchedules)
      : {};

    // Upload files to R2
    const { media: mediaFiles, cover: coverUpload } = getUploadedFiles(req);
    const mediaUrls: string[] = [];
    for (const file of mediaFiles) {
      const result = await uploadToR2(file.buffer, idea.contactId, file.originalname, file.mimetype);
      mediaUrls.push(result.url);
    }
    let finalCoverUrl = coverImageUrl || undefined;
    if (coverUpload) {
      const result = await uploadToR2(coverUpload.buffer, idea.contactId, coverUpload.originalname, coverUpload.mimetype);
      finalCoverUrl = result.url;
    }
    if (!mediaUrls.length) {
      return res.status(400).json({ success: false, message: 'Almeno un file media è obbligatorio' });
    }

    // Per-platform media overrides (different video/cover per social)
    const platformMedia = await uploadPlatformMedia(req, idea.contactId);

    // Group accounts by scheduledAt to create separate posts if needed
    const accountIds = Object.keys(accountSchedules).map(Number);
    if (!accountIds.length) {
      return res.status(400).json({ success: false, message: 'Seleziona almeno un account' });
    }

    // Group: { "2026-08-15T10:00": [1, 3], "2026-08-16T14:00": [2] }
    const groups: Record<string, number[]> = {};
    if (publishNowFlag) {
      groups['NOW'] = accountIds;
    } else {
      for (const [accId, dt] of Object.entries(accountSchedules)) {
        if (!dt) return res.status(400).json({ success: false, message: 'Ogni account deve avere una data di pubblicazione' });
        if (!groups[dt]) groups[dt] = [];
        groups[dt].push(Number(accId));
      }
    }

    const createdPosts: any[] = [];
    for (const [schedKey, accIds] of Object.entries(groups)) {
      const isNow = schedKey === 'NOW';
      const production = await prisma.socialPost.create({
        data: {
          contactId: idea.contactId,
          content,
          platformContent: platformContent || undefined,
          postType,
          stage: 'PRODUCTION',
          createdById: req.user!.userId,
          mediaUrls,
          coverImageUrl: finalCoverUrl,
          metadata: platformMedia ? { platformMedia } : undefined,
          shareToFeed,
          scheduledAt: isNow ? undefined : new Date(schedKey),
          status: isNow ? 'PUBLISHING' : 'SCHEDULED',
          hashtags: hashtags.length ? {
            create: hashtags.map(h => ({ hashtag: h.startsWith('#') ? h : `#${h}` })),
          } : undefined,
          targets: {
            create: accIds.map(accountId => ({
              socialAccountId: accountId,
              status: isNow ? 'PUBLISHING' as const : 'SCHEDULED' as const,
            })),
          },
        },
        include: {
          targets: { include: { socialAccount: { select: { id: true, platform: true, platformName: true } } } },
          hashtags: true,
        },
      });
      createdPosts.push(production);

      // If publish now, queue it
      if (isNow) {
        try {
          const { publishQueue } = await import('../queues');
          await publishQueue.add('publish', { postId: production.id });
        } catch (_) { /* worker not running */ }
      }

      await enqueueTranscriptionIfVideo(production.id, mediaFiles, getPlatformMediaFiles(req));
    }

    // Link idea to the first production post (or the only one)
    await prisma.socialPost.update({
      where: { id },
      data: { promotedToId: createdPosts[0].id, ideaStatus: 'Programmato' },
    });

    return res.status(201).json({ success: true, data: createdPosts });
  } catch (error: any) {
    console.error('[social-post]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * GET /api/social/posts/:id/metrics
 */
export const getPostMetrics = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const metrics = await prisma.socialPostMetrics.findMany({
      where: { postId: id },
      include: { socialAccount: { select: { id: true, platform: true, platformName: true } } },
      orderBy: { collectedAt: 'asc' },
    });

    return res.json({ success: true, data: metrics });
  } catch (error: any) {
    console.error('[social-post]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};
