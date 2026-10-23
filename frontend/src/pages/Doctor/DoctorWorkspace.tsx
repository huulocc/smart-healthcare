import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CalendarCheck,
  Loader2,
} from 'lucide-react';
import Button from '../../components/Button';
import {
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
import {
  getDoctorAppointments,
  type AppointmentConfirmation,
} from '../../api/bookingApi';
import { getMyProfile } from '../../api/userApi';
import styles from './DoctorWorkspace.module.css';

export default function DoctorWorkspace() {
  const { pathname } = useLocation();
  const { doctors, getSlotStatus } = useAppointments();
  const [appointments, setAppointments] = useState<AppointmentConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<number>(1);
  const [doctorName, setDoctorName] = useState<string>('Doctor');
  const [doctorDept, setDoctorDept] = useState<string>('Clinic');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [tab, setTab] = useState('All');
  const dashboard = pathname === '/doctor';

  useEffect(() => {
    let active = true;
    setLoading(true);

    getMyProfile()
      .then((user) => {
        if (!active) return;
        setDoctorName(user.fullName || 'Doctor');
        // Find matching doctor in doctors list
        const match = doctors.find(
          (d) => d.name.toLowerCase() === user.fullName.toLowerCase(),
        );
        if (match) {
          setDoctorId(match.id);
          setDoctorDept(match.department);
        }
      })
      .catch(() => {});

    getDoctorAppointments({ view: 'ALL', size: 100 })
      .then((res) => {
        if (!active) return;
        setAppointments(res.content || []);
        if (res.content && res.content.length > 0 && res.content[0].doctor) {
          setDoctorId(res.content[0].doctor.id);
          setDoctorName(res.content[0].doctor.name);
          setDoctorDept(res.content[0].doctor.departmentName ?? 'Clinic');
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [doctors]);

  const todayStr = dateKey();
  const today = appointments.filter((item) => item.date === todayStr);
  const upcoming = appointments.filter(
    (item) =>
      item.status === 'CONFIRMED' &&
      new Date(`${item.date}T${item.startTime.substring(0, 5)}:00+07:00`).getTime() > Date.now(),
  );

  const availableSlotsCount = Array.from({ length: 7 }, (_, i) => addDays(todayStr, i))
    .flatMap((date) => TIMES.map((time) => getSlotStatus(doctorId, date, time)))
    .filter((status) => status === 'available').length;

  const relevant = (dashboard ? today : appointments)
    .filter(
      (item) =>
        (!dateFilter || item.date === dateFilter) &&
        (filter === 'ALL' || item.status === filter) &&
        `${item.patientName} ${item.appointmentCode} ${item.id}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (dashboard ||
          tab === 'All' ||
          (tab === 'Today'
            ? item.date === todayStr
            : tab === 'Upcoming'
              ? upcoming.includes(item)
              : item.status === tab.toUpperCase())),
    )
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

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
          <span className={styles.eyebrow}>Doctor clinical workspace</span>
          <h1>
            {dashboard
              ? `Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, ${doctorName}`
              : 'Your assigned appointments'}
          </h1>
          <p>
            {dashboard
              ? 'Here is your clinical schedule for today.'
              : 'Review and manage your scheduled consultations.'}{' '}
            · {formatDate(todayStr, true)}
          </p>
        </div>
        <Button to="/doctor/schedule" variant="outline">
          Manage schedule
        </Button>
      </div>

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
              value: availableSlotsCount,
              sub: 'Next 7 days',
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
              <p>Appointments retrieved directly from hospital database.</p>
            </div>
            {dashboard && (
              <Button to="/doctor/appointments" variant="ghost" size="sm">
                View all appointments
              </Button>
            )}
          </div>

          <div className={styles.formRow} style={{ marginBottom: '1rem' }}>
            <label className={styles.field}>
              Search patient or appointment code
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
                <option value="NO_SHOW">No show</option>
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

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Loader2 className="spin" size={32} color="#026AA7" />
            </div>
          ) : relevant.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {relevant.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.startTime.substring(0, 5)} - {item.endTime.substring(0, 5)}</strong>
                        <small>{formatDate(item.date, true)}</small>
                      </td>
                      <td>
                        <strong>{item.patientName}</strong>
                        <small>{item.phone}</small>
                      </td>
                      <td>
                        <strong>{item.appointmentCode}</strong>
                        <small>{doctorDept}</small>
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
              description="No clinical appointments match your current filters."
            >
              <Button to="/doctor/schedule">Open schedule</Button>
            </EmptyState>
          )}
        </section>

        {dashboard && (
          <aside className={styles.stack}>
            <section className={styles.card}>
              <h2>Upcoming schedule</h2>
              <p className={styles.help}>Today's slot availability · UTC+7</p>
              {TIMES.slice(0, 6).map((time) => (
                <div key={time} className={styles.scheduleRow}>
                  <strong>{time}</strong>
                  <span>{getSlotStatus(doctorId, todayStr, time)}</span>
                </div>
              ))}
              <hr className={styles.divider} />
              <Button to="/doctor/schedule" fullWidth variant="outline">
                Manage schedule
              </Button>
            </section>
            <section className={styles.card}>
              <h2>Doctor profile</h2>
              <p className={styles.help}>
                Specialty: {doctorDept} · ID: {doctorId}
              </p>
              <Button to="/doctor/profile" variant="outline" fullWidth>
                View profile
              </Button>
            </section>
          </aside>
        )}
      </div>
    </Page>
  );
}
