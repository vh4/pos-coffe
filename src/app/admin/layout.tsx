'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import api from '@/lib/api';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const user = session?.user;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [storeName, setStoreName] = useState('Cafe POS');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.get('/settings');
                const data = response.data as any;
                if (data?.storeName) {
                    setStoreName(data.storeName);
                    document.title = `${data.storeName} - Admin`;
                }
            } catch (error) {
                console.error('Failed to fetch settings in layout:', error);
            }
        };
        fetchSettings();
    }, []);

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/login' });
    };

    const navItems = [
        { icon: 'dashboard', label: 'Dashboard', href: '/admin/dashboard' },
        { icon: 'restaurant_menu', label: 'Menu', href: '/admin/menu' },
        { icon: 'category', label: 'Categories', href: '/admin/categories' },
        { icon: 'group', label: 'Users', href: '/admin/users' },
        { icon: 'receipt_long', label: 'Transactions', href: '/admin/transactions' },
        { icon: 'settings', label: 'Settings', href: '/admin/settings' },
    ];

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static top-0 left-0 h-full w-64 flex-none bg-card border-r border-border flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                {/* Logo */}
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
                            <span className="material-symbols-outlined text-2xl text-primary-foreground">
                                local_cafe
                            </span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">{storeName}</h1>
                            <p className="text-xs text-muted-foreground">Admin Panel</p>
                        </div>
                    </div>
                    {/* Close button for mobile */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden w-8 h-8 rounded-lg hover:bg-accent transition-colors flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                    }`}
                            >
                                <span className="material-symbols-outlined">
                                    {item.icon}
                                </span>
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-border space-y-2">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-accent">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                            {(user as any)?.fullName?.charAt(0) || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                                {(user as any)?.fullName || 'Admin'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user?.email || `admin@${storeName.replace(/\s+/g, '').toLowerCase()}.com`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                        <span className="material-symbols-outlined font-light">logout</span>
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <div className="lg:hidden bg-card border-b border-border px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="w-10 h-10 rounded-xl hover:bg-accent transition-colors flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg text-primary-foreground">
                                local_cafe
                            </span>
                        </div>
                        <h1 className="text-lg font-bold text-foreground">{storeName}</h1>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {(user as any)?.fullName?.charAt(0) || 'A'}
                    </div>
                </div>

                {children}
            </div>
        </div>
    );
}
