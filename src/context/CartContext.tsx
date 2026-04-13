import React, { createContext, useContext, useState, useCallback } from 'react';
import { getCart, updateCartItem, clearCart as apiClearCart } from '@/api/cart';
import type { Cart } from '@/types';

interface CartContextValue {
  carts:           Cart[];
  totalItems:      number;
  isLoading:       boolean;
  fetchCarts:      (supplierId?: string) => Promise<void>;
  updateItem:      (productId: string, supplierId: string, qty: number) => Promise<void>;
  clearSupplierCart: (supplierId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [carts,     setCarts]     = useState<Cart[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCarts = useCallback(async (supplierId?: string) => {
    setIsLoading(true);
    try {
      const { carts: data } = await getCart(supplierId);
      setCarts(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateItem = useCallback(async (productId: string, supplierId: string, qty: number) => {
    await updateCartItem(productId, supplierId, qty);
    await fetchCarts();
  }, [fetchCarts]);

  const clearSupplierCart = useCallback(async (supplierId: string) => {
    await apiClearCart(supplierId);
    setCarts((prev) => prev.filter((c) => c.supplierId !== supplierId));
  }, []);

  const totalItems = carts.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <CartContext.Provider value={{ carts, totalItems, isLoading, fetchCarts, updateItem, clearSupplierCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
