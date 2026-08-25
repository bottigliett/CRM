import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Verify the caller is a DEVELOPER. Returns the user id or null.
async function requireDeveloper(req: AuthRequest, res: Response): Promise<number | null> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Non autenticato' });
    return null;
  }
  const u = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!u || u.role !== 'DEVELOPER') {
    res.status(403).json({ success: false, message: 'Riservato agli sviluppatori' });
    return null;
  }
  return u.id;
}

// === Personal Clients ===

export const getPersonalClients = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const clients = await prisma.personalClient.findMany({ orderBy: { name: 'asc' } });
    return res.json({ success: true, data: clients });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const createPersonalClient = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const { name, address, piva, cf } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Nome obbligatorio' });
    const client = await prisma.personalClient.create({
      data: { name: name.trim(), address: address || null, piva: piva || null, cf: cf || null },
    });
    return res.status(201).json({ success: true, data: client });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updatePersonalClient = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const id = parseInt(req.params.id);
    const { name, address, piva, cf } = req.body;
    const client = await prisma.personalClient.update({
      where: { id },
      data: { name: name?.trim(), address, piva, cf },
    });
    return res.json({ success: true, data: client });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const deletePersonalClient = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const id = parseInt(req.params.id);
    await prisma.personalClient.delete({ where: { id } });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// === Personal Invoices ===

export const getPersonalInvoices = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const invoices = await prisma.personalInvoice.findMany({
      include: { personalClient: true, paymentEntity: true },
      orderBy: { issueDate: 'desc' },
    });
    return res.json({ success: true, data: invoices });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

