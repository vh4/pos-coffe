import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createTransactionSchema } from '../validation/schemas';

const router = Router();

router.post(
    '/',
    authenticateToken,
    requireRole(['admin', 'kasir']),
    validate(createTransactionSchema),
    transactionController.createTransaction
);

router.post('/midtrans/callback', transactionController.midtransCallback);
router.get('/', authenticateToken, requireRole(['admin', 'kasir']), transactionController.getAllTransactions);
router.get('/:id', authenticateToken, requireRole(['admin', 'kasir']), transactionController.getTransactionById);
router.get('/:orderId/status', authenticateToken, requireRole(['admin', 'kasir']), transactionController.checkTransactionStatus);

export default router;
