import midtransClient from 'midtrans-client';
import dotenv from 'dotenv';
import { Logger } from '../config/logger';

dotenv.config();

export const createSnapToken = async (
    order_id: string,
    grossAmount: number,
    items: any[],
    customer: any,
    enabledPayments?: string[]
) => {
    try {
        const serverKey = (process.env.MIDTRANS_SERVER_KEY || '').trim();
        const clientKey = (process.env.MIDTRANS_CLIENT_KEY || '').trim();
        const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';

        // Re-initialize client inside function to ensure fresh process.env use
        const snap = new midtransClient.Snap({
            isProduction: isProd,
            serverKey,
            clientKey,
        });

        const keyHint = `${serverKey.substring(0, 10)}...${serverKey.slice(-3)}`;
        Logger.info(`Midtrans Snap Request: isProduction=${isProd}, keyHint=${keyHint} (NODE_ENV=${process.env.NODE_ENV})`);

        if (isProd && serverKey.startsWith('SB-')) {
            Logger.warn('MIDTRANS_IS_PRODUCTION is true but server key starts with SB- (Sandbox). This will likely fail.');
        } else if (!isProd && serverKey.startsWith('Mid-')) {
            Logger.warn('MIDTRANS_IS_PRODUCTION is false but server key starts with Mid- (Production). This will likely fail.');
        }

        const parameter: any = {
            transaction_details: {
                order_id: order_id,
                gross_amount: Math.round(grossAmount),
            },
            item_details: items.map((item: any, index: number) => ({
                id: `P-${index + 1}`,
                price: Math.round(Number(item.price)),
                quantity: item.quantity,
                name: item.name.substring(0, 50),
            })),
            customer_details: {
                first_name: customer.name || 'Guest',
                email: customer.email || 'guest@example.com',
            },
            callbacks: {
                finish: `${process.env.FRONTEND_URL}`,
                error: `${process.env.FRONTEND_URL}`,
                pending: `${process.env.FRONTEND_URL}`,
                unfinish: `${process.env.FRONTEND_URL}`,
            },
        };

        // Add phone if provided (required for VA, optional for others)
        if (customer.phone) {
            parameter.customer_details.phone = customer.phone;
        }

        // Add enabled_payments if specified
        if (enabledPayments && enabledPayments.length > 0) {
            parameter.enabled_payments = enabledPayments;
        }

        const transaction = await snap.createTransaction(parameter);
        Logger.info('Snap Token Created:', transaction.token);

        return transaction.token;
    } catch (error: any) {
        const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';
        const errorMessage = error.message || 'Unknown Midtrans Error';
        const apiError = error.ApiResponse?.error_messages?.join(', ') || '';

        Logger.error(`Midtrans Create Snap Token Error: ${errorMessage} ${apiError}`);

        // Only fallback to mock if we are explicitly NOT in production and NODE_ENV is development
        if (process.env.NODE_ENV === 'development' && !isProd) {
            Logger.info('Falling back to MOCK-TOKEN for development purposes (Non-Production).');
            return `MOCK-TOKEN-${Date.now()}`;
        }

        throw new Error(`Midtrans Error: ${errorMessage}. ${apiError}`);
    }
};

