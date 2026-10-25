import { apiClient } from './client';

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type ShiftType = 'WORK' | 'BREAK' | 'LEAVE';

export interface DoctorInfo {
  id: number;
  doctorCode: string;
  name: string;
  specialty: string;
  experienceYears: number | null;
  avatarUrl: string | null;
  departmentId: number | null;
  departmentName: string | null;
  status: string;
  availability: string;
}

export interface DoctorProfile {
  id: number;
  doctorCode: string;
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  specialty: string;
  experienceYears: number | null;
  avatarUrl: string | null;
  departmentId: number | null;
  departmentName: string | null;
  availability: string;
  status: string;
  biography: string | null;
  expertise: string | null;
  languages: string | null;
}

export interface DoctorWeeklyScheduleSlot {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  shiftType: ShiftType;
}

export interface UpdateDoctorPublicProfilePayload {
  biography?: string;
  expertise?: string;
  languages?: string;
  avatarUrl?: string;
}

export interface Slot {
  date: string;
  startTime: string;
  endTime: string;
  startsAt: string;
  endsAt: string;
}

export interface AvailabilityResponse {
  doctor: DoctorInfo;
  timezone: string;
  from: string;
  to: string;
  slots: Slot[];
}

export interface CreateBookingRequest {
  doctorId: number;
  date: string;
  startTime: string;
  bookingFor: 'myself' | 'someone';
  patientName: string;
  email: string;
  phone: string;
  dob: string;
  reason: string;
  consent: boolean;
}

export interface AppointmentConfirmation {
  id: number;
  appointmentCode: string;
  patientId: number;
  doctor: DoctorInfo;
  date: string;
  startTime: string;
  endTime: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  bookingFor: string;
  patientName: string;
  email: string;
  phone: string;
  dob: string;
  reason: string;
  consentAt: string;
  notes: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  paymentPolicy: string;
}

export interface AppointmentHistoryItem {
  id: number;
  actorUserId: number;
  action: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  cancellationReason: string | null;
  occurredAt: string;
}

