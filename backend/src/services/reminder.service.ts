import prisma from '../config/database';
import { createNotification } from '../controllers/notification.controller';
import { sendEventReminderEmail, sendEventAssignedEmail, sendTaskAssignedEmail, sendTaskDueSoonEmail, sendTaskOverdueEmail } from './email.service';

// Calculate reminder time based on event start time and reminder type
export const calculateReminderTime = (eventStart: Date, reminderType: string): Date => {
  const reminderTime = new Date(eventStart);

  switch (reminderType) {
    case 'MINUTES_15':
      reminderTime.setMinutes(reminderTime.getMinutes() - 15);
      break;
    case 'MINUTES_30':
      reminderTime.setMinutes(reminderTime.getMinutes() - 30);
      break;
    case 'HOUR_1':
      reminderTime.setHours(reminderTime.getHours() - 1);
      break;
    case 'DAY_1':
      reminderTime.setDate(reminderTime.getDate() - 1);
      break;
    default:
      reminderTime.setMinutes(reminderTime.getMinutes() - 15); // Default to 15 minutes
  }

  return reminderTime;
};

// Create event reminder
export const createEventReminder = async (
  eventId: number,
  reminderType: string,
  sendEmail: boolean = false,
  sendBrowser: boolean = true
) => {
  try {
    // Get event details
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        contact: true,
        category: true,
        assignedUser: true,
      },
    });

    if (!event) {
      throw new Error('Evento non trovato');
    }

    const scheduledAt = calculateReminderTime(event.startDateTime, reminderType);

    // Create reminder in database
    const reminder = await prisma.eventReminder.create({
      data: {
        eventId,
        reminderType: reminderType as any,
        sendEmail,
        sendBrowser,
        scheduledAt,
      },
    });

    return reminder;
  } catch (error) {
    console.error('Errore durante la creazione del reminder:', error);
    throw error;
  }
};

/** Unique user ids responsible for an event (assignedTo + team members). */
function eventResponsibleUserIds(event: any): number[] {
  const ids = new Set<number>();
  if (event.assignedTo) ids.add(event.assignedTo);
  for (const tm of event.teamMembers || []) if (tm.userId) ids.add(tm.userId);
  return [...ids];
}

/** Unique user ids responsible for a task (assignedTo + team members). */
function taskResponsibleUserIds(task: any): number[] {
  const ids = new Set<number>();
  if (task.assignedTo) ids.add(task.assignedTo);
  for (const tm of task.teamMembers || []) if (tm.userId) ids.add(tm.userId);
  return [...ids];
}