function nextInvoiceNumber(year: number, existing: string[]): string {
  const prefix = `PERS/${year}/`;
  const nums = existing
    .filter(n => n.startsWith(prefix))
    .map(n => parseInt(n.slice(prefix.length)) || 0);
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export const createPersonalInvoice = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const body = req.body;
    const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();
    const year = issueDate.getFullYear();

    const existing = await prisma.personalInvoice.findMany({ select: { invoiceNumber: true } });
    const invoiceNumber = nextInvoiceNumber(year, existing.map(i => i.invoiceNumber));

    const invoice = await prisma.personalInvoice.create({
      data: {
        invoiceNumber,
        personalClientId: body.personalClientId ? parseInt(body.personalClientId) : null,
        paymentEntityId: body.paymentEntityId ? parseInt(body.paymentEntityId) : null,
        clientName: body.clientName || '',
        clientAddress: body.clientAddress || null,
        clientPIva: body.clientPIva || null,
        clientCF: body.clientCF || null,
        subject: body.subject || '',
        description: body.description || null,
        quantity: body.quantity ?? 1,
        unitPrice: body.unitPrice ?? 0,
        subtotal: body.subtotal ?? 0,
        vatPercentage: body.vatPercentage ?? 0,
        vatAmount: body.vatAmount ?? 0,
        total: body.total ?? 0,
        issueDate,
        dueDate: body.dueDate ? new Date(body.dueDate) : issueDate,
        paymentDays: body.paymentDays ?? 30,
        status: body.status || 'DRAFT',
        paymentMethod: body.paymentMethod || null,
        paymentNotes: body.paymentNotes || null,
        taxReserved: body.taxReserved === true || body.taxReserved === 'true',
        taxAmount: body.taxAmount ?? null,
        electronicInvoiceNumber: body.electronicInvoiceNumber || null,
        fiscalNotes: body.fiscalNotes || null,
        createdBy: userId,
      },
      include: { personalClient: true, paymentEntity: true },
    });
    return res.status(201).json({ success: true, data: invoice });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updatePersonalInvoice = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const data: any = {};
    const strFields = ['clientName', 'clientAddress', 'clientPIva', 'clientCF', 'subject', 'description', 'paymentMethod', 'paymentNotes', 'electronicInvoiceNumber', 'fiscalNotes', 'status'];
    for (const f of strFields) if (body[f] !== undefined) data[f] = body[f];
    const numFields = ['quantity', 'unitPrice', 'subtotal', 'vatPercentage', 'vatAmount', 'total', 'taxAmount', 'paymentDays'];
    for (const f of numFields) if (body[f] !== undefined) data[f] = Number(body[f]);
    if (body.personalClientId !== undefined) data.personalClientId = body.personalClientId ? parseInt(body.personalClientId) : null;
    if (body.paymentEntityId !== undefined) data.paymentEntityId = body.paymentEntityId ? parseInt(body.paymentEntityId) : null;
    if (body.issueDate) data.issueDate = new Date(body.issueDate);
    if (body.dueDate) data.dueDate = new Date(body.dueDate);
    if (body.paymentDate) data.paymentDate = new Date(body.paymentDate);
    if (body.taxReserved !== undefined) data.taxReserved = body.taxReserved === true || body.taxReserved === 'true';

    const invoice = await prisma.personalInvoice.update({ where: { id }, data, include: { personalClient: true, paymentEntity: true } });
    return res.json({ success: true, data: invoice });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const deletePersonalInvoice = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const id = parseInt(req.params.id);
    await prisma.personalInvoice.delete({ where: { id } });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// === Comparison chart (Davide vs Stefano) ===

export const getComparison = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const granularity = req.query.granularity === 'yearly' ? 'yearly' : 'monthly';

    // CRM invoices: Davide = payment entity 1, Stefano = 3 (Cointestato=2 excluded)
    const crmInvoices = await prisma.invoice.findMany({
      where: { status: 'PAID', paymentEntityId: { in: [1, 3] } },
      select: { issueDate: true, total: true, paymentEntityId: true },
    });
    const personalInvoices = await prisma.personalInvoice.findMany({
      where: { status: 'PAID' },
      select: { issueDate: true, total: true },
    });

    const bucket = (d: Date): string => {
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      return granularity === 'yearly' ? String(y) : `${y}-${String(m).padStart(2, '0')}`;
    };

    const map = new Map<string, { davide: number; stefano: number }>();
    const add = (key: string, davide: number, stefano: number) => {
      const cur = map.get(key) || { davide: 0, stefano: 0 };
      cur.davide += davide;
      cur.stefano += stefano;
      map.set(key, cur);
    };

    for (const inv of crmInvoices) {
      const key = bucket(inv.issueDate);
      if (inv.paymentEntityId === 1) add(key, inv.total, 0);
      else add(key, 0, inv.total);
    }
    for (const inv of personalInvoices) {
      add(bucket(inv.issueDate), inv.total, 0); // personal invoices always count on Davide
    }

    const data = [...map.entries()]
      .map(([period, v]) => ({ period, davide: v.davide, stefano: v.stefano }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return res.json({ success: true, data });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// === Personal Recurring Invoices ===

export const getPersonalRecurringInvoices = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const list = await prisma.personalRecurringInvoice.findMany({
      include: { contact: true, paymentEntity: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: list });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const createPersonalRecurringInvoice = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const b = req.body;
    const rec = await prisma.personalRecurringInvoice.create({
      data: {
        contactId: b.contactId ? parseInt(b.contactId) : null,
        paymentEntityId: b.paymentEntityId ? parseInt(b.paymentEntityId) : null,
        clientName: b.clientName || '',
        clientAddress: b.clientAddress || null,
        clientPIva: b.clientPIva || null,
        clientCF: b.clientCF || null,
        subjectTemplate: b.subjectTemplate || '',
        description: b.description || null,
        quantity: b.quantity ?? 1,
        unitPrice: b.unitPrice ?? 0,
        subtotal: b.subtotal ?? 0,
        vatPercentage: b.vatPercentage ?? 0,
        vatAmount: b.vatAmount ?? 0,
        total: b.total ?? 0,
        paymentDays: b.paymentDays ?? 30,
        generationDay: b.generationDay ?? 10,
        fiscalNotes: b.fiscalNotes || null,
        isActive: b.isActive !== false,
        createdBy: userId,
      },
      include: { contact: true, paymentEntity: true },
    });
    return res.status(201).json({ success: true, data: rec });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updatePersonalRecurringInvoice = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const id = parseInt(req.params.id);
    const b = req.body;
    const data: any = {};
    for (const f of ['clientName', 'clientAddress', 'clientPIva', 'clientCF', 'subjectTemplate', 'description', 'fiscalNotes']) {
      if (b[f] !== undefined) data[f] = b[f];
    }
    for (const f of ['quantity', 'unitPrice', 'subtotal', 'vatPercentage', 'vatAmount', 'total', 'paymentDays', 'generationDay']) {
      if (b[f] !== undefined) data[f] = Number(b[f]);
    }
    if (b.contactId !== undefined) data.contactId = b.contactId ? parseInt(b.contactId) : null;
    if (b.paymentEntityId !== undefined) data.paymentEntityId = b.paymentEntityId ? parseInt(b.paymentEntityId) : null;
    if (b.isActive !== undefined) data.isActive = b.isActive === true || b.isActive === 'true';
    const rec = await prisma.personalRecurringInvoice.update({ where: { id }, data, include: { contact: true, paymentEntity: true } });
    return res.json({ success: true, data: rec });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const deletePersonalRecurringInvoice = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const id = parseInt(req.params.id);
    await prisma.personalRecurringInvoice.delete({ where: { id } });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Next invoice number (PERS/anno/n)
export const getNextPersonalInvoiceNumber = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const year = new Date().getFullYear();
    const existing = await prisma.personalInvoice.findMany({ select: { invoiceNumber: true } });
    return res.json({ success: true, data: { invoiceNumber: nextInvoiceNumber(year, existing.map(i => i.invoiceNumber)) } });
  } catch (e: any) { return res.status(500).json({ success: false, message: e.message }); }
};

// Reserve taxes with a percentage
export const reservePersonalTaxes = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const id = parseInt(req.params.id);
    const pct = req.body.taxPercentage ?? 28;
    const inv = await prisma.personalInvoice.findUnique({ where: { id } });
    if (!inv) return res.status(404).json({ success: false, message: 'Fattura non trovata' });
    const amount = inv.total * (pct / 100);
    await prisma.personalInvoice.update({ where: { id }, data: { taxReserved: true, taxAmount: amount } });
    return res.json({ success: true, message: 'Tasse accantonate' });
  } catch (e: any) { return res.status(500).json({ success: false, message: e.message }); }
};

