import {
  Calendar,
  CheckCircle2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import {
  getReportAppointmentsTrend,
  getReportDepartmentStats,
  getReportDoctorPerformance,
  getReportPatientGrowth,
  getReportSummary,
} from '../../api/adminApi';
import type {
  DepartmentStats,
  DoctorPerformance,
  PatientGrowthPoint,
  ReportSummary,
  TrendPoint,
} from '../../api/adminTypes';
import AsyncSection from '../../components/admin/AsyncSection';
import StatTiles from '../../components/admin/StatTiles';
import { useAsync } from '../../hooks/useAsync';

interface ReportData {
  summary: ReportSummary;
  trend: TrendPoint[];
  departments: DepartmentStats[];
  doctors: DoctorPerformance[];
  patientGrowth: PatientGrowthPoint[];
}

export default function AdminReports() {
  // Default: last 30 days
  const todayStr = new Date().toISOString().substring(0, 10);
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);

  const [from, setFrom] = useState(thirtyDaysAgoStr);
  const [to, setTo] = useState(todayStr);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DEPARTMENTS' | 'DOCTORS' | 'PATIENTS'>('OVERVIEW');

  const load = useCallback(async (): Promise<ReportData> => {
    const [summary, trend, departments, doctors, patientGrowth] =
      await Promise.all([
        getReportSummary(from, to),
        getReportAppointmentsTrend(from, to),
        getReportDepartmentStats(from, to),
        getReportDoctorPerformance(from, to),
        getReportPatientGrowth(from, to),
      ]);
    return { summary, trend, departments, doctors, patientGrowth };
  }, [from, to]);

  const { state, reload } = useAsync(load, [load]);

  return (
    <>
      <div
        className="admin-page-heading"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1>Operational Reports & Analytics</h1>
          <p>Clinical metrics, appointment volume trends, and department performance</p>
        </div>

        {/* Date Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <Calendar size={16} color="#64748b" />
          <input
            type="date"
            className="admin-input"
            style={{ width: 'auto', padding: '4px 8px' }}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span style={{ color: '#94a3b8' }}>&rarr;</span>
          <input
            type="date"
            className="admin-input"
            style={{ width: 'auto', padding: '4px 8px' }}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <button
            type="button"
            className="admin-btn primary"
            style={{ padding: '5px 12px', fontSize: 13 }}
            onClick={reload}
          >
            Apply
          </button>
        </div>
      </div>

      <AsyncSection state={state} onRetry={reload}>
        {({ summary, trend, departments, doctors, patientGrowth }) => {
          const maxTrend = Math.max(...trend.map((t) => t.total), 1);
          const maxPatientGrowth = Math.max(...patientGrowth.map((p) => p.newPatients), 1);

          return (
            <>
              {/* Summary KPIs */}
              <StatTiles
                tiles={[
                  {
                    label: 'Total Appointments',
                    value: summary.totalAppointments,
                    icon: Calendar,
                    tone: 'blue',
                  },
                  {
                    label: 'Completed Rate',
                    value: `${summary.completionRatePercent.toFixed(1)}%`,
                    icon: CheckCircle2,
                    tone: 'green',
                  },
                  {
                    label: 'Completed Bookings',
                    value: summary.completedAppointments,
                    icon: UserCheck,
                    tone: 'blue',
                  },
                  {
                    label: 'Cancelled / No-show',
                    value: `${summary.cancelledAppointments} / ${summary.noShowAppointments}`,
                    icon: XCircle,
                    tone: 'red',
                  },
                  {
                    label: 'Active Patients',
                    value: summary.totalActivePatients,
                    icon: Users,
                    tone: 'blue',
                  },
                ]}
              />

              {/* Navigation Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  borderBottom: '1px solid #e2e8f0',
                  margin: '20px 0 16px',
                }}
              >
                {[
                  { id: 'OVERVIEW', label: 'Appointment Trends' },
                  { id: 'DEPARTMENTS', label: 'Department Analytics' },
                  { id: 'DOCTORS', label: 'Doctor Performance' },
                  { id: 'PATIENTS', label: 'Patient Growth' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom:
                        activeTab === tab.id
                          ? '2px solid #2563eb'
                          : '2px solid transparent',
                      color: activeTab === tab.id ? '#2563eb' : '#64748b',
                      fontWeight: activeTab === tab.id ? 600 : 500,
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: OVERVIEW / TREND */}
              {activeTab === 'OVERVIEW' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <section className="admin-card">
                    <div className="admin-card-head">
                      <div>
                        <div className="admin-card-title">
                          Appointment Volume Trend
                        </div>
                        <div className="admin-card-subtitle">
                          Daily breakdown of Total, Completed, and Cancelled appointments
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 10, height: 10, background: '#3b82f6', borderRadius: 2 }} /> Total
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 10, height: 10, background: '#10b981', borderRadius: 2 }} /> Completed
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 10, height: 10, background: '#ef4444', borderRadius: 2 }} /> Cancelled
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: '20px' }}>
                      {trend.length === 0 ? (
                        <p style={{ color: '#64748b', textAlign: 'center', margin: '40px 0' }}>
                          No appointment data recorded in this period.
                        </p>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            height: 180,
                            gap: 12,
                            paddingBottom: 10,
                            borderBottom: '1px solid #eef2f7',
                            overflowX: 'auto',
                          }}
                        >
                          {trend.map((pt) => {
                            const totalPct = Math.round((pt.total / maxTrend) * 100);
                            return (
                              <div
                                key={pt.date}
                                style={{
                                  flex: '1 1 36px',
                                  minWidth: 32,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  height: '100%',
                                  justifyContent: 'flex-end',
                                }}
                              >
                                <span style={{ fontSize: 10, color: '#1e293b', fontWeight: 600, marginBottom: 4 }}>
                                  {pt.total}
                                </span>
                                <div
                                  style={{
                                    width: '100%',
                                    maxWidth: 24,
                                    height: `${Math.max(totalPct, 6)}%`,
                                    background: '#3b82f6',
                                    borderRadius: '4px 4px 0 0',
                                    position: 'relative',
                                  }}
                                  title={`${pt.date}: ${pt.total} Total, ${pt.completed} Completed, ${pt.cancelled} Cancelled`}
                                />
                                <span style={{ fontSize: 9, color: '#64748b', marginTop: 6, whiteSpace: 'nowrap' }}>
                                  {pt.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 2: DEPARTMENTS */}
              {activeTab === 'DEPARTMENTS' && (
                <section className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <div className="admin-card-title">Department Clinical Workload</div>
                      <div className="admin-card-subtitle">
                        Activity and completion metrics across specialized medical units
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '0 20px 20px' }}>
                    <div className="admin-table-wrap">
                      <table className="admin-data-table">
                        <thead>
                          <tr>
                            <th>Department</th>
                            <th>Code</th>
                            <th>Staff Doctors</th>
                            <th>Total Appointments</th>
                            <th>Completed</th>
                            <th>Workload Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {departments.map((dept) => {
                            const sharePct = summary.totalAppointments > 0
                              ? Math.round((dept.totalAppointments / summary.totalAppointments) * 100)
                              : 0;
                            return (
                              <tr key={dept.departmentId}>
                                <td style={{ fontWeight: 600 }}>{dept.departmentName}</td>
                                <td>
                                  <span style={{ fontSize: 11, padding: '2px 6px', background: '#f1f5f9', borderRadius: 4 }}>
                                    {dept.deptCode}
                                  </span>
                                </td>
                                <td>{dept.totalDoctors} doctors</td>
                                <td>{dept.totalAppointments}</td>
                                <td style={{ color: '#059669', fontWeight: 600 }}>
                                  {dept.completedAppointments}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div
                                      style={{
                                        flex: 1,
                                        maxWidth: 100,
                                        height: 8,
                                        background: '#e2e8f0',
                                        borderRadius: 4,
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: `${sharePct}%`,
                                          height: '100%',
                                          background: '#2563eb',
                                        }}
                                      />
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 600 }}>{sharePct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {/* TAB 3: DOCTOR PERFORMANCE */}
              {activeTab === 'DOCTORS' && (
                <section className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <div className="admin-card-title">Doctor Consultation Performance</div>
                      <div className="admin-card-subtitle">
                        Individual physician consultation volumes and completion rates
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '0 20px 20px' }}>
                    <div className="admin-table-wrap">
                      <table className="admin-data-table">
                        <thead>
                          <tr>
                            <th>Doctor</th>
                            <th>Department</th>
                            <th>Total Assigned</th>
                            <th>Completed</th>
                            <th>Cancelled</th>
                            <th>Completion Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doctors.map((doc) => (
                            <tr key={doc.doctorId}>
                              <td>
                                <strong style={{ color: '#1e293b' }}>{doc.fullName}</strong>
                                <small style={{ color: '#64748b', display: 'block' }}>{doc.doctorCode}</small>
                              </td>
                              <td>{doc.departmentName}</td>
                              <td style={{ fontWeight: 600 }}>{doc.totalAppointments}</td>
                              <td style={{ color: '#059669', fontWeight: 600 }}>{doc.completedAppointments}</td>
                              <td style={{ color: '#dc2626' }}>{doc.cancelledAppointments}</td>
                              <td>
                                <span
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    fontWeight: 600,
                                    fontSize: 12,
                                    background: doc.completionRatePercent >= 75 ? '#ecfdf5' : '#fffbeb',
                                    color: doc.completionRatePercent >= 75 ? '#047857' : '#b45309',
                                  }}
                                >
                                  {doc.completionRatePercent.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {/* TAB 4: PATIENT GROWTH */}
              {activeTab === 'PATIENTS' && (
                <section className="admin-card">
                  <div className="admin-card-head">
                    <div>
                      <div className="admin-card-title">New Patient Registrations</div>
                      <div className="admin-card-subtitle">
                        Growth rate of registered patients over selected time period
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '20px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        height: 160,
                        gap: 10,
                        paddingBottom: 8,
                        borderBottom: '1px solid #eef2f7',
                        overflowX: 'auto',
                      }}
                    >
                      {patientGrowth.map((p) => {
                        const pct = Math.round((p.newPatients / maxPatientGrowth) * 100);
                        return (
                          <div
                            key={p.date}
                            style={{
                              flex: '1 1 30px',
                              minWidth: 28,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              height: '100%',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <span style={{ fontSize: 10, color: '#1e293b', fontWeight: 600 }}>
                              {p.newPatients}
                            </span>
                            <div
                              style={{
                                width: '100%',
                                maxWidth: 20,
                                height: `${Math.max(pct, 6)}%`,
                                background: '#8b5cf6',
                                borderRadius: '4px 4px 0 0',
                              }}
                              title={`${p.date}: ${p.newPatients} new patients`}
                            />
                            <span style={{ fontSize: 9, color: '#64748b', marginTop: 4, whiteSpace: 'nowrap' }}>
                              {p.date.substring(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}
            </>
          );
        }}
      </AsyncSection>
    </>
  );
}
