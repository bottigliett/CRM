import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * GET /api/leads
 * Get all leads grouped by funnel stage
 */
export const getLeads = async (req: Request, res: Response) => {
  try {
    // Get all leads (contacts with type PROSPECT and a funnelStage set)
    const leads = await prisma.contact.findMany({
      where: {
        type: 'PROSPECT',
        funnelStage: {
          not: null, // Only prospects that are in the funnel (have a stage)
        },
      },
      include: {
        tags: true,
        socials: true,
        customFields: true,
      },
      orderBy: [
        { funnelStage: 'asc' },
        { funnelPosition: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Group leads by funnel stage
    const groupedLeads: Record<string, typeof leads> = {};
    const stageTotals: Record<string, number> = {};

    leads.forEach((lead) => {
      const stage = lead.funnelStage || 'daContattare';

      if (!groupedLeads[stage]) {
        groupedLeads[stage] = [];
        stageTotals[stage] = 0;
      }

      groupedLeads[stage].push(lead);
      stageTotals[stage] += lead.funnelValue || 0;
    });

    // Get funnel stages configuration
    const stages = await prisma.leadFunnelStage.findMany({
      orderBy: { order: 'asc' },
    });

    res.json({
      success: true,
      data: {
        leads: groupedLeads,
        totals: stageTotals,
        stages,
      },
    });
  } catch (error: any) {
    console.error('Error getting leads:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei lead',
      error: error.message,
    });
  }
};

/**
 * PUT /api/leads/:id/move
 * Move a lead to a different funnel stage and position
 */
export const moveLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { funnelStage, funnelPosition } = req.body;

    // Validation
    if (!funnelStage) {
      return res.status(400).json({
        success: false,
        message: 'Il campo funnelStage è obbligatorio',
      });
    }

    // Check if lead exists
    const existingLead = await prisma.contact.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: 'Lead non trovato',
      });
    }

    // Update lead position
    const lead = await prisma.contact.update({
      where: { id: parseInt(id) },
      data: {
        funnelStage,
        funnelPosition: funnelPosition !== undefined ? funnelPosition : 0,
      },
      include: {
        tags: true,
        socials: true,
        customFields: true,
      },
    });

    res.json({
      success: true,
      message: 'Lead spostato con successo',
      data: lead,
    });
  } catch (error: any) {
    console.error('Error moving lead:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nello spostamento del lead',
      error: error.message,
    });
  }
};

/**
 * GET /api/leads/stages
 * Get all funnel stages
 */
export const getFunnelStages = async (req: Request, res: Response) => {
  try {
    const stages = await prisma.leadFunnelStage.findMany({
      orderBy: { order: 'asc' },
    });

    res.json({
      success: true,
      data: stages,
    });
  } catch (error: any) {
    console.error('Error getting funnel stages:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero degli stage del funnel',
      error: error.message,
    });
  }
};

/**
 * POST /api/leads/stages
 * Create a new funnel stage
 */
export const createFunnelStage = async (req: Request, res: Response) => {
  try {
    const { name, order, color } = req.body;

    // Validation
    if (!name || order === undefined) {
      return res.status(400).json({
        success: false,
        message: 'I campi name e order sono obbligatori',
      });
    }

    const stage = await prisma.leadFunnelStage.create({
      data: {
        name,
        order,
        color: color || '#3b82f6',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Stage creato con successo',
      data: stage,
    });
  } catch (error: any) {
    console.error('Error creating funnel stage:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione dello stage',
      error: error.message,
    });
  }
};

/**
 * POST /api/leads/quick
 * Quick lead creation with minimal fields
 */
export const createQuickLead = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      funnelStage = 'daContattare',
      funnelValue,
      leadSource,
      serviceType,
      contactDate,
      linkedContactId,
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Il nome è obbligatorio',
      });
    }

    // Se linkedContactId è fornito, verifica che il contatto esista
    if (linkedContactId) {
      const linkedContact = await prisma.contact.findUnique({
        where: { id: parseInt(linkedContactId) },
      });

      if (!linkedContact) {
        return res.status(404).json({
          success: false,
          message: 'Contatto collegato non trovato',
        });
      }
    }

    // Create lead
    const lead = await prisma.contact.create({
      data: {
        name,
        type: 'PROSPECT',
        email,
        phone,
        funnelStage,
        funnelValue: funnelValue ? parseFloat(funnelValue) : null,
        funnelPosition: 0,
        leadSource,
        serviceType,
        contactDate: contactDate ? new Date(contactDate) : null,
        linkedContactId: linkedContactId ? parseInt(linkedContactId) : null,
        status: 'active',
      },
      include: {
        tags: true,
        socials: true,
        customFields: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Lead creato con successo',
      data: lead,
    });
  } catch (error: any) {
    console.error('Error creating quick lead:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione del lead',
      error: error.message,
    });
  }
};

/**
 * PUT /api/leads/:id
 * Update a lead (only lead-specific fields, not the linked contact in anagrafica)
 */
export const updateLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      funnelValue,
      leadSource,
      serviceType,
      contactDate,
      linkedContactId,
    } = req.body;

    // Check if lead exists
    const existingLead = await prisma.contact.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: 'Lead non trovato',
      });
    }

    // Validation
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Il nome non può essere vuoto',
      });
    }

    // Se linkedContactId è fornito, verifica che il contatto esista
    if (linkedContactId !== undefined && linkedContactId !== null) {
      const linkedContact = await prisma.contact.findUnique({
        where: { id: parseInt(linkedContactId) },
      });

      if (!linkedContact) {
        return res.status(404).json({
          success: false,
          message: 'Contatto collegato non trovato',
        });
      }
    }

    // Build update data object - only update fields that are provided
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (funnelValue !== undefined) updateData.funnelValue = funnelValue ? parseFloat(funnelValue) : null;
    if (leadSource !== undefined) updateData.leadSource = leadSource;
    if (serviceType !== undefined) updateData.serviceType = serviceType;
    if (contactDate !== undefined) updateData.contactDate = contactDate ? new Date(contactDate) : null;
    if (linkedContactId !== undefined) updateData.linkedContactId = linkedContactId ? parseInt(linkedContactId) : null;

    // Update lead
    const lead = await prisma.contact.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        tags: true,
        socials: true,
        customFields: true,
      },
    });

    res.json({
      success: true,
      message: 'Lead aggiornato con successo',
      data: lead,
    });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento del lead',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/leads/:id
 * Delete a lead
 */
export const deleteLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if lead exists
    const existingLead = await prisma.contact.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: 'Lead non trovato',
      });
    }

    // Delete lead
    await prisma.contact.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Lead eliminato con successo',
    });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione del lead',
      error: error.message,
    });
  }
};
