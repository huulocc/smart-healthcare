import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  createDepartment,
  listDoctors,
  updateDepartment,
} from '../../api/adminApi';
import type { Department } from '../../api/adminTypes';
import { applyFieldErrors, toApiError } from '../../api/errors';
import Banner from '../../components/admin/Banner';
import Field from '../../components/admin/Field';
import Modal from '../../components/admin/Modal';
import { useAsync } from '../../hooks/useAsync';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  type CreateDepartmentFormOutput,
  type CreateDepartmentFormValues,
  type UpdateDepartmentFormOutput,
  type UpdateDepartmentFormValues,
} from '../../schemas/adminSchemas';

interface Saved {
  onSaved: (department: Department, created: boolean) => void;
  onClose: () => void;
}

interface Props extends Saved {
  /** Null opens the create form; a department opens the edit form. */
  department: Department | null;
}

const CREATE_FIELDS = ['name', 'description'] as const;
const UPDATE_FIELDS = [
  'name',
  'description',
  'headDoctorId',
  'status',
] as const;

const DepartmentFormModal = ({ department, ...rest }: Props) =>
  department === null ? (
    <CreateForm {...rest} />
  ) : (
    <EditForm department={department} {...rest} />
  );

const CreateForm = ({ onSaved, onClose }: Saved) => {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<CreateDepartmentFormValues, unknown, CreateDepartmentFormOutput>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: { name: '', description: '' },
  });

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      onSaved(await createDepartment(values), true);
    } catch (caught) {
      const problem = toApiError(caught);
      if (
        !applyFieldErrors(problem.fieldErrors, CREATE_FIELDS, setFieldError)
      ) {
        setError(problem.message);
      }
    }
  });

  return (
    <Modal title="New department" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {error && <Banner tone="error">{error}</Banner>}

        <Field
          label="Name"
          error={errors.name?.message}
          hint="Its code (DEP-00001, ...) is generated from the id."
        >
          {(id) => <input id={id} type="text" {...register('name')} />}
        </Field>

        <Field label="Description" error={errors.description?.message}>
          {(id) => <input id={id} type="text" {...register('description')} />}
        </Field>

        <Actions
          onClose={onClose}
          busy={isSubmitting}
          label="Create department"
        />
      </form>
    </Modal>
  );
};

const EditForm = ({
  department,
  onSaved,
  onClose,
}: Saved & { department: Department }) => {
  const [error, setError] = useState<string | null>(null);

  // The backend only accepts a head who is an active doctor of this department, so those are
  // the only people offered. The department is never null here -- EditForm is chosen on it.
  const candidates = useAsync(
    useCallback(
      () =>
        listDoctors({
          departmentId: department.id,
          status: 'ACTIVE',
          size: 100,
        }),
      [department],
    ),
    [department?.id],
  );

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateDepartmentFormValues, unknown, UpdateDepartmentFormOutput>({
    resolver: zodResolver(updateDepartmentSchema),
    defaultValues: {
      name: department.name,
      description: department.description ?? '',
      headDoctorId:
        department.headDoctor === null ? '' : String(department.headDoctor.id),
      status: department.status,
    },
  });

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      onSaved(await updateDepartment(department.id, values), false);
    } catch (caught) {
      const problem = toApiError(caught);
      if (
        !applyFieldErrors(problem.fieldErrors, UPDATE_FIELDS, setFieldError)
      ) {
        setError(problem.message);
      }
    }
  });

  return (
    <Modal title={`Edit ${department.name}`} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {error && <Banner tone="error">{error}</Banner>}

        <Field label="Name" error={errors.name?.message}>
          {(id) => <input id={id} type="text" {...register('name')} />}
        </Field>

        <Field label="Description" error={errors.description?.message}>
          {(id) => <input id={id} type="text" {...register('description')} />}
        </Field>

        <Field
          label="Head doctor"
          error={errors.headDoctorId?.message}
          hint="Only the active doctors of this department can lead it."
        >
          {(id) => (
            <select id={id} {...register('headDoctorId')}>
              <option value="">No head</option>
              {(candidates.state.status === 'ready'
                ? candidates.state.data.content
                : []
              ).map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.fullName}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          label="Status"
          error={errors.status?.message}
          hint="There is no delete. Set it to Inactive to retire a department: it keeps its history but takes no new doctors."
        >
          {(id) => (
            <select id={id} {...register('status')}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          )}
        </Field>

        <Actions onClose={onClose} busy={isSubmitting} label="Save changes" />
      </form>
    </Modal>
  );
};

const Actions = ({
  onClose,
  busy,
  label,
}: {
  onClose: () => void;
  busy: boolean;
  label: string;
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 20,
    }}
  >
    <button type="button" className="admin-secondary-btn" onClick={onClose}>
      Cancel
    </button>
    <button type="submit" className="admin-primary-btn" disabled={busy}>
      {busy ? 'Saving...' : label}
    </button>
  </div>
);

export default DepartmentFormModal;
