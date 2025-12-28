import prisma from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

async function testNewTemplate() {
  console.log('=== Test New Email Template ===\n');

  try {
    // Create an event that starts in 3 minutes
    const eventStart = new Date();
    eventStart.setMinutes(eventStart.getMinutes() + 3);

    const eventEnd = new Date(eventStart);
    eventEnd.setHours(eventEnd.getHours() + 1);

    const event = await prisma.event.create({
      data: {
        title: 'Test Nuovo Template Email',
        description: 'Testing nuovo template professionale bianco e nero',
        startDateTime: eventStart,
        endDateTime: eventEnd,
        categoryId: 27, // Altro
        assignedTo: 2, // davide
        createdBy: 2,
        status: 'scheduled',
        color: '#000000',
      },
    });

    console.log(`✅ Event created: ID ${event.id}`);
    console.log(`   Starts at: ${eventStart.toISOString()}`);

    // Create a reminder that's already past due (scheduled NOW)
    const scheduledAt = new Date();

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
    console.log(`   Scheduled at: ${scheduledAt.toISOString()} (NOW - will be processed immediately)`);
    console.log('\n📧 Email will be sent to marangonidavide05@gmail.com with new black & white template');
    console.log('⏳ Check your email in about 60 seconds...');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewTemplate();
