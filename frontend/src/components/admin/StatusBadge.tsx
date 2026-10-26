import type {
  Availability,
  DepartmentStatus,
  DoctorStatus,
  ShiftType,
} from '../../api/adminTypes';

type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

/**
 * One table from the backend's enums to what the badge says and how it looks.
 */
const LABELS: Record<string, { label: string; tone: Tone }> = {
  // Doctor availability
  AVAILABLE: { label: 'Available', tone: 'success' },
  IN_CONSULTATION: { label: 'In Consultation', tone: 'info' },
  ON_LEAVE: { label: 'On Leave', tone: 'warning' },
  OFF_DUTY: { label: 'Off Duty', tone: 'danger' },
  // Doctor, user, patient and department status
  ACTIVE: { label: 'Active', tone: 'success' },
  INACTIVE: { label: 'Inactive', tone: 'neutral' },
  // Shift types
  WORK: { label: 'Work', tone: 'info' },
  BREAK: { label: 'Break', tone: 'warning' },
  LEAVE: { label: 'Leave', tone: 'danger' },
  // Appointment status
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'info' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  PENDING: { label: 'Pending', tone: 'warning' },
  NO_SHOW: { label: 'No Show', tone: 'neutral' },
  // Telemetry & Notification types
  SUCCESS: { label: 'Success', tone: 'success' },
  ERROR: { label: 'Error', tone: 'danger' },
  REFUSAL: { label: 'Refusal', tone: 'warning' },
  ALERT: { label: 'Alert', tone: 'danger' },
  INFO: { label: 'Info', tone: 'info' },
  WARNING: { label: 'Warning', tone: 'warning' },
};

type Known = Availability | DoctorStatus | DepartmentStatus | ShiftType | string;

/** The words a label shows outside a badge, e.g. in a dropdown. */
export const labelOf = (value: Known) => LABELS[value]?.label ?? value;

const StatusBadge = ({ value }: { value: Known }) => {
  const known = LABELS[value];
  return (
    <span className={`admin-badge ${known?.tone ?? 'neutral'}`}>
      {known?.label ?? value}
    </span>
  );
};

export default StatusBadge;
