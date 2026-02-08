import { Request, Response } from 'express';
import { db } from '../db';
import { settings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Logger } from '../config/logger';

export const getSettings = async (req: Request, res: Response) => {
    try {
        let [currentSettings] = await db.select().from(settings).limit(1);

        if (!currentSettings) {
            // Initialize default settings if none exist
            const [newSettings] = await db.insert(settings).values({
                storeName: 'Cafe POS',
                storeAddress: 'Jl. Contoh No. 123, Jakarta',
                storePhone: '+62 812-3456-7890',
                storeEmail: 'info@cafepos.com',
                currency: 'IDR',
                taxRate: '11',
                serviceCharge: '0',
                autoAcceptOrders: false,
                enableNotifications: true,
                receiptFooter: 'Terima kasih atas kunjungan Anda!',
            }).returning();
            currentSettings = newSettings;
        }

        res.json(currentSettings);
    } catch (error) {
        Logger.error('Error fetching settings', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const [currentSettings] = await db.select().from(settings).limit(1);

        const { id, ...data } = req.body;

        const values = {
            ...data,
            taxRate: data.taxRate?.toString(),
            serviceCharge: data.serviceCharge?.toString(),
            updatedAt: new Date(),
        };

        let updated;
        try {
            if (currentSettings) {
                [updated] = await db
                    .update(settings)
                    .set(values)
                    .where(eq(settings.id, currentSettings.id))
                    .returning();
            } else {
                [updated] = await db.insert(settings).values(values).returning();
            }
        } catch (dbError) {
            Logger.error('Database error in updateSettings', dbError);
            throw dbError;
        }

        res.json(updated);
    } catch (error) {
        Logger.error('Error updating settings', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
