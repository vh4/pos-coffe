import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Protect settings routes - only admin can access
router.get('/', authenticateToken, requireRole(['admin']), settingsController.getSettings);
router.put('/', authenticateToken, requireRole(['admin']), settingsController.updateSettings);

export default router;
