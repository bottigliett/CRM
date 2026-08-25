import express from 'express';
import {
  verifyActivationToken,
  sendVerificationCode,
  verifyCode,
  completeActivation,
  verifyUsername,
  verifyActivationCode,
  completeManualActivation,
  clientLogin,
  getClientMe,
  changePassword,
} from '../controllers/client-auth.controller';
import { authenticateClient } from '../middleware/client-auth';
import { debugLogger } from '../middleware/debug-logger';
import { loginLimiter } from '../middleware/security';

const router = express.Router();

// Enable debug logging for all client-auth routes (only in development, passwords redacted)
router.use(debugLogger);

/**
 * PUBLIC ROUTES - Attivazione e Login
 */

// TOKEN FLOW - Attivazione con email
// Step 1: Verifica token attivazione
router.post('/verify-token', verifyActivationToken);

// Step 2: Invia codice verifica email
router.post('/send-verification-code', sendVerificationCode);

// Step 2.5: Verifica codice email
router.post('/verify-code', loginLimiter, verifyCode);

// Step 3: Completa attivazione con password
router.post('/complete-activation', completeActivation);

// MANUAL FLOW - Attivazione manuale con username e codice
// Step 1: Verifica username esiste
router.post('/verify-username', verifyUsername);

// Step 2: Verifica codice di attivazione
router.post('/verify-activation-code', verifyActivationCode);

// Step 3: Completa attivazione manuale
router.post('/complete-manual-activation', completeManualActivation);

// Login cliente
router.post('/login', loginLimiter, clientLogin);

/**
 * PROTECTED ROUTES - Richiedono autenticazione CLIENT
 */

// Get dati cliente autenticato
router.get('/me', authenticateClient, getClientMe);

// Cambio password
router.post('/change-password', authenticateClient, changePassword);

export default router;
