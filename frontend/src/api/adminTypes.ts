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
