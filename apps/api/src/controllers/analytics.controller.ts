import { Request, Response } from 'express';
import { db } from '../db';
import { orders, orderItems, menuItems, categories, transactions } from '../db/schema';
import { sql, eq, and, gte, lte, desc, inArray } from 'drizzle-orm';
import { Logger } from '../config/logger';

export const getRevenueStats = async (req: Request, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result = await db
            .select({
                total: sql<number>`sum(${orders.total})`,
            })
            .from(orders)
            .where(and(
                inArray(orders.status, ['preparing', 'ready', 'completed']),
                gte(orders.createdAt, today)
            ));

        res.json({ revenueToday: Number(result[0]?.total || 0) });
    } catch (error) {
        Logger.error('Error fetching revenue stats', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getSalesCount = async (req: Request, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result = await db
            .select({
                count: sql<number>`count(${orders.id})`,
            })
            .from(orders)
            .where(and(
                inArray(orders.status, ['preparing', 'ready', 'completed']),
                gte(orders.createdAt, today)
            ));

        res.json({ salesCountToday: Number(result[0]?.count || 0) });
    } catch (error) {
        Logger.error('Error fetching sales count', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getBestSellingItems = async (req: Request, res: Response) => {
    try {
        const result = await db
            .select({
                id: menuItems.id,
                name: menuItems.name,
                totalSold: sql<number>`sum(${orderItems.quantity})`,
            })
            .from(orderItems)
            .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
            .leftJoin(orders, eq(orderItems.orderId, orders.id))
            .where(inArray(orders.status, ['preparing', 'ready', 'completed']))
            .groupBy(menuItems.id, menuItems.name)
            .orderBy(desc(sql`sum(${orderItems.quantity})`))
            .limit(5);

        res.json(result);
    } catch (error) {
        Logger.error('Error fetching best selling items', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // 1. Fetch today's revenue and orders
        const [todayStats] = await db
            .select({
                revenue: sql<number>`sum(${orders.total})`,
                count: sql<number>`count(${orders.id})`,
            })
            .from(orders)
            .where(and(
                inArray(orders.status, ['preparing', 'ready', 'completed']),
                gte(orders.createdAt, today)
            ));

        // 2. Fetch all-time stats
        const [allTimeStats] = await db
            .select({
                revenue: sql<number>`sum(${orders.total})`,
                count: sql<number>`count(${orders.id})`,
            })
            .from(orders)
            .where(inArray(orders.status, ['preparing', 'ready', 'completed']));

        // 3. Metadata counts
        const [categoryCount] = await db.select({ count: sql<number>`count(*)` }).from(categories);
        const [menuItemCount] = await db.select({ count: sql<number>`count(*)` }).from(menuItems);

        // 4. Fetch yesterday's revenue for growth calculation
        const [yesterdayStats] = await db
            .select({
                revenue: sql<number>`sum(${orders.total})`,
                count: sql<number>`count(${orders.id})`,
            })
            .from(orders)
            .where(and(
                inArray(orders.status, ['preparing', 'ready', 'completed']),
                gte(orders.createdAt, yesterday),
                lte(orders.createdAt, today)
            ));

        const revenueToday = Number(todayStats?.revenue || 0);
        const ordersToday = Number(todayStats?.count || 0);
        const revenueYesterday = Number(yesterdayStats?.revenue || 0);

        const revenueGrowth = revenueYesterday > 0
            ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100
            : 0;

        // 5. Fetch best sellers (all time)
        const bestSellers = await db
            .select({
                id: menuItems.id,
                name: menuItems.name,
                count: sql<number>`sum(${orderItems.quantity})`,
            })
            .from(orderItems)
            .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
            .leftJoin(orders, eq(orderItems.orderId, orders.id))
            .where(inArray(orders.status, ['preparing', 'ready', 'completed']))
            .groupBy(menuItems.id, menuItems.name)
            .orderBy(desc(sql`sum(${orderItems.quantity})`))
            .limit(5);

        // 6. Recent Transactions (last 10)
        const recentTransactions = await db
            .select({
                id: transactions.id,
                transactionNumber: transactions.transactionNumber,
                amount: transactions.amount,
                paymentMethod: transactions.paymentMethod,
                paymentStatus: transactions.paymentStatus,
                customerName: orders.customerName,
                createdAt: transactions.createdAt,
            })
            .from(transactions)
            .leftJoin(orders, eq(transactions.orderId, orders.id))
            .orderBy(desc(transactions.createdAt))
            .limit(10);

        // 7. Fetch 7-day revenue trend with zero filling
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        const rawTrend = await db
            .select({
                date: sql<string>`DATE(${orders.createdAt})`,
                revenue: sql<number>`sum(${orders.total})`,
            })
            .from(orders)
            .where(and(
                inArray(orders.status, ['preparing', 'ready', 'completed']),
                gte(orders.createdAt, sevenDaysAgo)
            ))
            .groupBy(sql`DATE(${orders.createdAt})`)
            .orderBy(sql`DATE(${orders.createdAt})`);

        // Fill missing dates with zero revenue
        const filledTrend = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(sevenDaysAgo);
            date.setDate(date.getDate() + i);

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const match = (rawTrend as any[]).find(t => {
                // Ensure we compare date strings correctly
                const dbDateStr = new Date(t.date).toLocaleDateString('en-CA'); // YYYY-MM-DD
                return dbDateStr === dateStr || String(t.date) === dateStr;
            });

            filledTrend.push({
                date: dateStr,
                revenue: Number(match?.revenue || 0)
            });
        }

        res.json({
            todayRevenue: revenueToday,
            revenueGrowth: Math.round(revenueGrowth),
            todayOrders: ordersToday,
            allTimeRevenue: Number(allTimeStats?.revenue || 0),
            allTimeOrders: Number(allTimeStats?.count || 0),
            totalCategories: Number(categoryCount?.count || 0),
            totalMenuItems: Number(menuItemCount?.count || 0),
            bestSellers,
            revenueTrend: filledTrend,
            recentTransactions,
            avgOrderValue: ordersToday > 0 ? revenueToday / ordersToday : 0
        });
    } catch (error) {
        Logger.error('Error fetching dashboard stats', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
