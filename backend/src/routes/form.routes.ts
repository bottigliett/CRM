import { Router } from 'express';
import {
  getForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
  getPublicForm,
  submitPublicForm,
  getSubmissions,
  assignSubmission,
  markSubmissionRead,
  deleteSubmission,
} from '../controllers/form.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public endpoints (no auth) — filling a form
router.get('/public/:slug', getPublicForm);
router.post('/public/:slug/submit', submitPublicForm);

// Admin endpoints (auth)
router.get('/', authenticate, getForms);
router.post('/', authenticate, createForm);
router.get('/submissions', authenticate, getSubmissions); // all submissions
router.get('/:id', authenticate, getForm);
router.put('/:id', authenticate, updateForm);
router.delete('/:id', authenticate, deleteForm);
router.get('/:id/submissions', authenticate, getSubmissions); // per-form submissions

// Submissions actions
router.patch('/submissions/:id/assign', authenticate, assignSubmission);
router.patch('/submissions/:id/read', authenticate, markSubmissionRead);
router.delete('/submissions/:id', authenticate, deleteSubmission);

export default router;
