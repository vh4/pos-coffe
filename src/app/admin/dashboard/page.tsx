'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ModeToggle } from '@/components/mode-toggle';

interface DashboardStats {
    todayRevenue: number;
    revenueGrowth: number;
    todayOrders: number;
    allTimeRevenue: number;
    allTimeOrders: number;
    totalCategories: number;
    totalMenuItems: number;
    bestSellers: {
        id: string;
        name: string;
        count: number;
    }[];
    revenueTrend: {
        date: string;
        revenue: number;
    }[];
    recentTransactions: {
        id: string;
        transactionNumber: string;
        amount: string;
        paymentMethod: string;
        paymentStatus: string;
        customerName: string;
        createdAt: string;
    }[];
    avgOrderValue: number;
}

export default function AdminDashboard() {
    const [mounted, setMounted] = useState(false);
    const [dateStr, setDateStr] = useState('');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [trxPage, setTrxPage] = useState(1);
    const [trxMeta, setTrxMeta] = useState({ totalPages: 1, total: 0 });

    const fetchStats = async () => {
        try {
            const response = await api.get('/analytics/stats');
            setStats(response.data as DashboardStats);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const fetchRecentTransactions = async (page = 1) => {
        try {
            const response = await api.get('/transactions', {
                params: { page, limit: 5 }
            });
            const { data, meta } = response.data as any;
            setStats(prev => prev ? ({ ...prev, recentTransactions: data }) : null);
            setTrxMeta(meta);
        } catch (error) {
            console.error('Failed to fetch recent transactions:', error);
        }
    };

    const loadAllData = async () => {
        setIsLoading(true);
        await Promise.all([fetchStats(), fetchRecentTransactions(1)]);
        setIsLoading(false);
    };

    useEffect(() => {
        setMounted(true);
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        };
        setDateStr(new Date().toLocaleDateString('id-ID', options));
        loadAllData();
    }, []);

    useEffect(() => {
        if (mounted) {
            fetchRecentTransactions(trxPage);
        }
    }, [trxPage]);

    if (!mounted) return null;

    const formatCurrency = (num: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('id-ID').format(num);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {/* Top Header */}
            <header className="bg-card/50 backdrop-blur-md border-b border-border px-8 py-6 flex items-center justify-between sticky top-0 z-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Dashboard Analytics
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium mt-1 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Real-time Stats • {dateStr}
                    </p>
                </div>
                <div className="flex items-center gap-6">
                    <ModeToggle />
                    <div className="h-10 w-px bg-border hidden sm:block"></div>
                    <button className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-300 relative group overflow-hidden">
                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform">notifications</span>
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background"></span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-xl shadow-primary/20"></div>
                        <p className="text-muted-foreground font-bold tracking-widest text-xs uppercase animate-pulse">Loading Analytics...</p>
                    </div>
                ) : stats ? (
                    <>
                        {/* Summary Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                            {/* Revenue Card Today */}
                            <div className="group relative bg-card border border-border/50 rounded-[32px] p-8 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity translate-x-4 -translate-y-4">
                                    <span className="material-symbols-outlined text-[120px]">payments</span>
                                </div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-3xl font-bold">payments</span>
                                    </div>
                                    <span className={`text-[10px] font-black tracking-tighter px-3 py-1.5 rounded-full flex items-center gap-1 ${stats.todayRevenue >= 0 ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                                        {stats.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(stats.revenueGrowth)}%
                                    </span>
                                </div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">Today's Revenue</p>
                                <h3 className="text-4xl font-black text-foreground tracking-tighter truncate">
                                    {formatCurrency(stats.todayRevenue)}
                                </h3>
                                <div className="mt-4 pt-4 border-t border-border/50">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                                        All Time: <span className="text-foreground font-bold">{formatCurrency(stats.allTimeRevenue)}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Orders Card Today */}
                            <div className="group relative bg-card border border-border/50 rounded-[32px] p-8 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity translate-x-4 -translate-y-4">
                                    <span className="material-symbols-outlined text-[120px]">receipt_long</span>
                                </div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-3xl font-bold">receipt_long</span>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">Today's Orders</p>
                                <h3 className="text-4xl font-black text-foreground tracking-tighter">
                                    {formatNumber(stats.todayOrders)}
                                </h3>
                                <div className="mt-4 pt-4 border-t border-border/50">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                                        All Time: <span className="text-foreground font-bold">{formatNumber(stats.allTimeOrders)}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Avg Order Card */}
                            <div className="group relative bg-card border border-border/50 rounded-[32px] p-8 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity translate-x-4 -translate-y-4">
                                    <span className="material-symbols-outlined text-[120px]">analytics</span>
                                </div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-3xl font-bold">analytics</span>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">Avg Order Value</p>
                                <h3 className="text-4xl font-black text-foreground tracking-tighter truncate">
                                    {formatCurrency(stats.avgOrderValue)}
                                </h3>
                                <div className="mt-4 pt-4 border-t border-border/50">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                                        Efficiency: <span className="text-foreground font-bold">High</span>
                                    </p>
                                </div>
                            </div>

                            {/* Inventory Summary Card */}
                            <div className="group relative bg-card border border-border/50 rounded-[32px] p-8 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity translate-x-4 -translate-y-4">
                                    <span className="material-symbols-outlined text-[120px]">inventory_2</span>
                                </div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-3xl font-bold">inventory_2</span>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">Catalog Overview</p>
                                <div className="flex items-end gap-3 tracking-tighter">
                                    <h3 className="text-4xl font-black text-foreground">{stats.totalMenuItems}</h3>
                                    <span className="text-xs font-bold text-muted-foreground mb-1.5 uppercase">Items</span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border/50">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                                        Categories: <span className="text-foreground font-bold">{stats.totalCategories}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Revenue Trend Chart */}
                        <div className="bg-card border border-border/50 rounded-[40px] p-10 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary/50 via-primary to-primary/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                                <div>
                                    <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
                                        <div className="w-2 h-8 bg-primary rounded-full"></div>
                                        Revenue Trend
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1 ml-5">Daily performance over the last 7 days</p>
                                </div>
                                <div className="flex items-center gap-2 bg-accent/50 p-1 rounded-xl border border-border/50">
                                    <button className="px-4 py-2 bg-card text-foreground text-xs font-bold rounded-lg shadow-sm">Daily</button>
                                    <button className="px-4 py-2 text-muted-foreground text-xs font-bold rounded-lg hover:text-foreground transition-colors">Weekly</button>
                                </div>
                            </div>

                            <div className="h-80 flex items-end justify-between gap-6 sm:gap-10 py-4 relative">
                                {/* Grid Lines (CSS only) */}
                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="w-full h-px bg-foreground"></div>
                                    ))}
                                </div>

                                {stats.revenueTrend.map((data, idx) => {
                                    const maxRevenue = Math.max(...stats.revenueTrend.map(d => Number(d.revenue)), 1);
                                    const height = (Number(data.revenue) / maxRevenue) * 100;
                                    const date = new Date(data.date);
                                    const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });

                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center gap-4 relative z-0 h-full">
                                            <div className="w-full relative group h-full flex items-end">
                                                <div
                                                    className="w-full bg-gradient-to-t from-primary/80 to-primary rounded-2xl transition-all duration-500 group-hover:scale-x-105 group-hover:from-primary cursor-pointer relative shadow-lg shadow-primary/5"
                                                    style={{ height: `${height}%`, minHeight: '8px' }}
                                                >
                                                    {/* Tooltip */}
                                                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-black px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 pointer-events-none shadow-xl z-20 whitespace-nowrap">
                                                        {formatCurrency(Number(data.revenue))}
                                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{dayName}</span>
                                                <span className="text-[8px] font-bold text-muted-foreground/50">{date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Recent Activity Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {/* Recent Transactions Table */}
                            <div className="lg:col-span-2 bg-card border border-border/50 rounded-[40px] p-10 shadow-sm overflow-hidden group">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
                                        <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                                        Recent Transactions
                                    </h2>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setTrxPage(p => Math.max(1, p - 1))}
                                                disabled={trxPage === 1}
                                                className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center disabled:opacity-30 transition-all hover:bg-accent/80"
                                            >
                                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                                            </button>
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                                Page {trxPage} / {trxMeta.totalPages}
                                            </span>
                                            <button
                                                onClick={() => setTrxPage(p => Math.min(trxMeta.totalPages, p + 1))}
                                                disabled={trxPage === trxMeta.totalPages}
                                                className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center disabled:opacity-30 transition-all hover:bg-accent/80"
                                            >
                                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => window.location.href = '/admin/transactions'}
                                            className="text-xs font-bold text-primary hover:underline uppercase tracking-widest"
                                        >
                                            View All
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto -mx-10 px-10">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-border/50">
                                                <th className="text-left py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">ID</th>
                                                <th className="text-left py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Customer</th>
                                                <th className="text-left py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Method</th>
                                                <th className="text-left py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Amount</th>
                                                <th className="text-right py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.recentTransactions.map((trx, idx) => (
                                                <tr key={idx} className="border-b border-border/10 last:border-0 group/row hover:bg-accent/5 transition-colors">
                                                    <td className="py-5">
                                                        <span className="font-mono text-xs font-bold text-muted-foreground group-hover/row:text-foreground">
                                                            {(trx.transactionNumber || '').slice(-6)}
                                                        </span>
                                                    </td>
                                                    <td className="py-5">
                                                        <p className="font-bold text-foreground text-sm">{trx.customerName || 'Guest'}</p>
                                                        <p className="text-[10px] text-muted-foreground">{new Date(trx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </td>
                                                    <td className="py-5">
                                                        <span className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1 bg-accent/50 rounded-lg">
                                                            {trx.paymentMethod}
                                                        </span>
                                                    </td>
                                                    <td className="py-5">
                                                        <span className="font-black text-foreground text-sm">{formatCurrency(Number(trx.amount))}</span>
                                                    </td>
                                                    <td className="py-5 text-right">
                                                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${trx.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-500' :
                                                            trx.paymentStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                                                'bg-red-500/10 text-red-500'
                                                            }`}>
                                                            {trx.paymentStatus}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {stats.recentTransactions.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="py-20 text-center text-muted-foreground font-bold italic">No recent transactions</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Best Sellers */}
                            <div className="bg-card border border-border/50 rounded-[40px] p-10 shadow-sm group">
                                <h2 className="text-2xl font-black text-foreground flex items-center gap-3 mb-10">
                                    <div className="w-2 h-8 bg-yellow-500 rounded-full"></div>
                                    Best Sellers
                                </h2>
                                <div className="space-y-8">
                                    {stats.bestSellers.map((item, idx) => {
                                        const maxCount = Math.max(...stats.bestSellers.map(b => Number(b.count)), 1);
                                        const percentage = (Number(item.count) / maxCount) * 100;

                                        return (
                                            <div key={idx} className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-black text-muted-foreground/30">#0{idx + 1}</span>
                                                        <p className="font-black text-foreground tracking-tight text-sm uppercase truncate max-w-[140px]">{item.name}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-black text-foreground text-sm">{item.count}</span>
                                                        <span className="text-[10px] font-bold text-muted-foreground ml-1 uppercase">Sold</span>
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full bg-accent/50 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-1000"
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {stats.bestSellers.length === 0 && (
                                        <div className="py-12 text-center text-muted-foreground font-bold">No sales data yet</div>
                                    )}
                                </div>

                                <div className="mt-12 p-6 bg-primary/5 rounded-[24px] border border-primary/10">
                                    <div className="flex items-center gap-3 text-primary mb-3">
                                        <span className="material-symbols-outlined font-bold">lightbulb</span>
                                        <p className="text-xs font-black uppercase tracking-widest">Pro Tip</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                        Produk <strong>{stats.bestSellers[0]?.name || '...'}</strong> sedang naik daun. Pertimbangkan untuk membuat promo bundling!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
                            <span className="material-symbols-outlined text-4xl">error</span>
                        </div>
                        <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Stats Unavailable</h3>
                        <p className="text-muted-foreground font-medium">We couldn't load the analytics data. Please try again.</p>
                        <button
                            onClick={fetchStats}
                            className="mt-4 px-8 py-3 bg-primary text-primary-foreground font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform uppercase text-xs tracking-widest"
                        >
                            Retry Loading
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}

