import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  Bot,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarX,
  CircleCheck,
  CircleX,
  Clock3,
  Flag,
  HeartPulse,
  MoreHorizontal,
  Plus,
  Stethoscope,
  TrendingUp,
  UserPlus,
  Users,
  UserX,
  WalletCards,
  Loader2,
} from 'lucide-react';
import { managementConfigs, type ManagementKey } from './adminData';
import StatusBadge from './StatusBadge';
import {
  cancelAdminAppointment,
  getAdminAppointments,
  getAdminAppointmentStats,
  type AppointmentConfirmation,
  type AppointmentStatus,
} from '../../api/bookingApi';

const statusValues = new Set([
  'Confirmed',
  'Available',
  'Active',
  'Completed',
  'Paid',
  'Pending',
  'Waiting',
  'In Progress',
  'Cancelled',
  'Failed',
  'Flagged',
  'Processing',
  'Inactive',
  'On Leave',
  'Off Duty',
  'In Consultation',
  'Low',
]);

const icons = {
  users: Users,
  'user-plus': UserPlus,
  'heart-pulse': HeartPulse,
  'user-x': UserX,
  stethoscope: Stethoscope,
  'circle-check': CircleCheck,
  'calendar-check': CalendarCheck,
  'calendar-x': CalendarX,
  'calendar-days': CalendarDays,
  'calendar-clock': CalendarClock,
  'wallet-cards': WalletCards,
  'trending-up': TrendingUp,
  'clock-3': Clock3,
  'circle-x': CircleX,
  bot: Bot,
  activity: Activity,
  flag: Flag,
};

