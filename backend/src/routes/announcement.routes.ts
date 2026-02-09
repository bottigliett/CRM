import express from 'express';
import {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getClientActiveAnnouncements,
} from '../controllers/announcement.controller';
import { authenticate } from '../middleware/auth';
import { authenticateClient } from '../middleware/client-auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET active announcements (for current user based on role)
router.get('/active', getActiveAnnouncements);

// GET all announcements (admin/developer only)
router.get('/', getAllAnnouncements);

// POST create announcement (admin/developer only)
router.post('/', createAnnouncement);

// PUT update announcement (admin/developer only)
router.put('/:id', updateAnnouncement);

// DELETE announcement (admin/developer only)
router.delete('/:id', deleteAnnouncement);

// Client router
export const clientAnnouncementRouter = express.Router();
clientAnnouncementRouter.use(authenticateClient);
clientAnnouncementRouter.get('/active', getClientActiveAnnouncements);

export default router;