// Patch a single field (electronicInvoiceNumber)
export const patchPersonalInvoice = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const id = parseInt(req.params.id);
    const data: any = {};
    if (req.body.electronicInvoiceNumber !== undefined) data.electronicInvoiceNumber = req.body.electronicInvoiceNumber;
    await prisma.personalInvoice.update({ where: { id }, data });
    return res.json({ success: true });
  } catch (e: any) { return res.status(500).json({ success: false, message: e.message }); }
};

// Duplicate a personal invoice
export const duplicatePersonalInvoice = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const id = parseInt(req.params.id);
    const src = await prisma.personalInvoice.findUnique({ where: { id } });
    if (!src) return res.status(404).json({ success: false, message: 'Fattura non trovata' });
    const year = new Date().getFullYear();
    const existing = await prisma.personalInvoice.findMany({ select: { invoiceNumber: true } });
    const invoiceNumber = nextInvoiceNumber(year, existing.map(i => i.invoiceNumber));
    const copy = await prisma.personalInvoice.create({
      data: {
        invoiceNumber,
        clientName: src.clientName, clientAddress: src.clientAddress, clientPIva: src.clientPIva, clientCF: src.clientCF,
        subject: src.subject, description: src.description,
        quantity: src.quantity, unitPrice: src.unitPrice, subtotal: src.subtotal,
        vatPercentage: src.vatPercentage, vatAmount: src.vatAmount, total: src.total,
        issueDate: new Date(), dueDate: new Date(Date.now() + src.paymentDays * 86400000),
        paymentDays: src.paymentDays, status: 'DRAFT', fiscalNotes: src.fiscalNotes,
        createdBy: userId,
      },
    });
    return res.status(201).json({ success: true, data: copy });
  } catch (e: any) { return res.status(500).json({ success: false, message: e.message }); }
};

// Generate a PersonalInvoice from a recurring template
export const generatePersonalRecurringInvoice = async (req: AuthRequest, res: Response) => {
  const userId = await requireDeveloper(req, res);
  if (userId === null) return;
  try {
    const id = parseInt(req.params.id);
    const rec = await prisma.personalRecurringInvoice.findUnique({ where: { id } });
    if (!rec) return res.status(404).json({ success: false, message: 'Template non trovato' });

    const now = new Date();
    const year = now.getFullYear();
    const existing = await prisma.personalInvoice.findMany({ select: { invoiceNumber: true } });
    const invoiceNumber = nextInvoiceNumber(year, existing.map(i => i.invoiceNumber));

    const invoice = await prisma.personalInvoice.create({
      data: {
        invoiceNumber,
        paymentEntityId: rec.paymentEntityId,
        clientName: rec.clientName,
        clientAddress: rec.clientAddress,
        clientPIva: rec.clientPIva,
        clientCF: rec.clientCF,
        subject: rec.subjectTemplate,
        description: rec.description,
        quantity: rec.quantity,
        unitPrice: rec.unitPrice,
        subtotal: rec.subtotal,
        vatPercentage: rec.vatPercentage,
        vatAmount: rec.vatAmount,
        total: rec.total,
        issueDate: now,
        dueDate: new Date(now.getTime() + rec.paymentDays * 86400000),
        paymentDays: rec.paymentDays,
        status: 'DRAFT',
        fiscalNotes: rec.fiscalNotes,
        createdBy: userId,
      },
    });
    return res.status(201).json({ success: true, data: invoice });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
