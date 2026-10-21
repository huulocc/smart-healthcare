import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';

import { approveDoctorRequest, listDepartments } from '../../api/adminApi';
import type { Doctor, DoctorRequest } from '../../api/adminTypes';
import { applyFieldErrors, toApiError } from '../../api/errors';
import AsyncSection from '../../components/admin/AsyncSection';
import Banner from '../../components/admin/Banner';
import Field from '../../components/admin/Field';
import Modal from '../../components/admin/Modal';
import { useAsync } from '../../hooks/useAsync';
import {
  approveDoctorSchema,
  type ApproveDoctorFormOutput,
  type ApproveDoctorFormValues,
} from '../../schemas/adminSchemas';

interface Props {
  request: DoctorRequest;
  onApproved: (doctor: Doctor) => void;
  onClose: () => void;
}

const FIELDS = ['departmentId', 'specialty', 'experienceYears'] as const;

const ApproveDoctorModal = ({ request, onApproved, onClose }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const departments = useAsync(
    useCallback(() => listDepartments(), []),
    [],
  );

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<ApproveDoctorFormValues, unknown, ApproveDoctorFormOutput>({
    resolver: zodResolver(approveDoctorSchema),
    defaultValues: { departmentId: '', specialty: '', experienceYears: '0' },
  });

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      onApproved(await approveDoctorRequest(request.userId, values));
    } catch (caught) {
      const problem = toApiError(caught);
      // "This user has not activated their account yet" names no field, so it needs the banner.
      if (!applyFieldErrors(problem.fieldErrors, FIELDS, setFieldError)) {
        setError(problem.message);
      }
    }
  });

  return (
    <Modal title={`Approve ${request.fullName}`} onClose={onClose}>
      <AsyncSection state={departments.state} onRetry={departments.reload}>
        {(all) => (
          <form onSubmit={submit} noValidate>
            {error && <Banner tone="error">{error}</Banner>}

            <Field label="Department" error={errors.departmentId?.message}>
              {(id) => (
                <select id={id} {...register('departmentId')}>
                  <option value="">Select a department</option>
                  {/* A retired department refuses new doctors, so it is not offered. */}
                  {all
                    .filter((one) => one.status === 'ACTIVE')
                    .map((one) => (
                      <option key={one.id} value={one.id}>
                        {one.name}
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
                {isSubmitting ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </form>
        )}
      </AsyncSection>
    </Modal>
  );
};

export default ApproveDoctorModal;
