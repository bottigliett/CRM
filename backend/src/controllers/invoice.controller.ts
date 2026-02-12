import { Request, Response } from 'express';
import prisma from '../config/database';
import { InvoiceStatus } from '@prisma/client';
import { sendClientInvoiceCreatedEmail } from '../services/email.service';

// Get all invoices with filters
export const getInvoices = async (req: Request, res: Response) => {
  try {
    const {
      status = 'all',
      period = 'all',
      year, // Specific year filter (e.g., "2026", "2025")
      search = '',
      unpaidOnly = 'false',
      currentYear = 'true',
      page = '1',
      limit = '20',
      includeStats = 'false',
    } = req.query;

    // Build where clause
    const where: any = {};

    // Status filter
    // For overdue check, use start of today (midnight) so invoices are only overdue AFTER their due date
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (status !== 'all') {
      if (status === 'overdue') {
        // Overdue: status = ISSUED and dueDate < start of today (not including today)
        where.status = 'ISSUED';
        where.dueDate = { lt: startOfToday };
      } else {
        where.status = (status as string).toUpperCase();
      }
    }

    // Period filter
    const filterYear = year ? parseInt(year as string) : now.getFullYear();

    if (period === 'this-month' || period === 'current_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      where.issueDate = { gte: startOfMonth, lte: endOfMonth };
    } else if (period === 'last-month' || period === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      where.issueDate = { gte: startOfLastMonth, lte: endOfLastMonth };
    } else if (period === 'this-year' || period === 'current_year') {
      // Use specific year if provided, otherwise current year
      const startOfYear = new Date(filterYear, 0, 1);
      const endOfYear = new Date(filterYear, 11, 31, 23, 59, 59);
      where.issueDate = { gte: startOfYear, lte: endOfYear };
    } else if (period === 'last-year') {
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
      where.issueDate = { gte: startOfLastYear, lte: endOfLastYear };
    } else if (period === 'this-quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      where.issueDate = { gte: startOfQuarter };
    } else if (period === 'last-quarter') {
      const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
      const quarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const adjustedQuarter = lastQuarter < 0 ? 3 : lastQuarter;
      const startOfLastQuarter = new Date(quarterYear, adjustedQuarter * 3, 1);
      const endOfLastQuarter = new Date(quarterYear, (adjustedQuarter + 1) * 3, 0);
      where.issueDate = { gte: startOfLastQuarter, lte: endOfLastQuarter };
    }

    // Current year filter (checkbox) - only if period is 'all'
    // If year is explicitly provided, use that; otherwise use current year
    if (period === 'all' && year) {
      const startOfYear = new Date(filterYear, 0, 1);
      const endOfYear = new Date(filterYear, 11, 31, 23, 59, 59);
      where.issueDate = { gte: startOfYear, lte: endOfYear };
    } else if (currentYear === 'true' && period === 'all') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      where.issueDate = { gte: startOfYear };
    }

    // Unpaid only filter
    if (unpaidOnly === 'true') {
      where.status = { in: ['DRAFT', 'ISSUED'] };
    }

    // Search filter
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { clientName: { contains: search } },
        { subject: { contains: search } },
        { clientPIva: { contains: search } },
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await prisma.invoice.count({ where });

    // Fetch invoices with pagination
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            partitaIva: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        paymentEntity: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { issueDate: 'desc' },
      skip,
      take: limitNum,
    });

    // Add isOverdue flag (overdue only after due date, not on the same day)
    const invoicesWithFlags = invoices.map((invoice: any) => ({
      ...invoice,
      isOverdue: invoice.status === 'ISSUED' && invoice.dueDate < startOfToday,
    }));

    // Calculate statistics if requested
    let statistics = null;
    if (includeStats === 'true') {
      // Use specific year if provided, otherwise current year for stats
      const statsYear = year ? filterYear : now.getFullYear();
      const allInvoices = await prisma.invoice.findMany({
        where: currentYear === 'true' || year ? {
          issueDate: {
            gte: new Date(statsYear, 0, 1),
            lte: new Date(statsYear, 11, 31, 23, 59, 59)
          }
        } : {},
      });

      const totalIssued = allInvoices
        .filter((i: any) => i.status !== 'DRAFT')
        .reduce((sum: number, i: any) => sum + i.total, 0);

      const totalCollected = allInvoices
        .filter((i: any) => i.status === 'PAID')
        .reduce((sum: number, i: any) => sum + i.total, 0);

      const totalPending = allInvoices
        .filter((i: any) => i.status === 'ISSUED' && i.dueDate >= startOfToday)
        .reduce((sum: number, i: any) => sum + i.total, 0);

      const overdueInvoices = allInvoices
        .filter((i: any) => i.status === 'ISSUED' && i.dueDate < startOfToday);

      const overdueAmount = overdueInvoices.reduce((sum: number, i: any) => sum + i.total, 0);

      statistics = {
        totalIssued,
        totalCollected,
        totalPending,
        overdueCount: overdueInvoices.length,
        overdueAmount,
      };
    }

    res.json({
      success: true,
      data: {
        invoices: invoicesWithFlags,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
        statistics,
      },
      filters: { status, period, search, unpaidOnly, currentYear },
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle fatture',
      error: error.message,
    });
  }
};

