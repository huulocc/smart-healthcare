/**
 * The shapes /api/admin/** returns. These mirror the backend records one for one -- change
 * one there and this file has to follow, because nothing checks them against each other.
 */

export type Availability =
  'AVAILABLE' | 'IN_CONSULTATION' | 'ON_LEAVE' | 'OFF_DUTY';
export type DoctorStatus = 'ACTIVE' | 'INACTIVE';
export type DepartmentStatus = 'ACTIVE' | 'INACTIVE';
/** No BOOKED: a booked hour comes from an appointment, which the backend does not have yet. */
export type ShiftType = 'WORK' | 'BREAK' | 'LEAVE';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

/** The week in the order the board draws it, which is also how the backend sorts a week. */
export const DAYS_OF_WEEK: readonly DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

/** Every paged list answers in this shape. The backend caps size at 100. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface DepartmentSummary {
  id: number;
  deptCode: string;
  name: string;
}

export interface Doctor {
  id: number;
  doctorCode: string;
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  /** Null when an admin has unassigned them; approval always sets one. */
  department: DepartmentSummary | null;
  specialty: string | null;
  experienceYears: number | null;
  availability: Availability;
  status: DoctorStatus;
  createdAt: string;
}

export interface DoctorStats {
  total: number;
  active: number;
  available: number;
  onLeave: number;
  pendingRequests: number;
}

/** Someone who asked to be a doctor at sign-up and is waiting for an admin. */
export interface DoctorRequest {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  /** False means Approve will be refused: the account was never activated. */
  emailVerified: boolean;
  registeredAt: string;
}

export interface Department {
  id: number;
  deptCode: string;
  name: string;
  description: string | null;
  status: DepartmentStatus;
  headDoctor: { id: number; doctorCode: string; fullName: string } | null;
  activeDoctors: number;
}

/** Times come back as "09:00:00"; "09:00" is accepted when sending one. */
export interface ScheduleSlot {
  id: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  shiftType: ShiftType;
}

/** One row of the schedule board: a doctor and their whole week. */
export interface DoctorWeek {
  doctor: Doctor;
  slots: ScheduleSlot[];
}


// ---------------- Admin Overview Dashboard ----------------

export interface DailyTrend {
  dayName: string;
  date: string;
  count: number;
}

export interface DashboardAppointmentItem {
  id: number;
  patientName: string;
  doctorName: string;
  departmentName: string;
  date: string;
  time: string;
  status: string;
}

export interface DashboardAiSummary {
  totalRequests: number | null;
  requestsStatus?: string;
  estimatedCost: number | null;
  costStatus?: string;
  avgLatencyMs: number | null;
  latencyStatus?: string;
  failureRatePercent: number | null;
  failureStatus?: string;
  refusalStatus?: string;
}

export interface AdminDashboardData {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  activeDoctors: number;
  totalAppointments: number;
  todayAppointments: number;
  upcomingAppointments: number;
  appointmentsByStatus: Record<string, number>;
  last7DaysTrend: DailyTrend[];
  recentAppointments: DashboardAppointmentItem[];
  aiSummary: DashboardAiSummary;
}

// ---------------- Patients Management ----------------

export interface AdminPatient {
  id: number;
  patientCode: string;
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  bloodType: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  insuranceNumber: string | null;
  status: string;
  createdAt: string;
  appointmentCount: number;
}

export interface PatientQuery {
  search?: string;
  gender?: string;
  bloodType?: string;
  status?: string;
  page?: number;
  size?: number;
}

export interface UpdatePatientPayload {
  fullName: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  bloodType?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  insuranceNumber?: string;
}

// ---------------- User Accounts Management ----------------

export interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  requestedRole: 'DOCTOR' | null;
  status: 'ACTIVE' | 'INACTIVE';
  emailVerified: boolean;
  createdAt: string;
}

