import { format } from 'date-fns';
import {
  Bot,
  CalendarCheck,
  Clock,
  Sparkles,
  Stethoscope,
  UserPlus,
  Users,
} from 'lucide-react';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';

import {
  getAdminDashboard,
  listDepartments,
  listDoctorRequests,
  listDoctors,
} from '../../api/adminApi';
import type {
  AdminDashboardData,
  Department,
  Doctor,
  DoctorRequest,
} from '../../api/adminTypes';
import AsyncSection from '../../components/admin/AsyncSection';
import StatTiles from '../../components/admin/StatTiles';
import StatusBadge from '../../components/admin/StatusBadge';
import { useAuth } from '../../context/useAuth';
import { useAsync } from '../../hooks/useAsync';

import styles from './AdminDashboard.module.css';

interface DashboardState {
  dashboard: AdminDashboardData;
  departments: Department[];
  requests: { items: DoctorRequest[]; total: number };
  onLeave: Doctor[];
}

const AdminDashboard = () => {
  const { user } = useAuth();

  const load = useCallback(async (): Promise<DashboardState> => {
    const [dashboard, departments, requests, onLeave] = await Promise.all([
      getAdminDashboard(),
      listDepartments(),
      listDoctorRequests(0, 5),
      listDoctors({ availability: 'ON_LEAVE', size: 5 }),
    ]);
    return {
      dashboard,
      departments,
      requests: { items: requests.content, total: requests.totalElements },
      onLeave: onLeave.content,
    };
  }, []);

  const { state, reload } = useAsync(load, []);

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>Welcome back, {user?.fullName ?? 'Administrator'}</h1>
          <p>{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
      </div>

      <AsyncSection state={state} onRetry={reload}>
        {({ dashboard, departments, requests, onLeave }) => {
          const maxTrend = Math.max(
            ...dashboard.last7DaysTrend.map((t) => t.count),
            1,
          );

          return (
            <>
              <StatTiles
                tiles={[
                  {
                    label: 'Total Patients',
                    value: dashboard.totalPatients,
                    icon: Users,
                    tone: 'blue',
                  },
                  {
                    label: 'Doctors',
                    value: `${dashboard.activeDoctors}/${dashboard.totalDoctors}`,
                    icon: Stethoscope,
                    tone: 'green',
                  },
                  {
                    label: 'Appointments',
                    value: dashboard.totalAppointments,
                    icon: CalendarCheck,
                    tone: 'blue',
                  },
                  {
                    label: 'Today’s Bookings',
                    value: dashboard.todayAppointments,
                    icon: Clock,
                    tone: 'orange',
                  },
                  {
                    label: 'Pending Requests',
                    value: requests.total,
                    icon: UserPlus,
                    tone: 'red',
                  },
                ]}
              />

              {/* Status and Analytics grid */}
              <div
                className="admin-dashboard-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: 20,
                  marginBottom: 20,
                }}
              >
                {/* 7-Day Trend Chart Card */}
                <section className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <div className="admin-card-title">
                        Appointments Trend (Last 7 Days)
                      </div>
                      <div className="admin-card-subtitle">
                        Total {dashboard.totalAppointments} recorded
                        appointments
                      </div>
                    </div>
                    <Link to="/admin/reports" className={styles.cardLink}>
                      Detailed Report &rarr;
                    </Link>
                  </div>

                  <div style={{ padding: '16px 20px 20px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        height: 120,
                        gap: 12,
                        paddingBottom: 8,
                        borderBottom: '1px solid #eef2f7',
                      }}
                    >
                      {dashboard.last7DaysTrend.map((t) => {
                        const heightPct = Math.round((t.count / maxTrend) * 100);
                        return (
                          <div
                            key={t.date}
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              height: '100%',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#1e293b',
                                marginBottom: 4,
                              }}
                            >
                              {t.count}
                            </span>
                            <div
                              style={{
                                width: '100%',
                                maxWidth: 28,
                                height: `${Math.max(heightPct, 6)}%`,
                                backgroundColor:
                                  t.count > 0 ? '#3b82f6' : '#e2e8f0',
                                borderRadius: '4px 4px 0 0',
                                transition: 'height 0.3s ease',
                              }}
                            />
                            <span
                              style={{
                                fontSize: 10,
                                color: '#64748b',
                                marginTop: 6,
                              }}
                            >
                              {t.dayName}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginTop: 14,
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: '#64748b',
                          marginRight: 4,
                        }}
                      >
                        Status breakdown:
                      </span>
                      {Object.entries(dashboard.appointmentsByStatus).map(
                        ([st, cnt]) => (
                          <span
                            key={st}
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: '#f1f5f9',
                              color: '#334155',
                              fontWeight: 500,
                            }}
                          >
                            {st}: <strong>{cnt}</strong>
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </section>

                {/* AI Telemetry & Usage Snapshot */}
                <section className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <div
                        className="admin-card-title"
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Sparkles size={16} color="#8b5cf6" />
                        AI Telemetry Overview
                      </div>
                      <div className="admin-card-subtitle">
                        Authoritative Google Cloud Gemini telemetry
                      </div>
                    </div>
                    <Link to="/admin/ai-usage" className={styles.cardLink}>
                      AI Usage & Quotas &rarr;
                    </Link>
                  </div>

                  <div style={{ padding: '16px 20px 20px' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: 12,
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Total Requests
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#1e293b',
                            marginTop: 2,
                          }}
                        >
                          {(() => {
                            const { totalRequests, requestsStatus } = dashboard.aiSummary;
                            if (requestsStatus === 'CONFIGURATION_REQUIRED') return 'Not Configured';
                            if (requestsStatus === 'CREDENTIALS_MISSING') return 'Credentials Missing';
                            if (requestsStatus === 'PERMISSION_DENIED') return 'Permission Denied';
                            if (requestsStatus === 'TEMPORARILY_UNAVAILABLE') return 'Unavailable';
                            if (requestsStatus === 'NO_DATA') return 'No Data';
                            if (totalRequests === null || totalRequests === undefined) return 'Unavailable';
                            return totalRequests.toLocaleString();
                          })()}
                        </div>
                      </div>
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: 12,
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Estimated Cost
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: dashboard.aiSummary.estimatedCost !== null ? '#059669' : '#64748b',
                            marginTop: 2,
                          }}
                        >
                          {(() => {
                            const { estimatedCost, costStatus } = dashboard.aiSummary;
                            if (costStatus === 'NOT_CONFIGURED' || costStatus === 'CONFIGURATION_REQUIRED') return 'Not Configured';
                            if (costStatus === 'CREDENTIALS_MISSING') return 'Credentials Missing';
                            if (costStatus === 'PERMISSION_DENIED') return 'Permission Denied';
                            if (costStatus === 'NO_DATA') return 'No Data';
                            if (estimatedCost === null || estimatedCost === undefined) return 'Unavailable';
                            return `$${Number(estimatedCost).toFixed(4)}`;
                          })()}
                        </div>
                      </div>
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: 12,
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Avg Latency
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#1e293b',
                            marginTop: 2,
                          }}
                        >
                          {(() => {
                            const { avgLatencyMs, latencyStatus } = dashboard.aiSummary;
                            if (latencyStatus === 'CONFIGURATION_REQUIRED') return 'Not Configured';
                            if (latencyStatus === 'CREDENTIALS_MISSING') return 'Credentials Missing';
                            if (latencyStatus === 'PERMISSION_DENIED') return 'Permission Denied';
                            if (latencyStatus === 'NO_DATA') return 'No Data';
                            if (avgLatencyMs === null || avgLatencyMs === undefined) return 'Unavailable';
                            return `${Math.round(avgLatencyMs)} ms`;
                          })()}
                        </div>
                      </div>
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: 12,
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Failure / Refusal
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color:
                              (dashboard.aiSummary.failureRatePercent ?? 0) > 5
                                ? '#dc2626'
                                : '#1e293b',
                            marginTop: 2,
                          }}
                        >
                          {(() => {
                            const { failureRatePercent, failureStatus } = dashboard.aiSummary;
                            if (failureStatus === 'CONFIGURATION_REQUIRED') return 'Not Configured';
                            if (failureStatus === 'CREDENTIALS_MISSING') return 'Credentials Missing';
                            if (failureStatus === 'PERMISSION_DENIED') return 'Permission Denied';
                            if (failureStatus === 'NO_DATA') return '0.0%';
                            if (failureRatePercent === null || failureRatePercent === undefined) return 'Unavailable';
                            return `${failureRatePercent.toFixed(1)}%`;
                          })()}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                          Refusal: Unavailable
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        fontSize: 12,
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Bot size={14} /> Authoritative Google Cloud Gemini telemetry.
                    </div>
                  </div>
                </section>
              </div>

              {/* Recent Appointments table */}
              <section
                className="admin-card admin-section-card"
                style={{ marginBottom: 20 }}
              >
                <div className="admin-card-head">
                  <div>
                    <div className="admin-card-title">Recent Appointments</div>
                    <div className="admin-card-subtitle">
                      Latest bookings across all departments
                    </div>
                  </div>
                  <Link to="/admin/appointments" className={styles.cardLink}>
                    View All Appointments &rarr;
                  </Link>
                </div>

                <div style={{ padding: '0 20px 16px' }}>
                  {dashboard.recentAppointments.length === 0 ? (
                    <p className={styles.empty}>No appointments recorded yet.</p>
                  ) : (
                    <div className="admin-table-wrap">
                      <table className="admin-data-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Patient</th>
                            <th>Doctor</th>
                            <th>Department</th>
                            <th>Date & Time</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.recentAppointments.map((item) => (
                            <tr key={item.id}>
                              <td style={{ fontWeight: 600 }}>#{item.id}</td>
                              <td>{item.patientName}</td>
                              <td>{item.doctorName}</td>
                              <td>{item.departmentName}</td>
                              <td>
                                {item.date} {item.time}
                              </td>
                              <td>
                                <StatusBadge value={item.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>

              {/* Department breakdown & Pending Requests */}
              <div className="admin-dashboard-grid">
                <section className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <div className="admin-card-title">
                        Doctors by department
                      </div>
                      <div className="admin-card-subtitle">
                        {departments.length}{' '}
                        {departments.length === 1 ? 'department' : 'departments'}
                        ,{' '}
                        {
                          departments.filter((one) => one.status === 'ACTIVE')
                            .length
                        }{' '}
                        active
                      </div>
                    </div>
                    <Link to="/admin/departments" className={styles.cardLink}>
                      Manage
                    </Link>
                  </div>
                  <div className="admin-department-list">
                    {departments.length === 0 ? (
                      <p className={styles.empty}>No departments yet.</p>
                    ) : (
                      departments.map((department) => (
                        <div className="admin-dept-row" key={department.id}>
                          <div>
                            <span>
                              {department.name}
                              {department.status === 'INACTIVE' && ' (retired)'}
                            </span>
                            <span>
                              {department.activeDoctors}{' '}
                              {department.activeDoctors === 1
                                ? 'doctor'
                                : 'doctors'}
                            </span>
                          </div>
                          <div className="admin-progressbar">
                            <span
                              style={{
                                width: `${barWidth(department, departments)}%`,
                              }}
                            />
                          </div>
                          <div className={styles.head}>
                            {department.headDoctor === null
                              ? 'No head assigned'
                              : `Head: ${department.headDoctor.fullName}`}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <div className="admin-card-title">
                        Waiting for approval
                      </div>
                      <div className="admin-card-subtitle">
                        Longest waiting first
                      </div>
                    </div>
                    <Link to="/admin/doctor-requests" className={styles.cardLink}>
                      Review all ({requests.total})
                    </Link>
                  </div>
                  <div className={styles.list}>
                    {requests.items.length === 0 ? (
                      <p className={styles.empty}>No pending doctor requests.</p>
                    ) : (
                      requests.items.map((request) => (
                        <div className={styles.row} key={request.userId}>
                          <div>
                            <strong>{request.fullName}</strong>
                            <small>{request.email}</small>
                          </div>
                          {!request.emailVerified && (
                            <span className="admin-badge warning">
                              Not activated
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              {/* Doctors on leave */}
              <section className="admin-card admin-section-card">
                <div className="admin-card-head">
                  <div>
                    <div className="admin-card-title">Doctors on leave</div>
                    <div className="admin-card-subtitle">
                      {dashboard.totalDoctors - dashboard.activeDoctors} inactive
                      or on leave
                    </div>
                  </div>
                  <Link to="/admin/doctors" className={styles.cardLink}>
                    Manage
                  </Link>
                </div>
                <div className={styles.list}>
                  {onLeave.length === 0 ? (
                    <p className={styles.empty}>Everyone is on duty.</p>
                  ) : (
                    onLeave.map((doctor) => (
                      <div className={styles.row} key={doctor.id}>
                        <div>
                          <strong>{doctor.fullName}</strong>
                          <small>
                            {doctor.department?.name ?? 'No department'}
                          </small>
                        </div>
                        <StatusBadge value={doctor.availability} />
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          );
        }}
      </AsyncSection>
    </>
  );
};

/** Relative to the busiest department, so the bars compare against each other, not a guess. */
const barWidth = (department: Department, all: Department[]) => {
  const busiest = Math.max(...all.map((one) => one.activeDoctors), 1);
  return Math.round((department.activeDoctors / busiest) * 100);
};

export default AdminDashboard;
