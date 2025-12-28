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

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/password-reset/request', requestPasswordReset);
router.post('/password-reset/confirm', resetPassword);

// Protected routes (require authentication)
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);
router.put('/me', authenticate, updateUser);
router.post('/email-verification/send', authenticate, sendEmailVerificationCode);
router.post('/email-verification/verify', authenticate, verifyEmailCode);

export default router;
