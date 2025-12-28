import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/event.controller';
import {
  getEventCategories,
  getEventCategoryById,
  createEventCategory,
  updateEventCategory,
  deleteEventCategory,
} from '../controllers/event-category.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Event routes
router.get('/', getEvents);
router.get('/:id', getEventById);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

// Event category routes
router.get('/categories/all', getEventCategories);
router.get('/categories/:id', getEventCategoryById);
router.post('/categories', createEventCategory);
router.put('/categories/:id', updateEventCategory);
router.delete('/categories/:id', deleteEventCategory);

export default router;
