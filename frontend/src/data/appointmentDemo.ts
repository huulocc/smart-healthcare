import { DEPARTMENTS, DOCTORS } from './mockData';

/** Explicit UI fixtures. No medical credentials, live prices, or real schedules. */
export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type PaymentMethod = 'DEMO_CARD' | 'DEMO_BANK';
export type PaymentOutcome =
  | 'SUCCESS'
  | 'PENDING'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';
export interface PatientDetails {
  bookingFor: 'myself' | 'someone';
  patientName: string;
  email: string;
  phone: string;
  dob: string;
  reason: string;
  consent: boolean;
}
export interface BookingDraft {
  doctorId: number;
  date: string;
  time: string;
  patient: PatientDetails | null;
  paymentMethod: PaymentMethod;
  key: string;
}
export interface PaymentResult {
  id: string;
  outcome: PaymentOutcome;
  draft: BookingDraft;
  appointmentId?: string;
}
export interface Appointment {
  id: string;
  doctorId: number;
  date: string;
  time: string;
  patientName: string;
  email?: string;
  dob?: string;
  phone: string;
  reason: string;
  notes: string;
  status: AppointmentStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUND_PENDING';
  fee: number;
  deposit: number;
  createdAt: string;
  source: 'fixture' | 'booking';
}
export const PRICING = {
  currencyCode: 'USD',
  locale: 'en-US',
  consultationFee: 100,
  deposit: 25,
};
export const TIME_ZONE = 'Asia/Ho_Chi_Minh';
export function dateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export function addDays(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}
export function formatDate(value: string, short = false): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    weekday: short ? 'short' : 'long',
    day: 'numeric',
    month: short ? 'short' : 'long',
    ...(!short && { year: 'numeric' }),
  }).format(new Date(`${value}T12:00:00+07:00`));
}
export const money = (value: number) =>
  new Intl.NumberFormat(PRICING.locale, {
    style: 'currency',
    currency: PRICING.currencyCode,
  }).format(value);
export const departmentForDoctor = (doctor: { department: string }) =>
  DEPARTMENTS.find((item) => item.name === doctor.department);
export const DOCTOR_PROFILES = DOCTORS.map((doctor, index) => ({
  ...doctor,
  fee: PRICING.consultationFee,
  room: `${index + 2}0${index + 1}`,
  languages: '',
  about: '',
  expertise: '',
}));
export type DoctorProfile = (typeof DOCTOR_PROFILES)[number];
export const TIMES = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
];
export type SlotStatus = 'available' | 'booked' | 'blocked' | 'past';
export const slotKey = (doctorId: number, date: string, time: string) =>
  `${doctorId}|${date}|${time}`;
export function slotStatus(
  doctorId: number,
  date: string,
  time: string,
  appointments: Appointment[],
  overrides: Record<string, boolean> = {},
  excludeId?: string,
): SlotStatus {
  const instant = new Date(`${date}T${time}:00+07:00`).getTime();
  if (!Number.isFinite(instant) || instant <= Date.now()) return 'past';
  if (
    !TIMES.includes(time) ||
    !DOCTORS.some((doctor) => doctor.id === doctorId) ||
    date > addDays(dateKey(), 30)
  )
    return 'blocked';
  if (
    appointments.some(
      (item) =>
        item.id !== excludeId &&
        item.status !== 'CANCELLED' &&
        item.doctorId === doctorId &&
        item.date === date &&
        item.time === time,
    )
  )
    return 'booked';
  const override = overrides[slotKey(doctorId, date, time)];
  if (override !== undefined) return override ? 'available' : 'blocked';
  const sunday = new Date(`${date}T12:00:00+07:00`).getUTCDay() === 0;
  return sunday ||
    (Number(date.slice(-2)) + doctorId + TIMES.indexOf(time)) % 7 === 0
    ? 'blocked'
    : 'available';
}
export function slotUnavailable(
  doctorId: number,
  date: string,
  time: string,
  appointments: Appointment[],
  excludeId?: string,
): boolean {
  return (
    slotStatus(doctorId, date, time, appointments, {}, excludeId) !==
    'available'
  );
}
export function sampleAppointments(): Appointment[] {
  const dates = Array.from({ length: 14 }, (_, i) => addDays(dateKey(), i));
  return ['Alex Demo', 'Jamie Demo', 'Taylor Demo', 'Sam Demo'].map(
    (patientName, index) => {
      const doctorId = index === 3 ? 2 : 1;
      const date = dates.find(
        (day) =>
          TIMES.filter((time) => !slotUnavailable(doctorId, day, time, []))
            .length >= 4,
      )!;
      const time = TIMES.filter(
        (time) => !slotUnavailable(doctorId, date, time, []),
      )[index];
      return {
        id: `DEMO-${index + 1}`,
        doctorId,
        date,
        time,
        patientName,
        phone: '0000000000',
        reason: index === 1 ? 'Sample follow-up consultation.' : '',
        notes: '',
        status: 'CONFIRMED',
        paymentMethod: 'DEMO_CARD',
        paymentStatus: 'PAID',
        fee: PRICING.consultationFee,
        deposit: PRICING.deposit,
        createdAt: new Date().toISOString(),
        source: 'fixture',
      };
    },
  );
}
