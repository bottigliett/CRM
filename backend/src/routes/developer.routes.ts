import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getSystemStats,
  getRecentAccessLogs,
  getDatabaseInfo,
  cleanOldSessions,
  cleanOldAccessLogs,
} from '../controllers/developer.controller';

const router = Router();

// Tutte le rotte richiedono autenticazione (il controller verifica il ruolo DEVELOPER)
router.use(authenticate);

// GET /api/developer/stats - Statistiche sistema
router.get('/stats', getSystemStats);

// GET /api/developer/access-logs - Ultimi access logs
router.get('/access-logs', getRecentAccessLogs);

// GET /api/developer/database - Info database
router.get('/database', getDatabaseInfo);

// POST /api/developer/clean-sessions - Pulizia sessioni scadute
router.post('/clean-sessions', cleanOldSessions);

// POST /api/developer/clean-logs - Pulizia access logs vecchi
router.post('/clean-logs', cleanOldAccessLogs);

export default router;
