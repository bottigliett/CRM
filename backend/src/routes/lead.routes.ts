import express from 'express';
import {
  getLeads,
  moveLead,
  getFunnelStages,
  createFunnelStage,
  createQuickLead,
  updateLead,
  deleteLead,
} from '../controllers/lead.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Lead routes
router.get('/', getLeads);
router.post('/quick', createQuickLead);
router.put('/:id/move', moveLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

// Funnel stage routes
router.get('/stages', getFunnelStages);
router.post('/stages', createFunnelStage);

export default router;
