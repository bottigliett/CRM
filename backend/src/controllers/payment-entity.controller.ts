import { Request, Response } from 'express';
import prisma from '../config/database';

// Helper to check if user is DEVELOPER
const checkDeveloperRole = async (req: Request, res: Response): Promise<boolean> => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Non autenticato' });
    return false;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'DEVELOPER') {
    res.status(403).json({ success: false, message: 'Accesso negato. Solo DEVELOPER può eseguire questa azione.' });
    return false;
  }
  return true;
};

// Get all payment entities
export const getPaymentEntities = async (req: Request, res: Response) => {
  try {
    const { activeOnly = 'false' } = req.query;

    const where = activeOnly === 'true' ? { isActive: true } : {};

    const entities = await prisma.paymentEntity.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: entities,
    });
  } catch (error: any) {
    console.error('Error fetching payment entities:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle entità di pagamento',
      error: error.message,
    });
  }
};

// Get single payment entity by ID
export const getPaymentEntity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const entity = await prisma.paymentEntity.findUnique({
      where: { id: parseInt(id) },
    });

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entità di pagamento non trovata',
      });
    }

    res.json({
      success: true,
      data: entity,
    });
  } catch (error: any) {
    console.error('Error fetching payment entity:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dell\'entità di pagamento',
      error: error.message,
    });
  }
};

// Create new payment entity (DEVELOPER only)
export const createPaymentEntity = async (req: Request, res: Response) => {
  try {
    // Check DEVELOPER role
    if (!await checkDeveloperRole(req, res)) return;

    const {
      name,
      beneficiary,
      iban,
      bankName,
      bic,
      sdi,
      taxId,
      isDefault,
    } = req.body;

    // Validation
    if (!name || !beneficiary || !iban || !bankName) {
      return res.status(400).json({
        success: false,
        message: 'Nome, beneficiario, IBAN e banca sono obbligatori',
      });
    }

    // If this is set as default, unset others
    if (isDefault) {
      await prisma.paymentEntity.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const entity = await prisma.paymentEntity.create({
      data: {
        name,
        beneficiary,
        iban,
        bankName,
        bic,
        sdi,
        taxId,
        isDefault: isDefault || false,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Entità di pagamento creata con successo',
      data: entity,
    });
  } catch (error: any) {
    console.error('Error creating payment entity:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione dell\'entità di pagamento',
      error: error.message,
    });
  }
};

// Update payment entity (DEVELOPER only)
export const updatePaymentEntity = async (req: Request, res: Response) => {
  try {
    // Check DEVELOPER role
    if (!await checkDeveloperRole(req, res)) return;

    const { id } = req.params;
    const {
      name,
      beneficiary,
      iban,
      bankName,
      bic,
      sdi,
      taxId,
      isDefault,
      isActive,
    } = req.body;

    const existing = await prisma.paymentEntity.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Entità di pagamento non trovata',
      });
    }

    // If this is being set as default, unset others
    if (isDefault && !existing.isDefault) {
      await prisma.paymentEntity.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const entity = await prisma.paymentEntity.update({
      where: { id: parseInt(id) },
      data: {
        name,
        beneficiary,
        iban,
        bankName,
        bic,
        sdi,
        taxId,
        isDefault,
        isActive,
      },
    });

    res.json({
      success: true,
      message: 'Entità di pagamento aggiornata con successo',
      data: entity,
    });
  } catch (error: any) {
    console.error('Error updating payment entity:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento dell\'entità di pagamento',
      error: error.message,
    });
  }
};

// Delete payment entity (DEVELOPER only)
export const deletePaymentEntity = async (req: Request, res: Response) => {
  try {
    // Check DEVELOPER role
    if (!await checkDeveloperRole(req, res)) return;

    const { id } = req.params;

    const entity = await prisma.paymentEntity.findUnique({
      where: { id: parseInt(id) },
      include: {
        invoices: { take: 1 },
      },
    });

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entità di pagamento non trovata',
      });
    }

    // Check if entity has invoices - if so, just deactivate
    if (entity.invoices.length > 0) {
      await prisma.paymentEntity.update({
        where: { id: parseInt(id) },
        data: { isActive: false },
      });

      return res.json({
        success: true,
        message: 'Entità disattivata (ha fatture associate)',
      });
    }

    await prisma.paymentEntity.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Entità di pagamento eliminata con successo',
    });
  } catch (error: any) {
    console.error('Error deleting payment entity:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione dell\'entità di pagamento',
      error: error.message,
    });
  }
};

// Set default payment entity (DEVELOPER only)
export const setDefaultPaymentEntity = async (req: Request, res: Response) => {
  try {
    // Check DEVELOPER role
    if (!await checkDeveloperRole(req, res)) return;

    const { id } = req.params;

    const entity = await prisma.paymentEntity.findUnique({
      where: { id: parseInt(id) },
    });

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entità di pagamento non trovata',
      });
    }

    // Unset all defaults
    await prisma.paymentEntity.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });

    // Set this one as default
    const updated = await prisma.paymentEntity.update({
      where: { id: parseInt(id) },
      data: { isDefault: true },
    });

    res.json({
      success: true,
      message: 'Entità impostata come predefinita',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error setting default payment entity:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'impostazione dell\'entità predefinita',
      error: error.message,
    });
  }
};
