import { Response } from 'express';
import prisma from '../config/database';
import { ClientAuthRequest } from '../middleware/client-auth';

/**
 * GET /api/client/events
 * Get events for the authenticated client
 */
export const getClientEvents = async (req: ClientAuthRequest, res: Response) => {
  try {
    if (!req.client) {
      return res.status(401).json({
        success: false,
        message: 'Cliente non autenticato',
      });
    }

    const { limit = '100', startDate, endDate } = req.query;
    const contactId = req.client.contactId;

    // Find "Appuntamento Cliente" category
    const clientAppointmentCategory = await prisma.eventCategory.findFirst({
      where: {
        name: 'Appuntamento Cliente',
      },
    });

    const where: any = {
      contactId,
      // Only show events with "Appuntamento Cliente" category
      categoryId: clientAppointmentCategory?.id || -1, // Use -1 if category not found (will return empty)
    };

    // Date range filter
    if (startDate && endDate) {
      where.startDateTime = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: {
        startDateTime: 'asc',
      },
      take: parseInt(limit as string),
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('Errore durante il recupero degli eventi del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero degli eventi',
    });
  }
};

/**
 * GET /api/client/events/:id
 * Get single event by ID (only if belongs to the client)
 */
export const getClientEventById = async (req: ClientAuthRequest, res: Response) => {
  try {
    if (!req.client) {
      return res.status(401).json({
        success: false,
        message: 'Cliente non autenticato',
      });
    }

    const { id } = req.params;
    const contactId = req.client.contactId;

    const event = await prisma.event.findFirst({
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
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reminders: true,
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento non trovato',
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('Errore durante il recupero dell\'evento:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero dell\'evento',
    });
  }
};
