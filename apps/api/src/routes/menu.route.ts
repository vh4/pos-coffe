import { Router } from 'express';
import * as menuController from '../controllers/menu.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createMenuSchema, updateMenuSchema } from '../validation/schemas';

const router = Router();

router.get('/', menuController.getAllMenu);
router.get('/:id', menuController.getMenuById);

router.post(
    '/',
    authenticateToken,
    requireRole(['admin']),
    validate(createMenuSchema),
    menuController.createMenu
);

router.put(
    '/:id',
    authenticateToken,
    requireRole(['admin']),
    validate(updateMenuSchema),
    menuController.updateMenu
);

router.delete(
    '/:id',
    authenticateToken,
    requireRole(['admin']),
    menuController.deleteMenu
);

export default router;
