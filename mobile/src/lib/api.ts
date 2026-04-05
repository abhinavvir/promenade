import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export const AUTH_KEY = 'promenade-auth-token';
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function getToken(): Promise<string | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.jwt ?? null;
  } catch {
    return null;
  }
}

async function apiFetch<T = unknown>(
  method: Method,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const url = path.startsWith('/') ? `${BASE_URL}${path}` : path;
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    // Clear auth and redirect to sign-in
    await SecureStore.deleteItemAsync(AUTH_KEY);
    router.replace('/signin');
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error ?? errorMessage;
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (e.g. 204 No Content)
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T = unknown>(path: string, headers?: Record<string, string>) =>
    apiFetch<T>('GET', path, undefined, headers),

  post: <T = unknown>(path: string, body?: unknown, headers?: Record<string, string>) =>
    apiFetch<T>('POST', path, body, headers),

  put: <T = unknown>(path: string, body?: unknown, headers?: Record<string, string>) =>
    apiFetch<T>('PUT', path, body, headers),

  patch: <T = unknown>(path: string, body?: unknown, headers?: Record<string, string>) =>
    apiFetch<T>('PATCH', path, body, headers),

  delete: <T = unknown>(path: string, headers?: Record<string, string>) =>
    apiFetch<T>('DELETE', path, undefined, headers),
};

export default api;