// Get single invoice by ID
export const getInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: {
        contact: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        paymentEntity: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Fattura non trovata',
      });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const invoiceWithFlags = {
      ...invoice,
      isOverdue: invoice.status === 'ISSUED' && invoice.dueDate < startOfToday,
    };

    res.json({
      success: true,
      data: invoiceWithFlags,
    });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero della fattura',
      error: error.message,
    });
  }
};

// Create new invoice
export const createInvoice = async (req: Request, res: Response) => {
  try {
    const {
      invoiceNumber,
      contactId,
      clientName,
      clientAddress,
      clientPIva,
      clientCF,
      subject,
      description,
      quantity,
      unitPrice,
      subtotal: providedSubtotal,
      total: providedTotal,
      vatPercentage,
      vatAmount: providedVatAmount,
      paymentDays,
      issueDate,
      dueDate,
      status,
      paymentDate,
      paymentMethod,
      paymentNotes,
      fiscalNotes,
      paymentEntityId,
    } = req.body;

    const userId = (req as any).user?.userId;

    // Validation
    if (!invoiceNumber || !clientName || !subject || quantity === undefined || unitPrice === undefined || !issueDate) {
      return res.status(400).json({
        success: false,
        message: 'Campi obbligatori mancanti',
      });
    }

    // Check if invoice number already exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
    });

    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: 'Numero fattura già esistente',
      });
    }

    // Use amounts calculated by frontend (which includes all services)
    // If not provided, fall back to calculating from single quantity/unitPrice
    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    const vat = parseFloat(vatPercentage || '0');

    const subtotal = providedSubtotal !== undefined ? parseFloat(providedSubtotal) : qty * price;
    const vatAmount = providedVatAmount !== undefined ? parseFloat(providedVatAmount) : subtotal * (vat / 100);
    const total = providedTotal !== undefined ? parseFloat(providedTotal) : subtotal + vatAmount;

    // Calculate due date if not provided
    let calculatedDueDate = dueDate;
    if (!calculatedDueDate && issueDate && paymentDays !== undefined && paymentDays !== null && paymentDays !== '') {
      const issueDateObj = new Date(issueDate);
      calculatedDueDate = new Date(issueDateObj);
      calculatedDueDate.setDate(calculatedDueDate.getDate() + parseInt(paymentDays));
    }

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        contactId: contactId ? parseInt(contactId) : null,
        clientName,
        clientAddress,
        clientPIva,
        clientCF,
        subject,
        description,
        quantity: qty,
        unitPrice: price,
        subtotal,
        vatPercentage: vat,
        vatAmount,
        total,
        issueDate: new Date(issueDate),
        dueDate: new Date(calculatedDueDate),
        paymentDays: paymentDays !== undefined && paymentDays !== null && paymentDays !== '' ? parseInt(paymentDays) : 30,
        status: (status?.toUpperCase() as InvoiceStatus) || 'DRAFT',
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        paymentMethod,
        paymentNotes,
        fiscalNotes,
        paymentEntityId: paymentEntityId ? parseInt(paymentEntityId) : null,
        createdBy: userId,
      },
      include: {
        contact: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        paymentEntity: true,
      },
    });

    console.log(`Invoice created: ${invoice.invoiceNumber} (ID: ${invoice.id})`);

    // Send email notification to client if invoice is issued and has contact AND client has active FULL_CLIENT dashboard
    if (invoice.contactId && invoice.status === 'ISSUED' && invoice.contact?.email) {
      try {
        // Check if client has an active full dashboard (not just quote access)
        const clientAccess = await prisma.clientAccess.findUnique({
          where: { contactId: invoice.contactId },
        });

        if (clientAccess && clientAccess.isActive && clientAccess.accessType === 'FULL_CLIENT') {
          await sendClientInvoiceCreatedEmail(
            invoice.contact.email,
            invoice.contact.name,
            invoice.invoiceNumber,
            invoice.total,
            new Date(invoice.dueDate)
          );
          console.log(`Invoice notification email sent to ${invoice.contact.email}`);
        } else {
          console.log(`Invoice email NOT sent to ${invoice.contact.email} - no active full client dashboard (access type: ${clientAccess?.accessType || 'none'})`);
        }
      } catch (emailError) {
        console.error('Failed to send invoice notification email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Fattura creata con successo',
      data: invoice,
    });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione della fattura',
      error: error.message,
    });
  }
};

