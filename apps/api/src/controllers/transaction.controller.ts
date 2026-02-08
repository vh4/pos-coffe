import { Request, Response } from 'express';
import { db } from '../db';
import { transactions, orders, orderItems, menuItems } from '../db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { Logger } from '../config/logger';
import * as midtransService from '../services/midtrans.service';
import { randomUUID } from 'crypto';

export const createTransaction = async (req: Request, res: Response) => {
    try {
        const { orderId, amount, paymentMethod } = req.body;

        // DEBUG: Log incoming request body
        Logger.warn(`[CreateTransaction] Incoming Body: ${JSON.stringify(req.body)}`);

        // Verify order exists
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status === 'completed' || order.status === 'cancelled') {
            return res.status(400).json({ message: 'Order is already completed or cancelled' });
        }

        // Check if transaction already exists
        const existingTransaction = await db.select().from(transactions).where(eq(transactions.orderId, orderId)).limit(1);
        if (existingTransaction.length > 0 && existingTransaction[0].paymentStatus === 'paid') {
            return res.status(400).json({ message: 'Order already paid' });
        }

        const midtransOrderId = `${order.orderNumber.replace('#', '')}-${Date.now()}`;
        const transactionNumber = `TRX-${Date.now()}`;

        // Get order items for Midtrans payload
        const items = await db
            .select({
                id: menuItems.id,
                name: menuItems.name,
                price: orderItems.price,
                quantity: orderItems.quantity
            })
            .from(orderItems)
            .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
            .where(eq(orderItems.orderId, orderId));


        // Prepare items for Midtrans (including tax and service charge if present)
        const midtransItems = items.map(item => ({
            id: item.id,
            name: item.name,
            price: Number(item.price),
            quantity: item.quantity
        }));

        if (Number(order.tax) > 0) {
            midtransItems.push({
                id: 'P-TAX',
                name: 'Pajak (11%)',
                price: Math.round(Number(order.tax)),
                quantity: 1
            });
        }

        let snapToken = null;
        let qrisData = null;

        if (paymentMethod === 'qris') {
            // QRIS - Use Snap Default (User requested "keseluruhan payment" / full payment options)
            // But we typically want to focus on QRIS. However, to match "keseluruhan modal popup", 
            // we will just let Snap decide or pass common ones.
            // Let's pass undefined to enabledPayments to show all, OR just pass 'qris' + wallets if we want to be specific.
            // "Perbaiki payment QRIS nyas sementara pakai kelesurahan modal popup dari mintrans"
            // Interpreted as: Use Snap Popup for QRIS context, but allow full modal (all methods) or at least Snap's full UI.

            snapToken = await midtransService.createSnapToken(
                midtransOrderId,
                Number(amount),
                midtransItems,
                { name: order.customerName },
                ['qris', 'gopay', 'shopeepay', 'other_qris'] // Focus on QRIS/Wallets but using Snap
            );
        } else if (paymentMethod === 'va') {
            // Virtual Account - Use Snap with VA options enabled
            // The frontend no longer sends 'bankName', so we enable all common VAs

            const customerDetails = {
                name: order.customerName || 'Guest',
                email: 'customer@example.com',
                phone: '081234567890'
            };

            snapToken = await midtransService.createSnapToken(
                midtransOrderId,
                Number(amount),
                midtransItems,
                customerDetails,
                ['bca_va', 'bni_va', 'bri_va', 'mandiri', 'permata_va', 'cimb_va', 'other_va']
            );
        } else if (paymentMethod !== 'cash') {
            // Other payment methods
            const customerDetails = {
                name: order.customerName || 'Guest',
                email: 'customer@example.com',
                phone: '081234567890'
            };

            snapToken = await midtransService.createSnapToken(
                midtransOrderId,
                Number(amount),
                midtransItems,
                customerDetails,
                undefined // Show all enabled in dashboard
            );
        }

        const [newTransaction] = await db.insert(transactions).values({
            id: randomUUID(),
            orderId,
            transactionNumber,
            amount: amount.toString(),
            paymentMethod,
            paymentStatus: paymentMethod === 'cash' ? 'paid' : 'pending',
            paidAt: paymentMethod === 'cash' ? new Date() : null,
            midtransSnapToken: (paymentMethod === 'qris' || paymentMethod === 'va')
                ? (qrisData ? (typeof qrisData === 'object' ? JSON.stringify(qrisData) : qrisData) : snapToken)
                : snapToken,
            midtransOrderId: midtransOrderId,
        }).returning();

        if (paymentMethod === 'cash') {
            const [updatedOrder] = await db
                .update(orders)
                .set({ status: 'pending' })
                .where(eq(orders.id, orderId))
                .returning();

            // Emit socket event
            const io = req.app.get('io');
            if (io && updatedOrder) {
                // Fetch full order for kitchen
                const items = await db
                    .select({
                        quantity: orderItems.quantity,
                        notes: orderItems.notes,
                        menuName: menuItems.name,
                    })
                    .from(orderItems)
                    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
                    .where(eq(orderItems.orderId, orderId));

                io.emit('order:updated', { ...updatedOrder, items });
                Logger.info(`Socket emitted: order:updated (paid cash) for order ${orderId}`);
            }
        }

        res.status(201).json({ ...newTransaction, qrisData });
    } catch (error: any) {
        Logger.error('Error creating transaction', error);
        res.status(500).json({
            message: error.message || 'Internal server error',
            details: error.ApiResponse || error
        });
    }
};

