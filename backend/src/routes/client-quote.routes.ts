import express from 'express';
import { getClientQuote, acceptClientQuote, rejectClientQuote } from '../controllers/client-quote.controller';
import { authenticateClient } from '../middleware/client-auth';

const router = express.Router();

// All routes require client authentication
router.get('/', authenticateClient, getClientQuote);
router.put('/accept', authenticateClient, acceptClientQuote);
router.put('/reject', authenticateClient, rejectClientQuote);

export default router;
