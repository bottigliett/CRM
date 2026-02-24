import { Response } from 'express';
import prisma from '../config/database';
import { ClientAuthRequest } from '../middleware/client-auth';

/**
 * GET /api/client/tasks
 * Get tasks for the authenticated client
 */
export const getClientTasks = async (req: ClientAuthRequest, res: Response) => {
  try {
    if (!req.client) {
      return res.status(401).json({
        success: false,
        message: 'Cliente non autenticato',
      });
    }

    const { limit = '100', isArchived = 'false' } = req.query;
    const contactId = req.client.contactId;

    const where: any = {
      taskContacts: { some: { contactId } },
      isArchived: isArchived === 'true',
    };

    const tasks = await prisma.task.findMany({
      where,
      orderBy: {
        deadline: 'asc',
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
      data: tasks,
    });
  } catch (error) {
    console.error('Errore durante il recupero dei task del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero dei task',
    });
  }
};

/**
 * GET /api/client/tasks/:id
 * Get single task by ID (only if belongs to the client)
 */
export const getClientTaskById = async (req: ClientAuthRequest, res: Response) => {
  try {
    if (!req.client) {
      return res.status(401).json({
        success: false,
        message: 'Cliente non autenticato',
      });
    }

    const { id } = req.params;
    const contactId = req.client.contactId;

    const task = await prisma.task.findFirst({
      where: {
        id: parseInt(id),
        taskContacts: { some: { contactId } },
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
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task non trovato',
      });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Errore durante il recupero del task:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero del task',
    });
  }
};
