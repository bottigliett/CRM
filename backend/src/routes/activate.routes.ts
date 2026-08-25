import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  verifyUsername,
  sendActivationCode,
  verifyActivationCode,
  completeManualActivation,
  clientLogin,
} from '../controllers/client-auth.controller';

const router = express.Router();

const activateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Troppi tentativi, riprova tra 15 minuti' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * ACTIVATION ROUTES - NO AUTHENTICATION REQUIRED
 * These routes are completely public for client activation process
 */

// Step 1: Verify username exists and is not activated
router.post('/verify-username', verifyUsername);

// Step 2a: Send activation code via email
router.post('/send-code', sendActivationCode);

// Step 2b: Verify activation code
router.post('/verify-code', activateLimiter, verifyActivationCode);

// Step 3: Complete activation with password
router.post('/complete', activateLimiter, completeManualActivation);

// Client login (after activation)
router.post('/login', activateLimiter, clientLogin);

export default router;
