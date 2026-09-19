import axios, { isAxiosError } from 'axios';

const TOKEN_KEY = 'smart-healthcare.accessToken';

/**
 * With "remember me" the token goes to localStorage, so it survives closing the browser.
 * Without it the token goes to sessionStorage and disappears when the tab is closed.
 */
export const getStoredToken = () => localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);

export const storeToken = (token: string, rememberMe: boolean) => {
  clearStoredToken();
  (rememberMe ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
};

export const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
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

apiClient.interceptors.response.use(undefined, (error) => {
  if (isAxiosError(error) && error.response?.status === 401 && error.config?.headers?.Authorization) {
    onUnauthorized();
  }
  return Promise.reject(error);
});
