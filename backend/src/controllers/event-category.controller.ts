import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * GET /api/event-categories
 * Get all event categories
 */
export const getEventCategories = async (req: Request, res: Response) => {
  try {
    const { includeInactive = 'false' } = req.query;

    const where: any = {};

    // Filter active categories by default
    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    const categories = await prisma.eventCategory.findMany({
      where,
      include: {
        _count: {
          select: {
            events: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('Error getting event categories:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle categorie',
      error: error.message,
    });
  }
};

/**
 * GET /api/event-categories/:id
 * Get a single event category by ID
 */
export const getEventCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.eventCategory.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoria non trovata',
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error: any) {
    console.error('Error getting event category:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero della categoria',
      error: error.message,
    });
  }
};

/**
 * POST /api/event-categories
 * Create a new event category
 */
export const createEventCategory = async (req: Request, res: Response) => {
  try {
    const { name, color = '#3b82f6', icon, isActive = true } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Il nome è obbligatorio',
      });
    }

    // Check if category with same name already exists
    const existingCategory = await prisma.eventCategory.findUnique({
      where: { name },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Esiste già una categoria con questo nome',
      });
    }

    const category = await prisma.eventCategory.create({
      data: {
        name,
        color,
        icon,
        isActive,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Categoria creata con successo',
      data: category,
    });
  } catch (error: any) {
    console.error('Error creating event category:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione della categoria',
      error: error.message,
    });
  }
};

/**
 * PUT /api/event-categories/:id
 * Update an event category
 */
export const updateEventCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, icon, isActive } = req.body;

    // Check if category exists
    const existingCategory = await prisma.eventCategory.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Categoria non trovata',
      });
    }

    // Check if new name conflicts with another category
    if (name && name !== existingCategory.name) {
      const nameConflict = await prisma.eventCategory.findUnique({
        where: { name },
      });

      if (nameConflict) {
        return res.status(400).json({
          success: false,
          message: 'Esiste già una categoria con questo nome',
        });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await prisma.eventCategory.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Categoria aggiornata con successo',
      data: category,
    });
  } catch (error: any) {
    console.error('Error updating event category:', error);
    res.status(500).json({
      success: false,
      message: "Errore nell'aggiornamento della categoria",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/event-categories/:id
 * Delete an event category
 */
export const deleteEventCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await prisma.eventCategory.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoria non trovata',
      });
    }

    // Check if category has associated events
    if (category._count.events > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossibile eliminare la categoria. Ci sono ${category._count.events} eventi associati.`,
      });
    }

    await prisma.eventCategory.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Categoria eliminata con successo',
    });
  } catch (error: any) {
    console.error('Error deleting event category:', error);
    res.status(500).json({
      success: false,
      message: "Errore nell'eliminazione della categoria",
      error: error.message,
    });
  }
};
