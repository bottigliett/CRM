import prisma from '../config/database';
import { createNotification } from '../controllers/notification.controller';
import { sendEventReminderEmail, sendEventAssignedEmail, sendTaskAssignedEmail } from './email.service';

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
          },
        },
      },
    });

    console.log(`Processing ${dueReminders.length} due reminders...`);

    for (const reminder of dueReminders) {
      const event = reminder.event;

      // Get user preferences
      const preferences = await prisma.notificationPreference.findUnique({
        where: { userId: event.assignedTo || event.createdBy },
      });

      // Create browser notification if enabled
      if (reminder.sendBrowser && !reminder.browserSent) {
        const shouldSend = preferences?.browserEnabled && preferences?.browserEventReminder;

        if (shouldSend !== false) {
          // Create notification
          await createNotification(
            event.assignedTo || event.createdBy,
            'EVENT_REMINDER',
            `Promemoria: ${event.title}`,
            `L'evento inizia ${getReminderTimeText(reminder.reminderType)}`,
            `/calendar?event=${event.id}`,
            event.id
          );

          // Mark as sent
          await prisma.eventReminder.update({
            where: { id: reminder.id },
            data: {
              browserSent: true,
              browserSentAt: new Date(),
            },
          });
        }
      }

      // Send email notification if enabled
      if (reminder.sendEmail && !reminder.emailSent) {
        const shouldSend = preferences?.emailEnabled && preferences?.emailEventReminder;

        if (shouldSend !== false) {
          // Get user email
          const user = await prisma.user.findUnique({
            where: { id: event.assignedTo || event.createdBy },
          });

          if (user?.email) {
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
            }
          }

          // Mark as sent even if email failed (to avoid retry loops)
          await prisma.eventReminder.update({
            where: { id: reminder.id },
            data: {
              emailSent: true,
              emailSentAt: new Date(),
            },
          });
        }
      }
    }

    return dueReminders.length;
  } catch (error) {
    console.error('Errore durante il processing dei reminders:', error);
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
