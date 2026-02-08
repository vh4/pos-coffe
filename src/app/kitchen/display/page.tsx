'use client';

import { useState, useEffect } from 'react';
import { type Order, type OrderStatus } from '@/lib/dummyData';
import { signOut, useSession } from 'next-auth/react';
import api from '@/lib/api';
import { socketService } from '@/lib/socket';

export default function KitchenDisplayPage() {
    const { data: session } = useSession();
    const user = session?.user;
    const [orders, setOrders] = useState<Order[]>([]);
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [storeName, setStoreName] = useState('Cafe POS');

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await api.get('/orders/kitchen');
            const mappedOrders = (res.data as any[]).map(order => ({
                ...order,
                items: order.items.map((item: any) => ({
                    ...item,
                    name: item.menuName
                })),
                createdAt: new Date(order.createdAt)
            }));
            setOrders(mappedOrders);
        } catch (error) {
            console.error('Error fetching kitchen orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await api.get('/settings');
            const data = response.data as any;
            if (data?.storeName) {
                setStoreName(data.storeName);
                document.title = `${data.storeName} - Kitchen`;
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchOrders();
        fetchSettings();

        const socket = socketService.connect();

        socket.on('order:new', (newOrder: any) => {
            const mappedOrder = {
                ...newOrder,
                items: (newOrder.items || []).map((item: any) => ({
                    ...item,
                    name: item.menuName
                })),
                createdAt: new Date(newOrder.createdAt)
            };
            setOrders(prev => {
                if (prev.find(o => o.id === mappedOrder.id)) return prev;
                return [mappedOrder, ...prev];
            });
        });

        socket.on('order:updated', (updatedOrder: any) => {
            const mappedOrder = {
                ...updatedOrder,
                items: (updatedOrder.items || []).map((item: any) => ({
                    ...item,
                    name: item.menuName
                })),
                createdAt: new Date(updatedOrder.createdAt)
            };

            setOrders(prev => {
                if (['completed', 'cancelled'].includes(mappedOrder.status)) {
                    return prev.filter(o => o.id !== mappedOrder.id);
                }

                const exists = prev.find(o => o.id === mappedOrder.id);
                if (exists) {
                    return prev.map(o => o.id === mappedOrder.id ? { ...o, ...mappedOrder, items: mappedOrder.items || o.items } : o);
                } else {
                    if (['pending', 'preparing', 'ready'].includes(mappedOrder.status)) {
                        return [mappedOrder, ...prev];
                    }
                    return prev;
                }
            });
        });

        return () => {
            socket.off('order:new');
            socket.off('order:updated');
        };
    }, []);

    if (!mounted) return null;

    const getElapsedTime = (createdAt: Date) => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - createdAt.getTime()) / 1000 / 60);
        return diff;
    };

    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case 'pending':
                return 'border-red-500 bg-red-500/5';
            case 'preparing':
                return 'border-yellow-500 bg-yellow-500/5';
            case 'ready':
                return 'border-green-500 bg-green-500/5';
            default:
                return 'border-border';
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
        try {
            await api.patch(`/orders/${orderId}/status`, { status: newStatus });
            setOrders(
                orders.map((order: Order) =>
                    order.id === orderId ? { ...order, status: newStatus } : order
                )
            );
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('Gagal memperbarui status order');
        }
    };

    const pendingOrders = orders.filter((o: Order) => o.status === 'pending');
    const preparingOrders = orders.filter((o: Order) => o.status === 'preparing');
    const readyOrders = orders.filter((o: Order) => o.status === 'ready');

    return (
        <main className="min-h-screen bg-background p-3 md:p-6">
            {/* Header */}
            <header className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 border-r border-border pr-4">
                            <span className="material-symbols-outlined text-3xl md:text-4xl text-primary">
                                restaurant
                            </span>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{storeName}</h1>
                                <p className="text-muted-foreground text-xs md:text-sm">
                                    Kitchen Management Panel
                                </p>
                            </div>
                        </div>

                        <div className="hidden md:flex flex-col">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">{user?.role || 'Chef'}</span>
                            <span className="text-sm font-semibold text-foreground">{user?.fullName || 'Kitchen Staff'}</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Status Pills */}
                        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 sm:pb-0">
                            <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-3 md:px-4 py-2 rounded-full font-semibold text-xs md:text-sm whitespace-nowrap">
                                Pending: {pendingOrders.length}
                            </div>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-3 md:px-4 py-2 rounded-full font-semibold text-xs md:text-sm whitespace-nowrap">
                                Preparing: {preparingOrders.length}
                            </div>
                            <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 px-3 md:px-4 py-2 rounded-full font-semibold text-xs md:text-sm whitespace-nowrap">
                                Ready: {readyOrders.length}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors relative">
                                <span className="material-symbols-outlined">notifications</span>
                                {pendingOrders.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                        {pendingOrders.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                title="Logout"
                            >
                                <span className="material-symbols-outlined">logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Active Orders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                {[...preparingOrders, ...readyOrders].map((order) => (
                    <div
                        key={order.id}
                        className={`bg-card rounded-xl md:rounded-2xl p-4 md:p-6 border-2 ${getStatusColor(
                            order.status
                        )} shadow-lg transition-all hover:shadow-xl`}
                    >
                        {/* Order Header */}
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                            <h3 className="text-xl md:text-2xl font-bold text-foreground">
                                {order.orderNumber}
                            </h3>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <span className="material-symbols-outlined text-base md:text-lg">
                                    schedule
                                </span>
                                <span className="font-semibold text-sm md:text-base">
                                    {getElapsedTime(order.createdAt)}m
                                </span>
                            </div>
                        </div>

                        {/* Customer Info */}
                        {order.customerName && (
                            <div className="flex items-center gap-2 mb-3 text-xs md:text-sm text-muted-foreground flex-wrap">
                                <span className="material-symbols-outlined text-sm md:text-base">person</span>
                                <span>{order.customerName}</span>
                                {order.tableNumber && (
                                    <>
                                        <span>•</span>
                                        <span className="material-symbols-outlined text-sm md:text-base">
                                            table_restaurant
                                        </span>
                                        <span>Table {order.tableNumber}</span>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="h-px bg-border mb-3 md:mb-4"></div>

                        {/* Items List */}
                        <div className="space-y-2 mb-3 md:mb-4">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs md:text-sm">
                                        {item.quantity}x
                                    </div>
                                    <span className="text-foreground font-medium text-sm md:text-base">{item.name}</span>
                                </div>
                            ))}
                        </div>

                        {/* Status Button */}
                        {order.status === 'preparing' && (
                            <button
                                onClick={() => updateOrderStatus(order.id, 'ready')}
                                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 md:py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                            >
                                <span className="material-symbols-outlined">check_circle</span>
                                Mark as Ready
                            </button>
                        )}

                        {order.status === 'ready' && (
                            <div className="w-full bg-green-500/20 border-2 border-green-500 text-green-600 dark:text-green-400 font-bold py-3 md:py-3 rounded-xl flex items-center justify-center gap-2 text-sm md:text-base">
                                <span className="material-symbols-outlined">done_all</span>
                                READY
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Pending Orders Section */}
            {pendingOrders.length > 0 && (
                <>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px bg-border flex-1"></div>
                        <h2 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500 text-xl md:text-2xl">
                                priority_high
                            </span>
                            NEW ORDERS
                        </h2>
                        <div className="h-px bg-border flex-1"></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                        {pendingOrders.map((order) => (
                            <div
                                key={order.id}
                                className={`bg-card rounded-xl md:rounded-2xl p-4 md:p-6 border-2 ${getStatusColor(
                                    order.status
                                )} shadow-lg transition-all hover:shadow-xl animate-pulse`}
                            >
                                {/* Order Header */}
                                <div className="flex items-center justify-between mb-3 md:mb-4">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl md:text-2xl font-bold text-foreground">
                                            {order.orderNumber}
                                        </h3>
                                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                            NEW!
                                        </span>
                                    </div>
                                    <span className="material-symbols-outlined text-red-500 text-xl md:text-2xl">
                                        notification_important
                                    </span>
                                </div>

                                {/* Customer Info */}
                                {order.customerName && (
                                    <div className="flex items-center gap-2 mb-3 text-xs md:text-sm text-muted-foreground flex-wrap">
                                        <span className="material-symbols-outlined text-sm md:text-base">
                                            person
                                        </span>
                                        <span>{order.customerName}</span>
                                        {order.tableNumber && (
                                            <>
                                                <span>•</span>
                                                <span className="material-symbols-outlined text-sm md:text-base">
                                                    table_restaurant
                                                </span>
                                                <span>Table {order.tableNumber}</span>
                                            </>
                                        )}
                                    </div>
                                )}

                                <div className="h-px bg-border mb-3 md:mb-4"></div>

                                {/* Items List */}
                                <div className="space-y-2 mb-3 md:mb-4">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs md:text-sm">
                                                {item.quantity}x
                                            </div>
                                            <span className="text-foreground font-medium text-sm md:text-base">
                                                {item.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Accept Button */}
                                <button
                                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 md:py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                                >
                                    <span className="material-symbols-outlined">play_arrow</span>
                                    Accept Order
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Are you sure you want to cancel this order?')) {
                                            updateOrderStatus(order.id, 'cancelled');
                                        }
                                    }}
                                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 md:py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm md:text-base mt-2"
                                >
                                    <span className="material-symbols-outlined">cancel</span>
                                    Cancel Order
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </main>
    );
}
