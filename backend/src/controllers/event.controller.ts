import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * GET /api/events
 * Get all events with filters and pagination
 */
export const getEvents = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '100',
      startDate,
      endDate,
      categoryId,
      contactId,
      status,
      search = '',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    // Date range filter
    if (startDate && endDate) {
      where.startDateTime = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    } else if (startDate) {
      where.startDateTime = {
        gte: new Date(startDate as string),
      };
    } else if (endDate) {
      where.startDateTime = {
        lte: new Date(endDate as string),
      };
    }

    // Category filter
    if (categoryId) {
      where.categoryId = parseInt(categoryId as string);
    }

    // Contact filter
    if (contactId) {
      where.contactId = parseInt(contactId as string);
    }

    // Status filter
    if (status) {
      where.status = status as string;
    }

    // Search filter (title, description, location)
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { description: { contains: search as string } },
        { location: { contains: search as string } },
      ];
    }

    // Get total count
    const total = await prisma.event.count({ where });

    // Get events with relations
    const events = await prisma.event.findMany({
      where,
      include: {
        category: true,
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            type: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        createdUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        participants: {
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
        },
      },
      orderBy: {
        startDateTime: 'asc',
      },
      skip,
      take: limitNum,
    });

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting events:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero degli eventi',
      error: error.message,
    });
  }
};

/**
 * GET /api/events/:id
 * Get a single event by ID
 */
export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            type: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        createdUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        participants: {
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
        },
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
  } catch (error: any) {
    console.error('Error getting event:', error);
    res.status(500).json({
      success: false,
      message: "Errore nel recupero dell'evento",
      error: error.message,
    });
  }
};

/**
 * POST /api/events
 * Create a new event
 */
export const createEvent = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      startDateTime,
      endDateTime,
      categoryId,
      contactId,
      location,
      notes,
      status = 'scheduled',
      color = '#3b82f6',
      isAllDay = false,
      visibleToClient = false,
      assignedTo,
      participants = [],
      reminderEnabled = false,
      reminderType = 'MINUTES_15',
      reminderEmail = false,
    } = req.body;

    // Log reminder parameters for debugging
    console.log('[CREATE EVENT] Reminder params:', {
      reminderEnabled,
      reminderType,
      reminderEmail,
      assignedTo,
    });

    // Validation
    if (!title || !startDateTime || !endDateTime) {
      return res.status(400).json({
        success: false,
        message: 'Titolo, data inizio e data fine sono obbligatori',
      });
    }

    const userId = (req as any).user?.userId || 1; // Default to user 1 for now

    // Create event with relations
    const event = await prisma.event.create({
      data: {
        title,
        description,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        categoryId: categoryId ? parseInt(categoryId) : null,
        contactId: contactId ? parseInt(contactId) : null,
        location,
        notes,
        status,
        color,
        isAllDay,
        visibleToClient,
        assignedTo: assignedTo ? parseInt(assignedTo) : null,
        createdBy: userId,
        participants: {
          create: participants.map((p: any) => ({
            contactId: p.contactId,
            status: p.status || 'pending',
            notes: p.notes,
          })),
        },
      },
      include: {
        category: true,
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        createdUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        participants: {
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
        },
      },
    });

    // Create reminder if enabled
    if (reminderEnabled && assignedTo) {
      const eventStart = new Date(startDateTime);
      let scheduledAt = new Date(eventStart);

      // Calculate scheduled time based on reminder type
      switch (reminderType) {
        case 'MINUTES_15':
          scheduledAt.setMinutes(scheduledAt.getMinutes() - 15);
          break;
        case 'MINUTES_30':
          scheduledAt.setMinutes(scheduledAt.getMinutes() - 30);
          break;
        case 'HOUR_1':
          scheduledAt.setHours(scheduledAt.getHours() - 1);
          break;
        case 'DAY_1':
          scheduledAt.setDate(scheduledAt.getDate() - 1);
          break;
      }

      // Create reminder record
      await prisma.eventReminder.create({
        data: {
          eventId: event.id,
          reminderType: reminderType as 'MINUTES_15' | 'MINUTES_30' | 'HOUR_1' | 'DAY_1',
          sendEmail: reminderEmail,
          emailSent: false,
          sendBrowser: true,
          browserSent: false,
          scheduledAt,
        },
      });

      console.log(`Reminder created for event ${event.id} - scheduled at ${scheduledAt.toISOString()}`);
    }

    res.status(201).json({
      success: true,
      message: 'Evento creato con successo',
      data: event,
    });
  } catch (error: any) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      message: "Errore nella creazione dell'evento",
      error: error.message,
    });
  }
};

