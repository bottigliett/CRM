import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

// Helper function to calculate project metrics
interface ProjectMetrics {
  actualHours: number;
  estimatedHoursFromTasks: number;
  hourlyRate: number;
  isUnderThreshold: boolean;
}

async function calculateProjectMetrics(
  projectId: number,
  contactId: number,
  budget: number,
  startDate: Date,
  completedAt: Date | null
): Promise<ProjectMetrics> {
  // Calculate actual hours from Events (excluding all-day events)
  const events = await prisma.event.findMany({
    where: {
      contactId,
      isAllDay: false, // Exclude all-day events from hour calculations
      startDateTime: {
        gte: startDate,
        ...(completedAt && { lte: completedAt }),
      },
    },
    select: {
      startDateTime: true,
      endDateTime: true,
    },
  });

  // Calculate duration in hours for each event, excluding events >= 23 hours
  const actualHours = events.reduce((sum: number, event: any) => {
    const durationMs = event.endDateTime.getTime() - event.startDateTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60); // Convert milliseconds to hours

    // Skip events that are 23+ hours (likely all-day reminders not properly flagged)
    if (durationHours >= 23) {
      return sum;
    }

    return sum + durationHours;
  }, 0);

  // Calculate estimated hours from Tasks
  const tasks = await prisma.task.findMany({
    where: {
      contactId,
      createdAt: {
        gte: startDate,
        ...(completedAt && { lte: completedAt }),
      },
    },
    select: {
      estimatedHours: true,
    },
  });

  const estimatedHoursFromTasks = tasks.reduce(
    (sum: number, task: any) => sum + (task.estimatedHours || 0),
    0
  );

  // Calculate hourly rate
  const hourlyRate = actualHours > 0 ? budget / actualHours : 0;
  const isUnderThreshold = actualHours > 0 && hourlyRate < 30;

  return {
    actualHours,
    estimatedHoursFromTasks,
    hourlyRate,
    isUnderThreshold,
  };
}

// Helper function to get weekly/monthly breakdowns
interface TimeBreakdown {
  period: string;
  hours: number;
  events: number;
}

async function getTimeBreakdowns(
  contactId: number,
  startDate: Date,
  completedAt: Date | null
): Promise<{ weekly: TimeBreakdown[]; monthly: TimeBreakdown[] }> {
  const events = await prisma.event.findMany({
    where: {
      contactId,
      isAllDay: false, // Exclude all-day events from hour calculations
      startDateTime: {
        gte: startDate,
        ...(completedAt && { lte: completedAt }),
      },
    },
    select: {
      startDateTime: true,
      endDateTime: true,
    },
    orderBy: {
      startDateTime: 'asc',
    },
  });

  // Group by month
  const monthlyMap = new Map<string, { hours: number; events: number }>();
  events.forEach((event: any) => {
    const month = event.startDateTime.toISOString().substring(0, 7); // YYYY-MM
    const durationMs = event.endDateTime.getTime() - event.startDateTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // Skip events that are 23+ hours (likely all-day reminders)
    if (durationHours >= 23) return;

    const existing = monthlyMap.get(month) || { hours: 0, events: 0 };
    monthlyMap.set(month, {
      hours: existing.hours + durationHours,
      events: existing.events + 1,
    });
  });

  const monthly = Array.from(monthlyMap.entries()).map(([period, data]: [string, any]) => ({
    period,
    ...data,
  }));

  // Group by week
  const weeklyMap = new Map<string, { hours: number; events: number }>();
  events.forEach((event: any) => {
    const date = new Date(event.startDateTime);
    const week = getWeekNumber(date);
    const year = date.getFullYear();
    const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
    const durationMs = event.endDateTime.getTime() - event.startDateTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // Skip events that are 23+ hours (likely all-day reminders)
    if (durationHours >= 23) return;

    const existing = weeklyMap.get(weekKey) || { hours: 0, events: 0 };
    weeklyMap.set(weekKey, {
      hours: existing.hours + durationHours,
      events: existing.events + 1,
    });
  });

  const weekly = Array.from(weeklyMap.entries()).map(([period, data]: [string, any]) => ({
    period,
    ...data,
  }));

  return { weekly, monthly };
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Get all projects with metrics
export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const { status, contactId } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (contactId) where.contactId = parseInt(contactId as string);

    const projects = await prisma.project.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { startDate: 'desc' },
      ],
    });

    // Calculate metrics for each project
    const projectsWithMetrics = await Promise.all(
      projects.map(async (project: any) => {
        const metrics = await calculateProjectMetrics(
          project.id,
          project.contactId,
          project.budget,
          project.startDate,
          project.completedAt
        );

        return {
          ...project,
          metrics,
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithMetrics,
    });
  } catch (error) {
    console.error('Errore durante il recupero progetti:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero dei progetti',
    });
  }
};

