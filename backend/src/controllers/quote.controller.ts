import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendClientQuoteSharedEmail } from '../services/email.service';

/**
 * HELPER TARIFFARIO - Prezzi base servizi
 */
const PRICING_GUIDE = {
  sito_web: {
    landing: { min: 689, max: 1200, label: 'Landing Page' },
    sito_3_pagine: { min: 1189, max: 1800, label: 'Sito fino a 3 pagine' },
    sito_statico_5: { min: 1479, max: 2200, label: 'Sito statico fino a 5 pagine' },
    sito_dinamico_5: { min: 1849, max: 2800, label: 'Sito dinamico fino a 5 pagine' },
    ecommerce: { min: 4900, max: 8000, label: 'E-commerce' },
  },
  brand_design: {
    logo_basic: { min: 1449, max: 2000, label: 'Logo e identità visiva di base' },
    brand_basic: { min: 2899, max: 4000, label: 'Brand identity base/Rebranding' },
    brand_complete: { min: 5000, max: 8000, label: 'Brand identity completa' },
  },
  graphic_design: {
    stampe: { min: 149, max: 500, label: 'Stampe (menu, biglietti, volantini, poster)' },
    merchandising: { min: 249, max: 800, label: 'Merchandising' },
    packaging: { min: 449, max: 1200, label: 'Packaging' },
    editorial: { min: 889, max: 2000, label: 'Editorial' },
    kit_comunicazione: { min: 1399, max: 3000, label: 'Kit comunicazione evento' },
  },
  strategia: {
    consulenza: { min: 449, max: 800, label: 'Brand Analysis, consulenza e affiancamento' },
  },
  extra: {
    colori: { min: 50, max: 200, label: 'Personalizzazione colori' },
    font: { min: 50, max: 150, label: 'Font personalizzati' },
    testi: { min: 100, max: 500, label: 'Copywriting testi' },
    immagini: { min: 150, max: 600, label: 'Immagini e grafica' },
    video: { min: 300, max: 1500, label: 'Video' },
    blog: { min: 400, max: 1000, label: 'Blog gestibile' },
    shooting: { min: 500, max: 2000, label: 'Shooting fotografico' },
    animazioni: { min: 200, max: 1000, label: 'Animazioni particolari' },
  },
};

/**
 * GET /api/quotes/pricing-guide
 * Restituisce la guida prezzi per aiutare l'admin
 */
export const getPricingGuide = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: PRICING_GUIDE,
    });
  } catch (error: any) {
    console.error('Error fetching pricing guide:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero della guida prezzi',
      error: error.message,
    });
  }
};

/**
 * GET /api/quotes
 * Ottieni tutti i preventivi con filtri
 */
