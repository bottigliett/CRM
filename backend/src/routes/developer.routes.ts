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
import {
  getPersonalClients,
  createPersonalClient,
  updatePersonalClient,
  deletePersonalClient,
  getPersonalInvoices,
  createPersonalInvoice,
  updatePersonalInvoice,
  deletePersonalInvoice,
  getComparison,
  getPersonalRecurringInvoices,
  createPersonalRecurringInvoice,
  updatePersonalRecurringInvoice,
  deletePersonalRecurringInvoice,
  generatePersonalRecurringInvoice,
} from '../controllers/personal-invoice.controller';

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

// --- Personal (Davide) — pagina segreta ---

// GET /api/developer/personal/comparison - Confronto fatturato Davide vs Stefano
router.get('/personal/comparison', getComparison);

// Personal clients
router.get('/personal/clients', getPersonalClients);
router.post('/personal/clients', createPersonalClient);
router.put('/personal/clients/:id', updatePersonalClient);
router.delete('/personal/clients/:id', deletePersonalClient);

// Personal invoices
router.get('/personal/invoices', getPersonalInvoices);
router.post('/personal/invoices', createPersonalInvoice);
router.put('/personal/invoices/:id', updatePersonalInvoice);
router.delete('/personal/invoices/:id', deletePersonalInvoice);

// Personal recurring invoices
router.get('/personal/recurring', getPersonalRecurringInvoices);
router.post('/personal/recurring', createPersonalRecurringInvoice);
router.put('/personal/recurring/:id', updatePersonalRecurringInvoice);
router.delete('/personal/recurring/:id', deletePersonalRecurringInvoice);
router.post('/personal/recurring/:id/generate', generatePersonalRecurringInvoice);

export default router;
