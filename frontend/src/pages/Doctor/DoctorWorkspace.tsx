import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CalendarCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Button from '../../components/Button';
import {
  EmptyState,
  Page,
  StatusBadge,
} from '../../components/healthcare/HealthcareUI';
import {
  addDays,
  dateKey,
  formatDate,
} from '../../data/appointmentDemo';
import {
  getDoctorAppointments,
  getDoctorAvailability,
  getDoctorMe,
  getDoctorStatistics,
  type AppointmentConfirmation,
  type AppointmentStatus,
  type DoctorProfile,
  type Slot,
} from '../../api/bookingApi';
import styles from './DoctorWorkspace.module.css';

export default function DoctorWorkspace() {
  const { pathname } = useLocation();
  const dashboard = pathname === '/doctor';

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [appointments, setAppointments] = useState<AppointmentConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [todaySlots, setTodaySlots] = useState<Slot[]>([]);
  const [availableSlotsCount, setAvailableSlotsCount] = useState<number>(0);
  const [statusCounts, setStatusCounts] = useState<Record<AppointmentStatus, number>>({
    PENDING: 0,
    CONFIRMED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CANCELLED: 0,
    NO_SHOW: 0,
  });

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [tab, setTab] = useState('All');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  const todayStr = dateKey();
  const next7DaysStr = addDays(todayStr, 6);

  // 1. Load authenticated doctor profile
  useEffect(() => {
    let active = true;
    getDoctorMe()
      .then((data) => {
        if (active) setDoctor(data);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // 2. Load doctor statistics and availability
  useEffect(() => {
    if (!doctor) return;
    let active = true;

    // Load SQL Server statistics
    getDoctorStatistics()
      .then((stats) => {
        if (active) setStatusCounts(stats);
      })
      .catch(() => {});

    // Load authoritative availability slots for the next 7 days
    getDoctorAvailability(doctor.id, todayStr, next7DaysStr)
      .then((avail) => {
        if (!active) return;
        const slots = avail.slots || [];
        setAvailableSlotsCount(slots.length);
        const todayOnly = slots.filter((s) => s.date === todayStr);
        setTodaySlots(todayOnly);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [doctor, todayStr, next7DaysStr]);

  // 3. Load appointments with real pagination & filtering
  const loadAppointments = useCallback(() => {
    if (!doctor) {
      setLoading(false);
      return;
    }
    setLoading(true);

    let statusParam: AppointmentStatus | undefined = undefined;
    if (filter !== 'ALL') {
      statusParam = filter as AppointmentStatus;
    } else if (tab === 'Completed') {
      statusParam = 'COMPLETED';
    } else if (tab === 'Cancelled') {
      statusParam = 'CANCELLED';
    }

    const viewParam = tab === 'Upcoming' ? 'UPCOMING' : 'ALL';
    const fromParam = tab === 'Today' ? todayStr : (dateFilter || undefined);
    const toParam = tab === 'Today' ? todayStr : (dateFilter || undefined);

    getDoctorAppointments({
      status: statusParam,
      from: fromParam,
      to: toParam,
      view: viewParam,
      search: search.trim() || undefined,
      page: dashboard ? 0 : page,
      size: dashboard ? 20 : pageSize,
    })
      .then((res) => {
        setAppointments(res.content || []);
        setTotalPages(res.totalPages || 1);
        setTotalElements(res.totalElements || 0);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [doctor, filter, tab, dateFilter, search, page, dashboard, todayStr]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Reset page when filters change
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPage(0);
  };

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    setPage(0);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(0);
  };

  const handleDateChange = (val: string) => {
    setDateFilter(val);
    setPage(0);
  };

  const todayVisits = appointments.filter((item) => item.date === todayStr);
  const doctorName = doctor?.fullName || 'Doctor';
  const doctorDept = doctor?.departmentName || 'Clinic';

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
          <span className={styles.eyebrow}>Doctor Clinical Workspace</span>
          <h1>
            {dashboard
              ? `Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, ${doctorName}`
              : 'Your Assigned Appointments'}
          </h1>
          <p>
            {dashboard
              ? `Doctor ID: ${doctor?.doctorCode || '...'} • Department: ${doctorDept}`
              : 'Review and manage your scheduled patient consultations.'}{' '}
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
              value: todayVisits.filter((item) => item.status !== 'CANCELLED').length,
              sub: 'Visits scheduled today',
              icon: CalendarDays,
            },
            {
              title: 'Confirmed upcoming',
              value: (statusCounts.CONFIRMED || 0) + (statusCounts.PENDING || 0),
              sub: 'Awaiting consultation',
              icon: Clock3,
            },
            {
              title: 'Completed consultations',
              value: statusCounts.COMPLETED || 0,
              sub: 'Total finished visits',
              icon: CheckCircle2,
            },
            {
              title: 'Available slots this week',
              value: availableSlotsCount,
              sub: 'Next 7 days (open for booking)',
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
          {['All', 'Today', 'Upcoming', 'Completed', 'Cancelled'].map((value) => (
            <button
              type="button"
              key={value}
              role="tab"
              aria-selected={tab === value}
              className={styles.tab}
              onClick={() => handleTabChange(value)}
            >
              {value}
            </button>
          ))}
        </div>
      )}

      <div className={dashboard ? styles.twoColumn : undefined}>
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>{dashboard ? 'Today’s appointments' : 'Appointment list'}</h2>
              <p>Appointments retrieved directly from hospital database ({totalElements} total).</p>
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
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search by patient name or reference code…"
              />
            </label>
            <label className={styles.field}>
              Status
              <select
                value={filter}
                onChange={(event) => handleFilterChange(event.target.value)}
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
              Filter by date (optional)
              <input
                type="date"
                value={dateFilter}
                onChange={(event) => handleDateChange(event.target.value)}
              />
            </label>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Loader2 className="spin" size={32} color="#026AA7" />
            </div>
          ) : appointments.length ? (
            <>
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
                    {appointments.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>
                            {item.startTime.substring(0, 5)} - {item.endTime.substring(0, 5)}
                          </strong>
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

              {/* Pagination for Appointments page */}
              {!dashboard && totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1.25rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  <small style={{ color: '#64748b' }}>
                    Showing page {page + 1} of {totalPages} ({totalElements} appointments)
                  </small>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft size={16} /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
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
              <h2>Today's Available Slots</h2>
              <p className={styles.help}>Authoritative availability from hospital system · UTC+7</p>
              {todaySlots.length > 0 ? (
                todaySlots.slice(0, 6).map((slot) => (
                  <div key={slot.startTime} className={styles.scheduleRow}>
                    <strong>{slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}</strong>
                    <span style={{ color: '#059669', fontWeight: 600 }}>Available</span>
                  </div>
                ))
              ) : (
                <p style={{ color: '#64748b', fontSize: '0.875rem', padding: '0.5rem 0' }}>
                  No open slots remaining for today.
                </p>
              )}
              <hr className={styles.divider} />
              <Button to="/doctor/schedule" fullWidth variant="outline">
                Manage schedule
              </Button>
            </section>

            <section className={styles.card}>
              <h2>Doctor profile</h2>
              <p className={styles.help}>
                {doctor?.specialty || 'Specialist'} · {doctor?.doctorCode || 'Doctor'}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0.5rem 0 1rem' }}>
                Department: <strong>{doctorDept}</strong>
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