// Update existing invoice
export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      invoiceNumber,
      contactId,
      clientName,
      clientAddress,
      clientPIva,
      clientCF,
      subject,
      description,
      quantity,
      unitPrice,
      subtotal: providedSubtotal,
      total: providedTotal,
      vatPercentage,
      vatAmount: providedVatAmount,
      paymentDays,
      issueDate,
      dueDate,
      status,
      paymentDate,
      paymentMethod,
      paymentNotes,
      fiscalNotes,
      paymentEntityId,
    } = req.body;

    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Fattura non trovata',
      });
    }

    // Check if invoice number is being changed and if it conflicts
    if (invoiceNumber && invoiceNumber !== existingInvoice.invoiceNumber) {
      const conflictingInvoice = await prisma.invoice.findUnique({
        where: { invoiceNumber },
      });

      if (conflictingInvoice) {
        return res.status(400).json({
          success: false,
          message: 'Numero fattura già esistente',
        });
      }
    }

    // Use amounts calculated by frontend (which includes all services)
    // If not provided, fall back to calculating from single quantity/unitPrice
    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    const vat = parseFloat(vatPercentage || '0');

    const subtotal = providedSubtotal !== undefined ? parseFloat(providedSubtotal) : qty * price;
    const vatAmount = providedVatAmount !== undefined ? parseFloat(providedVatAmount) : subtotal * (vat / 100);
    const total = providedTotal !== undefined ? parseFloat(providedTotal) : subtotal + vatAmount;

    // Calculate due date if not provided
    let calculatedDueDate = dueDate;
    if (!calculatedDueDate && issueDate && paymentDays !== undefined && paymentDays !== null && paymentDays !== '') {
      const issueDateObj = new Date(issueDate);
      calculatedDueDate = new Date(issueDateObj);
      calculatedDueDate.setDate(calculatedDueDate.getDate() + parseInt(paymentDays));
    }

    const newStatus = (status?.toUpperCase() as InvoiceStatus) || 'DRAFT';
    const statusChanged = existingInvoice.status !== newStatus;
    const isBecomingPaid = statusChanged && newStatus === 'PAID';

    // Get user ID from request or find first user
    let userId = (req as any).user?.id;
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      userId = firstUser?.id || 2; // Fallback to ID 2
    }

    // Update invoice
    const invoice = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: {
        invoiceNumber,
        contactId: contactId ? parseInt(contactId) : null,
        clientName,
        clientAddress,
        clientPIva,
        clientCF,
        subject,
        description,
        quantity: qty,
        unitPrice: price,
        subtotal,
        vatPercentage: vat,
        vatAmount,
        total,
        issueDate: new Date(issueDate),
        dueDate: new Date(calculatedDueDate),
        paymentDays: paymentDays !== undefined && paymentDays !== null && paymentDays !== '' ? parseInt(paymentDays) : 30,
        status: newStatus,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        paymentMethod,
        paymentNotes,
        fiscalNotes,
        paymentEntityId: paymentEntityId ? parseInt(paymentEntityId) : null,
      },
      include: {
        contact: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        paymentEntity: true,
      },
    });

    // Create income transaction when invoice becomes PAID
    if (isBecomingPaid) {
      // Get or create "Fatture" income category
      let incomeCategory = await prisma.transactionCategory.findFirst({
        where: {
          name: { contains: 'Fatture' },
          type: 'INCOME',
        },
      });

      if (!incomeCategory) {
        incomeCategory = await prisma.transactionCategory.create({
          data: {
            name: 'Fatture',
            type: 'INCOME',
            icon: 'file-text',
            color: '#10b981',
          },
        });
      }

      // Create income transaction
      await prisma.transaction.create({
        data: {
          type: 'INCOME',
          amount: invoice.total,
          date: paymentDate ? new Date(paymentDate) : invoice.issueDate,
          categoryId: incomeCategory.id,
          description: `Pagamento fattura ${invoice.invoiceNumber} - ${invoice.clientName}`,
          invoiceId: invoice.id,
          contactId: invoice.contactId,
          createdBy: userId,
        },
      });

      console.log(`Created income transaction for invoice ${invoice.invoiceNumber}`);
    }

    // Send email notification to client when invoice status changes to ISSUED AND client has active FULL_CLIENT dashboard
    const isBecomingIssued = statusChanged && newStatus === 'ISSUED';
    if (isBecomingIssued && invoice.contactId && invoice.contact?.email) {
      try {
        // Check if client has an active full dashboard (not just quote access)
        const clientAccess = await prisma.clientAccess.findUnique({
          where: { contactId: invoice.contactId },
        });

        if (clientAccess && clientAccess.isActive && clientAccess.accessType === 'FULL_CLIENT') {
          await sendClientInvoiceCreatedEmail(
            invoice.contact.email,
            invoice.contact.name,
            invoice.invoiceNumber,
            invoice.total,
            new Date(invoice.dueDate)
          );
          console.log(`Invoice notification email sent to ${invoice.contact.email}`);
        } else {
          console.log(`Invoice email NOT sent to ${invoice.contact.email} - no active full client dashboard (access type: ${clientAccess?.accessType || 'none'})`);
        }
      } catch (emailError) {
        console.error('Failed to send invoice notification email:', emailError);
        // Don't fail the request if email fails
      }
    }

    console.log(`Invoice updated: ${invoice.invoiceNumber} (ID: ${invoice.id})`);

    res.json({
      success: true,
      message: isBecomingPaid
        ? 'Fattura aggiornata e transazione di entrata creata con successo'
        : 'Fattura aggiornata con successo',
      data: invoice,
      incomeCreated: isBecomingPaid,
    });
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    res.status(500).json({
      success: false,
      message: "Errore nell'aggiornamento della fattura",
      error: error.message,
    });
  }
};

