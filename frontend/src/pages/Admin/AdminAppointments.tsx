import {
  Ban,
  Calendar,
  CalendarCheck,
  CalendarClock,
  Eye,
  FileEdit,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  cancelAdminAppointment,
  getAdminAppointments,
  getAdminAppointmentStats,
  type AppointmentConfirmation,
  type AppointmentStatus,
  type PageResponse,
  updateAdminAppointmentStatus,
} from '../../api/bookingApi';
import { toApiError } from '../../api/errors';
import AsyncSection from '../../components/admin/AsyncSection';
import Banner from '../../components/admin/Banner';
import DataTable, { type Column } from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import Pagination from '../../components/admin/Pagination';
import StatTiles from '../../components/admin/StatTiles';
import StatusBadge from '../../components/admin/StatusBadge';
import { useAsync } from '../../hooks/useAsync';

const PAGE_SIZE = 10;
const STATUS_OPTIONS: AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

interface AppointmentState {
  pageData: PageResponse<AppointmentConfirmation>;
  stats: Record<string, number>;
}

export default function AdminAppointments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const read = (key: string) => searchParams.get(key) ?? '';
  const page = Number(searchParams.get('page') ?? 0);
  const [search, status, from, to] = [
    read('search'),
    read('status'),
    read('from'),
    read('to'),
  ];

  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
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

  const load = useCallback(async (): Promise<AppointmentState> => {
    const [pageData, stats] = await Promise.all([
      getAdminAppointments({
        search: search || undefined,
        status: (status as AppointmentStatus) || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        size: PAGE_SIZE,
      }),
      getAdminAppointmentStats().catch(() => ({} as Record<string, number>)),
    ]);
    return { pageData, stats: stats as Record<string, number> };
  }, [search, status, from, to, page]);

  const { state, reload } = useAsync(load, [load]);

  // Modal states
  const [viewAppt, setViewAppt] = useState<AppointmentConfirmation | null>(null);
  const [statusAppt, setStatusAppt] = useState<AppointmentConfirmation | null>(null);
  const [cancelAppt, setCancelAppt] = useState<AppointmentConfirmation | null>(null);
  const [newStatus, setNewStatus] = useState<AppointmentStatus>('CONFIRMED');
  const [statusNotes, setStatusNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Status update submit
  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusAppt) return;
    setSaving(true);
    setActionError(null);
    try {
      await updateAdminAppointmentStatus(
        statusAppt.id,
        newStatus,
        statusNotes,
      );
      setStatusAppt(null);
      setActionSuccess(`Appointment #${statusAppt.id} updated to ${newStatus}.`);
      setTimeout(() => setActionSuccess(null), 3500);
      reload();
    } catch (err) {
      setActionError(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  // Cancellation submit
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelAppt) return;
    setSaving(true);
    setActionError(null);
    try {
      await cancelAdminAppointment(cancelAppt.id, cancelReason);
      setCancelAppt(null);
      setActionSuccess(`Appointment #${cancelAppt.id} has been cancelled.`);
      setTimeout(() => setActionSuccess(null), 3500);
      reload();
    } catch (err) {
      setActionError(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AppointmentConfirmation>[] = [
    {
      header: 'ID',
      cell: (a) => (
        <span style={{ fontWeight: 600, color: '#0f172a' }}>
          #{a.id}
        </span>
      ),
    },
    {
      header: 'Patient',
      cell: (a) => (
        <div>
          <strong style={{ color: '#1e293b' }}>
            {a.patientName || 'Patient'}
          </strong>
          <small style={{ color: '#64748b', display: 'block' }}>
            {a.phone || a.email || '—'}
          </small>
        </div>
      ),
    },
    {
      header: 'Doctor & Department',
      cell: (a) => (
        <div>
          <strong style={{ color: '#1e293b' }}>
            {a.doctor?.name || 'Doctor'}
          </strong>
          <small style={{ color: '#64748b', display: 'block' }}>
            {a.doctor?.departmentName || 'General Practice'}
          </small>
        </div>
      ),
    },
    {
      header: 'Schedule',
      cell: (a) => (
        <div>
          <div style={{ fontWeight: 600 }}>{a.date}</div>
          <small style={{ color: '#64748b' }}>
            {a.startTime} - {a.endTime}
          </small>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (a) => <StatusBadge value={a.status} />,
    },
    {
      header: 'Actions',
      cell: (a) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="admin-btn secondary"
            style={{ padding: '4px 8px', fontSize: 12 }}
            onClick={() => setViewAppt(a)}
            title="View Details"
          >
            <Eye size={13} style={{ marginRight: 4 }} /> View
          </button>
          {a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && (
            <>
              <button
                type="button"
                className="admin-btn secondary"
                style={{ padding: '4px 8px', fontSize: 12 }}
                onClick={() => {
                  setStatusAppt(a);
                  setNewStatus(a.status);
                  setStatusNotes(a.notes || '');
                }}
                title="Change Status"
              >
                <FileEdit size={13} />
              </button>
              <button
                type="button"
                className="admin-btn secondary"
                style={{ padding: '4px 8px', fontSize: 12, color: '#dc2626' }}
                onClick={() => {
                  setCancelAppt(a);
                  setCancelReason('');
                }}
                title="Cancel Appointment"
              >
                <Ban size={13} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>Appointment Management</h1>
          <p>Real-time booking records, schedules and operational statuses across all clinics</p>
        </div>
      </div>

      {actionError && (
        <div style={{ marginBottom: 16 }}>
          <Banner tone="error">{actionError}</Banner>
        </div>
      )}
      {actionSuccess && (
        <div style={{ marginBottom: 16 }}>
          <Banner tone="success">{actionSuccess}</Banner>
        </div>
      )}

      {/* Quick stats pills */}
      <AsyncSection state={state} onRetry={reload}>
        {({ pageData, stats }) => (
          <>
            <StatTiles
              tiles={[
                {
                  label: 'Total Bookings',
                  value: pageData.totalElements,
                  icon: CalendarCheck,
                  tone: 'blue',
                },
                {
                  label: 'Confirmed',
                  value: stats.CONFIRMED || 0,
                  icon: CalendarClock,
                  tone: 'green',
                },
                {
                  label: 'Completed',
                  value: stats.COMPLETED || 0,
                  icon: Calendar,
                  tone: 'blue',
                },
                {
                  label: 'Cancelled',
                  value: stats.CANCELLED || 0,
                  icon: Ban,
                  tone: 'red',
                },
              ]}
            />

            {/* Filters Toolbar */}
            <div
              className="admin-toolbar"
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                margin: '16px 0',
              }}
            >
              <div style={{ position: 'relative', flex: '1 1 240px' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  className="admin-search-input"
                  style={{ paddingLeft: 34, width: '100%' }}
                  placeholder="Search patient, doctor, reason..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              <select
                className="admin-select"
                value={status}
                onChange={(e) => setParam('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>From:</span>
                <input
                  type="date"
                  className="admin-input"
                  style={{ width: 'auto' }}
                  value={from}
                  onChange={(e) => setParam('from', e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>To:</span>
                <input
                  type="date"
                  className="admin-input"
                  style={{ width: 'auto' }}
                  value={to}
                  onChange={(e) => setParam('to', e.target.value)}
                />
              </div>
            </div>

            {/* Paged Table */}
            <div className="admin-card">
              <DataTable
                columns={columns}
                rows={pageData.content}
                rowKey={(a) => a.id}
                empty={
                  <p style={{ color: '#64748b' }}>
                    No appointments found matching your filter criteria.
                  </p>
                }
              />
              <div
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid #eef2f7',
                }}
              >
                <Pagination
                  page={pageData}
                  onPage={(next: number) => setParam('page', String(next))}
                />
              </div>
            </div>
          </>
        )}
      </AsyncSection>

      {/* Appointment Details Modal */}
      {viewAppt && (
        <Modal
          title={`Appointment Details — #${viewAppt.id}`}
          onClose={() => setViewAppt(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                background: '#f8fafc',
                padding: 14,
                borderRadius: 8,
              }}
            >
              <div>
                <small style={{ color: '#64748b' }}>Patient Name</small>
                <div style={{ fontWeight: 600 }}>{viewAppt.patientName || '—'}</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Patient Contact</small>
                <div style={{ fontWeight: 600 }}>
                  {viewAppt.phone || viewAppt.email || '—'}
                </div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Doctor</small>
                <div style={{ fontWeight: 600 }}>{viewAppt.doctor?.name || '—'}</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Department</small>
                <div style={{ fontWeight: 600 }}>{viewAppt.doctor?.departmentName || '—'}</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Date & Time</small>
                <div style={{ fontWeight: 600 }}>
                  {viewAppt.date} ({viewAppt.startTime} - {viewAppt.endTime})
                </div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Current Status</small>
                <div>
                  <StatusBadge value={viewAppt.status} />
                </div>
              </div>
            </div>

            <div>
              <label className="admin-label">Reason for Visit</label>
              <div
                style={{
                  padding: 10,
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                {viewAppt.reason || 'None specified'}
              </div>
            </div>

            {viewAppt.notes && (
              <div>
                <label className="admin-label">Internal / Clinical Notes</label>
                <div
                  style={{
                    padding: 10,
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                >
                  {viewAppt.notes}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                className="admin-btn secondary"
                onClick={() => setViewAppt(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Change Status Modal */}
      {statusAppt && (
        <Modal
          title={`Update Status — #${statusAppt.id}`}
          onClose={() => setStatusAppt(null)}
        >
          <form onSubmit={handleUpdateStatusSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="admin-label">New Status</label>
              <select
                className="admin-select"
                style={{ width: '100%' }}
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as AppointmentStatus)}
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="admin-label">Clinical / Administrative Notes</label>
              <textarea
                className="admin-input"
                style={{ width: '100%', minHeight: 80 }}
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Optional notes regarding this status change..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className="admin-btn secondary"
                onClick={() => setStatusAppt(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="admin-btn primary" disabled={saving}>
                {saving ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancellation Modal */}
      {cancelAppt && (
        <Modal
          title={`Cancel Appointment — #${cancelAppt.id}`}
          onClose={() => setCancelAppt(null)}
        >
          <form onSubmit={handleCancelSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Banner tone="error">
              Are you sure you want to cancel this appointment?
            </Banner>

            <div>
              <label className="admin-label">Cancellation Reason *</label>
              <input
                type="text"
                className="admin-input"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
                placeholder="e.g. Patient request, doctor unavailable..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className="admin-btn secondary"
                onClick={() => setCancelAppt(null)}
                disabled={saving}
              >
                Go Back
              </button>
              <button
                type="submit"
                className="admin-btn danger"
                disabled={saving}
                style={{ background: '#dc2626', color: '#fff' }}
              >
                {saving ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
