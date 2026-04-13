/**
 * API CLIENT
 * ──────────────────────────────────────────────────────────
 * Axios con interceptor per:
 * - allegare il token di sessione come cookie (hp_session)
 * - gestire errori 401 con redirect al login
 * - base URL configurabile da costanti
 */

import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '@/constants';

export const SESSION_KEY = 'hp_session_token';

// ── Axios instance ───────────────────────────────────────
export const apiClient = axios.create({
  baseURL:        `${BASE_URL}/api/mobile`,
  timeout:        15_000,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
    'X-Platform':   'mobile',
  },
});

// ── Request interceptor: allega token ───────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync(SESSION_KEY);
    if (token) {
      config.headers['Cookie'] = `hp_session=${token}`;
      config.headers['X-Session-Token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: gestione errori ───────────────
let onUnauthorizedCallback: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorizedCallback = cb;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      onUnauthorizedCallback?.();
    }
    return Promise.reject(error);
  },
);

// ── Helpers ──────────────────────────────────────────────
export async function saveToken(token: string) {
  await SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function deleteToken() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_KEY);
}

/** Estrae il messaggio d'errore da una risposta Axios */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;
    return data?.error ?? data?.message ?? error.message ?? 'Errore sconosciuto';
  }
  return String(error);
}
