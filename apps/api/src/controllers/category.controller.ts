import { Request, Response } from 'express';
import { db } from '../db';
import { categories, menuItems } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { Logger } from '../config/logger';

export const getAllCategories = async (req: Request, res: Response) => {
    try {
        const result = await db
            .select({
                id: categories.id,
                name: categories.name,
                icon: categories.icon,
                description: categories.description,
                isActive: categories.isActive,
                createdAt: categories.createdAt,
                updatedAt: categories.updatedAt,
                itemCount: sql<number>`count(${menuItems.id})`.as('item_count'),
            })
            .from(categories)
            .leftJoin(menuItems, eq(categories.id, menuItems.categoryId))
            .groupBy(categories.id)
            .orderBy(categories.name);

        res.json(result);
    } catch (error) {
        Logger.error('Error fetching categories', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, icon, description } = req.body;

        const [newCategory] = await db
            .insert(categories)
            .values({
                name,
                icon,
                description,
            })
            .returning();

        res.status(201).json(newCategory);
    } catch (error) {
        Logger.error('Error creating category', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, icon, description, isActive } = req.body;

        const [updatedCategory] = await db
            .update(categories)
            .set({
                name,
                icon,
                description,
                isActive,
                updatedAt: new Date(),
            })
            .where(eq(categories.id, id))
            .returning();

        if (!updatedCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json(updatedCategory);
    } catch (error) {
        Logger.error('Error updating category', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if category has items
        const items = await db.select().from(menuItems).where(eq(menuItems.categoryId, id));

        if (items.length > 0) {
            return res.status(400).json({ message: 'Cannot delete category with associated menu items' });
        }

        const [deletedCategory] = await db
            .delete(categories)
            .where(eq(categories.id, id))
            .returning();

        if (!deletedCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        Logger.error('Error deleting category', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const toggleStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const [updatedCategory] = await db
            .update(categories)
            .set({
                isActive: !category.isActive,
                updatedAt: new Date(),
            })
            .where(eq(categories.id, id))
            .returning();

        res.json(updatedCategory);
    } catch (error) {
        Logger.error('Error toggling category status', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
