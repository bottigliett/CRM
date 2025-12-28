import express from 'express';
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  duplicateInvoice,
  getNextInvoiceNumber,
  generateInvoicePDF,
  reserveTaxes,
} from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/invoices - Get all invoices with filters
router.get('/', getInvoices);

// GET /api/invoices/next-number - Get next invoice number
router.get('/next-number', getNextInvoiceNumber);

// GET /api/invoices/:id/pdf - Generate PDF data
router.get('/:id/pdf', generateInvoicePDF);

// GET /api/invoices/:id - Get single invoice
router.get('/:id', getInvoice);

// POST /api/invoices - Create new invoice
router.post('/', createInvoice);

// PUT /api/invoices/:id - Update invoice
router.put('/:id', updateInvoice);

// DELETE /api/invoices/:id - Delete invoice (only drafts)
router.delete('/:id', deleteInvoice);

// POST /api/invoices/:id/duplicate - Duplicate invoice
router.post('/:id/duplicate', duplicateInvoice);

// POST /api/invoices/:id/reserve-taxes - Reserve taxes for paid invoice
router.post('/:id/reserve-taxes', reserveTaxes);

export default router;
