import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback } from 'react';

import { AUTH_KEY } from '@/lib/api';
import { AuthState, useAuthStore } from './store';

export const useAuth = () => {
  const { isReady, auth, setAuth } = useAuthStore();

  /** Called once on app start to hydrate auth state from SecureStore. */
  const initiate = useCallback(() => {
    SecureStore.getItemAsync(AUTH_KEY).then((raw) => {
      useAuthStore.setState({
        auth: raw ? (JSON.parse(raw) as AuthState) : null,
        isReady: true,
      });
    });
  }, []);

  /**
   * Sign in with phone number and password.
   * Calls POST /api/auth/mobile-login and stores the returned JWT.
   */
  const signIn = useCallback(
    async (phone: string, password: string): Promise<void> => {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/auth/mobile-login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      setAuth({ jwt: data.jwt, user: data.user });
    },
    [setAuth],
  );

  const signOut = useCallback(() => {
    setAuth(null);
    router.replace('/signin');
  }, [setAuth]);

  return {
    isReady,
    isAuthenticated: isReady ? !!auth : null,
    auth,
    user: auth?.user ?? null,
    setAuth,
    signIn,
    signOut,
    initiate,
  };
};

export default useAuth;
