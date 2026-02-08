'use client';

import { useState, useEffect } from 'react';



import api from '@/lib/api';

interface Category {
    id: string;
    name: string;
    icon: string;
    description: string;
    itemCount: number;
    status: 'active' | 'inactive';
}

export default function AdminCategoriesPage() {
    const [mounted, setMounted] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCategories = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/categories');
            const mappedCategories = (response.data as any[]).map((c: any) => ({
                id: c.id,
                name: c.name,
                icon: c.icon,
                description: c.description || '',
                itemCount: Number(c.item_count || 0),
                status: (c.isActive ? 'active' : 'inactive') as 'active' | 'inactive',
            }));
            setCategories(mappedCategories);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            // Don't alert on load, just log
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchCategories();
    }, []);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Category | null>(null);
    const [formData, setFormData] = useState<Omit<Category, 'id' | 'itemCount'>>({
        name: '',
        icon: 'category',
        description: '',
        status: 'active',
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const handleOpenModal = (item?: Category) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                icon: item.icon,
                description: item.description,
                status: item.status,
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                icon: 'category',
                description: '',
                status: 'active',
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingItem(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingItem) {
                await api.put(`/categories/${editingItem.id}`, {
                    name: formData.name,
                    icon: formData.icon,
                    description: formData.description,
                    isActive: formData.status === 'active',
                });
                alert('Kategori berhasil diupdate!');
            } else {
                await api.post('/categories', {
                    name: formData.name,
                    icon: formData.icon,
                    description: formData.description,
                });
                alert('Kategori berhasil ditambahkan!');
            }

            fetchCategories();
            handleCloseModal();
        } catch (error: any) {
            console.error('Error saving category:', error);
            alert(error.response?.data?.message || 'Gagal menyimpan kategori');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Yakin ingin menghapus kategori ini?')) {
            try {
                await api.delete(`/categories/${id}`);
                setCategories(categories.filter((cat) => cat.id !== id));
                alert('Kategori berhasil dihapus!');
            } catch (error: any) {
                console.error('Error deleting category:', error);
                alert(error.response?.data?.message || 'Gagal menghapus kategori');
            }
        }
    };

    const toggleStatus = async (id: string) => {
        try {
            await api.patch(`/categories/${id}/status`);

            // Optimistic update
            setCategories(
                categories.map((cat) =>
                    cat.id === id
                        ? { ...cat, status: cat.status === 'active' ? 'inactive' : 'active' }
                        : cat
                )
            );
        } catch (error: any) {
            console.error('Error updating status:', error);
            alert('Gagal mengupdate status kategori');
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-card border-b border-border px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Category</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Kelola kategori menu
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Tambah
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 bg-background">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((category) => (
                        <div
                            key={category.id}
                            className="bg-card border border-border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
                        >
                            {/* Category Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-2xl text-primary">
                                            {category.icon}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground">
                                            {category.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {category.itemCount} items
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleStatus(category.id)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${category.status === 'active'
                                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                        : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                        }`}
                                >
                                    {category.status === 'active' ? '🟢' : '🔴'}
                                </button>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-muted-foreground mb-6">
                                {category.description}
                            </p>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleOpenModal(category)}
                                    className="flex-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">edit</span>
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(category.id)}
                                    className="flex-1 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl p-8 max-w-xl w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-foreground">
                                {editingItem ? 'Edit Kategori' : 'Tambah Kategori Baru'}
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
                                    Nama Kategori *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                    placeholder="Contoh: Dessert"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Icon (Material Symbol) *
                                </label>
                                <input
                                    type="text"
                                    value={formData.icon}
                                    onChange={(e) =>
                                        setFormData({ ...formData, icon: e.target.value })
                                    }
                                    className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                    placeholder="cake"
                                    required
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Lihat icon di{' '}
                                    <a
                                        href="https://fonts.google.com/icons"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                    >
                                        Google Fonts
                                    </a>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Deskripsi *
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 resize-none"
                                    placeholder="Deskripsi singkat kategori ini..."
                                    rows={3}
                                    required
                                />
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
                                    {editingItem ? 'Update Kategori' : 'Simpan Kategori'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
