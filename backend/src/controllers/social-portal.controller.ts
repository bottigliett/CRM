import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET!;
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable must be set');

/**
 * Generate a signed portal link for a client to review pending posts
 * GET /api/social/clients/:contactId/portal-link
 */
export const generatePortalLink = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.contactId);

    const token = jwt.sign({ contactId, purpose: 'social-portal' }, JWT_SECRET, { expiresIn: '7d' });
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${baseUrl}/client/social?token=${token}`;

    return res.json({ success: true, data: { link, token } });
  } catch (error: any) {
    console.error('[social-portal]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

// --- Public portal endpoints (auth via token query param) ---

function verifyPortalToken(req: Request): number | null {
  const token = (req.query.token || req.headers['x-portal-token']) as string;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.purpose !== 'social-portal') return null;
    return payload.contactId;
  } catch {
    return null;
  }
}

/**
 * GET /api/social/client-portal/posts?token=...
 */
export const getPortalPosts = async (req: Request, res: Response) => {
  try {
    const contactId = verifyPortalToken(req);
    if (!contactId) return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });

    const posts = await prisma.socialPost.findMany({
      where: { contactId, status: 'PENDING_APPROVAL' },
      include: {
        targets: { include: { socialAccount: { select: { platform: true, platformName: true } } } },
        hashtags: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: posts });
  } catch (error: any) {
    console.error('[social-portal]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * POST /api/social/client-portal/posts/:id/approve?token=...
 */
export const portalApprovePost = async (req: Request, res: Response) => {
  try {
    const contactId = verifyPortalToken(req);
    if (!contactId) return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });

    const id = parseInt(req.params.id);
    const post = await prisma.socialPost.findUnique({ where: { id } });

    if (!post || post.contactId !== contactId) {
      return res.status(404).json({ success: false, message: 'Post non trovato' });
    }
    if (post.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ success: false, message: 'Il post non è in attesa di approvazione' });
    }

    const updated = await prisma.socialPost.update({
      where: { id },
      data: {
        status: post.scheduledAt ? 'SCHEDULED' : 'APPROVED',
        approvedAt: new Date(),
      },
    });

    if (post.scheduledAt) {
      await prisma.socialPostTarget.updateMany({
        where: { postId: id },
        data: { status: 'SCHEDULED' },
      });
    }

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[social-portal]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * POST /api/social/client-portal/posts/:id/reject?token=...
 */
export const portalRejectPost = async (req: Request, res: Response) => {
  try {
    const contactId = verifyPortalToken(req);
    if (!contactId) return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });

    const id = parseInt(req.params.id);
    const { note } = req.body;
    const post = await prisma.socialPost.findUnique({ where: { id } });

    if (!post || post.contactId !== contactId) {
      return res.status(404).json({ success: false, message: 'Post non trovato' });
    }
    if (post.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ success: false, message: 'Il post non è in attesa di approvazione' });
    }

    const updated = await prisma.socialPost.update({
      where: { id },
      data: { status: 'DRAFT' }, // back to draft for revision
    });

    // Log rejection note
    if (note) {
      await prisma.publishLog.create({
        data: {
          postId: id,
          socialAccountId: (await prisma.socialPostTarget.findFirst({ where: { postId: id } }))?.socialAccountId || 0,
          action: 'CLIENT_REJECTED',
          message: note,
        },
      });
    }

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[social-portal]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};
