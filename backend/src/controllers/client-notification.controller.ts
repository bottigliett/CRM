import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * GET /api/client/notifications
 * Ottieni notifiche del cliente autenticato
 */
export const getClientNotifications = async (req: Request, res: Response) => {
  try {
    const clientAccessId = (req as any).client.clientAccessId;
    const { unreadOnly, page = '1', limit = '20' } = req.query;

    const where: any = { clientAccessId };
    if (unreadOnly === 'true') {
      where.readAt = null;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.clientNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.clientNotification.count({ where }),
      prisma.clientNotification.count({
        where: {
          clientAccessId,
          readAt: null,
        },
      }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching client notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle notifiche',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/client/notifications/unread-count
 * Conta notifiche non lette
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const clientAccessId = (req as any).client.clientAccessId;

    const unreadCount = await prisma.clientNotification.count({
      where: {
        clientAccessId,
        readAt: null,
      },
    });

    res.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error: any) {
    console.error('Error counting unread notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel conteggio delle notifiche',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * PUT /api/client/notifications/:id/read
 * Marca notifica come letta
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const clientAccessId = (req as any).client.clientAccessId;
    const { id } = req.params;

    // Verifica che la notifica appartenga al cliente
    const notification = await prisma.clientNotification.findFirst({
      where: {
        id: parseInt(id),
        clientAccessId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notifica non trovata',
      });
    }

    const updated = await prisma.clientNotification.update({
      where: { id: parseInt(id) },
      data: { readAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Notifica marcata come letta',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento della notifica',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * PUT /api/client/notifications/read-all
 * Marca tutte le notifiche come lette
 */
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const clientAccessId = (req as any).client.clientAccessId;

    await prisma.clientNotification.updateMany({
      where: {
        clientAccessId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Tutte le notifiche marcate come lette',
    });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento delle notifiche',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * DELETE /api/client/notifications/:id
 * Elimina notifica
 */
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const clientAccessId = (req as any).client.clientAccessId;
    const { id } = req.params;

    // Verifica che la notifica appartenga al cliente
    const notification = await prisma.clientNotification.findFirst({
      where: {
        id: parseInt(id),
        clientAccessId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notifica non trovata',
      });
    }

    await prisma.clientNotification.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Notifica eliminata con successo',
    });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione della notifica',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * POST /api/admin/notifications/send
 * Invia notifica a cliente (ADMIN)
 */
export const sendNotification = async (req: Request, res: Response) => {
  try {
    const { clientAccessId, type, title, message, relatedId, relatedType, link } = req.body;

    if (!clientAccessId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Campi obbligatori mancanti',
      });
    }

    const notification = await prisma.clientNotification.create({
      data: {
        clientAccessId,
        type,
        title,
        message,
        relatedId,
        relatedType,
        link,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Notifica inviata con successo',
      data: notification,
    });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'invio della notifica',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/admin/notifications
 * Lista tutte le notifiche (ADMIN) - per debugging
 */
export const getAllNotifications = async (req: Request, res: Response) => {
  try {
    const { clientAccessId, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (clientAccessId) {
      where.clientAccessId = parseInt(clientAccessId as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [notifications, total] = await Promise.all([
      prisma.clientNotification.findMany({
        where,
        include: {
          clientAccess: {
            select: {
              username: true,
              contact: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.clientNotification.count({ where }),
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle notifiche',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
