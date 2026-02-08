import { Request, Response } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, ne } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { Logger } from '../config/logger';

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const result = await db
            .select({
                id: users.id,
                email: users.email,
                fullName: users.fullName,
                role: users.role,
                isActive: users.isActive,
                createdAt: users.createdAt,
            })
            .from(users)
            .orderBy(users.createdAt);

        res.json(result);
    } catch (error) {
        Logger.error('Error fetching users', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const { email, password, fullName, role } = req.body;

        // Check if user exists
        const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [newUser] = await db
            .insert(users)
            .values({
                email,
                password: hashedPassword,
                fullName,
                role: role || 'kasir',
            })
            .returning({
                id: users.id,
                email: users.email,
                fullName: users.fullName,
                role: users.role,
                isActive: users.isActive,
                createdAt: users.createdAt,
            });

        res.status(201).json(newUser);
    } catch (error) {
        Logger.error('Error creating user', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { fullName, role, isActive, password } = req.body;

        const updateData: any = {
            fullName,
            role,
            isActive,
            updatedAt: new Date(),
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const [updatedUser] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, id))
            .returning({
                id: users.id,
                email: users.email,
                fullName: users.fullName,
                role: users.role,
                isActive: users.isActive,
                updatedAt: users.updatedAt,
            });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(updatedUser);
    } catch (error) {
        Logger.error('Error updating user', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Prevent deleting self
        if (req.user?.userId === id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        const [deletedUser] = await db
            .delete(users)
            .where(eq(users.id, id))
            .returning();

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        Logger.error('Error deleting user', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
