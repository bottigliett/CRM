import prisma from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

async function testEventWithReminder() {
  console.log('=== Test Event Creation with Reminder ===\n');

  try {
    // 1. Check current state
    const eventsCount = await prisma.event.count();
    const remindersCount = await prisma.eventReminder.count();
    console.log(`📊 Current state:`);
    console.log(`   Events: ${eventsCount}`);
    console.log(`   Reminders: ${remindersCount}\n`);

    // 2. Create a test event with all reminder parameters
    console.log('🆕 Creating test event...');
    const eventStart = new Date();
    eventStart.setMinutes(eventStart.getMinutes() + 20); // Event in 20 minutes

    const eventEnd = new Date(eventStart);
    eventEnd.setHours(eventEnd.getHours() + 1);

    // Simulating what the API would receive
    const eventData = {
      title: 'Test Event with Reminder',
      description: 'Testing reminder creation',
      startDateTime: eventStart.toISOString(),
      endDateTime: eventEnd.toISOString(),
      categoryId: 27, // Using existing "Altro" category
      assignedTo: 2, // davide
      createdBy: 2, // davide
      status: 'scheduled' as const,
      color: '#ff0000',
      reminderEnabled: true,
      reminderType: 'MINUTES_15' as const,
      reminderEmail: true,
    };

    console.log('📋 Event data:', JSON.stringify(eventData, null, 2));

    // Create the event directly in the database first
    const event = await prisma.event.create({
      data: {
        title: eventData.title,
        description: eventData.description,
        startDateTime: new Date(eventData.startDateTime),
        endDateTime: new Date(eventData.endDateTime),
        categoryId: eventData.categoryId,
        assignedTo: eventData.assignedTo,
        createdBy: eventData.createdBy,
        status: eventData.status,
        color: eventData.color,
      },
    });

    console.log(`✅ Event created: ID ${event.id}\n`);

    // 3. Manually create reminder (testing the logic that should happen in the controller)
    if (eventData.reminderEnabled && eventData.assignedTo) {
      console.log('🔔 Creating reminder...');
      const eventStartTime = new Date(eventData.startDateTime);
      let scheduledAt = new Date(eventStartTime);

      // Calculate scheduled time based on reminder type
      switch (eventData.reminderType) {
        case 'MINUTES_15':
          scheduledAt.setMinutes(scheduledAt.getMinutes() - 15);
          break;
        case 'MINUTES_30':
          scheduledAt.setMinutes(scheduledAt.getMinutes() - 30);
          break;
        case 'HOUR_1':
          scheduledAt.setHours(scheduledAt.getHours() - 1);
          break;
        case 'DAY_1':
          scheduledAt.setDate(scheduledAt.getDate() - 1);
          break;
      }

      console.log(`   Event starts at: ${eventStartTime.toISOString()}`);
      console.log(`   Reminder scheduled at: ${scheduledAt.toISOString()}`);
      console.log(`   Reminder type: ${eventData.reminderType}`);
      console.log(`   Send email: ${eventData.reminderEmail}`);

      const reminder = await prisma.eventReminder.create({
        data: {
          eventId: event.id,
          reminderType: eventData.reminderType,
          sendEmail: eventData.reminderEmail,
          emailSent: false,
          sendBrowser: true,
          browserSent: false,
          scheduledAt,
        },
      });

      console.log(`✅ Reminder created: ID ${reminder.id}\n`);
    }

    // 4. Verify creation
    const finalRemindersCount = await prisma.eventReminder.count();
    console.log(`📊 Final state:`);
    console.log(`   Reminders: ${finalRemindersCount}`);
    console.log(`   New reminders created: ${finalRemindersCount - remindersCount}\n`);

    // 5. Show the reminder details
    const createdReminder = await prisma.eventReminder.findFirst({
      where: { eventId: event.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDateTime: true,
            assignedTo: true,
          },
        },
      },
    });

    if (createdReminder) {
      console.log('📋 Reminder details:');
      console.log(JSON.stringify(createdReminder, null, 2));
    } else {
      console.log('❌ No reminder found for the created event!');
    }

    console.log('\n=== Test Complete ===');
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEventWithReminder();
