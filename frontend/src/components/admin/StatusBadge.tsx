import type {
  Availability,
  DepartmentStatus,
  DoctorStatus,
  ShiftType,
} from '../../api/adminTypes';

type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

/**
 * One table from the backend's enums to what the badge says and how it looks. It used to be
 * four lists of display strings here and a separate set elsewhere deciding whether to render
 * a badge at all, and the two had drifted apart.
 */
const LABELS: Record<string, { label: string; tone: Tone }> = {
  // Doctor availability
  AVAILABLE: { label: 'Available', tone: 'success' },
  IN_CONSULTATION: { label: 'In Consultation', tone: 'info' },
  ON_LEAVE: { label: 'On Leave', tone: 'warning' },
  OFF_DUTY: { label: 'Off Duty', tone: 'danger' },
  // Doctor and department status
  ACTIVE: { label: 'Active', tone: 'success' },
  INACTIVE: { label: 'Inactive', tone: 'neutral' },
  // Shift types
  WORK: { label: 'Work', tone: 'info' },
  BREAK: { label: 'Break', tone: 'warning' },
  LEAVE: { label: 'Leave', tone: 'danger' },
};

type Known = Availability | DoctorStatus | DepartmentStatus | ShiftType;

/** The words a label shows outside a badge, e.g. in a dropdown. */
export const labelOf = (value: Known) => LABELS[value]?.label ?? value;

const StatusBadge = ({ value }: { value: Known }) => {
  const known = LABELS[value];
  return (
    <span className={`admin-badge ${known?.tone ?? 'neutral'}`}>{known?.label ?? value}</span>
  );
};

export default StatusBadge;
