import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword } from '../utils/password';
import { AuthRequest } from '../middleware/auth';

// Moduli disponibili nel sistema
export const AVAILABLE_MODULES = [
  { name: 'dashboard', label: 'Dashboard', description: 'Panoramica generale' },
  { name: 'lead_board', label: 'Lead Board', description: 'Gestione lead e funnel' },
  { name: 'contacts', label: 'Contatti', description: 'Gestione contatti' },
  { name: 'clients', label: 'Clienti', description: 'Gestione dashboard clienti' },
  { name: 'calendar', label: 'Agenda', description: 'Calendario eventi' },
  { name: 'tasks', label: 'Task Manager', description: 'Gestione task' },
  { name: 'tickets', label: 'Ticket System', description: 'Sistema di supporto ticket' },
  { name: 'finance', label: 'Finance Tracker', description: 'Gestione finanze' },
  { name: 'invoices', label: 'Fatture', description: 'Gestione fatture' },
  { name: 'projects', label: 'Progetti', description: 'Gestione progetti' },
  { name: 'on_duty', label: 'On Duty', description: 'Postazione di lavoro' },
];

// Get all users (only SUPER_ADMIN)
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    // Verifica che sia SUPER_ADMIN
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Non hai i permessi per accedere a questa risorsa',
      });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        profileImage: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            id: true,
            moduleName: true,
            hasAccess: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error('Errore durante il recupero utenti:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero degli utenti',
    });
  }
};

// Create new user (only SUPER_ADMIN)
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    // Verifica che sia SUPER_ADMIN
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Non hai i permessi per creare utenti',
      });
    }

    const { username, email, password, firstName, lastName, role, permissions } = req.body;

    // Validazione campi obbligatori
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email e password sono obbligatori',
      });
    }

    // Verifica se username esiste già
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username già in uso',
      });
    }

    // Verifica se email esiste già
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email già in uso',
      });
    }

    // Hash della password
    const hashedPassword = await hashPassword(password);

    // Crea nuovo utente
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: role || 'ADMIN',
      },
    });

    // Se ci sono permessi da assegnare (solo per ADMIN)
    if (role === 'ADMIN' && permissions && Array.isArray(permissions)) {
      // Filtra solo i moduli con hasAccess = true
      const activePermissions = permissions.filter((perm: any) => perm.hasAccess)
      if (activePermissions.length > 0) {
        await prisma.userPermission.createMany({
          data: activePermissions.map((perm: any) => ({
            userId: user.id,
            moduleName: perm.moduleName,
            hasAccess: true,
          })),
        });
      }
    }

    // Log creazione
    await prisma.accessLog.create({
      data: {
        userId: currentUser.id,
        username: currentUser.username,
        action: 'CREATE_USER',
        status: 'SUCCESS',
        details: `Created user ${username} with role ${role}`,
      },
    });

    // Recupera l'utente con i permessi
    const newUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        profileImage: true,
        createdAt: true,
        permissions: {
          select: {
            id: true,
            moduleName: true,
            hasAccess: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Utente creato con successo',
      data: { user: newUser },
    });
  } catch (error) {
    console.error('Errore durante la creazione utente:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la creazione dell\'utente',
    });
  }
};

// Update user (only SUPER_ADMIN)
export const updateUserById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    // Verifica che sia SUPER_ADMIN
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Non hai i permessi per modificare utenti',
      });
    }

    const userId = parseInt(req.params.id);
    const { firstName, lastName, email, username, isActive, role, permissions } = req.body;

    // Verifica che l'utente esista
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato',
      });
    }

    // Non permettere di modificare se stesso come SUPER_ADMIN
    if (userId === currentUser.id && role && role !== 'SUPER_ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Non puoi modificare il tuo ruolo di SUPER_ADMIN',
      });
    }

    // Se si vuole cambiare l'email, verifica che non sia già in uso
    if (email && email !== user.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email già in uso',
        });
      }
    }

    // Se si vuole cambiare username, verifica che non sia già in uso
    if (username && username !== user.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username già in uso',
        });
      }
    }

    // Aggiorna l'utente
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName !== undefined ? firstName : user.firstName,
        lastName: lastName !== undefined ? lastName : user.lastName,
        email: email || user.email,
        username: username || user.username,
        isActive: isActive !== undefined ? isActive : user.isActive,
        role: role || user.role,
      },
    });

    // Aggiorna i permessi (solo per ADMIN)
    if (updatedUser.role === 'ADMIN' && permissions && Array.isArray(permissions)) {
      // Elimina i permessi esistenti
      await prisma.userPermission.deleteMany({
        where: { userId: userId },
      });

      // Crea i nuovi permessi (solo quelli con hasAccess = true)
      const activePermissions = permissions.filter((perm: any) => perm.hasAccess)
      if (activePermissions.length > 0) {
        await prisma.userPermission.createMany({
          data: activePermissions.map((perm: any) => ({
            userId: userId,
            moduleName: perm.moduleName,
            hasAccess: true,
          })),
        });
      }
    }

    // Log aggiornamento
    await prisma.accessLog.create({
      data: {
        userId: currentUser.id,
        username: currentUser.username,
        action: 'UPDATE_USER',
        status: 'SUCCESS',
        details: `Updated user ${updatedUser.username}`,
      },
    });

    // Recupera l'utente con i permessi
    const finalUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        profileImage: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            id: true,
            moduleName: true,
            hasAccess: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Utente aggiornato con successo',
      data: { user: finalUser },
    });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento utente:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento dell\'utente',
    });
  }
};

