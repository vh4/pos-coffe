import { Request, Response } from 'express';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../helpers/jwt.helper';
import { Logger } from '../config/logger';

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is inactive' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const payload = {
            userId: user.id,
            role: user.role,
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        // Save refresh token to DB
        await db.insert(refreshTokens).values({
            userId: user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            userAgent: req.headers['user-agent'] || 'unknown',
        });

        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
            },
        });
        Logger.info(`User logged in: ${user.email}`);
    } catch (error) {
        Logger.error('Login error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const refreshToken = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token required' });
    }

    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
        return res.status(403).json({ message: 'Invalid refresh token' });
    }

    // Check if token exists in DB and is valid
    const [tokenRecord] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, refreshToken))
        .limit(1);

    if (!tokenRecord) {
        return res.status(403).json({ message: 'Token has been revoked or invalid' });
    }

    const newAccessToken = generateAccessToken({
        userId: payload.userId,
        role: payload.role,
    });

    res.json({ accessToken: newAccessToken });
};

export const logout = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
        await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    }

    res.json({ message: 'Logged out successfully' });
};

export const me = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const [user] = await db
        .select({
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            role: users.role,
        })
        .from(users)
        .where(eq(users.id, req.user.userId))
        .limit(1);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
};
