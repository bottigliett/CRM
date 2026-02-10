import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Get system statistics (DEVELOPER only)
export const getSystemStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    // Verifica che sia DEVELOPER
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return res.status(403).json({
        success: false,
        message: 'Accesso riservato ai Developer',
      });
    }

    // Raccogli statistiche in parallelo
    const [
      usersCount,
      activeUsersCount,
      contactsCount,
      tasksCount,
      openTasksCount,
      eventsCount,
      upcomingEventsCount,
      ticketsCount,
      openTicketsCount,
      quotesCount,
      pendingQuotesCount,
      invoicesCount,
      unpaidInvoicesCount,
      projectsCount,
      activeProjectsCount,
      clientAccessCount,
      activeClientAccessCount,
      transactionsCount,
      accessLogsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.contact.count(),
      prisma.task.count(),
      prisma.task.count({ where: { status: { not: 'COMPLETED' } } }),
      prisma.event.count(),
      prisma.event.count({ where: { startDateTime: { gte: new Date() } } }),
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'] } } }),
      prisma.quote.count(),
      prisma.quote.count({ where: { status: 'SENT' } }),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: { in: ['DRAFT', 'ISSUED'] } } }),
      prisma.project.count(),
      prisma.project.count({ where: { status: { not: 'COMPLETED' } } }),
      prisma.clientAccess.count(),
      prisma.clientAccess.count({ where: { isActive: true } }),
      prisma.transaction.count(),
      prisma.accessLog.count(),
    ]);

    // Calcola statistiche aggiuntive
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayLogins, todayNewTasks, todayNewTickets] = await Promise.all([
      prisma.accessLog.count({
        where: {
          action: 'LOGIN',
          status: 'SUCCESS',
          createdAt: { gte: todayStart },
        },
      }),
      prisma.task.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.ticket.count({
        where: { createdAt: { gte: todayStart } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: usersCount,
          active: activeUsersCount,
        },
        contacts: {
          total: contactsCount,
        },
        tasks: {
          total: tasksCount,
          open: openTasksCount,
          todayNew: todayNewTasks,
        },
        events: {
          total: eventsCount,
          upcoming: upcomingEventsCount,
        },
        tickets: {
          total: ticketsCount,
          open: openTicketsCount,
          todayNew: todayNewTickets,
        },
        quotes: {
          total: quotesCount,
          pending: pendingQuotesCount,
        },
        invoices: {
          total: invoicesCount,
          unpaid: unpaidInvoicesCount,
        },
        projects: {
          total: projectsCount,
          active: activeProjectsCount,
        },
        clientAccess: {
          total: clientAccessCount,
          active: activeClientAccessCount,
        },
        transactions: {
          total: transactionsCount,
        },
        accessLogs: {
          total: accessLogsCount,
          todayLogins: todayLogins,
        },
      },
    });
  } catch (error) {
    console.error('Errore durante il recupero statistiche:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero delle statistiche',
    });
  }
};

// Get recent access logs (DEVELOPER only)
export const getRecentAccessLogs = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    // Verifica che sia DEVELOPER
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return res.status(403).json({
        success: false,
        message: 'Accesso riservato ai Developer',
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const action = req.query.action as string;

    const whereClause: any = {};
    if (action) {
      whereClause.action = action;
    }

    const logs = await prisma.accessLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Errore durante il recupero access logs:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero degli access logs',
    });
  }
};

// Get database info (DEVELOPER only)
export const getDatabaseInfo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    // Verifica che sia DEVELOPER
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return res.status(403).json({
        success: false,
        message: 'Accesso riservato ai Developer',
      });
    }

    // Get table row counts
    const tableStats = await Promise.all([
      prisma.$queryRaw`SELECT 'users' as table_name, COUNT(*) as count FROM users`,
      prisma.$queryRaw`SELECT 'contacts' as table_name, COUNT(*) as count FROM contacts`,
      prisma.$queryRaw`SELECT 'tasks' as table_name, COUNT(*) as count FROM tasks`,
      prisma.$queryRaw`SELECT 'events' as table_name, COUNT(*) as count FROM events`,
      prisma.$queryRaw`SELECT 'tickets' as table_name, COUNT(*) as count FROM tickets`,
      prisma.$queryRaw`SELECT 'quotes' as table_name, COUNT(*) as count FROM quotes`,
      prisma.$queryRaw`SELECT 'invoices' as table_name, COUNT(*) as count FROM invoices`,
      prisma.$queryRaw`SELECT 'projects' as table_name, COUNT(*) as count FROM projects`,
      prisma.$queryRaw`SELECT 'transactions' as table_name, COUNT(*) as count FROM transactions`,
      prisma.$queryRaw`SELECT 'access_logs' as table_name, COUNT(*) as count FROM access_logs`,
      prisma.$queryRaw`SELECT 'sessions' as table_name, COUNT(*) as count FROM sessions`,
      prisma.$queryRaw`SELECT 'notifications' as table_name, COUNT(*) as count FROM notifications`,
    ]);

    res.json({
      success: true,
      data: {
        tables: tableStats.flat(),
        databaseUrl: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') || 'N/A',
        nodeEnv: process.env.NODE_ENV || 'development',
      },
    });
  } catch (error) {
    console.error('Errore durante il recupero info database:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero info database',
    });
  }
};

