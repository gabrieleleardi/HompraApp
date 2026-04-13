import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getToken, setOnUnauthorized } from '@/api/client';
import { getMe, login as apiLogin, logout as apiLogout } from '@/api/auth';
import type { User } from '@/types';

interface AuthContextValue {
  user:       User | null;
  isLoading:  boolean;
  isLoggedIn: boolean;
  login:      (email: string, password: string) => Promise<void>;
  logout:     () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ripristina la sessione al boot se il token è in SecureStore
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const me = await getMe();
          setUser(me);
        }
      } catch {
        // Token scaduto o non valido — silenzioso
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedUser } = await apiLogin(email, password);
    setUser(loggedUser);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  // Gestione globale del logout quando il server risponde 401
  useEffect(() => {
    setOnUnauthorized(() => { logout(); });
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isLoggedIn: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
