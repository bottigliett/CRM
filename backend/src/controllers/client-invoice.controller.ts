import { Response } from 'express';
import prisma from '../config/database';
import { ClientAuthRequest } from '../middleware/client-auth';

/**
 * GET /api/client/invoices
 * Get invoices for the authenticated client
 */
export const getClientInvoices = async (req: ClientAuthRequest, res: Response) => {
  try {
    if (!req.client) {
      return res.status(401).json({
        success: false,
        message: 'Cliente non autenticato',
      });
    }

    const { limit = '100', status = 'all' } = req.query;
    const contactId = req.client.contactId;

    // Build where clause - DRAFT and CANCELLED invoices are never visible to clients
    const where: any = {
      contactId,
      visibleToClient: true,
      status: { in: ['ISSUED', 'PAID'] }, // Only show issued or paid invoices
    };

    // Status filter (within allowed statuses)
    if (status !== 'all') {
      if (status === 'overdue') {
        where.status = 'ISSUED';
        where.dueDate = { lt: new Date() };
      } else if (status === 'ISSUED' || status === 'PAID') {
        where.status = (status as string).toUpperCase();
      }
      // Ignore other status filters for clients
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: {
        issueDate: 'desc',
      },
      take: parseInt(limit as string),
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error('Errore durante il recupero delle fatture del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero delle fatture',
    });
  }
};

/**
 * GET /api/client/invoices/:id
 * Get single invoice by ID (only if belongs to the client)
 */
export const getClientInvoiceById = async (req: ClientAuthRequest, res: Response) => {
  try {
    if (!req.client) {
      return res.status(401).json({
        success: false,
        message: 'Cliente non autenticato',
      });
    }

    const { id } = req.params;
    const contactId = req.client.contactId;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: parseInt(id),
        contactId,
        visibleToClient: true,
        status: { in: ['ISSUED', 'PAID'] }, // Only allow access to issued or paid invoices
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            partitaIva: true,
            codiceFiscale: true,
            address: true,
            city: true,
            province: true,
            zipCode: true,
            country: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Fattura non trovata',
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Errore durante il recupero della fattura:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero della fattura',
    });
  }
};

/**
 * GET /api/client/invoices/:id/pdf
 * Get invoice PDF data for PDF generation (only if belongs to the client)
 */
export const getClientInvoicePDF = async (req: ClientAuthRequest, res: Response) => {
  try {
    if (!req.client) {
      return res.status(401).json({
        success: false,
        message: 'Cliente non autenticato',
      });
    }

    const id = parseInt(req.params.id);
    const contactId = req.client.contactId;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        contactId,
        visibleToClient: true,
        status: { in: ['ISSUED', 'PAID'] }, // Only allow PDF for issued or paid invoices
      },
      include: {
        contact: true,
        creator: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Fattura non trovata',
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
    const invoiceDate = `${giorno} ${numeroGiorno} ${mese} ${anno}`;

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