// Get single project by ID with detailed metrics
export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            type: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Progetto non trovato',
      });
    }

    // Calculate metrics
    const metrics = await calculateProjectMetrics(
      project.id,
      project.contactId,
      project.budget,
      project.startDate,
      project.completedAt
    );

    // Get time breakdowns
    const breakdowns = await getTimeBreakdowns(
      project.contactId,
      project.startDate,
      project.completedAt
    );

    // Get related events
    const events = await prisma.event.findMany({
      where: {
        contactId: project.contactId,
        startDateTime: {
          gte: project.startDate,
          ...(project.completedAt && { lte: project.completedAt }),
        },
      },
      select: {
        id: true,
        title: true,
        startDateTime: true,
        endDateTime: true,
        category: {
          select: {
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        startDateTime: 'desc',
      },
      take: 50,
    });

    // Get related tasks
    const tasks = await prisma.task.findMany({
      where: {
        contactId: project.contactId,
        createdAt: {
          gte: project.startDate,
          ...(project.completedAt && { lte: project.completedAt }),
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        estimatedHours: true,
        actualHours: true,
        deadline: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    res.json({
      success: true,
      data: {
        ...project,
        metrics,
        breakdowns,
        events,
        tasks,
      },
    });
  } catch (error) {
    console.error('Errore durante il recupero progetto:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero del progetto',
    });
  }
};

// Create new project
export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { name, description, contactId, budget, estimatedHours, startDate } = req.body;

    // Validate required fields
    if (!name || !contactId || budget === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Nome, cliente e budget sono obbligatori',
      });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        contactId: parseInt(contactId),
        budget: parseFloat(budget),
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        startDate: startDate ? new Date(startDate) : undefined,
        createdBy: req.user.userId,
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Calculate initial metrics
    const metrics = await calculateProjectMetrics(
      project.id,
      project.contactId,
      project.budget,
      project.startDate,
      project.completedAt
    );

    res.status(201).json({
      success: true,
      message: 'Progetto creato con successo',
      data: {
        ...project,
        metrics,
      },
    });
  } catch (error) {
    console.error('Errore durante la creazione progetto:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la creazione del progetto',
    });
  }
};

// Update project
export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, budget, estimatedHours, startDate } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (budget !== undefined) updateData.budget = parseFloat(budget);
    if (estimatedHours !== undefined)
      updateData.estimatedHours = estimatedHours ? parseFloat(estimatedHours) : null;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);

    const project = await prisma.project.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Calculate updated metrics
    const metrics = await calculateProjectMetrics(
      project.id,
      project.contactId,
      project.budget,
      project.startDate,
      project.completedAt
    );

    res.json({
      success: true,
      message: 'Progetto aggiornato con successo',
      data: {
        ...project,
        metrics,
      },
    });
  } catch (error) {
    console.error("Errore durante l'aggiornamento progetto:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante l'aggiornamento del progetto",
    });
  }
};

// Complete project
export const completeProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.update({
      where: { id: parseInt(id) },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Calculate final metrics
    const metrics = await calculateProjectMetrics(
      project.id,
      project.contactId,
      project.budget,
      project.startDate,
      project.completedAt
    );

    res.json({
      success: true,
      message: 'Progetto completato con successo',
      data: {
        ...project,
        metrics,
      },
    });
  } catch (error) {
    console.error('Errore durante il completamento progetto:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il completamento del progetto',
    });
  }
};

// Delete project
export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.project.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Progetto eliminato con successo',
    });
  } catch (error) {
    console.error("Errore durante l'eliminazione progetto:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante l'eliminazione del progetto",
    });
  }
};
