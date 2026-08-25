import { Router } from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser,
  updateUser,
  requestPasswordReset,
  resetPassword,
  sendEmailVerificationCode,
  verifyEmailCode
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { loginLimiter } from '../middleware/security';

const router = Router();

// Registration requires SUPER_ADMIN authentication
router.post('/register', authenticate, register);
router.post('/login', loginLimiter, login);
router.post('/password-reset/request', loginLimiter, requestPasswordReset);
router.post('/password-reset/confirm', loginLimiter, resetPassword);

// Protected routes (require authentication)
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);
router.put('/me', authenticate, updateUser);
router.post('/email-verification/send', authenticate, sendEmailVerificationCode);
router.post('/email-verification/verify', authenticate, verifyEmailCode);

export default router;