export const midtransCallback = async (req: Request, res: Response) => {
    try {
        const { order_id, transaction_status, gross_amount, signature_key, status_code } = req.body;

        // Verify signature (optional but recommended)
        // const isValid = midtransService.verifySignature(order_id, status_code, gross_amount, signature_key);
        // if (!isValid) return res.status(403).json({ message: 'Invalid signature' });

        let newStatus = 'pending';
        if (transaction_status === 'capture' || transaction_status === 'settlement') {
            newStatus = 'paid';
        } else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire') {
            newStatus = 'failed';
        }

        // Update transaction
        const [updatedTransaction] = await db
            .update(transactions)
            .set({
                paymentStatus: newStatus as any,
                paidAt: newStatus === 'paid' ? new Date() : null
            })
            .where(eq(transactions.midtransOrderId, order_id)) // We used transaction ID as midtrans order_id
            .returning();

        if (updatedTransaction && newStatus === 'paid') {
            // Update order status to 'preparing'
            const [updatedOrder] = await db
                .update(orders)
                .set({ status: 'pending' })
                .where(eq(orders.id, updatedTransaction.orderId))
                .returning();

            // Emit socket event
            const io = req.app.get('io');
            if (io && updatedOrder) {
                // Fetch full order for kitchen
                const items = await db
                    .select({
                        quantity: orderItems.quantity,
                        notes: orderItems.notes,
                        menuName: menuItems.name,
                    })
                    .from(orderItems)
                    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
                    .where(eq(orderItems.orderId, updatedOrder.id));

                io.emit('order:updated', { ...updatedOrder, items });
                Logger.info(`Socket emitted: order:updated (paid midtrans) for order ${updatedOrder.id}`);
            }
        }

        res.json({ status: 'ok' });
    } catch (error) {
        Logger.error('Midtrans callback error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAllTransactions = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const status = req.query.status as string;
        const search = req.query.search as string;
        const offset = (page - 1) * limit;

        let whereClause: any = undefined;
        const conditions = [];

        if (status && status !== 'all') {
            conditions.push(eq(transactions.paymentStatus, status as any));
        }

        if (search) {
            conditions.push(
                sql`(${transactions.transactionNumber} ILIKE ${'%' + search + '%'} OR ${orders.customerName} ILIKE ${'%' + search + '%'})`
            );
        }

        if (conditions.length > 0) {
            whereClause = and(...conditions);
        }

        const [totalResult] = await db
            .select({ count: sql<number>`count(distinct ${transactions.id})` })
            .from(transactions)
            .leftJoin(orders, eq(transactions.orderId, orders.id))
            .where(whereClause);

        const total = Number(totalResult?.count || 0);

        const [statsResult] = await db
            .select({
                totalRevenue: sql<number>`sum(case when ${transactions.paymentStatus} = 'paid' then ${transactions.amount} else 0 end)`,
                paidCount: sql<number>`count(case when ${transactions.paymentStatus} = 'paid' then 1 end)`,
                pendingCount: sql<number>`count(case when ${transactions.paymentStatus} = 'pending' then 1 end)`,
            })
            .from(transactions);

        const result = await db
            .select({
                id: transactions.id,
                transactionNumber: transactions.transactionNumber,
                amount: transactions.amount,
                paymentMethod: transactions.paymentMethod,
                paymentStatus: transactions.paymentStatus,
                paidAt: transactions.paidAt,
                createdAt: transactions.createdAt,
                orderId: transactions.orderId,
                customerName: orders.customerName,
            })
            .from(transactions)
            .leftJoin(orders, eq(transactions.orderId, orders.id))
            .where(whereClause)
            .orderBy(desc(transactions.createdAt))
            .limit(limit)
            .offset(offset);

        res.json({
            data: result,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                totalRevenue: Number(statsResult?.totalRevenue || 0),
                totalPaid: Number(statsResult?.paidCount || 0),
                totalPending: Number(statsResult?.pendingCount || 0),
            }
        });
    } catch (error) {
        Logger.error('Error fetching transactions', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getTransactionById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);

        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        res.json(transaction);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const checkTransactionStatus = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const [transaction] = await db.select().from(transactions).where(eq(transactions.orderId, orderId)).limit(1);

        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        // If already paid, return status immediately
        if (transaction.paymentStatus === 'paid') {
            return res.json({ status: 'paid', transaction });
        }

        // Check status with Midtrans
        const midtransStatus = await midtransService.getTransactionStatus(transaction.midtransOrderId!);
        const transactionStatus = midtransStatus.transaction_status;

        let newStatus = transaction.paymentStatus;
        if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
            newStatus = 'paid';
        } else if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire') {
            newStatus = 'failed';
        }

        // If status changed to paid, update DB and Order
        if (newStatus === 'paid' && transaction.paymentStatus !== 'paid') {
            // Update transaction
            await db.update(transactions)
                .set({
                    paymentStatus: 'paid',
                    paidAt: new Date()
                })
                .where(eq(transactions.id, transaction.id));

            // Update order
            const [updatedOrder] = await db.update(orders)
                .set({ status: 'pending' })
                .where(eq(orders.id, orderId))
                .returning();

            // Emit socket
            const io = req.app.get('io');
            if (io && updatedOrder) {
                const items = await db
                    .select({
                        quantity: orderItems.quantity,
                        notes: orderItems.notes,
                        menuName: menuItems.name,
                    })
                    .from(orderItems)
                    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
                    .where(eq(orderItems.orderId, orderId));

                io.emit('order:updated', { ...updatedOrder, items });
                Logger.info(`Socket emitted: order:updated (manual check) for order ${orderId}`);
            }
        } else if (newStatus !== transaction.paymentStatus) {
            // Update other statuses (failed, etc)
            await db.update(transactions)
                .set({ paymentStatus: newStatus as any })
                .where(eq(transactions.id, transaction.id));
        }

        res.json({ status: newStatus, midtransStatus });
    } catch (error: any) {
        Logger.error('Error checking transaction status:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
};
