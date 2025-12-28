import { Router } from 'express';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  archiveTask,
  getTaskCategories,
  createTaskCategory,
  updateTaskCategory,
  deleteTaskCategory,
} from '../controllers/task.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Task routes
router.get('/tasks', getTasks);
router.get('/tasks/:id', getTaskById);
router.post('/tasks', createTask);
router.put('/tasks/:id', updateTask);
router.delete('/tasks/:id', deleteTask);
router.post('/tasks/:id/archive', archiveTask);

// Task category routes
router.get('/tasks/categories/all', getTaskCategories);
router.post('/tasks/categories', createTaskCategory);
router.put('/tasks/categories/:id', updateTaskCategory);
router.delete('/tasks/categories/:id', deleteTaskCategory);

export default router;
