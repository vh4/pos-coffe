'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function AdminSettingsPage() {
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState({
        id: '',
        storeName: '',
        storeAddress: '',
        storePhone: '',
        storeEmail: '',
        currency: 'IDR',
        taxRate: 0,
        serviceCharge: 0,
        autoAcceptOrders: false,
        enableNotifications: true,
        receiptFooter: '',
    });

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/settings');
            const data = response.data as any;
            setSettings({
                ...data,
                taxRate: Number(data.taxRate || 0),
                serviceCharge: Number(data.serviceCharge || 0),
            });
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchSettings();
    }, []);

    if (!mounted) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            await api.put('/settings', settings);
            alert('Settings berhasil disimpan!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Gagal menyimpan settings');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-card border-b border-border px-8 py-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Settings</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Konfigurasi aplikasi dan toko
                    </p>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 bg-background">
                <div className="max-w-4xl mx-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
                            <p className="text-muted-foreground animate-pulse">Memuat konfigurasi...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-8">
                            {/* Store Information */}
                            <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">store</span>
                                    Informasi Toko
                                </h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Nama Toko
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.storeName}
                                            onChange={(e) =>
                                                setSettings({ ...settings, storeName: e.target.value })
                                            }
                                            className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Alamat
                                        </label>
                                        <textarea
                                            value={settings.storeAddress}
                                            onChange={(e) =>
                                                setSettings({ ...settings, storeAddress: e.target.value })
                                            }
                                            className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 resize-none"
                                            rows={2}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Telepon
                                            </label>
                                            <input
                                                type="tel"
                                                value={settings.storePhone}
                                                onChange={(e) =>
                                                    setSettings({ ...settings, storePhone: e.target.value })
                                                }
                                                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={settings.storeEmail}
                                                onChange={(e) =>
                                                    setSettings({ ...settings, storeEmail: e.target.value })
                                                }
                                                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment & Tax Settings */}
                            <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">
                                        payments
                                    </span>
                                    Payment & Tax
                                </h2>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Currency
                                            </label>
                                            <select
                                                value={settings.currency}
                                                onChange={(e) =>
                                                    setSettings({ ...settings, currency: e.target.value })
                                                }
                                                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                            >
                                                <option value="IDR">IDR (Rp)</option>
                                                <option value="USD">USD ($)</option>
                                                <option value="SGD">SGD (S$)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Tax Rate (%)
                                            </label>
                                            <input
                                                type="number"
                                                value={settings.taxRate}
                                                onChange={(e) =>
                                                    setSettings({ ...settings, taxRate: Number(e.target.value) })
                                                }
                                                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                                min="0"
                                                max="100"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Service Charge (%)
                                            </label>
                                            <input
                                                type="number"
                                                value={settings.serviceCharge}
                                                onChange={(e) =>
                                                    setSettings({
                                                        ...settings,
                                                        serviceCharge: Number(e.target.value),
                                                    })
                                                }
                                                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                                min="0"
                                                max="100"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Operations */}
                            <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">
                                        settings
                                    </span>
                                    Operations
                                </h2>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-input">
                                        <div>
                                            <p className="font-semibold text-foreground">
                                                Auto Accept Orders
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Otomatis terima pesanan baru ke kitchen
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSettings({
                                                    ...settings,
                                                    autoAcceptOrders: !settings.autoAcceptOrders,
                                                })
                                            }
                                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${settings.autoAcceptOrders ? 'bg-primary' : 'bg-input'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${settings.autoAcceptOrders ? 'translate-x-7' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-input">
                                        <div>
                                            <p className="font-semibold text-foreground">
                                                Enable Notifications
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Aktifkan notifikasi untuk order baru
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSettings({
                                                    ...settings,
                                                    enableNotifications: !settings.enableNotifications,
                                                })
                                            }
                                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${settings.enableNotifications ? 'bg-primary' : 'bg-input'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${settings.enableNotifications ? 'translate-x-7' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Receipt Settings */}
                            <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">
                                        receipt
                                    </span>
                                    Receipt Settings
                                </h2>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Receipt Footer Text
                                    </label>
                                    <textarea
                                        value={settings.receiptFooter}
                                        onChange={(e) =>
                                            setSettings({ ...settings, receiptFooter: e.target.value })
                                        }
                                        className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 resize-none"
                                        rows={3}
                                        placeholder="Text yang muncul di footer struk..."
                                    />
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end gap-4">
                                <button
                                    type="button"
                                    className="bg-accent text-foreground font-semibold px-8 py-3 rounded-xl hover:bg-accent/80 transition-colors"
                                >
                                    Reset
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <span className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full"></span>
                                    ) : (
                                        <span className="material-symbols-outlined">save</span>
                                    )}
                                    {isSaving ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