export const getQuotes = async (req: Request, res: Response) => {
  try {
    const { contactId, status, limit, offset } = req.query;

    const where: any = {};

    if (contactId) {
      where.contactId = parseInt(contactId as string);
    }

    if (status) {
      where.status = status;
    }

    const quotes = await prisma.quote.findMany({
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
        items: {
          orderBy: { order: 'asc' },
        },
        packages: {
          include: {
            items: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : undefined,
      skip: offset ? parseInt(offset as string) : undefined,
    });

    const total = await prisma.quote.count({ where });

    res.json({
      success: true,
      data: {
        quotes,
        total,
        limit: limit ? parseInt(limit as string) : total,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei preventivi',
      error: error.message,
    });
  }
};

/**
 * GET /api/quotes/:id
 * Ottieni un preventivo specifico
 */
export const getQuoteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findUnique({
      where: { id: parseInt(id) },
      include: {
        contact: true,
        items: {
          orderBy: { order: 'asc' },
        },
        packages: {
          include: {
            items: true,
          },
          orderBy: { order: 'asc' },
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
  } catch (error: any) {
    console.error('Error fetching quote:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del preventivo',
      error: error.message,
    });
  }
};

/**
 * POST /api/quotes
 * Crea un nuovo preventivo
 */
export const createQuote = async (req: Request, res: Response) => {
  try {
    const {
      contactId,
      title,
      description,
      objectives = [],
      items = [],
      packages = [],
      discountAmount = 0,
      taxRate = 0,
      oneTimeDiscount = 0,
      payment2Discount = 0,
      payment3Discount = 0,
      payment4Discount = 0,
      validityDays = 30,
    } = req.body;

    const userId = (req as any).user.userId;

    // Validations
    if (!contactId || !title) {
      return res.status(400).json({
        success: false,
        message: 'Contact ID e titolo sono obbligatori',
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

    // Genera numero preventivo
    const year = new Date().getFullYear();
    const count = await prisma.quote.count({
      where: {
        quoteNumber: {
          startsWith: `Q${year}-`,
        },
      },
    });
    const quoteNumber = `Q${year}-${String(count + 1).padStart(4, '0')}`;

    // Calcola subtotale
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + item.quantity * item.unitPrice;
    }, 0);

    // Calcola totale
    const afterDiscount = subtotal - discountAmount;
    const total = afterDiscount + (afterDiscount * taxRate) / 100;

    // Data validità
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    // Crea preventivo con items e packages in transazione
    const quote = await prisma.$transaction(async (tx) => {
      // Crea quote
      const newQuote = await tx.quote.create({
        data: {
          quoteNumber,
          contactId: parseInt(contactId),
          title,
          description,
          objectives: objectives.length > 0 ? JSON.stringify(objectives) : null,
          subtotal,
          discountAmount,
          taxRate,
          total,
          oneTimeDiscount,
          payment2Discount,
          payment3Discount,
          payment4Discount,
          validUntil,
          status: 'DRAFT',
          createdBy: userId,
        },
      });

      // Crea items
      if (items.length > 0) {
        await tx.quoteItem.createMany({
          data: items.map((item: any, index: number) => ({
            quoteId: newQuote.id,
            itemName: item.itemName,
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice,
            total: (item.quantity || 1) * item.unitPrice,
            order: item.order !== undefined ? item.order : index,
          })),
        });
      }

      // Crea packages
      if (packages.length > 0) {
        for (const pkg of packages) {
          const newPackage = await tx.quotePackage.create({
            data: {
              quoteId: newQuote.id,
              name: pkg.name,
              description: pkg.description,
              features: pkg.features && pkg.features.length > 0 ? JSON.stringify(pkg.features) : null,
              price: pkg.price,
              isRecommended: pkg.isRecommended || false,
              order: pkg.order || 0,
            },
          });

          // Crea items del package
          if (pkg.items && pkg.items.length > 0) {
            await tx.quoteItem.createMany({
              data: pkg.items.map((item: any, index: number) => ({
                quoteId: newQuote.id,
                packageId: newPackage.id,
                itemName: item.itemName,
                description: item.description,
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice,
                total: (item.quantity || 1) * item.unitPrice,
                order: item.order !== undefined ? item.order : index,
              })),
            });
          }
        }
      }

      return newQuote;
    });

    // Auto-link quote to QUOTE_ONLY client access if not already linked
    const quoteOnlyAccess = await prisma.clientAccess.findFirst({
      where: {
        contactId: parseInt(contactId),
        accessType: 'QUOTE_ONLY',
        linkedQuoteId: null,
      },
    });

    if (quoteOnlyAccess) {
      await prisma.clientAccess.update({
        where: { id: quoteOnlyAccess.id },
        data: { linkedQuoteId: quote.id },
      });
    }

    // Ricarica con relazioni
    const fullQuote = await prisma.quote.findUnique({
      where: { id: quote.id },
      include: {
        contact: true,
        items: {
          orderBy: { order: 'asc' },
        },
        packages: {
          include: {
            items: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Preventivo creato con successo',
      data: fullQuote,
    });
  } catch (error: any) {
    console.error('Error creating quote:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione del preventivo',
      error: error.message,
    });
  }
};

/**
 * PUT /api/quotes/:id
 * Aggiorna un preventivo
 */
export const updateQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      objectives,
      items,
      packages,
      discountAmount,
      taxRate,
      oneTimeDiscount,
      payment2Discount,
      payment3Discount,
      payment4Discount,
      status,
      validUntil,
    } = req.body;

    // Verifica esistenza
    const existingQuote = await prisma.quote.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingQuote) {
      return res.status(404).json({
        success: false,
        message: 'Preventivo non trovato',
      });
    }

    // Se forniti items, ricalcola subtotale
    let subtotal = existingQuote.subtotal;
    if (items && items.length > 0) {
      subtotal = items.reduce((sum: number, item: any) => {
        return sum + item.quantity * item.unitPrice;
      }, 0);
    }

    const discount = discountAmount !== undefined ? discountAmount : existingQuote.discountAmount;
    const tax = taxRate !== undefined ? taxRate : existingQuote.taxRate;
    const afterDiscount = subtotal - discount;
    const total = afterDiscount + (afterDiscount * tax) / 100;

    // Aggiorna in transazione
    const quote = await prisma.$transaction(async (tx) => {
      // Aggiorna quote
      const updatedQuote = await tx.quote.update({
        where: { id: parseInt(id) },
        data: {
          title,
          description,
          ...(objectives !== undefined && { objectives: objectives && objectives.length > 0 ? JSON.stringify(objectives) : null }),
          subtotal,
          discountAmount: discount,
          taxRate: tax,
          total,
          oneTimeDiscount,
          payment2Discount,
          payment3Discount,
          payment4Discount,
          status,
          validUntil,
        },
      });

      // Se forniti items, sostituisci
      if (items) {
        // Elimina vecchi items
        await tx.quoteItem.deleteMany({
          where: { quoteId: parseInt(id), packageId: null },
        });

        // Crea nuovi items
        if (items.length > 0) {
          await tx.quoteItem.createMany({
            data: items.map((item: any, index: number) => ({
              quoteId: parseInt(id),
              itemName: item.itemName,
              description: item.description,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice,
              total: (item.quantity || 1) * item.unitPrice,
              order: item.order !== undefined ? item.order : index,
            })),
          });
        }
      }

      // Se forniti packages, sostituisci
      if (packages) {
        // Elimina vecchi packages e loro items
        await tx.quotePackage.deleteMany({
          where: { quoteId: parseInt(id) },
        });

        // Crea nuovi packages
        if (packages.length > 0) {
          for (const pkg of packages) {
            const newPackage = await tx.quotePackage.create({
              data: {
                quoteId: parseInt(id),
                name: pkg.name,
                description: pkg.description,
                features: pkg.features && pkg.features.length > 0 ? JSON.stringify(pkg.features) : null,
                price: pkg.price,
                isRecommended: pkg.isRecommended || false,
                order: pkg.order || 0,
              },
            });

            // Crea items del package
            if (pkg.items && pkg.items.length > 0) {
              await tx.quoteItem.createMany({
                data: pkg.items.map((item: any, index: number) => ({
                  quoteId: parseInt(id),
                  packageId: newPackage.id,
                  itemName: item.itemName,
                  description: item.description,
                  quantity: item.quantity || 1,
                  unitPrice: item.unitPrice,
                  total: (item.quantity || 1) * item.unitPrice,
                  order: item.order !== undefined ? item.order : index,
                })),
              });
            }
          }
        }
      }

      return updatedQuote;
    });

    // Ricarica con relazioni
    const fullQuote = await prisma.quote.findUnique({
      where: { id: quote.id },
      include: {
        contact: true,
        items: {
          orderBy: { order: 'asc' },
        },
        packages: {
          include: {
            items: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    // Send email notification if quote status changed to SENT
    if (status === 'SENT' && existingQuote.status !== 'SENT' && fullQuote?.contact?.email) {
      try {
        await sendClientQuoteSharedEmail(
          fullQuote.contact.email,
          fullQuote.contact.name,
          fullQuote.quoteNumber,
          fullQuote.total
        );
        console.log(`Quote shared email sent to ${fullQuote.contact.email}`);
      } catch (emailError) {
        console.error('Failed to send quote shared email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      message: 'Preventivo aggiornato con successo',
      data: fullQuote,
    });
  } catch (error: any) {
    console.error('Error updating quote:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento del preventivo',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/quotes/:id
 * Elimina un preventivo
 */
export const deleteQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verifica esistenza
    const quote = await prisma.quote.findUnique({
      where: { id: parseInt(id) },
      include: {
        linkedClientAccess: true,
      },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Preventivo non trovato',
      });
    }

    // Verifica se ci sono accessi client collegati
    if (quote.linkedClientAccess && quote.linkedClientAccess.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossibile eliminare: ci sono accessi client collegati a questo preventivo',
      });
    }

    await prisma.quote.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Preventivo eliminato con successo',
    });
  } catch (error: any) {
    console.error('Error deleting quote:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione del preventivo',
      error: error.message,
    });
  }
};
