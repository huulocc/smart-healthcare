import { ChevronLeft, ChevronRight, Clock3, AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import {
  addDays,
  dateKey,
  formatDate,
  TIMES,
} from '../../data/appointmentDemo';
import { useAppointments } from '../../context/AppointmentContext';
import { getDoctorAvailability, type Slot } from '../../api/bookingApi';
import type { Appointment } from '../../data/appointmentDemo';
import styles from './Healthcare.module.css';

interface Props {
  doctorId: number;
  appointments: Appointment[];
  date: string;
  time: string;
  onChange: (date: string, time: string) => void;
  excludeId?: string;
}

export default function AvailabilityPicker({
  doctorId,
  date,
  time,
  onChange,
  excludeId,
}: Props) {
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverSlots, setServerSlots] = useState<Slot[]>([]);
  const { appointments } = useAppointments();

  const today = dateKey();
  const maxDate = addDays(today, 29); // 30 calendar days window

  useEffect(() => {
    let active = true;
    if (!doctorId) return;

    setLoading(true);
    setError(null);

    getDoctorAvailability(doctorId, today, maxDate)
      .then((res) => {
        if (!active) return;
        setServerSlots(res.slots || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setLoading(false);
        // If 401 or network error
        if (err.response?.status === 401) {
          setError('Please log in to check live appointment availability.');
        } else {
          setError('Unable to load available slots from the clinic schedule.');
        }
      });

    return () => {
      active = false;
    };
  }, [doctorId, today, maxDate]);

  // Set of available slot keys: `${date}|${time}`
  const availableSet = useMemo(() => {
    const set = new Set<string>();
    for (const slot of serverSlots) {
      const normalizedTime =
        slot.startTime.length === 5 ? slot.startTime : slot.startTime.substring(0, 5);
      set.add(`${slot.date}|${normalizedTime}`);
    }

    // If rescheduling, allow original slot of the excluded appointment
    if (excludeId) {
      const existing = appointments.find((a) => a.id === excludeId);
      if (existing) {
        set.add(`${existing.date}|${existing.time}`);
      }
    }
    return set;
  }, [serverSlots, excludeId, appointments]);

  const isSlotAvailable = (day: string, slot: string) => {
    const normalizedSlot = slot.length === 5 ? slot : slot.substring(0, 5);
    return availableSet.has(`${day}|${normalizedSlot}`);
  };

  const dates = Array.from({ length: Math.min(7, 30 - offset) }, (_, i) =>
    addDays(today, offset + i),
  );

  // Available slots for the currently selected date
  const availableSlotsForDate = TIMES.filter((slot) => isSlotAvailable(date, slot));

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Choose a date & time</h2>
          <p>30-minute appointments · Vietnam time (UTC+7)</p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - 7))}
            aria-label="Previous week"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            disabled={offset + 7 >= 30}
            onClick={() => setOffset(offset + 7)}
            aria-label="Next week"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className={styles.dateGrid}>
        {dates.map((day) => {
          const weekday = new Date(`${day}T12:00:00+07:00`).toLocaleString(
            'en-GB',
            { weekday: 'short', timeZone: 'Asia/Ho_Chi_Minh' },
          );
          return (
            <button
              type="button"
              key={day}
              aria-pressed={day === date}
              aria-label={formatDate(day)}
              className={`${styles.dateButton} ${day === date ? styles.selected : ''}`}
              onClick={() => onChange(day, '')}
            >
              <small>{weekday}</small>
              <strong>{day.slice(-2)}</strong>
              <small>
                {new Date(`${day}T12:00:00+07:00`).toLocaleString('en-GB', {
                  month: 'short',
                  timeZone: 'Asia/Ho_Chi_Minh',
                })}
              </small>
            </button>
          );
        })}
      </div>

      <div className={styles.slotHeading}>
        <Clock3 size={16} />
        <strong>{formatDate(date, true)}</strong>
        {loading ? (
          <span>Loading slots…</span>
        ) : (
          <span>{availableSlotsForDate.length} slots available</span>
        )}
      </div>

      {loading && (
        <div className={styles.inlineEmpty} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Loader2 className="spin" size={18} />
          <span>Retrieving doctor schedule…</span>
        </div>
      )}

      {error && !loading && (
        <div className={styles.errorBanner} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && availableSlotsForDate.length === 0 ? (
        <div className={styles.inlineEmpty}>
          No available times on this day. Please select another date.
        </div>
      ) : null}

      {!loading && !error && availableSlotsForDate.length > 0 ? (
        <>
          {['Morning', 'Afternoon'].map((period, index) => {
            const periodSlots = TIMES.filter((slot) =>
              index === 0 ? slot < '12:00' : slot >= '12:00',
            );
            return (
              <fieldset key={period} className={styles.slotGroup}>
                <legend>{period}</legend>
                <div className={styles.slotGrid}>
                  {periodSlots.map((slot) => {
                    const available = isSlotAvailable(date, slot);
                    return (
                      <button
                        type="button"
                        key={slot}
                        disabled={!available}
                        aria-label={`${slot} ${available ? 'available' : 'unavailable'}`}
                        aria-pressed={slot === time}
                        className={`${styles.slotButton} ${slot === time ? styles.selected : ''}`}
                        onClick={() => onChange(date, slot)}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </>
      ) : null}

      <label className={styles.field} style={{ marginTop: '1rem' }}>
        Choose another date
        <input
          type="date"
          min={today}
          max={maxDate}
          value={date}
          onChange={(event) => {
            const day = event.target.value;
            if (day >= today && day <= maxDate) {
              onChange(day, '');
              const diffDays = Math.floor(
                (new Date(`${day}T12:00:00+07:00`).getTime() -
                  new Date(`${today}T12:00:00+07:00`).getTime()) /
                  86400000,
              );
              setOffset(Math.floor(diffDays / 7) * 7);
            }
          }}
        />
      </label>
      <p className={styles.help}>
        Only valid available slots from the clinic schedule are enabled.
      </p>
    </div>
  );
}
