import { useState } from 'react';
import { CalendarDays, Clock3, MapPin, Plus } from 'lucide-react';
import Button from '../../components/Button';
import {
  DemoNotice,
  EmptyState,
  Page,
  StatusBadge,
} from '../../components/healthcare/HealthcareUI';
import { useAppointments } from '../../context/AppointmentContext';
import { formatDate } from '../../data/appointmentDemo';
import styles from '../../components/healthcare/Healthcare.module.css';

export default function Appointments() {
  const { appointments: allAppointments, doctors } = useAppointments();
  const appointments = allAppointments.filter(
    (item) => item.source === 'booking',
  );
  const [tab, setTab] = useState('Upcoming');
  const tabs = ['Upcoming', 'Completed', 'Cancelled', 'All'];
  const matches = (status: string, value: string) =>
    value === 'All' ||
    (value === 'Upcoming'
      ? status === 'CONFIRMED' || status === 'IN_PROGRESS'
      : status.toLowerCase() === value.toLowerCase());
  const filtered = appointments
    .filter((item) => matches(item.status, tab))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  return (
    <Page crumbs={[{ label: 'My appointments' }]}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Your care, organized</span>
          <h1>My appointments</h1>
          <p>Keep track of your visits and manage your upcoming care.</p>
        </div>
        <Button to="/doctors">
          <Plus size={17} />
          Book an appointment
        </Button>
      </div>
      <DemoNotice />
      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Filter appointments"
      >
        {tabs.map((value) => (
          <button
            id={`tab-${value}`}
            aria-controls="appointment-results"
            key={value}
            className={styles.tab}
            role="tab"
            aria-selected={value === tab}
            onClick={() => setTab(value)}
          >
            {value} (
            {appointments.filter((item) => matches(item.status, value)).length})
          </button>
        ))}
      </div>
      <div
        id="appointment-results"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className={styles.stack}
      >
        {filtered.length === 0 ? (
          <EmptyState
            title={
              appointments.length === 0
                ? 'Your next visit starts here'
                : `No ${tab.toLowerCase()} appointments`
            }
            description={
              appointments.length === 0
                ? 'Find a doctor and choose a time. Demo bookings created during this session will appear here.'
                : 'Appointments with this status will appear here.'
            }
          >
            <Button to="/doctors">Find a doctor</Button>
          </EmptyState>
        ) : (
          filtered.map((item) => {
            const doctor = doctors.find((value) => value.id === item.doctorId)!;
            return (
              <article
                key={item.id}
                className={`${styles.card} ${styles.appointment}`}
              >
                <div className={styles.appointmentDate}>
                  <small>
                    {new Date(`${item.date}T12:00:00+07:00`).toLocaleString(
                      'en-GB',
                      { month: 'short', timeZone: 'Asia/Ho_Chi_Minh' },
                    )}
                  </small>
                  <strong>{item.date.slice(-2)}</strong>
                </div>
                <div className={styles.appointmentMain}>
                  <div className={`${styles.actions} ${styles.spread}`}>
                    <h2>{doctor.name}</h2>
                    <StatusBadge status={item.status} />
                  </div>
                  <p>
                    {doctor.specialty} · {item.patientName}
                  </p>
                  <div className={styles.appointmentMeta}>
                    <CalendarDays />
                    {formatDate(item.date, true)}
                    <Clock3 />
                    {item.time} (UTC+7)
                    <MapPin />
                    Room {doctor.room}
                  </div>
                </div>
                <div className={styles.actions}>
                  <Button
                    to={`/appointments/${item.id}`}
                    variant="outline"
                    size="sm"
                  >
                    View details
                  </Button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </Page>
  );
}
