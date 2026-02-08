'use client';

import { useCartStore } from '@/store/useCartStore';
import { ModeToggle } from '@/components/mode-toggle';
import { PaymentModal } from '@/components/PaymentModal';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Category, MenuItem } from '@/types/api';
import { useSession, signOut } from 'next-auth/react';

export default function POSPage() {
  const { items, removeItem, increaseQuantity, decreaseQuantity, addItem, clearCart } = useCartStore();
  const { data: session } = useSession();
  const user = session?.user;
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [customerName, setCustomerName] = useState('Guest');
  const [tableNumber, setTableNumber] = useState('00');

  // Data State
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storeName, setStoreName] = useState('Cafe POS');

  useEffect(() => {
    setMounted(true);
    fetchData();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      const data = response.data as any;
      if (data?.storeName) {
        setStoreName(data.storeName);
        document.title = `${data.storeName} - POS`;
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [catsRes, menuRes] = await Promise.all([
        api.get<Category[]>('/categories'),
        api.get<MenuItem[]>('/menu')
      ]);

      setCategories(catsRes.data);
      setMenuItems(menuRes.data);
      if (catsRes.data.length > 0) {
        setSelectedCategory('all'); // Use 'all' for "Semua Menu"
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setDateStr(new Date().toLocaleDateString('id-ID', options));
  }, []);

  if (!mounted) return null;

  const cartTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = cartTotal * 0.11;
  const finalTotal = cartTotal + tax;

  const filteredMenu = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.categoryId === selectedCategory);

  const handleAddToCart = (menuItem: MenuItem) => {
    addItem({
      id: menuItem.id,
      name: menuItem.name,
      price: Number(menuItem.price),
      image: menuItem.image,
      notes: '',
    });
  };

  const handlePaymentSuccess = () => {
    clearCart();
    setShowCart(false);
    alert('Pembayaran berhasil! Pesanan telah dikirim ke dapur.');
  };

  return (
    <main className="flex h-screen overflow-hidden bg-background">
      {/* Mobile: Cart Overlay */}
      {showCart && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setShowCart(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile */}
      <aside className="hidden lg:flex w-20 flex-none bg-card border-r border-border flex-col items-center py-6 gap-8">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-[0_0_15px_rgba(236,146,19,0.4)]">
          <span className="material-symbols-outlined">local_cafe</span>
        </div>

        <nav className="flex flex-col gap-6 w-full items-center">
          <button className="group flex items-center justify-center w-12 h-12 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Dashboard">
            <span className="material-symbols-outlined">grid_view</span>
          </button>
          <button className="group flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary shadow-inner" title="Pesanan">
            <span className="material-symbols-outlined fill">receipt_long</span>
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-6 items-center w-full">
          <ModeToggle />
          <div className="flex flex-col gap-4 items-center">
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="group flex items-center justify-center w-12 h-12 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
              title="Logout"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
            <div className="w-10 h-10 rounded-full bg-secondary border border-border overflow-hidden">
              <img
                alt="Profile"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9CYKyBgEZR7xMfzPY-kt1SCT7pTELAiYo2VaGMPL2Vnanusnb6li_P0OeMOLZAYtuyOrYwto3lcPSLJsp_wm09E5_gV7aaI1-QSXEzUz0dNxip_4i1OGYj9oiI_2IgVa8GHsJYI4o2N9fQMKQEpJ-7wGnLfptljEDfLrqp30kOM3FNsPxLzK6ZLuRriaWACnsdf7HYvk6bYUfVg9aHxwka35JC65Exc7ofADOT7uohDo4DcOvHrhmVJqVmAknYIA9Dan0byAzbOI"
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT: Menu Catalog */}
        <section className="flex-1 flex flex-col bg-background">
          {/* Header */}
          <header className="flex items-center justify-between px-4 md:px-6 lg:px-8 py-4 lg:py-6 border-b border-border lg:border-none">
            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">{storeName}</h1>
              <p className="text-muted-foreground text-xs md:text-sm hidden md:block">{dateStr}</p>
            </div>

            {/* Mobile: Cart Button */}
            <button
              onClick={() => setShowCart(true)}
              className="lg:hidden relative w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
            >
              <span className="material-symbols-outlined">shopping_cart</span>
              {items.length > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {items.length}
                </span>
              )}
            </button>
          </header>

          {/* Categories */}
          <div className="px-4 md:px-6 lg:px-8 py-3 lg:py-4 overflow-x-auto">
            <div className="flex gap-2 md:gap-3">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex h-9 md:h-10 px-3 md:px-5 shrink-0 items-center justify-center gap-x-2 rounded-xl font-medium text-xs md:text-sm transition-all ${selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-card border border-input text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
              >
                <span className="material-symbols-outlined text-base md:text-[20px]">lunch_dining</span>
                <span className="hidden sm:inline">Semua Menu</span>
              </button>

              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex h-9 md:h-10 px-3 md:px-5 shrink-0 items-center justify-center gap-x-2 rounded-xl font-medium text-xs md:text-sm transition-all ${selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'bg-card border border-input text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                >
                  <span className="material-symbols-outlined text-base md:text-[20px]">
                    {category.icon}
                  </span>
                  <span className="hidden sm:inline">{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Menu Grid */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 md:gap-4 lg:gap-6 pb-20 lg:pb-4">
              {filteredMenu.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleAddToCart(item)}
                  className="group relative flex flex-col bg-card rounded-xl lg:rounded-2xl p-2 md:p-3 border border-border hover:border-primary/30 transition-all hover:shadow-xl cursor-pointer"
                >
                  <div className="relative w-full aspect-square rounded-lg lg:rounded-xl overflow-hidden mb-2 md:mb-3 bg-secondary">
                    <div
                      className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url('${item.image}')` }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                      <div className="bg-primary text-primary-foreground p-2 md:p-3 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                        <span className="material-symbols-outlined text-lg md:text-xl">add</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 px-1">
                    <h3 className="text-foreground font-bold text-xs md:text-sm lg:text-base leading-tight line-clamp-2">{item.name}</h3>
                    <p className="text-primary font-semibold text-xs md:text-sm">Rp {Number(item.price).toLocaleString('id-ID')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT: Cart Panel - Desktop fixed, Mobile slide-up */}
        <section
          className={`fixed lg:static bottom-0 left-0 right-0 lg:flex-none lg:w-[400px] xl:w-[450px] flex flex-col bg-card shadow-2xl border-t lg:border-t-0 lg:border-l border-border z-50 transform transition-transform duration-300 ${showCart ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
            }`}
        >
          {/* Cart Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Pesanan #00124</h2>
            <button
              onClick={() => setShowCart(false)}
              className="lg:hidden w-10 h-10 rounded-xl hover:bg-accent transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Customer Details */}
          <div className="p-4 md:p-6 space-y-3 border-b border-border hidden md:block">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Nama Pelanggan</label>
                <div className="flex items-center bg-background rounded-lg px-3 py-2 border border-input">
                  <span className="material-symbols-outlined text-muted-foreground text-[20px] mr-2">person</span>
                  <input
                    className="bg-transparent border-none text-foreground text-sm w-full focus:ring-0 p-0"
                    placeholder="Nama Pelanggan"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-span-1">
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Meja</label>
                <div className="flex items-center bg-background rounded-lg px-3 py-2 border border-input">
                  <span className="material-symbols-outlined text-muted-foreground text-[20px] mr-2">table_restaurant</span>
                  <input
                    className="bg-transparent border-none text-foreground text-sm w-full focus:ring-0 p-0 text-center font-semibold"
                    type="text"
                    placeholder="00"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">{user?.role || 'Guest'}</span>
                <span className="text-xs text-muted-foreground">{user?.fullName || 'Guest'}</span>
              </div>
              <span className="text-xs text-muted-foreground">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
            {items.length === 0 && (
              <div className="text-center py-8 md:py-12">
                <span className="material-symbols-outlined text-4xl md:text-6xl text-muted-foreground mb-2 md:mb-4 block">shopping_cart</span>
                <p className="text-muted-foreground text-sm md:text-base">Belum ada pesanan</p>
              </div>
            )}

            {items.map((item) => (
              <div key={item.id} className="flex gap-3 md:gap-4 items-center group">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg bg-secondary shrink-0 overflow-hidden">
                  <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${item.image}')` }}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-foreground text-sm md:text-base truncate pr-2">{item.name}</h4>
                    <span className="font-semibold text-foreground text-sm md:text-base whitespace-nowrap">{(item.price * item.quantity).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 md:gap-3 bg-background rounded-lg p-1 border border-input">
                      <button
                        onClick={() => decreaseQuantity(item.id)}
                        className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded bg-card text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm md:text-base">remove</span>
                      </button>
                      <span className="text-sm md:text-base font-semibold w-4 md:w-6 text-center text-foreground">{item.quantity}</span>
                      <button
                        onClick={() => increaseQuantity(item.id)}
                        className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded bg-card text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm md:text-base">add</span>
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1"
                    >
                      <span className="material-symbols-outlined text-lg md:text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer: Total & Payment */}
          <div className="bg-card p-4 md:p-6 border-t border-border shadow-[0_-5px_15px_rgba(0,0,0,0.1)] dark:shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
            <div className="space-y-1 md:space-y-2 mb-4 md:mb-6">
              <div className="flex justify-between items-center text-muted-foreground text-xs md:text-sm">
                <span>Subtotal</span>
                <span>Rp {cartTotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground text-xs md:text-sm">
                <span>Pajak (11%)</span>
                <span>Rp {tax.toLocaleString('id-ID')}</span>
              </div>
              <div className="h-px bg-border my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-bold text-base md:text-lg">Total</span>
                <span className="text-primary font-bold text-xl md:text-2xl">Rp {finalTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={items.length === 0}
              className="w-full h-12 md:h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base md:text-lg rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>Bayar Sekarang</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </section>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          total={finalTotal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          customerName={customerName}
          tableNumber={tableNumber}
        />
      )}
    </main>
  );
}
