import { Response } from 'express';
import prisma from '../config/database';
import { ClientAuthRequest } from '../middleware/client-auth';
import { sendAdminQuoteAcceptedEmail, sendClientQuoteAcceptedEmail, sendAdminQuoteRejectedEmail, sendClientQuoteRejectedEmail } from '../services/email.service';

/**
 * Helper: Parse JSON fields in quote response
 */
const parseQuoteData = (quote: any) => {
  if (!quote) return quote;
  
  return {
    ...quote,
    objectives: quote.objectives ? JSON.parse(quote.objectives) : [],
    packages: quote.packages?.map((pkg: any) => ({
      ...pkg,
      features: pkg.features ? JSON.parse(pkg.features) : [],
    })) || [],
  };
};

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

    // Parse JSON fields
    const parsedQuote = parseQuoteData(quote);

    // Map isRecommended to recommended for frontend compatibility
    const mappedQuote = {
      ...parsedQuote,
      packages: parsedQuote.packages.map((pkg: any) => ({
        ...pkg,
        recommended: pkg.isRecommended,
        basePrice: pkg.price, // Also map price to basePrice for compatibility
      })),
    };

    res.json({
      success: true,
      data: mappedQuote,
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

    // Parse JSON fields
    const parsedQuote = parseQuoteData(updatedQuote);

    // Map isRecommended to recommended for frontend compatibility
    const mappedQuote = {
      ...parsedQuote,
      // @ts-ignore
      packages: parsedQuote.packages.map((pkg: any) => ({
        ...pkg,
        recommended: pkg.isRecommended,
        basePrice: pkg.price,
      })),
    };

    // Send email notifications to client and admin
    try {
      // Calculate final price with discount
      const selectedPackage = updatedQuote.packages.find(pkg => pkg.id === parseInt(selectedPackageId));
      const basePrice = selectedPackage?.price || 0;

      // Get discount based on payment option
      let discount = 0;
      switch (selectedPaymentOption) {
        case 'oneTime':
          discount = updatedQuote.oneTimeDiscount;
          break;
        case 'payment2':
          discount = updatedQuote.payment2Discount;
          break;
        case 'payment3':
          discount = updatedQuote.payment3Discount;
          break;
        case 'payment4':
          discount = updatedQuote.payment4Discount;
          break;
      }

      const finalPrice = basePrice - (basePrice * discount) / 100;

      // Send thank you email to client
      if (updatedQuote.contact.email) {
        await sendClientQuoteAcceptedEmail(
          updatedQuote.contact.email,
          updatedQuote.contact.name,
          updatedQuote.quoteNumber,
          updatedQuote.title
        );
      }

      // Send notification to super admin
      const superAdmin = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' },
        select: { email: true },
      });

      if (superAdmin && superAdmin.email) {
        await sendAdminQuoteAcceptedEmail(
          superAdmin.email,
          updatedQuote.contact.name,
          updatedQuote.quoteNumber,
          updatedQuote.title,
          selectedPackage?.name || 'Pacchetto selezionato',
          selectedPaymentOption,
          finalPrice
        );
      }
    } catch (emailError) {
      console.error('Error sending acceptance emails:', emailError);
      // Don't fail the request if email sending fails
    }

    res.json({
      success: true,
      data: mappedQuote,
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

    const { rejectionReason } = req.body;

    // Update quote status to REJECTED
    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'REJECTED',
        rejectedDate: new Date(),
        // @ts-ignore - rejectionReason will be added after migration
        rejectionReason: rejectionReason || null,
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

    // Parse JSON fields
    const parsedQuote = parseQuoteData(updatedQuote);

    // Map isRecommended to recommended for frontend compatibility
    const mappedQuote = {
      ...parsedQuote,
      // @ts-ignore
      packages: parsedQuote.packages.map((pkg: any) => ({
        ...pkg,
        recommended: pkg.isRecommended,
        basePrice: pkg.price,
      })),
    };

    // Send email notifications
    try {
      // Send "sorry" email to client
      if (updatedQuote.contact.email) {
        await sendClientQuoteRejectedEmail(
          updatedQuote.contact.email,
          updatedQuote.contact.name,
          updatedQuote.quoteNumber,
          updatedQuote.title
        );
      }

      // Send notification to all super admins
      const superAdmins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { email: true },
      });

      const adminEmails = superAdmins.map(admin => admin.email).filter(Boolean) as string[];

      if (adminEmails.length > 0) {
        await sendAdminQuoteRejectedEmail(
          adminEmails,
          updatedQuote.contact.name,
          updatedQuote.quoteNumber,
          updatedQuote.title,
          rejectionReason || 'Nessun motivo specificato'
        );
      }
    } catch (emailError) {
      console.error('Error sending rejection emails:', emailError);
      // Don't fail the request if email sending fails
    }

    res.json({
      success: true,
      data: mappedQuote,
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