export default function AdminManagementPage({ type }: { type: ManagementKey }) {
  const isAppointments = type === 'appointments';

  // State for real appointments
  const [appointments, setAppointments] = useState<AppointmentConfirmation[]>([]);
  const [stats, setStats] = useState<Record<AppointmentStatus, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedApp, setSelectedApp] = useState<AppointmentConfirmation | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadRealAppointments = useCallback(() => {
    if (!isAppointments) return;
    setLoading(true);

    const queryStatus =
      statusFilter !== 'All' ? (statusFilter.toUpperCase() as AppointmentStatus) : undefined;

    Promise.all([
      getAdminAppointments({
        search: search.trim() || undefined,
        status: queryStatus,
        page,
        size: 10,
      }),
      getAdminAppointmentStats(),
    ])
      .then(([pageRes, statsRes]) => {
        setAppointments(pageRes.content || []);
        setTotalPages(pageRes.totalPages || 1);
        setTotalElements(pageRes.totalElements || 0);
        setStats(statsRes);
        if (pageRes.content && pageRes.content.length > 0) {
          setSelectedApp(pageRes.content[0]);
        } else {
          setSelectedApp(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [isAppointments, search, statusFilter, page]);

  useEffect(() => {
    if (isAppointments) {
      loadRealAppointments();
    }
  }, [isAppointments, loadRealAppointments]);

  const handleAdminCancel = async () => {
    if (!selectedApp) return;
    const reason = window.prompt('Enter cancellation reason:', 'Administrative cancellation');
    if (!reason) return;

    try {
      await cancelAdminAppointment(selectedApp.id, reason);
      setActionNotice(`Appointment ${selectedApp.appointmentCode} has been cancelled.`);
      loadRealAppointments();
    } catch {
      alert('Unable to cancel appointment.');
    }
  };

  // If not appointments, use existing mock configuration
  if (!isAppointments) {
    const data = managementConfigs[type];
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <h1>{data.title}</h1>
            <p>{data.subtitle}</p>
          </div>
          {data.action && (
            <button className="admin-primary-btn">
              <Plus />
              {data.action.replace('+ ', '')}
            </button>
          )}
        </div>
        {data.stats && (
          <div className="admin-kpi-grid">
            {data.stats.map((item) => {
              const Icon = icons[item.icon as keyof typeof icons] ?? Activity;
              return (
                <article className="admin-card admin-kpi" key={item.label}>
                  <div className="admin-kpi-top">
                    <div className="admin-kpi-label">{item.label}</div>
                    <div className={`admin-kpi-icon admin-tone-${item.tone}`}>
                      <Icon />
                    </div>
                  </div>
                  <div className="admin-kpi-value">{item.value}</div>
                  <div className="admin-trend">
                    Updated <span>today</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <div className="admin-management-layout">
          <article className="admin-card">
            <div className="admin-filters">
              <input
                className="admin-filter-search"
                placeholder={`Search ${type === 'ai' ? 'consultations' : type}...`}
              />
              {data.filters.map((filter) => (
                <select className="admin-filter-select" key={filter}>
                  <option>{filter}</option>
                </select>
              ))}
              <button className="admin-secondary-btn">Filter</button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    {data.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, index) => (
                    <tr key={`${type}-${index}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={`${cell}-${cellIndex}`}>
                          {statusValues.has(String(cell)) ? (
                            <StatusBadge status={String(cell)} />
                          ) : (
                            cell
                          )}
                        </td>
                      ))}
                      <td>
                        <button className="admin-action">
                          <MoreHorizontal />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-pagination">
              <span>Showing 1 to 5 of 128 records</span>
              <div className="admin-pager">
                <button>‹</button>
                <button className="current">1</button>
                <button>2</button>
                <button>3</button>
                <button>›</button>
              </div>
            </div>
          </article>
          <aside className="admin-card admin-detail-card">
            <div className="admin-detail-top">
              <div className="admin-detail-title">{data.detailTitle}</div>
              <p className="admin-card-subtitle">Selected record overview</p>
            </div>
            <div className="admin-mini-stats">
              <div className="admin-mini-stat">
                <b>98%</b>
                <span>Profile complete</span>
              </div>
              <div className="admin-mini-stat">
                <b>24</b>
                <span>Recent activities</span>
              </div>
            </div>
            <div className="admin-detail-grid">
              {data.detail.map((item) => (
                <div className="admin-detail-field" key={item.label}>
                  <label>{item.label}</label>
                  <div>
                    {item.status ? (
                      <StatusBadge status={String(item.value)} />
                    ) : (
                      item.value
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 19px' }}>
              <button
                className="admin-secondary-btn"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                View Full Details
              </button>
            </div>
          </aside>
        </div>
      </>
    );
  }

  // Real Appointments Management UI
  const realStats = [
    {
      label: 'Confirmed',
      value: String(stats?.CONFIRMED ?? 0),
      icon: 'calendar-days',
      tone: 'blue',
    },
    {
      label: 'In Progress',
      value: String(stats?.IN_PROGRESS ?? 0),
      icon: 'calendar-clock',
      tone: 'green',
    },
    {
      label: 'Completed',
      value: String(stats?.COMPLETED ?? 0),
      icon: 'circle-check',
      tone: 'orange',
    },
    {
      label: 'Cancelled',
      value: String(stats?.CANCELLED ?? 0),
      icon: 'calendar-x',
      tone: 'red',
    },
  ];

  const columns = [
    'Appointment Code',
    'Patient Attendee',
    'Doctor',
    'Department',
    'Date',
    'Time',
    'Status',
    'Billing',
  ];

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>Appointments</h1>
          <p>Real-time clinical appointments management across all departments.</p>
        </div>
      </div>

      {actionNotice && (
        <div style={{ padding: '12px 16px', backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', borderRadius: '8px', marginBottom: '1rem' }}>
          {actionNotice}
        </div>
      )}

      <div className="admin-kpi-grid">
        {realStats.map((item) => {
          const Icon = icons[item.icon as keyof typeof icons] ?? Activity;
          return (
            <article className="admin-card admin-kpi" key={item.label}>
              <div className="admin-kpi-top">
                <div className="admin-kpi-label">{item.label}</div>
                <div className={`admin-kpi-icon admin-tone-${item.tone}`}>
                  <Icon />
                </div>
              </div>
              <div className="admin-kpi-value">{item.value}</div>
              <div className="admin-trend">
                Database live <span>count</span>
              </div>
            </article>
          );
        })}
      </div>

      <div className="admin-management-layout">
        <article className="admin-card">
          <div className="admin-filters">
            <input
              className="admin-filter-search"
              placeholder="Search attendee, code, or patient..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
            <select
              className="admin-filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="All">All statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="In_Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No_Show">No Show</option>
            </select>
            <button className="admin-secondary-btn" onClick={() => loadRealAppointments()}>
              Refresh
            </button>
          </div>

          <div className="admin-table-wrap">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <Loader2 className="spin" size={32} color="#026AA7" />
              </div>
            ) : (
              <table className="admin-data-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '2rem' }}>
                        No appointments found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    appointments.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedApp(item)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor:
                            selectedApp?.id === item.id ? '#F1F5F9' : undefined,
                        }}
                      >
                        <td><strong>{item.appointmentCode}</strong></td>
                        <td>{item.patientName}</td>
                        <td>{item.doctor.name}</td>
                        <td>{item.doctor.departmentName ?? 'Cardiology'}</td>
                        <td>{item.date}</td>
                        <td>{item.startTime.substring(0, 5)}</td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td>Clinic</td>
                        <td>
                          <button
                            className="admin-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApp(item);
                            }}
                          >
                            <MoreHorizontal />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="admin-pagination">
            <span>
              Showing {appointments.length} of {totalElements} records
            </span>
            <div className="admin-pager">
              <button
                disabled={page === 0}
                onClick={() => setPage(Math.max(0, page - 1))}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={page === i ? 'current' : ''}
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                ›
              </button>
            </div>
          </div>
        </article>

        <aside className="admin-card admin-detail-card">
          <div className="admin-detail-top">
            <div className="admin-detail-title">
              {selectedApp ? selectedApp.appointmentCode : 'Appointment Overview'}
            </div>
            <p className="admin-card-subtitle">Database record details</p>
          </div>

          {selectedApp ? (
            <>
              <div className="admin-detail-grid">
                <div className="admin-detail-field">
                  <label>Appointment Code</label>
                  <div>{selectedApp.appointmentCode}</div>
                </div>
                <div className="admin-detail-field">
                  <label>Attendee</label>
                  <div>{selectedApp.patientName}</div>
                </div>
                <div className="admin-detail-field">
                  <label>Doctor</label>
                  <div>{selectedApp.doctor.name}</div>
                </div>
                <div className="admin-detail-field">
                  <label>Department</label>
                  <div>{selectedApp.doctor.departmentName ?? 'Cardiology'}</div>
                </div>
                <div className="admin-detail-field">
                  <label>Date & Time</label>
                  <div>
                    {selectedApp.date}, {selectedApp.startTime.substring(0, 5)} - {selectedApp.endTime.substring(0, 5)}
                  </div>
                </div>
                <div className="admin-detail-field">
                  <label>Phone</label>
                  <div>{selectedApp.phone}</div>
                </div>
                <div className="admin-detail-field">
                  <label>Email</label>
                  <div>{selectedApp.email}</div>
                </div>
                <div className="admin-detail-field">
                  <label>Status</label>
                  <div>
                    <StatusBadge status={selectedApp.status} />
                  </div>
                </div>
                <div className="admin-detail-field">
                  <label>Reason</label>
                  <div style={{ fontSize: '0.85rem' }}>{selectedApp.reason || 'None provided'}</div>
                </div>
                {selectedApp.cancellationReason && (
                  <div className="admin-detail-field">
                    <label>Cancel Reason</label>
                    <div style={{ color: '#DC2626', fontSize: '0.85rem' }}>
                      {selectedApp.cancellationReason}
                    </div>
                  </div>
                )}
                {selectedApp.notes && (
                  <div className="admin-detail-field">
                    <label>Clinical Notes</label>
                    <div style={{ fontSize: '0.85rem' }}>{selectedApp.notes}</div>
                  </div>
                )}
              </div>

              <div style={{ padding: '0 19px', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedApp.status === 'CONFIRMED' || selectedApp.status === 'PENDING') && (
                  <button
                    className="admin-secondary-btn"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      color: '#DC2626',
                      borderColor: '#FECACA',
                    }}
                    onClick={handleAdminCancel}
                  >
                    Cancel Appointment
                  </button>
                )}
              </div>
            </>
          ) : (
            <p style={{ padding: '1rem', color: '#64748B' }}>
              Select an appointment from the list to review details.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
