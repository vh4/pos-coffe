import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useCartStore } from '@/store/useCartStore';
import { CreateOrderPayload } from '@/types/api';
import { useSession } from 'next-auth/react';
import { socketService } from '@/lib/socket';


declare global {
    interface Window {
        snap: any;
    }
}

interface PaymentModalProps {
    total: number;
    onClose: () => void;
    onSuccess: () => void;
    customerName: string;
    tableNumber: string;
}

type PaymentMethod = 'qris' | 'va' | 'cash' | null;
type BankName = 'bca' | 'bni' | 'mandiri' | null;
type PaymentStatus = 'selecting' | 'processing' | 'waiting' | 'success' | 'failed';

export function PaymentModal({ total, onClose, onSuccess, customerName, tableNumber }: PaymentModalProps) {
    const { data: session } = useSession();
    const user = session?.user;
    const { items } = useCartStore();
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
    const [selectedBank, setSelectedBank] = useState<BankName>(null);
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('selecting');
    const [countdown, setCountdown] = useState(300);
    const [cashAmount, setCashAmount] = useState<number>(0);
    const [transactionData, setTransactionData] = useState<any>(null);

    // Load Midtrans Snap Script
    useEffect(() => {
        const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';
        const scriptUrl = isProduction
            ? 'https://app.midtrans.com/snap/snap.js'
            : 'https://app.sandbox.midtrans.com/snap/snap.js';

        const script = document.createElement('script');
        script.src = scriptUrl;
        script.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '');

        console.log(`[Midtrans] Loading Snap Script: ${isProduction ? 'PRODUCTION' : 'SANDBOX'}`);
        console.log(`[Midtrans] Script URL: ${scriptUrl}`);
        console.log(`[Midtrans] Client Key: ${process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}`);

        script.onload = () => {
            console.log('[Midtrans] Snap script loaded successfully');
            console.log('[Midtrans] window.snap available:', !!window.snap);
        };

        script.onerror = (error) => {
            console.error('[Midtrans] Failed to load Snap script:', error);
        };

        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handleProcessPayment = async (method: PaymentMethod, bankNameOverride?: BankName) => {
        if (!method) return;

        try {
            setPaymentStatus('processing');

            // 1. Create Order
            const orderPayload: CreateOrderPayload = {
                customerName: customerName || "Guest",
                tableNumber: tableNumber || "00",
                items: items.map(item => ({
                    menuItemId: item.id,
                    quantity: item.quantity,
                    notes: item.notes
                }))
            };

            console.log('[Payment] Creating order...', orderPayload);
            const orderRes = await api.post('/orders', orderPayload);
            const orderId = (orderRes.data as any).id;
            console.log('[Payment] Order created:', orderId);

            // 2. Create Transaction
            const transactionPayload: any = {
                orderId,
                amount: total,
                paymentMethod: method
            };

            // Add bankName if VA payment
            if (method === 'va') {
                const bank = bankNameOverride || selectedBank;
                if (bank) {
                    transactionPayload.bankName = bank;
                }
            }

            console.log('[Payment] Creating transaction...', transactionPayload);
            const trxRes = await api.post('/transactions', transactionPayload);
            const trxData = trxRes.data as any;
            setTransactionData(trxData);
            console.log(`[Payment] Transaction created for ${method}:`, trxData);

            if (method === 'cash') {
                setPaymentStatus('success');
            } else if ((method === 'qris' || method === 'va') && (trxData.qrisData || trxData.midtransSnapToken)) {
                // Check if we actually got Direct QRIS/VA data (Core API) or a Snap token (Snap API)
                let directData = trxData.qrisData;

                // If qrisData is missing but midtransSnapToken is present, try to parse it
                if (!directData && trxData.midtransSnapToken) {
                    if (typeof trxData.midtransSnapToken === 'string' && trxData.midtransSnapToken.startsWith('{')) {
                        try {
                            directData = JSON.parse(trxData.midtransSnapToken);
                            // Update trxData for later use in UI
                            trxData.qrisData = directData;
                        } catch (e) {
                            console.error('Failed to parse midtransSnapToken as JSON', e);
                        }
                    }
                }

                // Decide if we should show UI (Direct) or popup (Snap)
                // Direct QRIS has actions. Direct VA has va_numbers or biller_code.
                const isDirect = directData && (
                    (method === 'qris' && directData.actions) ||
                    (method === 'va' && (directData.va_numbers || directData.biller_code || directData.permata_va_number))
                );

                if (isDirect) {
                    console.log(`[Payment] ${method.toUpperCase()} Direct payment initiated, waiting for payment`);
                    setPaymentStatus('waiting');
                } else {
                    // It's likely a Snap token, use the Snap popup logic
                    console.log(`[Payment] ${method.toUpperCase()} Snap fallback detected, opening popup`);

                    let snapToken = trxData.midtransSnapToken;
                    // If it's a stringified object (from backend fix), access the token property if valid
                    if (typeof snapToken === 'string' && snapToken.startsWith('{')) {
                        try {
                            const parsed = JSON.parse(snapToken);
                            if (parsed.token) snapToken = parsed.token;
                        } catch (e) { }
                    }

                    if (!snapToken) {
                        throw new Error('Snap token tidak ditemukan. Silakan coba lagi.');
                    }

                    // Check if snap is loaded
                    if (!window.snap) {
                        throw new Error('Midtrans Snap belum dimuat. Silakan refresh halaman dan coba lagi.');
                    }

                    const actualToken = typeof snapToken === 'object' ? snapToken.token : snapToken;

                    window.snap.pay(actualToken, {
                        onSuccess: (result: any) => {
                            console.log('[Payment] Success:', result);
                            handleSuccess();
                        },
                        onPending: (result: any) => {
                            console.log('[Payment] Pending:', result);
                            setPaymentStatus('waiting');
                            // We might not have directData here for UI, but the polling will handle it
                        },
                        onError: (result: any) => {
                            console.error('[Payment] Error:', result);
                            setPaymentStatus('failed');
                        },
                        onClose: () => {
                            console.log('[Payment] Window closed');
                            setPaymentStatus('selecting');
                        }
                    });
                }
            }
        } catch (error: any) {
            console.error('[Payment] Processing failed:', error);
            console.error('[Payment] Error response:', error.response?.data);
            setPaymentStatus('failed');

            const errorMessage = error.response?.data?.message
                || error.message
                || 'Terjadi kesalahan saat memproses pembayaran';

            setTransactionData((prev: any) => ({
                ...prev,
                error: errorMessage
            }));
        }
    };

    const handleSuccess = () => {
        setPaymentStatus('success');
    };

    const printedOrdersRef = useRef<Set<string>>(new Set());

    const handlePrintReceipt = () => {
        if (transactionData?.orderId && !printedOrdersRef.current.has(transactionData.orderId)) {
            printedOrdersRef.current.add(transactionData.orderId);
            window.print();
        }
    };

    const handleFinish = () => {
        onSuccess();
        onClose();
    };

    const handleSelectMethod = (method: PaymentMethod) => {
        setPaymentMethod(method);
        if (method !== 'cash') {
            handleProcessPayment(method);
        }
    };



    useEffect(() => {
        const socket = socketService.getSocket();

        const handleOrderUpdated = (data: any) => {
            console.log('[Socket] Received order:updated:', data);
            console.log('[Socket] Current transactionData:', transactionData);

            if (transactionData?.orderId && data.id === transactionData.orderId) {
                console.log(`[Socket] Order ID Match! Status: ${data.status}`);
                if (data.status === 'pending') {
                    console.log('[Socket] Payment confirmed! Triggering success...');
                    handleSuccess();
                    // Add small delay to ensure DOM is ready before printing
                    setTimeout(() => {
                        handlePrintReceipt();
                    }, 500);
                }
            } else {
                console.log('[Socket] Order mismatch or missing transactionData');
            }
        };

        socket.on('order:updated', handleOrderUpdated);

        return () => {
            socket.off('order:updated', handleOrderUpdated);
        };
    }, [transactionData?.orderId]);

    // Polling fallback for payment status (Localhost fix)
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (paymentStatus === 'waiting' && transactionData?.orderId) {
            console.log('[Polling] Starting payment status check...');
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`/transactions/${transactionData.orderId}/status`);
                    // Check logic based on status polling
                    if ((res.data as any).status === 'paid') {
                        console.log('[Polling] Payment confirmed by server!');
                        handleSuccess();
                        // Add small delay to ensure DOM is ready before printing
                        setTimeout(() => {
                            handlePrintReceipt();
                        }, 500);
                        clearInterval(interval);
                    }
                } catch (error) {
                    console.error('[Polling] Error checking status:', error);
                }
            }, 5000); // Check every 5 seconds
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [paymentStatus, transactionData?.orderId]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (paymentStatus === 'waiting') {
            interval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setPaymentStatus('failed');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [paymentStatus]);


    const handleCashPayment = () => {
        if (cashAmount < total) {
            alert('Jumlah uang tidak cukup!');
            return;
        }
        handleProcessPayment('cash');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getChange = () => {
        return cashAmount - total;
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">payments</span>
                        Pembayaran
                    </h2>
                    {paymentStatus === 'selecting' && (
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full hover:bg-accent transition-colors flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}
                </div>

                {/* Total Amount */}
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 mb-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Total Pembayaran</p>
                    <p className="text-4xl font-bold text-primary">
                        Rp {total.toLocaleString('id-ID')}
                    </p>
                </div>

                {/* Payment Method Selection */}
                {paymentStatus === 'selecting' && !paymentMethod && (
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground mb-4">
                            Pilih Metode Pembayaran:
                        </p>

                        <button
                            onClick={() => handleSelectMethod('qris')}
                            className="w-full bg-background hover:bg-accent border border-input rounded-xl p-4 transition-colors flex items-center gap-4 group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <span className="material-symbols-outlined text-2xl text-primary">
                                    qr_code_scanner
                                </span>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-foreground">QRIS</p>
                                <p className="text-xs text-muted-foreground">
                                    GoPay, OVO, Dana, LinkAja
                                </p>
                            </div>
                            <span className="material-symbols-outlined text-muted-foreground">
                                chevron_right
                            </span>
                        </button>

                        <button
                            onClick={() => handleSelectMethod('va')}
                            className="w-full bg-background hover:bg-accent border border-input rounded-xl p-4 transition-colors flex items-center gap-4 group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <span className="material-symbols-outlined text-2xl text-primary">
                                    account_balance
                                </span>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-foreground">Virtual Account</p>
                                <p className="text-xs text-muted-foreground">
                                    BCA, Mandiri, BNI, BRI
                                </p>
                            </div>
                            <span className="material-symbols-outlined text-muted-foreground">
                                chevron_right
                            </span>
                        </button>

                        <button
                            onClick={() => handleSelectMethod('cash')}
                            className="w-full bg-background hover:bg-accent border border-input rounded-xl p-4 transition-colors flex items-center gap-4 group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <span className="material-symbols-outlined text-2xl text-primary">
                                    payments
                                </span>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-foreground">Tunai</p>
                                <p className="text-xs text-muted-foreground">Bayar dengan uang cash</p>
                            </div>
                            <span className="material-symbols-outlined text-muted-foreground">
                                chevron_right
                            </span>
                        </button>
                    </div>
                )}



                {/* Cash Payment */}
                {paymentStatus === 'selecting' && paymentMethod === 'cash' && (
                    <div className="space-y-4">
                        <button
                            onClick={() => setPaymentMethod(null)}
                            className="flex items-center gap-2 text-primary hover:underline mb-4"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                            Kembali
                        </button>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Jumlah Uang Diterima
                            </label>
                            <input
                                type="number"
                                value={cashAmount || ''}
                                onChange={(e) => setCashAmount(Number(e.target.value))}
                                className="w-full bg-background border border-input rounded-xl px-4 py-4 text-foreground text-2xl font-bold focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                placeholder="0"
                                autoFocus
                            />
                        </div>

                        {/* Quick Cash Buttons */}
                        <div className="grid grid-cols-3 gap-2">
                            {[50000, 100000, 200000].map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setCashAmount(amount)}
                                    className="bg-accent hover:bg-primary hover:text-primary-foreground font-semibold py-3 rounded-lg transition-colors text-sm"
                                >
                                    {amount / 1000}k
                                </button>
                            ))}
                        </div>

                        {cashAmount > 0 && cashAmount >= total && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                                <p className="text-sm text-muted-foreground mb-1">Kembalian</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    Rp {getChange().toLocaleString('id-ID')}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleCashPayment}
                            disabled={cashAmount < total}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">check_circle</span>
                            Proses Pembayaran
                        </button>
                    </div>
                )}


                {/* Processing State */}
                {paymentStatus === 'processing' && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mb-4"></div>
                        <p className="text-lg font-semibold text-foreground">
                            Memproses pembayaran...
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Mohon tunggu sebentar
                        </p>
                    </div>
                )}

                {/* Waiting for Payment (QRIS/VA) */}
                {paymentStatus === 'waiting' && (
                    <div className="space-y-6">
                        <button
                            onClick={() => {
                                setPaymentMethod(null);
                                setPaymentStatus('selecting');
                            }}
                            className="flex items-center gap-2 text-primary hover:underline"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                            Ubah Metode
                        </button>
                        {/* Payment Display (QRIS or VA) */}
                        <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center border border-border shadow-inner">
                            {paymentMethod === 'qris' ? (
                                transactionData?.qrisData?.actions?.find((a: any) => a.name === 'generate-qr-code') ? (
                                    <div className="space-y-4 text-center">
                                        <img
                                            src={transactionData.qrisData.actions.find((a: any) => a.name === 'generate-qr-code').url}
                                            alt="QRIS Code"
                                            className="w-64 h-64 object-contain mx-auto"
                                        />
                                        <div className="flex items-center justify-center gap-2">
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg" alt="QRIS" className="h-6" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-64 h-64 bg-slate-100 rounded-xl flex items-center justify-center animate-pulse">
                                        <span className="material-symbols-outlined text-4xl text-slate-300">qr_code_2</span>
                                    </div>
                                )
                            ) : paymentMethod === 'va' ? (
                                <div className="w-full space-y-6">
                                    <div className="text-center">
                                        <p className="text-sm text-muted-foreground mb-1">
                                            {selectedBank === 'bca' ? 'BCA Virtual Account' :
                                                selectedBank === 'mandiri' ? 'Mandiri Bill Payment' :
                                                    'BNI Virtual Account'}
                                        </p>

                                        {selectedBank === 'mandiri' ? (
                                            <div className="space-y-4 mt-2">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Kode Perusahaan (Biller Code)</p>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="text-xl font-mono font-bold tracking-wider text-primary">
                                                            {transactionData?.qrisData?.biller_code || '-'}
                                                        </span>
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(transactionData?.qrisData?.biller_code || '')}
                                                            className="p-2 hover:bg-accent rounded-lg transition-colors"
                                                            title="Salin Kode Perusahaan"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">content_copy</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Kode Bayar (Bill Key)</p>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="text-xl font-mono font-bold tracking-wider text-primary">
                                                            {transactionData?.qrisData?.bill_key || '-'}
                                                        </span>
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(transactionData?.qrisData?.bill_key || '')}
                                                            className="p-2 hover:bg-accent rounded-lg transition-colors"
                                                            title="Salin Kode Bayar"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">content_copy</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 mb-2">
                                                <span className="text-xl font-mono font-bold tracking-wider text-primary">
                                                    {transactionData?.qrisData?.va_numbers?.[0]?.va_number ||
                                                        transactionData?.qrisData?.permata_va_number || '-'}
                                                </span>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(
                                                        transactionData?.qrisData?.va_numbers?.[0]?.va_number || ''
                                                    )}
                                                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                                                    title="Salin Nomor VA"
                                                >
                                                    <span className="material-symbols-outlined text-lg">content_copy</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <p className="text-xs text-muted-foreground text-center mb-2">Total Pembayaran</p>
                                        <p className="text-xl font-bold text-center text-slate-800">
                                            Rp {total.toLocaleString('id-ID')}
                                        </p>
                                    </div>

                                    <div className="text-xs text-center text-muted-foreground">
                                        <p>Bayar sebelum:</p>
                                        <p className="font-medium text-orange-600">
                                            {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="text-center space-y-2">
                            {paymentMethod === 'qris' && (
                                <p className="text-sm text-muted-foreground">
                                    Scan QR code untuk membayar
                                </p>
                            )}
                            <div className="flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400">
                                <span className="material-symbols-outlined">schedule</span>
                                <span className="font-mono font-bold text-lg">
                                    {formatTime(countdown)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Kode berlaku hingga waktu habis
                            </p>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">
                                schedule
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    Menunggu Pembayaran...
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Silakan selesaikan pembayaran di aplikasi
                                </p>
                            </div>
                        </div>

                        {/* Demo: Simulate Payment Button removed */}
                    </div>
                )}

                {/* Receipt and Actions - Only show on success */}
                {paymentStatus === 'success' && (
                    <>
                        {/* Receipt Content */}
                        <div className="print:m-0 print:p-0 bg-background overflow-hidden relative">
                            <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar print:max-h-none print:overflow-visible">
                                <div className="bg-white text-black p-6 md:p-8 rounded-2xl border border-dashed border-gray-300 shadow-sm font-mono text-xs md:text-sm print:fixed print:inset-0 print:border-none print:shadow-none print:bg-white print:text-black">
                                    {/* Success Badge (Screen Only) */}
                                    <div className="flex justify-center mb-6 print:hidden">
                                        <div className="bg-green-50 text-green-600 px-4 py-2 rounded-full flex items-center gap-2 border border-green-100 animate-bounce">
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Transaksi Berhasil</span>
                                        </div>
                                    </div>

                                    <div className="text-center mb-6 pb-6 border-b border-dashed border-gray-200">
                                        <h3 className="font-bold text-xl uppercase mb-1 tracking-tighter text-gray-900">POS CAFE</h3>
                                        <div className="inline-block px-3 py-1 bg-gray-900 text-white rounded font-bold text-[10px] mb-3 tracking-widest leading-none">LUNAS</div>
                                        <p className="text-[10px] text-gray-500 max-w-[200px] mx-auto leading-relaxed">Jl. Kebangsaan No. 45, Jakarta Pusat</p>
                                        <p className="text-[10px] text-gray-500">WA: 0812-8888-9999</p>
                                    </div>

                                    <div className="space-y-1.5 mb-6 text-[10px] md:text-xs">
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span>Order No.</span>
                                            <span className="font-bold text-gray-900">{(transactionData?.transactionNumber || '#0000').slice(-8)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span>Waktu</span>
                                            <span className="text-gray-900">{new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span>Kasir</span>
                                            <span className="text-gray-900 truncate max-w-[80px]">{user?.fullName || 'Kasir'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span>Meja</span>
                                            <span className="text-gray-900 font-bold">{tableNumber || '-'}</span>
                                        </div>
                                        {customerName && (
                                            <div className="flex justify-between items-center text-gray-600">
                                                <span>Pelanggan</span>
                                                <span className="text-gray-900">{customerName}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t border-dashed border-gray-200 pt-4 mb-4">
                                        <div className="font-bold text-[10px] text-gray-400 mb-3 uppercase tracking-widest">Detail Pesanan</div>
                                        <div className="space-y-3">
                                            {items.map((item) => (
                                                <div key={item.id} className="flex justify-between items-start gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-gray-900 font-bold uppercase truncate">{item.name}</div>
                                                        <div className="text-[10px] text-gray-400 font-medium">
                                                            {item.quantity} x {item.price.toLocaleString('id-ID')}
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-gray-900 font-bold">
                                                        {(item.price * item.quantity).toLocaleString('id-ID')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border-t border-dashed border-gray-200 pt-4 mt-6 space-y-2">
                                        <div className="flex justify-between text-gray-600">
                                            <span>Subtotal</span>
                                            <span className="font-medium text-gray-900">{items.reduce((acc, i) => acc + (i.price * i.quantity), 0).toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                            <span>PPN (11%)</span>
                                            <span className="font-medium text-gray-900">{(items.reduce((acc, i) => acc + (i.price * i.quantity), 0) * 0.11).toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-lg pt-2 mt-2 border-t border-gray-900 text-gray-900">
                                            <span className="tracking-tighter">TOTAL</span>
                                            <span>Rp {total.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-4 border-t border-dashed border-gray-200 space-y-2">
                                        <div className="flex justify-between text-[10px] text-gray-600">
                                            <span className="uppercase tracking-widest">Metode Bayar</span>
                                            <span className="font-bold uppercase">{paymentMethod === 'cash' ? 'Tunai' : (paymentMethod || '-')}</span>
                                        </div>
                                        {paymentMethod === 'cash' && (
                                            <>
                                                <div className="flex justify-between text-[10px] text-gray-600">
                                                    <span>Bayar</span>
                                                    <span className="text-gray-900 font-medium">{cashAmount.toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="flex justify-between text-[10px] font-bold text-green-600 bg-green-50 -mx-2 px-2 py-1 rounded">
                                                    <span>Kembalian</span>
                                                    <span>Rp {(cashAmount - total).toLocaleString('id-ID')}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="text-center mt-10 space-y-1">
                                        <div className="text-[10px] font-bold text-gray-900 uppercase tracking-[0.2em]">Terima Kasih</div>
                                        <p className="text-[8px] text-gray-400">Silakan berkunjung kembali!</p>
                                        <div className="mt-4 flex justify-between text-gray-300 text-[8px] opacity-50">
                                            <span>✂️</span>
                                            <span>--------------------------------</span>
                                            <span>✂️</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div >

                        <div className="flex flex-col sm:flex-row gap-3 pt-6 print:hidden">
                            <button
                                onClick={handlePrintReceipt}
                                className="flex-1 h-14 bg-accent text-foreground font-bold rounded-2xl hover:bg-accent/80 transition-all flex items-center justify-center gap-3 border border-border group"
                            >
                                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">print</span>
                                Cetak Struk
                            </button>
                            <button
                                onClick={handleFinish}
                                className="flex-1 h-14 bg-primary text-primary-foreground font-bold rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/25 group"
                            >
                                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">done_all</span>
                                Selesai
                            </button>
                        </div>
                    </>
                )}

                {/* Failed/Expired State */}
                {paymentStatus === 'failed' && (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-5xl text-red-500">
                                error
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-foreground mb-2">
                            {paymentMethod === 'cash' ? 'Pembayaran Gagal' : 'Pembayaran Kadaluarsa'}
                        </p>
                        <p className="text-sm text-muted-foreground mb-6">
                            {transactionData?.error || 'Waktu pembayaran telah habis atau terjadi kesalahan teknis.'}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 bg-accent text-foreground font-semibold py-3 rounded-xl hover:bg-accent/80 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    setPaymentMethod(null);
                                    setPaymentStatus('selecting');
                                    setCountdown(300);
                                }}
                                className="flex-1 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    </div>
                )}
            </div >
        </div >
    );
}
