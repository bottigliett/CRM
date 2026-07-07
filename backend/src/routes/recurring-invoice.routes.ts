import express from 'express';
import {
  getRecurringInvoices,
  getRecurringInvoice,
  createRecurringInvoice,
  updateRecurringInvoice,
  deleteRecurringInvoice,
  generateMonthlyInvoices,
  getGenerationStatus,
} from '../controllers/recurring-invoice.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/recurring-invoices - Get all recurring invoice templates
router.get('/', getRecurringInvoices);

// GET /api/recurring-invoices/generation-status?month=X&year=Y
router.get('/generation-status', getGenerationStatus);

// GET /api/recurring-invoices/:id - Get single recurring invoice
router.get('/:id', getRecurringInvoice);

// POST /api/recurring-invoices - Create new recurring invoice template
router.post('/', createRecurringInvoice);

// POST /api/recurring-invoices/generate - Generate monthly invoices
router.post('/generate', generateMonthlyInvoices);

// PUT /api/recurring-invoices/:id - Update recurring invoice template
router.put('/:id', updateRecurringInvoice);

// DELETE /api/recurring-invoices/:id - Soft delete (deactivate)
router.delete('/:id', deleteRecurringInvoice);

export default router;
