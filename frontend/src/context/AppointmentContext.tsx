import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DOCTOR_PROFILES,
  PRICING,
  slotKey,
  slotStatus,
} from '../data/appointmentDemo';
import type {
  Appointment,
  AppointmentStatus,
  BookingDraft,
  DoctorProfile,
  PaymentOutcome,
  PaymentResult,
  SlotStatus,
} from '../data/appointmentDemo';
import { patientSchema } from '../schemas/bookingSchemas';
import { getStoredToken } from '../api/client';
import {
  cancelAppointment,
  createAppointment,
    getBookingDoctors,
  getDoctorAppointments,
  getDoctorAvailability,
  getMyAppointments,
  rescheduleAppointment,
  updateDoctorAppointmentStatus,
  type AppointmentConfirmation,
  type DoctorInfo,
} from '../api/bookingApi';

interface DemoState {
  appointments: Appointment[];
  drafts: Record<number, BookingDraft>;
  results: PaymentResult[];
  overrides: Record<string, boolean>;
  doctors: DoctorProfile[];
  loading: boolean;
  error: string | null;
}

export interface AppointmentStore extends DemoState {
  saveDraft: (draft: BookingDraft) => void;
  confirm: (doctorId: number, outcome: PaymentOutcome) => Promise<PaymentResult>;
  createRealBooking: (
    doctorId: number,
    idempotencyKey: string,
  ) => Promise<AppointmentConfirmation>;
  getSlotStatus: (
    doctorId: number,
    date: string,
    time: string,
    excludeId?: string,
  ) => SlotStatus;
  setAvailability: (date: string, time: string, available: boolean) => void;
  updateDoctor: (
    changes: Pick<DoctorProfile, 'about' | 'languages' | 'expertise' | 'image'>,
  ) => void;
  cancel: (id: string, reason?: string) => Promise<void>;
  reschedule: (id: string, date: string, time: string) => Promise<void>;
  setStatus: (id: string, status: AppointmentStatus, notes?: string) => Promise<void>;
  pay: (id: string) => void;
  refresh: () => Promise<void>;
  loadDoctorAvailability: (doctorId: number) => Promise<Set<string>>;
}

const Context = createContext<AppointmentStore | null>(null);

function mapDoctorInfoToProfile(d: DoctorInfo, index: number): DoctorProfile {
  return {
    id: d.id,
    name: d.name,
    specialty: d.specialty,
    department: d.departmentName ?? 'General Medicine',
    rating: '4.9',
    reviews: 120 + d.id * 15,
    image: d.avatarUrl || `/images/doctor_${(index % 3) + 1}.jpg`,
    fee: PRICING.consultationFee,
    room: `${d.id + 2}0${d.id}`,
    languages: 'English, Vietnamese',
    about: `${d.name} specializes in ${d.specialty} with ${d.experienceYears ?? 10} years of clinical experience.`,
    expertise: d.specialty,
  };
}

export function mapConfirmationToAppointment(
  c: AppointmentConfirmation,
): Appointment {
  return {
    id: String(c.id),
    doctorId: c.doctor.id,
    date: c.date,
    time: c.startTime.length === 5 ? c.startTime : c.startTime.substring(0, 5),
    patientName: c.patientName,
    email: c.email,
    dob: c.dob,
    phone: c.phone,
    reason: c.reason,
    notes: c.notes ?? '',
    status: c.status,
    paymentMethod: 'DEMO_CARD',
    paymentStatus: 'PAID',
    fee: PRICING.consultationFee,
    deposit: PRICING.deposit,
    createdAt: c.createdAt,
    source: 'booking',
  };
}

