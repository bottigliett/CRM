import prisma from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

async function testImmediateReminder() {
  console.log('=== Test Immediate Reminder ===\n');

  try {
    // Create an event that starts in 5 minutes
    const eventStart = new Date();
    eventStart.setMinutes(eventStart.getMinutes() + 5);

    const eventEnd = new Date(eventStart);
    eventEnd.setHours(eventEnd.getHours() + 1);

    const event = await prisma.event.create({
      data: {
        title: 'Test Immediate Reminder',
        description: 'Testing immediate reminder processing',
        startDateTime: eventStart,
        endDateTime: eventEnd,
        categoryId: 27, // Altro
        assignedTo: 2, // davide
        createdBy: 2,
        status: 'scheduled',
        color: '#00ff00',
      },
    });

    console.log(`✅ Event created: ID ${event.id}`);
    console.log(`   Starts at: ${eventStart.toISOString()}`);

    // Create a reminder that's already past due (scheduled 1 minute AGO)
    const scheduledAt = new Date();
    scheduledAt.setMinutes(scheduledAt.getMinutes() - 1);

    const reminder = await prisma.eventReminder.create({
      data: {
        eventId: event.id,
        reminderType: 'MINUTES_15',
        sendEmail: true,
        emailSent: false,
        sendBrowser: true,
        browserSent: false,
        scheduledAt,
      },
    });

    console.log(`✅ Reminder created: ID ${reminder.id}`);
    console.log(`   Scheduled at: ${scheduledAt.toISOString()} (already past)`);
    console.log(`   Current time: ${new Date().toISOString()}`);
    console.log('\n⏳ The reminder processor should pick this up within 60 seconds...');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testImmediateReminder();
