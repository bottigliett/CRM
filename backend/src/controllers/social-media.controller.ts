import { Request, Response } from 'express';
import prisma from '../config/database';
import { uploadToR2, deleteFromR2 } from '../services/social/r2.service';

/**
 * GET /api/social/media
 */
export const getMedia = async (req: Request, res: Response) => {
  try {
    const { contactId, folder, page = '1', limit = '30' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 30));

    const where: any = {};
    if (contactId) where.contactId = parseInt(contactId as string);
    if (folder) where.folder = folder;

    const [media, total] = await Promise.all([
      prisma.socialMedia.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.socialMedia.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        media,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error: any) {
    console.error('[social-media]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * POST /api/social/media/upload
 * Expects multipart/form-data with file(s)
 */
export const uploadMedia = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.body.contactId);
    const folder = req.body.folder || null;
    const tags = req.body.tags ? JSON.parse(req.body.tags) : null;

    if (!contactId || isNaN(contactId)) {
      return res.status(400).json({ success: false, message: 'contactId richiesto' });
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) {
      return res.status(400).json({ success: false, message: 'Nessun file caricato' });
    }

    const results = await Promise.all(files.map(async (file) => {
      const { key, url } = await uploadToR2(
        file.buffer,
        contactId,
        file.originalname,
        file.mimetype,
        folder
      );

      return prisma.socialMedia.create({
        data: {
          contactId,
          filename: key.split('/').pop()!,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          r2Key: key,
          r2Url: url,
          folder,
          tags,
        },
      });
    }));

    return res.status(201).json({ success: true, data: results });
  } catch (error: any) {
    console.error('[social-media]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * DELETE /api/social/media/:id
 */
export const deleteMedia = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const media = await prisma.socialMedia.findUnique({ where: { id } });
    if (!media) return res.status(404).json({ success: false, message: 'Media non trovato' });

    // Check if used in any post
    const usageCount = await prisma.socialPostMedia.count({ where: { mediaId: id } });
    if (usageCount > 0) {
      return res.status(400).json({ success: false, message: `Media usato in ${usageCount} post. Rimuovilo dai post prima di eliminarlo.` });
    }

    await deleteFromR2(media.r2Key);
    await prisma.socialMedia.delete({ where: { id } });

    return res.json({ success: true, message: 'Media eliminato' });
  } catch (error: any) {
    console.error('[social-media]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};
