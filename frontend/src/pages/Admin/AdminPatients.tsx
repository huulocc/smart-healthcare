import {
  Eye,
  Pencil,
  Search,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  getPatientAppointments,
  listPatients,
  updatePatient,
  updatePatientStatus,
} from '../../api/adminApi';
import type { AdminPatient } from '../../api/adminTypes';
import { toApiError } from '../../api/errors';
import AsyncSection from '../../components/admin/AsyncSection';
import Banner from '../../components/admin/Banner';
import DataTable, { type Column } from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import Pagination from '../../components/admin/Pagination';
import StatusBadge from '../../components/admin/StatusBadge';
import { useAsync } from '../../hooks/useAsync';

const PAGE_SIZE = 10;
const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export default function AdminPatients() {
  const [searchParams, setSearchParams] = useSearchParams();
  const read = (key: string) => searchParams.get(key) ?? '';
  const page = Number(searchParams.get('page') ?? 0);
  const [search, gender, bloodType, status] = [
    read('search'),
    read('gender'),
    read('bloodType'),
    read('status'),
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

  const load = useCallback(
    () =>
      listPatients({
        search: search || undefined,
        gender: gender || undefined,
        bloodType: bloodType || undefined,
        status: status || undefined,
        page,
        size: PAGE_SIZE,
      }),
    [search, gender, bloodType, status, page],
  );

  const { state, reload } = useAsync(load, [load]);

  // Modal states
  const [viewPatient, setViewPatient] = useState<AdminPatient | null>(null);
  const [editingPatient, setEditingPatient] = useState<AdminPatient | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // When opening details modal, fetch appointment history
  const handleOpenDetails = async (patient: AdminPatient) => {
    setViewPatient(patient);
    setLoadingAppts(true);
    try {
      const res = await getPatientAppointments(patient.id, 0, 10);
      setPatientAppointments(res.content || []);
    } catch {
      setPatientAppointments([]);
    } finally {
      setLoadingAppts(false);
    }
  };

  // Status toggle handler
  const handleToggleStatus = async (patient: AdminPatient) => {
    const nextStatus = patient.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setActionError(null);
    try {
      await updatePatientStatus(patient.id, nextStatus);
      setActionSuccess(`Patient ${patient.fullName} status updated to ${nextStatus}.`);
      setTimeout(() => setActionSuccess(null), 3500);
      reload();
    } catch (err) {
      setActionError(toApiError(err).message);
    }
  };

  const columns: Column<AdminPatient>[] = [
    {
      header: 'Patient Code',
      cell: (p) => (
        <span style={{ fontWeight: 600, color: '#0f172a' }}>
          {p.patientCode || `PT-${p.id}`}
        </span>
      ),
    },
    {
      header: 'Full Name',
      cell: (p) => (
        <div>
          <strong style={{ display: 'block', color: '#1e293b' }}>
            {p.fullName}
          </strong>
          <small style={{ color: '#64748b' }}>{p.email}</small>
        </div>
      ),
    },
    {
      header: 'Phone',
      cell: (p) => p.phone || '—',
    },
    {
      header: 'Gender & DOB',
      cell: (p) => (
        <span style={{ fontSize: 13 }}>
          {p.gender || '—'} {p.dateOfBirth ? `(${p.dateOfBirth})` : ''}
        </span>
      ),
    },
    {
      header: 'Blood Type',
      cell: (p) =>
        p.bloodType ? (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              background: '#fef2f2',
              color: '#b91c1c',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {p.bloodType}
          </span>
        ) : (
          '—'
        ),
    },
    {
      header: 'Bookings',
      cell: (p) => (
        <span style={{ fontWeight: 600, color: '#2563eb' }}>
          {p.appointmentCount} appts
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (p) => <StatusBadge value={p.status} />,
    },
    {
      header: 'Actions',
      cell: (p) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="admin-btn secondary"
            style={{ padding: '4px 8px', fontSize: 12 }}
            onClick={() => handleOpenDetails(p)}
            title="View Details"
          >
            <Eye size={13} style={{ marginRight: 4 }} /> Details
          </button>
          <button
            type="button"
            className="admin-btn secondary"
            style={{ padding: '4px 8px', fontSize: 12 }}
            onClick={() => setEditingPatient(p)}
            title="Edit Information"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            className="admin-btn secondary"
            style={{
              padding: '4px 8px',
              fontSize: 12,
              color: p.status === 'ACTIVE' ? '#b91c1c' : '#047857',
            }}
            onClick={() => handleToggleStatus(p)}
            title={p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          >
            {p.status === 'ACTIVE' ? (
              <UserMinus size={13} />
            ) : (
              <UserCheck size={13} />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>Patient Management</h1>
          <p>View, manage and update patient profiles and appointment history</p>
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

      {/* Filters Toolbar */}
      <div className="admin-toolbar" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
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
            placeholder="Search patient by name, email or phone..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <select
          className="admin-select"
          value={gender}
          onChange={(e) => setParam('gender', e.target.value)}
        >
          <option value="">All Genders</option>
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          className="admin-select"
          value={bloodType}
          onChange={(e) => setParam('bloodType', e.target.value)}
        >
          <option value="">All Blood Types</option>
          {BLOOD_TYPES.map((bt) => (
            <option key={bt} value={bt}>
              {bt}
            </option>
          ))}
        </select>

        <select
          className="admin-select"
          value={status}
          onChange={(e) => setParam('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Paged Table */}
      <AsyncSection state={state} onRetry={reload}>
        {(pageData) => (
          <div className="admin-card">
            <DataTable
              columns={columns}
              rows={pageData.content}
              rowKey={(p) => p.id}
              empty={<p style={{ color: '#64748b' }}>No patients found matching your search.</p>}
            />
            <div style={{ padding: '12px 16px', borderTop: '1px solid #eef2f7' }}>
              <Pagination
                page={pageData}
                onPage={(next: number) => setParam('page', String(next))}
              />
            </div>
          </div>
        )}
      </AsyncSection>

      {/* Patient Details Modal */}
      {viewPatient && (
        <Modal
          title={`Patient Details — ${viewPatient.fullName}`}
          onClose={() => setViewPatient(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                background: '#f8fafc',
                padding: 16,
                borderRadius: 8,
              }}
            >
              <div>
                <small style={{ color: '#64748b' }}>Patient Code</small>
                <div style={{ fontWeight: 600 }}>{viewPatient.patientCode || `PT-${viewPatient.id}`}</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Phone Number</small>
                <div style={{ fontWeight: 600 }}>{viewPatient.phone || '—'}</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Email Address</small>
                <div style={{ fontWeight: 600 }}>{viewPatient.email}</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Date of Birth / Gender</small>
                <div style={{ fontWeight: 600 }}>
                  {viewPatient.dateOfBirth || '—'} / {viewPatient.gender || '—'}
                </div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Blood Type</small>
                <div style={{ fontWeight: 600 }}>{viewPatient.bloodType || '—'}</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Insurance Number</small>
                <div style={{ fontWeight: 600 }}>{viewPatient.insuranceNumber || '—'}</div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Emergency Contact</small>
                <div style={{ fontWeight: 600 }}>
                  {viewPatient.emergencyContactName
                    ? `${viewPatient.emergencyContactName} (${viewPatient.emergencyContactPhone || 'No phone'})`
                    : '—'}
                </div>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Residential Address</small>
                <div style={{ fontWeight: 600 }}>{viewPatient.address || '—'}</div>
              </div>
            </div>

            {/* Appointment History */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '8px 0 8px' }}>
                Appointment History ({viewPatient.appointmentCount} recorded)
              </h3>
              {loadingAppts ? (
                <p style={{ color: '#64748b', fontSize: 13 }}>Loading appointment history...</p>
              ) : patientAppointments.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: 13 }}>No past appointments recorded for this patient.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Doctor</th>
                        <th>Department</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientAppointments.map((appt: any) => (
                        <tr key={appt.id}>
                          <td>#{appt.id}</td>
                          <td>{appt.doctor?.user?.fullName || 'Doctor'}</td>
                          <td>{appt.doctor?.department?.name || 'General'}</td>
                          <td>
                            {appt.appointmentDate} {appt.startTime}
                          </td>
                          <td>
                            <StatusBadge value={appt.status} />
                          </td>
                          <td>{appt.reason || 'Routine checkup'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                type="button"
                className="admin-btn secondary"
                onClick={() => setViewPatient(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Patient Modal */}
      {editingPatient && (
        <EditPatientModal
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onSaved={() => {
            setEditingPatient(null);
            setActionSuccess('Patient updated successfully.');
            setTimeout(() => setActionSuccess(null), 3500);
            reload();
          }}
        />
      )}
    </>
  );
}

// Inline Edit Form Component
function EditPatientModal({
  patient,
  onClose,
  onSaved,
}: {
  patient: AdminPatient;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(patient.fullName);
  const [phone, setPhone] = useState(patient.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(patient.dateOfBirth || '');
  const [gender, setGender] = useState(patient.gender || 'MALE');
  const [address, setAddress] = useState(patient.address || '');
  const [bloodType, setBloodType] = useState(patient.bloodType || 'O+');
  const [emergencyContactName, setEmergencyContactName] = useState(
    patient.emergencyContactName || '',
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    patient.emergencyContactPhone || '',
  );
  const [insuranceNumber, setInsuranceNumber] = useState(
    patient.insuranceNumber || '',
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updatePatient(patient.id, {
        fullName,
        phone,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
        address: address || undefined,
        bloodType: bloodType || undefined,
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
        insuranceNumber: insuranceNumber || undefined,
      });
      onSaved();
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Edit Patient — ${patient.fullName}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <Banner tone="error">{error}</Banner>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="admin-label">Full Name *</label>
            <input
              type="text"
              className="admin-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="admin-label">Phone Number *</label>
            <input
              type="text"
              className="admin-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="admin-label">Date of Birth</label>
            <input
              type="date"
              className="admin-input"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>
          <div>
            <label className="admin-label">Gender</label>
            <select
              className="admin-select"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="admin-label">Blood Type</label>
            <select
              className="admin-select"
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
            >
              <option value="">Select blood type</option>
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-label">Insurance Number</label>
            <input
              type="text"
              className="admin-input"
              value={insuranceNumber}
              onChange={(e) => setInsuranceNumber(e.target.value)}
              placeholder="e.g. BHYT123456789"
            />
          </div>
        </div>

        <div>
          <label className="admin-label">Address</label>
          <input
            type="text"
            className="admin-input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address, city"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="admin-label">Emergency Contact Name</label>
            <input
              type="text"
              className="admin-input"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
            />
          </div>
          <div>
            <label className="admin-label">Emergency Contact Phone</label>
            <input
              type="text"
              className="admin-input"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button type="button" className="admin-btn secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="admin-btn primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
