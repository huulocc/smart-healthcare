import type {
  AdminDashboardData,
  AdminNotification,
  AdminPatient,
  AdminUser,
  AiUsageEvent,
  AiUsageQuery,
  AiUsageStats,
  CreateUserPayload,
  Department,
  DepartmentStats,
  DepartmentStatus,
  Doctor,
  DoctorPerformance,
  DoctorRequest,
  DoctorStats,
  DoctorStatus,
  DoctorWeek,
  GoogleAiUsageResponse,
  NotificationQuery,
  PageResponse,
  PatientGrowthPoint,
  PatientQuery,
  ReportSummary,
  ScheduleSlot,
  SystemSetting,
  TrendPoint,
  UpdatePatientPayload,
  UpdateUserPayload,
  UserQuery,
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

// ---------------- Admin Overview Dashboard ----------------

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const { data } = await apiClient.get<AdminDashboardData>('/admin/dashboard');
  return data;
}

// ---------------- Doctors ----------------

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

// ---------------- Doctor requests ----------------

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

// ---------------- Departments ----------------

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

// ---------------- Schedules ----------------

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

// ---------------- Patients Management ----------------

export async function listPatients(
  query: PatientQuery = {},
): Promise<PageResponse<AdminPatient>> {
  const { data } = await apiClient.get<PageResponse<AdminPatient>>(
    `/admin/patients${params(query)}`,
  );
  return data;
}

export async function getPatient(id: number): Promise<AdminPatient> {
  const { data } = await apiClient.get<AdminPatient>(`/admin/patients/${id}`);
  return data;
}

export async function updatePatient(
  id: number,
  payload: UpdatePatientPayload,
): Promise<AdminPatient> {
  const { data } = await apiClient.put<AdminPatient>(
    `/admin/patients/${id}`,
    payload,
  );
  return data;
}

export async function updatePatientStatus(
  id: number,
  status: string,
): Promise<AdminPatient> {
  const { data } = await apiClient.patch<AdminPatient>(
    `/admin/patients/${id}/status`,
    { status },
  );
  return data;
}

export async function getPatientAppointments(
  id: number,
  page = 0,
  size = 20,
): Promise<PageResponse<any>> {
  const { data } = await apiClient.get<PageResponse<any>>(
    `/admin/patients/${id}/appointments${params({ page, size })}`,
  );
  return data;
}

// ---------------- User Accounts Management ----------------

export async function listUsers(
  query: UserQuery = {},
): Promise<PageResponse<AdminUser>> {
  const { data } = await apiClient.get<PageResponse<AdminUser>>(
    `/admin/users${params(query)}`,
  );
  return data;
}

export async function getUser(id: number): Promise<AdminUser> {
  const { data } = await apiClient.get<AdminUser>(`/admin/users/${id}`);
  return data;
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<AdminUser> {
  const { data } = await apiClient.post<AdminUser>('/admin/users', payload);
  return data;
}

export async function updateUser(
  id: number,
  payload: UpdateUserPayload,
): Promise<AdminUser> {
  const { data } = await apiClient.put<AdminUser>(
    `/admin/users/${id}`,
    payload,
  );
  return data;
}

export async function updateUserRole(
  id: number,
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT',
): Promise<AdminUser> {
  const { data } = await apiClient.patch<AdminUser>(
    `/admin/users/${id}/role`,
    { role },
  );
  return data;
}

export async function updateUserStatus(
  id: number,
  status: 'ACTIVE' | 'INACTIVE',
): Promise<AdminUser> {
  const { data } = await apiClient.patch<AdminUser>(
    `/admin/users/${id}/status`,
    { status },
  );
  return data;
}

// ---------------- Reports & Analytics ----------------

export async function getReportSummary(
  from?: string,
  to?: string,
): Promise<ReportSummary> {
  const { data } = await apiClient.get<ReportSummary>(
    `/admin/reports/summary${params({ from, to })}`,
  );
  return data;
}

export async function getReportAppointmentsTrend(
  from?: string,
  to?: string,
): Promise<TrendPoint[]> {
  const { data } = await apiClient.get<TrendPoint[]>(
    `/admin/reports/appointments-trend${params({ from, to })}`,
  );
  return data;
}

export async function getReportDepartmentStats(
  from?: string,
  to?: string,
): Promise<DepartmentStats[]> {
  const { data } = await apiClient.get<DepartmentStats[]>(
    `/admin/reports/departments${params({ from, to })}`,
  );
  return data;
}

export async function getReportDoctorPerformance(
  from?: string,
  to?: string,
): Promise<DoctorPerformance[]> {
  const { data } = await apiClient.get<DoctorPerformance[]>(
    `/admin/reports/doctors${params({ from, to })}`,
  );
  return data;
}

export async function getReportPatientGrowth(
  from?: string,
  to?: string,
): Promise<PatientGrowthPoint[]> {
  const { data } = await apiClient.get<PatientGrowthPoint[]>(
    `/admin/reports/patient-growth${params({ from, to })}`,
  );
  return data;
}

// ---------------- System Settings ----------------

export async function getSystemSettings(
  category?: string,
): Promise<SystemSetting[]> {
  const { data } = await apiClient.get<SystemSetting[]>(
    `/admin/settings${params({ category })}`,
  );
  return data;
}

export async function updateSystemSettings(
  settings: Record<string, string>,
): Promise<SystemSetting[]> {
  const { data } = await apiClient.put<SystemSetting[]>(
    '/admin/settings',
    settings,
  );
  return data;
}

// ---------------- Admin Notifications ----------------

export async function listAdminNotifications(
  query: NotificationQuery = {},
): Promise<PageResponse<AdminNotification>> {
  const { data } = await apiClient.get<PageResponse<AdminNotification>>(
    `/admin/notifications${params(query)}`,
  );
  return data;
}

export async function getUnreadNotificationCount(): Promise<{ count: number }> {
  const { data } = await apiClient.get<{ count: number }>(
    '/admin/notifications/unread-count',
  );
  return data;
}

export async function markNotificationRead(
  id: number,
): Promise<AdminNotification> {
  const { data } = await apiClient.patch<AdminNotification>(
    `/admin/notifications/${id}/read`,
  );
  return data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/admin/notifications/mark-all-read');
}

// ---------------- AI Usage Telemetry ----------------

export async function getAiUsageStats(
  from?: string,
  to?: string,
): Promise<AiUsageStats> {
  const { data } = await apiClient.get<AiUsageStats>(
    `/admin/ai-usage/stats${params({ from, to })}`,
  );
  return data;
}

export async function listAiUsageEvents(
  query: AiUsageQuery = {},
): Promise<PageResponse<AiUsageEvent>> {
  const { data } = await apiClient.get<PageResponse<AiUsageEvent>>(
    `/admin/ai-usage/events${params(query)}`,
  );
  return data;
}

export async function recordAiTelemetry(
  event: Record<string, any>,
): Promise<AiUsageEvent> {
  const { data } = await apiClient.post<AiUsageEvent>('/ai/telemetry', event);
  return data;
}

// ---------------- Official Google Cloud AI Usage ----------------

export async function getGoogleAiUsageMetrics(
  refresh: boolean = false,
  from?: string,
  to?: string,
): Promise<GoogleAiUsageResponse> {
  const query: Record<string, any> = {};
  if (refresh) query.refresh = true;
  if (from) query.from = from.includes('T') ? from : `${from}T00:00:00Z`;
  if (to) query.to = to.includes('T') ? to : `${to}T23:59:59Z`;

  const { data } = await apiClient.get<GoogleAiUsageResponse>(
    `/admin/ai-usage/google${params(query)}`,
  );
  return data;
}

