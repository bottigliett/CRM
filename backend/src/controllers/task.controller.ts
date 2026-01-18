import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sendClientTaskAssignedEmail } from '../services/email.service';

// Get all tasks with filters and pagination
export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      status,
      priority,
      categoryId,
      contactId,
      assignedTo,
      search,
      isArchived = 'false',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      isArchived: isArchived === 'true',
    };

    if (status) {
      const statusString = status as string;
      if (statusString.includes(',')) {
        where.status = { in: statusString.split(',') };
      } else {
        where.status = statusString;
      }
    }
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = parseInt(categoryId as string);
    if (contactId) where.contactId = parseInt(contactId as string);
    if (assignedTo) where.assignedTo = parseInt(assignedTo as string);
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    // Get tasks with relations
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              type: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
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
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { priority: 'asc' },
          { deadline: 'asc' },
        ],
        skip,
        take: limitNum,
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Errore durante il recupero tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero dei task',
    });
  }
};

// Get single task by ID
export const getTaskById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: parseInt(id) },
      include: {
        contact: true,
        category: true,
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
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
    console.error('Errore durante il recupero task:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero del task',
    });
  }
};

// Create new task
export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const {
      title,
      description,
      contactId,
      categoryId,
      assignedTo,
      priority,
      status,
      deadline,
      estimatedHours,
      visibleToClient,
      teamMembers = [],
    } = req.body;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        contactId,
        categoryId,
        assignedTo,
        createdBy: req.user.userId,
        priority: priority || 'P2',
        status: status || 'TODO',
        deadline: new Date(deadline),
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : 0,
        visibleToClient: visibleToClient ?? true,
        teamMembers: {
          create: teamMembers.map((userId: number) => ({
            userId: parseInt(String(userId)),
          })),
        },
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
          },
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // Send email notification to client if task is visible to them
    if (task.contactId && task.visibleToClient && task.contact?.email) {
      try {
        await sendClientTaskAssignedEmail(
          task.contact.email,
          task.contact.name,
          task.title,
          task.deadline,
          task.description || undefined
        );
        console.log(`Task assignment email sent to ${task.contact.email}`);
      } catch (emailError) {
        console.error('Failed to send task assignment email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Task creato con successo',
      data: task,
    });
  } catch (error) {
    console.error('Errore durante la creazione task:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la creazione del task',
    });
  }
};

// Update task
export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { id } = req.params;
    const {
      title,
      description,
      contactId,
      categoryId,
      assignedTo,
      priority,
      status,
      deadline,
      estimatedHours,
      actualHours,
      visibleToClient,
      completedAt,
      isFavorite,
      teamMembers,
    } = req.body;

    const updateData: any = {
      updatedBy: req.user.userId,
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (contactId !== undefined) updateData.contactId = contactId;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      // Auto-set completedAt when status changes to COMPLETED
      if (status === 'COMPLETED' && !completedAt) {
        updateData.completedAt = new Date();
      }
    }
    if (deadline !== undefined) updateData.deadline = new Date(deadline);
    if (estimatedHours !== undefined) updateData.estimatedHours = parseFloat(estimatedHours);
    if (actualHours !== undefined) updateData.actualHours = parseFloat(actualHours);
    if (visibleToClient !== undefined) updateData.visibleToClient = visibleToClient;
    if (completedAt !== undefined) updateData.completedAt = completedAt ? new Date(completedAt) : null;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;

    // Handle team members update (delete old, create new)
    if (teamMembers !== undefined) {
      await prisma.taskTeamMember.deleteMany({
        where: { taskId: parseInt(id) },
      });
      updateData.teamMembers = {
        create: teamMembers.map((userId: number) => ({
          userId: parseInt(String(userId)),
        })),
      };
    }

    const task = await prisma.task.update({
      where: { id: parseInt(id) },
      data: updateData,
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
          },
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Task aggiornato con successo',
      data: task,
    });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento task:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento del task',
    });
  }
};

// Delete task
export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.task.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Task eliminato con successo',
    });
  } catch (error) {
    console.error('Errore durante l\'eliminazione task:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'eliminazione del task',
    });
  }
};

// Archive task
export const archiveTask = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { id } = req.params;

    const task = await prisma.task.update({
      where: { id: parseInt(id) },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: req.user.userId,
      },
    });

    res.json({
      success: true,
      message: 'Task archiviato con successo',
      data: task,
    });
  } catch (error) {
    console.error('Errore durante l\'archiviazione task:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'archiviazione del task',
    });
  }
};

// Get all task categories
export const getTaskCategories = async (req: AuthRequest, res: Response) => {
  try {
    const { includeInactive = 'false' } = req.query;

    const where: any = {};
    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    const categories = await prisma.taskCategory.findMany({
      where,
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Errore durante il recupero categorie task:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero delle categorie',
    });
  }
};

// Create task category
export const createTaskCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, icon, isActive } = req.body;

    const category = await prisma.taskCategory.create({
      data: {
        name,
        color,
        icon,
        isActive: isActive ?? true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Categoria creata con successo',
      data: category,
    });
  } catch (error) {
    console.error('Errore durante la creazione categoria:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la creazione della categoria',
    });
  }
};

// Update task category
export const updateTaskCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, icon, isActive } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await prisma.taskCategory.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Categoria aggiornata con successo',
      data: category,
    });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento categoria:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento della categoria',
    });
  }
};

// Delete task category
export const deleteTaskCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.taskCategory.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Categoria eliminata con successo',
    });
  } catch (error) {
    console.error('Errore durante l\'eliminazione categoria:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'eliminazione della categoria',
    });
  }
};
