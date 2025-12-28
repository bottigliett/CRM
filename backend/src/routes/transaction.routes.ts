import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller';
import * as categoryController from '../controllers/transaction-category.controller';
import * as paymentMethodController from '../controllers/payment-method.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Transaction routes
router.get('/', transactionController.getTransactions);
router.get('/stats/summary', transactionController.getTransactionStats);
router.get('/:id', transactionController.getTransactionById);
router.post('/', transactionController.createTransaction);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

// Transaction category routes
router.get('/categories/all', categoryController.getTransactionCategories);
router.get('/categories/:id', categoryController.getTransactionCategoryById);
router.post('/categories', categoryController.createTransactionCategory);
router.put('/categories/:id', categoryController.updateTransactionCategory);
router.delete('/categories/:id', categoryController.deleteTransactionCategory);

export default router;