/**
 * PUT /api/events/:id
 * Update an event
 */
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      startDateTime,
      endDateTime,
      categoryId,
      contactId,
      location,
      notes,
      status,
      color,
      isAllDay,
      visibleToClient,
      assignedTo,
      participants,
      reminderEnabled = false,
      reminderType = 'MINUTES_15',
      reminderEmail = false,
    } = req.body;

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Evento non trovato',
      });
    }

    // Update event data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startDateTime !== undefined) updateData.startDateTime = new Date(startDateTime);
    if (endDateTime !== undefined) updateData.endDateTime = new Date(endDateTime);
    if (categoryId !== undefined) updateData.categoryId = categoryId ? parseInt(categoryId) : null;
    if (contactId !== undefined) updateData.contactId = contactId ? parseInt(contactId) : null;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    if (color !== undefined) updateData.color = color;
    if (isAllDay !== undefined) updateData.isAllDay = isAllDay;
    if (visibleToClient !== undefined) updateData.visibleToClient = visibleToClient;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo ? parseInt(assignedTo) : null;

    // Handle participants update (delete old, create new)
    if (participants !== undefined) {
      await prisma.eventParticipant.deleteMany({
        where: { eventId: parseInt(id) },
      });
      updateData.participants = {
        create: participants.map((p: any) => ({
          contactId: p.contactId,
          status: p.status || 'pending',
          notes: p.notes,
        })),
      };
    }

    const event = await prisma.event.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        category: true,
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        createdUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        participants: {
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
        },
      },
    });

    // Handle reminder updates
    // First, delete existing reminders for this event
    await prisma.eventReminder.deleteMany({
      where: { eventId: parseInt(id) },
    });

    // Create new reminder if enabled
    const finalAssignedTo = assignedTo !== undefined ? assignedTo : existingEvent.assignedTo;
    const finalStartDateTime = startDateTime || existingEvent.startDateTime;

    if (reminderEnabled && finalAssignedTo) {
      const eventStart = new Date(finalStartDateTime);
      let scheduledAt = new Date(eventStart);

      // Calculate scheduled time based on reminder type
      switch (reminderType) {
        case 'MINUTES_15':
          scheduledAt.setMinutes(scheduledAt.getMinutes() - 15);
          break;
        case 'MINUTES_30':
          scheduledAt.setMinutes(scheduledAt.getMinutes() - 30);
          break;
        case 'HOUR_1':
          scheduledAt.setHours(scheduledAt.getHours() - 1);
          break;
        case 'DAY_1':
          scheduledAt.setDate(scheduledAt.getDate() - 1);
          break;
      }

      // Create reminder record
      await prisma.eventReminder.create({
        data: {
          eventId: parseInt(id),
          reminderType: reminderType as 'MINUTES_15' | 'MINUTES_30' | 'HOUR_1' | 'DAY_1',
          sendEmail: reminderEmail,
          emailSent: false,
          sendBrowser: true,
          browserSent: false,
          scheduledAt,
        },
      });

      console.log(`Reminder updated for event ${id} - scheduled at ${scheduledAt.toISOString()}`);
    } else {
      console.log(`Reminders deleted for event ${id} - reminderEnabled: ${reminderEnabled}`);
    }

    res.json({
      success: true,
      message: 'Evento aggiornato con successo',
      data: event,
    });
  } catch (error: any) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      message: "Errore nell'aggiornamento dell'evento",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/events/:id
 * Delete an event
 */
export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: parseInt(id) },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento non trovato',
      });
    }

    // Delete event (participants will be deleted automatically due to cascade)
    await prisma.event.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Evento eliminato con successo',
    });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: "Errore nell'eliminazione dell'evento",
      error: error.message,
    });
  }
};
