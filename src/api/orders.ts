import { apiClient } from './client';
import type { Order, OrdersResponse, CheckoutResponse } from '@/types';

export async function getOrders(page = 1): Promise<OrdersResponse> {
  const { data } = await apiClient.get<OrdersResponse>('/orders', { params: { page } });
  return data;
}

export async function getOrder(orderId: string): Promise<Order> {
  const { data } = await apiClient.get<{ order: Order }>(`/orders/${orderId}`);
  return data.order;
}

export async function checkout(params: {
  supplierId:      string;
  notes?:          string;
  deliveryDate?:   string;
}): Promise<CheckoutResponse> {
  const { data } = await apiClient.post<CheckoutResponse>('/orders/checkout', params);
  return data;
}
