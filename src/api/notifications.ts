import { apiClient } from './client';
import type { NotificationsResponse } from '@/types';

export async function getNotifications(page = 1): Promise<NotificationsResponse> {
  const { data } = await apiClient.get<NotificationsResponse>('/notifications', { params: { page } });
  return data;
}

export async function markNotificationRead(id: string): Promise<{ unreadCount: number }> {
  const { data } = await apiClient.post<{ unreadCount: number }>('/notifications/read', { id });
  return data;
}

export async function markAllNotificationsRead(): Promise<{ unreadCount: number }> {
  const { data } = await apiClient.post<{ unreadCount: number }>('/notifications/read', { all: true });
  return data;
}
