import { Router } from 'express';
import * as orderController from '../controllers/order.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createOrderSchema, updateOrderStatusSchema } from '../validation/schemas';

const router = Router();

router.post(
    '/',
    authenticateToken,
    requireRole(['admin', 'kasir']),
    validate(createOrderSchema),
    orderController.createOrder
);

router.get(
    '/',
    authenticateToken,
    requireRole(['admin', 'kasir']),
    orderController.getAllOrders
);

router.get(
    '/kitchen',
    authenticateToken,
    requireRole(['admin', 'chef']),
    orderController.getKitchenOrders
);

router.get(
    '/:id',
    authenticateToken,
    orderController.getOrderById
);

router.patch(
    '/:id/status',
    authenticateToken,
    requireRole(['admin', 'chef', 'kasir']),
    validate(updateOrderStatusSchema),
    orderController.updateOrderStatus
);

export default router;
