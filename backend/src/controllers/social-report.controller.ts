import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * GET /api/social/reports
 */
export const getReports = async (req: Request, res: Response) => {
  try {
    const contactId = req.query.contactId ? parseInt(req.query.contactId as string) : undefined;

    const reports = await prisma.socialReport.findMany({
      where: contactId ? { contactId } : undefined,
      include: { contact: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: reports });
  } catch (error: any) {
    console.error('[social-report]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * POST /api/social/reports
 */
export const createReport = async (req: Request, res: Response) => {
  try {
    const { contactId, name, frequency, recipients, config } = req.body;

    if (!contactId || !name || !recipients) {
      return res.status(400).json({ success: false, message: 'contactId, name e recipients sono obbligatori' });
    }

    const report = await prisma.socialReport.create({
      data: {
        contactId,
        name,
        frequency: frequency || 'MONTHLY',
        recipients,
        config: config || undefined,
        nextSendAt: computeNextSendDate(frequency || 'MONTHLY'),
      },
    });

    return res.status(201).json({ success: true, data: report });
  } catch (error: any) {
    console.error('[social-report]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * PUT /api/social/reports/:id
 */
export const updateReport = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, frequency, recipients, config, isActive } = req.body;

    const report = await prisma.socialReport.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(frequency && { frequency, nextSendAt: computeNextSendDate(frequency) }),
        ...(recipients && { recipients }),
        ...(config !== undefined && { config }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('[social-report]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * DELETE /api/social/reports/:id
 */
export const deleteReport = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.socialReport.delete({ where: { id } });
    return res.json({ success: true, message: 'Report eliminato' });
  } catch (error: any) {
    console.error('[social-report]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * GET /api/social/dashboard
 * Overview of all social clients
 */
export const getDashboard = async (req: Request, res: Response) => {
  try {
    // Get contacts with social accounts
    const accountsByContact = await prisma.socialAccount.groupBy({
      by: ['contactId'],
      where: { isActive: true },
      _count: { id: true },
    });

    const accountContactIds = accountsByContact.map(a => a.contactId);

    // Get contacts with SocialClientConfig but no accounts (registered via registerSocialClient)
    const configOnly = await prisma.socialClientConfig.findMany({
      where: { contactId: { notIn: accountContactIds } },
      select: { contactId: true },
    });
    const configOnlyIds = configOnly.map(c => c.contactId);

    const contactIds = [...accountContactIds, ...configOnlyIds];

    // Start of the current month (for the "published this month" goal)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [contacts, scheduledCount, publishedThisWeek, failedCount, expiringTokens, accounts, postCounts, projects, configs] = await Promise.all([
      prisma.contact.findMany({
        where: { id: { in: contactIds } },
        select: { id: true, name: true, email: true },
      }),
      prisma.socialPost.count({
        where: { contactId: { in: contactIds }, status: 'SCHEDULED' },
      }),
      prisma.socialPost.count({
        where: {
          contactId: { in: contactIds },
          status: 'PUBLISHED',
          publishedAt: { gte: new Date(Date.now() - 7 * 86400_000) },
        },
      }),
      prisma.socialPost.count({
        where: { contactId: { in: contactIds }, status: 'FAILED' },
      }),
      prisma.socialAccount.count({
        where: {
          isActive: true,
          tokenExpiresAt: { lte: new Date(Date.now() + 7 * 86400_000) },
        },
      }),
      prisma.socialAccount.findMany({
        where: { contactId: { in: contactIds }, isActive: true },
        select: { id: true, contactId: true, platform: true, platformName: true },
      }),
      prisma.socialPost.groupBy({
        by: ['contactId'],
        // Count "published this month":
        //   - system PUBLISHED with publishedAt in the current month
        //   - imported ideas (ideaStatus Pubblicato) with scheduledAt in the current month
        where: {
          contactId: { in: contactIds },
          OR: [
            { status: 'PUBLISHED', publishedAt: { gte: monthStart } },
            { stage: 'IDEA', ideaStatus: 'Pubblicato', scheduledAt: { gte: monthStart } },
          ],
        },
        _count: { id: true },
      }),
      prisma.project.findMany({
        where: { contactId: { in: contactIds }, status: 'ACTIVE' },
        select: { id: true, contactId: true, name: true },
      }),
      prisma.socialClientConfig.findMany({
        where: { contactId: { in: contactIds } },
        select: { contactId: true, folder: true },
      }),
    ]);

    const clients = contacts.map(c => {
      const clientAccounts = accounts.filter(a => a.contactId === c.id);
      const totalPosts = postCounts.find(p => p.contactId === c.id)?._count.id || 0;
      const project = projects.find(p => p.contactId === c.id);
      const config = configs.find(cfg => cfg.contactId === c.id);
      return {
        ...c,
        accountCount: clientAccounts.length,
        accounts: clientAccounts,
        totalPosts,
        project: project ? { id: project.id, name: project.name } : null,
        folder: config?.folder || null,
      };
    });

    return res.json({
      success: true,
      data: {
        clients,
        stats: { scheduledCount, publishedThisWeek, failedCount, expiringTokens },
      },
    });
  } catch (error: any) {
    console.error('[social-report]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * POST /api/social/clients/register
 * Register a contact as a social client (creates SocialClientConfig)
 */
export const registerSocialClient = async (req: Request, res: Response) => {
  try {
    const { contactId, folder } = req.body;

    if (!contactId) {
      return res.status(400).json({ success: false, message: 'contactId è obbligatorio' });
    }

    const config = await prisma.socialClientConfig.upsert({
      where: { contactId },
      create: { contactId, folder: folder || null },
      update: { ...(folder !== undefined && { folder: folder || null }) },
    });

    return res.status(201).json({ success: true, data: config });
  } catch (error: any) {
    console.error('[social-report]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * GET /api/social/clients/:contactId/config
 */
export const getClientConfig = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.contactId);

    let config = await prisma.socialClientConfig.findUnique({ where: { contactId } });

    // Create default if not exists
    if (!config) {
      config = await prisma.socialClientConfig.create({
        data: { contactId },
      });
    }

    return res.json({ success: true, data: config });
  } catch (error: any) {
    console.error('[social-report]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * PUT /api/social/clients/:contactId/config
 */
export const updateClientConfig = async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.contactId);
    const { requireApproval, approvalMode, defaultTimezone, cedColumns, folder } = req.body;

    const config = await prisma.socialClientConfig.upsert({
      where: { contactId },
      create: {
        contactId,
        requireApproval: requireApproval ?? false,
        approvalMode: approvalMode ?? 'internal',
        defaultTimezone: defaultTimezone ?? 'Europe/Rome',
        cedColumns: cedColumns ?? undefined,
        folder: folder ?? null,
      },
      update: {
        ...(requireApproval !== undefined && { requireApproval }),
        ...(approvalMode !== undefined && { approvalMode }),
        ...(defaultTimezone && { defaultTimezone }),
        ...(cedColumns !== undefined && { cedColumns }),
        ...(folder !== undefined && { folder: folder || null }),
      },
    });

    return res.json({ success: true, data: config });
  } catch (error: any) {
    console.error('[social-report]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * GET /api/social/templates
 */
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const contactId = req.query.contactId ? parseInt(req.query.contactId as string) : undefined;

    const templates = await prisma.socialTemplate.findMany({
      where: contactId ? { OR: [{ contactId }, { contactId: null }] } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: templates });
  } catch (error: any) {
    console.error('[social-report]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * POST /api/social/templates
 */
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { contactId, name, content, postType, platforms } = req.body;

    if (!name || !content) {
      return res.status(400).json({ success: false, message: 'name e content sono obbligatori' });
    }

    const template = await prisma.socialTemplate.create({
      data: {
        contactId: contactId || null,
        name,
        content,
        postType: postType || 'POST',
        platforms: platforms || undefined,
      },
    });

    return res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    console.error('[social-report]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * PUT /api/social/templates/:id
 */
export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, content, postType, platforms } = req.body;

    const template = await prisma.socialTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(content && { content }),
        ...(postType && { postType }),
        ...(platforms !== undefined && { platforms }),
      },
    });

    return res.json({ success: true, data: template });
  } catch (error: any) {
    console.error('[social-report]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

/**
 * DELETE /api/social/templates/:id
 */
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.socialTemplate.delete({ where: { id } });
    return res.json({ success: true, message: 'Template eliminato' });
  } catch (error: any) {
    console.error('[social-report]', error);
    return res.status(500).json({ success: false, message: 'Errore interno' });
  }
};

function computeNextSendDate(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case 'WEEKLY':
      return new Date(now.getTime() + 7 * 86400_000);
    case 'BIWEEKLY':
      return new Date(now.getTime() + 14 * 86400_000);
    case 'MONTHLY':
    default:
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
}
