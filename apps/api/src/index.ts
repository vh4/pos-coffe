import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRouter from './routes/auth.route';
import categoryRouter from './routes/category.route';
import menuRouter from './routes/menu.route';
import orderRouter from './routes/order.route';
import transactionRouter from './routes/transaction.route';
import userRouter from './routes/user.route';
import analyticsRouter from './routes/analytics.route';
import settingsRouter from './routes/settings.route';
import { Logger } from './config/logger';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
    Logger.http(`${req.method} ${req.url}`);
    next();
});

// Make io accessible in requests
app.set('io', io);

// Socket.io Connection Logic
io.on('connection', (socket) => {
    Logger.info(`New client connected: ${socket.id}`);

    socket.on('disconnect', () => {
        Logger.info(`Client disconnected: ${socket.id}`);
    });
});

// Swagger Setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'POS Kasir API',
            version: '1.0.0',
            description: 'API Documentation for POS Kasir Application',
        },
        servers: [
            {
                url: `http://localhost:${PORT}/api`,
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/menu', menuRouter);
app.use('/api/orders', orderRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/users', userRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/settings', settingsRouter);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    Logger.error(err.message);
    res.status(500).json({ message: 'Internal Server Error' });
});

// Start Server
httpServer.listen(PORT, () => {
    Logger.info(`Server is running (with Socket.io) on port ${PORT}`);
    Logger.info(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});

export { io };
export default app;
