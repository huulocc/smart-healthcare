import { format } from 'date-fns';
import { CalendarX, CircleCheck, Stethoscope, UserCheck, UserPlus } from 'lucide-react';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';

import { getDoctorStats, listDepartments, listDoctorRequests, listDoctors } from '../../api/adminApi';
import type { Department, Doctor, DoctorRequest, DoctorStats } from '../../api/adminTypes';
import AsyncSection from '../../components/admin/AsyncSection';
import StatTiles from '../../components/admin/StatTiles';
import StatusBadge from '../../components/admin/StatusBadge';
import { useAuth } from '../../context/useAuth';
import { useAsync } from '../../hooks/useAsync';

import styles from './AdminDashboard.module.css';

interface Overview {
  stats: DoctorStats;
  departments: Department[];
  requests: { items: DoctorRequest[]; total: number };
  onLeave: Doctor[];
}

/**
 * Only what the backend can actually answer today: doctors, departments and the approval
 * queue. The revenue chart, the appointment donut and the activity feed this screen used to
 * show were invented numbers -- booking does not exist yet -- so they are gone rather than
 * dressed up as real.
 */
const AdminDashboard = () => {
  const { user } = useAuth();

  const load = useCallback(async (): Promise<Overview> => {
    // One Promise.all rather than four effects: one spinner, one Try Again.
    const [stats, departments, requests, onLeave] = await Promise.all([
      getDoctorStats(),
      listDepartments(),
      listDoctorRequests(0, 5),
      listDoctors({ availability: 'ON_LEAVE', size: 5 }),
    ]);
    return {
      stats,
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
        {({ stats, departments, requests, onLeave }) => (
          <>
            <StatTiles
              tiles={[
                { label: 'Total Doctors', value: stats.total, icon: Stethoscope, tone: 'blue' },
                { label: 'Active', value: stats.active, icon: CircleCheck, tone: 'green' },
                { label: 'Available Now', value: stats.available, icon: UserCheck, tone: 'blue' },
                { label: 'On Leave', value: stats.onLeave, icon: CalendarX, tone: 'orange' },
                {
                  label: 'Pending Requests',
                  value: stats.pendingRequests,
                  icon: UserPlus,
                  tone: 'red',
                },
              ]}
            />

            <div className="admin-dashboard-grid">
              <section className="admin-card">
                <div className="admin-card-head">
                  <div>
                    <div className="admin-card-title">Doctors by department</div>
                    <div className="admin-card-subtitle">
                      {departments.length}{' '}
                      {departments.length === 1 ? 'department' : 'departments'},{' '}
                      {departments.filter((one) => one.status === 'ACTIVE').length} active
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
                            {department.activeDoctors === 1 ? 'doctor' : 'doctors'}
                          </span>
                        </div>
                        <div className="admin-progressbar">
                          <span style={{ width: `${barWidth(department, departments)}%` }} />
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
                    <div className="admin-card-title">Waiting for approval</div>
                    <div className="admin-card-subtitle">Longest waiting first</div>
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
                          <span className="admin-badge warning">Not activated</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <section className="admin-card admin-section-card">
              <div className="admin-card-head">
                <div>
                  <div className="admin-card-title">Doctors on leave</div>
                  <div className="admin-card-subtitle">
                    {stats.onLeave} in total{stats.onLeave > onLeave.length && ', showing 5'}
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
                        <small>{doctor.department?.name ?? 'No department'}</small>
                      </div>
                      <StatusBadge value={doctor.availability} />
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
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
