import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Button from '../../components/Button';
import {
  Modal,
  Page,
} from '../../components/healthcare/HealthcareUI';
import { useAppointments } from '../../context/AppointmentContext';
import {
  addDays,
  dateKey,
  formatDate,
  TIMES,
} from '../../data/appointmentDemo';
import {
  addDoctorAvailabilityException,
  deleteDoctorAvailabilityException,
  getDoctorAvailability,
  getDoctorAvailabilityExceptions,
  getDoctorAppointments,
  type AvailabilityExceptionItem,
  type Slot,
  type AppointmentConfirmation,
} from '../../api/bookingApi';
import { getMyProfile } from '../../api/userApi';
import styles from './DoctorSchedule.module.css';

export default function DoctorSchedule() {
  const { doctors } = useAppointments();
  const [doctorId, setDoctorId] = useState<number>(1);
  const [offset, setOffset] = useState(0);
  const [view, setView] = useState('Week');
  const [selected, setSelected] = useState<{
    date: string;
    time: string;
  } | null>(null);

  const [serverSlots, setServerSlots] = useState<Slot[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityExceptionItem[]>([]);
  const [bookedAppointments, setBookedAppointments] = useState<AppointmentConfirmation[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const today = dateKey();
  const maxDate = addDays(today, 29);

  // Identify current doctor
  useEffect(() => {
    getMyProfile()
      .then((u) => {
        const match = doctors.find(
          (d) => d.name.toLowerCase() === u.fullName.toLowerCase(),
        );
        if (match) setDoctorId(match.id);
      })
      .catch(() => {});
  }, [doctors]);

  const loadScheduleData = (docId: number) => {
    setLoading(true);
    Promise.all([
      getDoctorAvailability(docId, today, maxDate),
      getDoctorAvailabilityExceptions({ from: today, to: maxDate }),
      getDoctorAppointments({ view: 'ALL', size: 100 }),
    ])
      .then(([avail, exList, appList]) => {
        setServerSlots(avail.slots || []);
        setExceptions(exList || []);
        setBookedAppointments(appList.content || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (doctorId) {
      loadScheduleData(doctorId);
    }
  }, [doctorId, today, maxDate]);

  const dates = Array.from(
    { length: Math.min(view === 'Week' ? 7 : 1, 30 - offset) },
    (_, i) => addDays(today, offset + i),
  );

  const getSlotDetails = (day: string, slotTime: string) => {
    const normalized = slotTime.length === 5 ? slotTime : slotTime.substring(0, 5);

    // 1. Is there an active booked appointment?
    const app = bookedAppointments.find(
      (a) =>
        a.date === day &&
        a.startTime.substring(0, 5) === normalized &&
        a.status !== 'CANCELLED',
    );
    if (app) return { status: 'booked', appointment: app, exception: null };

    // 2. Is there an availability exception covering this slot?
    const ex = exceptions.find(
      (e) =>
        e.date === day &&
        e.startTime.substring(0, 5) <= normalized &&
        e.endTime.substring(0, 5) > normalized,
    );
    if (ex) {
      if (ex.shiftType === 'WORK') return { status: 'available', appointment: null, exception: ex };
      return { status: 'blocked', appointment: null, exception: ex };
    }

    // 3. Is it in server available slots?
    const isAvail = serverSlots.some(
      (s) => s.date === day && s.startTime.substring(0, 5) === normalized,
    );
    if (isAvail) return { status: 'available', appointment: null, exception: null };

    // 4. Past or blocked by regular schedule
    const instant = new Date(`${day}T${normalized}:00+07:00`).getTime();
    if (!Number.isFinite(instant) || instant <= Date.now()) {
      return { status: 'past', appointment: null, exception: null };
    }

    return { status: 'blocked', appointment: null, exception: null };
  };

  const selectedSlotInfo = selected ? getSlotDetails(selected.date, selected.time) : null;

  async function handleToggleAvailability() {
    if (!selected || !selectedSlotInfo) return;
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
      loadScheduleData(doctorId);
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

  return (
    <Page
      previewStates
      crumbs={[{ label: 'Doctor', to: '/doctor' }, { label: 'My schedule' }]}
    >
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Doctor schedule management</span>
          <h1>My schedule</h1>
          <p>
            Manage live availability and dated exceptions. Changes immediately reflect in patient booking.
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
              {TIMES.map((time) => {
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
                  <p><strong>Code:</strong> {selectedSlotInfo.appointment.appointmentCode}</p>
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
                <Button onClick={handleToggleAvailability} loading={submitting}>
                  {selectedSlotInfo.exception
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
