import { Plus } from 'lucide-react';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getScheduleBoard, listDepartments } from '../../api/adminApi';
import type { DayOfWeek, Doctor, ScheduleSlot } from '../../api/adminTypes';
import { DAYS_OF_WEEK } from '../../api/adminTypes';
import AsyncSection from '../../components/admin/AsyncSection';
import Pagination from '../../components/admin/Pagination';
import { labelOf } from '../../components/admin/StatusBadge';
import { useAsync } from '../../hooks/useAsync';

import ScheduleSlotModal from './ScheduleSlotModal';
import styles from './AdminSchedules.module.css';

const AVAILABILITIES = [
  'AVAILABLE',
  'IN_CONSULTATION',
  'ON_LEAVE',
  'OFF_DUTY',
] as const;
const PAGE_SIZE = 10;

const SHORT_DAY: Record<DayOfWeek, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

const hhmm = (time: string) => time.slice(0, 5);

/** What a chip says: a working shift shows its hours, leave just says so. */
const chipText = (slot: ScheduleSlot) => {
  if (slot.shiftType === 'LEAVE') return 'On leave';
  const range = `${hhmm(slot.startTime)}-${hhmm(slot.endTime)}`;
  return slot.shiftType === 'BREAK' ? `Break ${range}` : range;
};

/**
 * The weekly board. These are recurring weekday shifts, not a calendar week, so the columns
 * are weekday names and carry no dates -- the mock's "Mon 17" implied otherwise. There is no
 * "booked" chip either: the backend's ShiftType has no such value, because a booked hour
 * would come from an appointment and appointments do not exist yet.
 */
const AdminSchedules = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const read = (key: string) => searchParams.get(key) ?? '';
  const page = Number(searchParams.get('page') ?? 0);
  const [search, departmentId, availability] = [
    read('search'),
    read('departmentId'),
    read('availability'),
  ];

  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value === '') next.delete(key);
          else next.set(key, value);
          if (key !== 'page') next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const [searchText, setSearchText] = useState(search);
  useEffect(() => {
    if (searchText === search) return;
    const timer = setTimeout(() => setParam('search', searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText, search, setParam]);

  /** What the slot dialog is open on: the doctor, the day, and the slot being edited. */
  const [editing, setEditing] = useState<{
    doctor: Doctor;
    day: DayOfWeek;
    slot: ScheduleSlot | null;
  } | null>(null);

  const departments = useAsync(
    useCallback(() => listDepartments(), []),
    [],
  );
  const board = useAsync(
    useCallback(
      () =>
        getScheduleBoard({
          search,
          departmentId: departmentId === '' ? '' : Number(departmentId),
          availability,
          page,
          size: PAGE_SIZE,
        }),
      [search, departmentId, availability, page],
    ),
    [search, departmentId, availability, page],
  );

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>Doctor Schedules</h1>
          <p>
            The repeating week for every active doctor. Deactivated doctors are
            not listed here.
          </p>
        </div>
      </div>

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
            {(departments.state.status === 'ready'
              ? departments.state.data
              : []
            ).map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
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
        </div>

        <AsyncSection state={board.state} onRetry={board.reload}>
          {(data) =>
            data.content.length === 0 ? (
              <p className={styles.empty}>
                No active doctors match these filters.
              </p>
            ) : (
              <>
                <div className="admin-schedule-board">
                  <div className="admin-schedule-grid">
                    <div className="head">Doctor</div>
                    {DAYS_OF_WEEK.map((day) => (
                      <div className="head" key={day}>
                        {SHORT_DAY[day]}
                      </div>
                    ))}

                    {data.content.map((week) => (
                      <Fragment key={week.doctor.id}>
                        <div className={styles.doctorCell}>
                          <strong>{week.doctor.fullName}</strong>
                          <small>
                            {week.doctor.department?.name ?? 'Unassigned'}
                          </small>
                        </div>
                        {DAYS_OF_WEEK.map((day) => (
                          <div className={styles.dayCell} key={day}>
                            {week.slots
                              .filter((slot) => slot.dayOfWeek === day)
                              .map((slot) => (
                                <button
                                  type="button"
                                  key={slot.id}
                                  className={`${styles.chip} ${styles[slot.shiftType.toLowerCase()]}`}
                                  onClick={() =>
                                    setEditing({
                                      doctor: week.doctor,
                                      day,
                                      slot,
                                    })
                                  }
                                >
                                  {chipText(slot)}
                                </button>
                              ))}
                            <button
                              type="button"
                              className={styles.add}
                              aria-label={`Add a shift for ${week.doctor.fullName} on ${SHORT_DAY[day]}`}
                              onClick={() =>
                                setEditing({
                                  doctor: week.doctor,
                                  day,
                                  slot: null,
                                })
                              }
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        ))}
                      </Fragment>
                    ))}
                  </div>
                </div>
                <Pagination
                  page={data}
                  onPage={(next) => setParam('page', String(next))}
                />
              </>
            )
          }
        </AsyncSection>
      </section>

      {editing !== null && (
        <ScheduleSlotModal
          doctor={editing.doctor}
          day={editing.day}
          slot={editing.slot}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            // The week's rules are the server's, so reload rather than patch it here.
            board.reload();
          }}
        />
      )}
    </>
  );
};

export default AdminSchedules;
