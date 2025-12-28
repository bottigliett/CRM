import { Router } from 'express';
import {
  getAllUsers,
  createUser,
  updateUserById,
  deleteUser,
  getAvailableModules,
  getAdminUsers,
  getCalendarPreferences,
  updateCalendarPreferences,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Calendar preferences routes (MUST be before /users/:id to avoid conflicts)
router.get('/users/calendar-preferences', getCalendarPreferences);
router.put('/users/calendar-preferences', updateCalendarPreferences);

// User management routes (SUPER_ADMIN only)
router.get('/users', getAllUsers);
router.get('/users/admins', getAdminUsers); // Get admin users for event assignment
router.post('/users', createUser);
router.put('/users/:id', updateUserById);
router.delete('/users/:id', deleteUser);

// Get available modules for permission assignment
router.get('/modules', getAvailableModules);

export default router;
