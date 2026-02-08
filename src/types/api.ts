export interface User {
    id: string;
    email: string;
    fullName: string;
    role: 'admin' | 'kasir' | 'chef';
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface Category {
    id: string;
    name: string;
    icon: string;
    description?: string;
    itemCount?: number;
    isActive: boolean;
}

export interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    image: string;
    categoryId: string;
    categoryName?: string;
    isAvailable: boolean;
}

export interface OrderItem {
    menuItemId: string;
    quantity: number;
    notes?: string;
}

export interface CreateOrderPayload {
    customerName?: string;
    tableNumber?: string;
    items: OrderItem[];
}

export interface Transaction {
    id: string;
    orderId: string;
    amount: number;
    status: 'pending' | 'paid' | 'failed';
    snapToken?: string;
}
