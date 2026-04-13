import { apiClient } from './client';
import type { CartResponse } from '@/types';

export async function getCart(supplierId?: string): Promise<CartResponse> {
  const { data } = await apiClient.get<CartResponse>('/cart', {
    params: supplierId ? { supplierId } : undefined,
  });
  return data;
}

export async function updateCartItem(
  productId: string,
  supplierId: string,
  quantity: number
): Promise<void> {
  await apiClient.post('/cart/items', { productId, supplierId, quantity });
}

export async function removeCartItem(productId: string, supplierId: string): Promise<void> {
  await apiClient.post('/cart/items', { productId, supplierId, quantity: 0 });
}

export async function clearCart(supplierId: string): Promise<void> {
  await apiClient.delete('/cart', { params: { supplierId } });
}
