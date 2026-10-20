import { createContext, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DOCTOR_PROFILES,
  PRICING,
  sampleAppointments,
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

interface DemoState {
  appointments: Appointment[];
  drafts: Record<number, BookingDraft>;
  results: PaymentResult[];
  overrides: Record<string, boolean>;
  doctors: DoctorProfile[];
}
interface AppointmentStore extends DemoState {
  saveDraft: (draft: BookingDraft) => void;
  confirm: (doctorId: number, outcome: PaymentOutcome) => PaymentResult;
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
  cancel: (id: string) => void;
  reschedule: (id: string, date: string, time: string) => void;
  setStatus: (id: string, status: AppointmentStatus, notes?: string) => void;
  pay: (id: string) => void;
}
const Context = createContext<AppointmentStore | null>(null);

export default function AppointmentProvider({
  children,
}: {
  children: ReactNode;
}) {
  // In-memory by design: entered patient details are cleared by a full reload.
  const [state, setState] = useState<DemoState>(() => ({
    appointments: sampleAppointments(),
    drafts: {},
    results: [],
    overrides: {},
    doctors: DOCTOR_PROFILES,
  }));
  const current = useRef(state);
  function save(changes: Partial<DemoState>) {
    const next = { ...current.current, ...changes };
    current.current = next;
    setState(next);
  }
  function find(id: string) {
    const item = current.current.appointments.find((value) => value.id === id);
    if (!item) throw new Error('Appointment not found.');
    return item;
  }
  function update(id: string, changes: Partial<Appointment>) {
    find(id);
    save({
      appointments: current.current.appointments.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    });
  }
  function getSlotStatus(
    doctorId: number,
    date: string,
    time: string,
    excludeId?: string,
  ) {
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
    saveDraft(draft) {
      save({ drafts: { ...current.current.drafts, [draft.doctorId]: draft } });
    },
    confirm(doctorId, outcome) {
      const draft = current.current.drafts[doctorId];
      if (!draft || !patientSchema.safeParse(draft.patient).success)
        throw new Error('Complete the patient details before payment.');
      const previous = current.current.results.find(
        (result) =>
          result.draft.key === draft.key && result.outcome === 'SUCCESS',
      );
      if (previous) return previous;
      if (getSlotStatus(doctorId, draft.date, draft.time) !== 'available')
        throw new Error(
          'This time is no longer available. Choose another slot.',
        );
      const { consultationFee, deposit } = PRICING;
      if (
        !Number.isFinite(consultationFee) ||
        !Number.isFinite(deposit) ||
        deposit < 0 ||
        deposit > consultationFee
      )
        throw new Error('Demo pricing is invalid.');
      const result: PaymentResult = {
        id: `DEMO-${crypto.randomUUID()}`,
        outcome,
        draft: { ...draft, patient: { ...draft.patient! } },
      };
      const appointments = [...current.current.appointments];
      if (outcome === 'SUCCESS') {
        const appointment: Appointment = {
          ...draft.patient!,
          id: result.id,
          doctorId,
          date: draft.date,
          time: draft.time,
          notes: '',
          status: 'CONFIRMED',
          paymentMethod: draft.paymentMethod,
          paymentStatus: 'PAID',
          fee: consultationFee,
          deposit,
          createdAt: new Date().toISOString(),
          source: 'booking',
        };
        appointments.push(appointment);
        result.appointmentId = appointment.id;
      }
      save({ appointments, results: [...current.current.results, result] });
      return result;
    },
    setAvailability(date, time, available) {
      const status = getSlotStatus(1, date, time);
      if (status === 'booked' || status === 'past')
        throw new Error('Booked or past slots cannot be edited.');
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
    cancel(id) {
      const item = find(id);
      if (item.status !== 'CONFIRMED')
        throw new Error('Only confirmed appointments can be cancelled.');
      update(id, {
        status: 'CANCELLED',
        paymentStatus:
          item.paymentStatus === 'PAID' ? 'REFUND_PENDING' : item.paymentStatus,
      });
    },
    reschedule(id, date, time) {
      const item = find(id);
      if (
        item.status !== 'CONFIRMED' ||
        getSlotStatus(item.doctorId, date, time, id) !== 'available'
      )
        throw new Error(
          'Choose an available time for a confirmed appointment.',
        );
      update(id, { date, time });
    },
    setStatus(id, status, notes) {
      const item = find(id);
      if (
        item.doctorId !== 1 ||
        !(
          (item.status === 'CONFIRMED' && status === 'IN_PROGRESS') ||
          (item.status === 'IN_PROGRESS' && status === 'COMPLETED')
        )
      )
        throw new Error(
          'This appointment cannot be updated in this doctor preview.',
        );
      update(id, { status, ...(notes !== undefined && { notes }) });
    },
    pay(id) {
      const item = find(id);
      if (item.status === 'CANCELLED' || item.paymentStatus !== 'UNPAID')
        throw new Error('Payment is not available.');
      update(id, { paymentStatus: 'PAID', paymentMethod: 'DEMO_CARD' });
    },
  };
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useAppointments() {
  const store = useContext(Context);
  if (!store) throw new Error('AppointmentProvider is required.');
  return store;
}
