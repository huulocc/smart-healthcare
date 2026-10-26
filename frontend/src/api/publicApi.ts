/**
 * The read-only directory, served from /api/public and callable without a token.
 *
 * The Doctors and Departments pages are reachable without signing in (see the routes
 * in App.tsx), while every /api/booking endpoint requires a JWT. These three calls are
 * what those pages read instead; `apiClient` only attaches an Authorization header when
 * a token happens to exist, so the same functions work signed in or signed out.
 */

import { apiClient } from './client';
import type { DoctorInfo } from './bookingApi';

export type { DoctorInfo };

export interface PublicDepartment {
  id: number;
  name: string;
  description: string | null;
  activeDoctors: number;
}

/**
 * Matches `common/PageResponse` on the server exactly. Declared here rather than reused
 * from bookingApi, whose copy also lists a `last` field the backend never sends.
 */
export interface PublicPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export async function getPublicDepartments(): Promise<PublicDepartment[]> {
  const { data } = await apiClient.get<PublicDepartment[]>('/public/departments');
  return data;
}

export async function getPublicDoctors(params?: {
  departmentId?: number;
  search?: string;
  page?: number;
  size?: number;
}): Promise<PublicPage<DoctorInfo>> {
  const { data } = await apiClient.get<PublicPage<DoctorInfo>>('/public/doctors', {
    params,
  });
  return data;
}

export async function getPublicDoctor(id: number): Promise<DoctorInfo> {
  const { data } = await apiClient.get<DoctorInfo>(`/public/doctors/${id}`);
  return data;
}

/** The directory carries no photographs, so the card falls back to initials. */
export function doctorCardModel(doctor: DoctorInfo) {
  return {
    id: doctor.id,
    name: doctor.name,
    specialty: doctor.specialty,
    department: doctor.departmentName ?? 'General Medicine',
    image: doctor.avatarUrl ?? '',
  };
}
