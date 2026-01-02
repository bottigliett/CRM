import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  completeProject,
  deleteProject,
} from '../controllers/project.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Project routes
router.get('/projects', getProjects);
router.get('/projects/:id', getProjectById);
router.post('/projects', createProject);
router.put('/projects/:id', updateProject);
router.post('/projects/:id/complete', completeProject);
router.delete('/projects/:id', deleteProject);

export default router;
