import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * GET /api/social/calendar
 * Returns posts in calendar format (by date range)
 */
export const getCalendar = async (req: Request, res: Response) => {
  try {
    const { contactId, startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate e endDate richiesti' });
    }

    const where: any = {
      OR: [
        { scheduledAt: { gte: new Date(startDate as string), lte: new Date(endDate as string) } },
        { publishedAt: { gte: new Date(startDate as string), lte: new Date(endDate as string) } },
      ],
      status: { notIn: ['ARCHIVED'] },
    };
    if (contactId) where.contactId = parseInt(contactId as string);

    const posts = await prisma.socialPost.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true } },
        targets: { include: { socialAccount: { select: { id: true, platform: true, platformName: true } } } },
        media: { include: { media: { select: { r2Url: true, mimeType: true } } }, take: 1 },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return res.json({ success: true, data: posts });
  } catch (error: any) {
    console.error('[social-calendar]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};
