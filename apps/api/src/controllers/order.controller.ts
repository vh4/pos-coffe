import { Request, Response } from 'express';
import { db } from '../db';
import { orders, orderItems, menuItems, users } from '../db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { Logger } from '../config/logger';

export const createOrder = async (req: Request, res: Response) => {
    try {
        const { items, customerName, tableNumber } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: 'User not identified' });
        }

        // Calculate totals and verify items data
        let subtotal = 0;
        const orderItemsData: any[] = [];

        // Fetch all menu items to get current prices
        const menuItemIds = items.map((i: any) => i.menuItemId);
        const dbMenuItems = await db
            .select()
            .from(menuItems)
            .where(inArray(menuItems.id, menuItemIds));

        const menuItemMap = new Map(dbMenuItems.map((i) => [i.id, i]));

        for (const item of items) {
            const dbItem = menuItemMap.get(item.menuItemId);
            if (!dbItem) {
                return res.status(400).json({ message: `Menu item ${item.menuItemId} not found` });
            }

            const price = Number(dbItem.price);
            subtotal += price * item.quantity;

            orderItemsData.push({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                price: price.toString(), // Store as string for decimal
                notes: item.notes,
            });
        }

        const tax = subtotal * 0.11;
        const total = subtotal + tax;

        // Generate simple order number e.g. #DATE-RANDOM
        const orderNumber = `#${Date.now().toString().slice(-6)}`;

        // Use transaction to ensure atomicity
        const result = await db.transaction(async (tx) => {
            // 1. Create Order
            const [newOrder] = await tx
                .insert(orders)
                .values({
                    orderNumber,
                    customerName,
                    tableNumber,
                    subtotal: subtotal.toString(),
                    tax: tax.toString(),
                    total: total.toString(),
                    userId,
                    status: 'awaiting_payment',
                })
                .returning();

            // 2. Create Order Items
            for (const itemData of orderItemsData) {
                await tx.insert(orderItems).values({
                    ...itemData,
                    orderId: newOrder.id,
                    price: itemData.price.toString(),
                });
            }

            return newOrder;
        });

        // Fetch the full order with items to emit
        const fullOrder = await db
            .select()
            .from(orders)
            .where(eq(orders.id, result.id))
            .limit(1);

        const orderItemsList = await db
            .select({
                quantity: orderItems.quantity,
                notes: orderItems.notes,
                menuName: menuItems.name,
            })
            .from(orderItems)
            .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
            .where(eq(orderItems.orderId, result.id));

        if (fullOrder[0]) {
            const orderToEmit = { ...fullOrder[0], items: orderItemsList };

            // Emit socket event
            const io = req.app.get('io');
            if (io) {
                io.emit('order:new', orderToEmit);
                Logger.info(`Socket emitted: order:new for order ${orderNumber}`);
            }
        }

        res.status(201).json(result);
    } catch (error) {
        Logger.error('Error creating order', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const { status, date } = req.query;

        // Build query conditions
        const conditions = [];
        if (status) {
            // @ts-ignore - status match
            conditions.push(eq(orders.status, status));
        }

        // Simple fetch without complex join for list view
        const result = await db
            .select()
            .from(orders)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(orders.createdAt));

        res.json(result);
    } catch (error) {
        Logger.error('Error fetching orders', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getOrderById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const [order] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, id))
            .limit(1);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Fetch items with menu details
        const items = await db
            .select({
                id: orderItems.id,
                quantity: orderItems.quantity,
                price: orderItems.price,
                notes: orderItems.notes,
                menuName: menuItems.name,
                menuImage: menuItems.image,
            })
            .from(orderItems)
            .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
            .where(eq(orderItems.orderId, id));

        res.json({ ...order, items });
    } catch (error) {
        Logger.error('Error fetching order details', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const [updatedOrder] = await db
            .update(orders)
            .set({
                status,
                updatedAt: new Date(),
            })
            .where(eq(orders.id, id))
            .returning();

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.emit('order:updated', updatedOrder);
            Logger.info(`Socket emitted: order:updated for order ${id}`);
        }

        res.json(updatedOrder);
    } catch (error) {
        Logger.error('Error updating order status', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getKitchenOrders = async (req: Request, res: Response) => {
    try {
        // Chef needs to see Pending and Preparing orders
        const result = await db
            .select()
            .from(orders)
            .where(inArray(orders.status, ['pending', 'preparing']))
            .orderBy(orders.createdAt);

        // Fetch items for each order efficiently? 
        // For now, let's just loop or client can fetch detail. 
        // Better to return items here for KDS view.

        const ordersWithItems = await Promise.all(
            result.map(async (order) => {
                const items = await db
                    .select({
                        quantity: orderItems.quantity,
                        notes: orderItems.notes,
                        menuName: menuItems.name,
                    })
                    .from(orderItems)
                    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
                    .where(eq(orderItems.orderId, order.id));

                return { ...order, items };
            })
        );

        res.json(ordersWithItems);
    } catch (error) {
        Logger.error('Error fetching kitchen orders', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