// Delete invoice (now allows deletion of any invoice)
export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Fattura non trovata',
      });
    }

    // Delete related transactions first (due to foreign key constraint)
    await prisma.transaction.deleteMany({
      where: { invoiceId: parseInt(id) },
    });

    // Delete the invoice
    await prisma.invoice.delete({
      where: { id: parseInt(id) },
    });

    console.log(`Invoice deleted: ${invoice.invoiceNumber} (ID: ${invoice.id})`);

    res.json({
      success: true,
      message: 'Fattura e transazioni associate eliminate con successo',
    });
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({
      success: false,
      message: "Errore nell'eliminazione della fattura",
      error: error.message,
    });
  }
};

// Duplicate invoice
export const duplicateInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const originalInvoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
    });

    if (!originalInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Fattura non trovata',
      });
    }

    // Generate new invoice number
    const year = new Date().getFullYear();
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: { contains: year.toString() },
      },
      orderBy: { createdAt: 'desc' },
    });

    let newNumber = `#001${year}`;
    if (lastInvoice) {
      const match = lastInvoice.invoiceNumber.match(/#(\d+)/);
      if (match) {
        const nextNum = parseInt(match[1]) + 1;
        newNumber = `#${String(nextNum).padStart(3, '0')}${year}`;
      }
    }

    // Create duplicate
    const duplicate = await prisma.invoice.create({
      data: {
        invoiceNumber: newNumber,
        contactId: originalInvoice.contactId,
        clientName: originalInvoice.clientName,
        clientAddress: originalInvoice.clientAddress,
        clientPIva: originalInvoice.clientPIva,
        clientCF: originalInvoice.clientCF,
        subject: originalInvoice.subject,
        description: originalInvoice.description,
        quantity: originalInvoice.quantity,
        unitPrice: originalInvoice.unitPrice,
        subtotal: originalInvoice.subtotal,
        vatPercentage: originalInvoice.vatPercentage,
        vatAmount: originalInvoice.vatAmount,
        total: originalInvoice.total,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        paymentDays: originalInvoice.paymentDays,
        status: 'DRAFT',
        fiscalNotes: originalInvoice.fiscalNotes,
        paymentEntityId: originalInvoice.paymentEntityId,
        createdBy: userId,
      },
      include: {
        contact: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        paymentEntity: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Fattura duplicata con successo',
      data: duplicate,
    });
  } catch (error: any) {
    console.error('Error duplicating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella duplicazione della fattura',
      error: error.message,
    });
  }
};

