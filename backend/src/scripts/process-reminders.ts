import dotenv from 'dotenv';

// IMPORTANT: Load environment variables BEFORE importing services
dotenv.config();

import { processDueReminders } from '../services/reminder.service';

// Process reminders every minute
const INTERVAL_MS = 60 * 1000; // 1 minute

console.log('Starting reminder processor...');
console.log(`Processing interval: ${INTERVAL_MS / 1000} seconds`);

// Process immediately on start
processDueReminders()
  .then((count) => {
    console.log(`Initial processing: ${count} reminders processed`);
  })
  .catch((error) => {
    console.error('Error in initial processing:', error);
  });

// Then process every minute
setInterval(async () => {
  try {
    const count = await processDueReminders();
    if (count > 0) {
      console.log(`[${new Date().toISOString()}] Processed ${count} reminders`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing reminders:`, error);
  }
}, INTERVAL_MS);

console.log('Reminder processor is running... Press Ctrl+C to stop.');
