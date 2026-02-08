import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createCategorySchema, updateCategorySchema } from '../validation/schemas';

const router = Router();

router.get('/', categoryController.getAllCategories);

router.post(
    '/',
    authenticateToken,
    requireRole(['admin']),
    validate(createCategorySchema),
    categoryController.createCategory
);

router.put(
    '/:id',
    authenticateToken,
    requireRole(['admin']),
    validate(updateCategorySchema),
    categoryController.updateCategory
);

router.delete(
    '/:id',
    authenticateToken,
    requireRole(['admin']),
    categoryController.deleteCategory
);

router.patch(
    '/:id/status',
    authenticateToken,
    requireRole(['admin']),
    categoryController.toggleStatus
);

export default router;
