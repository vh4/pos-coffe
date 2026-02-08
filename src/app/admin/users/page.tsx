'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'kasir' | 'chef';
    password?: string;
    status: 'active' | 'inactive';
    createdAt: Date;
}

export default function AdminUsersPage() {
    const [mounted, setMounted] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/users');
            const mappedUsers = response.data.map((u: any) => ({
                id: u.id,
                name: u.fullName,
                email: u.email,
                role: u.role,
                status: u.isActive ? 'active' : 'inactive',
                createdAt: new Date(u.createdAt),
            }));
            setUsers(mappedUsers);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            alert('Gagal mengambil data user');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchUsers();
    }, []);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'kasir' as 'admin' | 'kasir' | 'chef',
        password: '',
        status: 'active' as 'active' | 'inactive',
    });
    const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'kasir' | 'chef'>('all');

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const filteredUsers = users.filter(user =>
        filterRole === 'all' || user.role === filterRole
    );

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                role: user.role,
                password: '', // Don't show password
                status: user.status,
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                role: 'kasir',
                password: '',
                status: 'active',
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingUser(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingUser) {
                // Update
                const payload = {
                    fullName: formData.name,
                    role: formData.role,
                    isActive: formData.status === 'active',
                    ...(formData.password ? { password: formData.password } : {}),
                };

                await api.put(`/users/${editingUser.id}`, payload);
                alert('User berhasil diupdate!');
            } else {
                // Create
                const payload = {
                    email: formData.email,
                    password: formData.password,
                    fullName: formData.name,
                    role: formData.role,
                };

                await api.post('/users', payload);
                alert('User berhasil ditambahkan!');
            }

            fetchUsers(); // Refresh list
            handleCloseModal();
        } catch (error: any) {
            console.error('Error submitting form:', error);
            alert(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan user');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Yakin ingin menghapus user ini?')) {
            try {
                await api.delete(`/users/${id}`);
                setUsers(users.filter((user) => user.id !== id));
                alert('User berhasil dihapus!');
            } catch (error: any) {
                console.error('Error deleting user:', error);
                alert(error.response?.data?.message || 'Gagal menghapus user');
            }
        }
    };

    const toggleStatus = async (id: string) => {
        const user = users.find(u => u.id === id);
        if (!user) return;

        try {
            await api.put(`/users/${id}`, {
                isActive: user.status !== 'active'
            });

            // Optimistic update
            setUsers(
                users.map((u) =>
                    u.id === id
                        ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' }
                        : u
                )
            );
        } catch (error: any) {
            console.error('Error updating status:', error);
            alert('Gagal mengupdate status user');
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
            case 'kasir':
                return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            case 'chef':
                return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
            default:
                return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin':
                return 'shield';
            case 'kasir':
                return 'point_of_sale';
            case 'chef':
                return 'restaurant';
            default:
                return 'person';
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-card border-b border-border px-4 md:px-8 py-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">User Management</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Kelola akses user kasir dan chef
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Tambah User
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
                    <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-2xl md:text-3xl text-primary">
                                group
                            </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-1">
                            {users.length}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground">Total Users</p>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-2xl md:text-3xl text-blue-500">
                                point_of_sale
                            </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-1">
                            {users.filter(u => u.role === 'kasir').length}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground">Kasir</p>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-2xl md:text-3xl text-orange-500">
                                restaurant
                            </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-1">
                            {users.filter(u => u.role === 'chef').length}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground">Chef</p>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-2xl md:text-3xl text-purple-500">
                                shield
                            </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-1">
                            {users.filter(u => u.role === 'admin').length}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground">Admin</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 md:gap-3 mb-6 overflow-x-auto pb-2">
                    {[
                        { key: 'all', label: 'Semua', count: users.length },
                        { key: 'admin', label: 'Admin', count: users.filter(u => u.role === 'admin').length },
                        { key: 'kasir', label: 'Kasir', count: users.filter(u => u.role === 'kasir').length },
                        { key: 'chef', label: 'Chef', count: users.filter(u => u.role === 'chef').length },
                    ].map((filter) => (
                        <button
                            key={filter.key}
                            onClick={() => setFilterRole(filter.key as typeof filterRole)}
                            className={`px-4 md:px-5 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${filterRole === filter.key
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                                : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border'
                                }`}
                        >
                            {filter.label} ({filter.count})
                        </button>
                    ))}
                </div>

                {/* User Cards - Mobile/Tablet Friendly */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filteredUsers.map((user) => (
                        <div
                            key={user.id}
                            className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-all"
                        >
                            {/* User Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-xl md:text-2xl text-primary">
                                            {getRoleIcon(user.role)}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-base md:text-lg font-bold text-foreground">
                                            {user.name}
                                        </h3>
                                        <p className="text-xs md:text-sm text-muted-foreground">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Role & Status */}
                            <div className="flex items-center gap-2 mb-4">
                                <span
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadge(
                                        user.role
                                    )}`}
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        {getRoleIcon(user.role)}
                                    </span>
                                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </span>

                                <button
                                    onClick={() => toggleStatus(user.id)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${user.status === 'active'
                                        ? 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
                                        : 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                                        }`}
                                >
                                    {user.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleOpenModal(user)}
                                    className="flex-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <span className="material-symbols-outlined text-lg">edit</span>
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(user.id)}
                                    className="flex-1 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {filteredUsers.length === 0 && (
                    <div className="text-center py-20">
                        <span className="material-symbols-outlined text-6xl text-muted-foreground mb-4 block">
                            group_off
                        </span>
                        <p className="text-muted-foreground">Tidak ada user ditemukan</p>
                    </div>
                )}
            </main>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl md:text-2xl font-bold text-foreground">
                                {editingUser ? 'Edit User' : 'Tambah User Baru'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="w-10 h-10 rounded-full hover:bg-accent transition-colors flex items-center justify-center"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Nama Lengkap *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                    placeholder="Nama lengkap user"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                    placeholder="email@example.com"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Role *
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                role: e.target.value as 'admin' | 'kasir' | 'chef',
                                            })
                                        }
                                        className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                        required
                                    >
                                        <option value="kasir">Kasir</option>
                                        <option value="chef">Chef</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Status
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                status: e.target.value as 'active' | 'inactive',
                                            })
                                        }
                                        className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Password {editingUser ? '(Kosongkan jika tidak diubah)' : '*'}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({ ...formData, password: e.target.value })
                                    }
                                    className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                    placeholder="••••••••"
                                    required={!editingUser}
                                    minLength={6}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Minimal 6 karakter
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 bg-accent text-foreground font-semibold py-3 rounded-xl hover:bg-accent/80 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
                                >
                                    {editingUser ? 'Update User' : 'Simpan User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