export const createDirectBankTransfer = async (
    order_id: string,
    grossAmount: number,
    items: any[],
    customer: any,
    bank: 'bca' | 'bni' | 'mandiri'
) => {
    try {
        const serverKey = (process.env.MIDTRANS_SERVER_KEY || '').trim();
        const clientKey = (process.env.MIDTRANS_CLIENT_KEY || '').trim();
        const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';

        // Initialize Core API client
        const coreApi = new midtransClient.CoreApi({
            isProduction: isProd,
            serverKey,
            clientKey,
        });

        Logger.info(`Midtrans Bank Transfer Request: bank=${bank}, isProduction=${isProd}, orderID=${order_id}`);

        // Validation Warning
        if (isProd && serverKey.startsWith('SB-')) {
            Logger.warn('MIDTRANS_IS_PRODUCTION is true but server key starts with SB- (Sandbox). This will likely fail.');
        } else if (!isProd && serverKey.startsWith('Mid-')) {
            Logger.warn('MIDTRANS_IS_PRODUCTION is false but server key starts with Mid- (Production). This will likely fail.');
        }

        let parameter: any = {
            transaction_details: {
                order_id: order_id,
                gross_amount: Math.round(grossAmount),
            },
            item_details: items.map((item: any, index: number) => ({
                id: `P-${index + 1}`,
                price: Math.round(Number(item.price)),
                quantity: item.quantity,
                name: item.name.substring(0, 50),
            })),
            customer_details: {
                first_name: customer.name || 'Guest',
                email: customer.email || 'customer@example.com',
                phone: customer.phone || '081234567890',
            },
        };

        if (bank === 'mandiri') {
            parameter.payment_type = 'echannel';
            parameter.echannel = {
                bill_info1: 'Payment For:',
                bill_info2: 'Order #' + order_id.split('-')[0], // Use short order number
            };
        } else {
            parameter.payment_type = 'bank_transfer';
            parameter.bank_transfer = {
                bank: bank,
            };
        }

        Logger.info(`Bank Transfer Parameter: ${JSON.stringify(parameter, null, 2)}`);

        const response = await (coreApi as any).charge(parameter);
        Logger.info(`Bank Transfer Response: ${JSON.stringify(response, null, 2)}`);

        return response;
    } catch (error: any) {
        const errorMessage = error.message || 'Unknown Midtrans Core Error';
        const apiError = error.ApiResponse?.status_message || error.ApiResponse?.error_messages?.join(', ') || '';

        Logger.error(`Midtrans Bank Transfer Error: ${errorMessage}. Details: ${apiError}`);
        Logger.error(`Full Error: ${JSON.stringify(error.ApiResponse || error)}`);

        throw new Error(`Midtrans Bank Transfer Error: ${errorMessage}. ${apiError}`);
    }
};

export const createDirectQris = async (order_id: string, grossAmount: number, items: any[]) => {
    try {
        const serverKey = (process.env.MIDTRANS_SERVER_KEY || '').trim();
        const clientKey = (process.env.MIDTRANS_CLIENT_KEY || '').trim();
        const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';

        // Re-initialize client inside function to ensure fresh process.env use
        const coreApi = new midtransClient.Snap({
            isProduction: isProd,
            serverKey,
            clientKey,
        });

        Logger.info(`Midtrans Direct QRIS Request: isProduction=${isProd}, keyHint=${serverKey.substring(0, 10)}...`);

        // Validation Warning
        if (isProd && serverKey.startsWith('SB-')) {
            Logger.warn('MIDTRANS_IS_PRODUCTION is true but server key starts with SB- (Sandbox). Direct QRIS may fail.');
        } else if (!isProd && serverKey.startsWith('Mid-')) {
            Logger.warn('MIDTRANS_IS_PRODUCTION is false but server key starts with Mid- (Production). Direct QRIS will likely return 500.');
        }

        const parameter = {
            payment_type: 'qris',
            transaction_details: {
                order_id: order_id,
                gross_amount: Math.round(grossAmount),
            },
        };

        const response = await (coreApi as any).createTransaction(parameter);
        Logger.info(`Midtrans Direct QRIS Response: ${JSON.stringify(response, null, 2)}`);
        return response;
    } catch (error: any) {
        const errorMessage = error.message || 'Unknown Midtrans Core Error';
        const apiError = error.ApiResponse?.status_message || error.ApiResponse?.error_messages?.join(', ') || '';

        Logger.error(`Midtrans Direct QRIS Error: ${errorMessage}. Details: ${apiError}`);
        throw new Error(`Midtrans QRIS Error: ${errorMessage}. ${apiError}`);
    }
};

export const verifySignature = (orderId: string, statusCode: string, grossAmount: string, signatureKey: string) => {
    const crypto = require('crypto');
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const input = orderId + statusCode + grossAmount + serverKey;
    const signature = crypto.createHash('sha512').update(input).digest('hex');
    return signature === signatureKey;
};

export const getTransactionStatus = async (orderId: string) => {
    try {
        const serverKey = (process.env.MIDTRANS_SERVER_KEY || '').trim();
        const clientKey = (process.env.MIDTRANS_CLIENT_KEY || '').trim();
        const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';

        const coreApi = new midtransClient.CoreApi({
            isProduction: isProd,
            serverKey,
            clientKey,
        });

        const response = await (coreApi as any).transaction.status(orderId);
        return response;
    } catch (error: any) {
        Logger.error('Error getting transaction status:', error);
        throw error;
    }
};
