import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { sendEmail } from '../services/email.service';
import { generateFormSchema } from '../services/social/ai.service';
import { createNotification } from './notification.controller';

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'https://studiomismo.com/';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'form';
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let i = 2;
  while (await prisma.form.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

/** Email notification on submission → SUPER_ADMIN + DEVELOPER + per-form extra recipients. */
async function notifySubmission(form: any, submission: any) {
  try {
    const settings = (form.schema as any)?.settings || {};
    const roles: any[] = Array.isArray(settings.notifyRoles) && settings.notifyRoles.length
      ? settings.notifyRoles
      : ['SUPER_ADMIN', 'DEVELOPER'];
    const notifyToRoles = settings.notifyToRoles !== false;
    const customEmails: string[] = Array.isArray(settings.customEmails)
      ? settings.customEmails.filter((e: any) => typeof e === 'string' && e.includes('@')).map((e: string) => e.trim())
      : [];

    const recipients = await prisma.user.findMany({
      where: { role: { in: roles }, isActive: true },
      select: { id: true, email: true },
    });

    const emails = new Set<string>(notifyToRoles ? (recipients.map(r => r.email).filter(Boolean) as string[]) : []);
    customEmails.forEach(e => emails.add(e));

    // In-portal notification (persists until read) for each role recipient
    for (const r of recipients) {
      try {
        await createNotification(
          r.id,
          'FORM_SUBMISSION',
          `Nuovo invio: ${form.name}`,
          'È arrivata una nuova risposta al form',
          `/forms/${form.id}`,
          undefined,
          undefined,
          { submissionId: submission.id }
        );
      } catch (e: any) {
        console.error('[forms] notification error:', e.message);
      }
    }

    const data = (submission.data as Record<string, any>) || {};
    const fields = (form.schema as any)?.fields || [];
    const summary = fields
      .map((f: any) => `${f.label}: ${data[f.id] ?? data[f.key] ?? '—'}`)
      .join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;">
        <div style="background:#000;color:#fff;padding:24px 30px;"><h1 style="margin:0;font-size:20px;">Nuovo invio form</h1></div>
        <div style="padding:30px;background:#fff;">
          <p style="margin:0 0 16px;">È stato compilato il form <strong>${form.name}</strong>.</p>
          <div style="background:#fafafa;border:1px solid #e0e0e0;border-left:4px solid #000;padding:20px;white-space:pre-wrap;font-size:14px;color:#333;">${summary}</div>
          <p style="margin:20px 0 0;"><a href="${FRONTEND_URL()}forms/submissions" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;display:inline-block;">Vedi invii</a></p>
        </div>
        <div style="text-align:center;padding:20px;background:#fafafa;border-top:1px solid #e0e0e0;color:#666;font-size:12px;">Studio Mismo CRM — email automatica</div>
      </div>`;

    for (const email of emails) {
      await sendEmail(email, `Nuovo invio form: ${form.name}`, html, `Nuovo invio form "${form.name}"\n\n${summary}`);
    }
  } catch (e: any) {
    console.error('[forms] notifySubmission error:', e.message);
  }
}

// === Admin CRUD ===

export const getForms = async (req: AuthRequest, res: Response) => {
  try {
    const forms = await prisma.form.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { submissions: true } } },
    });
    res.json({ success: true, data: forms });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getForm = async (req: AuthRequest, res: Response) => {
  try {
    const form = await prisma.form.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!form) return res.status(404).json({ success: false, message: 'Form non trovato' });
    res.json({ success: true, data: form });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const createForm = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, schema, slug: slugInput } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nome obbligatorio' });
    const slug = await uniqueSlug(slugInput?.trim() ? slugInput : name);
    const form = await prisma.form.create({
      data: {
        name,
        slug,
        description,
        schema: schema || { fields: [], pages: [], settings: {} },
        status: 'DRAFT',
        createdBy: req.user!.userId,
      },
    });
    res.status(201).json({ success: true, data: form });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const updateForm = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, schema, status, slug: slugInput } = req.body;
    let slug: string | undefined;
    if (slugInput !== undefined) {
      const current = await prisma.form.findUnique({ where: { id }, select: { slug: true } });
      const wanted = slugify(slugInput.trim() ? slugInput : (name || current?.slug || 'form'));
      if (wanted && wanted !== current?.slug) {
        // ensure uniqueness excluding this form itself
        let s = wanted;
        let i = 2;
        while (await prisma.form.findFirst({ where: { slug: s, id: { not: id } } })) {
          s = `${wanted}-${i++}`;
        }
        slug = s;
      }
    }
    const form = await prisma.form.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(schema !== undefined && { schema }),
        ...(status !== undefined && { status }),
        ...(slug !== undefined && { slug }),
      },
    });
    res.json({ success: true, data: form });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const deleteForm = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.form.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Form eliminato' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/** POST /api/forms/ai/generate — generate a form schema from a description (AI). */
export const aiGenerateForm = async (req: AuthRequest, res: Response) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ success: false, message: 'Descrizione obbligatoria' });
    const result = await generateFormSchema(description);
    res.json({ success: true, data: result });
  } catch (e: any) {
    console.error('[forms] aiGenerateForm error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
};

// === Public fill ===

export const getPublicForm = async (req: Request, res: Response) => {
  try {
    const form = await prisma.form.findUnique({ where: { slug: req.params.slug } });
    if (!form || form.status === 'DRAFT' || form.status === 'ARCHIVED') {
      return res.status(404).json({ success: false, message: 'Form non trovato' });
    }
    if (form.status === 'DISABLED') {
      return res.status(410).json({ success: false, message: 'Questo form è momentaneamente disabilitato' });
    }
    res.json({ success: true, data: { id: form.id, name: form.name, description: form.description, schema: form.schema } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const submitPublicForm = async (req: Request, res: Response) => {
  try {
    const form = await prisma.form.findUnique({ where: { slug: req.params.slug } });
    if (!form || form.status === 'DRAFT' || form.status === 'ARCHIVED') {
      return res.status(404).json({ success: false, message: 'Form non trovato' });
    }
    if (form.status === 'DISABLED') {
      return res.status(410).json({ success: false, message: 'Questo form è momentaneamente disabilitato' });
    }
    const { data } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, message: 'Dati mancanti' });
    }
    const submission = await prisma.formSubmission.create({
      data: { formId: form.id, data },
    });
    await notifySubmission(form, submission);
    res.status(201).json({ success: true, data: { id: submission.id } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// === Submissions ===

export const getSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const formId = req.params.id ? parseInt(req.params.id) : undefined;
    const { search, contactId, status } = req.query as any;

    const where: any = {};
    if (formId) where.formId = formId;
    if (contactId) where.contactId = parseInt(contactId);

    const submissions = await prisma.formSubmission.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      take: 500,
      include: { form: { select: { id: true, name: true } }, contact: { select: { id: true, name: true } } },
    });

    // client-side search on ragione sociale (field with label containing 'ragione sociale' / 'nome')
    let filtered = submissions;
    if (search) {
      const q = (search as string).toLowerCase();
      filtered = submissions.filter(s => {
        const d = (s.data as any) || {};
        const haystack = Object.values(d).join(' ').toLowerCase();
        return haystack.includes(q) || (s.contact?.name || '').toLowerCase().includes(q);
      });
    }

    res.json({ success: true, data: filtered });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const assignSubmission = async (req: AuthRequest, res: Response) => {
  try {
    const { contactId } = req.body;
    const submission = await prisma.formSubmission.update({
      where: { id: parseInt(req.params.id) },
      data: { contactId: contactId ? parseInt(contactId) : null },
    });
    res.json({ success: true, data: submission });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const markSubmissionRead = async (req: AuthRequest, res: Response) => {
  try {
    const submission = await prisma.formSubmission.update({
      where: { id: parseInt(req.params.id) },
      data: { readAt: new Date() },
    });
    res.json({ success: true, data: submission });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const deleteSubmission = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.formSubmission.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Invio eliminato' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/** Count of form submissions received in the current month. */
export const getMonthStats = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const count = await prisma.formSubmission.count({
      where: { submittedAt: { gte: start, lt: end } },
    });
    res.json({ success: true, data: { count } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};
