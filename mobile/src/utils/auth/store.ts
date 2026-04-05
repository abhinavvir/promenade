import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { AUTH_KEY } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phoneNumber?: string;
}

export interface AuthState {
  jwt: string;
  user: AuthUser;
}

interface AuthStore {
  isReady: boolean;
  auth: AuthState | null;
  setAuth: (auth: AuthState | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isReady: false,
  auth: null,
  setAuth: (auth) => {
    if (auth) {
      SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(auth));
    } else {
      SecureStore.deleteItemAsync(AUTH_KEY);
    }
    set({ auth });
  },
}));
