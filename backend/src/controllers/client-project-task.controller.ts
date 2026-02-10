import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ClientAuthRequest } from '../middleware/client-auth';

const prisma = new PrismaClient();

/**
 * GET /api/client/tasks
 * Get all tasks for the client - from quote OR from client-specific tasks
 */
export const getClientProjectTasks = async (req: ClientAuthRequest, res: Response) => {
  try {
    if (!req.client) {
      return res.status(401).json({
        success: false,
        message: 'Cliente non autenticato',
      });
    }

    const contactId = req.client.contactId;
    const clientAccessId = req.client.id;

    // First, try to find tasks from an accepted quote
    const quote = await prisma.quote.findFirst({
      where: {
        contactId,
        status: 'ACCEPTED',
      },
      orderBy: {
        acceptedDate: 'desc',
      },
      select: {
        id: true,
        quoteNumber: true,
        title: true,
      },
    });

    if (quote) {
      // Get all tasks for this quote
      const tasks = await prisma.projectTask.findMany({
        where: { quoteId: quote.id },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          isCompleted: true,
          completedAt: true,
          order: true,
        },
      });

      const completedCount = tasks.filter(t => t.isCompleted).length;
      const totalCount = tasks.length;
      const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      return res.json({
        success: true,
        data: {
          quote: {
            id: quote.id,
            quoteNumber: quote.quoteNumber,
            title: quote.title,
          },
          tasks,
          progress: {
            completed: completedCount,
            total: totalCount,
            percentage,
          },
        },
      });
    }

    // No quote found, check for client-specific tasks (ClientProjectTask)
    const clientTasks = await prisma.clientProjectTask.findMany({
      where: { clientAccessId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        isCompleted: true,
        completedAt: true,
        order: true,
      },
    });

    const completedCount = clientTasks.filter(t => t.isCompleted).length;
    const totalCount = clientTasks.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return res.json({
      success: true,
      data: {
        quote: null,
        tasks: clientTasks,
        progress: {
          completed: completedCount,
          total: totalCount,
          percentage,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching client project tasks:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei task',
    });
  }
};
