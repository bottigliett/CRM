import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getPaymentEntities,
  getPaymentEntity,
  createPaymentEntity,
  updatePaymentEntity,
  deletePaymentEntity,
  setDefaultPaymentEntity,
} from '../controllers/payment-entity.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all payment entities (all authenticated users can view)
router.get('/', getPaymentEntities);

// Get single payment entity
router.get('/:id', getPaymentEntity);

// DEVELOPER only routes for management (role check is done in controller)
router.post('/', createPaymentEntity);
router.put('/:id', updatePaymentEntity);
router.delete('/:id', deletePaymentEntity);
router.post('/:id/set-default', setDefaultPaymentEntity);

export default router;
