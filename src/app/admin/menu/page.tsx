'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Category, MenuItem } from '@/types/api';

export default function AdminMenuPage() {
    const [mounted, setMounted] = useState(false);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        categoryId: '',
        price: 0,
        image: '',
        isAvailable: true,
        description: '',
    });
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [menuRes, catRes] = await Promise.all([
                api.get('/menu'),
                api.get('/categories')
            ]);
            setMenuItems(menuRes.data);
            setCategories(catRes.data);
            if (catRes.data.length > 0 && !formData.categoryId) {
                setFormData(prev => ({ ...prev, categoryId: catRes.data[0].id }));
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchData();
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setViewMode('grid');
        }
    }, []);

    if (!mounted) return null;

    const filteredItems = menuItems.filter((item) => {
        const matchesCategory =
            selectedCategory === 'all' || item.categoryId === selectedCategory;
        const matchesSearch =
            item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleOpenModal = (item?: MenuItem) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                categoryId: item.categoryId,
                price: Number(item.price),
                image: item.image,
                isAvailable: item.isAvailable,
                description: item.description || '',
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                categoryId: categories[0]?.id || '',
                price: 0,
                image: '',
                isAvailable: true,
                description: '',
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
            const payload = {
                ...formData,
            };

            if (editingItem) {
                await api.put(`/menu/${editingItem.id}`, payload);
                alert('Menu berhasil diupdate!');
            } else {
                await api.post('/menu', payload);
                alert('Menu berhasil ditambahkan!');
            }

            fetchData();
            handleCloseModal();
        } catch (error: any) {
            console.error('Error saving menu:', error);
            alert(error.response?.data?.message || 'Gagal menyimpan menu');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Yakin ingin menghapus menu ini?')) {
            try {
                await api.delete(`/menu/${id}`);
                setMenuItems(menuItems.filter((item) => item.id !== id));
                alert('Menu berhasil dihapus!');
            } catch (error: any) {
                console.error('Error deleting menu:', error);
                alert(error.response?.data?.message || 'Gagal menghapus menu');
            }
        }
    };

    const toggleStatus = async (item: MenuItem) => {
        try {
            await api.put(`/menu/${item.id}`, {
                ...item,
                isAvailable: !item.isAvailable
            });
            setMenuItems(
                menuItems.map((m) =>
                    m.id === item.id
                        ? { ...m, isAvailable: !m.isAvailable }
                        : m
                )
            );
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-card border-b border-border px-4 md:px-8 py-4 md:py-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Menu Management</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Kelola daftar menu dan harga
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Search */}
                        <div className="w-full sm:w-64">
                            <div className="flex items-center bg-background border border-input rounded-xl px-4 py-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                <span className="material-symbols-outlined text-muted-foreground mr-2 text-xl">
                                    search
                                </span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 text-sm"
                                    placeholder="Cari menu..."
                                />
                            </div>
                        </div>
                        {/* Add Button */}
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined">add</span>
                            <span className="hidden sm:inline">Tambah Menu</span>
                            <span className="sm:hidden">Tambah</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background">
                {/* Category Tabs + View Mode Toggle */}
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 flex-1">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-3 md:px-5 py-2 rounded-xl font-medium text-xs md:text-sm whitespace-nowrap transition-all ${selectedCategory === 'all'
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                                : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border'
                                }`}
                        >
                            Semua Menu
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-3 md:px-5 py-2 rounded-xl font-medium text-xs md:text-sm whitespace-nowrap transition-all ${selectedCategory === cat.id
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* View Mode Toggle */}
                    <div className="hidden sm:flex gap-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card text-muted-foreground hover:bg-accent'
                                }`}
                        >
                            <span className="material-symbols-outlined">grid_view</span>
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'table'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card text-muted-foreground hover:bg-accent'
                                }`}
                        >
                            <span className="material-symbols-outlined">table_rows</span>
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                ) : (
                    <>
                        {/* Grid View */}
                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                {filteredItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-card border border-border rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all"
                                    >
                                        <div
                                            className="w-full aspect-square rounded-xl bg-secondary bg-cover bg-center mb-4"
                                            style={{ backgroundImage: `url('${item.image}')` }}
                                        />
                                        <div className="space-y-3">
                                            <div>
                                                <h3 className="font-bold text-foreground text-base md:text-lg">
                                                    {item.name}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">{item.categoryName}</p>
                                            </div>
                                            <p className="text-primary font-bold text-lg">
                                                Rp {item.price.toLocaleString('id-ID')}
                                            </p>
                                            <button
                                                onClick={() => toggleStatus(item)}
                                                className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${item.isAvailable
                                                    ? 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
                                                    : 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                                                    }`}
                                            >
                                                {item.isAvailable ? '🟢 Available' : '🔴 Unavailable'}
                                            </button>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(item)}
                                                    className="flex-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="flex-1 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Table View */}
                        {viewMode === 'table' && (
                            <div className="bg-card border border-border rounded-2xl shadow-lg overflow-x-auto">
                                <table className="w-full min-w-[640px]">
                                    <thead className="bg-accent border-b border-border">
                                        <tr>
                                            <th className="text-left py-4 px-4 md:px-6 text-sm font-semibold text-foreground">Image</th>
                                            <th className="text-left py-4 px-4 md:px-6 text-sm font-semibold text-foreground">Nama</th>
                                            <th className="text-left py-4 px-4 md:px-6 text-sm font-semibold text-foreground">Kategori</th>
                                            <th className="text-left py-4 px-4 md:px-6 text-sm font-semibold text-foreground">Harga</th>
                                            <th className="text-left py-4 px-4 md:px-6 text-sm font-semibold text-foreground">Status</th>
                                            <th className="text-center py-4 px-4 md:px-6 text-sm font-semibold text-foreground">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredItems.map((item, idx) => (
                                            <tr
                                                key={item.id}
                                                className={`border-b border-border hover:bg-accent transition-colors ${idx === filteredItems.length - 1 ? 'border-0' : ''}`}
                                            >
                                                <td className="py-4 px-4 md:px-6">
                                                    <div
                                                        className="w-12 h-12 md:w-16 md:h-16 rounded-lg bg-secondary bg-cover bg-center"
                                                        style={{ backgroundImage: `url('${item.image}')` }}
                                                    />
                                                </td>
                                                <td className="py-4 px-4 md:px-6">
                                                    <p className="font-semibold text-foreground text-sm md:text-base">{item.name}</p>
                                                </td>
                                                <td className="py-4 px-4 md:px-6">
                                                    <span className="text-xs md:text-sm text-muted-foreground">{item.categoryName}</span>
                                                </td>
                                                <td className="py-4 px-4 md:px-6">
                                                    <span className="font-semibold text-foreground text-sm md:text-base">
                                                        Rp {item.price.toLocaleString('id-ID')}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 md:px-6">
                                                    <button
                                                        onClick={() => toggleStatus(item)}
                                                        className={`px-2 md:px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${item.isAvailable
                                                            ? 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
                                                            : 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                                                            }`}
                                                    >
                                                        {item.isAvailable ? '🟢' : '🔴'}
                                                        <span className="hidden md:inline ml-1">
                                                            {item.isAvailable ? 'Available' : 'Unavailable'}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="py-4 px-4 md:px-6">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleOpenModal(item)}
                                                            className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center"
                                                        >
                                                            <span className="material-symbols-outlined text-base md:text-lg">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                                                        >
                                                            <span className="material-symbols-outlined text-base md:text-lg">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {filteredItems.length === 0 && (
                            <div className="py-20 text-center">
                                <span className="material-symbols-outlined text-6xl text-muted-foreground mb-4 block">search_off</span>
                                <p className="text-muted-foreground">Tidak ada menu yang ditemukan</p>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl md:text-2xl font-bold text-foreground">
                                {editingItem ? 'Edit Menu' : 'Tambah Menu Baru'}
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
                                <label className="block text-sm font-medium text-foreground mb-2">Nama Menu *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                    placeholder="Contoh: Cappuccino"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Kategori *</label>
                                    <select
                                        value={formData.categoryId}
                                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                        className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                        required
                                    >
                                        <option value="" disabled>Pilih Kategori</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Harga *</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                        className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                        placeholder="35000"
                                        required
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Image URL *</label>
                                <input
                                    type="url"
                                    value={formData.image}
                                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                    className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                    placeholder="https://..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                                <select
                                    value={formData.isAvailable ? 'available' : 'unavailable'}
                                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.value === 'available' })}
                                    className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="available">Available</option>
                                    <option value="unavailable">Unavailable</option>
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
                                    {editingItem ? 'Update Menu' : 'Simpan Menu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