// Process due reminders (should be run periodically, e.g., every minute via cron job)
export const processDueReminders = async () => {
  try {
    const now = new Date();

    // Find all reminders that are due and not yet sent
    const dueReminders = await prisma.eventReminder.findMany({
      where: {
        scheduledAt: {
          lte: now,
        },
        OR: [
          { sendEmail: true, emailSent: false },
          { sendBrowser: true, browserSent: false },
        ],
      },
      include: {
        event: {
          include: {
            contact: true,
            category: true,
            assignedUser: true,
            teamMembers: { include: { user: true } },
          },
        },
      },
    });

    console.log(`Processing ${dueReminders.length} due reminders...`);

    for (const reminder of dueReminders) {
      const event = reminder.event;
      const recipientIds = eventResponsibleUserIds(event);

      // Create browser notification if enabled (for every responsible user)
      if (reminder.sendBrowser && !reminder.browserSent) {
        for (const userId of recipientIds) {
          const preferences = await prisma.notificationPreference.findUnique({ where: { userId } });
          const shouldSend = preferences?.browserEnabled && preferences?.browserEventReminder;
          if (shouldSend !== false) {
            await createNotification(
              userId,
              'EVENT_REMINDER',
              `Promemoria: ${event.title}`,
              `L'evento inizia ${getReminderTimeText(reminder.reminderType)}`,
              `/calendar?event=${event.id}`,
              event.id
            );
          }
        }
        await prisma.eventReminder.update({
          where: { id: reminder.id },
          data: { browserSent: true, browserSentAt: new Date() },
        });
      }

      // Send email notification if enabled (for every responsible user)
      if (reminder.sendEmail && !reminder.emailSent) {
        for (const userId of recipientIds) {
          const preferences = await prisma.notificationPreference.findUnique({ where: { userId } });
          const shouldSend = preferences?.emailEnabled && preferences?.emailEventReminder;
          if (shouldSend === false) continue;

          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (!user?.email) continue;

          const eventLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/calendar?event=${event.id}`;
          const success = await sendEventReminderEmail(
            user.email,
            event.title,
            event.startDateTime,
            getReminderTimeText(reminder.reminderType),
            eventLink
          );

          if (success) {
            console.log(`Email reminder sent for event ${event.id} to ${user.email}`);
          } else {
            console.error(`⚠️ Email reminder FAILED for event ${event.id} to ${user.email} (errore SMTP)`);
          }
        }

        await prisma.eventReminder.update({
          where: { id: reminder.id },
          data: { emailSent: true, emailSentAt: new Date() },
        });
      }
    }

    return dueReminders.length;
  } catch (error) {
    console.error('Errore durante il processing dei reminders:', error);
    throw error;
  }
};

// Process task deadlines: notify (browser + email) for tasks due soon (<=24h)
// and overdue. Deduplicates via the notifications table (taskId + type).
export const processDueTasks = async () => {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 3600 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
        isArchived: false,
        status: { in: ['TODO', 'IN_PROGRESS', 'PENDING'] },
        deadline: { lte: soon },
      },
      include: {
        assignedUser: true,
        teamMembers: { include: { user: true } },
      },
    });

    let emailsSent = 0;

    for (const task of tasks) {
      const isOverdue = task.deadline.getTime() < now.getTime();
      const type = isOverdue ? 'TASK_OVERDUE' : 'TASK_DUE_SOON';
      const recipientIds = taskResponsibleUserIds(task);
      const taskLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks?task=${task.id}`;

      for (const userId of recipientIds) {
        // Dedup: already notified this user for this task (browser + email sent together)
        const existing = await prisma.notification.findFirst({
          where: { userId, taskId: task.id, type: type as any },
        });
        if (existing) continue;

        const preferences = await prisma.notificationPreference.findUnique({ where: { userId } });
        const user = await prisma.user.findUnique({ where: { id: userId } });

        // Browser notification (also acts as the dedup marker)
        await createNotification(
          userId,
          type,
          isOverdue ? `Task in ritardo: ${task.title}` : `Scadenza imminente: ${task.title}`,
          isOverdue
            ? `La task "${task.title}" è scaduta`
            : `La task "${task.title}" scade entro 24 ore`,
          taskLink,
          undefined,
          task.id
        );

        // Email
        const emailEnabled = preferences?.emailEnabled !== false;
        const emailTypePref = isOverdue ? preferences?.emailTaskOverdue : preferences?.emailTaskDueSoon;
        if (emailEnabled && emailTypePref !== false && user?.email) {
          const success = isOverdue
            ? await sendTaskOverdueEmail(user.email, task.title, task.deadline, taskLink)
            : await sendTaskDueSoonEmail(user.email, task.title, task.deadline, taskLink);
          if (success) {
            emailsSent++;
            console.log(`Task ${isOverdue ? 'overdue' : 'due soon'} email sent for task ${task.id} to ${user.email}`);
          } else {
            console.error(`⚠️ Task email FAILED for task ${task.id} to ${user.email} (errore SMTP)`);
          }
        }
      }
    }

    if (emailsSent > 0) console.log(`[tasks] Inviate ${emailsSent} email per task in scadenza/scadute`);
    return emailsSent;
  } catch (error) {
    console.error('Errore durante il processing delle task:', error);
    throw error;
  }
};

// Get reminder time text in Italian
const getReminderTimeText = (reminderType: string): string => {
  switch (reminderType) {
    case 'MINUTES_15':
      return 'tra 15 minuti';
    case 'MINUTES_30':
      return 'tra 30 minuti';
    case 'HOUR_1':
      return 'tra 1 ora';
    case 'DAY_1':
      return 'domani';
    default:
      return 'a breve';
  }
};

// Create notification when user is assigned to an event
export const notifyEventAssignment = async (eventId: number, userId: number) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        contact: true,
        category: true,
      },
    });

    if (!event) {
      throw new Error('Evento non trovato');
    }

    // Get user preferences
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    const shouldSend = preferences?.browserEnabled && preferences?.browserEventAssigned;

    if (shouldSend !== false) {
      await createNotification(
        userId,
        'EVENT_ASSIGNED',
        'Nuovo evento assegnato',
        `Ti è stato assegnato l'evento: ${event.title}`,
        `/calendar?event=${event.id}`,
        event.id
      );
    }

    // Send email if enabled
    if (preferences?.emailEnabled && preferences?.emailEventAssigned) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      const assignedByUser = await prisma.user.findUnique({
        where: { id: event.createdBy },
      });

      if (user?.email && assignedByUser) {
        const eventLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/calendar?event=${event.id}`;
        const success = await sendEventAssignedEmail(
          user.email,
          event.title,
          event.startDateTime,
          `${assignedByUser.firstName} ${assignedByUser.lastName}`,
          eventLink
        );

        if (success) {
          console.log(`Event assignment email sent to ${user.email}`);
        }
      }
    }
  } catch (error) {
    console.error('Errore durante la notifica di assegnazione evento:', error);
    throw error;
  }
};

// Create notification when user is assigned to a task
export const notifyTaskAssignment = async (taskId: number, userId: number) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        contact: true,
        category: true,
      },
    });

    if (!task) {
      throw new Error('Task non trovata');
    }

    // Get user preferences
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    const shouldSend = preferences?.browserEnabled && preferences?.browserTaskAssigned;

    if (shouldSend !== false) {
      await createNotification(
        userId,
        'TASK_ASSIGNED',
        'Nuova task assegnata',
        `Ti è stata assegnata la task: ${task.title}`,
        `/tasks?task=${task.id}`,
        undefined,
        task.id
      );
    }

    // Send email if enabled
    if (preferences?.emailEnabled && preferences?.emailTaskAssigned) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      const assignedByUser = await prisma.user.findUnique({
        where: { id: task.createdBy },
      });

      if (user?.email && assignedByUser) {
        const taskLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks?task=${task.id}`;
        const success = await sendTaskAssignedEmail(
          user.email,
          task.title,
          task.deadline,
          `${assignedByUser.firstName} ${assignedByUser.lastName}`,
          taskLink
        );

        if (success) {
          console.log(`Task assignment email sent to ${user.email}`);
        }
      }
    }
  } catch (error) {
    console.error('Errore durante la notifica di assegnazione task:', error);
    throw error;
  }
};
