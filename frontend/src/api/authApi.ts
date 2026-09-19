import { apiClient } from './client';
import type { LoginResponse, Role, User } from './types';

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  /** PATIENT or DOCTOR. A DOCTOR sign-up is only a request until an admin approves it. */
  role: Extract<Role, 'PATIENT' | 'DOCTOR'>;
}

export async function registerAccount(payload: RegisterPayload): Promise<User> {
  const { data } = await apiClient.post<User>('/auth/register', payload);
  return data;
}

export async function login(email: string, password: string, rememberMe = false): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password, rememberMe });
  return data;
}

/** Trades the Google ID token from the browser for one of our own access tokens. */
export async function loginWithGoogle(credential: string, rememberMe = false): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/google', { credential, rememberMe });
  return data;
}

/** Called by the /verify-email page with the token from the activation email. */
export async function verifyEmail(token: string): Promise<void> {
  await apiClient.post('/auth/verify-email', { token });
}

export async function resendVerification(email: string): Promise<void> {
  await apiClient.post('/auth/resend-verification', { email });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, newPassword });
}
