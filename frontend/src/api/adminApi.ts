import type {
  Department,
  DepartmentStatus,
  Doctor,
  DoctorRequest,
  DoctorStats,
  DoctorStatus,
  DoctorWeek,
  PageResponse,
  ScheduleSlot,
} from './adminTypes';
import { apiClient } from './client';

/**
 * Every call here needs an admin token: SecurityConfig restricts /api/admin/** to ROLE_ADMIN
 * and answers anyone else with a bare 403.
 */

/** An empty, null or undefined filter is left out of the URL, which means "no filter". */
const params = <T extends object>(query: T) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text === '' ? '' : `?${text}`;
};

// Doctors

export interface DoctorQuery {
  search?: string;
  departmentId?: number | '';
  specialty?: string;
  availability?: string;
  status?: string;
  page?: number;
  size?: number;
}

export async function listDoctors(
  query: DoctorQuery = {},
): Promise<PageResponse<Doctor>> {
  const { data } = await apiClient.get<PageResponse<Doctor>>(
    `/admin/doctors${params(query)}`,
  );
  return data;
}

export async function getDoctorStats(): Promise<DoctorStats> {
  const { data } = await apiClient.get<DoctorStats>('/admin/doctors/stats');
  return data;
}

export async function listSpecialties(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/admin/doctors/specialties');
  return data;
}

export interface UpdateDoctorPayload {
  /** Null unassigns them from their department. */
  departmentId: number | null;
  specialty: string;
  experienceYears: number;
  avatarUrl: string;
}

export async function updateDoctor(
  id: number,
  payload: UpdateDoctorPayload,
): Promise<Doctor> {
  const { data } = await apiClient.put<Doctor>(`/admin/doctors/${id}`, payload);
  return data;
}

export async function updateDoctorAvailability(
  id: number,
  availability: string,
): Promise<Doctor> {
  const { data } = await apiClient.patch<Doctor>(
    `/admin/doctors/${id}/availability`,
    {
      availability,
    },
  );
  return data;
}

/** INACTIVE also forces OFF_DUTY, ends any headship and takes the DOCTOR role away. */
export async function updateDoctorStatus(
  id: number,
  status: DoctorStatus,
): Promise<Doctor> {
  const { data } = await apiClient.patch<Doctor>(
    `/admin/doctors/${id}/status`,
    { status },
  );
  return data;
}

// Doctor requests

export async function listDoctorRequests(
  page = 0,
  size = 20,
): Promise<PageResponse<DoctorRequest>> {
  const { data } = await apiClient.get<PageResponse<DoctorRequest>>(
    `/admin/doctor-requests${params({ page, size })}`,
  );
  return data;
}

export interface ApproveDoctorPayload {
  departmentId: number;
  specialty: string;
  experienceYears: number;
}

export async function approveDoctorRequest(
  userId: number,
  payload: ApproveDoctorPayload,
): Promise<Doctor> {
  const { data } = await apiClient.post<Doctor>(
    `/admin/doctor-requests/${userId}/approve`,
    payload,
  );
  return data;
}

/** They go back to being an ordinary patient. Nothing records that it happened. */
export async function rejectDoctorRequest(userId: number): Promise<void> {
  await apiClient.post(`/admin/doctor-requests/${userId}/reject`);
}

// Departments

/** Not paged, by design: there are a handful, and the same list fills every dropdown. */
export async function listDepartments(): Promise<Department[]> {
  const { data } = await apiClient.get<Department[]>('/admin/departments');
  return data;
}

export async function createDepartment(payload: {
  name: string;
  description: string;
}): Promise<Department> {
  const { data } = await apiClient.post<Department>(
    '/admin/departments',
    payload,
  );
  return data;
}

export interface UpdateDepartmentPayload {
  name: string;
  description: string;
  /** Must be an active doctor of this department, or null for no head. */
  headDoctorId: number | null;
  status: DepartmentStatus;
}

export async function updateDepartment(
  id: number,
  payload: UpdateDepartmentPayload,
): Promise<Department> {
  const { data } = await apiClient.put<Department>(
    `/admin/departments/${id}`,
    payload,
  );
  return data;
}

// Schedules

export interface ScheduleQuery {
  search?: string;
  departmentId?: number | '';
  availability?: string;
  page?: number;
  size?: number;
}

/** Active doctors only: the board is about who is working. */
export async function getScheduleBoard(
  query: ScheduleQuery = {},
): Promise<PageResponse<DoctorWeek>> {
  const { data } = await apiClient.get<PageResponse<DoctorWeek>>(
    `/admin/schedules${params(query)}`,
  );
  return data;
}

export interface SlotPayload {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  shiftType: string;
}

export async function addSlot(
  doctorId: number,
  payload: SlotPayload,
): Promise<ScheduleSlot> {
  const { data } = await apiClient.post<ScheduleSlot>(
    `/admin/doctors/${doctorId}/schedules`,
    payload,
  );
  return data;
}

export async function updateSlot(
  slotId: number,
  payload: SlotPayload,
): Promise<ScheduleSlot> {
  const { data } = await apiClient.put<ScheduleSlot>(
    `/admin/schedules/${slotId}`,
    payload,
  );
  return data;
}

export async function deleteSlot(slotId: number): Promise<void> {
  await apiClient.delete(`/admin/schedules/${slotId}`);
}
