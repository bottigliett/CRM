import { Response } from 'express';
import prisma from '../config/database';
import { ClientAuthRequest } from '../middleware/client-auth';

/**
 * GET /api/client/quotes
 * Get the linked quote for the authenticated client
 */
export const getClientQuote = async (req: ClientAuthRequest, res: Response) => {
  try {
    if (!req.client) {
      return res.status(401).json({
        success: false,
        message: 'Cliente non autenticato',
      });
    }

    // Get the ClientAccess record to retrieve linkedQuoteId
    const clientAccess = await prisma.clientAccess.findUnique({
      where: { id: req.client.clientAccessId },
    });

    if (!clientAccess || !clientAccess.linkedQuoteId) {
      return res.status(404).json({
        success: false,
        message: 'Nessun preventivo associato',
      });
    }

    const quoteId = clientAccess.linkedQuoteId;

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
        packages: {
          include: {
            items: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Preventivo non trovato',
      });
    }

    res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error('Errore durante il recupero del preventivo:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero del preventivo',
    });
  }
};

/**
 * PUT /api/client/quotes/accept
 * Accept the quote with selected package and payment option
 */
export const acceptClientQuote = async (req: ClientAuthRequest, res: Response) => {
  try {
    if (!req.client) {
      return res.status(401).json({
        success: false,
        message: 'Cliente non autenticato',
      });
    }

    // Get the ClientAccess record to retrieve linkedQuoteId
    const clientAccess = await prisma.clientAccess.findUnique({
      where: { id: req.client.clientAccessId },
    });

    if (!clientAccess || !clientAccess.linkedQuoteId) {
      return res.status(404).json({
        success: false,
        message: 'Nessun preventivo associato',
      });
    }

    const quoteId = clientAccess.linkedQuoteId;

    const { selectedPackageId, selectedPaymentOption } = req.body;

    if (!selectedPackageId || !selectedPaymentOption) {
      return res.status(400).json({
        success: false,
        message: 'Seleziona un pacchetto e una modalità di pagamento',
      });
    }

    // Verify the package belongs to this quote
    const quotePackage = await prisma.quotePackage.findFirst({
      where: {
        id: parseInt(selectedPackageId),
        quoteId: quoteId,
      },
    });

    if (!quotePackage) {
      return res.status(400).json({
        success: false,
        message: 'Pacchetto non valido',
      });
    }

    // Update quote status to ACCEPTED
    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'ACCEPTED',
        acceptedDate: new Date(),
        selectedPackageId: parseInt(selectedPackageId),
        selectedPaymentOption,
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
        packages: {
          include: {
            items: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    // TODO: Send email notifications to client and admin

    res.json({
      success: true,
      data: updatedQuote,
      message: 'Preventivo accettato con successo',
    });
  } catch (error) {
    console.error('Errore durante l\'accettazione del preventivo:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'accettazione del preventivo',
    });
  }
};

/**
 * PUT /api/client/quotes/reject
 * Reject the quote
 */
export const rejectClientQuote = async (req: ClientAuthRequest, res: Response) => {
  try {
    if (!req.client) {
      return res.status(401).json({
        success: false,
        message: 'Cliente non autenticato',
      });
    }

    // Get the ClientAccess record to retrieve linkedQuoteId
    const clientAccess = await prisma.clientAccess.findUnique({
      where: { id: req.client.clientAccessId },
    });

    if (!clientAccess || !clientAccess.linkedQuoteId) {
      return res.status(404).json({
        success: false,
        message: 'Nessun preventivo associato',
      });
    }

    const quoteId = clientAccess.linkedQuoteId;

    // TODO: Add rejection reason tracking

    // Update quote status to REJECTED
    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'REJECTED',
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
        packages: {
          include: {
            items: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    // TODO: Send email notification to admin

    res.json({
      success: true,
      data: updatedQuote,
      message: 'Preventivo rifiutato',
    });
  } catch (error) {
    console.error('Errore durante il rifiuto del preventivo:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il rifiuto del preventivo',
    });
  }
};
