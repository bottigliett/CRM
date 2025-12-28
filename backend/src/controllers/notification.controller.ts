import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Get all notifications for the current user
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { unreadOnly } = req.query;

    const where: any = {
      userId: req.user.userId,
    };

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to 50 most recent
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user.userId,
        isRead: false,
      },
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Errore durante il recupero delle notifiche:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero delle notifiche',
    });
  }
};

// Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { id } = req.params;

    // Verify notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notifica non trovata',
      });
    }

    const updated = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento della notifica:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento della notifica',
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    await prisma.notification.updateMany({
      where: {
        userId: req.user.userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Tutte le notifiche sono state contrassegnate come lette',
    });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento delle notifiche:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento delle notifiche',
    });
  }
};

// Delete notification
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { id } = req.params;

    // Verify notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notifica non trovata',
      });
    }

    await prisma.notification.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Notifica eliminata',
    });
  } catch (error) {
    console.error('Errore durante l\'eliminazione della notifica:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'eliminazione della notifica',
    });
  }
};

// Get notification preferences
export const getNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: req.user.userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId: req.user.userId,
        },
      });
    }

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Errore durante il recupero delle preferenze:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero delle preferenze',
    });
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const {
      emailEnabled,
      emailEventReminder,
      emailEventAssigned,
      emailTaskAssigned,
      emailTaskDueSoon,
      emailTaskOverdue,
      browserEnabled,
      browserEventReminder,
      browserEventAssigned,
      browserTaskAssigned,
      browserTaskDueSoon,
      browserTaskOverdue,
      centerEnabled,
      defaultReminderEnabled,
      defaultReminderType,
    } = req.body;

    // Check if preferences exist
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: req.user.userId },
    });

    if (preferences) {
      // Update existing preferences
      preferences = await prisma.notificationPreference.update({
        where: { userId: req.user.userId },
        data: {
          emailEnabled,
          emailEventReminder,
          emailEventAssigned,
          emailTaskAssigned,
          emailTaskDueSoon,
          emailTaskOverdue,
          browserEnabled,
          browserEventReminder,
          browserEventAssigned,
          browserTaskAssigned,
          browserTaskDueSoon,
          browserTaskOverdue,
          centerEnabled,
          defaultReminderEnabled,
          defaultReminderType,
        },
      });
    } else {
      // Create new preferences
      preferences = await prisma.notificationPreference.create({
        data: {
          userId: req.user.userId,
          emailEnabled,
          emailEventReminder,
          emailEventAssigned,
          emailTaskAssigned,
          emailTaskDueSoon,
          emailTaskOverdue,
          browserEnabled,
          browserEventReminder,
          browserEventAssigned,
          browserTaskAssigned,
          browserTaskDueSoon,
          browserTaskOverdue,
          centerEnabled,
          defaultReminderEnabled,
          defaultReminderType,
        },
      });
    }

    res.json({
      success: true,
      data: preferences,
      message: 'Preferenze aggiornate con successo',
    });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento delle preferenze:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento delle preferenze',
    });
  }
};

// Create notification (internal use)
export const createNotification = async (
  userId: number,
  type: string,
  title: string,
  message: string,
  link?: string,
  eventId?: number,
  taskId?: number,
  metadata?: any
) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type as any,
        title,
        message,
        link,
        eventId,
        taskId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return notification;
  } catch (error) {
    console.error('Errore durante la creazione della notifica:', error);
    throw error;
  }
};
