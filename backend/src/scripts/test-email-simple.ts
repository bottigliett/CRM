import { sendEmail } from '../services/email.service';
import dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
  console.log('=== Test Email System ===\n');

  console.log('📧 Email Configuration:');
  console.log(`   MAIL_USER: ${process.env.MAIL_USER || 'NOT SET'}`);
  console.log(`   MAIL_PASSWORD: ${process.env.MAIL_PASSWORD ? '***SET***' : 'NOT SET'}`);
  console.log('');

  console.log('📬 Sending test email to marangonidavide05@gmail.com...');

  try {
    await sendEmail(
      'marangonidavide05@gmail.com',
      'Test Email - Reminder System',
      `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #3b82f6;">Test Email Reminder System</h1>
          <p>This is a test email from the reminder system.</p>
          <p>If you receive this, the email configuration is working correctly.</p>
          <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
          <hr />
          <p style="color: #666; font-size: 12px;">Studio Mismo CRM - Test Email</p>
        </body>
      </html>
      `,
      `Test Email - Reminder System\n\nThis is a test email from the reminder system.\nIf you receive this, the email configuration is working correctly.\n\nSent at: ${new Date().toISOString()}\n\nStudio Mismo CRM - Test Email`
    );
    console.log('✅ Test email sent successfully!');
    console.log('📧 Check your inbox at marangonidavide05@gmail.com');
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
  }
}

testEmail();
