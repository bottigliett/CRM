import { Request, Response } from 'express';
import prisma from '../config/database';

const MESI_ITALIANI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

// Get all recurring invoice templates
export const getRecurringInvoices = async (req: Request, res: Response) => {
  try {
    const recurringInvoices = await prisma.recurringInvoice.findMany({
      where: { isActive: true },
      include: {
        contact: {
          select: { id: true, name: true, email: true, type: true },
        },
        paymentEntity: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, username: true, firstName: true, lastName: true },
        },
        generations: {
          orderBy: { generatedAt: 'desc' },
          take: 12,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: recurringInvoices,
    });
  } catch (error: any) {
    console.error('Error fetching recurring invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle fatture ricorrenti',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get single recurring invoice by ID
export const getRecurringInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const recurringInvoice = await prisma.recurringInvoice.findUnique({
      where: { id: parseInt(id) },
      include: {
        contact: {
          select: { id: true, name: true, email: true, type: true },
        },
        paymentEntity: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, username: true, firstName: true, lastName: true },
        },
        generations: {
          include: {
            invoice: {
              select: { id: true, invoiceNumber: true, status: true, total: true },
            },
          },
          orderBy: { generatedAt: 'desc' },
        },
      },
    });

    if (!recurringInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Fattura ricorrente non trovata',
      });
    }

    res.json({
      success: true,
      data: recurringInvoice,
    });
  } catch (error: any) {
    console.error('Error fetching recurring invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero della fattura ricorrente',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Create a new recurring invoice template
export const createRecurringInvoice = async (req: Request, res: Response) => {
  try {
    const {
      contactId,
      clientName,
      clientAddress,
      clientPIva,
      clientCF,
      subjectTemplate,
      description,
      quantity,
      unitPrice,
      subtotal: providedSubtotal,
      vatPercentage,
      vatAmount: providedVatAmount,
      total: providedTotal,
      paymentEntityId,
      paymentDays,
      generationDay,
      fiscalNotes,
    } = req.body;

    const userId = (req as any).user?.userId;

    if (!contactId || !clientName || !subjectTemplate || !paymentEntityId) {
      return res.status(400).json({
        success: false,
        message: 'Campi obbligatori mancanti (contactId, clientName, subjectTemplate, paymentEntityId)',
      });
    }

    const qty = parseFloat(quantity || '1');
    const price = parseFloat(unitPrice || '0');
    const vat = parseFloat(vatPercentage || '0');
    const subtotal = providedSubtotal !== undefined ? parseFloat(providedSubtotal) : qty * price;
    const vatAmount = providedVatAmount !== undefined ? parseFloat(providedVatAmount) : subtotal * (vat / 100);
    const total = providedTotal !== undefined ? parseFloat(providedTotal) : subtotal + vatAmount;

    const recurringInvoice = await prisma.recurringInvoice.create({
      data: {
        contactId: parseInt(contactId),
        clientName,
        clientAddress: clientAddress || null,
        clientPIva: clientPIva || null,
        clientCF: clientCF || null,
        subjectTemplate,
        description: description || null,
        quantity: qty,
        unitPrice: price,
        subtotal,
        vatPercentage: vat,
        vatAmount,
        total,
        paymentEntityId: parseInt(paymentEntityId),
        paymentDays: parseInt(paymentDays || '30'),
        generationDay: parseInt(generationDay || '10'),
        fiscalNotes: fiscalNotes || null,
        createdBy: userId,
      },
      include: {
        contact: {
          select: { id: true, name: true, email: true, type: true },
        },
        paymentEntity: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Fattura ricorrente creata con successo',
      data: recurringInvoice,
    });
  } catch (error: any) {
    console.error('Error creating recurring invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione della fattura ricorrente',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Update a recurring invoice template
export const updateRecurringInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      contactId,
      clientName,
      clientAddress,
      clientPIva,
      clientCF,
      subjectTemplate,
      description,
      quantity,
      unitPrice,
      subtotal: providedSubtotal,
      vatPercentage,
      vatAmount: providedVatAmount,
      total: providedTotal,
      paymentEntityId,
      paymentDays,
      generationDay,
      fiscalNotes,
    } = req.body;

    const existing = await prisma.recurringInvoice.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Fattura ricorrente non trovata',
      });
    }

    const updateData: any = {};
    if (contactId !== undefined) updateData.contactId = parseInt(contactId);
    if (clientName !== undefined) updateData.clientName = clientName;
    if (clientAddress !== undefined) updateData.clientAddress = clientAddress || null;
    if (clientPIva !== undefined) updateData.clientPIva = clientPIva || null;
    if (clientCF !== undefined) updateData.clientCF = clientCF || null;
    if (subjectTemplate !== undefined) updateData.subjectTemplate = subjectTemplate;
    if (description !== undefined) updateData.description = description || null;
    if (fiscalNotes !== undefined) updateData.fiscalNotes = fiscalNotes || null;
    if (paymentEntityId !== undefined) updateData.paymentEntityId = parseInt(paymentEntityId);
    if (paymentDays !== undefined) updateData.paymentDays = parseInt(paymentDays);
    if (generationDay !== undefined) updateData.generationDay = parseInt(generationDay);

    if (quantity !== undefined || unitPrice !== undefined || providedSubtotal !== undefined) {
      const qty = parseFloat(quantity ?? existing.quantity);
      const price = parseFloat(unitPrice ?? existing.unitPrice);
      const vat = parseFloat(vatPercentage ?? existing.vatPercentage);
      updateData.quantity = qty;
      updateData.unitPrice = price;
      updateData.vatPercentage = vat;
      updateData.subtotal = providedSubtotal !== undefined ? parseFloat(providedSubtotal) : qty * price;
      updateData.vatAmount = providedVatAmount !== undefined ? parseFloat(providedVatAmount) : updateData.subtotal * (vat / 100);
      updateData.total = providedTotal !== undefined ? parseFloat(providedTotal) : updateData.subtotal + updateData.vatAmount;
    }

    const recurringInvoice = await prisma.recurringInvoice.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        contact: {
          select: { id: true, name: true, email: true, type: true },
        },
        paymentEntity: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({
      success: true,
      message: 'Fattura ricorrente aggiornata con successo',
      data: recurringInvoice,
    });
  } catch (error: any) {
    console.error('Error updating recurring invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento della fattura ricorrente',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Soft delete (deactivate) a recurring invoice
export const deleteRecurringInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.recurringInvoice.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Fattura ricorrente non trovata',
      });
    }

    await prisma.recurringInvoice.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Fattura ricorrente disattivata con successo',
    });
  } catch (error: any) {
    console.error('Error deleting recurring invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella disattivazione della fattura ricorrente',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get generation status for a given month/year
export const getGenerationStatus = async (req: Request, res: Response) => {
  try {
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Mese e anno obbligatori (month: 1-12, year)',
      });
    }

    const templates = await prisma.recurringInvoice.findMany({
      where: { isActive: true },
      select: { id: true, clientName: true, subjectTemplate: true, total: true },
    });

    const generations = await prisma.recurringInvoiceGeneration.findMany({
      where: { month, year },
      select: {
        recurringInvoiceId: true,
        invoiceId: true,
        invoice: {
          select: { id: true, invoiceNumber: true, status: true },
        },
      },
    });

    const generationMap = new Map(
      generations.map((g) => [g.recurringInvoiceId, g])
    );

    const status = templates.map((t) => {
      const gen = generationMap.get(t.id);
      return {
        recurringInvoiceId: t.id,
        clientName: t.clientName,
        subjectTemplate: t.subjectTemplate,
        total: t.total,
        generated: !!gen,
        invoice: gen?.invoice || null,
      };
    });

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('Error fetching generation status:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dello stato di generazione',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Generate monthly invoices from active templates
export const generateMonthlyInvoices = async (req: Request, res: Response) => {
  try {
    const { month, year, paymentEntityId, templateIds } = req.body;
    const userId = (req as any).user?.userId;

    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Mese e anno obbligatori (month: 1-12, year)',
      });
    }

    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);

    // Get active templates, optionally filtered by payment entity or specific IDs
    const whereClause: any = { isActive: true };
    if (templateIds?.length) {
      whereClause.id = { in: templateIds.map((id: any) => parseInt(id)) };
    } else if (paymentEntityId) {
      whereClause.paymentEntityId = parseInt(paymentEntityId);
    }

    const templates = await prisma.recurringInvoice.findMany({
      where: whereClause,
      include: {
        contact: true,
        paymentEntity: true,
      },
    });

    // Check which ones already have generations for this month
    const existingGenerations = await prisma.recurringInvoiceGeneration.findMany({
      where: { month: parsedMonth, year: parsedYear },
      select: { recurringInvoiceId: true },
    });

    const alreadyGenerated = new Set(existingGenerations.map((g) => g.recurringInvoiceId));
    const toGenerate = templates.filter((t) => !alreadyGenerated.has(t.id));

    if (toGenerate.length === 0) {
      return res.json({
        success: true,
        message: 'Tutte le fatture per questo mese sono già state generate',
        data: {
          generated: 0,
          skipped: templates.length,
          invoices: [],
        },
      });
    }

    // Generate invoices in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const generatedInvoices = [];

      for (const template of toGenerate) {
        // Replace placeholders in subject
        const meseNome = MESI_ITALIANI[parsedMonth - 1];
        const subject = template.subjectTemplate
          .replace(/\{mese\}/gi, meseNome)
          .replace(/\{anno\}/gi, parsedYear.toString());

        // Generate next invoice number (numeric max, not string sort)
        const allInvoices = await tx.invoice.findMany({
          where: { invoiceNumber: { contains: parsedYear.toString() } },
          select: { invoiceNumber: true },
        });

        let maxSeq = 0;
        for (const inv of allInvoices) {
          const match = inv.invoiceNumber.match(/#(\d+)\d{4}$/);
          if (match) {
            const seq = parseInt(match[1]);
            if (seq > maxSeq) maxSeq = seq;
          }
        }

        let nextNumber = `#${String(maxSeq + 1).padStart(2, '0')}${parsedYear}`;

        // Also check invoices just created in this transaction
        if (generatedInvoices.length > 0) {
          const lastGenerated = generatedInvoices[generatedInvoices.length - 1];
          const match = lastGenerated.invoiceNumber.match(/#(\d+)(\d{4})$/);
          if (match && match[2] === parsedYear.toString()) {
            const seqFromGenerated = parseInt(match[1]);
            const seqFromDb = parseInt(nextNumber.match(/#(\d+)/)?.[1] || '0');
            if (seqFromGenerated >= seqFromDb) {
              nextNumber = `#${String(seqFromGenerated + 1).padStart(2, '0')}${parsedYear}`;
            }
          }
        }

        // Issue date = today
        const issueDate = new Date();

        // Calculate due date
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + template.paymentDays);

        // Create the invoice as DRAFT
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber: nextNumber,
            contactId: template.contactId,
            clientName: template.clientName,
            clientAddress: template.clientAddress,
            clientPIva: template.clientPIva,
            clientCF: template.clientCF,
            subject,
            description: template.description,
            quantity: template.quantity,
            unitPrice: template.unitPrice,
            subtotal: template.subtotal,
            vatPercentage: template.vatPercentage,
            vatAmount: template.vatAmount,
            total: template.total,
            issueDate,
            dueDate,
            paymentDays: template.paymentDays,
            status: 'DRAFT',
            fiscalNotes: template.fiscalNotes,
            paymentEntityId: template.paymentEntityId,
            createdBy: userId,
          },
        });

        // Create generation record
        await tx.recurringInvoiceGeneration.create({
          data: {
            recurringInvoiceId: template.id,
            invoiceId: invoice.id,
            month: parsedMonth,
            year: parsedYear,
          },
        });

        generatedInvoices.push(invoice);
      }

      return generatedInvoices;
    });

    res.json({
      success: true,
      message: `${result.length} fatture generate con successo`,
      data: {
        generated: result.length,
        skipped: alreadyGenerated.size,
        invoices: result,
      },
    });
  } catch (error: any) {
    console.error('Error generating monthly invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella generazione delle fatture mensili',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