export interface AvailabilityExceptionItem {
  id: number;
  doctorId: number;
  date: string;
  startTime: string;
  endTime: string;
  shiftType: ShiftType;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// -------------------------------------------------------------
// Doctor & Availability APIs
// -------------------------------------------------------------

export async function getBookingDoctors(params?: {
  departmentId?: number;
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<DoctorInfo>> {
  const { data } = await apiClient.get<PageResponse<DoctorInfo>>(
    '/booking/doctors',
    { params },
  );
  return data;
}

export async function getBookingDoctor(id: number): Promise<DoctorInfo> {
  const { data } = await apiClient.get<DoctorInfo>(`/booking/doctors/${id}`);
  return data;
}

export async function getDoctorAvailability(
  doctorId: number,
  from?: string,
  to?: string,
): Promise<AvailabilityResponse> {
  const { data } = await apiClient.get<AvailabilityResponse>(
    `/booking/doctors/${doctorId}/availability`,
    { params: { from, to } },
  );
  return data;
}

// -------------------------------------------------------------
// Patient Appointment APIs
// -------------------------------------------------------------

export async function createAppointment(
  payload: CreateBookingRequest,
  idempotencyKey?: string,
): Promise<AppointmentConfirmation> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  const { data } = await apiClient.post<AppointmentConfirmation>(
    '/appointments',
    payload,
    { headers },
  );
  return data;
}

export async function getMyAppointments(params?: {
  status?: AppointmentStatus;
  from?: string;
  to?: string;
  view?: 'ALL' | 'UPCOMING' | 'HISTORY';
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<AppointmentConfirmation>> {
  const { data } = await apiClient.get<PageResponse<AppointmentConfirmation>>(
    '/appointments',
    { params },
  );
  return data;
}

export async function getAppointmentDetails(
  id: number | string,
): Promise<AppointmentConfirmation> {
  const { data } = await apiClient.get<AppointmentConfirmation>(
    `/appointments/${id}`,
  );
  return data;
}

export async function getAppointmentHistory(
  id: number | string,
  page = 0,
  size = 20,
): Promise<PageResponse<AppointmentHistoryItem>> {
  const { data } = await apiClient.get<PageResponse<AppointmentHistoryItem>>(
    `/appointments/${id}/history`,
    { params: { page, size } },
  );
  return data;
}

export async function cancelAppointment(
  id: number | string,
  reason: string,
): Promise<AppointmentConfirmation> {
  const { data } = await apiClient.post<AppointmentConfirmation>(
    `/appointments/${id}/cancel`,
    { reason },
  );
  return data;
}

export async function rescheduleAppointment(
  id: number | string,
  date: string,
  startTime: string,
): Promise<AppointmentConfirmation> {
  const { data } = await apiClient.post<AppointmentConfirmation>(
    `/appointments/${id}/reschedule`,
    { date, startTime },
  );
  return data;
}

// -------------------------------------------------------------
// Doctor Workspace APIs
// -------------------------------------------------------------

export async function getDoctorAppointments(params?: {
  status?: AppointmentStatus;
  from?: string;
  to?: string;
  view?: 'ALL' | 'UPCOMING' | 'HISTORY';
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<AppointmentConfirmation>> {
  const { data } = await apiClient.get<PageResponse<AppointmentConfirmation>>(
    '/doctor/appointments',
    { params },
  );
  return data;
}

export async function getDoctorAppointmentDetails(
  id: number | string,
): Promise<AppointmentConfirmation> {
  const { data } = await apiClient.get<AppointmentConfirmation>(
    `/doctor/appointments/${id}`,
  );
  return data;
}

export async function cancelDoctorAppointment(
  id: number | string,
  reason: string,
): Promise<AppointmentConfirmation> {
  const { data } = await apiClient.post<AppointmentConfirmation>(
    `/doctor/appointments/${id}/cancel`,
    { reason },
  );
  return data;
}

export async function rescheduleDoctorAppointment(
  id: number | string,
  date: string,
  startTime: string,
): Promise<AppointmentConfirmation> {
  const { data } = await apiClient.post<AppointmentConfirmation>(
    `/doctor/appointments/${id}/reschedule`,
    { date, startTime },
  );
  return data;
}

export async function updateDoctorAppointmentStatus(
  id: number | string,
  status: AppointmentStatus,
  notes?: string,
): Promise<AppointmentConfirmation> {
  const { data } = await apiClient.patch<AppointmentConfirmation>(
    `/doctor/appointments/${id}/status`,
    { status, notes },
  );
  return data;
}

export async function updateDoctorAppointmentNotes(
  id: number | string,
  notes: string,
): Promise<AppointmentConfirmation> {
  const { data } = await apiClient.patch<AppointmentConfirmation>(
    `/doctor/appointments/${id}/notes`,
    { notes },
  );
  return data;
}

export async function getDoctorAvailabilityExceptions(params?: {
  from?: string;
  to?: string;
}): Promise<AvailabilityExceptionItem[]> {
  const { data } = await apiClient.get<AvailabilityExceptionItem[]>(
    '/doctor/availability-exceptions',
    { params },
  );
  return data;
}

export async function addDoctorAvailabilityException(payload: {
  date: string;
  startTime: string;
  endTime: string;
  shiftType: ShiftType;
}): Promise<AvailabilityExceptionItem> {
  const { data } = await apiClient.post<AvailabilityExceptionItem>(
    '/doctor/availability-exceptions',
    payload,
  );
  return data;
}

export async function deleteDoctorAvailabilityException(
  id: number,
): Promise<void> {
  await apiClient.delete(`/doctor/availability-exceptions/${id}`);
}

export async function getDoctorMe(): Promise<DoctorProfile> {
  const { data } = await apiClient.get<DoctorProfile>('/doctor/me');
  return data;
}

export async function updateDoctorPublicProfile(
  payload: UpdateDoctorPublicProfilePayload,
): Promise<DoctorProfile> {
  const { data } = await apiClient.patch<DoctorProfile>(
    '/doctor/me/public-profile',
    payload,
  );
  return data;
}

export async function getDoctorSchedules(): Promise<DoctorWeeklyScheduleSlot[]> {
  const { data } = await apiClient.get<DoctorWeeklyScheduleSlot[]>('/doctor/schedules');
  return data;
}

export async function getDoctorAppointmentHistory(
  id: number | string,
  page = 0,
  size = 20,
): Promise<PageResponse<AppointmentHistoryItem>> {
  const { data } = await apiClient.get<PageResponse<AppointmentHistoryItem>>(
    `/doctor/appointments/${id}/history`,
    { params: { page, size } },
  );
  return data;
}

export async function getDoctorStatistics(): Promise<Record<AppointmentStatus, number>> {
  const { data } = await apiClient.get<Record<AppointmentStatus, number>>(
    '/doctor/appointments/statistics',
  );
  return data;
}

// -------------------------------------------------------------
// Admin Appointment Management APIs
// -------------------------------------------------------------

export async function getAdminAppointments(params?: {
  status?: AppointmentStatus;
  from?: string;
  to?: string;
  view?: 'ALL' | 'UPCOMING' | 'HISTORY';
  patientId?: number;
  doctorId?: number;
  departmentId?: number;
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<AppointmentConfirmation>> {
  const { data } = await apiClient.get<PageResponse<AppointmentConfirmation>>(
    '/admin/appointments',
    { params },
  );
  return data;
}

export async function getAdminAppointmentDetails(
  id: number | string,
): Promise<AppointmentConfirmation> {
  const { data } = await apiClient.get<AppointmentConfirmation>(
    `/admin/appointments/${id}`,
  );
  return data;
}

export async function cancelAdminAppointment(
  id: number | string,
  reason: string,
): Promise<AppointmentConfirmation> {
  const { data } = await apiClient.post<AppointmentConfirmation>(
    `/admin/appointments/${id}/cancel`,
    { reason },
  );
  return data;
}

export async function rescheduleAdminAppointment(
  id: number | string,
  date: string,
  startTime: string,
): Promise<AppointmentConfirmation> {
  const { data } = await apiClient.post<AppointmentConfirmation>(
    `/admin/appointments/${id}/reschedule`,
    { date, startTime },
  );
  return data;
}

export async function updateAdminAppointmentStatus(
  id: number | string,
  status: AppointmentStatus,
  notes?: string,
): Promise<AppointmentConfirmation> {
  const { data } = await apiClient.patch<AppointmentConfirmation>(
    `/admin/appointments/${id}/status`,
    { status, notes },
  );
  return data;
}

export async function updateAdminAppointmentNotes(
  id: number | string,
  notes: string,
): Promise<AppointmentConfirmation> {
  const { data } = await apiClient.patch<AppointmentConfirmation>(
    `/admin/appointments/${id}/notes`,
    { notes },
  );
  return data;
}

export async function getAdminAppointmentStats(): Promise<
  Record<AppointmentStatus, number>
> {
  const { data } = await apiClient.get<Record<AppointmentStatus, number>>(
    '/admin/appointments/statistics',
  );
  return data;
}