export interface UserQuery {
  search?: string;
  role?: string;
  status?: string;
  emailVerified?: boolean;
  page?: number;
  size?: number;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateUserPayload {
  fullName: string;
  phone: string;
  emailVerified?: boolean;
}

// ---------------- Reports & Analytics ----------------

export interface ReportSummary {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalActivePatients: number;
  newPatientsInRange: number;
  activeDoctorsCount: number;
  completionRatePercent: number;
}

export interface TrendPoint {
  date: string;
  label: string;
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
}

export interface DepartmentStats {
  departmentId: number;
  departmentName: string;
  deptCode: string;
  totalDoctors: number;
  totalAppointments: number;
  completedAppointments: number;
}

export interface DoctorPerformance {
  doctorId: number;
  doctorCode: string;
  fullName: string;
  departmentName: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  completionRatePercent: number;
}

export interface PatientGrowthPoint {
  date: string;
  newPatients: number;
}

// ---------------- System Settings ----------------

export interface SystemSetting {
  id?: number;
  key: string;
  value?: string;
  settingValue?: string;
  category: string;
  description: string | null;
  updatedAt?: string;
  updatedBy?: string;
}

// ---------------- Admin Notifications ----------------

export interface AdminNotification {
  id: number;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  isRead: boolean;
  targetUrl: string | null;
  createdAt: string;
}

export interface NotificationQuery {
  isRead?: boolean;
  search?: string;
  page?: number;
  size?: number;
}

// ---------------- AI Usage Telemetry ----------------

export interface AiUsageEvent {
  id: number;
  timestamp: string;
  traceId: string | null;
  feature: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  status: 'SUCCESS' | 'ERROR' | 'REFUSAL';
  errorType: string | null;
  estimatedCostUsd: number;
}

export interface AiDailyUsage {
  date: string;
  requests: number;
  cost: number;
  avgLatencyMs: number;
}

export interface ModelBreakdown {
  model: string;
  requests: number;
  cost: number;
  avgLatencyMs: number;
  tokens: number;
}

export interface ProviderBreakdown {
  provider: string;
  requests: number;
  cost: number;
}

export interface AiUsageStats {
  totalRequests: number;
  totalCost: number;
  estimatedCost: number;
  avgLatencyMs: number;
  successCount: number;
  failedCount: number;
  refusedCount: number;
  timeoutCount: number;
  failureRatePercent: number;
  refusalRatePercent: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  avgTokensPerRequest: number;
  trends: AiDailyUsage[];
  modelBreakdown: ModelBreakdown[];
  providerBreakdown: ProviderBreakdown[];
  errorBreakdown: Array<{ errorType: string; count: number }>;
}

export interface AiUsageQuery {
  from?: string;
  to?: string;
  status?: string;
  page?: number;
  size?: number;
}

// ---------------- Official Google Cloud AI Telemetry ----------------

export interface GoogleProjectMetadata {
  projectId: string;
  authenticated: boolean;
  status:
    | 'AVAILABLE'
    | 'CREDENTIALS_MISSING'
    | 'CONFIGURATION_REQUIRED'
    | 'PERMISSION_DENIED'
    | 'TEMPORARILY_UNAVAILABLE'
    | 'NO_DATA'
    | 'UNAVAILABLE';
  statusMessage: string;
  lastRefreshedAt: string;
  reportingPeriod: string;
}

export interface GoogleTrendPoint {
  date: string;
  requests: number;
  avgLatencyMs: number | null;
  errorCount: number;
}

export interface GoogleApiUsageMetrics {
  totalRequests: number | null;
  successCount: number | null;
  errorCount: number | null;
  quotaExceededCount: number | null;
  avgLatencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  requestsStatus: string;
  tokensStatus: string;
  latencyStatus: string;
  trends: GoogleTrendPoint[];
  usedToday?: number | null;
}

export interface GoogleDailyUsageMetrics {
  usedToday: number | null;
  dailyLimit: number | null;
  remainingToday: number | null;
  isEstimated: boolean;
  isOverLimit: boolean;
  quotaDayStart: string;
  quotaDayEnd: string;
  timezone: string;
  status: string;
  statusMessage: string;
  modelFilter?: string;
}

export interface GoogleQuotaLimitInfo {
  name: string;
  metricKey: string;
  limitValue: number | null;
  unit: string;
  period: string;
  currentUsage: number | null;
  status: string;
  dimensions?: Record<string, string>;
}

export interface GoogleQuotaMetrics {
  rpm: GoogleQuotaLimitInfo;
  tpm: GoogleQuotaLimitInfo;
  rpd: GoogleQuotaLimitInfo;
  modelQuotas: GoogleQuotaLimitInfo[];
  quotaExceededEvents: number;
  quotaSource: string;
  status: string;
}

export interface GoogleBillingMetrics {
  actualCost: number | null;
  currency: string;
  billingPeriod: string;
  billingAccountName: string | null;
  isActual: boolean;
  status:
    | 'AVAILABLE'
    | 'NOT_CONFIGURED'
    | 'NO_DATA'
    | 'PERMISSION_DENIED'
    | 'TEMPORARILY_UNAVAILABLE'
    | 'UNAVAILABLE'
    | 'CREDENTIALS_MISSING';
  statusMessage: string;
  dataFreshness: string | null;
}

export interface GoogleAiUsageResponse {
  project: GoogleProjectMetadata;
  usage: GoogleApiUsageMetrics;
  quotas: GoogleQuotaMetrics;
  billing: GoogleBillingMetrics;
  dailyUsage?: GoogleDailyUsageMetrics;
  metricStatus: Record<string, string>;
}

