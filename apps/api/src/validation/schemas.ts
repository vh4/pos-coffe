import { z } from 'zod';

// Auth Schemas
export const loginSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(6),
    }),
});

export const registerSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string().min(3),
        role: z.enum(['admin', 'kasir', 'chef']),
    }),
});

// Category Schemas
export const createCategorySchema = z.object({
    body: z.object({
        name: z.string().min(3),
        icon: z.string(),
        description: z.string().optional(),
    }),
});

export const updateCategorySchema = z.object({
    body: z.object({
        name: z.string().min(3).optional(),
        icon: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
    }),
});

// Menu Item Schemas
export const createMenuSchema = z.object({
    body: z.object({
        name: z.string().min(3),
        description: z.string().optional(),
        price: z.number().positive(),
        image: z.string().url(),
        categoryId: z.string().uuid(),
        isAvailable: z.boolean().default(true),
    }),
});

export const updateMenuSchema = z.object({
    body: z.object({
        name: z.string().min(3).optional(),
        description: z.string().optional(),
        price: z.number().positive().optional(),
        image: z.string().url().optional(),
        categoryId: z.string().uuid().optional(),
        isAvailable: z.boolean().optional(),
    }),
});

// Order Schemas
export const createOrderSchema = z.object({
    body: z.object({
        customerName: z.string().optional(),
        tableNumber: z.string().optional(),
        items: z.array(
            z.object({
                menuItemId: z.string().uuid(),
                quantity: z.number().int().positive(),
                notes: z.string().optional(),
            })
        ).min(1),
    }),
});

export const updateOrderStatusSchema = z.object({
    body: z.object({
        status: z.enum(['pending', 'preparing', 'ready', 'completed', 'cancelled']),
    }),
});

// Transaction Schemas
export const createTransactionSchema = z.object({
    body: z.object({
        orderId: z.string().uuid(),
        amount: z.number().positive(), // Should match order total
        paymentMethod: z.enum(['qris', 'gopay', 'ovo', 'va', 'cash']),
        bankName: z.enum(['bca', 'bni', 'mandiri']).optional(), // Required for VA
    }),
});
