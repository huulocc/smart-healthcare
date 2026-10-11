import { apiClient } from './client';
import type { User } from './types';

export interface UpdateProfilePayload {
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  address: string;
}

export async function getMyProfile(): Promise<User> {
  const { data } = await apiClient.get<User>('/users/me');
  return data;
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await apiClient.put<User>('/users/me', payload);
  return data;
}

export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.put('/users/me/password', { currentPassword, newPassword });
}
