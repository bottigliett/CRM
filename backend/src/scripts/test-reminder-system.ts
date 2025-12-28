import prisma from '../config/database';
import { sendEmail } from '../services/email.service';
import { processDueReminders } from '../services/reminder.service';
import dotenv from 'dotenv';

dotenv.config();

async function testReminderSystem() {
  console.log('=== Test Reminder System ===\n');

  try {
    // 1. Check if we have any events
    const eventsCount = await prisma.event.count();
    console.log(`📅 Total events in database: ${eventsCount}`);

    // 2. Check if we have any reminders
    const remindersCount = await prisma.eventReminder.count();
    console.log(`🔔 Total reminders in database: ${remindersCount}`);

    // 3. List recent reminders
    const recentReminders = await prisma.eventReminder.findMany({
      take: 5,
      orderBy: { id: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDateTime: true,
          },
        },
      },
    });

    console.log('\n📋 Recent reminders:');
    if (recentReminders.length === 0) {
      console.log('  No reminders found');
    } else {
      recentReminders.forEach((r) => {
        console.log(`  - ID: ${r.id}, Event: "${r.event.title}", Type: ${r.reminderType}`);
        console.log(`    Scheduled: ${r.scheduledAt.toISOString()}`);
        console.log(`    Email sent: ${r.emailSent}, Browser sent: ${r.browserSent}`);
      });
    }

    // 4. Test email sending
    console.log('\n📧 Testing email configuration...');
    const testEmail = process.env.MAIL_USER || 'noreply@studiomismo.it';
    console.log(`   MAIL_USER: ${process.env.MAIL_USER || 'NOT SET'}`);
    console.log(`   MAIL_PASSWORD: ${process.env.MAIL_PASSWORD ? '***' : 'NOT SET'}`);

    // 5. Create a test event with reminder
    console.log('\n🆕 Creating test event with reminder...');
    const testEventStart = new Date();
    testEventStart.setMinutes(testEventStart.getMinutes() + 2); // Event in 2 minutes

    const testEvent = await prisma.event.create({
      data: {
        title: 'Test Reminder Event',
        description: 'This is a test event to verify reminders work',
        startDateTime: testEventStart,
        endDateTime: new Date(testEventStart.getTime() + 60 * 60 * 1000),
        categoryId: 1,
        createdBy: 1,
        assignedTo: 1,
        status: 'scheduled',
        color: '#ff0000',
      },
    });

    console.log(`✅ Test event created: ID ${testEvent.id}`);

    // Create reminder for this event (1 minute before)
    const reminderTime = new Date(testEventStart);
    reminderTime.setMinutes(reminderTime.getMinutes() - 1);

    const testReminder = await prisma.eventReminder.create({
      data: {
        eventId: testEvent.id,
        reminderType: 'MINUTES_15',
        sendEmail: true,
        sendBrowser: true,
        scheduledAt: reminderTime,
      },
    });

    console.log(`✅ Test reminder created: ID ${testReminder.id}`);
    console.log(`   Scheduled at: ${reminderTime.toISOString()}`);
    console.log(`   Event starts at: ${testEventStart.toISOString()}`);

    // 6. Process reminders immediately
    console.log('\n🔄 Processing due reminders...');
    const processedCount = await processDueReminders();
    console.log(`✅ Processed ${processedCount} reminders`);

    // 7. Send a test email
    console.log('\n📬 Sending test email...');
    try {
      await sendEmail(
        'marangonidavide05@gmail.com',
        'Test Email - Reminder System',
        `
        <html>
          <body>
            <h1>Test Email</h1>
            <p>This is a test email from the reminder system.</p>
            <p>If you receive this, the email configuration is working correctly.</p>
            <p>Sent at: ${new Date().toISOString()}</p>
          </body>
        </html>
        `,
        `Test Email\n\nThis is a test email from the reminder system.\nIf you receive this, the email configuration is working correctly.\n\nSent at: ${new Date().toISOString()}`
      );
      console.log('✅ Test email sent successfully!');
    } catch (emailError) {
      console.error('❌ Failed to send test email:', emailError);
    }

    console.log('\n=== Test Complete ===');
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testReminderSystem();
