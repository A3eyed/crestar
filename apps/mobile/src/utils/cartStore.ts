// @ts-nocheck
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CART_STORAGE_KEY = '@crestar_cart';

export const useCartStore = create((set, get) => ({
  items: [],
  totalItems: 0,
  totalPrice: 0,
  isLoading: false,

  // Load cart from storage
  loadCart: async () => {
    try {
      set({ isLoading: true });
      const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored);
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = items.reduce((sum, item) => {
          const itemPrice = parseFloat(item.price) || 0;
          return sum + itemPrice * item.quantity;
        }, 0);
        set({ items, totalItems, totalPrice });
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Add item to cart
  addToCart: async (product, quantity = 1) => {
    const { items } = get();
    const cleanPrice = parseFloat(product.price) || 0;
    const cartKey =
      product.cartKey ||
      [
        product.id,
        product.selectedColor && 'c:' + product.selectedColor,
        product.selectedSize && 's:' + product.selectedSize,
      ]
        .filter(Boolean)
        .join('_');

    const existingIndex = items.findIndex(
      (item) => item.cartKey === cartKey || item.id === product.id,
    );

    let newItems;
    if (existingIndex >= 0) {
      newItems = [...items];
      const maxS = product.maxStock ?? product.stock ?? product.stock_quantity;
      const next = newItems[existingIndex].quantity + quantity;
      newItems[existingIndex].quantity = maxS != null ? Math.min(next, Number(maxS)) : next;
      if (maxS != null) newItems[existingIndex].maxStock = Number(maxS);
    } else {
      const maxS = product.maxStock ?? product.stock ?? product.stock_quantity;
      const qty = maxS != null ? Math.min(quantity, Number(maxS)) : quantity;
      newItems = [
        ...items,
        {
          ...product,
          price: cleanPrice,
          cartKey,
          quantity: qty,
          maxStock: maxS != null ? Number(maxS) : undefined,
        },
      ];
    }

    const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = newItems.reduce((sum, item) => {
      const itemPrice = parseFloat(item.price) || 0;
      return sum + itemPrice * item.quantity;
    }, 0);

    set({ items: newItems, totalItems, totalPrice });
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems));
  },

  // Remove item from cart
  removeFromCart: async (productId) => {
    const { items } = get();
    const newItems = items.filter(
      (item) => item.id !== productId && item.cartKey !== productId,
    );
    const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = newItems.reduce((sum, item) => {
      const itemPrice = parseFloat(item.price) || 0;
      return sum + itemPrice * item.quantity;
    }, 0);
    set({ items: newItems, totalItems, totalPrice });
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems));
  },

  // Update quantity
  updateQuantity: async (productId, quantity, maxStock) => {
    const cap = maxStock != null ? Number(maxStock) : null;
    if (cap != null && quantity > cap) quantity = cap;
    if (quantity < 1) quantity = 1;
    const { items } = get();
    const newItems = items.map((item) =>
      item.id === productId || item.cartKey === productId
        ? {
            ...item,
            quantity,
            maxStock: cap != null ? cap : item.maxStock,
          }
        : item,
    );
    const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = newItems.reduce((sum, item) => {
      const itemPrice = parseFloat(item.price) || 0;
      return sum + itemPrice * item.quantity;
    }, 0);
    set({ items: newItems, totalItems, totalPrice });
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems));
  },

  // Clear cart
  clearCart: async () => {
    set({ items: [], totalItems: 0, totalPrice: 0 });
    await AsyncStorage.removeItem(CART_STORAGE_KEY);
  },
}));
