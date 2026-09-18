import dotenv from 'dotenv';

// IMPORTANT: Load environment variables BEFORE importing services
dotenv.config();

import { processDueReminders, processDueTasks } from '../services/reminder.service';

// Process reminders every minute
const INTERVAL_MS = 60 * 1000; // 1 minute

console.log('Starting reminder processor...');
console.log(`Processing interval: ${INTERVAL_MS / 1000} seconds`);

async function run() {
  try {
    const reminders = await processDueReminders();
    if (reminders > 0) {
      console.log(`[${new Date().toISOString()}] Processed ${reminders} reminders`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing reminders:`, error);
  }

  try {
    const tasks = await processDueTasks();
    if (tasks > 0) {
      console.log(`[${new Date().toISOString()}] Processed ${tasks} task due/overdue emails`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing tasks:`, error);
  }
}

// Process immediately on start
run();

// Then process every minute
setInterval(run, INTERVAL_MS);

console.log('Reminder processor is running... Press Ctrl+C to stop.');
