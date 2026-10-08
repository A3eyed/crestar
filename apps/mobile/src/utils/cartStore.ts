// @ts-nocheck
import { create } from 'zustand';
import AsyncStorage from './safeStorage';

// Generate a unique cart item key based on product ID + variant selections
const getCartItemKey = (product) => {
  const parts = [product.id];
  if (product.selectedColor) parts.push(`c:${product.selectedColor}`);
  if (product.selectedSize) parts.push(`s:${product.selectedSize}`);
  return parts.join('_');
};

const useCartStore = create((set, get) => ({
  items: [],
  totalItems: 0,
  totalPrice: 0,

  // TikTok-style direct purchase: "Buy Now" bypasses the cart entirely.
  // Holds a single item (with quantity) for the express checkout lane.
  buyNowItem: null,

  setBuyNowItem: (product, quantity = 1) => {
    const cleanPrice =
      typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
    const cartKey = getCartItemKey(product);
    set({
      buyNowItem: { ...product, price: cleanPrice, cartKey, quantity },
    });
  },

  clearBuyNowItem: () => {
    set({ buyNowItem: null });
  },

  // Add item to cart
  addItem: async (product, quantity = 1) => {
    const { items } = get();
    const cartKey = getCartItemKey(product);
    const existingIndex = items.findIndex((item) => getCartItemKey(item) === cartKey);

    // CRITICAL FIX: Ensure price is a clean number to prevent price inflation
    const cleanPrice =
      typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;

    let newItems;
    if (existingIndex >= 0) {
      newItems = [...items];
      newItems[existingIndex].quantity += quantity;
    } else {
      newItems = [...items, { ...product, price: cleanPrice, cartKey, quantity }];
    }

    const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = newItems.reduce((sum, item) => {
      const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      return sum + itemPrice * item.quantity;
    }, 0);

    set({ items: newItems, totalItems, totalPrice });
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(newItems));
    } catch (err) {
      console.error('Failed to save cart:', err);
    }
  },

  // Remove item from cart
  removeItem: async (productId) => {
    const { items } = get();
    // Support removal by either productId or cartKey
    const newItems = items.filter((item) => item.id !== productId && item.cartKey !== productId);

    const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = newItems.reduce((sum, item) => {
      const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      return sum + itemPrice * item.quantity;
    }, 0);

    set({ items: newItems, totalItems, totalPrice });
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(newItems));
    } catch (err) {
      console.error('Failed to save cart:', err);
    }
  },

  // Update quantity
  updateQuantity: async (productId, quantity) => {
    const { items } = get();
    const newItems = items.map((item) =>
      item.id === productId || item.cartKey === productId ? { ...item, quantity } : item
    );

    const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = newItems.reduce((sum, item) => {
      const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      return sum + itemPrice * item.quantity;
    }, 0);

    set({ items: newItems, totalItems, totalPrice });
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(newItems));
    } catch (err) {
      console.error('Failed to save cart:', err);
    }
  },

  // Clear cart
  clearCart: async () => {
    set({ items: [], totalItems: 0, totalPrice: 0 });
    try {
      await AsyncStorage.removeItem('cart');
    } catch (err) {
      console.error('Failed to clear cart:', err);
    }
  },

  // Load cart from storage
  loadCart: async () => {
    try {
      const stored = await AsyncStorage.getItem('cart');
      if (stored) {
        const items = JSON.parse(stored);
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = items.reduce((sum, item) => {
          const itemPrice =
            typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
          return sum + itemPrice * item.quantity;
        }, 0);
        set({ items, totalItems, totalPrice });
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  },
}));

export default useCartStore;
