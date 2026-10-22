import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { addSlot, deleteSlot, updateSlot } from '../../api/adminApi';
import type { DayOfWeek, Doctor, ScheduleSlot } from '../../api/adminTypes';
import { applyFieldErrors, toApiError } from '../../api/errors';
import Banner from '../../components/admin/Banner';
import Field from '../../components/admin/Field';
import Modal from '../../components/admin/Modal';
import { DAYS_OF_WEEK } from '../../api/adminTypes';
import { labelOf } from '../../components/admin/StatusBadge';
import {
  scheduleSlotSchema,
  type ScheduleSlotFormOutput,
  type ScheduleSlotFormValues,
} from '../../schemas/adminSchemas';

import styles from './AdminSchedules.module.css';

interface Props {
  doctor: Doctor;
  /** The day the cell belongs to, used when adding. */
  day: DayOfWeek;
  /** Null adds a slot; a slot edits (and can delete) it. */
  slot: ScheduleSlot | null;
  onDone: () => void;
  onClose: () => void;
}

const FIELDS = ['dayOfWeek', 'startTime', 'endTime', 'shiftType'] as const;

/** "09:00:00" from the API, "09:00" in an <input type="time">. */
const hhmm = (time: string) => time.slice(0, 5);

const ScheduleSlotModal = ({ doctor, day, slot, onDone, onClose }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleSlotFormValues, unknown, ScheduleSlotFormOutput>({
    resolver: zodResolver(scheduleSlotSchema),
    defaultValues: {
      dayOfWeek: slot?.dayOfWeek ?? day,
      startTime: slot === null ? '09:00' : hhmm(slot.startTime),
      endTime: slot === null ? '17:00' : hhmm(slot.endTime),
      shiftType: slot?.shiftType ?? 'WORK',
    },
  });

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      if (slot === null) await addSlot(doctor.id, values);
      else await updateSlot(slot.id, values);
      onDone();
    } catch (caught) {
      const problem = toApiError(caught);
      // Every overlap rule comes back pointing at startTime, so it lands under Start time.
      if (!applyFieldErrors(problem.fieldErrors, FIELDS, setFieldError)) {
        setError(problem.message);
      }
    }
  });

  const remove = async () => {
    if (slot === null) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteSlot(slot.id);
      onDone();
    } catch (caught) {
      // Removing a working shift can strand the breaks inside it, which the server refuses.
      setError(toApiError(caught).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      title={
        slot === null
          ? `Add a shift for ${doctor.fullName}`
          : `Edit ${doctor.fullName}'s shift`
      }
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        {error && <Banner tone="error">{error}</Banner>}

        <Field label="Day" error={errors.dayOfWeek?.message}>
          {(id) => (
            <select id={id} {...register('dayOfWeek')}>
              {DAYS_OF_WEEK.map((value) => (
                <option key={value} value={value}>
                  {value.charAt(0) + value.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className={styles.times}>
          <Field label="Start time" error={errors.startTime?.message}>
            {(id) => <input id={id} type="time" {...register('startTime')} />}
          </Field>
          <Field label="End time" error={errors.endTime?.message}>
            {(id) => <input id={id} type="time" {...register('endTime')} />}
          </Field>
        </div>

        <Field
          label="Shift type"
          error={errors.shiftType?.message}
          hint="A break has to sit inside a working shift on the same day."
        >
          {(id) => (
            <select id={id} {...register('shiftType')}>
              {(['WORK', 'BREAK', 'LEAVE'] as const).map((value) => (
                <option key={value} value={value}>
                  {labelOf(value)}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className={styles.formActions}>
          {slot !== null && (
            <button
              type="button"
              className={`admin-secondary-btn ${styles.delete}`}
              disabled={deleting || isSubmitting}
              onClick={remove}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
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
            {isSubmitting
              ? 'Saving...'
              : slot === null
                ? 'Add shift'
                : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ScheduleSlotModal;
