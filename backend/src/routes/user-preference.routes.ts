import { Router } from 'express';
import { getUserPreferences, saveUserPreferences } from '../controllers/user-preference.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user preferences for a specific page
router.get('/:pageName', getUserPreferences);

// Save/update user preferences for a specific page
router.put('/:pageName', saveUserPreferences);

export default router;
