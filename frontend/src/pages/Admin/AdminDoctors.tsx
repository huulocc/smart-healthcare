import {
  CalendarX,
  CircleCheck,
  Pencil,
  Stethoscope,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  getDoctorStats,
  listDepartments,
  listDoctors,
  listSpecialties,
  updateDoctorAvailability,
  updateDoctorStatus,
} from '../../api/adminApi';
import type { Department, Doctor } from '../../api/adminTypes';
import { toApiError } from '../../api/errors';
import AsyncSection from '../../components/admin/AsyncSection';
import Banner from '../../components/admin/Banner';
import DataTable, { type Column } from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import Pagination from '../../components/admin/Pagination';
import StatTiles from '../../components/admin/StatTiles';
import StatusBadge, { labelOf } from '../../components/admin/StatusBadge';
import { useAsync } from '../../hooks/useAsync';

import DoctorEditModal from './DoctorEditModal';
import styles from './AdminDoctors.module.css';

const AVAILABILITIES = [
  'AVAILABLE',
  'IN_CONSULTATION',
  'ON_LEAVE',
  'OFF_DUTY',
] as const;
const PAGE_SIZE = 10;

const AdminDoctors = () => {
  // Filters live in the URL, so a refresh or a shared link keeps them.
  const [searchParams, setSearchParams] = useSearchParams();
  const read = (key: string) => searchParams.get(key) ?? '';
  const page = Number(searchParams.get('page') ?? 0);
  const [search, departmentId, specialty, availability, status] = [
    read('search'),
    read('departmentId'),
    read('specialty'),
    read('availability'),
    read('status'),
  ];

  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value === '') next.delete(key);
          else next.set(key, value);
          // Narrowing the list can leave the current page past the end of it.
          if (key !== 'page') next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Typing should not fire a request per keystroke, but the URL is the source of truth, so
  // the box keeps its own value until the typing stops.
  const [searchText, setSearchText] = useState(search);
  useEffect(() => {
    if (searchText === search) return;
    const timer = setTimeout(() => setParam('search', searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText, search, setParam]);

  const [banner, setBanner] = useState<{
    tone: 'error' | 'success';
    text: string;
  } | null>(null);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [deactivating, setDeactivating] = useState<Doctor | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const options = useAsync(
    useCallback(() => Promise.all([listDepartments(), listSpecialties()]), []),
    [],
  );
  const stats = useAsync(
    useCallback(() => getDoctorStats(), []),
    [],
  );
  const list = useAsync(
    useCallback(
      () =>
        listDoctors({
          search,
          departmentId: departmentId === '' ? '' : Number(departmentId),
          specialty,
          availability,
          status,
          page,
          size: PAGE_SIZE,
        }),
      [search, departmentId, specialty, availability, status, page],
    ),
    [search, departmentId, specialty, availability, status, page],
  );

  /** Every write moves a stat tile, so the counters are refetched with the list. */
  const refresh = () => {
    list.reload();
    stats.reload();
  };

  const changeAvailability = async (doctor: Doctor, next: string) => {
    setBanner(null);
    setBusyId(doctor.id);
    try {
      await updateDoctorAvailability(doctor.id, next);
      refresh();
    } catch (caught) {
      // The server refuses this for an inactive doctor; say so rather than silently reverting.
      setBanner({ tone: 'error', text: toApiError(caught).message });
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = async (doctor: Doctor, next: 'ACTIVE' | 'INACTIVE') => {
    setBanner(null);
    setBusyId(doctor.id);
    try {
      await updateDoctorStatus(doctor.id, next);
      setBanner(
        next === 'ACTIVE'
          ? {
              tone: 'success',
              // Reactivating deliberately leaves them off duty, so ask for the next step.
              text: `${doctor.fullName} is active again, but still off duty. Set their availability.`,
            }
          : {
              tone: 'success',
              text: `${doctor.fullName} has been deactivated.`,
            },
      );
      refresh();
    } catch (caught) {
      setBanner({ tone: 'error', text: toApiError(caught).message });
    } finally {
      setBusyId(null);
      setDeactivating(null);
    }
  };

  const columns: Column<Doctor>[] = [
    {
      header: 'Doctor',
      cell: (doctor) => (
        <div className="admin-person">
          {doctor.avatarUrl === null ? (
            <span className={`admin-avatar small ${styles.initials}`}>
              {doctor.fullName.charAt(0).toUpperCase()}
            </span>
          ) : (
            <img className="admin-avatar small" src={doctor.avatarUrl} alt="" />
          )}
          <div>
            <strong>{doctor.fullName}</strong>
            <small>{doctor.email}</small>
          </div>
        </div>
      ),
    },
    { header: 'Code', cell: (doctor) => doctor.doctorCode },
    {
      header: 'Department',
      cell: (doctor) => doctor.department?.name ?? 'Unassigned',
    },
    { header: 'Specialty', cell: (doctor) => doctor.specialty ?? '--' },
    {
      header: 'Experience',
      cell: (doctor) =>
        doctor.experienceYears === null
          ? '--'
          : `${doctor.experienceYears} years`,
    },
    {
      header: 'Availability',
      cell: (doctor) => (
        <select
          className="admin-mini-select"
          value={doctor.availability}
          disabled={busyId === doctor.id}
          aria-label={`Availability for ${doctor.fullName}`}
          onChange={(event) => changeAvailability(doctor, event.target.value)}
        >
          {AVAILABILITIES.map((value) => (
            <option key={value} value={value}>
              {labelOf(value)}
            </option>
          ))}
        </select>
      ),
    },
    {
      header: 'Status',
      cell: (doctor) => <StatusBadge value={doctor.status} />,
    },
    {
      header: 'Actions',
      cell: (doctor) => (
        <div className={styles.actions}>
          <button
            type="button"
            className="admin-secondary-btn"
            onClick={() => setEditing(doctor)}
          >
            <Pencil />
            Edit
          </button>
          {doctor.status === 'ACTIVE' ? (
            <button
              type="button"
              className="admin-secondary-btn"
              disabled={busyId === doctor.id}
              onClick={() => setDeactivating(doctor)}
            >
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              className="admin-secondary-btn"
              disabled={busyId === doctor.id}
              onClick={() => changeStatus(doctor, 'ACTIVE')}
            >
              Activate
            </button>
          )}
        </div>
      ),
    },
  ];

  const hasFilters = [
    search,
    departmentId,
    specialty,
    availability,
    status,
  ].some((v) => v !== '');
  const clearFilters = () => {
    setSearchText('');
    setSearchParams({}, { replace: true });
  };

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>Doctors</h1>
          <p>Profiles, availability and account status.</p>
        </div>
      </div>

      {stats.state.status === 'ready' && (
        <StatTiles
          tiles={[
            {
              label: 'Total Doctors',
              value: stats.state.data.total,
              icon: Stethoscope,
              tone: 'blue',
            },
            {
              label: 'Active',
              value: stats.state.data.active,
              icon: CircleCheck,
              tone: 'green',
            },
            {
              label: 'Available Now',
              value: stats.state.data.available,
              icon: UserCheck,
              tone: 'blue',
            },
            {
              label: 'On Leave',
              value: stats.state.data.onLeave,
              icon: CalendarX,
              tone: 'orange',
            },
            {
              label: 'Pending Requests',
              value: stats.state.data.pendingRequests,
              icon: UserPlus,
              tone: 'red',
            },
          ]}
        />
      )}

      <section className="admin-card admin-section-card">
        <div className="admin-filters">
          <input
            type="search"
            className="admin-filter-search"
            placeholder="Search by name or email..."
            aria-label="Search doctors"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <select
            className="admin-filter-select"
            aria-label="Department"
            value={departmentId}
            onChange={(event) => setParam('departmentId', event.target.value)}
          >
            <option value="">All departments</option>
            {(options.state.status === 'ready'
              ? options.state.data[0]
              : []
            ).map((department: Department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <select
            className="admin-filter-select"
            aria-label="Specialty"
            value={specialty}
            onChange={(event) => setParam('specialty', event.target.value)}
          >
            <option value="">All specialties</option>
            {(options.state.status === 'ready'
              ? options.state.data[1]
              : []
            ).map((name: string) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="admin-filter-select"
            aria-label="Availability"
            value={availability}
            onChange={(event) => setParam('availability', event.target.value)}
          >
            <option value="">Any availability</option>
            {AVAILABILITIES.map((value) => (
              <option key={value} value={value}>
                {labelOf(value)}
              </option>
            ))}
          </select>
          <select
            className="admin-filter-select"
            aria-label="Account status"
            value={status}
            onChange={(event) => setParam('status', event.target.value)}
          >
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          {hasFilters && (
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        {banner && (
          <div className={styles.banner}>
            <Banner tone={banner.tone}>{banner.text}</Banner>
          </div>
        )}

        <AsyncSection state={list.state} onRetry={list.reload}>
          {(data) => (
            <>
              <DataTable
                columns={columns}
                rows={data.content}
                rowKey={(doctor) => doctor.id}
                empty={
                  hasFilters
                    ? 'No doctors match these filters.'
                    : 'No doctors yet.'
                }
              />
              <Pagination
                page={data}
                onPage={(next) => setParam('page', String(next))}
              />
            </>
          )}
        </AsyncSection>
      </section>

      {editing !== null && options.state.status === 'ready' && (
        <DoctorEditModal
          doctor={editing}
          departments={options.state.data[0]}
          onClose={() => setEditing(null)}
          onSaved={(doctor) => {
            setEditing(null);
            setBanner({
              tone: 'success',
              text: `${doctor.fullName} has been updated.`,
            });
            refresh();
          }}
        />
      )}

      {deactivating !== null && (
        <Modal
          title={`Deactivate ${deactivating.fullName}?`}
          onClose={() => setDeactivating(null)}
          footer={
            <>
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={() => setDeactivating(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-primary-btn"
                disabled={busyId === deactivating.id}
                onClick={() => changeStatus(deactivating, 'INACTIVE')}
              >
                Deactivate
              </button>
            </>
          }
        >
          <p className={styles.confirm}>
            They will be set off duty, stop heading any department, and lose the
            doctor role on their account. Their profile and schedule are kept,
            and activating them again undoes all of it.
          </p>
        </Modal>
      )}
    </>
  );
};

export default AdminDoctors;
