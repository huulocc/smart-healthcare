import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CalendarCheck,
} from 'lucide-react';
import Button from '../../components/Button';
import {
  DemoNotice,
  EmptyState,
  Page,
  StatusBadge,
} from '../../components/healthcare/HealthcareUI';
import { useAppointments } from '../../context/AppointmentContext';
import {
  addDays,
  dateKey,
  formatDate,
  TIMES,
} from '../../data/appointmentDemo';
import styles from './DoctorWorkspace.module.css';

export default function DoctorWorkspace() {
  const { pathname } = useLocation();
  const { appointments, doctors, getSlotStatus } = useAppointments();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [tab, setTab] = useState('All');
  const dashboard = pathname === '/doctor';
  const doctor = doctors[0];
  const own = appointments.filter((item) => item.doctorId === doctor.id);
  const today = own.filter((item) => item.date === dateKey());
  const upcoming = own.filter(
    (item) =>
      item.status === 'CONFIRMED' &&
      new Date(`${item.date}T${item.time}:00+07:00`).getTime() > Date.now(),
  );
  const available = Array.from({ length: 7 }, (_, i) => addDays(dateKey(), i))
    .flatMap((date) => TIMES.map((time) => getSlotStatus(1, date, time)))
    .filter((status) => status === 'available').length;
  const relevant = (dashboard ? today : own)
    .filter(
      (item) =>
        (!dateFilter || item.date === dateFilter) &&
        (filter === 'ALL' || item.status === filter) &&
        `${item.patientName} ${item.id}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (dashboard ||
          tab === 'All' ||
          (tab === 'Today'
            ? item.date === dateKey()
            : tab === 'Upcoming'
              ? upcoming.includes(item)
              : item.status === tab.toUpperCase())),
    )
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date()),
  );
  return (
    <Page
      crumbs={[
        { label: 'Doctor', to: '/doctor' },
        { label: dashboard ? 'Dashboard' : 'Appointments' },
      ]}
    >
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Doctor workspace preview</span>
          <h1>
            {dashboard
              ? `Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, ${doctor.name}`
              : 'Your appointments'}
          </h1>
          <p>
            {dashboard
              ? 'Here is your schedule for today.'
              : 'Review and manage your demo consultations.'}{' '}
            · {formatDate(dateKey(), true)}
          </p>
        </div>
        <Button to="/doctor/schedule" variant="outline">
          Manage schedule
        </Button>
      </div>
      <DemoNotice />
      {dashboard && (
        <div className={styles.statGrid}>
          {[
            {
              title: 'Today’s appointments',
              value: today.filter((item) => item.status !== 'CANCELLED').length,
              sub: 'Visits scheduled today',
              icon: CalendarDays,
            },
            {
              title: 'Upcoming',
              value: upcoming.length,
              sub: 'Confirmed future visits',
              icon: Clock3,
            },
            {
              title: 'Completed today',
              value: today.filter((item) => item.status === 'COMPLETED').length,
              sub: 'From today’s schedule',
              icon: CheckCircle2,
            },
            {
              title: 'Available slots this week',
              value: available,
              sub: 'Next 7 days · Demo',
              icon: CalendarCheck,
            },
          ].map(({ title, value, sub, icon: Icon }) => (
            <div className={`${styles.card} ${styles.statCard}`} key={title}>
              <div>
                {title}
                <Icon />
              </div>
              <strong>{value}</strong>
              <small>{sub}</small>
            </div>
          ))}
        </div>
      )}
      {!dashboard && (
        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Appointment period"
        >
          {['Today', 'Upcoming', 'Completed', 'Cancelled', 'All'].map(
            (value) => (
              <button
                type="button"
                key={value}
                role="tab"
                aria-selected={tab === value}
                className={styles.tab}
                onClick={() => setTab(value)}
              >
                {value}
              </button>
            ),
          )}
        </div>
      )}
      <div className={dashboard ? styles.twoColumn : undefined}>
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>{dashboard ? 'Today’s appointments' : 'Appointment list'}</h2>
              <p>Patient names are sample data. Open a visit for details.</p>
            </div>
            {dashboard && (
              <Button to="/doctor/appointments" variant="ghost" size="sm">
                View appointments
              </Button>
            )}
          </div>
          <div className={styles.formRow} style={{ marginBottom: '1rem' }}>
            <label className={styles.field}>
              Search patient or booking ID
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search…"
              />
            </label>
            <label className={styles.field}>
              Status
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="ALL">All statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>
          </div>
          {!dashboard && (
            <label
              className={styles.field}
              style={{ maxWidth: 250, marginBottom: '1rem' }}
            >
              Date (optional)
              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
            </label>
          )}
          {relevant.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Type / service</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {relevant.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.time}</strong>
                        <small>{formatDate(item.date, true)}</small>
                      </td>
                      <td>
                        <strong>{item.patientName}</strong>
                        <small>{item.id.slice(0, 14)}</small>
                      </td>
                      <td>
                        In person<small>{doctor.department}</small>
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>
                        <Button
                          to={`/doctor/appointments/${item.id}`}
                          size="sm"
                          variant="outline"
                        >
                          View details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No appointments to show"
              description="Try another filter or open your schedule to manage available times."
            >
              <Button to="/doctor/schedule">Open schedule</Button>
            </EmptyState>
          )}
        </section>
        {dashboard && (
          <aside className={styles.stack}>
            <section className={styles.card}>
              <h2>Upcoming schedule</h2>
              <p className={styles.help}>Sample slot status · UTC+7</p>
              {TIMES.slice(0, 5).map((time) => (
                <div key={time} className={styles.scheduleRow}>
                  <strong>{time}</strong>
                  <span>{getSlotStatus(1, dateKey(), time)}</span>
                </div>
              ))}
              <hr className={styles.divider} />
              <Button to="/doctor/schedule" fullWidth variant="outline">
                Manage schedule
              </Button>
            </section>
            <section className={styles.card}>
              <h2>Public profile</h2>
              <p className={styles.help}>
                Update your demo biography and public information.
              </p>
              <Button to="/doctor/profile" variant="outline" fullWidth>
                Edit profile
              </Button>
            </section>
          </aside>
        )}
      </div>
    </Page>
  );
}