// Clean old sessions (DEVELOPER only)
export const cleanOldSessions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    // Verifica che sia DEVELOPER
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return res.status(403).json({
        success: false,
        message: 'Accesso riservato ai Developer',
      });
    }

    // Elimina sessioni scadute
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    res.json({
      success: true,
      message: `Eliminate ${result.count} sessioni scadute`,
      data: { deletedCount: result.count },
    });
  } catch (error) {
    console.error('Errore durante la pulizia sessioni:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la pulizia delle sessioni',
    });
  }
};

// Get activity history (last 7 days) - DEVELOPER only
export const getActivityHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return res.status(403).json({
        success: false,
        message: 'Accesso riservato ai Developer',
      });
    }

    // Last 7 days
    const days = 7;
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [logins, tasks, tickets, events] = await Promise.all([
        prisma.accessLog.count({
          where: {
            action: 'LOGIN',
            status: 'SUCCESS',
            createdAt: { gte: date, lt: nextDate },
          },
        }),
        prisma.task.count({
          where: { createdAt: { gte: date, lt: nextDate } },
        }),
        prisma.ticket.count({
          where: { createdAt: { gte: date, lt: nextDate } },
        }),
        prisma.event.count({
          where: { createdAt: { gte: date, lt: nextDate } },
        }),
      ]);

      result.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('it-IT', { weekday: 'short' }),
        logins,
        tasks,
        tickets,
        events,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Errore durante il recupero activity history:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero activity history',
    });
  }
};

// Clean old access logs (DEVELOPER only)
export const cleanOldAccessLogs = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    // Verifica che sia DEVELOPER
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return res.status(403).json({
        success: false,
        message: 'Accesso riservato ai Developer',
      });
    }

    // Elimina access logs più vecchi di 30 giorni
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.accessLog.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    res.json({
      success: true,
      message: `Eliminati ${result.count} access logs (più vecchi di 30 giorni)`,
      data: { deletedCount: result.count },
    });
  } catch (error) {
    console.error('Errore durante la pulizia access logs:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la pulizia degli access logs',
    });
  }
};

// Get all module settings (DEVELOPER only)
export const getModuleSettings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return res.status(403).json({
        success: false,
        message: 'Accesso riservato ai Developer',
      });
    }

    const modules = await prisma.moduleSettings.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      success: true,
      data: modules,
    });
  } catch (error) {
    console.error('Errore durante il recupero module settings:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero delle impostazioni moduli',
    });
  }
};

// Update module visibility (DEVELOPER only)
export const updateModuleSettings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return res.status(403).json({
        success: false,
        message: 'Accesso riservato ai Developer',
      });
    }

    const { moduleName } = req.params;
    const { isEnabled } = req.body;

    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isEnabled deve essere un booleano',
      });
    }

    const module = await prisma.moduleSettings.update({
      where: { moduleName },
      data: {
        isEnabled,
        updatedBy: currentUser.id,
      },
    });

    // Log the action
    await prisma.accessLog.create({
      data: {
        userId: currentUser.id,
        username: currentUser.username,
        action: 'MODULE_VISIBILITY_CHANGED',
        status: 'SUCCESS',
        details: `Module "${moduleName}" ${isEnabled ? 'enabled' : 'disabled'}`,
      },
    });

    res.json({
      success: true,
      data: module,
      message: `Modulo ${isEnabled ? 'attivato' : 'disattivato'} con successo`,
    });
  } catch (error) {
    console.error('Errore durante aggiornamento module settings:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento delle impostazioni modulo',
    });
  }
};

// Get enabled modules (all authenticated users)
export const getEnabledModules = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const modules = await prisma.moduleSettings.findMany({
      where: { isEnabled: true },
      select: { moduleName: true },
    });

    const enabledModuleNames = modules.map(m => m.moduleName);

    res.json({
      success: true,
      data: enabledModuleNames,
    });
  } catch (error) {
    console.error('Errore durante il recupero moduli attivi:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero dei moduli attivi',
    });
  }
};
