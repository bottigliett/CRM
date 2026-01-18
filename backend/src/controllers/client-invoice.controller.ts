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

    // Build where clause
    const where: any = {
      contactId,
    };

    // Status filter
    if (status !== 'all') {
      if (status === 'overdue') {
        where.status = 'ISSUED';
        where.dueDate = { lt: new Date() };
      } else {
        where.status = (status as string).toUpperCase();
      }
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