export default function AppointmentProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<DemoState>(() => ({
    appointments: [],
    drafts: {},
    results: [],
    overrides: {},
    doctors: DOCTOR_PROFILES,
    loading: false,
    error: null,
  }));

  const current = useRef(state);
  const availabilityCache = useRef<Record<number, Set<string>>>({});

  function save(changes: Partial<DemoState>) {
    const next = { ...current.current, ...changes };
    current.current = next;
    setState(next);
  }

  const loadDoctorAvailability = useCallback(async (doctorId: number) => {
    try {
      const resp = await getDoctorAvailability(doctorId);
      const slotSet = new Set(
        resp.slots.map(
          (s) =>
            `${s.date}|${s.startTime.length === 5 ? s.startTime : s.startTime.substring(0, 5)}`,
        ),
      );
      availabilityCache.current[doctorId] = slotSet;
      return slotSet;
    } catch {
      return availabilityCache.current[doctorId] ?? new Set<string>();
    }
  }, []);

  const refresh = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;

    save({ loading: true, error: null });

    try {
      // 1. Fetch doctors from real backend
      try {
        const docPage = await getBookingDoctors({ size: 100 });
        if (docPage.content && docPage.content.length > 0) {
          const mappedDoctors = docPage.content.map(mapDoctorInfoToProfile);
          save({ doctors: mappedDoctors });
        }
      } catch {
        // preserve existing doctors if doctor list fails
      }

      // 2. Fetch appointments
      let fetchedAppointments: Appointment[] = [];
      try {
        const patientApps = await getMyAppointments({ view: 'ALL', size: 100 });
        fetchedAppointments = patientApps.content.map(mapConfirmationToAppointment);
      } catch (err: unknown) {
        // If 403, might be a doctor or admin user
        try {
          const doctorApps = await getDoctorAppointments({ view: 'ALL', size: 100 });
          fetchedAppointments = doctorApps.content.map(mapConfirmationToAppointment);
        } catch {
          // Ignore if not a doctor either
        }
      }

      save({
        appointments: fetchedAppointments,
        loading: false,
        error: null,
      });
    } catch (err) {
      save({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load booking data',
      });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function getSlotStatus(
    doctorId: number,
    date: string,
    time: string,
    excludeId?: string,
  ): SlotStatus {
    const cached = availabilityCache.current[doctorId];
    if (cached) {
      const normalizedTime = time.length === 5 ? time : time.substring(0, 5);
      const key = `${date}|${normalizedTime}`;
      if (cached.has(key)) return 'available';

      // Check if this slot was booked by excludeId (for rescheduling)
      if (excludeId) {
        const existing = current.current.appointments.find(
          (a) => a.id === excludeId && a.date === date && a.time === normalizedTime,
        );
        if (existing) return 'available';
      }

      const instant = new Date(`${date}T${normalizedTime}:00+07:00`).getTime();
      if (!Number.isFinite(instant) || instant <= Date.now()) return 'past';

      return 'blocked';
    }

    return slotStatus(
      doctorId,
      date,
      time,
      current.current.appointments,
      current.current.overrides,
      excludeId,
    );
  }

  const store: AppointmentStore = {
    ...state,
    getSlotStatus,
    loadDoctorAvailability,
    saveDraft(draft) {
      save({ drafts: { ...current.current.drafts, [draft.doctorId]: draft } });
    },
    async createRealBooking(doctorId: number, idempotencyKey: string) {
      const draft = current.current.drafts[doctorId];
      if (!draft || !draft.patient || !patientSchema.safeParse(draft.patient).success) {
        throw new Error('Complete the patient details before confirming.');
      }

      const payload = {
        doctorId,
        date: draft.date,
        startTime: draft.time.length === 5 ? draft.time : draft.time.substring(0, 5),
        bookingFor: draft.patient.bookingFor,
        patientName: draft.patient.patientName.trim(),
        email: draft.patient.email.trim(),
        phone: draft.patient.phone.replace(/\s+/g, ''),
        dob: draft.patient.dob,
        reason: draft.patient.reason.trim(),
        consent: draft.patient.consent,
      };

      const confirmation = await createAppointment(payload, idempotencyKey);
      await refresh();
      return confirmation;
    },
    async confirm(doctorId, outcome) {
      const draft = current.current.drafts[doctorId];
      if (!draft || !draft.patient || !patientSchema.safeParse(draft.patient).success) {
        throw new Error('Complete the patient details before confirming.');
      }

      const key = draft.key || crypto.randomUUID();
      const confirmation = await store.createRealBooking(doctorId, key);
      const app = mapConfirmationToAppointment(confirmation);

      const result: PaymentResult = {
        id: String(confirmation.id),
        outcome,
        draft: { ...draft, patient: { ...draft.patient } },
        appointmentId: String(confirmation.id),
      };

      save({
        appointments: [...current.current.appointments.filter((a) => a.id !== String(confirmation.id)), app],
        results: [...current.current.results, result],
      });

      return result;
    },
    setAvailability(date, time, available) {
      const status = getSlotStatus(1, date, time);
      if (status === 'booked' || status === 'past') {
        throw new Error('Booked or past slots cannot be edited.');
      }
      save({
        overrides: {
          ...current.current.overrides,
          [slotKey(1, date, time)]: available,
        },
      });
    },
    updateDoctor(changes) {
      save({
        doctors: current.current.doctors.map((doctor) =>
          doctor.id === 1 ? { ...doctor, ...changes } : doctor,
        ),
      });
    },
    async cancel(id, reason = 'Patient requested cancellation') {
      await cancelAppointment(id, reason);
      await refresh();
    },
    async reschedule(id, date, time) {
      await rescheduleAppointment(id, date, time);
      await refresh();
    },
    async setStatus(id, status, notes) {
      await updateDoctorAppointmentStatus(id, status, notes);
      await refresh();
    },
    pay(id) {
      const item = current.current.appointments.find((value) => value.id === id);
      if (!item) throw new Error('Appointment not found.');
      // Backend policy is NO_PAYMENT_COLLECTED; retain no-op for interface compatibility
    },
    refresh,
  };

  return <Context.Provider value={store}>{children}</Context.Provider>;
}

export function useAppointments() {
  const store = useContext(Context);
  if (!store) throw new Error('AppointmentProvider is required.');
  return store;
}
