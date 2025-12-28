# Reminder Processor

## Overview
The reminder processor is a background service that checks for due event reminders every minute and sends notifications via:
- Browser notifications (in the notification center)
- Email notifications

## Running the Processor

### Development
```bash
cd backend
npx tsx src/scripts/process-reminders.ts
```

### Production
```bash
cd backend
npm run process-reminders  # Add this script to package.json
```

Or use a process manager like PM2:
```bash
pm2 start "npx tsx src/scripts/process-reminders.ts" --name reminder-processor
```

## How It Works

1. The processor runs every 60 seconds
2. It queries the database for reminders where `scheduled_at <= NOW()`
3. For each due reminder:
   - If `sendBrowser = true` and not yet sent: creates a browser notification
   - If `sendEmail = true` and not yet sent: sends an email
4. Marks reminders as sent to avoid duplicates

## Important Notes

- The processor MUST be running for reminders to be sent
- Environment variables (especially `MAIL_PASSWORD`) must be loaded via dotenv
- The processor is separate from the main API server and must be started independently
- Browser notifications appear in the notification center
- Email notifications are sent to the user's email address

## Troubleshooting

### Emails not being sent
- Check that `MAIL_PASSWORD` is set in `.env`
- Verify the processor is loading dotenv (look for `[dotenv]` in logs)
- Check email service logs for SMTP errors

### Reminders not processing
- Ensure the processor is running (`ps aux | grep process-reminders`)
- Check the `event_reminders` table for due reminders
- Look for errors in processor logs

### Testing
Run the test scripts to verify functionality:
```bash
npx tsx src/scripts/test-email-simple.ts          # Test email only
npx tsx src/scripts/test-immediate-reminder.ts     # Create a reminder for immediate processing
npx tsx src/scripts/test-reminder-system.ts        # Full system test
```
