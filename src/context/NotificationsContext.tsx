import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/api/notifications';
import { useAuth } from '@/context/AuthContext';
import type { AppNotification } from '@/types';

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount:   number;
  isLoading:     boolean;
  refresh:       () => Promise<void>;
  markRead:      (id: string) => Promise<void>;
  markAllRead:   () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// Ogni quanto ricontrollare le notifiche in background (ms)
const POLL_INTERVAL = 60_000;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [isLoading,     setIsLoading]     = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    try {
      const data = await getNotifications(1);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silenzioso: le notifiche non devono mai bloccare l'app
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  const markRead = useCallback(async (id: string) => {
    // Aggiornamento ottimistico
    setNotifications((prev) => prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      const { unreadCount } = await markNotificationRead(id);
      setUnreadCount(unreadCount);
    } catch {
      // in caso di errore, una refresh successiva riallinea lo stato
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
    try {
      const { unreadCount } = await markAllNotificationsRead();
      setUnreadCount(unreadCount);
    } catch {
      // ignora
    }
  }, []);

  // Fetch iniziale + polling quando loggato
  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setUnreadCount(0);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    refresh();
    pollRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isLoggedIn, refresh]);

  // Refresh quando l'app torna in foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isLoggedIn) refresh();
    });
    return () => sub.remove();
  }, [isLoggedIn, refresh]);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, isLoading, refresh, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
