import type { AdminStatus } from './adminData';

const success = ['Confirmed', 'Available', 'Active', 'Completed', 'Paid'];
const warning = ['Pending', 'Waiting', 'On Leave'];
const info = ['In Progress', 'Processing', 'In Consultation', 'Low'];
const danger = ['Cancelled', 'Failed', 'Flagged', 'Off Duty'];

export default function StatusBadge({ status }: { status: AdminStatus | string }) {
  const tone = success.includes(status) ? 'success' : warning.includes(status) ? 'warning' : info.includes(status) ? 'info' : danger.includes(status) ? 'danger' : 'neutral';
  return <span className={`admin-badge ${tone}`}>{status}</span>;
}