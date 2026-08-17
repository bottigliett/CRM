import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * GET /api/social/clients/:contactId/brief
 */
export const getBrief = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.contactId);

    let brief = await prisma.socialClientBrief.findUnique({ where: { contactId } });

    if (!brief) {
      brief = await prisma.socialClientBrief.create({ data: { contactId } });
    }

    return res.json({ success: true, data: brief });
  } catch (error: any) {
    console.error('[social-brief]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * PUT /api/social/clients/:contactId/brief
 */
export const updateBrief = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.contactId);
    const { tone, audience, goals, notes, aiInstructions } = req.body;

    const brief = await prisma.socialClientBrief.upsert({
      where: { contactId },
      create: { contactId, tone, audience, goals, notes, aiInstructions },
      update: {
        ...(tone !== undefined && { tone }),
        ...(audience !== undefined && { audience }),
        ...(goals !== undefined && { goals }),
        ...(notes !== undefined && { notes }),
        ...(aiInstructions !== undefined && { aiInstructions }),
      },
    });

    return res.json({ success: true, data: brief });
  } catch (error: any) {
    console.error('[social-brief]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};
