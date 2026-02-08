import { pgTable, uuid, text, boolean, decimal, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('role', ['admin', 'kasir', 'chef']);
export const orderStatusEnum = pgEnum('order_status', ['awaiting_payment', 'pending', 'preparing', 'ready', 'completed', 'cancelled']);
export const paymentMethodEnum = pgEnum('payment_method', ['qris', 'gopay', 'ovo', 'va', 'cash']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'expired']);

// Users Table
export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    fullName: text('full_name').notNull(),
    role: roleEnum('role').notNull().default('kasir'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Categories Table
export const categories = pgTable('categories', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    icon: text('icon').notNull(), // Material symbol name
    description: text('description'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Menu Items Table
export const menuItems = pgTable('menu_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    image: text('image').notNull(),
    categoryId: uuid('category_id').references(() => categories.id).notNull(),
    isAvailable: boolean('is_available').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Orders Table
export const orders = pgTable('orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderNumber: text('order_number').notNull(), // e.g., "#00124"
    customerName: text('customer_name'),
    tableNumber: text('table_number'),
    status: orderStatusEnum('status').default('pending').notNull(),
    subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
    tax: decimal('tax', { precision: 10, scale: 2 }).notNull(),
    total: decimal('total', { precision: 10, scale: 2 }).notNull(),
    userId: uuid('user_id').references(() => users.id), // Cashier who input the order
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Order Items Table
export const orderItems = pgTable('order_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
    menuItemId: uuid('menu_item_id').references(() => menuItems.id).notNull(),
    quantity: integer('quantity').notNull(),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(), // Snapshot price at time of order
    notes: text('notes'),
});

// Transactions Table
export const transactions = pgTable('transactions', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').references(() => orders.id).notNull(),
    transactionNumber: text('transaction_number').unique().notNull(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum('payment_method').default('cash'),
    paymentStatus: paymentStatusEnum('payment_status').default('pending'),
    midtransSnapToken: text('midtrans_snap_token'),
    midtransOrderId: text('midtrans_order_id'),
    paidAt: timestamp('paid_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Refresh Tokens Table
export const refreshTokens = pgTable('refresh_tokens', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    token: text('token').notNull(),
    userAgent: text('user_agent'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
    menuItems: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
    category: one(categories, {
        fields: [menuItems.categoryId],
        references: [categories.id],
    }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
    user: one(users, {
        fields: [orders.userId],
        references: [users.id],
    }),
    items: many(orderItems),
    transaction: one(transactions, {
        fields: [orders.id],
        references: [transactions.orderId],
    }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    order: one(orders, {
        fields: [orderItems.orderId],
        references: [orders.id],
    }),
    menuItem: one(menuItems, {
        fields: [orderItems.menuItemId],
        references: [menuItems.id],
    }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
    order: one(orders, {
        fields: [transactions.orderId],
        references: [orders.id],
    }),
}));

export const usersRelations = relations(users, ({ many }) => ({
    orders: many(orders),
    refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
    user: one(users, {
        fields: [refreshTokens.userId],
        references: [users.id],
    }),
}));

// Settings Table
export const settings = pgTable('settings', {
    id: uuid('id').defaultRandom().primaryKey(),
    storeName: text('store_name').notNull().default('Cafe POS'),
    storeAddress: text('store_address'),
    storePhone: text('store_phone'),
    storeEmail: text('store_email'),
    currency: text('currency').default('IDR'),
    taxRate: decimal('tax_rate', { precision: 10, scale: 2 }).default('0'),
    serviceCharge: decimal('service_charge', { precision: 10, scale: 2 }).default('0'),
    autoAcceptOrders: boolean('auto_accept_orders').default(false),
    enableNotifications: boolean('enable_notifications').default(true),
    receiptFooter: text('receipt_footer'),
    updatedAt: timestamp('updated_at').defaultNow(),
});