// Delete user (only SUPER_ADMIN)
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    // Verifica che sia SUPER_ADMIN
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Non hai i permessi per eliminare utenti',
      });
    }

    const userId = parseInt(req.params.id);

    // Non permettere di eliminare se stesso
    if (userId === currentUser.id) {
      return res.status(400).json({
        success: false,
        message: 'Non puoi eliminare il tuo account',
      });
    }

    // Verifica che l'utente esista
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato',
      });
    }

    // Elimina l'utente (cascade eliminerà anche sessions e permissions)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Log eliminazione
    await prisma.accessLog.create({
      data: {
        userId: currentUser.id,
        username: currentUser.username,
        action: 'DELETE_USER',
        status: 'SUCCESS',
        details: `Deleted user ${user.username}`,
      },
    });

    res.json({
      success: true,
      message: 'Utente eliminato con successo',
    });
  } catch (error) {
    console.error('Errore durante l\'eliminazione utente:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'eliminazione dell\'utente',
    });
  }
};

// Get available modules
export const getAvailableModules = async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      success: true,
      data: { modules: AVAILABLE_MODULES },
    });
  } catch (error) {
    console.error('Errore durante il recupero moduli:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero dei moduli',
    });
  }
};

// Get admin users (for assignedTo in events)
export const getAdminUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN'],
        },
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
      orderBy: {
        username: 'asc',
      },
    });

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error('Errore durante il recupero admin users:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero degli utenti admin',
    });
  }
};

// Get calendar preferences for current user
export const getCalendarPreferences = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    let preferences = await prisma.calendarPreference.findUnique({
      where: { userId: req.user.userId },
    });

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await prisma.calendarPreference.create({
        data: {
          userId: req.user.userId,
          defaultView: 'month',
          defaultStartHour: 7,
          defaultEndHour: 22,
          showWeekends: true,
          defaultEventDuration: 60,
          hideSidebar: false,
        },
      });
    }

    // Parse favoriteCategories from JSON string to array
    const data = {
      defaultView: preferences.defaultView,
      defaultStartHour: preferences.defaultStartHour,
      defaultEndHour: preferences.defaultEndHour,
      favoriteCategories: preferences.favoriteCategories
        ? JSON.parse(preferences.favoriteCategories)
        : [],
      showWeekends: preferences.showWeekends,
      defaultEventDuration: preferences.defaultEventDuration,
      hideSidebar: preferences.hideSidebar,
    };

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Errore durante il recupero preferenze calendario:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero delle preferenze',
    });
  }
};

// Update calendar preferences for current user
export const updateCalendarPreferences = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const {
      defaultView,
      defaultStartHour,
      defaultEndHour,
      favoriteCategories,
      showWeekends,
      defaultEventDuration,
      hideSidebar,
    } = req.body;

    // Convert favoriteCategories array to JSON string
    const favoriteCategoriesJson = favoriteCategories
      ? JSON.stringify(favoriteCategories)
      : null;

    // Upsert (update if exists, create if not)
    const preferences = await prisma.calendarPreference.upsert({
      where: { userId: req.user.userId },
      update: {
        defaultView: defaultView !== undefined ? defaultView : undefined,
        defaultStartHour: defaultStartHour !== undefined ? defaultStartHour : undefined,
        defaultEndHour: defaultEndHour !== undefined ? defaultEndHour : undefined,
        favoriteCategories: favoriteCategoriesJson !== null ? favoriteCategoriesJson : undefined,
        showWeekends: showWeekends !== undefined ? showWeekends : undefined,
        defaultEventDuration: defaultEventDuration !== undefined ? defaultEventDuration : undefined,
        hideSidebar: hideSidebar !== undefined ? hideSidebar : undefined,
      },
      create: {
        userId: req.user.userId,
        defaultView: defaultView || 'month',
        defaultStartHour: defaultStartHour ?? 7,
        defaultEndHour: defaultEndHour ?? 22,
        favoriteCategories: favoriteCategoriesJson,
        showWeekends: showWeekends ?? true,
        defaultEventDuration: defaultEventDuration || 60,
        hideSidebar: hideSidebar ?? false,
      },
    });

    // Parse back to return consistent format
    const data = {
      defaultView: preferences.defaultView,
      defaultStartHour: preferences.defaultStartHour,
      defaultEndHour: preferences.defaultEndHour,
      favoriteCategories: preferences.favoriteCategories
        ? JSON.parse(preferences.favoriteCategories)
        : [],
      showWeekends: preferences.showWeekends,
      defaultEventDuration: preferences.defaultEventDuration,
      hideSidebar: preferences.hideSidebar,
    };

    res.json({
      success: true,
      message: 'Preferenze salvate con successo',
      data,
    });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento preferenze calendario:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento delle preferenze',
    });
  }
};
