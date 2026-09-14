import { apiClient } from './client';
import type { LoginResponse, User } from './types';

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export async function registerAccount(payload: RegisterPayload): Promise<User> {
  const { data } = await apiClient.post<User>('/auth/register', payload);
  return data;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, newPassword });
}
