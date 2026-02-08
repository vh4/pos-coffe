import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Stats access restriction: Maybe Admin only? Or Kasir too?
// Usually Admin and maybe Manager. For now Admin.
router.use(authenticateToken, requireRole(['admin']));

router.get('/revenue', analyticsController.getRevenueStats);
router.get('/sales-count', analyticsController.getSalesCount);
router.get('/Best-selling', analyticsController.getBestSellingItems);
router.get('/stats', analyticsController.getDashboardStats);

export default router;
