import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * Context events — local events, seasons, holidays the AI uses to ground content.
 * contactId null/omitted = global context (all clients); otherwise scoped to one client.
 */

/** GET /api/social/context-events?contactId= */
export const getContextEvents = async (req: Request, res: Response) => {
  try {
    const contactId = req.query.contactId ? parseInt(req.query.contactId as string) : undefined;

    const events = await prisma.socialContextEvent.findMany({
      where: contactId
        ? { OR: [{ contactId: null }, { contactId }] }
        : { contactId: null },
      orderBy: [{ startDate: 'asc' }],
    });

    return res.json({ success: true, data: events });
  } catch (error: any) {
    console.error('[social-context] get', error.message);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/** POST /api/social/context-events  { title, description?, category?, startDate, endDate?, contactId? } */
export const createContextEvent = async (req: Request, res: Response) => {
  try {
    const { title, description, category, startDate, endDate, contactId } = req.body;
    if (!title?.trim() || !startDate) {
      return res.status(400).json({ success: false, message: 'title e startDate sono obbligatori' });
    }

    const event = await prisma.socialContextEvent.create({
      data: {
        title: String(title).trim(),
        description: description?.trim() || null,
        category: category?.trim() || 'contesto',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        contactId: contactId ? parseInt(contactId) : null,
      },
    });

    return res.status(201).json({ success: true, data: event });
  } catch (error: any) {
    console.error('[social-context] create', error.message);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/** PUT /api/social/context-events/:id */
export const updateContextEvent = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, category, startDate, endDate, isActive } = req.body;

    const event = await prisma.socialContextEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(category !== undefined && { category: String(category).trim() }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isActive !== undefined && { isActive: isActive === true || isActive === 'true' }),
      },
    });

    return res.json({ success: true, data: event });
  } catch (error: any) {
    console.error('[social-context] update', error.message);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/** DELETE /api/social/context-events/:id */
export const deleteContextEvent = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.socialContextEvent.delete({ where: { id } });
    return res.json({ success: true, message: 'Evento eliminato' });
  } catch (error: any) {
    console.error('[social-context] delete', error.message);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};
