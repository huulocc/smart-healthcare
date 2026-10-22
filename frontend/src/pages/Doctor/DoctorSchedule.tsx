import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../../components/Button';
import {
  DemoNotice,
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
import styles from './DoctorSchedule.module.css';

export default function DoctorSchedule() {
  const { getSlotStatus, setAvailability, appointments } = useAppointments();
  const [offset, setOffset] = useState(0);
  const [view, setView] = useState('Week');
  const [selected, setSelected] = useState<{
    date: string;
    time: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dates = Array.from(
    { length: Math.min(view === 'Week' ? 7 : 1, 31 - offset) },
    (_, i) => addDays(dateKey(), offset + i),
  );
  const status = selected
    ? getSlotStatus(1, selected.date, selected.time)
    : 'available';
  const booked =
    selected &&
    appointments.find(
      (item) =>
        item.doctorId === 1 &&
        item.date === selected.date &&
        item.time === selected.time &&
        item.status !== 'CANCELLED',
    );
  return (
    <Page
      previewStates
      crumbs={[{ label: 'Doctor', to: '/doctor' }, { label: 'My schedule' }]}
    >
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Doctor workspace preview</span>
          <h1>My schedule</h1>
          <p>
            Manage sample availability. Changes also appear in patient booking.
          </p>
        </div>
        <Button to="/book/1" variant="outline">
          Preview patient booking
        </Button>
      </div>
      <DemoNotice />
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
              disabled={offset + (view === 'Week' ? 7 : 1) > 30}
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
                className={`${styles.slotButton} ${view === value ? styles.selected : ''}`}
                onClick={() => setView(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.legend}>
          {['available', 'booked', 'blocked', 'past'].map((value) => (
            <span key={value} className={styles[value]}>
              {value}
            </span>
          ))}
        </div>
        <div
          className={styles.scheduleGrid}
          style={{ '--day-count': dates.length } as React.CSSProperties}
        >
          {dates.map((date) => (
            <div key={date} className={styles.day}>
              <h2>{formatDate(date, true)}</h2>
              {TIMES.map((time) => {
                const value = getSlotStatus(1, date, time);
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
      {selected && (
        <Modal
          title={
            status === 'booked'
              ? 'Booked appointment'
              : 'Edit availability · Demo'
          }
          onClose={() => setSelected(null)}
        >
          <p>
            {formatDate(selected.date)} at {selected.time} (UTC+7)
          </p>
          <p>
            Current status: <strong>{status}</strong>
          </p>
          {status === 'booked' ? (
            <>
              <p>
                This slot belongs to an appointment and cannot be made available
                directly.
              </p>
              {booked && (
                <Button to={`/doctor/appointments/${booked.id}`}>
                  View appointment
                </Button>
              )}
            </>
          ) : (
            <>
              <p>
                {status === 'available'
                  ? 'Block this slot so it cannot be selected in patient booking.'
                  : 'Make this slot available for demo bookings.'}
              </p>
              {error && (
                <p className={styles.errorBanner} role="alert">
                  {error}
                </p>
              )}
              <div className={styles.actions}>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    try {
                      setAvailability(
                        selected.date,
                        selected.time,
                        status !== 'available',
                      );
                      setNotice(
                        `Demo slot ${selected.time} on ${formatDate(selected.date, true)} is now ${status === 'available' ? 'blocked' : 'available'}.`,
                      );
                      setSelected(null);
                    } catch (cause) {
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : 'Unable to save.',
                      );
                    }
                  }}
                >
                  {status === 'available'
                    ? 'Block this slot & save'
                    : 'Make available & save'}
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </Page>
  );
}
