import { apiClient, saveToken, deleteToken } from './client';
import type { LoginResponse, User } from '@/types';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  await saveToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    await deleteToken();
  }
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<{ user: User }>('/auth/me');
  return data.user;
}
