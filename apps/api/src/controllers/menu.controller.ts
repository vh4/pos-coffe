import { Request, Response } from 'express';
import { db } from '../db';
import { menuItems, categories } from '../db/schema';
import { eq, like, and } from 'drizzle-orm';
import { Logger } from '../config/logger';

export const getAllMenu = async (req: Request, res: Response) => {
    try {
        const { categoryId, search, available } = req.query;

        let conditions = [];

        if (categoryId) {
            conditions.push(eq(menuItems.categoryId, categoryId as string));
        }

        if (search) {
            conditions.push(like(menuItems.name, `%${search}%`));
        }

        if (available === 'true') {
            conditions.push(eq(menuItems.isAvailable, true));
        }

        const query = db.select({
            id: menuItems.id,
            name: menuItems.name,
            description: menuItems.description,
            price: menuItems.price,
            image: menuItems.image,
            isAvailable: menuItems.isAvailable,
            categoryId: menuItems.categoryId,
            categoryName: categories.name,
        })
            .from(menuItems)
            .leftJoin(categories, eq(menuItems.categoryId, categories.id));

        if (conditions.length > 0) {
            // @ts-ignore
            await query.where(and(...conditions));
        }

        const result = await query;
        res.json(result);
    } catch (error) {
        Logger.error('Error fetching menu items', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getMenuById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const [item] = await db
            .select({
                id: menuItems.id,
                name: menuItems.name,
                description: menuItems.description,
                price: menuItems.price,
                image: menuItems.image,
                isAvailable: menuItems.isAvailable,
                categoryId: menuItems.categoryId,
                categoryName: categories.name,
            })
            .from(menuItems)
            .leftJoin(categories, eq(menuItems.categoryId, categories.id))
            .where(eq(menuItems.id, id))
            .limit(1);

        if (!item) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        res.json(item);
    } catch (error) {
        Logger.error('Error fetching menu item', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const createMenu = async (req: Request, res: Response) => {
    try {
        const { name, description, price, image, categoryId, isAvailable } = req.body;

        const [newItem] = await db
            .insert(menuItems)
            .values({
                name,
                description,
                price,
                image,
                categoryId,
                isAvailable: isAvailable ?? true,
            })
            .returning();

        res.status(201).json(newItem);
    } catch (error) {
        Logger.error('Error creating menu item', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateMenu = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, price, image, categoryId, isAvailable } = req.body;

        const [updatedItem] = await db
            .update(menuItems)
            .set({
                name,
                description,
                price,
                image,
                categoryId,
                isAvailable,
                updatedAt: new Date(),
            })
            .where(eq(menuItems.id, id))
            .returning();

        if (!updatedItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        res.json(updatedItem);
    } catch (error) {
        Logger.error('Error updating menu item', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteMenu = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const [deletedItem] = await db
            .delete(menuItems)
            .where(eq(menuItems.id, id))
            .returning();

        if (!deletedItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        Logger.error('Error deleting menu item', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
