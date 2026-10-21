import axios, { isAxiosError } from 'axios';

import type { User } from './types';

const TOKEN_KEY = 'smart-healthcare.accessToken';
const USER_KEY = 'smart-healthcare.user';

/**
 * With "remember me" the session goes to localStorage, so it survives closing the browser.
 * Without it the session goes to sessionStorage and disappears when the tab is closed.
 */
export const getStoredToken = () =>
  localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);

/**
 * The signed-in account, cached so a refresh does not have to wait for /users/me before it
 * can tell an admin from a patient. It is a convenience, never the authority: the server
 * checks the real role on every request, and AuthProvider refetches it on start.
 */
export const getStoredUser = (): User | null => {
  const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    // Half-written or hand-edited: treat it as absent and let /users/me settle it.
    return null;
  }
};

export const storeSession = (token: string, user: User, rememberMe: boolean) => {
  clearStoredSession();
  const store = rememberMe ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(user));
};

/** Refreshes the cached account in whichever storage the token already lives in. */
export const storeUser = (user: User) => {
  const store = localStorage.getItem(TOKEN_KEY) === null ? sessionStorage : localStorage;
  store.setItem(USER_KEY, JSON.stringify(user));
};

export const clearStoredSession = () => {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(TOKEN_KEY);
    store.removeItem(USER_KEY);
  }
};

// '/api' is forwarded to the Spring Boot backend by the Vite dev server (see vite.config.ts).
export const apiClient = axios.create({ baseURL: '/api' });

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: () => void = () => {};

/** Runs when a request that carried a token gets 401, i.e. the token expired or is invalid. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

// Only 401 ends the session. A 403 means the account is fine but may not do this one thing --
// /api/admin/** for a patient, say -- and throwing them out of their own session for it
// would be worse than the error message the screen already shows.
apiClient.interceptors.response.use(undefined, (error) => {
  if (
    isAxiosError(error) &&
    error.response?.status === 401 &&
    error.config?.headers?.Authorization
  ) {
    onUnauthorized();
  }
  return Promise.reject(error);
});
