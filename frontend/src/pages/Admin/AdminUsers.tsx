import {
  CheckCircle,
  Pencil,
  Plus,
  Search,
  Shield,
  UserCheck,
  UserMinus,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  createUser,
  listUsers,
  updateUser,
  updateUserRole,
  updateUserStatus,
} from '../../api/adminApi';
import type { AdminUser } from '../../api/adminTypes';
import { toApiError } from '../../api/errors';
import AsyncSection from '../../components/admin/AsyncSection';
import Banner from '../../components/admin/Banner';
import DataTable, { type Column } from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import Pagination from '../../components/admin/Pagination';
import StatusBadge from '../../components/admin/StatusBadge';
import { useAuth } from '../../context/useAuth';
import { useAsync } from '../../hooks/useAsync';

const PAGE_SIZE = 10;
const ROLES = ['ADMIN', 'DOCTOR', 'PATIENT'] as const;

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const read = (key: string) => searchParams.get(key) ?? '';
  const page = Number(searchParams.get('page') ?? 0);
  const [search, role, status, emailVerified] = [
    read('search'),
    read('role'),
    read('status'),
    read('emailVerified'),
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
      listUsers({
        search: search || undefined,
        role: role || undefined,
        status: status || undefined,
        emailVerified:
          emailVerified === ''
            ? undefined
            : emailVerified === 'true',
        page,
        size: PAGE_SIZE,
      }),
    [search, role, status, emailVerified, page],
  );

  const { state, reload } = useAsync(load, [load]);

  // Modal & action states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<'ADMIN' | 'DOCTOR' | 'PATIENT'>('PATIENT');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Status toggle handler
  const handleToggleStatus = async (user: AdminUser) => {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setActionError(null);
    try {
      await updateUserStatus(user.id, nextStatus);
      setActionSuccess(`User ${user.fullName} (${user.email}) is now ${nextStatus}.`);
      setTimeout(() => setActionSuccess(null), 3500);
      reload();
    } catch (err) {
      setActionError(toApiError(err).message);
    }
  };

  // Role change handler
  const handleSaveRole = async () => {
    if (!roleChangeUser) return;
    setActionError(null);
    try {
      await updateUserRole(roleChangeUser.id, newRole);
      setActionSuccess(
        `Updated role of ${roleChangeUser.fullName} to ${newRole}.`,
      );
      setRoleChangeUser(null);
      setTimeout(() => setActionSuccess(null), 3500);
      reload();
    } catch (err) {
      setActionError(toApiError(err).message);
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      header: 'User',
      cell: (u) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ color: '#1e293b' }}>{u.fullName}</strong>
            {currentUser?.email === u.email && (
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                You
              </span>
            )}
          </div>
          <small style={{ color: '#64748b' }}>{u.email}</small>
        </div>
      ),
    },
    {
      header: 'Phone',
      cell: (u) => u.phone || '—',
    },
    {
      header: 'Role',
      cell: (u) => (
        <span
          style={{
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            background:
              u.role === 'ADMIN'
                ? '#fdf2f8'
                : u.role === 'DOCTOR'
                  ? '#eff6ff'
                  : '#f1f5f9',
            color:
              u.role === 'ADMIN'
                ? '#be185d'
                : u.role === 'DOCTOR'
                  ? '#1d4ed8'
                  : '#475569',
          }}
        >
          {u.role}
        </span>
      ),
    },
    {
      header: 'Email Verified',
      cell: (u) =>
        u.emailVerified ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#059669', fontSize: 12 }}>
            <CheckCircle size={14} /> Verified
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#d97706', fontSize: 12 }}>
            <XCircle size={14} /> Unverified
          </span>
        ),
    },
    {
      header: 'Status',
      cell: (u) => <StatusBadge value={u.status} />,
    },
    {
      header: 'Registered',
      cell: (u) => (
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {u.createdAt ? u.createdAt.substring(0, 10) : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (u) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="admin-btn secondary"
            style={{ padding: '4px 8px', fontSize: 12 }}
            onClick={() => {
              setRoleChangeUser(u);
              setNewRole(u.role);
            }}
            title="Change Role"
          >
            <Shield size={13} style={{ marginRight: 4 }} /> Role
          </button>
          <button
            type="button"
            className="admin-btn secondary"
            style={{ padding: '4px 8px', fontSize: 12 }}
            onClick={() => setEditingUser(u)}
            title="Edit User Info"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            className="admin-btn secondary"
            style={{
              padding: '4px 8px',
              fontSize: 12,
              color: u.status === 'ACTIVE' ? '#b91c1c' : '#047857',
            }}
            onClick={() => handleToggleStatus(u)}
            title={u.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
          >
            {u.status === 'ACTIVE' ? (
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
          <h1>User Accounts & Roles</h1>
          <p>Manage system users, access control, and account security</p>
        </div>
        <button
          type="button"
          className="admin-btn primary"
          onClick={() => setShowCreateModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} /> Create User Account
        </button>
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
      <div
        className="admin-toolbar"
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
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
            placeholder="Search by name, email or phone..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <select
          className="admin-select"
          value={role}
          onChange={(e) => setParam('role', e.target.value)}
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
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

        <select
          className="admin-select"
          value={emailVerified}
          onChange={(e) => setParam('emailVerified', e.target.value)}
        >
          <option value="">All Verification</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </div>

      {/* Users Table */}
      <AsyncSection state={state} onRetry={reload}>
        {(pageData) => (
          <div className="admin-card">
            <DataTable
              columns={columns}
              rows={pageData.content}
              rowKey={(u) => u.id}
              empty={<p style={{ color: '#64748b' }}>No user accounts found matching your query.</p>}
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

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            setActionSuccess('New user account created successfully.');
            setTimeout(() => setActionSuccess(null), 3500);
            reload();
          }}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            setActionSuccess('User information updated.');
            setTimeout(() => setActionSuccess(null), 3500);
            reload();
          }}
        />
      )}

      {/* Role Change Confirmation Modal */}
      {roleChangeUser && (
        <Modal
          title={`Change Role — ${roleChangeUser.fullName}`}
          onClose={() => setRoleChangeUser(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: '#475569' }}>
              Select a new role for <strong>{roleChangeUser.email}</strong>.
            </p>

            <div>
              <label className="admin-label">Account Role</label>
              <select
                className="admin-select"
                style={{ width: '100%' }}
                value={newRole}
                onChange={(e) =>
                  setNewRole(e.target.value as 'ADMIN' | 'DOCTOR' | 'PATIENT')
                }
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {newRole !== 'ADMIN' && roleChangeUser.role === 'ADMIN' && (
              <Banner tone="error">
                Caution: You are demoting an administrator account.
              </Banner>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className="admin-btn secondary"
                onClick={() => setRoleChangeUser(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn primary"
                onClick={handleSaveRole}
              >
                Confirm Role Change
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// Create User Modal Form
function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'DOCTOR' | 'PATIENT'>('PATIENT');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createUser({
        fullName,
        email,
        phone,
        password,
        role,
        status: 'ACTIVE',
      });
      onCreated();
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Create User Account" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <Banner tone="error">{error}</Banner>}

        <div>
          <label className="admin-label">Full Name *</label>
          <input
            type="text"
            className="admin-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="John Doe"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="admin-label">Email Address *</label>
            <input
              type="email"
              className="admin-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@example.com"
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
              placeholder="0912345678"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="admin-label">Temporary Password *</label>
            <input
              type="password"
              className="admin-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="admin-label">Assigned Role</label>
            <select
              className="admin-select"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as 'ADMIN' | 'DOCTOR' | 'PATIENT')
              }
            >
              <option value="PATIENT">PATIENT</option>
              <option value="DOCTOR">DOCTOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button type="button" className="admin-btn secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="admin-btn primary" disabled={saving}>
            {saving ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Edit User Modal Form
function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone || '');
  const [emailVerified, setEmailVerified] = useState(user.emailVerified);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateUser(user.id, {
        fullName,
        phone,
        emailVerified,
      });
      onSaved();
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Edit User — ${user.fullName}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <Banner tone="error">{error}</Banner>}

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <input
            type="checkbox"
            id="emailVerifiedCheckbox"
            checked={emailVerified}
            onChange={(e) => setEmailVerified(e.target.checked)}
          />
          <label htmlFor="emailVerifiedCheckbox" style={{ fontSize: 13, cursor: 'pointer' }}>
            Mark email as verified
          </label>
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