// Get next invoice number
export const generateInvoicePDF = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        contact: true,
        creator: true,
        paymentEntity: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Fattura non trovata',
      });
    }

    // Get payment entity - use invoice's entity or default
    let paymentEntity = invoice.paymentEntity;
    if (!paymentEntity) {
      // Try to get default payment entity
      paymentEntity = await prisma.paymentEntity.findFirst({
        where: { isDefault: true, isActive: true },
      });
    }
    if (!paymentEntity) {
      // Fallback to any active payment entity
      paymentEntity = await prisma.paymentEntity.findFirst({
        where: { isActive: true },
      });
    }

    // Format date in Italian
    const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
                   'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

    const issueDate = new Date(invoice.issueDate);
    const giorno = giorni[issueDate.getDay()];
    const numeroGiorno = issueDate.getDate();
    const mese = mesi[issueDate.getMonth()];
    const anno = issueDate.getFullYear();
    const invoiceDate = `${numeroGiorno} ${mese} ${anno}`;

    const dueDate = new Date(invoice.dueDate);
    const dueDateFormatted = `${String(dueDate.getDate()).padStart(2, '0')}/${String(dueDate.getMonth() + 1).padStart(2, '0')}/${dueDate.getFullYear()}`;

    // Parse services from description (stored as JSON array)
    let services = [];
    try {
      const servicesText = invoice.description || '[]';
      const parsedServices = JSON.parse(servicesText);
      services = parsedServices.map((s: any) => ({
        description: s.description,
        quantity: s.quantity.toString(),
        unitPrice: s.unitPrice > 0 ? s.unitPrice.toFixed(2).replace('.', ',') : '',
      }));
    } catch (e) {
      // Fallback for old invoices without JSON format
      services = [{
        description: invoice.description || invoice.subject,
        quantity: invoice.quantity.toString(),
        unitPrice: invoice.unitPrice > 0 ? invoice.unitPrice.toFixed(2).replace('.', ',') : '',
      }];
    }

    // Return JSON with invoice data for frontend to generate PDF
    return res.json({
      success: true,
      data: {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate,
        paymentDays: invoice.paymentDays,
        dueDate: dueDateFormatted,
        clientName: invoice.clientName,
        clientAddress: invoice.clientAddress,
        clientPIva: invoice.clientPIva,
        clientCF: invoice.clientCF,
        subject: invoice.subject,
        services: services,
        subtotal: invoice.subtotal.toFixed(2).replace('.', ','),
        vatPercentage: invoice.vatPercentage.toFixed(0),
        vatAmount: invoice.vatAmount.toFixed(2).replace('.', ','),
        total: invoice.total.toFixed(2).replace('.', ','),
        fiscalNotes: invoice.fiscalNotes,
        isVatZero: invoice.vatPercentage === 0,
        // Payment entity info
        paymentBeneficiary: paymentEntity?.beneficiary || 'Stefano Costato e Davide Marangoni',
        paymentIban: paymentEntity?.iban || 'IT55 V181 0301 6000 0481 4366 773',
        paymentBank: paymentEntity?.bankName || 'FINOM PAYMENTS',
        paymentBic: paymentEntity?.bic || 'FNOMITM2',
        paymentSdi: paymentEntity?.sdi || 'JI3TXCE',
      },
    });
  } catch (error: any) {
    console.error('Errore generazione PDF:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nella generazione del PDF: ' + error.message,
    });
  }
};

