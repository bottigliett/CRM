import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { ClientAuthRequest } from '../middleware/client-auth';

/**
 * GET /api/announcements/active
 * Get active announcements for current user (based on role)
 * Available to all authenticated users
 */
export const getActiveAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non autenticato',
      });
    }

    // Get user's role
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato',
      });
    }

    const now = new Date();

    // Get active announcements
    const announcements = await prisma.systemAnnouncement.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [
          { endsAt: null },
          { endsAt: { gte: now } },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Filter by target roles
    const filteredAnnouncements = announcements.filter(announcement => {
      if (!announcement.targetRoles) return true; // null = all users

      try {
        const targetRoles = JSON.parse(announcement.targetRoles);
        return targetRoles.includes(user.role);
      } catch {
        return true;
      }
    });

    res.json({
      success: true,
      data: filteredAnnouncements,
    });
  } catch (error) {
    console.error('Error fetching active announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero degli annunci',
    });
  }
};

/**
 * GET /api/announcements
 * Get all announcements (admin only - SUPER_ADMIN and DEVELOPER)
 */
export const getAllAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non autenticato',
      });
    }

    // Check role
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true },
    });

    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'DEVELOPER')) {
      return res.status(403).json({
        success: false,
        message: 'Non hai i permessi per accedere a questa risorsa',
      });
    }

    const announcements = await prisma.systemAnnouncement.findMany({
      orderBy: [
        { createdAt: 'desc' },
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: announcements,
    });
  } catch (error) {
    console.error('Error fetching all announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero degli annunci',
    });
  }
};

/**
 * POST /api/announcements
 * Create a new announcement (SUPER_ADMIN and DEVELOPER only)
 */
export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non autenticato',
      });
    }

    // Check role
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true },
    });

    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'DEVELOPER')) {
      return res.status(403).json({
        success: false,
        message: 'Non hai i permessi per creare annunci',
      });
    }

    const { title, message, type, priority, targetRoles, startsAt, endsAt } = req.body;

    // Validation
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Titolo e messaggio sono obbligatori',
      });
    }

    const announcement = await prisma.systemAnnouncement.create({
      data: {
        title,
        message,
        type: type || 'INFO',
        priority: priority || 0,
        targetRoles: targetRoles ? JSON.stringify(targetRoles) : null,
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        endsAt: endsAt ? new Date(endsAt) : null,
        createdById: req.user.userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Annuncio creato con successo',
      data: announcement,
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione dell\'annuncio',
    });
  }
};

/**
 * PUT /api/announcements/:id
 * Update an announcement (SUPER_ADMIN and DEVELOPER only)
 */
export const updateAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non autenticato',
      });
    }

    // Check role
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true },
    });

    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'DEVELOPER')) {
      return res.status(403).json({
        success: false,
        message: 'Non hai i permessi per modificare annunci',
      });
    }

    const { id } = req.params;
    const { title, message, type, priority, targetRoles, startsAt, endsAt, isActive } = req.body;

    // Check if announcement exists
    const existing = await prisma.systemAnnouncement.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Annuncio non trovato',
      });
    }

    const announcement = await prisma.systemAnnouncement.update({
      where: { id: parseInt(id) },
      data: {
        title: title !== undefined ? title : existing.title,
        message: message !== undefined ? message : existing.message,
        type: type !== undefined ? type : existing.type,
        priority: priority !== undefined ? priority : existing.priority,
        targetRoles: targetRoles !== undefined
          ? (targetRoles ? JSON.stringify(targetRoles) : null)
          : existing.targetRoles,
        startsAt: startsAt !== undefined ? new Date(startsAt) : existing.startsAt,
        endsAt: endsAt !== undefined ? (endsAt ? new Date(endsAt) : null) : existing.endsAt,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Annuncio aggiornato con successo',
      data: announcement,
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento dell\'annuncio',
    });
  }
};

/**
 * DELETE /api/announcements/:id
 * Delete an announcement (SUPER_ADMIN and DEVELOPER only)
 */
export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non autenticato',
      });
    }

    // Check role
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true },
    });

    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'DEVELOPER')) {
      return res.status(403).json({
        success: false,
        message: 'Non hai i permessi per eliminare annunci',
      });
    }

    const { id } = req.params;

    // Check if announcement exists
    const existing = await prisma.systemAnnouncement.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Annuncio non trovato',
      });
    }

    await prisma.systemAnnouncement.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Annuncio eliminato con successo',
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione dell\'annuncio',
    });
  }
};

/**
 * GET /api/client/announcements/active
 * Get active announcements for client portal
 * Only shows announcements targeted at CLIENT role or all users
 */
export const getClientActiveAnnouncements = async (req: ClientAuthRequest, res: Response) => {
  try {
    if (!req.client) {
      return res.status(401).json({
        success: false,
        message: 'Non autenticato',
      });
    }

    const now = new Date();

    // Get active announcements
    const announcements = await prisma.systemAnnouncement.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [
          { endsAt: null },
          { endsAt: { gte: now } },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        priority: true,
        targetRoles: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
      },
    });

    // Filter by target roles - only show if includes CLIENT or is null (all users)
    const filteredAnnouncements = announcements.filter(announcement => {
      if (!announcement.targetRoles) return true; // null = all users

      try {
        const targetRoles = JSON.parse(announcement.targetRoles);
        return targetRoles.includes('CLIENT');
      } catch {
        return true;
      }
    });

    res.json({
      success: true,
      data: filteredAnnouncements,
    });
  } catch (error) {
    console.error('Error fetching client announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero degli annunci',
    });
  }
};
