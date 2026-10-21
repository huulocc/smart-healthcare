import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { updateDoctor } from '../../api/adminApi';
import type { Department, Doctor } from '../../api/adminTypes';
import { applyFieldErrors, toApiError } from '../../api/errors';
import Banner from '../../components/admin/Banner';
import Field from '../../components/admin/Field';
import Modal from '../../components/admin/Modal';
import {
  doctorSchema,
  type DoctorFormOutput,
  type DoctorFormValues,
} from '../../schemas/adminSchemas';

interface Props {
  doctor: Doctor;
  departments: Department[];
  onSaved: (doctor: Doctor) => void;
  onClose: () => void;
}

const FIELDS = [
  'departmentId',
  'specialty',
  'experienceYears',
  'avatarUrl',
] as const;

const DoctorEditModal = ({ doctor, departments, onSaved, onClose }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
    // The third type is what the schema turns the strings into: that is what submit receives.
  } = useForm<DoctorFormValues, unknown, DoctorFormOutput>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      departmentId:
        doctor.department === null ? '' : String(doctor.department.id),
      specialty: doctor.specialty ?? '',
      experienceYears: String(doctor.experienceYears ?? 0),
      avatarUrl: doctor.avatarUrl ?? '',
    },
  });

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      onSaved(await updateDoctor(doctor.id, values));
    } catch (caught) {
      const problem = toApiError(caught);
      // "Department not found" and "This department is inactive" both name a field, so they
      // land under the select. Anything else has nowhere to go but the banner.
      if (!applyFieldErrors(problem.fieldErrors, FIELDS, setFieldError)) {
        setError(problem.message);
      }
    }
  });

  return (
    <Modal title={`Edit ${doctor.fullName}`} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {error && <Banner tone="error">{error}</Banner>}

        <Field label="Department" error={errors.departmentId?.message}>
          {(id) => (
            <select id={id} {...register('departmentId')}>
              <option value="">No department</option>
              {departments
                .filter(
                  (one) =>
                    one.status === 'ACTIVE' || one.id === doctor.department?.id,
                )
                .map((one) => (
                  <option key={one.id} value={one.id}>
                    {one.name}
                    {one.status === 'INACTIVE' ? ' (retired)' : ''}
                  </option>
                ))}
            </select>
          )}
        </Field>

        <Field label="Specialty" error={errors.specialty?.message}>
          {(id) => <input id={id} type="text" {...register('specialty')} />}
        </Field>

        <Field
          label="Years of experience"
          error={errors.experienceYears?.message}
        >
          {(id) => (
            <input
              id={id}
              type="number"
              min={0}
              max={70}
              {...register('experienceYears')}
            />
          )}
        </Field>

        <Field
          label="Avatar URL"
          error={errors.avatarUrl?.message}
          hint="A path in the app, like /images/doctor_2.jpg, or a full http(s) address."
        >
          {(id) => <input id={id} type="text" {...register('avatarUrl')} />}
        </Field>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 20,
          }}
        >
          <button
            type="button"
            className="admin-secondary-btn"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="admin-primary-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DoctorEditModal;