export const getNextInvoiceNumber = async (req: Request, res: Response) => {
  try {
    const year = new Date().getFullYear();

    // Get the last invoice ordered by invoice number descending
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: { contains: year.toString() },
      },
      orderBy: { invoiceNumber: 'desc' },
    });

    let nextNumber = `#01${year}`;
    if (lastInvoice) {
      // Extract the sequential number from format like #272025
      const match = lastInvoice.invoiceNumber.match(/#(\d+)(\d{4})$/);
      if (match) {
        const sequentialNum = parseInt(match[1]);
        const invoiceYear = match[2];

        // If same year, increment; otherwise start from 01
        if (invoiceYear === year.toString()) {
          const nextNum = sequentialNum + 1;
          nextNumber = `#${String(nextNum).padStart(2, '0')}${year}`;
        }
      }
    }

    res.json({
      success: true,
      data: { invoiceNumber: nextNumber },
    });
  } catch (error: any) {
    console.error('Error generating next invoice number:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella generazione del numero fattura',
      error: error.message,
    });
  }
};

// Reserve taxes for a paid invoice
export const reserveTaxes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { taxPercentage = 28 } = req.body; // Default 28% (INPS 26.23% + imposte ~15% su 78%)

    // Get user ID from request or find first user
    let userId = (req as any).user?.id;
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      userId = firstUser?.id || 2; // Fallback to ID 2
    }

    // Get the invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Fattura non trovata',
      });
    }

    // Check if invoice is paid
    if (invoice.status !== 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Solo le fatture pagate possono avere tasse accantonate',
      });
    }

    // Check if taxes already reserved
    if (invoice.taxReserved) {
      return res.status(400).json({
        success: false,
        message: 'Tasse già accantonate per questa fattura',
      });
    }

    // Calculate tax amount
    const taxAmount = invoice.total * (taxPercentage / 100);

    // Get or create "Tasse e Imposte" category
    let taxCategory = await prisma.transactionCategory.findFirst({
      where: {
        name: { contains: 'Tasse' },
        type: 'EXPENSE',
      },
    });

    if (!taxCategory) {
      taxCategory = await prisma.transactionCategory.create({
        data: {
          name: 'Tasse e Imposte',
          type: 'EXPENSE',
          icon: 'landmark',
          color: '#ef4444',
        },
      });
    }

    // Create expense transaction for tax reserve
    const taxTransaction = await prisma.transaction.create({
      data: {
        type: 'EXPENSE',
        amount: taxAmount,
        date: invoice.paymentDate || invoice.issueDate,
        categoryId: taxCategory.id,
        description: `Accantonamento tasse (${taxPercentage}%) - Fattura ${invoice.invoiceNumber}`,
        invoiceId: invoice.id,
        createdBy: userId,
      },
    });

    // Update invoice to mark taxes as reserved
    const updatedInvoice = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: {
        taxReserved: true,
        taxAmount: taxAmount,
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: `Accantonate €${taxAmount.toFixed(2)} per tasse`,
      data: {
        invoice: updatedInvoice,
        taxTransaction,
        taxAmount,
        taxPercentage,
      },
    });
  } catch (error: any) {
    console.error('Error reserving taxes:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'accantonamento delle tasse',
      error: error.message,
    });
  }
};
