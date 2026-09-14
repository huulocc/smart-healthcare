import axios, { isAxiosError } from 'axios';

const TOKEN_KEY = 'smart-healthcare.accessToken';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const storeToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearStoredToken = () => localStorage.removeItem(TOKEN_KEY);

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
