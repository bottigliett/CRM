import { Request, Response } from 'express';
import prisma from '../config/database';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Helper: Genera username da nome contatto
 */
function generateUsername(contactName: string): string {
  return contactName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuovi accenti
    .replace(/[^a-z0-9\s-]/g, '') // Rimuovi caratteri speciali
    .replace(/\s+/g, '-') // Spazi → trattini
    .replace(/-+/g, '-') // Multiple trattini → singolo
    .trim();
}

/**
 * Helper: Genera activation token
 */
function generateActivationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * GET /api/client-access
 * Ottieni tutti gli accessi client
 */
export const getClientAccesses = async (req: Request, res: Response) => {
  try {
    const { contactId, accessType, isActive } = req.query;

    const where: any = {};

    if (contactId) {
      where.contactId = parseInt(contactId as string);
    }

    if (accessType) {
      where.accessType = accessType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const clientAccesses = await prisma.clientAccess.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            type: true,
          },
        },
        linkedQuote: {
          select: {
            id: true,
            quoteNumber: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: clientAccesses,
    });
  } catch (error: any) {
    console.error('Error fetching client accesses:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero degli accessi client',
      error: error.message,
    });
  }
};

/**
 * GET /api/client-access/:id
 * Ottieni un accesso client specifico
 */
export const getClientAccessById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const clientAccess = await prisma.clientAccess.findUnique({
      where: { id: parseInt(id) },
      include: {
        contact: true,
        linkedQuote: {
          include: {
            items: true,
            packages: {
              include: {
                items: true,
              },
            },
          },
        },
        tickets: {
          where: { status: { not: 'CLOSED' } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!clientAccess) {
      return res.status(404).json({
        success: false,
        message: 'Accesso client non trovato',
      });
    }

    res.json({
      success: true,
      data: clientAccess,
    });
  } catch (error: any) {
    console.error('Error fetching client access:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dell\'accesso client',
      error: error.message,
    });
  }
};

/**
 * POST /api/client-access
 * Crea un nuovo accesso client
 */
export const createClientAccess = async (req: Request, res: Response) => {
  try {
    const {
      contactId,
      accessType,
      linkedQuoteId,
      projectName,
      projectDescription,
      projectBudget,
      projectStartDate,
      projectEndDate,
      monthlyFee,
      supportHoursIncluded,
      driveFolderLink,
      documentsFolder,
      assetsFolder,
      invoiceFolder,
      bespokeDetails,
    } = req.body;

    // Validations
    if (!contactId || !accessType) {
      return res.status(400).json({
        success: false,
        message: 'Contact ID e tipo accesso sono obbligatori',
      });
    }

    // Verifica che il contatto esista
    const contact = await prisma.contact.findUnique({
      where: { id: parseInt(contactId) },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contatto non trovato',
      });
    }

    // Verifica se esiste già un accesso per questo contatto
    const existingAccess = await prisma.clientAccess.findUnique({
      where: { contactId: parseInt(contactId) },
    });

    if (existingAccess) {
      return res.status(400).json({
        success: false,
        message: 'Esiste già un accesso client per questo contatto',
      });
    }

    // Genera username univoco
    let username = generateUsername(contact.name);
    let counter = 1;
    while (true) {
      const existing = await prisma.clientAccess.findUnique({
        where: { username },
      });
      if (!existing) break;
      username = `${generateUsername(contact.name)}-${counter}`;
      counter++;
    }

    // Genera activation token (valido 7 giorni)
    const activationToken = generateActivationToken();
    const activationExpires = new Date();
    activationExpires.setDate(activationExpires.getDate() + 7);

    // Crea client access
    const clientAccess = await prisma.clientAccess.create({
      data: {
        contactId: parseInt(contactId),
        accessType,
        username,
        activationToken,
        activationExpires,
        linkedQuoteId: linkedQuoteId ? parseInt(linkedQuoteId) : null,
        projectName,
        projectDescription,
        projectBudget,
        projectStartDate: projectStartDate ? new Date(projectStartDate) : null,
        projectEndDate: projectEndDate ? new Date(projectEndDate) : null,
        monthlyFee,
        supportHoursIncluded: supportHoursIncluded || 0,
        driveFolderLink,
        documentsFolder,
        assetsFolder,
        invoiceFolder,
        bespokeDetails,
      },
      include: {
        contact: true,
        linkedQuote: true,
      },
    });

    // TODO: Invia email attivazione

    res.status(201).json({
      success: true,
      message: 'Accesso client creato con successo',
      data: clientAccess,
    });
  } catch (error: any) {
    console.error('Error creating client access:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione dell\'accesso client',
      error: error.message,
    });
  }
};

/**
 * PUT /api/client-access/:id
 * Aggiorna un accesso client
 */
