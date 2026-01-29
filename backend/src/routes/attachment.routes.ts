import express from 'express';
import {
  uploadAttachments,
  downloadAttachment,
  downloadClientAttachment,
  deleteAttachment
} from '../controllers/attachment.controller';
import { authenticate } from '../middleware/auth';
import { authenticateClient } from '../middleware/client-auth';
import { uploadTicketAttachments } from '../utils/file-upload';

const router = express.Router();

/**
 * ADMIN ROUTES
 */
// Upload attachments to ticket (supports multiple files)
router.post(
  '/tickets/:id/attachments',
  authenticate,
  uploadTicketAttachments.array('files', 10), // Max 10 files
  uploadAttachments
);

// Download attachment
router.get(
  '/tickets/attachments/:id',
  authenticate,
  downloadAttachment
);

// Delete attachment
router.delete(
  '/tickets/attachments/:id',
  authenticate,
  deleteAttachment
);

/**
 * CLIENT ROUTES
 */
export const clientAttachmentRouter = express.Router();

// Upload attachments (client)
clientAttachmentRouter.post(
  '/tickets/:id/attachments',
  authenticateClient,
  uploadTicketAttachments.array('files', 10),
  uploadAttachments
);

// Download attachment (client)
clientAttachmentRouter.get(
  '/tickets/attachments/:id',
  authenticateClient,
  downloadClientAttachment
);

export default router;
