import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { useState } from 'react';
import {
  addDays,
  dateKey,
  formatDate,
  TIMES,
} from '../../data/appointmentDemo';
import { useAppointments } from '../../context/AppointmentContext';
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
  const { getSlotStatus } = useAppointments();
  const unavailable = (day: string, slot: string) =>
    getSlotStatus(doctorId, day, slot, excludeId) !== 'available';
  const today = dateKey();
  const dates = Array.from({ length: Math.min(7, 31 - offset) }, (_, i) =>
    addDays(today, offset + i),
  );
  const available = TIMES.filter((slot) => !unavailable(date, slot));
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
            onClick={() => setOffset(offset - 7)}
            aria-label="Previous week"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            disabled={offset + 7 > 30}
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
        <span>{available.length} slots available</span>
      </div>
      {available.length === 0 ? (
        <div className={styles.inlineEmpty}>
          No available times on this day. Please select another date.
        </div>
      ) : (
        <>
          {['Morning', 'Afternoon'].map((period, index) => (
            <fieldset key={period} className={styles.slotGroup}>
              <legend>{period}</legend>
              <div className={styles.slotGrid}>
                {TIMES.filter((slot) =>
                  index === 0 ? slot < '12:00' : slot >= '12:00',
                ).map((slot) => (
                  <button
                    type="button"
                    key={slot}
                    disabled={unavailable(date, slot)}
                    aria-label={`${slot} ${getSlotStatus(doctorId, date, slot, excludeId)}`}
                    aria-pressed={slot === time}
                    className={`${styles.slotButton} ${slot === time ? styles.selected : ''}`}
                    onClick={() => onChange(date, slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </>
      )}
      <label className={styles.field} style={{ marginTop: '1rem' }}>
        Choose another date
        <input
          type="date"
          min={today}
          max={addDays(today, 30)}
          value={date}
          onChange={(event) => {
            const day = event.target.value;
            if (day >= today && day <= addDays(today, 30)) {
              onChange(day, '');
              setOffset(
                Math.floor(
                  (new Date(`${day}T12:00:00+07:00`).getTime() -
                    new Date(`${today}T12:00:00+07:00`).getTime()) /
                    86400000 /
                    7,
                ) * 7,
              );
            }
          }}
        />
      </label>
      <p className={styles.help}>
        Unavailable times are disabled. No real reservation or hold is created.
      </p>
    </div>
  );
}
