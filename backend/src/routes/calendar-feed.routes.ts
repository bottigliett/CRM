import { Router } from 'express';
import {
  getCalendarFeed,
  getCalendarSyncInfo,
  regenerateCalendarToken,
} from '../controllers/calendar-feed.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public ICS feed (authenticated via token in the query string)
router.get('/feed.ics', getCalendarFeed);

// Token management (authenticated users only)
router.get('/sync-token', authenticate, getCalendarSyncInfo);
router.post('/sync-token/regenerate', authenticate, regenerateCalendarToken);

export default router;
