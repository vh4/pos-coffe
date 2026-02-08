'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Transaction {
    id: string;
    transactionNumber: string;
    orderId: string;
    customerName?: string;
    amount: string | number;
    paymentMethod: string;
    paymentStatus: 'pending' | 'paid' | 'failed' | 'cancelled';
    paidAt?: string | null;
    createdAt: string;
}

export default function AdminTransactionsPage() {
    const [mounted, setMounted] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [meta, setMeta] = useState({
        total: 0,
        page: 1,
        totalPages: 1,
        limit: 10,
        totalRevenue: 0,
        totalPaid: 0,
        totalPending: 0
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'failed' | 'cancelled'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTransactions = async (page = 1) => {
        try {
            setIsLoading(true);
            const response = await api.get('/transactions', {
                params: {
                    page,
                    limit: 10,
                    status: filterStatus,
                    search: searchQuery
                }
            });
            const { data, meta } = response.data as any;
            setTransactions(data);
            setMeta(meta);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle search/filter changes with debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setCurrentPage(1);
            fetchTransactions(1);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [filterStatus, searchQuery]);

    // Handle initial mount and manual page change
    useEffect(() => {
        if (mounted) {
            fetchTransactions(currentPage);
        }
    }, [currentPage]);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    // Use current page data directly (it's already filtered by backend)
    const displayTransactions = transactions;

    const getStatusBadge = (status: Transaction['paymentStatus']) => {
        switch (status) {
            case 'paid':
                return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
            case 'pending':
                return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
            case 'failed':
            case 'cancelled':
                return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
        }
    };

    const getStatusIcon = (status: Transaction['paymentStatus']) => {
        switch (status) {
            case 'paid':
                return 'check_circle';
            case 'pending':
                return 'schedule';
            case 'failed':
            case 'cancelled':
                return 'cancel';
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-card border-b border-border px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Kelola dan monitoring semua transaksi
                        </p>
                    </div>
                    {/* Search */}
                    <div className="w-80">
                        <div className="flex items-center bg-background border border-input rounded-xl px-4 py-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                            <span className="material-symbols-outlined text-muted-foreground mr-2">
                                search
                            </span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 text-sm"
                                placeholder="Cari TRX / Customer..."
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 bg-background">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-3xl text-green-500">
                                payments
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-1">
                            Rp {meta.totalRevenue.toLocaleString('id-ID')}
                        </h3>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-3xl text-blue-500">
                                receipt_long
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-1">
                            {meta.total}
                        </h3>
                        <p className="text-sm text-muted-foreground">Total Transactions</p>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-3xl text-green-500">
                                check_circle
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-1">
                            {meta.totalPaid}
                        </h3>
                        <p className="text-sm text-muted-foreground">Paid</p>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-3xl text-yellow-500">
                                schedule
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-1">
                            {meta.totalPending}
                        </h3>
                        <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-3 mb-6">
                    {[
                        { key: 'all', label: 'Semua', count: transactions.length },
                        { key: 'paid', label: 'Paid', count: transactions.filter(t => t.paymentStatus === 'paid').length },
                        { key: 'pending', label: 'Pending', count: transactions.filter(t => t.paymentStatus === 'pending').length },
                        { key: 'failed', label: 'Failed', count: transactions.filter(t => t.paymentStatus === 'failed' || t.paymentStatus === 'cancelled').length },
                    ].map((filter) => (
                        <button
                            key={filter.key}
                            onClick={() => setFilterStatus(filter.key as any)}
                            className={`px-5 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${filterStatus === filter.key
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                                : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border'
                                }`}
                        >
                            {filter.label} ({filter.count})
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-accent border-b border-border">
                                <tr>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                                        Trx #
                                    </th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                                        Customer
                                    </th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                                        Date & Time
                                    </th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                                        Payment Method
                                    </th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                                        Total
                                    </th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                                        Status
                                    </th>
                                    <th className="text-center py-4 px-6 text-sm font-semibold text-foreground">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayTransactions.map((txn, idx) => (
                                    <tr
                                        key={txn.id}
                                        className={`border-b border-border hover:bg-accent transition-colors ${idx === displayTransactions.length - 1 ? 'border-0' : ''
                                            }`}
                                    >
                                        <td className="py-4 px-6">
                                            <span className="font-semibold text-foreground">{txn.transactionNumber}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-sm text-foreground">{txn.customerName || '-'}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-foreground">
                                                    {new Date(txn.createdAt).toLocaleDateString('id-ID')}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(txn.createdAt).toLocaleTimeString('id-ID', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-sm text-foreground uppercase">{txn.paymentMethod}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="font-semibold text-foreground">
                                                Rp {Number(txn.amount).toLocaleString('id-ID')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span
                                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                                                    txn.paymentStatus
                                                )}`}
                                            >
                                                <span className="material-symbols-outlined text-sm">
                                                    {getStatusIcon(txn.paymentStatus)}
                                                </span>
                                                {txn.paymentStatus.charAt(0).toUpperCase() + txn.paymentStatus.slice(1)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => setSelectedTransaction(txn)}
                                                    className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center"
                                                >
                                                    <span className="material-symbols-outlined text-lg">
                                                        visibility
                                                    </span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {!isLoading && displayTransactions.length === 0 && (
                        <div className="py-20 text-center">
                            <span className="material-symbols-outlined text-6xl text-muted-foreground mb-4 block">
                                receipt_long
                            </span>
                            <p className="text-muted-foreground">Tidak ada transaksi ditemukan</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {!isLoading && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-lg">
                        <div className="text-sm text-muted-foreground">
                            Showing <span className="font-semibold text-foreground">{(meta.page - 1) * meta.limit + 1}</span> to{' '}
                            <span className="font-semibold text-foreground">
                                {Math.min(meta.page * meta.limit, meta.total)}
                            </span>{' '}
                            of <span className="font-semibold text-foreground">{meta.total}</span> entries
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="w-10 h-10 rounded-xl bg-accent border border-border flex items-center justify-center hover:bg-accent/80 disabled:opacity-50 transition-all"
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>

                            <div className="flex items-center gap-1">
                                {[...Array(meta.totalPages)].map((_, i) => {
                                    const pageNum = i + 1;
                                    // Basic pagination logic to show only few pages if many
                                    if (
                                        meta.totalPages > 7 &&
                                        pageNum !== 1 &&
                                        pageNum !== meta.totalPages &&
                                        Math.abs(pageNum - currentPage) > 1
                                    ) {
                                        if (pageNum === 2 || pageNum === meta.totalPages - 1) {
                                            return <span key={pageNum} className="px-1 text-muted-foreground">...</span>;
                                        }
                                        return null;
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${currentPage === pageNum
                                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                                                : 'bg-card text-muted-foreground hover:bg-accent border border-border'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(meta.totalPages, p + 1))}
                                disabled={currentPage === meta.totalPages}
                                className="w-10 h-10 rounded-xl bg-accent border border-border flex items-center justify-center hover:bg-accent/80 disabled:opacity-50 transition-all"
                            >
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl p-8 max-w-lg w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-foreground">
                                Detail Transaksi
                            </h2>
                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="w-10 h-10 rounded-full hover:bg-accent transition-colors flex items-center justify-center"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-4 border-b border-border">
                                <span className="text-sm text-muted-foreground">Trx Number</span>
                                <span className="font-semibold text-foreground">
                                    {selectedTransaction.transactionNumber}
                                </span>
                            </div>

                            <div className="flex justify-between items-center pb-4 border-b border-border">
                                <span className="text-sm text-muted-foreground">Customer</span>
                                <span className="font-semibold text-foreground">
                                    {selectedTransaction.customerName || '-'}
                                </span>
                            </div>

                            <div className="flex justify-between items-center pb-4 border-b border-border">
                                <span className="text-sm text-muted-foreground">Date & Time</span>
                                <div className="text-right">
                                    <p className="font-semibold text-foreground">
                                        {new Date(selectedTransaction.createdAt).toLocaleDateString('id-ID')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(selectedTransaction.createdAt).toLocaleTimeString('id-ID')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pb-4 border-b border-border">
                                <span className="text-sm text-muted-foreground">Payment Method</span>
                                <span className="font-semibold text-foreground uppercase">
                                    {selectedTransaction.paymentMethod}
                                </span>
                            </div>

                            <div className="flex justify-between items-center pb-4 border-b border-border">
                                <span className="text-sm text-muted-foreground">Status</span>
                                <span
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                                        selectedTransaction.paymentStatus
                                    )}`}
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        {getStatusIcon(selectedTransaction.paymentStatus)}
                                    </span>
                                    {selectedTransaction.paymentStatus.charAt(0).toUpperCase() +
                                        selectedTransaction.paymentStatus.slice(1)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center pt-4">
                                <span className="text-lg font-bold text-foreground">Total</span>
                                <span className="text-2xl font-bold text-primary">
                                    Rp {Number(selectedTransaction.amount).toLocaleString('id-ID')}
                                </span>
                            </div>

                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl shadow-lg shadow-primary/25 transition-all mt-6"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
