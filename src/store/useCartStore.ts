import { create } from 'zustand';

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    image: string;
}

interface CartState {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (id: string) => void;
    increaseQuantity: (id: string) => void;
    decreaseQuantity: (id: string) => void;
    clearCart: () => void;
    total: number;
    calculateTotal: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],
    total: 0,
    addItem: (item) => set((state) => {
        const existingItem = state.items.find((i) => i.id === item.id);
        if (existingItem) {
            return {
                items: state.items.map((i) =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                ),
            };
        }
        return { items: [...state.items, { ...item, quantity: 1 }] };
    }),
    removeItem: (id) => set((state) => ({
        items: state.items.filter((i) => i.id !== id),
    })),
    increaseQuantity: (id) => set((state) => ({
        items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: i.quantity + 1 } : i
        ),
    })),
    decreaseQuantity: (id) => set((state) => ({
        items: state.items.map((i) =>
            i.id === id && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i
        ),
    })),
    clearCart: () => set({ items: [] }),
    calculateTotal: () => {
        // implementation if needed, though simpler to compute in component
    }
}));
