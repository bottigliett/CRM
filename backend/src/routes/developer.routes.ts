import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getSystemStats,
  getRecentAccessLogs,
  getDatabaseInfo,
  getActivityHistory,
  cleanOldSessions,
  cleanOldAccessLogs,
  getModuleSettings,
  updateModuleSettings,
  getEnabledModules,
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

// GET /api/developer/activity-history - Storico attività ultimi 7 giorni
router.get('/activity-history', getActivityHistory);

// POST /api/developer/clean-sessions - Pulizia sessioni scadute
router.post('/clean-sessions', cleanOldSessions);

// POST /api/developer/clean-logs - Pulizia access logs vecchi
router.post('/clean-logs', cleanOldAccessLogs);

// GET /api/developer/modules - Get all module settings (DEVELOPER only)
router.get('/modules', getModuleSettings);

// GET /api/developer/modules/enabled - Get enabled modules (all authenticated)
router.get('/modules/enabled', getEnabledModules);

// PUT /api/developer/modules/:moduleName - Toggle module visibility (DEVELOPER only)
router.put('/modules/:moduleName', updateModuleSettings);

export default router;