export const updateClientAccess = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      isActive,
      accessType,
      linkedQuoteId,
      temporaryPassword,
      projectName,
      projectDescription,
      projectBudget,
      projectStartDate,
      projectEndDate,
      monthlyFee,
      supportHoursIncluded,
      supportHoursUsed,
      driveFolderLink,
      documentsFolder,
      assetsFolder,
      invoiceFolder,
      bespokeDetails,
    } = req.body;

    // Verifica esistenza
    const existingAccess = await prisma.clientAccess.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingAccess) {
      return res.status(404).json({
        success: false,
        message: 'Accesso client non trovato',
      });
    }

    // Se linkedQuoteId viene impostato (mostra al cliente), cambia lo stato del preventivo a SENT
    if (linkedQuoteId !== undefined && linkedQuoteId !== existingAccess.linkedQuoteId) {
      if (linkedQuoteId !== null) {
        // Linking a quote - change status from DRAFT to SENT
        const quote = await prisma.quote.findUnique({
          where: { id: parseInt(linkedQuoteId) },
        });

        if (quote && quote.status === 'DRAFT') {
          await prisma.quote.update({
            where: { id: parseInt(linkedQuoteId) },
            data: { status: 'SENT' },
          });
        }
      }
    }

    // Aggiorna
    const clientAccess = await prisma.clientAccess.update({
      where: { id: parseInt(id) },
      data: {
        isActive,
        accessType,
        linkedQuoteId: linkedQuoteId !== undefined ? (linkedQuoteId ? parseInt(linkedQuoteId) : null) : undefined,
        temporaryPassword: temporaryPassword !== undefined ? temporaryPassword : undefined,
        projectName,
        projectDescription,
        projectBudget,
        projectStartDate: projectStartDate ? new Date(projectStartDate) : undefined,
        projectEndDate: projectEndDate ? new Date(projectEndDate) : undefined,
        monthlyFee,
        supportHoursIncluded,
        supportHoursUsed,
        driveFolderLink,
        documentsFolder,
        assetsFolder,
        invoiceFolder,
        bespokeDetails,
      },
      include: {
        contact: true,
        linkedQuote: true,
      },
    });

    res.json({
      success: true,
      message: 'Accesso client aggiornato con successo',
      data: clientAccess,
    });
  } catch (error: any) {
    console.error('Error updating client access:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento dell\'accesso client',
      error: error.message,
    });
  }
};

/**
 * POST /api/client-access/:id/resend-activation
 * Re-invia email attivazione con nuovo token
 */
export const resendActivation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const clientAccess = await prisma.clientAccess.findUnique({
      where: { id: parseInt(id) },
      include: { contact: true },
    });

    if (!clientAccess) {
      return res.status(404).json({
        success: false,
        message: 'Accesso client non trovato',
      });
    }

    if (clientAccess.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'L\'account è già attivato',
      });
    }

    // Genera nuovo token
    const activationToken = generateActivationToken();
    const activationExpires = new Date();
    activationExpires.setDate(activationExpires.getDate() + 7);

    await prisma.clientAccess.update({
      where: { id: parseInt(id) },
      data: {
        activationToken,
        activationExpires,
      },
    });

    // TODO: Invia email attivazione

    res.json({
      success: true,
      message: 'Email di attivazione re-inviata con successo',
    });
  } catch (error: any) {
    console.error('Error resending activation:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel re-invio dell\'email di attivazione',
      error: error.message,
    });
  }
};

/**
 * POST /api/client-access/:id/upgrade-to-full
 * Upgrade da QUOTE_ONLY a FULL_CLIENT
 */
export const upgradeToFullClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      projectName,
      projectDescription,
      projectBudget,
      projectStartDate,
      projectEndDate,
      monthlyFee,
      supportHoursIncluded,
      driveFolderLink,
      documentsFolder,
      assetsFolder,
      invoiceFolder,
    } = req.body;

    const clientAccess = await prisma.clientAccess.findUnique({
      where: { id: parseInt(id) },
    });

    if (!clientAccess) {
      return res.status(404).json({
        success: false,
        message: 'Accesso client non trovato',
      });
    }

    if (clientAccess.accessType === 'FULL_CLIENT') {
      return res.status(400).json({
        success: false,
        message: 'L\'accesso è già di tipo FULL_CLIENT',
      });
    }

    // Upgrade a FULL_CLIENT
    const upgraded = await prisma.clientAccess.update({
      where: { id: parseInt(id) },
      data: {
        accessType: 'FULL_CLIENT',
        linkedQuoteId: null, // Rimuovi collegamento a quote specifico
        projectName,
        projectDescription,
        projectBudget,
        projectStartDate: projectStartDate ? new Date(projectStartDate) : null,
        projectEndDate: projectEndDate ? new Date(projectEndDate) : null,
        monthlyFee,
        supportHoursIncluded: supportHoursIncluded || 0,
        driveFolderLink,
        documentsFolder,
        assetsFolder,
        invoiceFolder,
      },
      include: {
        contact: true,
      },
    });

    // TODO: Invia email notifica upgrade

    res.json({
      success: true,
      message: 'Accesso aggiornato a FULL_CLIENT con successo',
      data: upgraded,
    });
  } catch (error: any) {
    console.error('Error upgrading client access:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'upgrade dell\'accesso client',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/client-access/:id
 * Elimina un accesso client
 */
export const deleteClientAccess = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const clientAccess = await prisma.clientAccess.findUnique({
      where: { id: parseInt(id) },
      include: {
        tickets: true,
      },
    });

    if (!clientAccess) {
      return res.status(404).json({
        success: false,
        message: 'Accesso client non trovato',
      });
    }

    // Verifica se ci sono ticket associati
    if (clientAccess.tickets && clientAccess.tickets.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossibile eliminare: ci sono ticket associati a questo client',
      });
    }

    await prisma.clientAccess.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Accesso client eliminato con successo',
    });
  } catch (error: any) {
    console.error('Error deleting client access:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione dell\'accesso client',
      error: error.message,
    });
  }
};
