import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';
import { generateCalendarIcs } from '../services/calendar-feed.service';
import { AuthRequest } from '../middleware/auth';

function newCalendarToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

/** GET /api/calendar/feed.ics?token=... — public ICS feed (token in query string). */
export const getCalendarFeed = async (req: Request, res: Response) => {
  try {
    const token = (req.query.token as string) || '';
    if (!token) return res.status(401).send('Token mancante');

    const user = await prisma.user.findFirst({ where: { calendarToken: token } });
    if (!user) return res.status(401).send('Token non valido');

    const categoryIdRaw = (req.query.categoryId as string) || '';
    const categoryId = categoryIdRaw ? parseInt(categoryIdRaw, 10) : undefined;

    const ics = await generateCalendarIcs(categoryId && !isNaN(categoryId) ? { categoryId } : undefined);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="mismo-agenda.ics"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(ics);
  } catch (error: any) {
    console.error('[calendar-feed] error:', error.message);
    res.status(500).send('Errore nella generazione del feed calendario');
  }
};

/** GET /api/calendar/sync-token — return (or lazily create) the user's feed token. */
export const getCalendarSyncInfo = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    let user = await prisma.user.findUnique({ where: { id: userId }, select: { calendarToken: true } });
    if (!user?.calendarToken) {
      const token = newCalendarToken();
      user = await prisma.user.update({ where: { id: userId }, data: { calendarToken: token }, select: { calendarToken: true } });
    }
    res.json({ success: true, data: { token: user.calendarToken } });
  } catch (error: any) {
    console.error('[calendar-feed] sync-token error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/calendar/sync-token/regenerate — rotate the user's feed token. */
export const regenerateCalendarToken = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const token = newCalendarToken();
    await prisma.user.update({ where: { id: userId }, data: { calendarToken: token } });
    res.json({ success: true, data: { token } });
  } catch (error: any) {
    console.error('[calendar-feed] regenerate error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
