import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Button from '../../components/Button';
import {
  Modal,
  Page,
} from '../../components/healthcare/HealthcareUI';
import {
  addDays,
  dateKey,
  formatDate,
} from '../../data/appointmentDemo';
import {
  addDoctorAvailabilityException,
  deleteDoctorAvailabilityException,
  getDoctorAvailability,
  getDoctorAvailabilityExceptions,
  getDoctorAppointments,
  getDoctorMe,
  getDoctorSchedules,
  type AvailabilityExceptionItem,
  type Slot,
  type AppointmentConfirmation,
  type DoctorProfile,
  type DoctorWeeklyScheduleSlot,
} from '../../api/bookingApi';
import styles from './DoctorSchedule.module.css';

// Default half-hour slots spanning standard medical clinic hours
const DEFAULT_GRID_TIMES = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30',
];

export default function DoctorSchedule() {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [offset, setOffset] = useState(0);
  const [view, setView] = useState('Week');
  const [selected, setSelected] = useState<{
    date: string;
    time: string;
  } | null>(null);

  const [serverSlots, setServerSlots] = useState<Slot[]>([]);
  const [weeklySchedules, setWeeklySchedules] = useState<DoctorWeeklyScheduleSlot[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityExceptionItem[]>([]);
  const [bookedAppointments, setBookedAppointments] = useState<AppointmentConfirmation[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const today = dateKey();
  const maxDate = addDays(today, 29);

  // 1. Load authenticated doctor identity
  useEffect(() => {
    let active = true;
    getDoctorMe()
      .then((data) => {
        if (active) setDoctor(data);
      })
      .catch(() => {
        if (active) {
          setError('Unable to load doctor profile. Please ensure you are logged in as a registered doctor.');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // 2. Load schedule, exceptions, availability, and booked appointments
  const loadScheduleData = (docId: number) => {
    setLoading(true);
    Promise.all([
      getDoctorAvailability(docId, today, maxDate),
      getDoctorAvailabilityExceptions({ from: today, to: maxDate }),
      getDoctorAppointments({ view: 'ALL', size: 100 }),
      getDoctorSchedules().catch(() => [] as DoctorWeeklyScheduleSlot[]),
    ])
      .then(([avail, exList, appList, scheds]) => {
        setServerSlots(avail.slots || []);
        setExceptions(exList || []);
        setBookedAppointments(appList.content || []);
        setWeeklySchedules(scheds || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (doctor) {
      loadScheduleData(doctor.id);
    }
  }, [doctor, today, maxDate]);

  // Construct dynamic times grid
  const timeSlots = useMemo(() => {
    const timesSet = new Set<string>(DEFAULT_GRID_TIMES);

    // Add times from weekly recurring shifts if any outside default grid
    weeklySchedules.forEach((ws) => {
      if (ws.startTime) timesSet.add(ws.startTime.substring(0, 5));
    });

    // Add times from server slots
    serverSlots.forEach((ss) => {
      if (ss.startTime) timesSet.add(ss.startTime.substring(0, 5));
    });

    // Add times from booked appointments
    bookedAppointments.forEach((ba) => {
      if (ba.startTime) timesSet.add(ba.startTime.substring(0, 5));
    });

    return Array.from(timesSet).sort();
  }, [weeklySchedules, serverSlots, bookedAppointments]);

  const dates = Array.from(
    { length: Math.min(view === 'Week' ? 7 : 1, 30 - offset) },
    (_, i) => addDays(today, offset + i),
  );

  const getSlotDetails = (day: string, slotTime: string) => {
    const normalized = slotTime.length === 5 ? slotTime : slotTime.substring(0, 5);

    // 1. Is there an active booked clinical appointment? (Highest priority)
    const app = bookedAppointments.find(
      (a) =>
        a.date === day &&
        a.startTime.substring(0, 5) === normalized &&
        a.status !== 'CANCELLED',
    );
    if (app) return { status: 'booked', appointment: app, exception: null };

    // 2. Is this slot in the past in Asia/Ho_Chi_Minh (UTC+7)?
    const instant = new Date(`${day}T${normalized}:00+07:00`).getTime();
    if (!Number.isFinite(instant) || instant <= Date.now()) {
      return { status: 'past', appointment: null, exception: null };
    }

    // 3. Is there an availability exception covering this slot?
    const ex = exceptions.find(
      (e) =>
        e.date === day &&
        e.startTime.substring(0, 5) <= normalized &&
        e.endTime.substring(0, 5) > normalized,
    );

    // If an exception explicitly blocks the slot:
    if (ex && (ex.shiftType === 'BREAK' || ex.shiftType === 'LEAVE')) {
      return { status: 'blocked', appointment: null, exception: ex };
    }

    // 4. Is it in server available slots returned by AvailabilityEngine?
    const isAvail = serverSlots.some(
      (s) => s.date === day && s.startTime.substring(0, 5) === normalized,
    );
    if (isAvail) {
      return { status: 'available', appointment: null, exception: ex?.shiftType === 'WORK' ? ex : null };
    }

    // 5. Otherwise, blocked by regular non-working schedule
    return { status: 'blocked', appointment: null, exception: ex ?? null };
  };

  const selectedSlotInfo = selected ? getSlotDetails(selected.date, selected.time) : null;

  async function handleToggleAvailability() {
    if (!selected || !selectedSlotInfo) return;
    if (!doctor) {
      setError('Doctor profile not loaded. Please refresh or ensure you are logged in as a registered doctor.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const normalizedStart = selected.time.length === 5 ? selected.time : selected.time.substring(0, 5);
      const [h, m] = normalizedStart.split(':').map(Number);
      const endMinutes = m + 30;
      const endH = endMinutes >= 60 ? h + 1 : h;
      const endM = endMinutes >= 60 ? endMinutes - 60 : endMinutes;
      const normalizedEnd = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      if (selectedSlotInfo.exception) {
        // Remove exception
        await deleteDoctorAvailabilityException(selectedSlotInfo.exception.id);
        setNotice(`Custom availability exception removed for ${selected.time} on ${formatDate(selected.date, true)}.`);
      } else if (selectedSlotInfo.status === 'available') {
        // Block available slot by adding a BREAK exception
        await addDoctorAvailabilityException({
          date: selected.date,
          startTime: normalizedStart,
          endTime: normalizedEnd,
          shiftType: 'BREAK',
        });
        setNotice(`Slot ${selected.time} on ${formatDate(selected.date, true)} is now blocked (break exception).`);
      } else {
        // Make slot available by adding WORK exception
        await addDoctorAvailabilityException({
          date: selected.date,
          startTime: normalizedStart,
          endTime: normalizedEnd,
          shiftType: 'WORK',
        });
        setNotice(`Slot ${selected.time} on ${formatDate(selected.date, true)} is now available (work exception).`);
      }

      setSelected(null);
      loadScheduleData(doctor.id);
    } catch (cause: unknown) {
      let msg = 'Unable to update availability exception.';
      if (typeof cause === 'object' && cause !== null && 'response' in cause) {
        const res = (cause as { response?: { data?: { detail?: string; message?: string } } }).response;
        if (res?.data?.detail) msg = res.data.detail;
        else if (res?.data?.message) msg = res.data.message;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const doctorId = doctor?.id ?? 1;

  return (
    <Page
      previewStates
      crumbs={[{ label: 'Doctor', to: '/doctor' }, { label: 'My schedule' }]}
    >
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Doctor Schedule Management</span>
          <h1>My schedule</h1>
          <p>
            Manage live availability and dated exceptions for {doctor?.fullName || 'Doctor'}. Changes immediately reflect in patient booking.
          </p>
        </div>
        <Button to={`/book/${doctorId}`} variant="outline">
          Preview patient booking
        </Button>
      </div>

      {notice && (
        <p className={styles.successBanner} role="status">
          {notice}
        </p>
      )}

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div className={styles.actions}>
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() =>
                setOffset(Math.max(0, offset - (view === 'Week' ? 7 : 1)))
              }
              aria-label="Previous period"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOffset(0)}>
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + (view === 'Week' ? 7 : 1) >= 30}
              onClick={() => setOffset(offset + (view === 'Week' ? 7 : 1))}
              aria-label="Next period"
            >
              <ChevronRight size={16} />
            </Button>
            <strong>{formatDate(dates[0], true)}</strong>
          </div>

          <div className={styles.actions}>
            {['Week', 'Day'].map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={view === value}
                className={`${styles.tab} ${view === value ? styles.active : ''}`}
                onClick={() => setView(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader2 className="spin" size={28} color="#026AA7" />
          </div>
        )}

        <div className={styles.grid}>
          {dates.map((date) => (
            <div key={date} className={styles.day}>
              <h2>{formatDate(date, true)}</h2>
              {timeSlots.map((time) => {
                const info = getSlotDetails(date, time);
                const value = info.status;
                return (
                  <button
                    type="button"
                    key={time}
                    disabled={value === 'past'}
                    className={`${styles.scheduleSlot} ${styles[value]}`}
                    aria-label={`${formatDate(date, true)} ${time} ${value}`}
                    onClick={() => {
                      setError('');
                      setSelected({ date, time });
                    }}
                  >
                    <strong>{time}</strong>
                    <small>{value}</small>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {selected && selectedSlotInfo && (
        <Modal
          title={
            selectedSlotInfo.status === 'booked'
              ? 'Booked clinical appointment'
              : selectedSlotInfo.exception
                ? 'Availability Exception'
                : 'Edit date availability'
          }
          onClose={() => setSelected(null)}
        >
          <p>
            {formatDate(selected.date)} at {selected.time} (UTC+7)
          </p>
          <p>
            Current status: <strong>{selectedSlotInfo.status}</strong>
            {selectedSlotInfo.exception && (
              <span> ({selectedSlotInfo.exception.shiftType} override)</span>
            )}
          </p>

          {selectedSlotInfo.status === 'booked' ? (
            <>
              <p>
                This slot belongs to a confirmed clinical appointment and cannot be modified directly.
              </p>
              {selectedSlotInfo.appointment && (
                <div style={{ marginTop: '1rem' }}>
                  <p><strong>Patient:</strong> {selectedSlotInfo.appointment.patientName}</p>
                  <p><strong>Reference:</strong> {selectedSlotInfo.appointment.appointmentCode}</p>
                  <Button
                    to={`/doctor/appointments/${selectedSlotInfo.appointment.id}`}
                    style={{ marginTop: '0.5rem' }}
                  >
                    View appointment details
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <p>
                {selectedSlotInfo.exception
                  ? `An availability override (${selectedSlotInfo.exception.shiftType}) is set for this time. Would you like to remove this override?`
                  : selectedSlotInfo.status === 'available'
                    ? 'Block this slot by adding a BREAK exception so patients cannot book it?'
                    : 'Make this slot available by adding a dated WORK exception?'}
              </p>

              {error && (
                <p className={styles.errorBanner} role="alert">
                  {error}
                </p>
              )}

              <div className={styles.actions} style={{ marginTop: '1.5rem' }}>
                <Button variant="outline" onClick={() => setSelected(null)} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleToggleAvailability} disabled={submitting || !doctor}>
                  {submitting
                    ? 'Updating...'
                    : selectedSlotInfo.exception
                      ? 'Remove exception'
                      : selectedSlotInfo.status === 'available'
                        ? 'Block slot (Add Break)'
                        : 'Make available (Add Work)'}
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </Page>
  );
}
