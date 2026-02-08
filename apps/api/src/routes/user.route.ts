import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { registerSchema } from '../validation/schemas';
import { z } from 'zod';

const router = Router();

// Only admin can manage users
router.use(authenticateToken, requireRole(['admin']));

router.get('/', userController.getAllUsers);

router.post(
    '/',
    validate(registerSchema),
    userController.createUser
);

const updateUserSchema = z.object({
    body: z.object({
        fullName: z.string().min(3).optional(),
        role: z.enum(['admin', 'kasir', 'chef']).optional(),
        isActive: z.boolean().optional(),
        password: z.string().min(6).optional(),
    }),
});

router.put(
    '/:id',
    validate(updateUserSchema),
    userController.updateUser
);

router.delete('/:id', userController.deleteUser);

export default router;
