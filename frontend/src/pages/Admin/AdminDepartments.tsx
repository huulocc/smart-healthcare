import { Pencil, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';

import { listDepartments } from '../../api/adminApi';
import type { Department } from '../../api/adminTypes';
import AsyncSection from '../../components/admin/AsyncSection';
import Banner from '../../components/admin/Banner';
import DataTable, { type Column } from '../../components/admin/DataTable';
import StatusBadge from '../../components/admin/StatusBadge';
import { useAsync } from '../../hooks/useAsync';

import DepartmentFormModal from './DepartmentFormModal';
import styles from './AdminDoctors.module.css';

/** No pager: the backend returns the whole list on purpose, and there are a handful. */
const AdminDepartments = () => {
  const [banner, setBanner] = useState<string | null>(null);
  /** Null is "closed"; a department opens the edit form, 'new' opens the create form. */
  const [editing, setEditing] = useState<Department | 'new' | null>(null);

  const list = useAsync(
    useCallback(() => listDepartments(), []),
    [],
  );

  const columns: Column<Department>[] = [
    { header: 'Code', cell: (department) => department.deptCode },
    {
      header: 'Department',
      cell: (department) => (
        <div className="admin-person">
          <div>
            <strong>{department.name}</strong>
            <small>{department.description ?? 'No description'}</small>
          </div>
        </div>
      ),
    },
    {
      header: 'Head doctor',
      cell: (department) =>
        department.headDoctor?.fullName ?? 'No head assigned',
    },
    {
      header: 'Active doctors',
      cell: (department) => department.activeDoctors,
    },
    {
      header: 'Status',
      cell: (department) => <StatusBadge value={department.status} />,
    },
    {
      header: 'Actions',
      cell: (department) => (
        <div className={styles.actions}>
          <button
            type="button"
            className="admin-secondary-btn"
            onClick={() => setEditing(department)}
          >
            <Pencil />
            Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>Departments</h1>
          <p>Each one keeps its doctors, its head and its history.</p>
        </div>
        <div className="admin-heading-actions">
          <button
            type="button"
            className="admin-primary-btn"
            onClick={() => setEditing('new')}
          >
            <Plus />
            New department
          </button>
        </div>
      </div>

      <section className="admin-card admin-section-card">
        {banner && (
          <div className={styles.banner}>
            <Banner tone="success">{banner}</Banner>
          </div>
        )}

        <AsyncSection state={list.state} onRetry={list.reload}>
          {(departments) => (
            <DataTable
              columns={columns}
              rows={departments}
              rowKey={(department) => department.id}
              empty="No departments yet. Create the first one."
            />
          )}
        </AsyncSection>
      </section>

      {editing !== null && (
        <DepartmentFormModal
          department={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(department, created) => {
            setEditing(null);
            setBanner(
              created
                ? `${department.name} was created as ${department.deptCode}.`
                : `${department.name} has been updated.`,
            );
            list.reload();
          }}
        />
      )}
    </>
  );
};

export default AdminDepartments;
